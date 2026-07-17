const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const prisma = new PrismaClient();

const STORAGE_ROOT = path.join(__dirname, '../storage');
const VIDEOS_DIR = path.join(STORAGE_ROOT, 'videos');
const IMAGES_DIR = path.join(STORAGE_ROOT, 'images');
const MEDIA_BASE = 'http://localhost:4000/media';
const DIZILER_PATH = 'C:\\Users\\Wado2\\OneDrive\\Desktop\\Tv\\diziler';

// Ensure dirs
for (const dir of [STORAGE_ROOT, VIDEOS_DIR, IMAGES_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/[ğ]/g,'g').replace(/[ü]/g,'u').replace(/[ş]/g,'s')
    .replace(/[ı]/g,'i').replace(/[ö]/g,'o').replace(/[ç]/g,'c')
    .replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
    .substring(0, 100) || 'series';
}

function isVideoFile(name) {
  return /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(name);
}

function parseEpisodeNumber(name) {
  const clean = path.parse(name).name;
  const bolumMatch = clean.match(/[Bb][öo]?l[üu]?m[\s._-]*(\d+)/i);
  if (bolumMatch) return parseInt(bolumMatch[1], 10);
  const epMatch = clean.match(/[Ee]p(?:isode)?[\s._-]*(\d+)/i);
  if (epMatch) return parseInt(epMatch[1], 10);
  const seMatch = clean.match(/S\d+[Ee](\d+)/i);
  if (seMatch) return parseInt(seMatch[1], 10);
  const parts = clean.split(/[\s._-]+/);
  for (let i = parts.length - 1; i >= 0; i--) {
    const num = parseInt(parts[i], 10);
    if (!isNaN(num) && num > 0 && num < 1000) return num;
  }
  return 0;
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) { resolve(true); return; }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
      const ws = fs.createWriteStream(dest);
      res.pipe(ws);
      ws.on('finish', () => { ws.close(); resolve(true); });
      ws.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function streamCopy(src, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const rs = fs.createReadStream(src);
    const ws = fs.createWriteStream(dest);
    rs.pipe(ws);
    ws.on('finish', resolve);
    ws.on('error', reject);
    rs.on('error', reject);
  });
}

