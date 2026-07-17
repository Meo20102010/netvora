import { Response, NextFunction } from 'express';
import { subscriptionService } from '../services/subscriptionService';
import { AuthRequest } from '../types';
import { config } from '../config';

function asyncHandler(fn: (req: any, res: Response, next: NextFunction) => Promise<any>) {
  return (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export const subscriptionController = {
  getMySubscription: asyncHandler(async (req: AuthRequest, res: Response) => {
    const subscription = await subscriptionService.getUserSubscription(req.user!.userId);
    res.json({ success: true, data: subscription || null });
  }),

  purchaseSubscription: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { amount, currency, planName } = req.body;
    const user = req.user!;

    const phone = config.whatsapp.number.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Merhaba, Netvora'ya katılmak istiyorum.\n\nKullanıcı ID: ${user.userId}\nKullanıcı Adı: ${user.username}\nE-posta: ${user.email}\nPlan: ${planName || 'Premium'}\nTutar: ${amount || 200} ${currency || 'TRY'}\n\nOnaylıyorum.`
    );
    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;

    res.json({
      success: true,
      data: { whatsappUrl },
      message: 'Ödeme için WhatsApp üzerinden iletişime geçin',
    });
  }),

  getAllSubscriptions: asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await subscriptionService.getAllSubscriptions(page, limit);
    res.json({ success: true, ...result });
  }),
};
