import { Response, NextFunction } from 'express';
import { paymentService } from '../services/paymentService';
import { AuthRequest } from '../types';

function asyncHandler(fn: (req: any, res: Response, next: NextFunction) => Promise<any>) {
  return (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export const paymentController = {
  createPayment: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { amount, currency } = req.body;
    if (!amount || amount <= 0) {
      res.status(400).json({ success: false, error: 'Geçerli bir tutar girin' });
      return;
    }

    const result = await paymentService.createPayment(req.user!.userId, amount, currency || 'TRY');
    res.status(201).json({
      success: true,
      data: result,
      message: 'Ödeme talebi oluşturuldu. WhatsApp üzerinden iletişime geçin.',
    });
  }),

  getMyPayments: asyncHandler(async (req: AuthRequest, res: Response) => {
    const payments = await paymentService.getUserPayments(req.user!.userId);
    res.json({ success: true, data: payments });
  }),

  getAllPayments: asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const result = await paymentService.getPayments(page, limit, status);
    res.json({ success: true, ...result });
  }),

  processPayment: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['completed', 'rejected', 'pending'].includes(status)) {
      res.status(400).json({ success: false, error: 'Geçersiz durum' });
      return;
    }

    const payment = await paymentService.processPayment(id, status, req.user!.userId);
    res.json({ success: true, data: payment, message: 'Ödeme güncellendi' });
  }),

  getRevenue: asyncHandler(async (req: AuthRequest, res: Response) => {
    const revenue = await paymentService.getRevenue();
    res.json({ success: true, data: revenue });
  }),
};
