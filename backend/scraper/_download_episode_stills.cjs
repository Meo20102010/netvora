const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const IMAGES_DIR = path.join(__dirname, '../storage/images');
const MEDIA_BASE = 'http://localhost:4000/media';

const SERIES = [
  {
    slug: 'gadar',
    tmdbId: 240798,
    tmdbSlug: '240798-gaddar',
    totalEpisodes: 20,
  },
  {
    slug: 'daha-17',
    tmdbId: 317883,
    tmdbSlug: '317883-daha-17',
    totalEpisodes: 7,
  },
  {
    slug: 'esref-ruya',
    tmdbId: 283123,
    tmdbSlug: '283123-esref-ruya',
    totalEpisodes: 47,
  },
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) { resolve(true); return; }
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

function extractEpisodeImages(html) {
  const results = {};
  const regex = /data-episode-number="(\d+)"[^>]*href="[^"]*"[^>]*>[\s\S]*?<img[^>]*src="https:\/\/media\.themoviedb\.org\/t\/p\/w227_and_h127_face\/([^".]+\.jpg)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const epNum = parseInt(match[1], 10);
    const imageId = match[2];
    if (!results[epNum]) {
      results[epNum] = `https://image.tmdb.org/t/p/original/${imageId}`;
    }
  }
  return results;
}

function extractEpisodesFromCards(html) {
  const results = {};
  const cardRegex = /data-episode-number="(\d+)"[\s\S]*?<img[^>]*class="backdrop[^"]*"[^>]*src="[^"]*\/([^".]+\.jpg)"/g;
  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const epNum = parseInt(match[1], 10);
    const imageId = match[2];
    if (!results[epNum]) {
      results[epNum] = `https://image.tmdb.org/t/p/original/${imageId}`;
    }
  }
  return results;
}

async function main() {
  console.log('=== EPISODE STILL DOWNLOADER ===\n');

  let totalUpdated = 0;

  for (const series of SERIES) {
    console.log(`--- ${series.slug} (TMDB ${series.tmdbId}) ---`);

    const epDir = path.join(IMAGES_DIR, series.slug, 'episodes');
    if (!fs.existsSync(epDir)) fs.mkdirSync(epDir, { recursive: true });

    const seasonUrl = `https://www.themoviedb.org/tv/${series.tmdbSlug}/season/1`;
    console.log(`  Fetching: ${seasonUrl}`);

    let html;
    try {
      html = await fetchUrl(seasonUrl);
    } catch (e) {
      console.log(`  FAILED to fetch: ${e.message}`);
      continue;
    }

    const images = extractEpisodesFromCards(html);
    const imagesAlt = extractEpisodeImages(html);
    const allImages = { ...imagesAlt, ...images };

    console.log(`  Found ${Object.keys(allImages).length} episode images`);

    // Also try fetching individual episode pages for missing ones
    for (let ep = 1; ep <= series.totalEpisodes; ep++) {
      if (!allImages[ep]) {
        try {
          const epUrl = `https://www.themoviedb.org/tv/${series.tmdbSlug}/season/1/episode/${ep}`;
          const epHtml = await fetchUrl(epUrl);
          const ogMatch = epHtml.match(/og:image[^>]*content="https:\/\/media\.themoviedb\.org\/t\/p\/w\d+\/([^".]+\.jpg)"/);
          if (ogMatch) {
            allImages[ep] = `https://image.tmdb.org/t/p/original/${ogMatch[1]}`;
          }
          // Also try finding in page content
          if (!allImages[ep]) {
            const imgMatch = epHtml.match(/src="https:\/\/media\.themoviedb\.org\/t\/p\/(?:w\d+_and_h\d+_face|original)\/([^".]+\.jpg)"/);
            if (imgMatch) {
              allImages[ep] = `https://image.tmdb.org/t/p/original/${imgMatch[1]}`;
            }
          }
        } catch (e) {
          // skip
        }
      }
    }

    // Download images and update DB
    const content = await prisma.content.findFirst({ where: { slug: series.slug } });
    if (!content) {
      console.log(`  Content not found in DB!`);
      continue;
    }

    const season = await prisma.season.findFirst({
      where: { contentId: content.id, seasonNumber: 1 }
    });
    if (!season) {
      console.log(`  Season 1 not found!`);
      continue;
    }

    for (let ep = 1; ep <= series.totalEpisodes; ep++) {
      const imageUrl = allImages[ep];
      if (!imageUrl) {
        console.log(`  E${ep}: no image found`);
        continue;
      }

      const filename = `ep${ep}.jpg`;
      const dest = path.join(epDir, filename);
      const stillUrl = `${MEDIA_BASE}/images/${series.slug}/episodes/${filename}`;

      try {
        await downloadFile(imageUrl, dest);
        const size = fs.statSync(dest).size;

        // Update episode in DB
        const episode = await prisma.episode.findFirst({
          where: { seasonId: season.id, episodeNumber: ep }
        });
        if (episode) {
          await prisma.episode.update({
            where: { id: episode.id },
            data: { stillUrl }
          });
          totalUpdated++;
        }
        process.stdout.write(`  E${ep}: OK (${(size/1024).toFixed(0)}KB)\n`);
      } catch (e) {
        console.log(`  E${ep}: FAILED - ${e.message}`);
      }
    }

    console.log('');
  }

  console.log(`\n=== DONE: Updated ${totalUpdated} episode stills ===`);
  await prisma.$disconnect();
}

main().catch(console.error);
