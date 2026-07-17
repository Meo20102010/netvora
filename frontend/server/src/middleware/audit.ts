import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../types';

export function auditLog(action: string, resource: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);
    
    res.json = function (body: any) {
      if (res.statusCode < 400) {
        prisma.auditLog.create({
          data: {
            userId: req.user?.userId,
            action,
            resource,
            resourceId: req.params.id || body?.data?.id,
            details: JSON.stringify({ method: req.method, path: req.path, body: sanitizeBody(req.body) }),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        }).catch(() => {});
      }
      return originalJson(body);
    };
    
    next();
  };
}

function sanitizeBody(body: any): any {
  if (!body) return {};
  const sanitized = { ...body };
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.refreshToken;
  return sanitized;
}
