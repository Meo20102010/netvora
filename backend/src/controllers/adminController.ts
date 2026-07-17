import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

function parseCastTags(content: any): any {
  if (!content) return content;
  if (Array.isArray(content)) return content.map(c => parseCastTags(c));
  if (typeof content.cast === 'string') { try { content.cast = JSON.parse(content.cast); } catch { content.cast = []; } }
  if (typeof content.tags === 'string') { try { content.tags = JSON.parse(content.tags); } catch { content.tags = []; } }
  return content;
}

function asyncHandler(fn: (req: any, res: Response, next: NextFunction) => Promise<any>) {
  return (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export const adminController = {
  getDashboard: asyncHandler(async (req: AuthRequest, res: Response) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsers,
      totalMovies,
      totalSeries,
      totalViews,
      totalPayments,
      todayPayments,
      recentUsers,
      recentContent,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.content.count({ where: { type: 'MOVIE' } }),
      prisma.content.count({ where: { type: 'SERIES' } }),
      prisma.watchHistory.count(),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, email: true, username: true, displayName: true, role: true, createdAt: true },
      }),
      prisma.content.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { category: { select: { id: true, name: true } } },
      }),
    ]);

    const activeSubscriptions = await prisma.subscription.count({
      where: { status: 'ACTIVE' },
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalMovies,
        totalSeries,
        totalViews,
        totalRevenue: totalPayments._sum.amount || 0,
        todayRevenue: todayPayments._sum.amount || 0,
        activeSubscriptions,
        recentUsers,
        recentContent,
      },
    });
  }),

  getUsers: asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { username: { contains: search } },
        { displayName: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true,
          role: true,
          isVerified: true,
          isBanned: true,
          banReason: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
_count: {
              select: {
                subscriptions: true,
                watchHistory: true,
                favorites: true,
              },
            },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),

  getUserById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        role: true,
        isVerified: true,
        isBanned: true,
        banReason: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        profiles: {
          select: { id: true, name: true, avatar: true, isChild: true, language: true },
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            watchHistory: true,
            favorites: true,
            watchLater: true,
            ratings: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) throw new AppError('Kullanıcı bulunamadı', 404);
    res.json({ success: true, data: user });
  }),

  updateUser: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new AppError('Kullanıcı bulunamadı', 404);

    const allowedFields = ['displayName', 'avatar', 'role', 'isVerified'];
    const updateData: any = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        isVerified: true,
        isBanned: true,
      },
    });

    res.json({ success: true, data: user, message: 'Kullanıcı güncellendi' });
  }),

  deleteUser: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new AppError('Kullanıcı bulunamadı', 404);

    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: 'Kullanıcı silindi' });
  }),

  banUser: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new AppError('Kullanıcı bulunamadı', 404);
    if (existing.role === 'SUPER_ADMIN') {
      throw new AppError('Süper admin kullanıcıları yasaklanamaz', 403);
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isBanned: true, banReason: reason || null },
      select: { id: true, email: true, username: true, isBanned: true, banReason: true },
    });

    res.json({ success: true, data: user, message: 'Kullanıcı yasaklandı' });
  }),

  unbanUser: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new AppError('Kullanıcı bulunamadı', 404);

    const user = await prisma.user.update({
      where: { id },
      data: { isBanned: false, banReason: null },
      select: { id: true, email: true, username: true, isBanned: true },
    });

    res.json({ success: true, data: user, message: 'Kullanıcı yasağı kaldırıldı' });
  }),

  resetUserPassword: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new AppError('Kullanıcı bulunamadı', 404);

    const { newPassword } = req.body;
    const password = newPassword && newPassword.length >= 6 ? newPassword : 'Netvora123';
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null },
    });

    res.json({ success: true, message: `Şifre sıfırlandı. Yeni şifre: ${password}` });
  }),

  createAdmin: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password, username, displayName } = req.body;
    if (!email || !password || !username) {
      throw new AppError('E-posta, şifre ve kullanıcı adı gereklidir', 400);
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) throw new AppError('Bu e-posta adresi zaten kayıtlı', 409);

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) throw new AppError('Bu kullanıcı adı zaten alınmış', 409);

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        displayName: displayName || username,
        role: 'ADMIN',
        isVerified: true,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    res.status(201).json({ success: true, data: user, message: 'Admin kullanıcısı oluşturuldu' });
  }),

  getSiteSettings: asyncHandler(async (req: AuthRequest, res: Response) => {
    const settings = await prisma.siteSetting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }
    res.json({ success: true, data: settingsMap });
  }),

  updateSiteSettings: asyncHandler(async (req: AuthRequest, res: Response) => {
    const settings = req.body;
    if (!settings || typeof settings !== 'object') {
      throw new AppError('Geçersiz ayarlar formatı', 400);
    }

    for (const [key, value] of Object.entries(settings)) {
      await prisma.siteSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    const updated = await prisma.siteSetting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of updated) {
      settingsMap[s.key] = s.value;
    }

    res.json({ success: true, data: settingsMap, message: 'Ayarlar güncellendi' });
  }),

  getAuditLogs: asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.action) where.action = req.query.action as string;
    if (req.query.resource) where.resource = req.query.resource as string;
    if (req.query.userId) where.userId = req.query.userId as string;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, username: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),

  getSubscriptions: asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.status) where.status = req.query.status as string;
    if (req.query.userId) where.userId = req.query.userId as string;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, username: true, displayName: true },
          },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    res.json({
      success: true,
      data: subscriptions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),

  activateUserSubscription: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { packageName, price, currency, days } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Kullanıcı bulunamadı', 404);

    const duration = days || 30;
    const now = new Date();

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        packageName: packageName || 'Premium',
        price: price || 200,
        currency: currency || 'TRY',
        startDate: now,
        endDate: new Date(now.getTime() + duration * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
      },
    });

    res.status(201).json({ success: true, data: subscription, message: 'Abonelik aktifleştirildi' });
  }),

  updateSubscription: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing) throw new AppError('Abonelik bulunamadı', 404);

    const allowedFields = ['packageName', 'price', 'currency', 'status', 'autoRenew', 'endDate'];
    const updateData: any = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'endDate') {
          updateData[field] = new Date(req.body[field]);
        } else {
          updateData[field] = req.body[field];
        }
      }
    }

    const subscription = await prisma.subscription.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, email: true, username: true } },
      },
    });

    res.json({ success: true, data: subscription, message: 'Abonelik güncellendi' });
  }),

  getPayments: asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.status) where.status = req.query.status as string;
    if (req.query.userId) where.userId = req.query.userId as string;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, username: true, displayName: true },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),

  getMovies: asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    const where: any = { type: 'MOVIE' };
    if (search) where.title = { contains: search };

    const [data, total] = await Promise.all([
      prisma.content.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { id: true, name: true, slug: true } } },
      }),
      prisma.content.count({ where }),
    ]);

    res.json({
      success: true,
      data: parseCastTags(data),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),

  getSeries: asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    const where: any = { type: 'SERIES' };
    if (search) where.title = { contains: search };

    const [data, total] = await Promise.all([
      prisma.content.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          seasons: {
            include: {
              episodes: {
                include: { videos: true },
                orderBy: { episodeNumber: 'asc' },
              },
            },
            orderBy: { seasonNumber: 'asc' },
          },
        },
      }),
      prisma.content.count({ where }),
    ]);

    res.json({
      success: true,
      data: parseCastTags(data),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),

  getCategories: asyncHandler(async (req: AuthRequest, res: Response) => {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { contents: true } } },
    });
    res.json({ success: true, data: categories });
  }),

  createCategory: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, slug, description, image, sortOrder } = req.body;
    if (!name || !slug) throw new AppError('Kategori adı ve slug zorunludur', 400);
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) throw new AppError('Bu slug ile bir kategori zaten var', 400);
    const category = await prisma.category.create({
      data: { name, slug, description, image, sortOrder: sortOrder || 0 },
    });
    res.status(201).json({ success: true, data: category, message: 'Kategori oluşturuldu' });
  }),

  updateCategory: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new AppError('Kategori bulunamadı', 404);
    const category = await prisma.category.update({
      where: { id },
      data: req.body,
    });
    res.json({ success: true, data: category, message: 'Kategori güncellendi' });
  }),

  deleteCategory: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new AppError('Kategori bulunamadı', 404);
    const contentsCount = await prisma.content.count({ where: { categoryId: id } });
    if (contentsCount > 0) throw new AppError('Bu kategoriye ait içerikler var. Önce içerikleri taşıyın veya silin', 400);
    await prisma.category.delete({ where: { id } });
    res.json({ success: true, message: 'Kategori silindi' });
  }),

  broadcastNotification: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { title, message, type, link } = req.body;
    if (!title || !message) throw new AppError('Başlık ve mesaj gereklidir', 400);

    const users = await prisma.user.findMany({ select: { id: true } });
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title,
        message,
        type: type || 'info',
        link: link || null,
      })),
    });

    res.json({ success: true, message: `Bildirim ${users.length} kullanıcıya gönderildi` });
  }),

  getBanners: asyncHandler(async (req: AuthRequest, res: Response) => {
    const banners = await prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ success: true, data: banners });
  }),

  createBanner: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { title, subtitle, imageUrl, linkUrl, sortOrder } = req.body;
    if (!imageUrl) throw new AppError('Görsel URL gereklidir', 400);
    const banner = await prisma.banner.create({
      data: { title, subtitle, imageUrl, linkUrl, sortOrder: sortOrder || 0 },
    });
    res.status(201).json({ success: true, data: banner, message: 'Banner oluşturuldu' });
  }),

  updateBanner: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) throw new AppError('Banner bulunamadı', 404);
    const banner = await prisma.banner.update({ where: { id }, data: req.body });
    res.json({ success: true, data: banner, message: 'Banner güncellendi' });
  }),

  deleteBanner: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) throw new AppError('Banner bulunamadı', 404);
    await prisma.banner.delete({ where: { id } });
    res.json({ success: true, message: 'Banner silindi' });
  }),

  processPayment: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!['completed', 'rejected', 'pending'].includes(status)) {
      throw new AppError('Geçersiz durum. completed, rejected veya pending olmalıdır', 400);
    }

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new AppError('Ödeme bulunamadı', 404);

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status,
        adminNote: adminNote || null,
        processedBy: req.user!.userId,
        processedAt: new Date(),
      },
    });

    if (status === 'completed' && !payment.processedAt) {
      const existingSub = await prisma.subscription.findFirst({
        where: { userId: payment.userId, status: 'ACTIVE' },
      });

      if (existingSub) {
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: {
            endDate: new Date(existingSub.endDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      } else {
        const now = new Date();
        await prisma.subscription.create({
          data: {
            userId: payment.userId,
            packageName: 'Premium',
            price: payment.amount,
            currency: payment.currency,
            startDate: now,
            endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
            status: 'ACTIVE',
          },
        });
      }
    }

    res.json({ success: true, data: updated, message: 'Ödeme güncellendi' });
  }),
};
