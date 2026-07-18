import { Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../config/database';
import { generateTokens } from '../services/authService';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

function asyncHandler(fn: (req: any, res: Response, next: any) => Promise<any>) {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export const googleAuthController = {
  googleLogin: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { credential } = req.body;
    if (!credential) throw new AppError('Google credential gerekli', 400);

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) throw new AppError('Google doğrulama başarısız', 401);

    const { email, name, picture, sub: googleId } = payload;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const username = email.split('@')[0] + '_' + Math.random().toString(36).slice(2, 6);
      user = await prisma.user.create({
        data: {
          email,
          username,
          displayName: name || username,
          password: '',
          role: 'USER',
          isVerified: true,
        },
      });
    }

    const result = generateTokens(user.id, user.email, user.role, user.username);
    const { password: _, ...safeUser } = user as any;

    res.json({
      success: true,
      data: { ...result, user: safeUser },
      message: 'Google ile giriş başarılı',
    });
  }),
};
