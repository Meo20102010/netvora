const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const OUTPUT = path.join(__dirname, 'kanald-series.json');
const TIMEOUT = 20000;

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ userAgent: UA, viewport: { width: 1920, height: 1080 } });

  console.log('=== ADIM 1: kanald.com.tr/diziler sayfasını çek ===');
  const listPage = await context.newPage();
  await listPage.goto('https://www.kanald.com.tr/diziler', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() =>
    listPage.goto('https://www.kanald.com.tr/diziler', { waitUntil: 'load', timeout: 60000 }).catch(() => {})
  );
  await listPage.waitForTimeout(5000);

  // Also try to get all series from the sitemap or alternative pages
  const allSeriesUrls = new Map();

  // Extract from main diziler page
  const mainList = await listPage.evaluate(() => {
    const results = [];
    const seen = new Set();
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.href.replace(/\/+$/, '');
      const slug = href.split('/').pop();
      if (!slug || slug.length < 2 || seen.has(slug)) return;
      if (['diziler','programlar','canli-yayin','yayin-akisi','haber','sinemalar','foto-galeri','foto-galeriler','evde-sinema','kunye','reklam','yardim','veri-politikasi','kisisel-verilerin-korunmasi','uydu-frekanslari','uygulamalarimiz','yemek-tarifleri','dizi-fragmanlari','d-shorts-diziler','basvurular'].includes(slug)) return;
      seen.add(slug);
      const img = a.querySelector('img');
      results.push({
        slug,
        title: a.textContent.trim() || (img ? img.alt : slug),
        url: href,
        poster: img ? (img.src || img.getAttribute('data-src') || '') : '',
      });
    });
    return results;
  });

  console.log(`Ana sayfadan ${mainList.length} dizi bulundu`);
  mainList.forEach(s => allSeriesUrls.set(s.slug, s));

  // Try to get more series from the sitemap
  try {
    const sitemapPage = await context.newPage();
    await sitemapPage.goto('https://www.kanald.com.tr/sitemap.xml', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const sitemapContent = await sitemapPage.content();
    const urlMatches = sitemapContent.match(/https:\/\/www\.kanald\.com\.tr\/dizi\/[^<\s]+/g) || [];
    console.log(`Sitemap'ten ${urlMatches.length} dizi URL'i bulundu`);
    for (const url of urlMatches) {
      const slug = url.replace(/\/+$/, '').split('/').pop();
      if (slug && slug.length > 2 && !allSeriesUrls.has(slug)) {
        allSeriesUrls.set(slug, { slug, title: slug, url, poster: '' });
      }
    }
    await sitemapPage.close();
  } catch (e) {
    console.log('Sitemap erişilemedi:', e.message);
  }

  // Try /diziler?page=1,2,3... for more series
  for (let pg = 1; pg <= 10; pg++) {
    try {
      const pgPage = await context.newPage();
      await pgPage.goto(`https://www.kanald.com.tr/diziler?page=${pg}`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      await pgPage.waitForTimeout(2000);
      const pgList = await pgPage.evaluate(() => {
        const results = [];
        document.querySelectorAll('a[href]').forEach(a => {
          const href = a.href.replace(/\/+$/, '');
          const parts = href.split('/');
          const slug = parts[parts.length - 1];
          if (slug && slug.length > 2) {
            const img = a.querySelector('img');
            results.push({ slug, title: a.textContent.trim() || (img ? img.alt : slug) || slug, url: href, poster: img ? (img.src || img.getAttribute('data-src') || '') : '' });
          }
        });
        return results;
      });
      let newCount = 0;
      for (const s of pgList) {
        if (!allSeriesUrls.has(s.slug) && s.slug.length > 2 && !['diziler','programlar','canli-yayin'].includes(s.slug)) {
          allSeriesUrls.set(s.slug, s);
          newCount++;
        }
      }
      console.log(`Sayfa ${pg}: +${newCount} yeni dizi (toplam: ${allSeriesUrls.size})`);
      await pgPage.close();
      if (newCount === 0) break;
    } catch (e) { break; }
  }

  console.log(`\nToplam ${allSeriesUrls.size} benzersiz dizi URL'i bulundu`);
  const seriesList = Array.from(allSeriesUrls.values());
  fs.writeFileSync(path.join(__dirname, 'kanald-urls.json'), JSON.stringify(seriesList, null, 2));

  // ADIM 2: Her dizi sayfasını ziyaret et, bölüm ve detay bilgisi çek
  console.log('\n=== ADIM 2: Dizi sayfalarını çek ===');
  const detailedResults = [];
  const failed = [];

  for (let i = 0; i < seriesList.length; i++) {
    const series = seriesList[i];
    process.stdout.write(`[${i + 1}/${seriesList.length}] ${series.title}... `);

    try {
      const detail = await scrapeSeriesPage(context, series);
      detailedResults.push(detail);
      console.log(`OK - ${detail.episodes.length} bölüm, poster=${detail.poster ? 'var' : 'yok'}`);
    } catch (err) {
      console.log(`HATA: ${err.message?.substring(0, 60)}`);
      failed.push({ ...series, error: err.message });
      detailedResults.push({ ...series, description: '', genre: '', episodes: [] });
    }

    // Save progress
    if (i % 10 === 0) {
      fs.writeFileSync(OUTPUT, JSON.stringify({
        source: 'https://www.kanald.com.tr/diziler',
        scrapedAt: new Date().toISOString(),
        totalSeries: detailedResults.length,
        series: detailedResults,
        failed,
      }, null, 2));
    }
  }

  // Final save
  fs.writeFileSync(OUTPUT, JSON.stringify({
    source: 'https://www.kanald.com.tr/diziler',
    scrapedAt: new Date().toISOString(),
    totalSeries: detailedResults.length,
    totalEpisodes: detailedResults.reduce((sum, s) => sum + s.episodes.length, 0),
    series: detailedResults,
    failed,
  }, null, 2));

  console.log(`\n=== SONUÇ ===`);
  console.log(`Toplam dizi: ${detailedResults.length}`);
  console.log(`Toplam bölüm: ${detailedResults.reduce((sum, s) => sum + s.episodes.length, 0)}`);
  console.log(`Poster olan: ${detailedResults.filter(s => s.poster).length}`);
  console.log(`Başarısız: ${failed.length}`);
  console.log(`Kaydedildi: ${OUTPUT}`);

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
    coverUrl: '',
    genre: '',
    episodes: [],
    seasons: [],
    error: null,
  };

  try {
    await page.goto(series.url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT }).catch(() => {});
    await page.waitForTimeout(3000);

    const data = await page.evaluate(() => {
      const info = {};
      const h1 = document.querySelector('h1');
      info.title = h1 ? h1.textContent.trim() : '';

      const metaDesc = document.querySelector('meta[name="description"]');
      info.description = metaDesc ? metaDesc.content : '';
      if (!info.description) {
        const el = document.querySelector('[class*="description"], [class*="ozet"], [class*="about"], [class*="content-detail"]');
        if (el) info.description = el.textContent.trim();
      }

      let poster = '';
      const og = document.querySelector('meta[property="og:image"]');
      if (og) poster = og.content;
      if (!poster) {
        const img = document.querySelector('img[class*="poster"], img[class*="cover"], img[class*="hero"]');
        if (img) poster = img.src || img.getAttribute('data-src') || '';
      }
      info.poster = poster;

      let genre = '';
      const genreEl = document.querySelector('[class*="genre"], [class*="kategori"], [class*="tur"], [class*="category"]');
      if (genreEl) genre = genreEl.textContent.trim();
      if (!genre) {
        const mk = document.querySelector('meta[name="keywords"]');
        if (mk) genre = mk.content;
      }
      info.genre = genre;

      // Extract episodes - multiple strategies
      const episodes = [];

      // Strategy 1: episode links
      document.querySelectorAll('[class*="episode"] a[href], [class*="bolum"] a[href]').forEach(a => {
        const href = a.href;
        const title = a.textContent.trim();
        if (href && title && !episodes.some(e => e.url === href)) {
          episodes.push({ title, url: href });
        }
      });

      // Strategy 2: season tabs and their episodes
      document.querySelectorAll('[class*="season"] a[href], [class*="sezon"] a[href]').forEach(a => {
        const href = a.href;
        const title = a.textContent.trim();
        if (href && title && !episodes.some(e => e.url === href)) {
          episodes.push({ title, url: href });
        }
      });

      // Strategy 3: any link with "bolum" in URL
      document.querySelectorAll('a[href*="bolum"]').forEach(a => {
        const href = a.href;
        const title = a.textContent.trim();
        if (href && title && !episodes.some(e => e.url === href)) {
          episodes.push({ title, url: href });
        }
      });

      // Strategy 4: list items that look like episodes
      document.querySelectorAll('li a[href], .item a[href]').forEach(a => {
        const href = a.href;
        const title = a.textContent.trim();
        if (href && title && (title.toLowerCase().includes('bölüm') || title.toLowerCase().includes('bolum')) && !episodes.some(e => e.url === href)) {
          episodes.push({ title, url: href });
        }
      });

      return { ...info, episodes };
    });

    if (data.title) result.title = data.title;
    result.description = data.description || '';
    result.poster = data.poster || result.poster;
    result.genre = data.genre || '';
    result.episodes = data.episodes || [];

    // If we found episodes, try to also extract video URLs from each episode page
    // Visit a sample episode to extract scx video URLs
    if (result.episodes.length > 0) {
      const firstEp = result.episodes[0];
      try {
        await page.goto(firstEp.url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT }).catch(() => {});
        await page.waitForTimeout(3000);
        const videoData = await page.evaluate(() => {
          const scripts = document.querySelectorAll('script');
          for (const s of scripts) {
            const text = s.textContent || s.innerText;
            if (text.includes('scx')) {
              const match = text.match(/(?:var|let|const)\s+scx\s*=\s*(\{[\s\S]*?\});/);
              if (match) {
                try { return JSON.parse(match[1]); } catch {}
              }
            }
          }
          return null;
        });
        if (videoData) {
          result._videoData = videoData;
          // Extract actual URLs
          const urls = extractVideoUrls(videoData);
          result._sampleVideoUrls = urls;
        }
      } catch (e) {
        // ignore
      }
    }

  } catch (err) {
    result.error = err.message?.substring(0, 200);
  }

  await page.close();
  return result;
}

