import prisma from '../config/database';
import { calculateExpiryDate } from '../utils/helpers';
import { AppError } from '../middleware/errorHandler';

export const subscriptionService = {
  async getUserSubscription(userId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, email: true, username: true, displayName: true },
        },
      },
    });

    return subscription;
  },

  async createSubscription(userId: string, days: number = 30) {
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        packageName: 'Premium',
        price: 200,
        currency: 'TRY',
        startDate: now,
        endDate,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: { id: true, email: true, username: true },
        },
      },
    });

    return subscription;
  },

  async activateSubscription(userId: string, days: number = 30) {
    const activeSub = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeSub) {
      const extendedEnd = new Date(activeSub.endDate.getTime() + days * 24 * 60 * 60 * 1000);
      const subscription = await prisma.subscription.update({
        where: { id: activeSub.id },
        data: { endDate: extendedEnd },
        include: {
          user: { select: { id: true, email: true, username: true } },
        },
      });
      return subscription;
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        packageName: 'Premium',
        price: 200,
        currency: 'TRY',
        startDate: now,
        endDate,
        status: 'ACTIVE',
      },
      include: {
        user: { select: { id: true, email: true, username: true } },
      },
    });

    return subscription;
  },

  async deactivateSubscription(userId: string) {
    const activeSub = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeSub) throw new AppError('Aktif abonelik bulunamadı', 404);

    const subscription = await prisma.subscription.update({
      where: { id: activeSub.id },
      data: { status: 'EXPIRED' },
    });

    return subscription;
  },

  async checkExpiredSubscriptions() {
    const now = new Date();
    const expired = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lt: now },
      },
    });

    if (expired.length === 0) return { updatedCount: 0 };

    const ids = expired.map((s) => s.id);
    await prisma.subscription.updateMany({
      where: { id: { in: ids } },
      data: { status: 'EXPIRED' },
    });

    return { updatedCount: ids.length };
  },

  async getExpiringSoon(days: number = 7) {
    const now = new Date();
    const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gte: now, lte: threshold },
      },
      orderBy: { endDate: 'asc' },
      include: {
        user: {
          select: { id: true, email: true, username: true, displayName: true },
        },
      },
    });

    return subscriptions;
  },

  async getAllSubscriptions(page: number = 1, limit: number = 20) {
    page = Math.max(1, page);
    limit = Math.min(100, Math.max(1, limit));
    const skip = (page - 1) * limit;

    const where: any = {};

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

    return {
      data: subscriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const count = await prisma.subscription.count({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { gte: new Date() },
      },
    });
    return count > 0;
  },

  async extendSubscription(subscriptionId: string, additionalDays: number) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) throw new AppError('Abonelik bulunamadı', 404);

    const baseEnd = subscription.endDate > new Date() ? subscription.endDate : new Date();
    const newEnd = new Date(baseEnd.getTime() + additionalDays * 24 * 60 * 60 * 1000);

    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { endDate: newEnd, status: 'ACTIVE' },
      include: {
        user: { select: { id: true, email: true, username: true } },
      },
    });

    return updated;
  },
};
