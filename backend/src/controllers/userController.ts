import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

function asyncHandler(fn: (req: any, res: Response, next: NextFunction) => Promise<any>) {
  return (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export const userController = {
  getProfile: asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        role: true,
        isVerified: true,
        createdAt: true,
        profiles: {
          select: { id: true, name: true, avatar: true, isChild: true, pinCode: true, language: true },
        },
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, packageName: true, price: true, currency: true, startDate: true, endDate: true, status: true, autoRenew: true },
        },
        _count: {
          select: { favorites: true, watchLater: true, notifications: { where: { isRead: false } } },
        },
      },
    });

    if (!user) throw new AppError('Kullanıcı bulunamadı', 404);
    res.json({ success: true, data: user });
  }),

  updateProfile: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { displayName, avatar } = req.body;
    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (avatar !== undefined) updateData.avatar = avatar;

    if (Object.keys(updateData).length === 0) {
      throw new AppError('Güncellenecek alan bulunamadı', 400);
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: updateData,
      select: { id: true, email: true, username: true, displayName: true, avatar: true, role: true },
    });

    res.json({ success: true, data: user, message: 'Profil güncellendi' });
  }),

  createProfile: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, avatar, isChild, pinCode } = req.body;
    if (!name) throw new AppError('Profil adı gereklidir', 400);

    const profileCount = await prisma.profile.count({ where: { userId: req.user!.userId } });
    if (profileCount >= 5) {
      throw new AppError('En fazla 5 profil oluşturabilirsiniz', 400);
    }

    const profile = await prisma.profile.create({
      data: {
        userId: req.user!.userId,
        name,
        avatar: avatar || null,
        isChild: isChild || false,
        pinCode: pinCode || null,
      },
    });

    res.status(201).json({ success: true, data: profile, message: 'Profil oluşturuldu' });
  }),

  updateProfileById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const profile = await prisma.profile.findFirst({
      where: { id, userId: req.user!.userId },
    });
    if (!profile) throw new AppError('Profil bulunamadı', 404);

    const { name, avatar, isChild, pinCode, language } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (isChild !== undefined) updateData.isChild = isChild;
    if (pinCode !== undefined) updateData.pinCode = pinCode;
    if (language !== undefined) updateData.language = language;

    const updated = await prisma.profile.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: updated, message: 'Profil güncellendi' });
  }),

  deleteProfile: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const profile = await prisma.profile.findFirst({
      where: { id, userId: req.user!.userId },
    });
    if (!profile) throw new AppError('Profil bulunamadı', 404);

    await prisma.profile.delete({ where: { id } });
    res.json({ success: true, message: 'Profil silindi' });
  }),

  getWatchHistory: asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = { userId: req.user!.userId };
    if (req.query.profileId) where.profileId = req.query.profileId as string;

    const [history, total] = await Promise.all([
      prisma.watchHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { watchedAt: 'desc' },
        include: {
          content: {
            select: { id: true, title: true, slug: true, type: true, posterUrl: true, coverUrl: true, duration: true, imdbRating: true },
          },
          episode: {
            select: { id: true, episodeNumber: true, title: true },
          },
        },
      }),
      prisma.watchHistory.count({ where }),
    ]);

    res.json({
      success: true,
      data: history,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),

  saveWatchProgress: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { contentId, episodeId, progress, completed, profileId } = req.body;
    if (!contentId) throw new AppError('contentId gereklidir', 400);

    const existing = await prisma.watchHistory.findFirst({
      where: {
        userId: req.user!.userId,
        contentId,
        episodeId: episodeId || null,
        profileId: profileId || null,
      },
    });

    let record;
    if (existing) {
      record = await prisma.watchHistory.update({
        where: { id: existing.id },
        data: {
          progress: progress !== undefined ? progress : existing.progress,
          completed: completed !== undefined ? completed : existing.completed,
          watchedAt: new Date(),
        },
      });
    } else {
      record = await prisma.watchHistory.create({
        data: {
          userId: req.user!.userId,
          profileId: profileId || null,
          contentId,
          episodeId: episodeId || null,
          progress: progress || 0,
          completed: completed || false,
        },
      });
    }

    res.json({ success: true, data: record, message: 'İzleme ilerlemesi kaydedildi' });
  }),

  getFavorites: asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = { userId: req.user!.userId };
    if (req.query.profileId) where.profileId = req.query.profileId as string;

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          content: {
            select: { id: true, title: true, slug: true, type: true, posterUrl: true, coverUrl: true, year: true, duration: true, imdbRating: true },
          },
        },
      }),
      prisma.favorite.count({ where }),
    ]);

    res.json({
      success: true,
      data: favorites,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),

  addToFavorites: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { contentId } = req.params;
    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw new AppError('İçerik bulunamadı', 404);

    const existing = await prisma.favorite.findUnique({
      where: { userId_contentId: { userId: req.user!.userId, contentId } },
    });
    if (existing) {
      res.json({ success: true, data: existing, message: 'Zaten favorilerde' });
      return;
    }

    const fav = await prisma.favorite.create({
      data: {
        userId: req.user!.userId,
        contentId,
        profileId: req.body.profileId || null,
      },
      include: {
        content: {
          select: { id: true, title: true, slug: true, type: true, posterUrl: true },
        },
      },
    });

    res.status(201).json({ success: true, data: fav, message: 'Favorilere eklendi' });
  }),

  removeFromFavorites: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { contentId } = req.params;
    const existing = await prisma.favorite.findUnique({
      where: { userId_contentId: { userId: req.user!.userId, contentId } },
    });
    if (!existing) throw new AppError('Favorilerde bulunamadı', 404);

    await prisma.favorite.delete({ where: { id: existing.id } });
    res.json({ success: true, message: 'Favorilerden kaldırıldı' });
  }),

  getWatchLater: asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: any = { userId: req.user!.userId };
    if (req.query.profileId) where.profileId = req.query.profileId as string;

    const [watchLater, total] = await Promise.all([
      prisma.watchLater.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          content: {
            select: { id: true, title: true, slug: true, type: true, posterUrl: true, coverUrl: true, year: true, duration: true, imdbRating: true },
          },
        },
      }),
      prisma.watchLater.count({ where }),
    ]);

    res.json({
      success: true,
      data: watchLater,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),

  addToWatchLater: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { contentId } = req.params;
    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw new AppError('İçerik bulunamadı', 404);

    const existing = await prisma.watchLater.findUnique({
      where: { userId_contentId: { userId: req.user!.userId, contentId } },
    });
    if (existing) {
      res.json({ success: true, data: existing, message: 'Zaten izleme listesinde' });
      return;
    }

    const wl = await prisma.watchLater.create({
      data: {
        userId: req.user!.userId,
        contentId,
        profileId: req.body.profileId || null,
      },
      include: {
        content: {
          select: { id: true, title: true, slug: true, type: true, posterUrl: true },
        },
      },
    });

    res.status(201).json({ success: true, data: wl, message: 'İzleme listesine eklendi' });
  }),

  removeFromWatchLater: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { contentId } = req.params;
    const existing = await prisma.watchLater.findUnique({
      where: { userId_contentId: { userId: req.user!.userId, contentId } },
    });
    if (!existing) throw new AppError('İzleme listesinde bulunamadı', 404);

    await prisma.watchLater.delete({ where: { id: existing.id } });
    res.json({ success: true, message: 'İzleme listesinden kaldırıldı' });
  }),

  getContinueWatching: asyncHandler(async (req: AuthRequest, res: Response) => {
    const where: any = {
      userId: req.user!.userId,
      completed: false,
      progress: { gt: 0 },
    };
    if (req.query.profileId) where.profileId = req.query.profileId as string;

    const items = await prisma.watchHistory.findMany({
      where,
      orderBy: { watchedAt: 'desc' },
      take: 20,
      distinct: ['contentId'],
      include: {
        content: {
          select: { id: true, title: true, slug: true, type: true, posterUrl: true, coverUrl: true, duration: true, imdbRating: true },
        },
        episode: {
          select: { id: true, episodeNumber: true, title: true },
        },
      },
    });

    res.json({ success: true, data: items });
  }),

  deleteWatchHistoryItem: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { contentId } = req.params;
    const existing = await prisma.watchHistory.findFirst({
      where: { userId: req.user!.userId, contentId },
    });
    if (!existing) throw new AppError('İzleme geçmişi kaydı bulunamadı', 404);
    await prisma.watchHistory.delete({ where: { id: existing.id } });
    res.json({ success: true, message: 'İzleme geçmişinden kaldırıldı' });
  }),

  getMyRatings: asyncHandler(async (req: AuthRequest, res: Response) => {
    const ratings = await prisma.rating.findMany({
      where: { userId: req.user!.userId },
      include: {
        content: {
          select: { id: true, title: true, slug: true, type: true, posterUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: ratings });
  }),

  rateContent: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { contentId } = req.params;
    const { score } = req.body;
    if (!score || score < 1 || score > 10) throw new AppError('Puan 1-10 arasında olmalıdır', 400);

    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw new AppError('İçerik bulunamadı', 404);

    const existing = await prisma.rating.findUnique({
      where: { userId_contentId: { userId: req.user!.userId, contentId } },
    });

    let rating;
    if (existing) {
      rating = await prisma.rating.update({
        where: { id: existing.id },
        data: { score, profileId: req.body.profileId || existing.profileId },
      });
    } else {
      rating = await prisma.rating.create({
        data: { userId: req.user!.userId, contentId, score, profileId: req.body.profileId || null },
      });
    }

    const avg = await prisma.rating.aggregate({
      where: { contentId },
      _avg: { score: true },
    });

    res.json({ success: true, data: { rating, averageRating: avg._avg.score || 0 }, message: existing ? 'Puan güncellendi' : 'Puan verildi' });
  }),

  removeRating: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { contentId } = req.params;
    const existing = await prisma.rating.findUnique({
      where: { userId_contentId: { userId: req.user!.userId, contentId } },
    });
    if (!existing) throw new AppError('Puan bulunamadı', 404);
    await prisma.rating.delete({ where: { id: existing.id } });
    res.json({ success: true, message: 'Puan kaldırıldı' });
  }),

  getSubscription: asyncHandler(async (req: AuthRequest, res: Response) => {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user!.userId,
        status: 'ACTIVE',
        endDate: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        packageName: true,
        price: true,
        currency: true,
        startDate: true,
        endDate: true,
        status: true,
        autoRenew: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: subscription || null });
  }),

  getNotifications: asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where = { userId: req.user!.userId };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      meta: { unreadCount },
    });
  }),

  markNotificationRead: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user!.userId },
    });
    if (!notification) throw new AppError('Bildirim bulunamadı', 404);

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ success: true, data: updated, message: 'Bildirim okundu olarak işaretlendi' });
  }),

  getMyStats: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;

    const [watchHistory, ratings, comments, favoriteCount, watchLaterCount] = await Promise.all([
      prisma.watchHistory.findMany({
        where: { userId },
        include: {
          content: { select: { id: true, type: true, duration: true } },
        },
      }),
      prisma.rating.aggregate({ where: { userId }, _avg: { score: true }, _count: true }),
      prisma.comment.count({ where: { userId, isDeleted: false } }),
      prisma.favorite.count({ where: { userId } }),
      prisma.watchLater.count({ where: { userId } }),
    ]);

    const totalWatchTime = watchHistory.reduce((acc, h) => acc + (h.content?.duration || 0), 0);
    const uniqueMovies = new Set(watchHistory.filter(h => h.content?.type === 'MOVIE').map(h => h.contentId)).size;
    const uniqueSeries = new Set(watchHistory.filter(h => h.content?.type === 'SERIES').map(h => h.contentId)).size;
    const episodesWatched = watchHistory.filter(h => h.episodeId).length;
    const completedCount = watchHistory.filter(h => h.completed).length;

    res.json({
      success: true,
      data: {
        totalWatchTime,
        moviesWatched: uniqueMovies,
        seriesWatched: uniqueSeries,
        episodesWatched,
        completedCount,
        totalRatings: ratings._count,
        averageRating: ratings._avg.score || 0,
        totalComments: comments,
        totalFavorites: favoriteCount,
        totalWatchLater: watchLaterCount,
      },
    });
  }),

  getMyComments: asyncHandler(async (req: AuthRequest, res: Response) => {
    const comments = await prisma.comment.findMany({
      where: { userId: req.user!.userId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        content: { select: { id: true, title: true, slug: true, type: true, posterUrl: true } },
        reactions: true,
      },
    });
    res.json({ success: true, data: comments });
  }),
};
