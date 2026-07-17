const { chromium } = require('playwright');
const fs = require('fs');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const SLUG_MAP_FILE = require('path').join(__dirname, 'slug-map.json');
const NOVIDEO_LOG = require('path').join(__dirname, 'no-video-report.json');

let noVideoSlugs = [];

async function main() {
  // Load slugs that have no video
  const slugMap = JSON.parse(fs.readFileSync(SLUG_MAP_FILE, 'utf8'));
  const videoCounts = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'video-counts.json'), 'utf8'));
  
  // Also load enrichment progress to find contents without videos
  const enrichProgress = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'enrich-progress.json'), 'utf8'));
  const noVideo = enrichProgress.contents.filter(c => c.videoUrls === 0);
  console.log(`Total contents without video: ${noVideo.length}`);
  
  // Also check from enrichment results
  const noVideoSlugs = noVideo.map(c => c.slug);
  console.log(`Sample no-video slugs: ${noVideoSlugs.slice(0, 5).join(', ')}`);
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const results = [];
  const tested = new Set();
  const SAMPLE_SIZE = Math.min(50, noVideoSlugs.length);
  
  for (let i = 0; i < SAMPLE_SIZE; i++) {
    const slug = noVideoSlugs[i];
    if (tested.has(slug)) continue;
    tested.add(slug);
    
    const slugData = slugMap[slug];
    if (!slugData) continue;
    
    let contentType = slugData.contentType || 'film';
    const url = `https://www.fullhdfilmizlesene.life/${contentType}/${slug}/`;
    
    console.log(`\n[${i+1}/${SAMPLE_SIZE}] ${slug} -> ${url}`);
    
    const result = await analyzePage(browser, url, slug);
    results.push(result);
    
    // Save incrementally
    fs.writeFileSync(NOVIDEO_LOG, JSON.stringify(results, null, 2));
  }
  
  await browser.close();
  
  // Summary
  console.log('\n========== SUMMARY ==========');
  const withVideo = results.filter(r => r.foundVideos.length > 0);
  const withoutVideo = results.filter(r => r.foundVideos.length === 0);
  console.log(`Analyzed: ${results.length}`);
  console.log(`With video: ${withVideo.length}`);
  console.log(`Without video: ${withoutVideo.length}`);
  
  if (withVideo.length > 0) {
    console.log('\n--- Movies with found videos ---');
    withVideo.forEach(r => {
      console.log(`${r.slug}: ${r.foundVideos.join(', ')}`);
    });
  }
  
  // Failure reasons
  const reasons = {};
  withoutVideo.forEach(r => {
    const key = r.failureReason || 'unknown';
    reasons[key] = (reasons[key] || 0) + 1;
  });
  console.log('\n--- Failure reasons ---');
  Object.entries(reasons).sort((a,b) => b[1]-a[1]).forEach(([reason, count]) => {
    console.log(`  ${reason}: ${count}`);
  });
  
  // Save final
  fs.writeFileSync(NOVIDEO_LOG, JSON.stringify({ results, summary: { total: results.length, withVideo: withVideo.length, withoutVideo: withoutVideo.length, reasons } }, null, 2));
  console.log(`\nSaved to no-video-report.json`);
}

