import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CurrencyRate {
  code: string;
  rate: number;
  symbol: string;
}

export const CURRENCIES: Record<string, { symbol: string; rate: number }> = {
  TRY: { symbol: '₺', rate: 1 },
  USD: { symbol: '$', rate: 0.031 },
  EUR: { symbol: '€', rate: 0.028 },
  GBP: { symbol: '£', rate: 0.024 },
  RUB: { symbol: '₽', rate: 2.78 },
  SAR: { symbol: '﷼', rate: 0.12 },
  AED: { symbol: 'د.إ', rate: 0.11 },
};

export const BASE_PRICE_TRY = 200;
