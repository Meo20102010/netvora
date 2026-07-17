import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AuthRequest } from '../types';
import fs from 'fs';
import path from 'path';

const BACKUPS_DIR = path.join(__dirname, '../../storage/backups');
const VIDEOS_DIR = path.join(__dirname, '../../storage/videos');
const IMAGES_DIR = path.join(__dirname, '../../storage/images');

function asyncHandler(fn: (req: any, res: Response, next: NextFunction) => Promise<any>) {
  return (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function adminExtendedRoutes(prisma: PrismaClient): Router {
  const router = Router();

  router.use(authenticate, requireAdmin);

  // ──────────────────────────────────────────────────
  // 1. Bulk Operations
  // ──────────────────────────────────────────────────
  router.post('/bulk/edit', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { ids, data } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array gerekli' });
    }

    const result = await prisma.content.updateMany({
      where: { id: { in: ids } },
      data,
    });

    res.json({ success: true, data: { updated: result.count }, message: `${result.count} içerik güncellendi` });
  }));

  router.post('/bulk/delete', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array gerekli' });
    }

    await prisma.video.deleteMany({ where: { contentId: { in: ids } } });
    const result = await prisma.content.deleteMany({ where: { id: { in: ids } } });

    res.json({ success: true, data: { deleted: result.count }, message: `${result.count} içerik silindi` });
  }));

  // ──────────────────────────────────────────────────
  // 2. CSV/JSON Export
  // ──────────────────────────────────────────────────
  router.get('/export/content', asyncHandler(async (req: AuthRequest, res: Response) => {
    const format = (req.query.format as string) || 'json';
    const content = await prisma.content.findMany({
      include: { category: true, videos: true, seasons: { include: { episodes: true } } },
    });

    if (format === 'csv') {
      const headers = ['id', 'title', 'type', 'year', 'imdbRating', 'director', 'country', 'isActive'];
      const rows = content.map(c => headers.map(h => String((c as any)[h] ?? '')).join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=content_export.csv');
      return res.send(csv);
    }

    res.json({ success: true, data: content });
  }));

  router.get('/export/users', asyncHandler(async (req: AuthRequest, res: Response) => {
    const format = (req.query.format as string) || 'json';
    const users = await prisma.user.findMany({
      select: { id: true, email: true, username: true, displayName: true, role: true, isBanned: true, createdAt: true },
    });

    if (format === 'csv') {
      const headers = ['id', 'email', 'username', 'displayName', 'role', 'isBanned', 'createdAt'];
      const rows = users.map(u => headers.map(h => String((u as any)[h] ?? '')).join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
      return res.send(csv);
    }

    res.json({ success: true, data: users });
  }));

  // ──────────────────────────────────────────────────
  // 3. TMDB Metadata Lookup
  // ──────────────────────────────────────────────────
  router.post('/tmdb/lookup', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tmdbId, type } = req.body;
    if (!tmdbId || !type) {
      return res.status(400).json({ success: false, message: 'tmdbId ve type gerekli' });
    }

    const apiKey = process.env.TMDB_API_KEY || '';
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'TMDB_API_KEY yapılandırılmamış' });
    }

    const mediaType = type === 'SERIES' || type === 'tv' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${apiKey}&language=tr-TR`;

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: 'TMDB verisi alınamadı' });
    }

    const data: any = await response.json();
    const metadata = {
      title: data.title || data.name,
      description: data.overview,
      posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
      backdropUrl: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null,
      releaseDate: data.release_date || data.first_air_date,
      year: data.release_date ? new Date(data.release_date).getFullYear() : data.first_air_date ? new Date(data.first_air_date).getFullYear() : null,
      duration: data.runtime || (data.episode_run_time && data.episode_run_time[0]) || null,
      imdbRating: data.vote_average || null,
      imdbVotes: data.vote_count || null,
      language: data.original_language,
      country: (data.production_countries && data.production_countries[0]?.name) || null,
      genres: (data.genres || []).map((g: any) => g.name),
      tmdbId: data.id,
    };

    res.json({ success: true, data: metadata });
  }));

  // ──────────────────────────────────────────────────
  // 4. Content Scheduling (publishAt)
  // ──────────────────────────────────────────────────
  router.put('/content/:id/schedule', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { publishAt } = req.body;
    if (!publishAt) {
      return res.status(400).json({ success: false, message: 'publishAt gerekli' });
    }

    const content = await prisma.content.update({
      where: { id: req.params.id },
      data: {
        isActive: new Date(publishAt) <= new Date(),
      } as any,
    });

    res.json({ success: true, data: content, message: 'Zamanlama güncellendi' });
  }));

  // ──────────────────────────────────────────────────
  // 5. Quality Control / Audit
  // ──────────────────────────────────────────────────
  router.get('/quality/audit', asyncHandler(async (req: AuthRequest, res: Response) => {
    const allContent = await prisma.content.findMany({
      include: { videos: true, seasons: { include: { episodes: { include: { videos: true } } } } },
    });

    const issues: any[] = [];

    for (const content of allContent) {
      if (!content.posterUrl) {
        issues.push({ contentId: content.id, title: content.title, type: 'MISSING_POSTER', severity: 'warning' });
      }
      if (!content.videos || content.videos.length === 0) {
        issues.push({ contentId: content.id, title: content.title, type: 'NO_VIDEOS', severity: 'error' });
      }
      if (content.type === 'SERIES') {
        if (!content.seasons || content.seasons.length === 0) {
          issues.push({ contentId: content.id, title: content.title, type: 'NO_SEASONS', severity: 'error' });
        } else {
          for (const season of content.seasons) {
            if (!season.episodes || season.episodes.length === 0) {
              issues.push({ contentId: content.id, title: content.title, season: season.seasonNumber, type: 'EMPTY_SEASON', severity: 'warning' });
            }
            for (const episode of season.episodes) {
              if (!episode.videos || episode.videos.length === 0) {
                issues.push({ contentId: content.id, title: content.title, episode: episode.title, type: 'EPISODE_NO_VIDEO', severity: 'error' });
              }
            }
          }
        }
      }
      if (!content.description) {
        issues.push({ contentId: content.id, title: content.title, type: 'MISSING_DESCRIPTION', severity: 'info' });
      }
      for (const video of content.videos) {
        if (video.url && !video.url.startsWith('http') && !fs.existsSync(path.join(VIDEOS_DIR, video.url))) {
          issues.push({ contentId: content.id, title: content.title, videoId: video.id, type: 'BROKEN_VIDEO', severity: 'critical' });
        }
      }
    }

    res.json({ success: true, data: { totalContent: allContent.length, issueCount: issues.length, issues } });
  }));

  // ──────────────────────────────────────────────────
  // 6. Backup
  // ──────────────────────────────────────────────────
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  router.post('/backup/create', asyncHandler(async (req: AuthRequest, res: Response) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
      createdAt: new Date().toISOString(),
      createdBy: req.user?.userId || 'unknown',
      users: await prisma.user.findMany(),
      content: await prisma.content.findMany(),
      categories: await prisma.category.findMany(),
      subscriptions: await prisma.subscription.findMany(),
      payments: await prisma.payment.findMany(),
      notifications: await prisma.notification.findMany(),
      auditLogs: await prisma.auditLog.findMany(),
      siteSettings: await prisma.siteSetting.findMany(),
    };

    const filename = `backup_${timestamp}.json`;
    const filepath = path.join(BACKUPS_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

    res.json({ success: true, data: { filename, createdAt: backupData.createdAt }, message: 'Yedekleme oluşturuldu' });
  }));

  router.get('/backup/download/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
    const filename = req.params.id;
    const filepath = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, message: 'Yedek bulunamadı' });
    }
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(filepath);
  }));

  router.post('/backup/restore/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
    const filename = req.params.id;
    const filepath = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, message: 'Yedek bulunamadı' });
    }

    const backupData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

    if (backupData.siteSettings) {
      for (const setting of backupData.siteSettings) {
        await prisma.siteSetting.upsert({
          where: { id: setting.id },
          update: { value: setting.value },
          create: setting,
        });
      }
    }

    if (backupData.categories) {
      for (const cat of backupData.categories) {
        await prisma.category.upsert({
          where: { id: cat.id },
          update: { name: cat.name },
          create: cat,
        });
      }
    }

    res.json({ success: true, message: 'Yedekleme geri yüklendi' });
  }));

  // ──────────────────────────────────────────────────
  // 7. Advanced Stats
  // ──────────────────────────────────────────────────
  router.get('/stats/detailed', asyncHandler(async (req: AuthRequest, res: Response) => {
    const [totalUsers, totalContent, activeSubscriptions, totalWatchHistory] = await Promise.all([
      prisma.user.count(),
      prisma.content.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.watchHistory.count(),
    ]);

    const mostWatched = await prisma.watchHistory.groupBy({
      by: ['contentId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });
    const mostWatchedContent = await Promise.all(
      mostWatched.map(async (w) => {
        const content = await prisma.content.findUnique({ where: { id: w.contentId } });
        return { content, watchCount: w._count.id };
      })
    );

    const mostActiveUsers = await prisma.watchHistory.groupBy({
      by: ['userId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });
    const activeUsers = await Promise.all(
      mostActiveUsers.map(async (u) => {
        const user = await prisma.user.findUnique({ where: { id: u.userId }, select: { id: true, username: true, email: true, displayName: true } });
        return { user, watchCount: u._count.id };
      })
    );

    const topSearches = await prisma.auditLog.findMany({
      where: { action: 'SEARCH' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const genreStats = await prisma.content.groupBy({
      by: ['categoryId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    const popularGenres = await Promise.all(
      genreStats.map(async (g) => {
        const category = g.categoryId ? await prisma.category.findUnique({ where: { id: g.categoryId } }) : null;
        return { category: category?.name || 'Uncategorized', count: g._count.id };
      })
    );

    res.json({
      success: true,
      data: {
        overview: { totalUsers, totalContent, activeSubscriptions, totalWatchHistory },
        mostWatchedContent,
        mostActiveUsers: activeUsers,
        topSearches,
        popularGenres,
      },
    });
  }));

  // ──────────────────────────────────────────────────
  // 8. Error Logs
  // ──────────────────────────────────────────────────
  const ERROR_LOG_PATH = path.join(BACKUPS_DIR, 'error_logs.json');

  function readErrorLogs(): any[] {
    if (!fs.existsSync(ERROR_LOG_PATH)) return [];
    return JSON.parse(fs.readFileSync(ERROR_LOG_PATH, 'utf-8'));
  }

  function writeErrorLogs(logs: any[]) {
    fs.writeFileSync(ERROR_LOG_PATH, JSON.stringify(logs, null, 2));
  }

  router.get('/errors', asyncHandler(async (req: AuthRequest, res: Response) => {
    const logs = readErrorLogs();

    const brokenVideos = await prisma.video.findMany({
      where: { isActive: true },
      include: { content: true, episode: true },
    });
    const broken = brokenVideos.filter(v => {
      if (!v.url.startsWith('http')) {
        return !fs.existsSync(path.join(VIDEOS_DIR, v.url));
      }
      return false;
    });

    const failedLogins = await prisma.loginHistory.findMany({
      where: { success: false },
      include: { user: { select: { id: true, username: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: { serverErrors: logs, brokenVideos: broken.map(v => ({ id: v.id, url: v.url, content: v.content?.title })), failedLogins } });
  }));

  router.post('/errors/log', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { level, message, source, stack } = req.body;
    const logs = readErrorLogs();
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      level: level || 'error',
      message,
      source: source || 'unknown',
      stack: stack || null,
      timestamp: new Date().toISOString(),
    };
    logs.push(entry);
    if (logs.length > 1000) logs.splice(0, logs.length - 1000);
    writeErrorLogs(logs);

    res.json({ success: true, data: entry, message: 'Hata kaydedildi' });
  }));

  // ──────────────────────────────────────────────────
  // 9. Media Manager
  // ──────────────────────────────────────────────────
  router.get('/media/list', asyncHandler(async (req: AuthRequest, res: Response) => {
    const dirs = [
      { name: 'videos', dir: VIDEOS_DIR },
      { name: 'images', dir: IMAGES_DIR },
    ];

    const files: any[] = [];
    for (const { name, dir } of dirs) {
      if (!fs.existsSync(dir)) continue;
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const filepath = path.join(dir, entry);
        try {
          const stat = fs.statSync(filepath);
          if (stat.isFile()) {
            files.push({ name: entry, type: name, size: stat.size, modifiedAt: stat.mtime.toISOString(), path: `/media/${name}/${entry}` });
          }
        } catch {
          // skip inaccessible
        }
      }
    }

    res.json({ success: true, data: files });
  }));

  router.delete('/media/:filename', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { filename } = req.params;
    const videoPath = path.join(VIDEOS_DIR, filename);
    const imagePath = path.join(IMAGES_DIR, filename);

    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
      return res.json({ success: true, message: `${filename} silindi` });
    }
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      return res.json({ success: true, message: `${filename} silindi` });
    }

    res.status(404).json({ success: false, message: 'Dosya bulunamadı' });
  }));

  router.get('/media/stats', asyncHandler(async (req: AuthRequest, res: Response) => {
    function getDirSize(dir: string): number {
      if (!fs.existsSync(dir)) return 0;
      let total = 0;
      for (const entry of fs.readdirSync(dir)) {
        const fp = path.join(dir, entry);
        const stat = fs.statSync(fp);
        if (stat.isFile()) total += stat.size;
      }
      return total;
    }

    function getDirFileCount(dir: string): number {
      if (!fs.existsSync(dir)) return 0;
      return fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile()).length;
    }

    const videosSize = getDirSize(VIDEOS_DIR);
    const imagesSize = getDirSize(IMAGES_DIR);

    res.json({
      success: true,
      data: {
        videos: { path: VIDEOS_DIR, size: videosSize, fileCount: getDirFileCount(VIDEOS_DIR) },
        images: { path: IMAGES_DIR, size: imagesSize, fileCount: getDirFileCount(IMAGES_DIR) },
        total: { size: videosSize + imagesSize },
      },
    });
  }));

  // ──────────────────────────────────────────────────
  // 10. Advanced Search
  // ──────────────────────────────────────────────────
  router.get('/search/advanced', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { q, title, cast, director, tags, country, year, type, category, page = '1', limit = '20' } = req.query;

    const where: any = { AND: [] as any[] };

    if (q) {
      (where.AND as any[]).push({
        OR: [
          { title: { contains: String(q) } },
          { description: { contains: String(q) } },
          { director: { contains: String(q) } },
          { cast: { contains: String(q) } },
          { tags: { contains: String(q) } },
        ],
      });
    }
    if (title) (where.AND as any[]).push({ title: { contains: String(title) } });
    if (cast) (where.AND as any[]).push({ cast: { contains: String(cast) } });
    if (director) (where.AND as any[]).push({ director: { contains: String(director) } });
    if (tags) (where.AND as any[]).push({ tags: { contains: String(tags) } });
    if (country) (where.AND as any[]).push({ country: { contains: String(country) } });
    if (year) (where.AND as any[]).push({ year: parseInt(String(year)) });
    if (type) (where.AND as any[]).push({ type: String(type) });
    if (category) {
      const cat = await prisma.category.findFirst({ where: { slug: String(category) } });
      if (cat) (where.AND as any[]).push({ categoryId: cat.id });
    }

    if ((where.AND as any[]).length === 0) delete where.AND;

    const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
    const take = parseInt(String(limit));

    const [results, total] = await Promise.all([
      prisma.content.findMany({ where, skip, take, include: { category: true }, orderBy: { createdAt: 'desc' } }),
      prisma.content.count({ where }),
    ]);

    res.json({ success: true, data: { results, total, page: parseInt(String(page)), totalPages: Math.ceil(total / take) } });
  }));

  // ──────────────────────────────────────────────────
  // 11. Recommendations
  // ──────────────────────────────────────────────────
  router.get('/recommendations/:contentId', asyncHandler(async (req: AuthRequest, res: Response) => {
    const content = await prisma.content.findUnique({ where: { id: req.params.contentId } });
    if (!content) {
      return res.status(404).json({ success: false, message: 'İçerik bulunamadı' });
    }

    const contentTags: string[] = JSON.parse(content.tags || '[]');

    const candidates = await prisma.content.findMany({
      where: { id: { not: content.id }, isActive: true },
      include: { ratings: true, category: true },
    });

    const scored = candidates.map((c) => {
      let score = 0;
      const candidateTags: string[] = JSON.parse(c.tags || '[]');
      const sharedTags = contentTags.filter(t => candidateTags.includes(t));
      score += sharedTags.length * 10;

      if (c.categoryId && c.categoryId === content.categoryId) score += 20;

      const avgRating = c.ratings.length > 0 ? c.ratings.reduce((s, r) => s + r.score, 0) / c.ratings.length : 0;
      score += avgRating * 5;

      if (c.type === content.type) score += 5;
      if (content.year && c.year && Math.abs(c.year - content.year) <= 5) score += 5;

      return { content: c, score, avgRating };
    });

    scored.sort((a, b) => b.score - a.score);
    const recommendations = scored.slice(0, 10);

    res.json({ success: true, data: recommendations });
  }));

  return router;
}