async function analyzePage(browser, url, slug) {
  const result = {
    slug,
    url,
    foundVideos: [],
    failureReason: null,
    scxFound: false,
    scxType: null,
    allNetworkUrls: [],
    allIframes: [],
    allScripts: [],
    decodedUrls: [],
    pageTitle: '',
    error: null,
  };
  
  const context = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1920, height: 1080 },
  });
  
  const page = await context.newPage();
  
  // Capture all network requests
  const networkUrls = [];
  const xhrUrls = [];
  
  page.on('request', request => {
    const reqUrl = request.url();
    const type = request.resourceType();
    if (type === 'xhr' || type === 'fetch' || reqUrl.includes('api') || reqUrl.includes('json') || reqUrl.includes('video') || reqUrl.includes('.php')) {
      xhrUrls.push({ url: reqUrl, type, method: request.method() });
    }
    networkUrls.push({ url: reqUrl, type });
  });
  
  // Capture console messages
  const consoleMsgs = [];
  page.on('console', msg => {
    consoleMsgs.push({ type: msg.type(), text: msg.text() });
  });
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000); // Wait for any dynamic JS to execute
    
    result.pageTitle = await page.title();
    result.allNetworkUrls = networkUrls;
    result.consoleMsgs = consoleMsgs;
    
    // Extract scx variable
    const scxResult = await page.evaluate(() => {
      // Try to find scx in window or as a global variable
      if (typeof scx !== 'undefined') {
        return { found: true, data: JSON.parse(JSON.stringify(scx)), source: 'global' };
      }
      // Search in all script tags
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const text = script.textContent || '';
        const match = text.match(/var\s+scx\s*=\s*(\{[\s\S]*?\});/);
        if (match) {
          try {
            const data = eval('(' + match[1] + ')');
            return { found: true, data: JSON.parse(JSON.stringify(data)), source: 'inline_script' };
          } catch {}
        }
      }
      return { found: false };
    });
    
    result.scxFound = scxResult.found;
    if (scxResult.found) {
      const keys = Object.keys(scxResult.data);
      result.scxType = keys.join(', ');
      
      // Extract all URLs from scx (any depth, any structure)
      const extracted = extractAllUrls(scxResult.data);
      result.decodedUrls = extracted;
      result.foundVideos = extracted.filter(u => u.startsWith('http'));
    }
    
    // Extract all iframes
    const iframes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('iframe')).map(f => ({
        src: f.src || f.getAttribute('src') || '',
        id: f.id,
        className: f.className,
      }));
    });
    result.allIframes = iframes;
    
    // Check all scripts for video URLs
    const scripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script')).map(s => ({
        src: s.src || '(inline)',
        textLength: (s.textContent || '').length,
      }));
    });
    result.allScripts = scripts;
    
    // Check all elements for data-* attributes
    const dataAttrs = await page.evaluate(() => {
      const results = [];
      const all = document.querySelectorAll('*');
      for (const el of all) {
        if (el.dataset && Object.keys(el.dataset).length > 0) {
          for (const [key, val] of Object.entries(el.dataset)) {
            if (val && (typeof val === 'string') && (val.includes('http') || val.includes('video') || val.includes('player'))) {
              results.push({ tag: el.tagName, key, val: val.substring(0, 100) });
            }
          }
        }
      }
      return results;
    });
    result.dataAttrs = dataAttrs;
    
    // Try to find ALL player/video related divs
    const playerDivs = await page.evaluate(() => {
      const results = [];
      // Look for common player containers
      const ids = ['player', 'video-player', 'video_player', 'videoPlayer', 'player-container', 'videoplayer', 'video'];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          results.push({ id, innerHTML: el.innerHTML.substring(0, 200) });
        }
      });
      // Look by class
      const classes = ['player', 'video-player', 'video_player', 'video', 'embed-responsive', 'embed-container'];
      classes.forEach(cls => {
        const els = document.querySelectorAll('.' + cls.replace(/\s+/g, '.'));
        if (els.length > 0) {
          results.push({ class: cls, count: els.length, firstHTML: els[0]?.innerHTML?.substring(0, 200) });
        }
      });
      return results;
    });
    result.playerDivs = playerDivs;
    
  } catch (err) {
    result.error = err.message.substring(0, 200);
    result.failureReason = err.message.includes('timeout') ? 'timeout' : err.message.includes('404') ? '404' : `error: ${err.message.substring(0, 100)}`;
  }
  
  await context.close();
  
  return result;
}

// Recursive URL extraction from any object structure
function extractAllUrls(obj, depth = 0, maxDepth = 10) {
  if (depth > maxDepth) return [];
  if (typeof obj === 'string') {
    // Check if it looks like an encoded URL or direct URL
    if (obj.startsWith('http')) return [obj];
    // Try ROT13 + base64 decode
    try {
      const rot13d = obj.replace(/[a-z]/gi, s => String.fromCharCode(s.charCodeAt(0) + (s.toLowerCase() < 'n' ? 13 : -13)));
      const dec = Buffer.from(rot13d, 'base64').toString('utf8');
      if (dec.startsWith('http')) return [dec];
    } catch {}
    return [];
  }
  if (Array.isArray(obj)) {
    return obj.flatMap(item => extractAllUrls(item, depth + 1, maxDepth));
  }
  if (obj && typeof obj === 'object') {
    return Object.values(obj).flatMap(val => extractAllUrls(val, depth + 1, maxDepth));
  }
  return [];
}

main().catch(console.error);
