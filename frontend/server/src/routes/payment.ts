import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/create', authenticate, paymentController.createPayment);
router.get('/my-payments', authenticate, paymentController.getMyPayments);

router.get('/admin/all', authenticate, requireAdmin, paymentController.getAllPayments);
router.put('/admin/:id/process', authenticate, requireAdmin, paymentController.processPayment);
router.get('/admin/revenue', authenticate, requireAdmin, paymentController.getRevenue);

export default router;
