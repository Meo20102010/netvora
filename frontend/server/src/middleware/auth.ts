import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthRequest, JwtPayload } from '../types';
import prisma from '../config/database';

export type { AuthRequest, JwtPayload } from '../types';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Yetkilendirme gerekli' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Geçersiz veya süresi dolmuş token' });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      req.user = decoded;
    }
  } catch {} // Silently fail
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(403).json({ success: false, error: 'Bu işlem için admin yetkisi gerekli' });
    return;
  }
  if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
    next();
    return;
  }
  prisma.user.findUnique({ where: { id: req.user.userId }, select: { role: true } })
    .then(user => {
      if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
        req.user!.role = user.role;
        next();
      } else {
        res.status(403).json({ success: false, error: 'Bu işlem için admin yetkisi gerekli' });
      }
    })
    .catch(() => {
      res.status(403).json({ success: false, error: 'Bu işlem için admin yetkisi gerekli' });
    });
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ success: false, error: 'Bu işlem için süper admin yetkisi gerekli' });
    return;
  }
  next();
}
