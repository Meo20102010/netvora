import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { scanFolder, importSeries, getProgress } from '../services/importService';

const router = Router();

function asyncHandler(fn: (req: any, res: any, next: any) => Promise<any>) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Public: progress SSE (uses unguessable import ID, no auth needed)
router.get('/progress/:id', asyncHandler(async (req: any, res: any) => {
  const { id } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = () => {
    const progress = getProgress(id);
    if (progress) {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
      if (progress.status === 'completed' || progress.status === 'error') {
        res.end();
        return true;
      }
    }
    return false;
  };

  if (send()) return;
  const interval = setInterval(() => { if (send()) clearInterval(interval); }, 500);
  req.on('close', () => clearInterval(interval));
}));

// Admin-only routes below
router.use(authenticate, requireAdmin);

// Scan folder to preview what will be imported
router.post('/scan', asyncHandler(async (req: any, res: any) => {
  const { folderPath } = req.body;
  if (!folderPath) {
    return res.status(400).json({ success: false, error: 'folderPath gerekli' });
  }

  try {
    const scanned = await scanFolder(folderPath);
    const totalEpisodes = scanned.reduce((sum, s) => sum + s.totalEpisodes, 0);
    res.json({
      success: true,
      data: {
        series: scanned,
        totalSeries: scanned.length,
        totalEpisodes,
      },
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
}));

// Start import (background, returns import ID)
router.post('/start', asyncHandler(async (req: any, res: any) => {
  const { folderPath, genre, year } = req.body;
  if (!folderPath) {
    return res.status(400).json({ success: false, error: 'folderPath gerekli' });
  }

  const importId = `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  importSeries(folderPath, importId, { genre, year }).catch(() => {});

  res.json({
    success: true,
    data: { importId },
    message: 'İçe aktarma başlatıldı',
  });
}));

export default router;
