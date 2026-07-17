import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { slugify } from '../utils/helpers';

const prisma = new PrismaClient();

const STORAGE_ROOT = path.join(__dirname, '../../storage');
const VIDEOS_DIR = path.join(STORAGE_ROOT, 'videos');
const IMAGES_DIR = path.join(STORAGE_ROOT, 'images');
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';

interface ImportProgress {
  id: string;
  status: 'scanning' | 'importing' | 'completed' | 'error';
  totalSeries: number;
  processedSeries: number;
  currentSeries: string;
  totalEpisodes: number;
  processedEpisodes: number;
  totalSize: number;
  copiedSize: number;
  errors: string[];
  startedAt: string;
  completedAt?: string;
}

const progressMap = new Map<string, ImportProgress>();

export function getProgress(id: string): ImportProgress | undefined {
  return progressMap.get(id);
}

function slugifyPath(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ğ]/g, 'g').replace(/[ü]/g, 'u').replace(/[ş]/g, 's')
    .replace(/[ı]/g, 'i').replace(/[ö]/g, 'o').replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getFileSize(filePath: string): number {
  try { return fs.statSync(filePath).size; } catch { return 0; }
}

function streamCopy(src: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ensureDir(path.dirname(dest));
    const readStream = fs.createReadStream(src);
    const writeStream = fs.createWriteStream(dest);
    readStream.pipe(writeStream);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
    readStream.on('error', reject);
  });
}

function isVideoFile(name: string): boolean {
  return /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(name);
}

function parseEpisodeNumber(name: string): number {
  const clean = path.parse(name).name;
  // Try "Bölüm/Bolum" pattern first (most reliable for Turkish content)
  const bolumMatch = clean.match(/[Bb][öo]?l[üu]?m[\s._-]*(\d+)/i);
  if (bolumMatch) return parseInt(bolumMatch[1], 10);
  // Try "episode/ep" pattern
  const epMatch = clean.match(/[Ee]p(?:isode)?[\s._-]*(\d+)/i);
  if (epMatch) return parseInt(epMatch[1], 10);
  // Try S01E01 pattern
  const seMatch = clean.match(/S\d+[Ee](\d+)/i);
  if (seMatch) return parseInt(seMatch[1], 10);
  // Last fallback: find the LAST number in the name (after separators like _ or -)
  const parts = clean.split(/[\s._-]+/);
  for (let i = parts.length - 1; i >= 0; i--) {
    const num = parseInt(parts[i], 10);
    if (!isNaN(num) && num > 0 && num < 1000) return num;
  }
  return 0;
}

function parseSeasonNumber(name: string): number {
  const m = name.match(/[Ss]eason[\s_-]*(\d+)/i) || name.match(/[Ss]ezon[\s_-]*(\d+)/i) || name.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 1;
}

interface ScannedSeries {
  name: string;
  fullPath: string;
  seasons: {
    name: string;
    number: number;
    episodes: {
      name: string;
      fullPath: string;
      seasonNumber: number;
      episodeNumber: number;
    }[];
  }[];
  totalEpisodes: number;
}

export async function scanFolder(folderPath: string): Promise<ScannedSeries[]> {
  if (!fs.existsSync(folderPath)) throw new Error('Klasör bulunamadı: ' + folderPath);

  const stat = fs.statSync(folderPath);
  if (!stat.isDirectory()) throw new Error('Geçerli bir klasör değil: ' + folderPath);

  const results: ScannedSeries[] = [];
  const entries = fs.readdirSync(folderPath);

  for (const entry of entries) {
    const entryPath = path.join(folderPath, entry);
    const entryStat = fs.statSync(entryPath);

    if (!entryStat.isDirectory()) continue;

    const seasons: ScannedSeries['seasons'] = [];
    let totalEpisodes = 0;

    const subEntries = fs.readdirSync(entryPath);
    let hasSeasonFolders = false;

    for (const sub of subEntries) {
      const subPath = path.join(entryPath, sub);
      const subStat = fs.statSync(subPath);

      if (subStat.isDirectory() && (sub.toLowerCase().includes('sezon') || sub.toLowerCase().includes('season') || /^\d+$/.test(sub))) {
        hasSeasonFolders = true;
        const seasonNum = parseSeasonNumber(sub);
        const episodes: ScannedSeries['seasons'][0]['episodes'] = [];

        const epFiles = fs.readdirSync(subPath).filter(f => isVideoFile(f));
        for (const ep of epFiles) {
          episodes.push({
            name: path.parse(ep).name,
            fullPath: path.join(subPath, ep),
            seasonNumber: seasonNum,
            episodeNumber: parseEpisodeNumber(ep),
          });
        }
        episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
        if (episodes.length > 0) {
          seasons.push({ name: sub, number: seasonNum, episodes });
          totalEpisodes += episodes.length;
        }
      }
    }

    if (!hasSeasonFolders) {
      const epFiles = subEntries.filter(f => isVideoFile(f));
      if (epFiles.length > 0) {
        const episodes = epFiles.map(ep => ({
          name: path.parse(ep).name,
          fullPath: path.join(entryPath, ep),
          seasonNumber: 1,
          episodeNumber: parseEpisodeNumber(ep),
        }));
        episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
        seasons.push({ name: 'Sezon 1', number: 1, episodes });
        totalEpisodes = episodes.length;
      }
    }

    if (totalEpisodes > 0) {
      results.push({ name: entry, fullPath: entryPath, seasons, totalEpisodes });
    }
  }

  return results;
}

