import { Router, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { authenticate } from '../middleware/auth';

const router = Router();

const PLANS = [
  { id: 'bireysel', name: 'Bireysel', price: 200, days: 30, features: ['Sınırsız film ve dizi', 'HD kalite', 'Reklamsız izleme', 'Çevrimdışı indirme', 'Tüm cihazlarda izleme'] },
  { id: 'aile', name: 'Aile', price: 350, days: 30, features: ['5 profile kadar', '4K Ultra HD', 'Reklamsız izleme', 'Çevrimdışı indirme', 'Tüm cihazlarda izleme', 'Aile paylaşımı'] },
  { id: 'ogrenci', name: 'Öğrenci', price: 100, days: 30, features: ['Sınırsız film ve dizi', 'HD kalite', 'Reklamsız izleme', 'Öğrenci indirimi %50'] },
  { id: 'deneme', name: 'Deneme', price: 0, days: 3, features: ['Sınırsız film ve dizi', 'HD kalite', 'Reklamsız izleme', '3 gün ücretsiz'] },
];

// POST /coupon/redeem
router.post('/coupon/redeem', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ success: false, error: 'Coupon code is required' });
      return;
    }

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon) {
      res.status(404).json({ success: false, error: 'Coupon not found' });
      return;
    }

    if (!coupon.isActive) {
      res.status(400).json({ success: false, error: 'Coupon is no longer active' });
      return;
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      res.status(400).json({ success: false, error: 'Coupon has expired' });
      return;
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      res.status(400).json({ success: false, error: 'Coupon usage limit reached' });
      return;
    }

    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: coupon.usedCount + 1 },
    });

    res.json({
      success: true,
      data: {
        couponId: coupon.id,
        discount: coupon.discount,
        discountType: coupon.discountType,
        message: `Coupon applied: ${coupon.discount}${coupon.discountType === 'percent' ? '%' : ' TL'} discount`,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to redeem coupon' });
  }
});

// GET /coupon/validate/:code
router.get('/coupon/validate/:code', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

    if (!coupon) {
      res.json({ success: true, data: { valid: false, message: 'Coupon not found' } });
      return;
    }

    const isExpired = coupon.expiresAt ? new Date(coupon.expiresAt) < new Date() : false;
    const isMaxed = coupon.maxUses ? coupon.usedCount >= coupon.maxUses : false;

    res.json({
      success: true,
      data: {
        valid: coupon.isActive && !isExpired && !isMaxed,
        discount: coupon.discount,
        discountType: coupon.discountType,
        expiresAt: coupon.expiresAt,
        isExpired,
        isMaxed,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to validate coupon' });
  }
});

// POST /gift/redeem
router.post('/gift/redeem', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ success: false, error: 'Gift code is required' });
      return;
    }

    const coupon = await prisma.coupon.findUnique({ where: { code: `GIFT-${code.toUpperCase()}` } });
    if (!coupon) {
      res.status(404).json({ success: false, error: 'Gift code not found' });
      return;
    }

    if (!coupon.isActive) {
      res.status(400).json({ success: false, error: 'Gift code is no longer active' });
      return;
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      res.status(400).json({ success: false, error: 'Gift code usage limit reached' });
      return;
    }

    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: coupon.usedCount + 1 },
    });

    res.json({
      success: true,
      data: {
        discount: coupon.discount,
        discountType: coupon.discountType,
        message: `Gift code applied: ${coupon.discount}${coupon.discountType === 'percent' ? '%' : ' TL'} discount`,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to redeem gift code' });
  }
});

// GET /plans
router.get('/plans', async (_req, res: Response): Promise<void> => {
  try {
    res.json({ success: true, data: PLANS });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load plans' });
  }
});

// POST /trial/start
router.post('/trial/start', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const existing = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    if (existing) {
      res.status(400).json({ success: false, error: 'You already have an active subscription' });
      return;
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        packageName: 'Deneme',
        price: 0,
        currency: 'TRY',
        startDate: now,
        endDate,
        status: 'ACTIVE',
      },
    });

    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to start trial' });
  }
});

// GET /invoices
router.get('/invoices', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load invoices' });
  }
});

// POST /auto-renew/toggle
router.post('/auto-renew/toggle', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    if (!subscription) {
      res.status(400).json({ success: false, error: 'No active subscription found' });
      return;
    }

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { autoRenew: !subscription.autoRenew },
    });

    res.json({
      success: true,
      data: {
        autoRenew: updated.autoRenew,
        message: updated.autoRenew ? 'Auto-renewal enabled' : 'Auto-renewal disabled',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to toggle auto-renewal' });
  }
});

export default router;
