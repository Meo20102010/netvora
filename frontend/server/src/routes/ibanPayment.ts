import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AuthRequest } from '../types';

function asyncHandler(fn: (req: any, res: Response, next: NextFunction) => Promise<any>) {
  return (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const IBAN_INFO = {
  iban: 'TR02 0014 3000 0000 0027 8223 48',
  ownerName: 'MUSTAFA SELEME',
  bankName: 'UPTION',
};

export function ibanPaymentRoutes(prisma: PrismaClient): Router {
  const router = Router();

  // GET /iban-info - Public IBAN info
  router.get('/iban-info', (_req, res) => {
    res.json({ success: true, data: IBAN_INFO });
  });

  // POST /create - Create payment request
  router.post('/create', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { amount, packageName, duration } = req.body;
    const userId = req.user!.userId;

    if (!amount || !packageName || !duration) {
      return res.status(400).json({ success: false, message: 'amount, packageName ve duration gerekli' });
    }
    if (Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Geçersiz tutar' });
    }

    const paymentCode = `NV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const payment = await prisma.ibanPayment.create({
      data: {
        userId,
        amount: Number(amount),
        packageName: String(packageName),
        duration: Number(duration),
        paymentCode,
        iban: IBAN_INFO.iban,
      },
    });
    res.status(201).json({ success: true, data: payment, message: 'Ödeme talebi oluşturuldu' });
  }));

  // POST /:id/receipt - Upload receipt (base64 in serverless)
  router.post('/:id/receipt', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { receiptData, receiptMime, receiptFilename } = req.body;

    const payment = await prisma.ibanPayment.findUnique({ where: { id } });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Ödeme bulunamadı' });
    }
    if (payment.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Bu ödeme size ait değil' });
    }
    if (payment.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Bu ödeme zaten işlendi' });
    }

    if (receiptData) {
      const updated = await prisma.ibanPayment.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          receiptData: receiptData,
          receiptMime: receiptMime || 'image/jpeg',
          receiptFilename: receiptFilename || 'receipt',
          receiptUrl: null,
        },
      });
      res.json({ success: true, data: updated, message: 'Dekont yüklendi' });
    } else if (req.body && req.is('application/json')) {
      return res.status(400).json({ success: false, message: 'receiptData (base64) gerekli' });
    } else {
      return res.status(400).json({ success: false, message: 'receiptData (base64) gerekli. Body: { receiptData: "data:image/...", receiptMime: "image/jpeg", receiptFilename: "dekont.jpg" }' });
    }
  }));

  // GET /my - User's own payments
  router.get('/my', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const payments = await prisma.ibanPayment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: payments });
  }));

  // GET /:id - Single payment
  router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const payment = await prisma.ibanPayment.findUnique({ where: { id }, include: { user: { select: { id: true, username: true, email: true } } } });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Ödeme bulunamadı' });
    }
    const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN';
    if (payment.userId !== userId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Bu ödemeyi görüntüleme yetkiniz yok' });
    }
    res.json({ success: true, data: payment });
  }));

  // GET /admin/all - Admin: list all payments
  router.get('/admin/all', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as string | undefined;
    const where: any = {};
    if (status && ['PENDING', 'RECEIVED', 'APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }
    const [payments, total] = await Promise.all([
      prisma.ibanPayment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, email: true, displayName: true } } },
      }),
      prisma.ibanPayment.count({ where }),
    ]);
    res.json({
      success: true,
      data: {
        payments,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  }));

  // POST /admin/:id/approve - Admin: approve payment
  router.post('/admin/:id/approve', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { adminNote } = req.body;
    const payment = await prisma.ibanPayment.findUnique({ where: { id } });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Ödeme bulunamadı' });
    }
    if (payment.status !== 'PENDING' && payment.status !== 'RECEIVED') {
      return res.status(400).json({ success: false, message: `Bu ödeme zaten ${payment.status} durumunda` });
    }
    const now = new Date();
    const endDate = new Date(now.getTime() + payment.duration * 24 * 60 * 60 * 1000);
    const [updated] = await prisma.$transaction([
      prisma.ibanPayment.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedBy: req.user!.userId,
          approvedAt: now,
          adminNote: adminNote || null,
        },
      }),
      prisma.subscription.create({
        data: {
          userId: payment.userId,
          packageName: payment.packageName,
          price: payment.amount,
          currency: payment.currency,
          startDate: now,
          endDate,
          status: 'ACTIVE',
        },
      }),
    ]);
    res.json({ success: true, data: updated, message: 'Ödeme onaylandı ve abonelik aktifleştirildi' });
  }));

  // POST /admin/:id/reject - Admin: reject payment
  router.post('/admin/:id/reject', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { adminNote } = req.body;
    const payment = await prisma.ibanPayment.findUnique({ where: { id } });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Ödeme bulunamadı' });
    }
    if (payment.status !== 'PENDING' && payment.status !== 'RECEIVED') {
      return res.status(400).json({ success: false, message: `Bu ödeme zaten ${payment.status} durumunda` });
    }
    const updated = await prisma.ibanPayment.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        adminNote: adminNote || null,
      },
    });
    res.json({ success: true, data: updated, message: 'Ödeme reddedildi' });
  }));

  // DELETE /admin/:id - Admin: delete payment
  router.delete('/admin/:id', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const payment = await prisma.ibanPayment.findUnique({ where: { id } });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Ödeme bulunamadı' });
    }
    await prisma.ibanPayment.delete({ where: { id } });
    res.json({ success: true, message: 'Ödeme silindi' });
  }));

  return router;
}
