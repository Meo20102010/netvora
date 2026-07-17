import { Response, NextFunction } from 'express';
import { searchService } from '../services/searchService';
import { AuthRequest } from '../types';

function asyncHandler(fn: (req: any, res: Response, next: NextFunction) => Promise<any>) {
  return (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export const searchController = {
  search: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { q, type, categoryId, genre, yearMin, yearMax, imdbMin, country, language, quality } = req.query;

    if (!q) {
      res.status(400).json({ success: false, error: 'Arama sorgusu (q) gereklidir' });
      return;
    }

    const filters = {
      type: type as string | undefined,
      categoryId: categoryId as string | undefined,
      genre: genre as string | undefined,
      yearMin: yearMin ? parseInt(yearMin as string) : undefined,
      yearMax: yearMax ? parseInt(yearMax as string) : undefined,
      imdbMin: imdbMin ? parseFloat(imdbMin as string) : undefined,
      country: country as string | undefined,
      language: language as string | undefined,
      quality: quality as string | undefined,
    };

    const result = await searchService.searchAll(q as string, filters);
    res.json({ success: true, ...result });
  }),

  filter: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { type, categoryId, genre, yearMin, yearMax, imdbMin, country, language, quality } = req.query;

    const filters = {
      type: type as string | undefined,
      categoryId: categoryId as string | undefined,
      genre: genre as string | undefined,
      yearMin: yearMin ? parseInt(yearMin as string) : undefined,
      yearMax: yearMax ? parseInt(yearMax as string) : undefined,
      imdbMin: imdbMin ? parseFloat(imdbMin as string) : undefined,
      country: country as string | undefined,
      language: language as string | undefined,
      quality: quality as string | undefined,
    };

    const result = await searchService.filterBy(filters);
    res.json({ success: true, ...result });
  }),

  suggestions: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { q } = req.query;

    if (!q) {
      res.json({ success: true, data: { suggestions: { titles: [], tags: [], cast: [] } } });
      return;
    }

    const result = await searchService.getSuggestions(q as string);
    res.json({ success: true, data: result });
  }),
};
