import { Response, NextFunction } from 'express';
import { contentService } from '../services/contentService';
import { AuthRequest } from '../types';

function asyncHandler(fn: (req: any, res: Response, next: NextFunction) => Promise<any>) {
  return (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export const contentController = {
  getAll: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { type, categoryId, search, page, limit, sortBy, sortOrder } = req.query;
    const result = await contentService.getAll({
      type: type as string,
      categoryId: categoryId as string,
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });
    res.json({ success: true, ...result });
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const content = await contentService.getById(req.params.id);
    res.json({ success: true, data: content });
  }),

  getBySlug: asyncHandler(async (req: AuthRequest, res: Response) => {
    const content = await contentService.getBySlug(req.params.slug);
    res.json({ success: true, data: content });
  }),

  getFeatured: asyncHandler(async (req: AuthRequest, res: Response) => {
    const contents = await contentService.getFeatured();
    res.json({ success: true, data: contents });
  }),

  getTrending: asyncHandler(async (req: AuthRequest, res: Response) => {
    const contents = await contentService.getTrending();
    res.json({ success: true, data: contents });
  }),

  getRecommendations: asyncHandler(async (req: AuthRequest, res: Response) => {
    const contents = await contentService.getRecommendations(req.params.id);
    res.json({ success: true, data: contents });
  }),

  search: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { q, type, genre, year, imdb, country } = req.query;
    if (!q) {
      res.status(400).json({ success: false, error: 'Arama sorgusu (q) gereklidir' });
      return;
    }
    const contents = await contentService.search(q as string, {
      type: type as string,
      genre: genre as string,
      year: year ? parseInt(year as string) : undefined,
      imdb: imdb ? parseFloat(imdb as string) : undefined,
      country: country as string,
    });
    res.json({ success: true, data: contents });
  }),
};
