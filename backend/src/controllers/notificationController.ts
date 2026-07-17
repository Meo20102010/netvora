import { Response, NextFunction } from 'express';
import { notificationService } from '../services/notificationService';
import { AuthRequest } from '../types';

function asyncHandler(fn: (req: any, res: Response, next: NextFunction) => Promise<any>) {
  return (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export const notificationController = {
  getMyNotifications: asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await notificationService.getUserNotifications(req.user!.userId, page, limit);
    res.json({ success: true, ...result });
  }),

  markAsRead: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const notification = await notificationService.markAsRead(id);
    res.json({ success: true, data: notification, message: 'Bildirim okundu olarak işaretlendi' });
  }),

  markAllAsRead: asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await notificationService.markAllAsRead(req.user!.userId);
    res.json({ success: true, message: result.message });
  }),

  getUnreadCount: asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await notificationService.getUnreadCount(req.user!.userId);
    res.json({ success: true, data: result });
  }),
};
