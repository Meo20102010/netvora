import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { contentService } from '../services/contentService';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { AuthRequest, ApiResponse } from '../types';
import { Response, NextFunction } from 'express';
import prisma from '../config/database';
const router = Router();

router.use(authenticate, requireAdmin);

function asyncHandler(fn: (req: any, res: Response, next: NextFunction) => Promise<any>) {
  return (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

router.get('/dashboard', adminController.getDashboard);

router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', auditLog('UPDATE_USER', 'User'), adminController.updateUser);
router.delete('/users/:id', auditLog('DELETE_USER', 'User'), adminController.deleteUser);
router.post('/users/:id/ban', auditLog('BAN_USER', 'User'), adminController.banUser);
router.post('/users/:id/unban', auditLog('UNBAN_USER', 'User'), adminController.unbanUser);
router.post('/users/:id/reset-password', auditLog('RESET_USER_PASSWORD', 'User'), adminController.resetUserPassword);
router.post('/users/create-admin', requireSuperAdmin, auditLog('CREATE_ADMIN', 'User'), adminController.createAdmin);

router.get('/settings', adminController.getSiteSettings);
router.put('/settings', auditLog('UPDATE_SETTINGS', 'SiteSetting'), adminController.updateSiteSettings);

router.get('/audit-logs', adminController.getAuditLogs);

router.post('/content', auditLog('CREATE_CONTENT', 'Content'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const content = await contentService.create(req.body);
  res.status(201).json({ success: true, data: content, message: 'İçerik oluşturuldu' });
}));

router.put('/content/:id', auditLog('UPDATE_CONTENT', 'Content'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const content = await contentService.update(req.params.id, req.body);
  res.json({ success: true, data: content, message: 'İçerik güncellendi' });
}));

router.delete('/content/:id', auditLog('DELETE_CONTENT', 'Content'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await contentService.delete(req.params.id);
  res.json({ success: true, message: result.message });
}));

router.post('/content/:id/seasons', auditLog('CREATE_SEASON', 'Season'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const season = await contentService.createSeason(req.params.id, req.body.seasonNumber, req.body.title);
  res.status(201).json({ success: true, data: season, message: 'Sezon oluşturuldu' });
}));

router.post('/content/seasons/:id/episodes', auditLog('CREATE_EPISODE', 'Episode'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const episode = await contentService.createEpisode(req.params.id, req.body.episodeNumber, req.body.title, req.body.description);
  if (req.body.videoUrl) {
    const season = await prisma.season.findUnique({ where: { id: req.params.id } });
    if (season) {
      await prisma.video.create({ data: { episodeId: episode.id, url: req.body.videoUrl, quality: req.body.quality || 'HD', language: 'tr' } });
    }
  }
  const updated = await prisma.episode.findUnique({ where: { id: episode.id }, include: { videos: true } });
  res.status(201).json({ success: true, data: updated, message: 'Bölüm oluşturuldu' });
}));

router.delete('/content/episodes/:id', auditLog('DELETE_EPISODE', 'Episode'), asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.video.deleteMany({ where: { episodeId: req.params.id } });
  await prisma.episode.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Bölüm silindi' });
}));

router.post('/content/:id/videos', auditLog('ADD_VIDEO', 'Video'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const video = await contentService.addVideo(
    { contentId: req.params.id },
    req.body.url,
    req.body.quality,
    req.body.language,
    req.body.subtitle,
  );
  res.status(201).json({ success: true, data: video, message: 'Video eklendi' });
}));

router.get('/subscriptions', adminController.getSubscriptions);
router.post('/subscriptions/user/:userId', auditLog('ACTIVATE_SUBSCRIPTION', 'Subscription'), adminController.activateUserSubscription);
router.put('/subscriptions/:id', auditLog('UPDATE_SUBSCRIPTION', 'Subscription'), adminController.updateSubscription);

router.get('/movies', adminController.getMovies);
router.get('/series', adminController.getSeries);

router.get('/categories', adminController.getCategories);
router.post('/categories', auditLog('CREATE_CATEGORY', 'Category'), adminController.createCategory);
router.put('/categories/:id', auditLog('UPDATE_CATEGORY', 'Category'), adminController.updateCategory);
router.delete('/categories/:id', auditLog('DELETE_CATEGORY', 'Category'), adminController.deleteCategory);

router.get('/payments', adminController.getPayments);
router.put('/payments/:id', auditLog('PROCESS_PAYMENT', 'Payment'), adminController.processPayment);

// Notification broadcast
router.post('/notifications/broadcast', adminController.broadcastNotification);

// Banner management
router.get('/banners', adminController.getBanners);
router.post('/banners', auditLog('CREATE_BANNER', 'Banner'), adminController.createBanner);
router.put('/banners/:id', auditLog('UPDATE_BANNER', 'Banner'), adminController.updateBanner);
router.delete('/banners/:id', auditLog('DELETE_BANNER', 'Banner'), adminController.deleteBanner);

export default router;