// Series metadata with TMDB poster/backdrop paths
const SERIES_DATA = {
  'Daha 17': {
    title: 'Daha 17',
    description: 'Yetistirme yurtlarinda hayatini gecirmis, 17 yasinda bir genc olan Aras\'in hikayesini anlatir.',
    year: 2026,
    imdbRating: 7.5,
    genre: 'Drama',
    country: 'Turkiye',
    language: 'tr',
    tags: ['Drama', 'Genclik', 'Gizem'],
    director: 'Emre Kabakusak',
    cast: ['Nesrin Cavadzade', 'Cagan Efe Ak', 'Arman Oguz', 'Dilara Aksuyek', 'Ceren Ayruk', 'Ata Yastat'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/placeholder.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/placeholder.jpg',
  },
  'E\u015fref R\u00fcya': {
    title: 'E\u015fref R\u00fcya',
    description: 'Cocukken uzaktan asik oldugu ve Ruya adini verdigi kizi yillarca ararken guclu bir mafya uyesine donusen Esref\'in ask ve intikam hikayesini anlatir.',
    year: 2025,
    imdbRating: 8.0,
    genre: 'Drama',
    country: 'Turkiye',
    language: 'tr',
    tags: ['Drama', 'Aksiyon', 'Romantik', 'Suc'],
    director: 'Yonetmen Bilinmiyor',
    cast: ['Cagatay Ulusoy', 'Demet Ozdemir', 'Necip Memili', 'Busra Develi', 'Tolga Tekin'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/wwwKL2Pq3JZdI52wIYqjAdUF8fx.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/wwwKL2Pq3JZdI52wIYqjAdUF8fx.jpg',
  },
  'Gadar': {
    title: 'Gaddar',
    description: 'Daghan, askerlik hizmetini tamamladiktan sonra eve doner. Ancak ailesi yillar icinde dagilmistir. Geride biraktigi sevgilisi ve ailesiyle yeniden karsilasan Daghan, beklenmedik olaylar karsisinda acimasiz bir adam haline gelir.',
    year: 2024,
    imdbRating: 7.2,
    genre: 'Aksiyon',
    country: 'Turkiye',
    language: 'tr',
    tags: ['Aksiyon', 'Drama', 'Suc', 'Gerilim'],
    director: 'Sinan Ozturk',
    cast: ['Cagatay Ulusoy', 'Sümeyye Aydogan', 'Onur Saylak', 'Erdal Ozyagcilar'],
    posterUrl: 'https://image.tmdb.org/t/p/w500/t3In5u7Hce8LWqLOo7E1FEX2bL2.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/t3In5u7Hce8LWqLOo7E1FEX2bL2.jpg',
  },
};

async function main() {
  console.log('=== DISI IMPORT ===\n');

  // Get existing slugs
  const existing = await prisma.content.findMany({ where: { type: 'SERIES' }, select: { slug: true } });
  const existingSlugs = new Set(existing.map(e => e.slug));
  console.log(`Mevcut dizi: ${existingSlugs.size}`);

  // Scan diziler folder
  const seriesDirs = fs.readdirSync(DIZILER_PATH).filter(d => {
    const full = path.join(DIZILER_PATH, d);
    return fs.statSync(full).isDirectory();
  });

  console.log(`Bulunan dizi klasoru: ${seriesDirs.length}\n`);

  let totalCopied = 0;

  for (const dirName of seriesDirs) {
    const seriesPath = path.join(DIZILER_PATH, dirName);
    const slug = slugify(dirName);
    const data = SERIES_DATA[dirName] || {};

    console.log(`--- ${dirName} (slug: ${slug}) ---`);

    if (existingSlugs.has(slug)) {
      console.log('  Zaten mevcut, atlandi.\n');
      continue;
    }

    // Collect all MP4 files
    const files = fs.readdirSync(seriesPath).filter(f => isVideoFile(f));
    const episodes = files.map(f => ({
      name: path.parse(f).name,
      fullPath: path.join(seriesPath, f),
      episodeNumber: parseEpisodeNumber(f),
    })).sort((a, b) => a.episodeNumber - b.episodeNumber);

    console.log(`  ${episodes.length} bolum bulundu`);

    // Create content
    const seriesSlug = slug;
    const imgDir = path.join(IMAGES_DIR, seriesSlug);
    const vidDir = path.join(VIDEOS_DIR, seriesSlug, 'season-1');

    // Download poster
    let posterUrl = '';
    let coverUrl = '';

    if (data.posterUrl) {
      const posterDest = path.join(imgDir, 'poster.jpg');
      try {
        await downloadFile(data.posterUrl, posterDest);
        posterUrl = `${MEDIA_BASE}/images/${seriesSlug}/poster.jpg`;
        console.log('  Poster indirildi');
      } catch (e) { console.log('  Poster indirilemedi:', e.message); }
    }

    if (data.backdropUrl || data.posterUrl) {
      const backdropDest = path.join(imgDir, 'backdrop.jpg');
      try {
        await downloadFile(data.backdropUrl || data.posterUrl, backdropDest);
        coverUrl = `${MEDIA_BASE}/images/${seriesSlug}/backdrop.jpg`;
        console.log('  Backdrop indirildi');
      } catch (e) { console.log('  Backdrop indirilemedi:', e.message); }
    }

    if (!posterUrl && coverUrl) posterUrl = coverUrl;
    if (!coverUrl && posterUrl) coverUrl = posterUrl;

    const content = await prisma.content.create({
      data: {
        title: data.title || dirName,
        slug: seriesSlug,
        description: data.description || '',
        type: 'SERIES',
        posterUrl,
        coverUrl,
        year: data.year || 2026,
        imdbRating: data.imdbRating || 7.0,
        director: data.director || '',
        cast: JSON.stringify(data.cast || []),
        tags: JSON.stringify(data.tags || [data.genre || 'Drama']),
        country: data.country || 'Türkiye',
        language: data.language || 'tr',
        quality: 'HD',
        isActive: true,
      },
    });

    existingSlugs.add(seriesSlug);

    // Create season
    const season = await prisma.season.create({
      data: { contentId: content.id, seasonNumber: 1, title: '1. Sezon' },
    });

    // Process episodes
    for (const ep of episodes) {
      const epSlug = `episode-${ep.episodeNumber}`;
      const videoExt = path.extname(ep.fullPath);
      const videoDest = path.join(vidDir, `${epSlug}${videoExt}`);
      const videoUrl = `${MEDIA_BASE}/videos/${seriesSlug}/season-1/${epSlug}${videoExt}`;

      // Copy video
      try {
        await streamCopy(ep.fullPath, videoDest);
        const stat = fs.statSync(videoDest);
        totalCopied += stat.size;
        process.stdout.write(`  S1E${ep.episodeNumber}: kopyalandi (${(stat.size / 1024 / 1024).toFixed(0)}MB) `);
      } catch (e) {
        console.log(`  S1E${ep.episodeNumber}: HATA - ${e.message}`);
        continue;
      }

      // Episode still - use poster
      let stillUrl = posterUrl || '';

      const episode = await prisma.episode.create({
        data: {
          seasonId: season.id,
          episodeNumber: ep.episodeNumber,
          title: `${ep.episodeNumber}. Bolum`,
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

      console.log('OK');
    }

    console.log(`  Tamamlandi: ${episodes.length} bolum, ${(totalCopied / 1024 / 1024).toFixed(0)}MB toplam`);
    console.log('');
  }

  // Final stats
  const finalCount = await prisma.content.count({ where: { type: 'SERIES' } });
  const seasonCount = await prisma.season.count();
  const epCount = await prisma.episode.count();
  const vidCount = await prisma.video.count();

  console.log('=== SONUC ===');
  console.log(`Toplam seri: ${finalCount}`);
  console.log(`Toplam sezon: ${seasonCount}`);
  console.log(`Toplam bolum: ${epCount}`);
  console.log(`Toplam video: ${vidCount}`);
  console.log(`Toplam kopyalanan: ${(totalCopied / 1024 / 1024 / 1024).toFixed(2)} GB`);

  await prisma.$disconnect();
}

main().catch(console.error);