function extractVideoUrls(scx) {
  const urls = [];
  if (!scx || typeof scx !== 'object') return urls;
  for (const [name, data] of Object.entries(scx)) {
    if (!data || !data.sx) continue;
    for (const [type, td] of Object.entries(data.sx)) {
      let arr = null;
      if (Array.isArray(td)) arr = td;
      else if (td && Array.isArray(td.t)) arr = td.t;
      else if (td && typeof td === 'object' && !Array.isArray(td)) {
        const vals = [];
        for (const v of Object.values(td)) {
          if (Array.isArray(v)) vals.push(...v);
          else if (typeof v === 'string' && v.length > 0) vals.push(v);
        }
        if (vals.length > 0) arr = vals;
      }
      if (!arr) continue;
      arr.forEach(enc => {
        if (!enc) return;
        try {
          let url = null;
          if (enc.startsWith('http')) {
            url = enc;
          } else {
            const rot13d = (enc + '').replace(/[a-z]/gi, s => String.fromCharCode(s.charCodeAt(0) + (s.toLowerCase() < 'n' ? 13 : -13)));
            const dec = Buffer.from(rot13d, 'base64').toString('utf8');
            if (dec && dec.startsWith('http')) url = dec;
          }
          if (url) urls.push(url);
        } catch {}
      });
    }
  }
  return urls;
}

main().catch(err => { console.error(err); process.exit(1); });
