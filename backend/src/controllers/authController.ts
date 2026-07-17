import { Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { AuthRequest } from '../types';
import { registerSchema, loginSchema } from '../utils/validators';

function asyncHandler(fn: (req: any, res: Response, next: NextFunction) => Promise<any>) {
  return (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export const authController = {
  register: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data.email, data.password, data.username, data.displayName);
    res.status(201).json({ success: true, data: result, message: 'Kayıt başarılı' });
  }),

  login: asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data.email, data.password, data.rememberMe);
    const ip = req.ip || req.socket.remoteAddress || '';
    await authService.updateLastLogin(result.user.id, ip).catch(() => {});
    res.json({ success: true, data: result, message: 'Giriş başarılı' });
  }),

  refreshToken: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, error: 'Refresh token gerekli' });
      return;
    }
    const result = await authService.refreshToken(refreshToken);
    res.json({ success: true, data: result, message: 'Token yenilendi' });
  }),

  verifyEmail: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ success: false, error: 'Doğrulama tokenı gerekli' });
      return;
    }
    const result = await authService.verifyEmail(token);
    res.json({ success: true, data: result, message: result.message });
  }),

  forgotPassword: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: 'E-posta adresi gerekli' });
      return;
    }
    const result = await authService.forgotPassword(email);
    res.json({ success: true, data: result, message: result.message });
  }),

  resetPassword: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ success: false, error: 'Token ve yeni şifre gerekli' });
      return;
    }
    const result = await authService.resetPassword(token, password);
    res.json({ success: true, data: result, message: result.message });
  }),

  getMe: asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await authService.getUserById(req.user!.userId);
    res.json({ success: true, data: user });
  }),

  updateProfile: asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await authService.updateProfile(req.user!.userId, req.body);
    res.json({ success: true, data: user, message: 'Profil güncellendi' });
  }),
};
