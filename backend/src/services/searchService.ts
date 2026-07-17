import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SearchFilters {
  type?: string;
  categoryId?: string;
  genre?: string;
  yearMin?: number;
  yearMax?: number;
  imdbMin?: number;
  country?: string;
  language?: string;
  quality?: string;
}

export const searchService = {
  async searchAll(query: string, filters?: SearchFilters) {
    if (!query || query.length < 2) {
      throw Object.assign(new Error('Arama sorgusu en az 2 karakter olmalıdır'), { statusCode: 400 });
    }

    const where: any = {
      isActive: true,
      OR: [
        { title: { contains: query } },
        { description: { contains: query } },
        { director: { contains: query } },
        { tags: { contains: query } },
        { cast: { contains: query } },
      ],
    };

    if (filters) {
      if (filters.type) where.type = filters.type as string;
      if (filters.categoryId) where.categoryId = filters.categoryId;
      if (filters.genre) where.tags = { contains: filters.genre };
      if (filters.yearMin) where.year = { ...where.year, gte: filters.yearMin };
      if (filters.yearMax) where.year = { ...where.year, lte: filters.yearMax };
      if (filters.imdbMin) where.imdbRating = { gte: filters.imdbMin };
      if (filters.country) where.country = { contains: filters.country };
      if (filters.language) where.language = { contains: filters.language };
      if (filters.quality) where.quality = filters.quality;
    }

    const [contents, total] = await Promise.all([
      prisma.content.findMany({
        where,
        orderBy: [{ imdbRating: 'desc' }, { createdAt: 'desc' }],
        take: 50,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: { watchHistory: true, ratings: true },
          },
        },
      }),
      prisma.content.count({ where }),
    ]);

    return {
      data: contents,
      total,
    };
  },

  async filterBy(filters: SearchFilters) {
    const where: any = { isActive: true };

    if (filters.type) where.type = filters.type as string;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.genre) where.tags = { contains: filters.genre };
    if (filters.yearMin || filters.yearMax) {
      where.year = {};
      if (filters.yearMin) where.year.gte = filters.yearMin;
      if (filters.yearMax) where.year.lte = filters.yearMax;
    }
    if (filters.imdbMin) where.imdbRating = { gte: filters.imdbMin };
    if (filters.country) where.country = { contains: filters.country };
    if (filters.language) where.language = { contains: filters.language };
    if (filters.quality) where.quality = filters.quality;

    const [contents, total] = await Promise.all([
      prisma.content.findMany({
        where,
        orderBy: [{ imdbRating: 'desc' }, { createdAt: 'desc' }],
        take: 50,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: { watchHistory: true, ratings: true },
          },
        },
      }),
      prisma.content.count({ where }),
    ]);

    return {
      data: contents,
      total,
    };
  },

  async getSuggestions(query: string) {
    if (!query || query.length < 2) {
      return { suggestions: [] };
    }

    const titles = await prisma.content.findMany({
      where: {
        isActive: true,
        title: { contains: query },
      },
      select: { id: true, title: true, slug: true, type: true, posterUrl: true, year: true },
      orderBy: [{ imdbRating: 'desc' }],
      take: 8,
    });

    const tags = await prisma.content.findMany({
      where: {
        isActive: true,
        tags: { contains: query },
      },
      select: { tags: true },
      take: 20,
    });

    const uniqueTags: string[] = [];
    tags.forEach(c => {
      try { const arr = JSON.parse(c.tags || '[]'); arr.forEach((t: string) => { if (t.toLowerCase().includes(query.toLowerCase()) && !uniqueTags.includes(t)) uniqueTags.push(t); }); } catch {}
    });
    const slicedTags = uniqueTags.slice(0, 5);

    const castResult = await prisma.content.findMany({
      where: {
        isActive: true,
        cast: { contains: query },
      },
      select: { cast: true },
      take: 20,
    });

    const uniqueCast: string[] = [];
    castResult.forEach(c => {
      try { const arr = JSON.parse(c.cast || '[]'); arr.forEach((a: string) => { if (a.toLowerCase().includes(query.toLowerCase()) && !uniqueCast.includes(a)) uniqueCast.push(a); }); } catch {}
    });
    const slicedCast = uniqueCast.slice(0, 5);

    return {
      suggestions: {
        titles,
        tags: slicedTags,
        cast: slicedCast,
      },
    };
  },
};
