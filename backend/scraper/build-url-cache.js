const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE = 'https://www.fullhdfilmizlesene.life';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const MAX_PAGES = 1146;
const DELAY = 300;
const CACHE_FILE = path.join(__dirname, 'url-cache.json');
const STATE_FILE = path.join(__dirname, 'url-state.json');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function loadJSON(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } }
function saveJSON(f, d) { fs.writeFileSync(f, JSON.stringify(d, null, 2)); }

async function scrapePageUrls(page) {
  const url = page === 1 ? BASE : `${BASE}/yeni-filmler/${page}`;
  const res = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 30000 });
  const $ = cheerio.load(res.data);
  const items = [];
  $('li.film').each((i, el) => {
    const link = $(el).find('a.tt').attr('href');
    const turkishTitle = $(el).find('.film-title').text().trim() || $(el).find('a.tt').text().trim();
    const originalTitle = $(el).find('.kt').text().trim() || '';
    if (link && turkishTitle) items.push({ url: link, turkishTitle, originalTitle });
  });
  return items;
}

async function main() {
  console.log('=== URL Cache Builder ===');
  const cache = loadJSON(CACHE_FILE, []);
  const state = loadJSON(STATE_FILE, { lastPage: 0 });
  const existingUrls = new Set(cache.map(i => i.url));
  
  console.log(`Already have ${cache.length} URLs, resuming from page ${state.lastPage + 1}`);

  for (let page = state.lastPage + 1; page <= MAX_PAGES; page++) {
    try {
      const items = await scrapePageUrls(page);
      let added = 0;
      for (const item of items) {
        if (!existingUrls.has(item.url)) {
          cache.push(item);
          existingUrls.add(item.url);
          added++;
        }
      }
      state.lastPage = page;
      if (page % 50 === 0) {
        saveJSON(CACHE_FILE, cache);
        saveJSON(STATE_FILE, state);
        console.log(`Page ${page}/${MAX_PAGES}: +${added} (total: ${cache.length})`);
      }
      if (items.length === 0) { console.log(`Empty at page ${page}, stopping.`); break; }
      await sleep(DELAY);
    } catch (err) {
      console.error(`Page ${page}: ${err.message}, retrying`);
      await sleep(2000);
      page--;
    }
  }
  saveJSON(CACHE_FILE, cache);
  saveJSON(STATE_FILE, state);
  console.log(`\nDone. Total URLs: ${cache.length}`);
}

main().catch(console.error);
