import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

router.post('/profiles', userController.createProfile);
router.put('/profiles/:id', userController.updateProfileById);
router.delete('/profiles/:id', userController.deleteProfile);

router.get('/watch-history', userController.getWatchHistory);
router.post('/watch-history', userController.saveWatchProgress);

router.get('/favorites', userController.getFavorites);
router.post('/favorites/:contentId', userController.addToFavorites);
router.delete('/favorites/:contentId', userController.removeFromFavorites);

router.get('/watch-later', userController.getWatchLater);
router.post('/watch-later/:contentId', userController.addToWatchLater);
router.delete('/watch-later/:contentId', userController.removeFromWatchLater);

router.delete('/watch-history/:contentId', userController.deleteWatchHistoryItem);

router.get('/continue-watching', userController.getContinueWatching);

router.get('/subscription', userController.getSubscription);

router.get('/notifications', userController.getNotifications);
router.put('/notifications/:id/read', userController.markNotificationRead);

// Ratings
router.get('/ratings', userController.getMyRatings);
router.post('/ratings/:contentId', userController.rateContent);
router.delete('/ratings/:contentId', userController.removeRating);

router.get('/stats', userController.getMyStats);
router.get('/my-comments', userController.getMyComments);

export default router;
