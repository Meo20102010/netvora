const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const OUTPUT = path.join(__dirname, 'kanald-series.json');

const EXCLUDED = new Set([
  'diziler', 'programlar', 'canli-yayin', 'yayin-akisi', 'basvurular',
  'foto-galeri', 'haber', 'sinemalar', 'foto-galeriler', 'evde-sinema',
  'kunye', 'reklam', 'yardim', 'veri-politikasi', 'kisisel-verilerin-korunmasi',
  'uydu-frekanslari', 'uygulamalarimiz', 'yemek-tarifleri', 'dizi-fragmanlari',
  'd-shorts-diziler',
]);

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext({ userAgent: UA, viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const apiCalls = [];
  page.on('request', request => {
    const url = request.url();
    const type = request.resourceType();
    if (type === 'xhr' || type === 'fetch' || url.includes('api') || url.includes('/graphql') || url.includes('.json')) {
      apiCalls.push({ url, type, method: request.method() });
    }
  });

  console.log('Navigating to https://www.kanald.com.tr/diziler ...');
  await page.goto('https://www.kanald.com.tr/diziler', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() =>
    page.goto('https://www.kanald.com.tr/diziler', { waitUntil: 'load', timeout: 60000 }).catch(() => {})
  );
  await page.waitForTimeout(8000);

  console.log('Page title:', await page.title());

  // Extract series from all sections
  const seriesData = await page.evaluate(() => {
    const results = [];
    const seen = new Set();

    // Strategy 1: swiper-slide list-item (active series + programs)
    document.querySelectorAll('.swiper-slide.list-item a[href]').forEach(a => {
      const href = a.href.replace(/\/+$/, '');
      const slug = href.split('/').pop();
      if (!slug || slug.length < 2 || seen.has(slug)) return;
      seen.add(slug);

      const img = a.querySelector('img');
      const figcaption = a.querySelector('figcaption p');
      const dateEl = a.querySelector('.list-item-btn-date');

      results.push({
        slug,
        title: figcaption ? figcaption.textContent.trim() : (img ? img.alt : slug),
        url: href,
        poster: img ? (img.src || img.getAttribute('data-src') || '') : '',
        section: 'active',
        schedule: dateEl ? dateEl.textContent.trim() : '',
      });
    });

    // Strategy 2: poster-card links (archive series)
    document.querySelectorAll('a.poster-card[href]').forEach(a => {
      const href = a.href.replace(/\/+$/, '');
      const slug = href.split('/').pop();
      if (!slug || slug.length < 2 || seen.has(slug)) return;
      seen.add(slug);

      const img = a.querySelector('img');
      results.push({
        slug,
        title: img ? img.alt : slug,
        url: href,
        poster: img ? (img.src || img.getAttribute('data-src') || '') : '',
        section: 'archive',
        schedule: '',
      });
    });

    // Strategy 3: sm-new-list-link (full series list)
    document.querySelectorAll('a.sm-new-list-link[href]').forEach(a => {
      const href = a.href.replace(/\/+$/, '');
      const slug = href.split('/').pop();
      if (!slug || slug.length < 2 || seen.has(slug)) return;
      seen.add(slug);

      const parent = a.closest('li');
      const img = parent ? parent.querySelector('img') : null;
      results.push({
        slug,
        title: a.textContent.trim(),
        url: href,
        poster: img ? (img.src || img.getAttribute('data-src') || '') : '',
        section: 'list',
        schedule: '',
      });
    });

    return results;
  });

  // Filter out excluded slugs and deduplicate
  const filtered = [];
  const seenSlugs = new Set();
  for (const s of seriesData) {
    if (EXCLUDED.has(s.slug)) continue;
    if (seenSlugs.has(s.slug)) continue;
    seenSlugs.add(s.slug);
    filtered.push(s);
  }

  console.log(`\nFound ${filtered.length} unique series:`);
  filtered.forEach(s => console.log(`  [${s.section}] ${s.title} (${s.slug}): ${s.url}`));

  // Visit each series page for details
  console.log('\n--- Visiting individual series pages ---');
  const detailedResults = [];

  for (let i = 0; i < filtered.length; i++) {
    const series = filtered[i];
    console.log(`[${i + 1}/${filtered.length}] ${series.title}...`);

    try {
      const detail = await scrapeSeriesPage(context, series);
      detailedResults.push(detail);
      console.log(`  => ${detail.title} | ${detail.description?.substring(0, 80) || 'no desc'} | ${detail.episodes.length} episodes`);
    } catch (err) {
      console.log(`  => Error: ${err.message}`);
      detailedResults.push({ ...series, error: err.message, description: '', poster: series.poster, genre: '', episodes: [] });
    }

    // Save after each page in case of crash
    fs.writeFileSync(OUTPUT + '.tmp', JSON.stringify({
      source: 'https://www.kanald.com.tr/diziler',
      scrapedAt: new Date().toISOString(),
      totalSeries: filtered.length,
      series: detailedResults,
      apiCalls,
    }, null, 2));

    await page.waitForTimeout(500);
  }

  const output = {
    source: 'https://www.kanald.com.tr/diziler',
    scrapedAt: new Date().toISOString(),
    totalSeries: detailedResults.length,
    series: detailedResults,
    apiCalls,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  if (fs.existsSync(OUTPUT + '.tmp')) fs.unlinkSync(OUTPUT + '.tmp');

  console.log(`\nSaved to ${OUTPUT}`);
  console.log(`Total series: ${detailedResults.length}`);

  await browser.close();
}

async function scrapeSeriesPage(context, series) {
  const page = await context.newPage();
  const result = {
    slug: series.slug,
    url: series.url,
    title: series.title,
    description: '',
    poster: series.poster || '',
    genre: '',
    episodes: [],
    schedule: series.schedule || '',
    section: series.section || '',
    error: null,
  };

  try {
    await page.goto(series.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const data = await page.evaluate(() => {
      const info = {};
      const h1 = document.querySelector('h1');
      info.title = h1 ? h1.textContent.trim() : '';

      const metaDesc = document.querySelector('meta[name="description"]');
      info.description = metaDesc ? metaDesc.content : '';
      if (!info.description) {
        const el = document.querySelector('.description, [class*="description"], [class*="aciklama"], [class*="summary"], [class*="ozet"], [class*="about"], [class*="content-detail"]');
        if (el) info.description = el.textContent.trim();
      }

      let poster = '';
      const og = document.querySelector('meta[property="og:image"]');
      if (og) poster = og.content;
      if (!poster) {
        const img = document.querySelector('img[class*="poster"], img[class*="cover"], img[class*="kapak"], img[class*="hero"]');
        if (img) poster = img.src || img.getAttribute('data-src') || '';
      }

      let genre = '';
      const el = document.querySelector('[class*="genre"], [class*="kategori"], [class*="tur"], [class*="category"], [class*="tag"]');
      if (el) genre = el.textContent.trim();
      if (!genre) {
        const mk = document.querySelector('meta[name="keywords"]');
        if (mk) genre = mk.content;
      }

      let episodes = [];
      document.querySelectorAll('[class*="episode"] a[href], [class*="bolum"] a[href], [class*="sezon"] a[href], [class*="season"] a[href]').forEach(a => {
        const href = a.href;
        if (href && !episodes.some(e => e.url === href)) {
          episodes.push({ title: a.textContent.trim(), url: href });
        }
      });

      return { title: info.title, description: info.description, poster, genre, episodes };
    });

    if (data.title) result.title = data.title;
    result.description = data.description || '';
    result.poster = data.poster || result.poster;
    result.genre = data.genre || '';
    result.episodes = data.episodes || [];

  } catch (err) {
    result.error = err.message.substring(0, 200);
  }

  await page.close();
  return result;
}

main().catch(err => { console.error(err); process.exit(1); });
