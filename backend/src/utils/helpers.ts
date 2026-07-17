import { BASE_PRICE_TRY, CURRENCIES } from '../types';

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function calculatePriceInCurrency(currency: string): { price: number; symbol: string; currency: string } {
  const currencyData = CURRENCIES[currency.toUpperCase()];
  if (!currencyData) {
    return { price: BASE_PRICE_TRY, symbol: '₺', currency: 'TRY' };
  }
  const price = Math.round(BASE_PRICE_TRY * currencyData.rate * 100) / 100;
  return { price, symbol: currencyData.symbol, currency: currency.toUpperCase() };
}

export function calculateExpiryDate(days: number = 30): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export function isSubscriptionActive(endDate: Date): boolean {
  return new Date() < endDate;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}s ${mins}dk`;
  }
  return `${mins}dk`;
}
