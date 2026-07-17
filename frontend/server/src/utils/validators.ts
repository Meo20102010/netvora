import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalıdır').max(20),
  displayName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Şifre gereklidir'),
  rememberMe: z.boolean().optional(),
});

export const contentSchema = z.object({
  title: z.string().min(1, 'Başlık gereklidir'),
  type: z.enum(['MOVIE', 'SERIES', 'DOCUMENTARY', 'ANIMATION', 'STANDUP', 'ORIGINAL']),
  description: z.string().optional(),
  posterUrl: z.string().url().optional().or(z.literal('')),
  coverUrl: z.string().url().optional().or(z.literal('')),
  trailerUrl: z.string().url().optional().or(z.literal('')),
  year: z.number().int().optional(),
  duration: z.number().int().optional(),
  imdbRating: z.number().min(0).max(10).optional(),
  director: z.string().optional(),
  cast: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  subtitle: z.string().optional(),
  quality: z.enum(['SD', 'HD', 'FULL_HD', 'UHD_4K']).optional(),
  categoryId: z.string().uuid().optional(),
  isFeatured: z.boolean().optional(),
  videoUrl: z.string().optional(),
});

export const profileSchema = z.object({
  name: z.string().min(1, 'Profil adı gereklidir').max(30),
  avatar: z.string().optional(),
  isChild: z.boolean().optional(),
  pinCode: z.string().length(4).optional().nullable(),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Kategori adı gereklidir'),
  description: z.string().optional(),
  image: z.string().optional(),
  sortOrder: z.number().int().optional(),
});
