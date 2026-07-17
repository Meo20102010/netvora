const https = require('https');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const IMAGES_DIR = path.join(__dirname, '../storage/images');
const MEDIA_BASE = 'http://localhost:4000/media';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
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
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
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

async function main() {
  const slug = 'esref-ruya';
  const tmdbSlug = '283123-esref-ruya';
  const totalEps = 47;
  const epDir = path.join(IMAGES_DIR, slug, 'episodes');
  if (!fs.existsSync(epDir)) fs.mkdirSync(epDir, { recursive: true });

  const content = await prisma.content.findFirst({ where: { slug } });
  const season = await prisma.season.findFirst({ where: { contentId: content.id, seasonNumber: 1 } });

  let updated = 0;

  for (let ep = 14; ep <= totalEps; ep++) {
    const filename = `ep${ep}.jpg`;
    const dest = path.join(epDir, filename);
    const stillUrl = `${MEDIA_BASE}/images/${slug}/episodes/${filename}`;

    // Check if already downloaded
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`E${ep}: already exists, updating DB`);
      const episode = await prisma.episode.findFirst({ where: { seasonId: season.id, episodeNumber: ep } });
      if (episode && !episode.stillUrl) {
        await prisma.episode.update({ where: { id: episode.id }, data: { stillUrl } });
        updated++;
      }
      continue;
    }

    try {
      const epUrl = `https://www.themoviedb.org/tv/${tmdbSlug}/season/1/episode/${ep}`;
      const html = await fetchUrl(epUrl);

      // Try og:image
      let imageUrl = null;
      const ogMatch = html.match(/og:image[^>]*content="(https:\/\/media\.themoviedb\.org\/t\/p\/w\d+\/[^".]+\.jpg)"/);
      if (ogMatch) {
        imageUrl = ogMatch[1].replace(/\/t\/p\/w\d+\//, '/t/p/original/');
      }

      // Try any TMDB image
      if (!imageUrl) {
        const imgMatch = html.match(/src="(https:\/\/media\.themoviedb\.org\/t\/p\/(?:w\d+_and_h\d+_face|w\d+_and_h\d+_multi_faces|original)\/([^".]+\.jpg))"/);
        if (imgMatch) {
          imageUrl = `https://image.tmdb.org/t/p/original/${imgMatch[2]}`;
        }
      }

      // Try image.tmdb.org directly
      if (!imageUrl) {
        const imgMatch2 = html.match(/src="(https:\/\/image\.tmdb\.org\/t\/p\/(?:w\d+|original)\/([^".]+\.jpg))"/);
        if (imgMatch2) {
          imageUrl = imgMatch2[1].replace(/\/t\/p\/w\d+\//, '/t/p/original/');
        }
      }

      if (imageUrl) {
        await downloadFile(imageUrl, dest);
        const size = fs.statSync(dest).size;
        const episode = await prisma.episode.findFirst({ where: { seasonId: season.id, episodeNumber: ep } });
        if (episode) {
          await prisma.episode.update({ where: { id: episode.id }, data: { stillUrl } });
          updated++;
        }
        console.log(`E${ep}: OK (${(size/1024).toFixed(0)}KB)`);
      } else {
        console.log(`E${ep}: no image on TMDB`);
      }
    } catch (e) {
      console.log(`E${ep}: ERROR - ${e.message}`);
    }
  }

  console.log(`\nUpdated ${updated} additional episodes`);
  await prisma.$disconnect();
}

main().catch(console.error);
