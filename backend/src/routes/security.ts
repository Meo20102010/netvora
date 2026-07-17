import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { authenticate, requireAdmin } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// POST /2fa/enable - Generate 2FA secret (simulated)
router.post('/2fa/enable', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const secret = crypto.randomBytes(20).toString('hex');
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.siteSetting.upsert({
      where: { key: `2fa_${userId}` },
      update: { value: JSON.stringify({ secret, enabled: false, code }) },
      create: { key: `2fa_${userId}`, value: JSON.stringify({ secret, enabled: false, code }), type: 'json' },
    });

    res.json({ success: true, data: { secret, code, message: '2FA secret generated. Verify the code to activate.' } });
  } catch (error) {
    res.status(500).json({ success: false, error: '2FA enable failed' });
  }
});

// POST /2fa/verify - Verify 2FA code
router.post('/2fa/verify', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { code } = req.body;

    const setting = await prisma.siteSetting.findUnique({ where: { key: `2fa_${userId}` } });
    if (!setting) {
      res.status(400).json({ success: false, error: '2FA not initialized. Enable 2FA first.' });
      return;
    }

    const data = JSON.parse(setting.value);
    if (data.code !== code) {
      res.status(400).json({ success: false, error: 'Invalid verification code' });
      return;
    }

    await prisma.siteSetting.update({
      where: { key: `2fa_${userId}` },
      data: { value: JSON.stringify({ ...data, enabled: true }) },
    });

    res.json({ success: true, data: { message: '2FA enabled successfully' } });
  } catch (error) {
    res.status(500).json({ success: false, error: '2FA verification failed' });
  }
});

// POST /2fa/disable - Disable 2FA
router.post('/2fa/disable', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { code } = req.body;

    const setting = await prisma.siteSetting.findUnique({ where: { key: `2fa_${userId}` } });
    if (!setting) {
      res.status(400).json({ success: false, error: '2FA is not enabled' });
      return;
    }

    const data = JSON.parse(setting.value);
    if (data.code !== code) {
      res.status(400).json({ success: false, error: 'Invalid code' });
      return;
    }

    await prisma.siteSetting.delete({ where: { key: `2fa_${userId}` } });

    res.json({ success: true, data: { message: '2FA disabled successfully' } });
  } catch (error) {
    res.status(500).json({ success: false, error: '2FA disable failed' });
  }
});

// GET /login-history - Get user's login history
router.get('/login-history', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const history = await prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load login history' });
  }
});

// GET /devices - Get active sessions
router.get('/devices', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const sessions = await prisma.userSession.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load devices' });
  }
});

// DELETE /devices/:id - Revoke a session
router.delete('/devices/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const session = await prisma.userSession.findFirst({ where: { id, userId } });
    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    await prisma.userSession.delete({ where: { id } });

    res.json({ success: true, data: { message: 'Session revoked' } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to revoke session' });
  }
});

// POST /block-ip - Block an IP (admin only)
router.post('/block-ip', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ip } = req.body;
    if (!ip) {
      res.status(400).json({ success: false, error: 'IP address is required' });
      return;
    }

    const setting = await prisma.siteSetting.findUnique({ where: { key: 'blocked_ips' } });
    let blockedIps: string[] = setting ? JSON.parse(setting.value) : [];

    if (blockedIps.includes(ip)) {
      res.status(400).json({ success: false, error: 'IP is already blocked' });
      return;
    }

    blockedIps.push(ip);

    await prisma.siteSetting.upsert({
      where: { key: 'blocked_ips' },
      update: { value: JSON.stringify(blockedIps) },
      create: { key: 'blocked_ips', value: JSON.stringify(blockedIps), type: 'json' },
    });

    res.json({ success: true, data: { message: `IP ${ip} blocked successfully`, blockedIps } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to block IP' });
  }
});

// GET /blocked-ips - List blocked IPs
router.get('/blocked-ips', authenticate, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'blocked_ips' } });
    const blockedIps: string[] = setting ? JSON.parse(setting.value) : [];

    res.json({ success: true, data: blockedIps });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load blocked IPs' });
  }
});

// DELETE /blocked-ips/:ip - Unblock IP
router.delete('/blocked-ips/:ip', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ip } = req.params;
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'blocked_ips' } });
    let blockedIps: string[] = setting ? JSON.parse(setting.value) : [];

    blockedIps = blockedIps.filter(i => i !== decodeURIComponent(ip));

    await prisma.siteSetting.update({
      where: { key: 'blocked_ips' },
      data: { value: JSON.stringify(blockedIps) },
    });

    res.json({ success: true, data: { message: 'IP unblocked', blockedIps } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to unblock IP' });
  }
});

export default router;
