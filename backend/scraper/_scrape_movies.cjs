const axios = require('axios');
const cheerio = require('cheerio');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const BASE = 'https://www.fullhdfilmizlesene.life';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const DELAY_MS = 300;
const MAX_PAGES = 1146;

const STATE_FILE = path.join(__dirname, 'state.json');
const ERRORS_FILE = path.join(__dirname, 'errors.json');

const GENRE_MAP = {
  'aile': 'aile', 'aksiyon': 'aksiyon', 'animasyon': 'animasyon',
  'belgesel': 'belgesel', 'bilim kurgu': 'bilim-kurgu', 'bluray': 'bluray',
  'çizgi film': 'animasyon', 'dram': 'dram', 'fantastik': 'fantastik',
  'gerilim': 'gerilim', 'gizem': 'gizem', 'hint': 'hint',
  'komedi': 'komedi', 'korku': 'korku', 'macera': 'macera',
  'müzikal': 'muzikal', 'polisiye': 'polisiye', 'psikolojik': 'psikolojik',
  'romantik': 'romantik', 'savaş': 'savas', 'suç': 'suc',
  'tarih': 'tarih', 'western': 'western', 'yerli': 'yerli',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u')
    .replace(/ö/g,'o').replace(/ı/g,'i').replace(/ç/g,'c')
    .replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
    .substring(0, 100) || 'movie';
}

function loadJSON(file, def) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return def; }
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

async function ensureCategories() {
  const existing = await prisma.category.findMany();
  const slugs = new Set(existing.map(c => c.slug));
  for (const [genre, slug] of Object.entries(GENRE_MAP)) {
    if (!slugs.has(slug)) {
      try { await prisma.category.create({ data: { name: genre.charAt(0).toUpperCase() + genre.slice(1), slug, sortOrder: 0 } }); } catch {}
    }
  }
  return prisma.category.findMany();
}

function mapCategory(genres, categories) {
  for (const g of genres) {
    const slug = GENRE_MAP[g.toLowerCase().trim()];
    if (slug) { const cat = categories.find(c => c.slug === slug); if (cat) return cat.id; }
  }
  return null;
}

async function scrapeDetail(url) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 15000 });
    const $ = cheerio.load(res.data);

    const description = $('.ozet, .film-aciklama, [class*="ozet"], [class*="aciklama"], p.aciklama').first().text().trim();
    const director = $('.info:contains("Yönetmen"), [class*="yonetmen"], [class*="director"]').first().text().replace(/Yönetmen/i, '').trim();

    let duration = null;
    const sureText = $('.sure, [class*="sure"], [class*="süre"]').first().text().trim();
    const durMatch = sureText.match(/(\d+)\s*dk/);
    if (durMatch) duration = parseInt(durMatch[1]);

    const yearText = $('.yil, [class*="yil"], [class*="year"]').first().text().trim();
    let year = null;
    const yrMatch = yearText.match(/(\d{4})/);
    if (yrMatch) year = parseInt(yrMatch[1]);

    return { description, director, duration, year };
  } catch {
    return { description: '', director: '', duration: null, year: null };
  }
}

async function scrapePage(page, categories) {
  const url = page === 1 ? BASE : `${BASE}/yeni-filmler/${page}`;
  const res = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 30000 });
  const $ = cheerio.load(res.data);
  const movies = [];

  $('li.film').each((i, el) => {
    const link = $(el).find('a.tt').attr('href');
    if (!link) return;

    const turkishTitle = $(el).find('.film-title').text().trim() || $(el).find('a.tt').text().trim();
    let year = parseInt($(el).find('.film-yil').text().trim());
    if (isNaN(year) || year < 1900 || year > 2030) year = null;

    const imdb = parseFloat($(el).find('.imdb').text().trim()) || null;
    const quality = $(el).find('.uhd').text().trim() || 'HD';

    const genres = [];
    const kttText = $(el).find('.ktt').text().trim();
    if (kttText) kttText.split(',').forEach(g => { const c = g.trim(); if (c) genres.push(c); });

    const posterEl = $(el).find('picture img');
    const poster = posterEl.attr('data-src') || posterEl.attr('src') || null;
    if (poster && poster.startsWith('data:')) return;

    const originalTitle = $(el).find('.kt').text().trim() || turkishTitle;

    movies.push({
      url: link, turkishTitle, originalTitle, year, imdb,
      quality: quality || 'HD', genres, poster, page,
      categoryId: mapCategory(genres, categories),
    });
  });

  return movies;
}

