const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const NO_VIDEO_SLUGS = [
  'apex-34xf',
  'het-diner',
  'plush',
  'so-fades-the-light',
  'neon-lights',
  'death-valley-wwu8',
  'mona-lisa-and-the-blood-moon',
  'the-final-wish',
  'soror',
  'angels-fallen-warriors-of-peace',
];

const BAD_DOMAINS = ['sobreatsesuyp.com', 'resim.hdmekani.com'];

function rtt(str) {
  return (str + '').replace(/[a-z]/gi, s => String.fromCharCode(s.charCodeAt(0) + (s.toLowerCase() < 'n' ? 13 : -13)));
}

function rot13base64Decode(str) {
  try {
    const rot13d = rtt(str);
    const dec = Buffer.from(rot13d, 'base64').toString('utf8');
    if (dec && dec.startsWith('http')) return dec;
  } catch {}
  return null;
}

async function deepAnalyzePage(browser, url, slug) {
  console.log(`\n========== ${slug} ==========`);
  console.log(`URL: ${url}`);
  
  const result = {
    slug,
    url,
    pageTitle: '',
    scxFound: false,
    scxKeys: [],
    scxUrls: [],
    scxRaw: null,
    allNetworkXHR: [],
    iframes: [],
    dataAttrs: [],
    playerDivs: [],
    allInlineScripts: [],
    allExternalScripts: [],
    consoleErrors: [],
    discoveredUrls: [],
    failureReason: null,
  };
  
  const context = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();
  
  // Track all XHR/Fetch requests
  const xhrLogs = [];
  page.on('request', req => {
    if (['xhr', 'fetch'].includes(req.resourceType()) || req.url().includes('api') || req.url().includes('json') || req.url().includes('.php')) {
      xhrLogs.push({ url: req.url(), method: req.method(), type: req.resourceType(), headers: req.headers() });
    }
  });
  
  // Track network responses
  const responseLogs = [];
  page.on('response', resp => {
    const ct = resp.headers()['content-type'] || '';
    if (ct.includes('json') || ct.includes('javascript') || ct.includes('html')) {
      responseLogs.push({ url: resp.url(), status: resp.status(), contentType: ct });
    }
  });
  
  // Track console errors
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      result.consoleErrors.push({ type: msg.type(), text: msg.text().substring(0, 200) });
    }
  });
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(8000); // Extra wait for dynamic content
    
    result.pageTitle = await page.title();
    result.allNetworkXHR = xhrLogs;
    result.allNetworkResponses = responseLogs;
    
    // 1. Extract scx variable using multiple strategies
    const scxData = await page.evaluate(() => {
      const result = { found: false, global: null, inline: null, inScripts: [] };
      
      // Check window.scx
      if (typeof scx !== 'undefined') {
        try { result.global = JSON.parse(JSON.stringify(scx)); result.found = true; } catch{}
      }
      
      // Check all script tags for scx
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const text = script.textContent || '';
        // Pattern 1: var scx = {...};
        const m1 = text.match(/var\s+scx\s*=\s*(\{[\s\S]*?\});/);
        if (m1) {
          try { result.inline = JSON.parse(m1[1]); result.found = true; result.source = 'var'; } catch{}
        }
        // Pattern 2: let scx = {...};
        const m2 = text.match(/let\s+scx\s*=\s*(\{[\s\S]*?\});/);
        if (m2 && !result.found) {
          try { result.inline = JSON.parse(m2[1]); result.found = true; result.source = 'let'; } catch{}
        }
        // Pattern 3: window.scx = {...};
        const m3 = text.match(/window\.scx\s*=\s*(\{[\s\S]*?\});/);
        if (m3 && !result.found) {
          try { result.inline = JSON.parse(m3[1]); result.found = true; result.source = 'window.scx'; } catch{}
        }
        
        // Collect ALL encoded/obfuscated-looking strings in scripts
        const encoded = text.match(/['"]([A-Za-z0-9+/=]{40,})['"]/g);
        if (encoded) {
          result.inScripts.push(...encoded.slice(0, 20));
        }
      }
      return result;
    });
    
    result.scxFound = scxData.found;
    result.scxGlobal = scxData.global;
    result.scxInline = scxData.inline;
    result.scxEncodedStrings = scxData.inScripts;
    
    // If scx found, extract ALL URLs from it
    if (scxData.found) {
      const scx = scxData.global || scxData.inline;
      if (scx) {
        result.scxKeys = Object.keys(scx);
        
        // Deep analysis of scx structure
        for (const [key, val] of Object.entries(scx)) {
          console.log(`  scx.${key}: type=${typeof val}, keys=${val ? Object.keys(val).join(',') : 'null'}`);
          
          if (val && val.sx) {
            console.log(`    sx keys: ${Object.keys(val.sx).join(', ')}`);
            for (const [sxKey, sxVal] of Object.entries(val.sx)) {
              console.log(`    sx.${sxKey}: ${JSON.stringify(sxVal).substring(0, 100)}`);
              
              // Try extracting URLs
              const urls = extractAllUrls(sxVal);
              if (urls.length > 0) {
                console.log(`    -> Found URLs: ${urls.join(', ')}`);
                result.scxUrls.push(...urls);
              }
            }
          }
        }
      }
    }
    
    // 2. Extract all iframes (including dynamically created ones)
    result.iframes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('iframe')).map(f => ({
        src: f.src || f.getAttribute('src') || '',
        srcdoc: (f.getAttribute('srcdoc') || '').substring(0, 100),
        id: f.id,
        className: f.className,
        style: f.getAttribute('style') || '',
        width: f.getAttribute('width') || '',
        height: f.getAttribute('height') || '',
      }));
    });
    
    console.log(`  Iframes found: ${result.iframes.length}`);
    result.iframes.forEach(f => {
      if (f.src) console.log(`    ${f.src.substring(0, 80)}`);
    });
    
    // 3. Check all data-* attributes that might contain video URLs
    result.dataAttrs = await page.evaluate(() => {
      const results = [];
      const allElements = document.querySelectorAll('*');
      const videoKeywords = ['video', 'player', 'src', 'url', 'source', 'stream', 'embed', 'iframe', 'data', 'movie', 'film'];
      for (const el of allElements) {
        if (el.dataset && Object.keys(el.dataset).length > 0) {
          for (const [key, val] of Object.entries(el.dataset)) {
            if (val && typeof val === 'string' && val.length > 5) {
              const lower = val.toLowerCase();
              if (videoKeywords.some(k => lower.includes(k)) || lower.startsWith('http')) {
                results.push({ tag: el.tagName, id: el.id, class: el.className.substring(0, 40), key, val: val.substring(0, 120) });
              }
            }
          }
        }
      }
      return results;
    });
    
    // 4. Look for player container elements
    result.playerDivs = await page.evaluate(() => {
      const results = [];
      const selectors = [
        '#player', '#videoPlayer', '#video-player', '#video_player', '#videoplayer', '#player-container',
        '.player', '.video-player', '.video_player', '.videoplayer', '.embed-responsive', '.video-container',
        '.playexr', '.playexr-player', '#playexr', '.video-js', '.jwplayer', '.flowplayer',
        '[id*=player]', '[id*=Player]', '[id*=video]', '[class*=player]', '[class*=Player]', '[class*=video]',
      ];
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          results.push({
            selector: sel,
            count: els.length,
            html: els[0].innerHTML.substring(0, 300),
            tag: els[0].tagName,
            id: els[0].id,
            className: els[0].className,
          });
        }
      }
      return results;
    });
    
    // 5. Check all script tags for any video URLs or encoded data
    result.allExternalScripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script[src]')).map(s => ({ src: s.src }));
    });
    
    result.allInlineScripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script:not([src])')).map(s => {
        const text = s.textContent || '';
        return {
          textLength: text.length,
          preview: text.substring(0, 200),
          hasScx: text.includes('scx') ? 'yes' : 'no',
          hasVideo: text.includes('video') || text.includes('player') || text.includes('iframe') ? 'yes' : 'no',
          hasBase64: text.match(/[A-Za-z0-9+/=]{40,}/) ? 'yes' : 'no',
        };
      });
    });
    
    // 6. Try to find dynamically created iframes/videos by evaluating after a delay
    await page.waitForTimeout(3000);
    const dynamicIframes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('iframe')).map(f => f.src || f.getAttribute('src') || '');
    });
    const newIframes = dynamicIframes.filter(s => !result.iframes.find(f => f.src === s));
    result.dynamicIframes = newIframes;
    
    // 7. Look for any element with onclick or onload that might create a video player
    result.eventHandlers = await page.evaluate(() => {
      const results = [];
      const els = document.querySelectorAll('[onclick*="play"],[onclick*="video"],[onclick*="player"],[onload*="video"],[onload*="player"]');
      els.forEach(el => {
        results.push({
          tag: el.tagName,
          id: el.id,
          onclick: el.getAttribute('onclick')?.substring(0, 100) || '',
          onload: el.getAttribute('onload')?.substring(0, 100) || '',
        });
      });
      return results;
    });
    
    // 8. Check the full HTML body for video-related HTML comments
    result.bodyHTML = await page.evaluate(() => {
      // Check 10 most relevant parts of the body
      const parts = [];
      const body = document.body;
      if (body) parts.push(body.innerHTML.substring(0, 500));
      return parts;
    });
    
    console.log(`  Player divs: ${result.playerDivs.length}`);
    console.log(`  Data attrs: ${result.dataAttrs.length}`);
    console.log(`  Inline scripts with base64: ${result.allInlineScripts.filter(s => s.hasBase64 === 'yes').length}`);
    console.log(`  XHR/Fetch requests: ${xhrLogs.length}`);
    console.log(`  scx found: ${result.scxFound}, scx keys: ${result.scxKeys.join(', ') || 'none'}`);
    console.log(`  scx URLs found: ${result.scxUrls.length}`);
    
  } catch (err) {
    console.log(`  ERROR: ${err.message.substring(0, 150)}`);
    result.failureReason = err.message.substring(0, 150);
  }
  
  await context.close();
  return result;
}

