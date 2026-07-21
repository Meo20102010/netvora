import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AuthRequest } from '../types';

function asyncHandler(fn: (req: any, res: Response, next: NextFunction) => Promise<any>) {
  return (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

type FetchResult = { ok: boolean; status: number; statusText: string };

async function fetchWithTimeout(url: string, timeoutMs = 8000, method: 'GET' | 'HEAD' = 'HEAD'): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        Referer: 'https://www.fullhdfilmizlesene.nz/',
      },
    });
    return { ok: res.ok, status: res.status, statusText: res.statusText };
  } catch (err: any) {
    return { ok: false, status: 0, statusText: err.name === 'AbortError' ? 'TIMEOUT' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

function isVideoPlayerUrl(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return [
      'rapidvid.net',
      'sobreatsesuyp.com',
      'watch.trplayer.com',
      'trplayer.com',
      'vidmoxy.net',
      'turkeyplayer.com',
    ].some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

function qualityRank(q?: string | null) {
  const map: Record<string, number> = {
    '4K': 4,
    ULTRA_HD: 4,
    UHD: 4,
    'FULL_HD': 3,
    '1080p': 3,
    HD: 2,
    '720p': 2,
    SD: 1,
    '480p': 1,
  };
  return map[(q || '').toUpperCase()] || 0;
}

export function adminValidationRoutes(prisma: PrismaClient): Router {
  const router = Router();
  router.use(authenticate, requireAdmin);

  // ── Validate a batch of movies (videos, images, metadata) ──
  router.post('/validate/batch', asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      cursor,
      batchSize = 25,
      checkVideos = true,
      checkImages = true,
      checkMetadata = true,
      disableBroken = true,
      fixMetadata = false,
      upgradeQuality = false,
    } = req.body;

    const where: any = { type: 'MOVIE' };
    if (cursor) {
      where.id = { gt: cursor };
    }

    const movies = await prisma.content.findMany({
      where,
      orderBy: { id: 'asc' },
      take: Math.min(100, Math.max(1, parseInt(batchSize) || 25)),
      include: { videos: true },
    });

    const stats = {
      processed: 0,
      disabled: 0,
      videosBroken: 0,
      imagesBroken: 0,
      metadataFixed: 0,
      qualityUpgraded: 0,
      issues: [] as any[],
    };

    const updates: { id: string; data: any }[] = [];
    const disableIds: string[] = [];

    await Promise.all(
      movies.map(async (movie) => {
        stats.processed++;
        const issues: string[] = [];
        let updateData: any = {};

        // ── Video checks ──
        if (checkVideos) {
          const activeVideos = movie.videos.filter((v) => v.isActive && v.url);
          if (activeVideos.length === 0) {
            issues.push('NO_ACTIVE_VIDEOS');
            stats.videosBroken++;
            // Only disable when there are literally no videos. Fetch-based detection is unreliable
            // from serverless IPs because many video hosts block datacenter ranges.
            if (disableBroken) disableIds.push(movie.id);
          } else if (req.body.probeVideos) {
            const results = await Promise.all(
              activeVideos.map(async (v) => {
                if (!v.url.startsWith('http')) return { ok: false, status: 0, reason: 'INVALID_URL' };
                const response = await fetchWithTimeout(v.url, 8000, 'GET');
                return { id: v.id, url: v.url, ok: response.ok, status: response.status };
              })
            );
            const broken = results.filter((r) => !r.ok);
            if (broken.length === activeVideos.length) {
              issues.push('ALL_VIDEOS_PROBE_FAILED');
              // Report only; do not auto-disable based on probe because hosts often block servers.
            } else if (broken.length > 0) {
              issues.push('SOME_VIDEOS_PROBE_FAILED');
            }
          }
        }

        // ── Image checks ──
        if (checkImages && !disableIds.includes(movie.id)) {
          const checks = [] as Promise<any>[];
          if (movie.posterUrl) {
            checks.push(
              fetchWithTimeout(movie.posterUrl, 6000, 'HEAD').then((r) => ({
                type: 'poster',
                ok: r.ok,
                status: (r as any).status || 0,
              }))
            );
          }
          if (movie.coverUrl) {
            checks.push(
              fetchWithTimeout(movie.coverUrl, 6000, 'HEAD').then((r) => ({
                type: 'cover',
                ok: r.ok,
                status: (r as any).status || 0,
              }))
            );
          }
          const imgResults = await Promise.all(checks);
          const brokenImages = imgResults.filter((r) => !r.ok);
          if (brokenImages.length > 0) {
            stats.imagesBroken++;
            issues.push(`BROKEN_IMAGES:${brokenImages.map((r) => r.type).join(',')}`);
            if (brokenImages.some((r) => r.type === 'poster')) updateData.posterUrl = null;
            if (brokenImages.some((r) => r.type === 'cover')) updateData.coverUrl = null;
          }
        }

        // ── Metadata checks ──
        if (checkMetadata) {
          const missing = [] as string[];
          if (!movie.title) missing.push('title');
          if (!movie.description) missing.push('description');
          let tags: string[] = [];
          try {
            tags = JSON.parse(movie.tags || '[]');
          } catch {}
          if (!tags || tags.length === 0) missing.push('genres');
          if (!movie.year) missing.push('year');
          if (!movie.duration) missing.push('runtime');
          if (!movie.country) missing.push('country');
          if (!movie.language) missing.push('language');
          let cast: string[] = [];
          try {
            cast = JSON.parse(movie.cast || '[]');
          } catch {}
          if (!cast || cast.length === 0) missing.push('cast');
          if (!movie.director) missing.push('director');

          if (missing.length > 0) {
            issues.push(`MISSING_METADATA:${missing.join(',')}`);
            if (fixMetadata && movie.sourceUrl) {
              try {
                const scraped = await rescrapeSource(movie.sourceUrl);
                if (scraped) {
                  let changed = false;
                  if (!movie.title && scraped.title) {
                    updateData.title = scraped.title;
                    changed = true;
                  }
                  if (!movie.description && scraped.description) {
                    updateData.description = scraped.description;
                    changed = true;
                  }
                  if (tags.length === 0 && scraped.tags?.length) {
                    updateData.tags = JSON.stringify(scraped.tags);
                    changed = true;
                  }
                  if (!movie.year && scraped.year) {
                    updateData.year = scraped.year;
                    changed = true;
                  }
                  if (!movie.duration && scraped.duration) {
                    updateData.duration = scraped.duration;
                    changed = true;
                  }
                  if (!movie.country && scraped.country) {
                    updateData.country = scraped.country;
                    changed = true;
                  }
                  if (!movie.language && scraped.language) {
                    updateData.language = scraped.language;
                    changed = true;
                  }
                  if (cast.length === 0 && scraped.cast?.length) {
                    updateData.cast = JSON.stringify(scraped.cast);
                    changed = true;
                  }
                  if (!movie.director && scraped.director) {
                    updateData.director = scraped.director;
                    changed = true;
                  }
                  if (upgradeQuality && qualityRank(scraped.quality) > qualityRank(movie.quality)) {
                    updateData.quality = scraped.quality;
                    changed = true;
                    stats.qualityUpgraded++;
                  }
                  if (changed) {
                    stats.metadataFixed++;
                    issues.push('METADATA_FIXED_FROM_SOURCE');
                  }
                }
              } catch (e: any) {
                issues.push(`RESCRAPE_ERROR:${e.message}`);
              }
            }
          }
        }

        if (Object.keys(updateData).length > 0) {
          updates.push({ id: movie.id, data: updateData });
        }

        if (issues.length > 0) {
          stats.issues.push({ id: movie.id, title: movie.title, issues });
        }
      })
    );

    // Apply bulk updates
    for (const { id, data } of updates) {
      await prisma.content.update({ where: { id }, data });
    }

    // Bulk disable
    if (disableIds.length > 0) {
      await prisma.content.updateMany({
        where: { id: { in: disableIds } },
        data: { isActive: false },
      });
      stats.disabled += disableIds.length;
    }

    res.json({
      success: true,
      data: {
        processed: stats.processed,
        nextCursor: movies.length > 0 ? movies[movies.length - 1].id : null,
        hasMore: movies.length > 0,
        stats: {
          disabled: stats.disabled,
          videosBroken: stats.videosBroken,
          imagesBroken: stats.imagesBroken,
          metadataFixed: stats.metadataFixed,
          qualityUpgraded: stats.qualityUpgraded,
          issueSamples: stats.issues.slice(0, 20),
        },
      },
    });
  }));

  // ── Reset all movies to active (emergency undo) ──
  router.post('/validate/reset-active', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { dryRun = true } = req.body;
    const where = { type: 'MOVIE', isActive: false };
    const count = await prisma.content.count({ where });
    if (!dryRun) {
      await prisma.content.updateMany({ where, data: { isActive: true } });
    }
    res.json({ success: true, data: { count, dryRun } });
  }));

  // ── Find and remove duplicate movies ──
  router.post('/validate/duplicates', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { dryRun = true } = req.body;
    const movies = await prisma.content.findMany({
      where: { type: 'MOVIE' },
      select: { id: true, title: true, slug: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const seen = new Map<string, { id: string; title: string; slug: string }[]>();
    for (const m of movies) {
      const key = (m.title || '').trim().toLowerCase();
      if (!key) continue;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(m);
    }

    const duplicates = Array.from(seen.entries()).filter(([_, items]) => items.length > 1);
    const idsToDelete: string[] = [];
    const groups: any[] = [];

    for (const [title, items] of duplicates) {
      // Keep the oldest, delete the rest
      const [, ...rest] = items;
      idsToDelete.push(...rest.map((i) => i.id));
      groups.push({ title, kept: items[0].id, removed: rest.map((i) => i.id) });
    }

    if (!dryRun && idsToDelete.length > 0) {
      await prisma.video.deleteMany({ where: { contentId: { in: idsToDelete } } });
      await prisma.content.deleteMany({ where: { id: { in: idsToDelete } } });
    }

    res.json({
      success: true,
      data: {
        duplicateGroups: duplicates.length,
        removed: idsToDelete.length,
        dryRun,
        groups: groups.slice(0, 50),
      },
    });
  }));

  // ── Database optimization (indexes + vacuum analyze) ──
  router.post('/validate/optimize', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { dryRun = true } = req.body;
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_content_type_active ON "contents"("type", "isActive")`,
      `CREATE INDEX IF NOT EXISTS idx_content_category ON "contents"("categoryId")`,
      `CREATE INDEX IF NOT EXISTS idx_content_year ON "contents"("year")`,
      `CREATE INDEX IF NOT EXISTS idx_content_quality ON "contents"("quality")`,
      `CREATE INDEX IF NOT EXISTS idx_content_country ON "contents"("country")`,
      `CREATE INDEX IF NOT EXISTS idx_content_language ON "contents"("language")`,
      `CREATE INDEX IF NOT EXISTS idx_content_slug ON "contents"("slug")`,
      `CREATE INDEX IF NOT EXISTS idx_video_content ON "videos"("contentId")`,
      `CREATE INDEX IF NOT EXISTS idx_video_episode ON "videos"("episodeId")`,
      `CREATE INDEX IF NOT EXISTS idx_video_active ON "videos"("isActive")`,
      `CREATE INDEX IF NOT EXISTS idx_content_source_url ON "contents"("sourceUrl")`,
    ];

    const created: string[] = [];
    if (!dryRun) {
      for (const sql of indexes) {
        await prisma.$executeRawUnsafe(sql);
        created.push(sql);
      }
      try {
        await prisma.$executeRawUnsafe(`VACUUM ANALYZE "contents"`);
        await prisma.$executeRawUnsafe(`VACUUM ANALYZE "videos"`);
      } catch (e: any) {
        created.push(`VACUUM skipped: ${e.message}`);
      }
    }

    res.json({
      success: true,
      data: {
        dryRun,
        indexes,
        created: dryRun ? [] : created,
      },
    });
  }));

  // ── Overall report ──
  router.get('/validate/report', asyncHandler(async (req: AuthRequest, res: Response) => {
    const [
      total,
      active,
      inactive,
      withVideos,
      withoutVideos,
      withPoster,
      withoutPoster,
      withDescription,
      missingDescription,
    ] = await Promise.all([
      prisma.content.count({ where: { type: 'MOVIE' } }),
      prisma.content.count({ where: { type: 'MOVIE', isActive: true } }),
      prisma.content.count({ where: { type: 'MOVIE', isActive: false } }),
      prisma.content.count({ where: { type: 'MOVIE', videos: { some: { isActive: true } } } }),
      prisma.content.count({ where: { type: 'MOVIE', videos: { none: { isActive: true } } } }),
      prisma.content.count({ where: { type: 'MOVIE', posterUrl: { not: null } } }),
      prisma.content.count({ where: { type: 'MOVIE', posterUrl: null } }),
      prisma.content.count({ where: { type: 'MOVIE', description: { not: null } } }),
      prisma.content.count({ where: { type: 'MOVIE', description: null } }),
    ]);

    res.json({
      success: true,
      data: {
        totalMovies: total,
        activeMovies: active,
        inactiveMovies: inactive,
        withVideos,
        withoutVideos,
        withPoster,
        withoutPoster,
        withDescription,
        missingDescription,
      },
    });
  }));

  return router;
}

// Minimal re-scrape helper for sourceUrl pages
async function rescrapeSource(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const titleMatch = html.match(/<h1><a href="[^"]*">([^<]+)<\/a><\/h1>(?:\s*<h2>([^<]*)<\/h2>)?/);
    const descriptionMatch = html.match(/<div class="ozet-ic"><p>([\s\S]*?)<\/p><\/div>/);
    const yearMatch = html.match(/<(span|a)[^>]*>(\d{4}) Filmleri<\/\1>/) || html.match(/<span class="film-yil">(\d{4})<\/span>/);
    const durationMatch = html.match(/<span class="sure">(\d+)\s*dk<\/span>/);
    const directorMatch = html.match(/<span class="dt">Yönetmen<\/span>[\s\S]*?<a[^>]*><span>([^<]+)<\/span><\/a>/);
    const castMatch = html.match(/<span class="dt">Oyuncular<\/span>[\s\S]*?<div class="dd">([\s\S]*?)<\/div>/);
    const tagsMatch = html.match(/<span class="dt">Tür<\/span>[\s\S]*?<div class="dd">([\s\S]*?)<\/div>/);
    const langMatch = html.match(/<span class="dt">Dil<\/span>[\s\S]*?<div class="dd">([\s\S]*?)<\/div>/);

    let cast: string[] = [];
    if (castMatch) {
      const castRegex = /<a[^>]*><span>([^<]+)<\/span><\/a>/g;
      let cm;
      while ((cm = castRegex.exec(castMatch[1])) !== null) cast.push(cm[1].trim());
    }

    let tags: string[] = [];
    if (tagsMatch) {
      const tagRegex = /<a[^>]*>([^<]+)<\/a>/g;
      let tm;
      while ((tm = tagRegex.exec(tagsMatch[1])) !== null) {
        const tag = tm[1].replace('Filmleri', '').replace('Filmi', '').replace('Filmler', '').trim();
        if (tag) tags.push(tag);
      }
    }

    let language = 'Türkçe';
    if (langMatch) {
      const langHtml = langMatch[1].toLowerCase();
      if (langHtml.includes('dublaj') || langHtml.includes('altyazı')) language = 'Türkçe';
    }

    let quality = 'HD';
    if (html.includes('class="uhd">4K<\/span>') || html.includes('>4K<')) quality = 'ULTRA_HD';
    else if (html.includes('1080p') || html.includes('class="hd hd-2">HD<\/span>')) quality = 'FULL_HD';

    let country = 'Amerika';
    const katMatch = html.match(/<span class="dt">Kategori<\/span>[\s\S]*?<div class="dd">([\s\S]*?)<\/div>/);
    if (katMatch && katMatch[1].includes('Yerli')) country = 'Türkiye';
    if (tags.some((t) => t.toLowerCase().includes('yerli'))) country = 'Türkiye';

    return {
      title: titleMatch ? titleMatch[1].trim() : undefined,
      description: descriptionMatch ? descriptionMatch[1].replace(/<[^>]+>/g, '').trim() : undefined,
      year: yearMatch ? parseInt(yearMatch[2] || yearMatch[1]) : undefined,
      duration: durationMatch ? parseInt(durationMatch[1]) : undefined,
      director: directorMatch ? directorMatch[1].trim() : undefined,
      cast,
      tags,
      country,
      language,
      quality,
    };
  } finally {
    clearTimeout(timer);
  }
}
