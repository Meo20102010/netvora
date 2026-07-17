import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export const paymentService = {
  async createPayment(userId: string, amount: number, currency: string = 'TRY') {
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount,
        currency,
        status: 'pending',
      },
      include: {
        user: {
          select: { id: true, email: true, username: true, displayName: true },
        },
      },
    });

    const phone = config.whatsapp.number.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Merhaba, Netvora'ya katılmak istiyorum.\n\nÖdeme Bilgileri:\nTutar: ${amount} ${currency}\nÖdeme ID: ${payment.id}\nKullanıcı: ${payment.user.username}\n\nOnaylıyorum.`
    );
    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;

    return { payment, whatsappUrl };
  },

  async processPayment(paymentId: string, status: string, adminId: string) {
    if (!['completed', 'rejected', 'pending'].includes(status)) {
      throw new AppError('Geçersiz durum. completed, rejected veya pending olmalıdır', 400);
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!payment) throw new AppError('Ödeme bulunamadı', 404);

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        processedBy: adminId,
        processedAt: new Date(),
      },
      include: {
        user: { select: { id: true, email: true, username: true, displayName: true } },
      },
    });

    if (status === 'completed' && payment.status !== 'completed') {
      const existingSub = await prisma.subscription.findFirst({
        where: { userId: payment.userId, status: 'ACTIVE', endDate: { gte: new Date() } },
        orderBy: { createdAt: 'desc' },
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

      await prisma.notification.create({
        data: {
          userId: payment.userId,
          title: 'Ödeme Onaylandı',
          message: `₺${payment.amount} tutarındaki ödemeniz onaylandı. Premium üyeliğiniz aktif!`,
          type: 'payment',
          link: '/profile',
        },
      });
    }

    if (status === 'rejected' && payment.status !== 'rejected') {
      await prisma.notification.create({
        data: {
          userId: payment.userId,
          title: 'Ödeme Reddedildi',
          message: `₺${payment.amount} tutarındaki ödemeniz reddedildi. Lütfen tekrar deneyin veya bizimle iletişime geçin.`,
          type: 'payment',
          link: '/pricing',
        },
      });
    }

    return updated;
  },

  async getPayments(page: number = 1, limit: number = 20, status?: string) {
    page = Math.max(1, page);
    limit = Math.min(100, Math.max(1, limit));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

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

    return {
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getUserPayments(userId: string) {
    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return payments;
  },

  async getRevenue() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalAgg, todayAgg] = await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'completed' },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'completed', createdAt: { gte: todayStart } },
      }),
    ]);

    return {
      total: totalAgg._sum.amount || 0,
      today: todayAgg._sum.amount || 0,
    };
  },
};
