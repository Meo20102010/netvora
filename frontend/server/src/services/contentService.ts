import prisma from '../config/database';
import { slugify } from '../utils/helpers';
import { AppError } from '../middleware/errorHandler';

interface GetAllFilters {
  type?: string;
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface SearchFilters {
  type?: string;
  genre?: string;
  year?: number;
  imdb?: number;
  country?: string;
}

function parseCastTags(content: any): any {
  if (!content) return content;
  if (Array.isArray(content)) return content.map(c => parseCastTags(c));
  if (typeof content.cast === 'string') { try { content.cast = JSON.parse(content.cast); } catch { content.cast = []; } }
  if (typeof content.tags === 'string') { try { content.tags = JSON.parse(content.tags); } catch { content.tags = []; } }
  return content;
}

export const contentService = {
  async getAll(filters: GetAllFilters) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    const where: any = { isActive: true };

    if (filters.type) {
      where.type = filters.type as string;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
        { tags: { contains: filters.search } },
        { director: { contains: filters.search } },
      ];
    }

    let orderBy: any = { [sortBy === 'popularity' ? 'imdbRating' : sortBy]: sortOrder };
    if (sortBy === 'popularity') {
      orderBy = { imdbRating: 'desc' };
    }

    const [contents, total] = await Promise.all([
      prisma.content.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
      data: parseCastTags(contents),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id: string) {
    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        category: true,
        seasons: {
          orderBy: { seasonNumber: 'asc' },
          include: {
            episodes: {
              orderBy: { episodeNumber: 'asc' },
              include: {
                videos: {
                  where: { isActive: true },
                  select: { id: true, url: true, quality: true, language: true, subtitle: true },
                },
              },
            },
          },
        },
        videos: {
          where: { isActive: true, episodeId: null },
          select: { id: true, url: true, quality: true, language: true, subtitle: true },
        },
        _count: {
          select: { watchHistory: true, ratings: true, favorites: true },
        },
      },
    });

    if (!content) throw new AppError('İçerik bulunamadı', 404);

    // Remove seasons/episodes that have no videos
    if (content.seasons) {
      content.seasons = content.seasons
        .map(season => ({
          ...season,
          episodes: season.episodes.filter(ep => ep.videos.length > 0),
        }))
        .filter(season => season.episodes.length > 0);
    }

    if (content.type === 'MOVIE') {
      const avgRating = await prisma.rating.aggregate({
        where: { contentId: id },
        _avg: { score: true },
      });
      return parseCastTags({ ...content, averageRating: avgRating._avg.score || 0 });
    }

    return parseCastTags(content);
  },

  async getBySlug(slug: string) {
    const content = await prisma.content.findUnique({
      where: { slug },
      include: {
        category: true,
        seasons: {
          orderBy: { seasonNumber: 'asc' },
          include: {
            episodes: {
              orderBy: { episodeNumber: 'asc' },
              include: {
                videos: {
                  where: { isActive: true },
                  select: { id: true, url: true, quality: true, language: true, subtitle: true },
                },
              },
            },
          },
        },
        videos: {
          where: { isActive: true, episodeId: null },
          select: { id: true, url: true, quality: true, language: true, subtitle: true },
        },
        _count: {
          select: { watchHistory: true, ratings: true, favorites: true },
        },
      },
    });

    if (!content) throw new AppError('İçerik bulunamadı', 404);

    // Remove seasons/episodes that have no videos
    if (content.seasons) {
      content.seasons = content.seasons
        .map(season => ({
          ...season,
          episodes: season.episodes.filter((ep: any) => ep.videos.length > 0),
        }))
        .filter((season: any) => season.episodes.length > 0);
    }

    if (content.type === 'MOVIE') {
      const avgRating = await prisma.rating.aggregate({
        where: { contentId: content.id },
        _avg: { score: true },
      });
      return parseCastTags({ ...content, averageRating: avgRating._avg.score || 0 });
    }

    return parseCastTags(content);
  },

  async create(data: any) {
    const slug = data.slug || slugify(data.title);

    const existing = await prisma.content.findUnique({ where: { slug } });
    if (existing) {
      throw new AppError('Bu slug ile bir içerik zaten mevcut', 409);
    }

    const content = await prisma.content.create({
      data: {
        title: data.title,
        slug,
        description: data.description,
        type: data.type || 'MOVIE',
        posterUrl: data.posterUrl,
        coverUrl: data.coverUrl,
        trailerUrl: data.trailerUrl,
        year: data.year,
        duration: data.duration,
        imdbRating: data.imdbRating,
        imdbVotes: data.imdbVotes,
        director: data.director,
        cast: JSON.stringify(data.cast || []),
        tags: JSON.stringify(data.tags || []),
        country: data.country,
        language: data.language,
        subtitle: data.subtitle,
        quality: data.quality || 'HD',
        isFeatured: data.isFeatured || false,
        releaseDate: data.releaseDate ? new Date(data.releaseDate) : undefined,
        categoryId: data.categoryId || undefined,
      },
      include: {
        category: true,
      },
    });

    return content;
  },

  async update(id: string, data: any) {
    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) throw new AppError('İçerik bulunamadı', 404);

    const updateData: any = {};
    const allowedFields = [
      'title', 'description', 'type', 'posterUrl', 'coverUrl', 'trailerUrl',
      'year', 'duration', 'imdbRating', 'imdbVotes', 'director', 'cast',
      'tags', 'country', 'language', 'subtitle', 'quality', 'isActive',
      'isFeatured', 'releaseDate', 'categoryId',
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        if (field === 'categoryId' && !data[field]) {
          updateData[field] = null;
        } else if (field === 'releaseDate' && data[field]) {
          updateData[field] = new Date(data[field]);
        } else if (field === 'cast' && Array.isArray(data[field])) {
          updateData[field] = JSON.stringify(data[field]);
        } else if (field === 'tags' && Array.isArray(data[field])) {
          updateData[field] = JSON.stringify(data[field]);
        } else {
          updateData[field] = data[field];
        }
      }
    }

    if (data.title && data.title !== existing.title) {
      updateData.slug = slugify(data.title);
    }

    const content = await prisma.content.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    return content;
  },

  async delete(id: string) {
    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) throw new AppError('İçerik bulunamadı', 404);

    await prisma.content.delete({ where: { id } });
    return { message: 'İçerik başarıyla silindi' };
  },

  async getFeatured() {
    const contents = await prisma.content.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { watchHistory: true, ratings: true },
        },
      },
    });

    return parseCastTags(contents);
  },

  async getTrending() {
    const contents = await prisma.content.findMany({
      where: { isActive: true },
      orderBy: {
        watchHistory: { _count: 'desc' },
      },
      take: 20,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { watchHistory: true, ratings: true },
        },
      },
    });

    return parseCastTags(contents);
  },

  async getByCategory(categoryId: string, page: number = 1, limit: number = 20) {
    page = Math.max(1, page);
    limit = Math.min(100, Math.max(1, limit));
    const skip = (page - 1) * limit;

    const where = { categoryId, isActive: true };

    const [contents, total] = await Promise.all([
      prisma.content.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      data: parseCastTags(contents),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getRecommendations(contentId: string) {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: { tags: true, categoryId: true, type: true, id: true },
    });

    if (!content) throw new AppError('İçerik bulunamadı', 404);

    let contentTags: string[] = [];
    try { contentTags = JSON.parse(content.tags || '[]'); } catch {}
    const categoryMatch = content.categoryId ? { categoryId: content.categoryId } : undefined;
    const typeMatch = content.type ? { type: content.type } : undefined;
    const orConditions: any[] = [];
    if (contentTags.length > 0) orConditions.push({ tags: { in: contentTags } });
    if (categoryMatch) orConditions.push(categoryMatch);
    if (typeMatch) orConditions.push(typeMatch);

    const recommendations = await prisma.content.findMany({
      where: {
        id: { not: contentId },
        isActive: true,
        OR: orConditions.length > 0 ? orConditions : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { watchHistory: true },
        },
      },
    });

    return parseCastTags(recommendations);
  },

  async search(query: string, filters?: SearchFilters) {
    if (!query || query.length < 2) {
      throw new AppError('Arama sorgusu en az 2 karakter olmalıdır', 400);
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

    if (filters?.type) {
      where.type = filters.type as string;
    }

    if (filters?.genre) {
      where.tags = { contains: filters.genre };
    }

    if (filters?.year) {
      where.year = filters.year;
    }

    if (filters?.imdb) {
      where.imdbRating = { gte: filters.imdb };
    }

    if (filters?.country) {
      where.country = { contains: filters.country };
    }

    const contents = await prisma.content.findMany({
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
    });

    return parseCastTags(contents);
  },

  async createSeason(contentId: string, seasonNumber: number, title?: string) {
    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw new AppError('İçerik bulunamadı', 404);
    if (content.type !== 'SERIES') {
      throw new AppError('Sadece dizilere sezon eklenebilir', 400);
    }

    const existingSeason = await prisma.season.findFirst({
      where: { contentId, seasonNumber },
    });
    if (existingSeason) throw new AppError('Bu sezon numarası zaten mevcut', 409);

    const season = await prisma.season.create({
      data: { contentId, seasonNumber, title },
      include: { episodes: true },
    });

    return season;
  },

  async createEpisode(seasonId: string, episodeNumber: number, title: string, description?: string) {
    const season = await prisma.season.findUnique({ where: { id: seasonId } });
    if (!season) throw new AppError('Sezon bulunamadı', 404);

    const existingEpisode = await prisma.episode.findFirst({
      where: { seasonId, episodeNumber },
    });
    if (existingEpisode) throw new AppError('Bu bölüm numarası zaten mevcut', 409);

    const episode = await prisma.episode.create({
      data: { seasonId, episodeNumber, title, description },
      include: { videos: true },
    });

    return episode;
  },

  async addVideo(
    target: { contentId?: string; episodeId?: string },
    url: string,
    quality?: string,
    language?: string,
    subtitle?: string,
  ) {
    if (!target.contentId && !target.episodeId) {
      throw new AppError('contentId veya episodeId gereklidir', 400);
    }

    if (target.contentId) {
      const content = await prisma.content.findUnique({ where: { id: target.contentId } });
      if (!content) throw new AppError('İçerik bulunamadı', 404);
    }

    if (target.episodeId) {
      const episode = await prisma.episode.findUnique({ where: { id: target.episodeId } });
      if (!episode) throw new AppError('Bölüm bulunamadı', 404);
    }

    const video = await prisma.video.create({
      data: {
        contentId: target.contentId || null,
        episodeId: target.episodeId || null,
        url,
        quality: quality || 'HD',
        language: language || 'tr',
        subtitle,
      },
    });

    return video;
  },
};
