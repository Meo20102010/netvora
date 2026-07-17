import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const BAD_DOMAINS = ['sobreatsesuyp.com', 'resim.hdmekani.com'];
const CACHE_FILE = path.join(__dirname, 'url-cache.json');
const STATE_FILE = path.join(__dirname, 'state.json');

function rtt(str) {
  return (str + '').replace(/[a-z]/gi, s => String.fromCharCode(s.charCodeAt(0) + (s.toLowerCase() < 'n' ? 13 : -13)));
}

function extractScx(html) {
  const patterns = [
    /var\s+scx\s*=\s*(\{[^;]+?\});/,
    /let\s+scx\s*=\s*(\{[^;]+?\});/,
    /window\.scx\s*=\s*(\{[^;]+?\});/,
    /scx\s*=\s*(\{[^;]+?\});/,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      try { return JSON.parse(m[1]); } catch {}
      try { const fixed = m[1].replace(/'/g, '"').replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); return JSON.parse(fixed); } catch {}
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

async function main() {
  const prisma = new PrismaClient();
  
  const videoCount = await prisma.video.count();
  console.log(`Current video count: ${videoCount}`);
  
  // Get all content without videos
  const noVideo = await prisma.content.findMany({
    where: { videos: { none: {} } },
    select: { id: true, slug: true, title: true, type: true },
  });
  console.log(`Contents without video: ${noVideo.length}`);
  
  // Load URL cache
  let urlCache = [];
  try { urlCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch {}
  const urlCacheSlugs = new Set(urlCache.map(u => u.slug));
  
  let processed = 0;
  let found = 0;
  let foundUrls = [];
  let errors = [];
  let skipReasons = { noScx: 0, noUrls: 0, page404: 0, fetchError: 0, noUrlsInScx: 0 };
  
  for (const content of noVideo) {
    const slug = content.slug;
    const contentType = content.type === 'SERIES' ? 'dizi' : 'film';
    const url = `https://www.fullhdfilmizlesene.life/${contentType}/${slug}/`;
    
    processed++;
    if (processed % 50 === 0) console.log(`Progress: ${processed}/${noVideo.length}, foundUrl: ${found}`);
    
    try {
      const res = await axios.get(url, { 
        headers: { 'User-Agent': UA }, 
        timeout: 20000,
        validateStatus: status => status < 500,
      });
      
      if (res.status === 404) {
        skipReasons.page404++;
        errors.push({ slug, reason: '404', detail: 'Page not found on source site' });
        continue;
      }
      if (res.status !== 200) {
        skipReasons.fetchError++;
        errors.push({ slug, reason: `http_${res.status}`, detail: `HTTP ${res.status}` });
        continue;
      }
      
      const scx = extractScx(res.data);
      
      if (!scx) {
        skipReasons.noScx++;
        errors.push({ slug, reason: 'no_scx', detail: 'scx variable not found in page' });
        continue;
      }
      
      const keys = Object.keys(scx);
      if (keys.length === 0) {
        skipReasons.noScx++;
        errors.push({ slug, reason: 'empty_scx', detail: 'scx = {} (empty object)' });
        continue;
      }
      
      const urls = extractUrls(scx);
      
      // Filter bad domains
      const goodUrls = urls.filter(u => BAD_DOMAINS.every(d => !u.includes(d)));
      
      if (goodUrls.length === 0) {
        if (urls.length > 0) {
          skipReasons.noUrls++;
          errors.push({ slug, reason: 'dead_domain', detail: `Decoded URLs from dead domains: ${urls.map(u => u.substring(0,50)).join(', ')}`, scxKeys: keys.join(',') });
        } else {
          skipReasons.noUrlsInScx++;
          errors.push({ slug, reason: 'no_urls_in_scx', detail: `scx keys: ${keys.join(', ')}` });
        }
        continue;
      }
      
      // Found working URLs!
      found++;
      foundUrls.push({ slug, urls: goodUrls, scxKey: keys.join(',') });
      console.log(`FOUND: ${slug} -> ${goodUrls[0].substring(0, 60)}`);
      
      // Add to URL cache
      urlCache.push({ slug, contentType, scxKeys: keys });
      
      // Insert all found URLs into DB
      for (const vu of goodUrls) {
        await prisma.video.create({
          data: { contentId: content.id, url: vu, quality: 'HD', language: 'Türkçe' },
        });
      }
      
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      skipReasons.fetchError++;
      errors.push({ slug, reason: 'fetch_error', detail: err.message.substring(0, 100) });
    }
  }
  
  // Save URL cache
  fs.writeFileSync(CACHE_FILE, JSON.stringify(urlCache, null, 2));
  
  console.log('\n========== RE-ENRICHMENT RESULTS ==========');
  console.log(`Processed: ${processed}`);
  console.log(`Found new videos: ${found}`);
  
  if (foundUrls.length > 0) {
    console.log('\n--- Newly found videos ---');
    foundUrls.forEach(f => console.log(`  ${f.slug}: ${f.urls.join(', ')}`));
  }
  
  console.log('\n--- Skip reasons ---');
  Object.entries(skipReasons).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  
  console.log('\n--- Error breakdown ---');
  const errReasons = {};
  errors.forEach(e => { errReasons[e.reason] = (errReasons[e.reason] || 0) + 1; });
  Object.entries(errReasons).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
  
  // Save errors for detailed analysis
  fs.writeFileSync(path.join(__dirname, 'reenrich-errors.json'), JSON.stringify(errors, null, 2));
  
  // Final DB stats
  const newVideoCount = await prisma.video.count();
  const newWithVideo = await prisma.content.count({ where: { videos: { some: {} } } });
  const newWithoutVideo = await prisma.content.count({ where: { videos: { none: {} } } });
  console.log(`\nFinal DB stats:`);
  console.log(`  Total contents: ${await prisma.content.count()}`);
  console.log(`  With video: ${newWithVideo}`);
  console.log(`  Without video: ${newWithoutVideo}`);
  console.log(`  Total videos: ${newVideoCount}`);
  
  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
