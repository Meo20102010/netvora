const { PrismaClient } = require('@prisma/client');
const { chromium } = require('playwright');

const p = new PrismaClient();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function main() {
  const kanaldSeries = await p.content.findMany({
    where: { type: 'SERIES', slug: { in: [
      'daha-17', 'uzak-sehir', 'esref-ruya', 'arka-sokaklar',
      'guller-ve-gunahlar', 'askimemnu', 'inci-taneleri', 'vatanim-sensin',
      'siyah-beyaz-ask', 'zalim-istanbul', 'poyraz-karayel', 'afili-ask',
      'gunesin-kizlari', 'fatmagulunsucune', 'hekimoglu', 'kuzeyguney',
    ] } },
    include: { seasons: { include: { episodes: true } } },
  });

  if (kanaldSeries.length === 0) { console.log('No kanald series found'); return; }

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ userAgent: UA });

  let totalNew = 0;
  for (const series of kanaldSeries) {
    const existingTitles = new Set(series.seasons.flatMap(s => s.episodes.map(e => e.title)));
    const epIds = series.seasons.flatMap(s => s.episodes.map(e => e.id));
    const vids = await p.video.findMany({ where: { episodeId: { in: epIds } } });
    const existingUrls = new Set(vids.map(v => v.url));

    const page = await context.newPage();
    try {
      await page.goto(`https://www.kanald.com.tr/${series.slug}/bolumler`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(3000);

      const episodes = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('a[href*="/bolumler/"], a[href*="/bolum/"]').forEach(a => {
          const href = a.href;
          const text = a.textContent.trim().replace(/\s+/g, ' ');
          if (href && text && !results.some(r => r.url === href)) {
            const img = a.querySelector('img');
            const durText = a.querySelector('[class*="sure"], [class*="duration"], [class*="time"]');
            results.push({ title: text, url: href, poster: img ? (img.src || img.getAttribute('data-src') || '') : '', duration: durText ? durText.textContent.trim() : '' });
          }
        });
        return results;
      });

      const newEps = episodes.filter(e => !existingTitles.has(e.title) && !existingUrls.has(e.url) && !e.url.includes('/fragmanlar') && !e.url.includes('/ozetler'));

      if (newEps.length > 0) {
        console.log(`${series.title}: ${newEps.length} new episodes`);
        let season = series.seasons[0];
        if (!season) {
          season = await p.season.create({ data: { contentId: series.id, seasonNumber: 1, title: 'Sezon 1' } });
        }
        const maxEpNum = series.seasons.flatMap(s => s.episodes).reduce((max, e) => Math.max(max, e.episodeNumber), 0);

        for (let i = 0; i < newEps.length; i++) {
          const ep = newEps[i];
          const episode = await p.episode.create({
            data: { seasonId: season.id, episodeNumber: maxEpNum + i + 1, title: ep.title, duration: parseDuration(ep.duration) },
          });
          await p.video.create({
            data: { episodeId: episode.id, url: ep.url, quality: 'HD', language: 'tr' },
          });
          totalNew++;
        }
      }
    } catch (err) {
      console.log(`Error checking ${series.title}: ${err.message}`);
    }
    await page.close();
  }

  console.log(`\nUpdated: ${totalNew} new episodes`);
  await browser.close();
  await p.$disconnect();
}

function parseDuration(str) {
  if (!str) return null;
  const m = str.match(/(\d+):(\d+):(\d+)/);
  if (m) return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]);
  const m2 = str.match(/(\d+):(\d+)/);
  if (m2) return parseInt(m2[1]) * 60 + parseInt(m2[2]);
  return null;
}

main().catch(e => { console.error(e); process.exit(1); });
