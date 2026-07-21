import type { Content } from '@/types';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function getContentBySlug(slug: string): Promise<Content | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://netvora-green.vercel.app';
    const res = await fetch(`${baseUrl}/api/content/slug/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export async function getContentById(id: string): Promise<Content | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://netvora-green.vercel.app';
    const res = await fetch(`${baseUrl}/api/content/${encodeURIComponent(id)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export async function getSlugById(id: string): Promise<{ slug: string; type: string } | null> {
  try {
    const row = await prisma.content.findUnique({
      where: { id },
      select: { slug: true, type: true },
    });
    return row || null;
  } catch {
    return null;
  }
}

export async function getAllActiveContent(): Promise<Content[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://netvora-green.vercel.app';
    const res = await fetch(`${baseUrl}/api/content?type=ALL&limit=100&isActive=true`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

interface SitemapContent {
  slug: string;
  type: string;
  updatedAt: Date;
  seasons: { seasonNumber: number; episodes: { episodeNumber: number }[] }[];
}

export async function getAllContentForSitemap(): Promise<SitemapContent[]> {
  try {
    const contents = await prisma.content.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        type: true,
        updatedAt: true,
        seasons: {
          select: {
            seasonNumber: true,
            episodes: {
              select: { episodeNumber: true },
              orderBy: { episodeNumber: 'asc' },
            },
          },
          orderBy: { seasonNumber: 'asc' },
        },
      },
    });
    return contents;
  } catch (err) {
    console.error('Sitemap DB fetch error:', err);
    return [];
  }
}

export { prisma };
