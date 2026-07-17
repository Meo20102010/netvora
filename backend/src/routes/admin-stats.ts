import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { authenticate, requireAdmin } from '../middleware/auth';
import os from 'os';

const router = Router();
const prisma = new PrismaClient();

let requestCount = 0;
let lastMinuteReset = Date.now();

// Middleware to track requests per minute
router.use((_req, _res, next) => {
  const now = Date.now();
  if (now - lastMinuteReset >= 60000) {
    requestCount = 0;
    lastMinuteReset = now;
  }
  requestCount++;
  next();
});

// GET /server - Server stats
router.get('/server', authenticate, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;

    const diskUsage = {
      total: 0,
      used: 0,
      free: 0,
    };

    try {
      const { execSync } = await import('child_process');
      if (process.platform === 'win32') {
        const output = execSync('wmic logicaldisk where "DeviceID=\'C:\'" get Size,FreeSpace /format:csv', { encoding: 'utf-8' });
        const lines = output.trim().split('\n').filter(l => l.includes(','));
        if (lines.length > 0) {
          const parts = lines[lines.length - 1].split(',');
          const free = parseInt(parts[1]) || 0;
          const total = parseInt(parts[2]) || 0;
          diskUsage.total = total;
          diskUsage.free = free;
          diskUsage.used = total - free;
        }
      } else {
        const output = execSync('df -B1 / | tail -1', { encoding: 'utf-8' });
        const parts = output.trim().split(/\s+/);
        diskUsage.total = parseInt(parts[1]) || 0;
        diskUsage.used = parseInt(parts[2]) || 0;
        diskUsage.free = parseInt(parts[3]) || 0;
      }
    } catch {}

    const uptime = os.uptime();
    const loadAvg = os.loadavg();

    res.json({
      success: true,
      data: {
        cpu: {
          usage: Math.round(cpuUsage * 10) / 10,
          cores: cpus.length,
          model: cpus[0]?.model || 'Unknown',
          speed: cpus[0]?.speed || 0,
        },
        memory: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          percentage: Math.round((usedMem / totalMem) * 1000) / 10,
        },
        disk: diskUsage.total > 0 ? {
          total: diskUsage.total,
          used: diskUsage.used,
          free: diskUsage.free,
          percentage: Math.round((diskUsage.used / diskUsage.total) * 1000) / 10,
        } : null,
        uptime,
        loadAverage: {
          '1m': loadAvg[0],
          '5m': loadAvg[1],
          '15m': loadAvg[2],
        },
        platform: os.platform(),
        hostname: os.hostname(),
        nodeVersion: process.version,
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

    const activeSessions = await prisma.userSession.count({
      where: { expiresAt: { gt: new Date() } },
    });

    const requestsPerMinute = requestCount;

    const recentActions = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { username: true, displayName: true } } },
    });

    res.json({
      success: true,
      data: {
        onlineUsers,
        activeSessions,
        requestsPerMinute,
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
      data: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        items: [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get queue status' });
  }
});

// GET /audit - Extended audit logs with filters
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