async function main() {
  console.log('=== FullHDFilmizlesene Scraper ===');
  const categories = await ensureCategories();
  console.log(`Categories: ${categories.length}`);

  const state = loadJSON(STATE_FILE, { lastPage: 0, created: 0, errors: 0 });
  const errorLog = loadJSON(ERRORS_FILE, []);
  const existingSlugs = new Set((await prisma.content.findMany({ select: { slug: true } })).map(c => c.slug));

  let { lastPage, created, errors } = state;
  console.log(`Resuming from page ${lastPage + 1}, already created: ${created}`);

  for (let page = lastPage + 1; page <= MAX_PAGES; page++) {
    try {
      const movies = await scrapePage(page, categories);
      if (movies.length === 0) { console.log(`Page ${page}: empty, stopping.`); break; }

      let pageAdded = 0;
      for (const m of movies) {
        try {
          let slug = slugify(m.originalTitle || m.turkishTitle);
          if (existingSlugs.has(slug)) slug = slug + '-' + Math.random().toString(36).slice(2, 6);

          // Get detail page info
          const detail = await scrapeDetail(m.url);

          const description = detail.description || `${m.turkishTitle}${m.originalTitle !== m.turkishTitle ? ' (' + m.originalTitle + ')' : ''} filmini Full HD kalitede izleyin.`;

          const content = await prisma.content.create({
            data: {
              title: m.turkishTitle,
              slug,
              description,
              type: 'MOVIE',
              posterUrl: m.poster,
              year: detail.year || m.year,
              duration: detail.duration,
              imdbRating: m.imdb,
              director: detail.director || null,
              cast: '[]',
              tags: JSON.stringify(m.genres),
              quality: m.quality,
              language: 'tr',
              isActive: true,
              categoryId: m.categoryId,
            }
          });

          await prisma.video.create({
            data: {
              contentId: content.id,
              url: `https://placeholder.video/${slug}.m3u8`,
              quality: m.quality,
              language: 'tr',
            }
          });

          existingSlugs.add(slug);
          pageAdded++;
          created++;
        } catch (e) {
          errors++;
          errorLog.push({ url: m.url, slug: slugify(m.originalTitle || m.turkishTitle), error: e.message, time: new Date().toISOString() });
        }
      }

      state.lastPage = page;
      state.created = created;
      state.errors = errors;
      if (page % 5 === 0) { saveJSON(STATE_FILE, state); saveJSON(ERRORS_FILE, errorLog); }

      console.log(`Page ${page}/${MAX_PAGES}: +${pageAdded} | Total: ${created} created, ${errors} errors`);
      await sleep(DELAY_MS);
    } catch (err) {
      errors++;
      errorLog.push({ page, error: err.message, time: new Date().toISOString() });
      saveJSON(STATE_FILE, state);
      saveJSON(ERRORS_FILE, errorLog);
      console.error(`Page ${page} error: ${err.message}, retrying...`);
      await sleep(3000);
      page--;
    }
  }

  saveJSON(STATE_FILE, state);
  saveJSON(ERRORS_FILE, errorLog);
  console.log(`\nDone: ${created} created, ${errors} errors`);
  await prisma.$disconnect();
}

main().catch(async err => { console.error('Fatal:', err); await prisma.$disconnect(); process.exit(1); });
