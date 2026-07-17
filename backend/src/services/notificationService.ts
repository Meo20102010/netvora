import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export const notificationService = {
  async createNotification(userId: string, title: string, message: string, type?: string, link?: string) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || 'general',
        link: link || null,
      },
    });

    return notification;
  },

  async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
    page = Math.max(1, page);
    limit = Math.min(50, Math.max(1, limit));
    const skip = (page - 1) * limit;

    const where = { userId };

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

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      meta: { unreadCount },
    };
  },

  async markAsRead(notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) throw new AppError('Bildirim bulunamadı', 404);

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return updated;
  },

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { message: 'Tüm bildirimler okundu olarak işaretlendi' };
  },

  async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { count };
  },

  async sendExpiryNotifications() {
    const intervals = [7, 3, 1];
    const now = new Date();
    let sentCount = 0;

    for (const days of intervals) {
      const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

      const expiringSubs = await prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          endDate: { gte: targetDate, lt: nextDay },
        },
        include: {
          user: { select: { id: true, email: true, username: true } },
        },
      });

      for (const sub of expiringSubs) {
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: sub.userId,
            type: 'expiry',
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        });

        if (!existingNotification) {
          await prisma.notification.create({
            data: {
              userId: sub.userId,
              title: 'Abonelik Süresi Doluyor',
              message: `Premium üyeliğiniz ${days} gün içinde sona erecek. Üyeliğinizi yenilemek için lütfen ödeme yapın.`,
              type: 'expiry',
              link: '/pricing',
            },
          });
          sentCount++;
        }
      }
    }

    return { sentCount };
  },

  async deleteOldNotifications(days: number = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        isRead: true,
      },
    });

    return { deletedCount: result.count };
  },
};
