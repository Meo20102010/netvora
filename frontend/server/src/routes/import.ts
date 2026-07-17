import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

function asyncHandler(fn: (req: any, res: any, next: any) => Promise<any>) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Import features require a local server with filesystem access.
// These routes are stubbed for Vercel serverless deployment.

router.get('/progress/:id', asyncHandler(async (req: any, res: any) => {
  res.json({ success: false, message: 'Dosya içe aktarma serverless modda desteklenmiyor.' });
}));

router.use(authenticate, requireAdmin);

router.post('/scan', asyncHandler(async (req: any, res: any) => {
  res.status(400).json({ success: false, message: 'Dosya sistemi tarama serverless modda desteklenmiyor. İçeriği manuel olarak ekleyin.' });
}));

router.post('/start', asyncHandler(async (req: any, res: any) => {
  res.status(400).json({ success: false, message: 'Dosya içe aktarma serverless modda desteklenmiyor. İçeriği manuel olarak ekleyin.' });
}));

export default router;
