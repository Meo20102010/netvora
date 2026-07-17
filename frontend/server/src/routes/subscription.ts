import { Router } from 'express';
import { subscriptionController } from '../controllers/subscriptionController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/my-subscription', authenticate, subscriptionController.getMySubscription);
router.post('/purchase', authenticate, subscriptionController.purchaseSubscription);
router.get('/admin/all', authenticate, requireAdmin, subscriptionController.getAllSubscriptions);

export default router;
