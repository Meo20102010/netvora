import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { config } from '../config';
import { JwtPayload } from '../types';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
});

export function generateTokens(userId: string, email: string, role: string, username: string) {
  const accessToken = jwt.sign({ userId, email, role, username } as JwtPayload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any,
  });
  const refreshToken = jwt.sign({ userId, email, role, username } as JwtPayload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as any,
  });
  return { token: accessToken, refreshToken };
}

async function sendVerificationEmail(to: string, token: string) {
  const url = `${config.site.url}/verify-email?token=${token}`;
  try {
    await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject: 'Netvora - E-posta Doğrulama',
      html: `<p>E-posta adresinizi doğrulamak için <a href="${url}">buraya tıklayın</a>.</p><p>Veya tarayıcınıza şu linki yapıştırın: ${url}</p>`,
    });
  } catch (err) {
    console.error('Failed to send verification email:', err);
  }
}

async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${config.site.url}/reset-password?token=${token}`;
  try {
    await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject: 'Netvora - Şifre Sıfırlama',
      html: `<p>Şifrenizi sıfırlamak için <a href="${url}">buraya tıklayın</a>.</p><p>Veya tarayıcınıza şu linki yapıştırın: ${url}</p><p>Bu bağlantı 1 saat geçerlidir.</p>`,
    });
  } catch (err) {
    console.error('Failed to send password reset email:', err);
  }
}

export const authService = {
  async register(email: string, password: string, username: string, displayName?: string) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) throw new AppError('Bu e-posta adresi zaten kayıtlı', 409);

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) throw new AppError('Bu kullanıcı adı zaten alınmış', 409);

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        displayName: displayName || username,
        verificationToken,
      },
    });

    const tokens = generateTokens(user.id, user.email, user.role, user.username);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await sendVerificationEmail(user.email, verificationToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
      ...tokens,
    };
  },

  async login(email: string, password: string, rememberMe?: boolean) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('E-posta veya şifre hatalı', 401);
    if (user.isBanned) throw new AppError('Hesabınız askıya alınmıştır', 403);

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new AppError('E-posta veya şifre hatalı', 401);

    const tokens = generateTokens(user.id, user.email, user.role, user.username);

    const expiresAt = rememberMe
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        avatar: user.avatar,
      },
      ...tokens,
    };
  },

  async refreshToken(refreshTokenStr: string) {
    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshTokenStr, config.jwt.refreshSecret) as JwtPayload;
    } catch {
      throw new AppError('Geçersiz veya süresi dolmuş refresh token', 401);
    }

    const session = await prisma.userSession.findUnique({ where: { refreshToken: refreshTokenStr } });
    if (!session) throw new AppError('Oturum bulunamadı', 401);

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.isBanned) throw new AppError('Kullanıcı bulunamadı veya hesabınız askıya alınmış', 401);

    const tokens = generateTokens(user.id, user.email, user.role, user.username);

    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
      ...tokens,
    };
  },

  async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({ where: { verificationToken: token } });
    if (!user) throw new AppError('Geçersiz doğrulama tokenı', 400);

    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verificationToken: null },
    });

    return { message: 'E-posta başarıyla doğrulandı' };
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi' };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    await sendPasswordResetEmail(user.email, resetToken);

    return { message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi' };
  },

  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gte: new Date() } },
    });
    if (!user) throw new AppError('Geçersiz veya süresi dolmuş sıfırlama tokenı', 400);

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null },
    });

    return { message: 'Şifreniz başarıyla sıfırlandı' };
  },

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });
    if (!user) throw new AppError('Kullanıcı bulunamadı', 404);
    return user;
  },

  async updateLastLogin(userId: string, ip: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });
  },

  async updateProfile(userId: string, data: { displayName?: string; avatar?: string }) {
    const allowedFields: Record<string, any> = {};
    if (data.displayName !== undefined) allowedFields.displayName = data.displayName;
    if (data.avatar !== undefined) allowedFields.avatar = data.avatar;

    if (Object.keys(allowedFields).length === 0) {
      throw new AppError('Güncellenecek alan bulunamadı', 400);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: allowedFields,
      select: { id: true, email: true, username: true, displayName: true, avatar: true, role: true },
    });
    return user;
  },
};