// Recursive URL extraction from any structure
function extractAllUrls(obj, depth = 0, maxDepth = 15) {
  if (depth > maxDepth) return [];
  
  // String: try direct URL or ROT13+Base64 decode
  if (typeof obj === 'string') {
    if (obj.startsWith('http')) return [obj];
    const dec = rot13base64Decode(obj);
    return dec ? [dec] : [];
  }
  
  // Array: recurse on each element
  if (Array.isArray(obj)) {
    return obj.flatMap(item => extractAllUrls(item, depth + 1, maxDepth));
  }
  
  // Object: recurse on each value
  if (obj && typeof obj === 'object') {
    return Object.values(obj).flatMap(val => extractAllUrls(val, depth + 1, maxDepth));
  }
  
  return [];
}

async function main() {
  const browser = await chromium.launch({
    channel: 'chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });
  
  const allResults = [];
  
  for (let i = 0; i < NO_VIDEO_SLUGS.length; i++) {
    const slug = NO_VIDEO_SLUGS[i];
    const url = `https://www.fullhdfilmizlesene.life/film/${slug}/`;
    
    const result = await deepAnalyzePage(browser, url, slug);
    allResults.push(result);
    
    // Save incrementally
    fs.writeFileSync(path.join(__dirname, 'deep-analysis.json'), JSON.stringify(allResults, null, 2));
    
    // Brief delay between requests
    await new Promise(r => setTimeout(r, 3000));
  }
  
  await browser.close();
  
  // Final summary
  console.log('\n\n========== FINAL SUMMARY ==========');
  console.log(`Analyzed: ${allResults.length}`);
  
  const withAnyUrls = allResults.filter(r => r.scxUrls.length > 0 || r.iframes.some(f => f.src.startsWith('http')));
  const withWorkingUrls = allResults.filter(r => r.scxUrls.some(u => BAD_DOMAINS.every(d => !u.includes(d))));
  
  console.log(`With any scx URLs: ${allResults.filter(r => r.scxUrls.length > 0).length}`);
  console.log(`With non-sobreatsesuyp URLs: ${withWorkingUrls.length}`);
  
  if (withWorkingUrls.length > 0) {
    console.log('\n=== WORKING URLS FOUND! ===');
    withWorkingUrls.forEach(r => {
      console.log(`\n${r.slug}:`);
      r.scxUrls.filter(u => BAD_DOMAINS.every(d => !u.includes(d))).forEach(u => console.log(`  ${u}`));
    });
  }
  
  // Save final
  fs.writeFileSync(path.join(__dirname, 'deep-analysis.json'), JSON.stringify(allResults, null, 2));
}

main().catch(console.error);
