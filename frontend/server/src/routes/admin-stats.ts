import { Router, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

let requestCount = 0;
let lastMinuteReset = Date.now();

router.use((_req, _res, next) => {
  const now = Date.now();
  if (now - lastMinuteReset >= 60000) {
    requestCount = 0;
    lastMinuteReset = now;
  }
  requestCount++;
  next();
});

// GET /server - Server stats (serverless mode)
router.get('/server', authenticate, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      data: {
        cpu: { usage: 0, cores: 0, model: 'Serverless (Vercel)', speed: 0 },
        memory: { total: 0, used: 0, free: 0, percentage: 0 },
        disk: null,
        uptime: 0,
        loadAverage: { '1m': 0, '5m': 0, '15m': 0 },
        platform: 'serverless',
        hostname: 'vercel',
        nodeVersion: process.version,
        note: 'Serverless modda sistem bilgisi mevcut değil',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get server stats' });
  }
});

// GET /realtime - Real-time data
router.get('/realtime', authenticate, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const onlineUsers = await prisma.userSession.count({
      where: { expiresAt: { gt: new Date() } },
    });
    const recentActions = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { username: true, displayName: true } } },
    });
    res.json({
      success: true,
      data: {
        onlineUsers,
        activeSessions: onlineUsers,
        requestsPerMinute: requestCount,
        recentActions,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get realtime data' });
  }
});

// GET /queue - Queue status
router.get('/queue', authenticate, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      data: { pending: 0, processing: 0, completed: 0, failed: 0, items: [] },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get queue status' });
  }
});

// GET /audit - Extended audit logs
router.get('/audit', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '50', action, resource, userId, startDate, endDate } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = {};
    if (action) where.action = action as string;
    if (resource) where.resource = resource as string;
    if (userId) where.userId = userId as string;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, email: true, displayName: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load audit logs' });
  }
});

export default router;
