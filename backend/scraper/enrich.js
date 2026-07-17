const axios = require('axios');
const cheerio = require('cheerio');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const CONCURRENCY = 8;
const CACHE_FILE = path.join(__dirname, 'url-cache.json');
const MAPPING_FILE = path.join(__dirname, 'slug-map.json');
const ENRICH_STATE = path.join(__dirname, 'enrich-progress.json');

function rtt(str) {
  return (str + '').replace(/[a-z]/gi, s => String.fromCharCode(s.charCodeAt(0) + (s.toLowerCase() < 'n' ? 13 : -13)));
}

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u')
    .replace(/ö/g,'o').replace(/ı/g,'i').replace(/ç/g,'c')
    .replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
    .substring(0, 100) || 'movie';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadJSON(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } }
function saveJSON(f, d) { fs.writeFileSync(f, JSON.stringify(d, null, 2)); }

function extractScx(html) {
  // Try multiple patterns for scx variable
  const patterns = [
    /var\s+scx\s*=\s*(\{[\s\S]*?\});/,
    /var\s+scx\s*=\s*(\{[^;]+?\});/,
    /scx\s*=\s*(\{[\s\S]*?\});/
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      try { return JSON.parse(m[1]); } catch {}
      try {
        const fixed = m[1].replace(/'/g, '"').replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
        return JSON.parse(fixed);
      } catch {}
    }
  }
  return null;
}

function extractUrls(scx) {
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
      arr.forEach((enc) => {
        if (!enc) return;
        try {
          let url = null;
          if (enc.startsWith('http')) {
            url = enc;
          } else {
            const rot13d = rtt(enc);
            const dec = Buffer.from(rot13d, 'base64').toString('utf8');
            if (dec && dec.startsWith('http')) url = dec;
          }
          if (!url) return;
          // Transform dead sobreatsesuyp URLs to working turbo.imgz.me URLs
          const sobMatch = url.match(/^https:\/\/sobreatsesuyp\.com\/movie\/([a-f0-9]+)\/iframe$/);
          if (sobMatch) {
            url = `https://turbo.imgz.me/play/${sobMatch[1]}`;
          }
          urls.push(url);
        } catch {}
      });
    }
  }
  return urls;
}

async function buildSlugMap() {
  console.log('Building slug map...');
  const urlCache = loadJSON(CACHE_FILE, []);
  const contents = await prisma.content.findMany({ select: { id: true, title: true, slug: true } });
  const contentBySlug = new Map(contents.map(c => [c.slug, c]));
  
  const map = [];
  let matched = 0;
  let fuzzy = 0;
  
  for (const item of urlCache) {
    const expectedSlug = slugify(item.turkishTitle);
    let content = contentBySlug.get(expectedSlug);
    
    if (!content) {
      // Fuzzy match by title
      const ct = contents.find(c => c.title === item.turkishTitle);
      if (ct) { content = ct; fuzzy++; }
    } else {
      matched++;
    }
    
    if (content) {
      map.push({ contentId: content.id, url: item.url, turkishTitle: item.turkishTitle });
    }
  }
  
  console.log(`Matched: ${matched} exact, ${fuzzy} fuzzy, total: ${map.length}`);
  saveJSON(MAPPING_FILE, map);
  return map;
}

async function enrichBatch(items) {
  const results = [];
  for (const item of items) {
    try {
      const res = await axios.get(item.url, { headers: { 'User-Agent': UA }, timeout: 30000 });
      const html = res.data;
      const $ = cheerio.load(html);
      
      // LD+JSON
      let description = '', director = '', cast = [], duration = null;
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const json = JSON.parse($(el).html());
          if (json['@type'] === 'Movie') {
            description = (json.description || '').substring(0, 2000);
            if (json.director?.name) director = json.director.name;
            if (json.actor) cast = json.actor.map(a => a.name);
            if (json.duration) {
              const m = json.duration.match(/(\d+)/);
              if (m) duration = parseInt(m[1]);
            }
          }
        } catch {}
      });
      
      if (!description) description = $('.film-ozeti p').text().trim().substring(0, 2000);
      if (!director) {
        $('.film-info li').each((i, el) => {
          const t = $(el).text().trim();
          if (t.startsWith('Yönetmen')) director = t.replace('Yönetmen', '').trim();
        });
      }
      if (cast.length === 0) {
        $('.film-info li').each((i, el) => {
          const t = $(el).text().trim();
          if (t.startsWith('Oyuncular')) cast = t.replace('Oyuncular', '').split(',').map(s => s.trim()).filter(Boolean);
        });
      }
      if (!duration) {
        const d = $('.sure').text().trim();
        const m = d.match(/(\d+)/);
        if (m) duration = parseInt(m[1]);
      }
      
      // Video URLs
      const scx = extractScx(html);
      const videoUrls = scx ? extractUrls(scx) : [];
      
      results.push({
        contentId: item.contentId,
        description,
        director,
        cast,
        duration,
        videoUrls,
        success: true,
      });
    } catch (err) {
      results.push({ contentId: item.contentId, error: err.message, success: false });
    }
  }
  return results;
}

async function main() {
  console.log('=== Enrichment: Video URLs + Metadata ===');
  
  const map = await buildSlugMap();
  
  const progress = loadJSON(ENRICH_STATE, { done: [], errors: [] });
  const doneSet = new Set(progress.done);
  
  const pending = map.filter(m => !doneSet.has(m.contentId));
  console.log(`Pending: ${pending.length}/${map.length}`);
  
  let enriched = 0;
  let videoAdded = 0;
  let errors = 0;
  
  // Process in batches
  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);
    const results = await enrichBatch(batch);
    
    for (const r of results) {
      if (!r.success) {
        progress.errors.push(r.contentId);
        errors++;
        continue;
      }
      
      try {
        await prisma.content.update({
          where: { id: r.contentId },
          data: {
            description: r.description || undefined,
            director: r.director || undefined,
            cast: r.cast.length > 0 ? JSON.stringify(r.cast) : undefined,
            duration: r.duration || undefined,
          },
        });
        
        // Create Video records
        if (r.videoUrls.length > 0) {
          for (const vu of r.videoUrls) {
            await prisma.video.create({
              data: {
                contentId: r.contentId,
                url: vu,
                quality: 'HD',
                language: 'tr',
              },
            });
            videoAdded++;
          }
        }
        
        progress.done.push(r.contentId);
        enriched++;
      } catch (e) {
        progress.errors.push(r.contentId);
        errors++;
      }
    }
    
    if ((i + CONCURRENCY) % 50 === 0 || i + CONCURRENCY >= pending.length) {
      saveJSON(ENRICH_STATE, progress);
      const pct = (Math.min(i + CONCURRENCY, pending.length) / pending.length * 100).toFixed(1);
      console.log(`[${pct}%] Enriched: ${enriched} | Videos: ${videoAdded} | Errors: ${errors}`);
    }
    
    await sleep(100);
  }
  
  saveJSON(ENRICH_STATE, progress);
  
  console.log(`\n=== Done ===`);
  console.log(`Enriched: ${enriched} | Videos added: ${videoAdded} | Errors: ${errors}`);
  
  // Final count
  const totalVideos = await prisma.video.count();
  console.log(`Total videos in DB: ${totalVideos}`);
  
  await prisma.$disconnect();
}

main().catch(async err => {
  console.error('Fatal:', err);
  await prisma.$disconnect();
  process.exit(1);
});