async function searchTMDB(seriesName: string): Promise<{ poster?: string; backdrop?: string; description?: string; year?: number; rating?: number } | null> {
  if (!TMDB_API_KEY) return null;

  try {
    const encoded = encodeURIComponent(seriesName);
    const res = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encoded}&language=tr-TR`);
    if (!res.ok) return null;
    const data: any = await res.json();
    if (!data.results || data.results.length === 0) return null;

    const show = data.results[0];
    return {
      poster: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : undefined,
      backdrop: show.backdrop_path ? `https://image.tmdb.org/t/p/w1280${show.backdrop_path}` : undefined,
      description: show.overview || undefined,
      year: show.first_air_date ? parseInt(show.first_air_date) : undefined,
      rating: show.vote_average || undefined,
    };
  } catch {
    return null;
  }
}

async function downloadImage(url: string, dest: string): Promise<boolean> {
  try {
    ensureDir(path.dirname(dest));
    const res = await fetch(url);
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buffer);
    return true;
  } catch {
    return false;
  }
}

function getMediaBaseUrl(): string {
  return process.env.MEDIA_BASE_URL || 'http://localhost:4000/media';
}

export async function importSeries(
  folderPath: string,
  importId: string,
  options: { genre?: string; year?: number } = {}
): Promise<void> {
  const progress: ImportProgress = {
    id: importId,
    status: 'scanning',
    totalSeries: 0,
    processedSeries: 0,
    currentSeries: '',
    totalEpisodes: 0,
    processedEpisodes: 0,
    totalSize: 0,
    copiedSize: 0,
    errors: [],
    startedAt: new Date().toISOString(),
  };
  progressMap.set(importId, progress);

  try {
    const scanned = await scanFolder(folderPath);
    progress.totalSeries = scanned.length;
    progress.totalEpisodes = scanned.reduce((sum, s) => sum + s.totalEpisodes, 0);
    progress.status = 'importing';

    const existingContents = await prisma.content.findMany({
      where: { type: 'SERIES' },
      select: { slug: true },
    });
    const existingSlugs = new Set(existingContents.map(c => c.slug));

    for (const series of scanned) {
      progress.currentSeries = series.name;
      progressMap.set(importId, { ...progress });

      const seriesSlug = slugifyPath(series.name);
      if (existingSlugs.has(seriesSlug)) {
        progress.errors.push(`"${series.name}" zaten mevcut, atlandı`);
        progress.processedSeries++;
        continue;
      }

      const tmdb = await searchTMDB(series.name);
      const contentSlug = seriesSlug;
      existingSlugs.add(contentSlug);

      const seriesImagePath = path.join(IMAGES_DIR, contentSlug);
      let posterUrl = '';
      let coverUrl = '';

      if (tmdb?.poster) {
        const posterDest = path.join(seriesImagePath, 'poster.jpg');
        if (await downloadImage(tmdb.poster, posterDest)) {
          posterUrl = `${getMediaBaseUrl()}/images/${contentSlug}/poster.jpg`;
        }
      }
      if (tmdb?.backdrop) {
        const backdropDest = path.join(seriesImagePath, 'backdrop.jpg');
        if (await downloadImage(tmdb.backdrop, backdropDest)) {
          coverUrl = `${getMediaBaseUrl()}/images/${contentSlug}/backdrop.jpg`;
        }
      }
      if (!posterUrl && coverUrl) posterUrl = coverUrl;
      if (!coverUrl && posterUrl) coverUrl = posterUrl;

      const content = await prisma.content.create({
        data: {
          title: series.name,
          slug: contentSlug,
          description: tmdb?.description || '',
          type: 'SERIES',
          posterUrl,
          coverUrl,
          year: tmdb?.year || options.year || new Date().getFullYear(),
          imdbRating: tmdb?.rating || undefined,
          tags: JSON.stringify(options.genre ? [options.genre] : ['Drama']),
          language: 'tr',
          country: 'Türkiye',
          quality: 'HD',
          isActive: true,
        },
      });

      for (const seasonData of series.seasons) {
        const season = await prisma.season.create({
          data: {
            contentId: content.id,
            seasonNumber: seasonData.number,
            title: seasonData.name,
          },
        });

        for (const ep of seasonData.episodes) {
          const seasonSlug = `season-${seasonData.number}`;
          const episodeSlug = `episode-${ep.episodeNumber}`;
          const videoExt = path.extname(ep.fullPath);
          const videoDest = path.join(VIDEOS_DIR, contentSlug, seasonSlug, `${episodeSlug}${videoExt}`);
          const videoUrl = `${getMediaBaseUrl()}/videos/${contentSlug}/${seasonSlug}/${episodeSlug}${videoExt}`;

          try {
            const fileSize = getFileSize(ep.fullPath);
            await streamCopy(ep.fullPath, videoDest);
            progress.copiedSize += fileSize;
            progress.totalSize += fileSize;
          } catch (err: any) {
            progress.errors.push(`${series.name} S${seasonData.number}E${ep.episodeNumber}: ${err.message}`);
          }

          let stillUrl = '';
          if (posterUrl) stillUrl = posterUrl;

          const episode = await prisma.episode.create({
            data: {
              seasonId: season.id,
              episodeNumber: ep.episodeNumber,
              title: `${ep.episodeNumber}. Bölüm`,
            },
          });

          await prisma.video.create({
            data: {
              episodeId: episode.id,
              url: videoUrl,
              quality: 'HD',
              language: 'tr',
            },
          });

          progress.processedEpisodes++;
          progressMap.set(importId, { ...progress });
        }
      }

      progress.processedSeries++;
      progressMap.set(importId, { ...progress });
    }

    progress.status = 'completed';
    progress.completedAt = new Date().toISOString();
    progressMap.set(importId, { ...progress });
  } catch (err: any) {
    progress.status = 'error';
    progress.errors.push(err.message);
    progress.completedAt = new Date().toISOString();
    progressMap.set(importId, { ...progress });
  }
}
