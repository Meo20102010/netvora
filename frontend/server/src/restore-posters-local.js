const axios = require('axios');

const BASE = 'https://netvora-green.vercel.app/api';
const SOURCE = 'https://www.fullhdfilmizlesene.nz';
const BATCH_SIZE = 50; // items per page batch
const POST_BATCH_SIZE = 50; // items per API call
const DELAY_MS = 500;

const credentials = {
  email: 'ibrahimseleme0@gmail.com',
  password: 'Meo20102010',
};

let authToken = null;

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const data = await res.json();
  if (!data.success) throw new Error('Login failed: ' + JSON.stringify(data));
  authToken = data.data.token;
}

async function apiPost(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`${path} failed: ${JSON.stringify(data)}`);
  return data.data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 20000,
      });
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      return res.data;
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
  throw new Error('unreachable');
}

function extractPosterUrl(srcset) {
  // Prefer large JPG from img data-srcset; fallback to webp source srcset
  let lgMatch = srcset.match(/(https:\/\/img\.fullhdfilmizlesene\.nz\/poster\/film-lg\/[^\s,]+\.jpg)/);
  if (lgMatch) return lgMatch[1];
  lgMatch = srcset.match(/(https:\/\/img\.fullhdfilmizlesene\.nz\/poster\/film-lg\/[^\s,]+\.webp)/);
  if (lgMatch) return lgMatch[1];
  return null;
}

function extractListItems(html) {
  const items = [];
  // Match both <li class="film"> and <div class="film"> blocks
  const blockRegex = /<(?:li|div) class="film">[\s\S]*?<\/(?:li|div)>/g;
  let m;
  while ((m = blockRegex.exec(html)) !== null) {
    const block = m[0];
    const urlMatch = block.match(/<a class="tt" href="(https:\/\/www\.fullhdfilmizlesene\.nz\/film\/[^"]+)"/);
    const titleMatch = block.match(/<h2 class="film-tt"><span class="film-title">([^<]+)<\/span>/);
    // Try img data-srcset first (contains JPGs), then source data-srcset (webp)
    const imgSrcsetMatch = block.match(/<img[^>]*data-srcset="([^"]+)"/);
    const srcsetMatch = imgSrcsetMatch || block.match(/<source data-srcset="([^"]+)"/);
    if (!urlMatch || !titleMatch || !srcsetMatch) continue;
    const posterUrl = extractPosterUrl(srcsetMatch[1]);
    if (!posterUrl) continue;
    items.push({
      title: titleMatch[1].trim(),
      sourceUrl: urlMatch[1],
      posterUrl,
    });
  }
  return items;
}

async function processPages(startPage, endPage) {
  let totalItems = 0;
  let totalRestored = 0;
  let totalNotFound = 0;
  let pending = [];

  for (let page = startPage; page <= endPage; page++) {
    const url = page === 1 ? `${SOURCE}/` : `${SOURCE}/yeni-filmler/${page}`;
    try {
      const html = await fetchHtml(url);
      const items = extractListItems(html);
      if (items.length === 0) {
        console.log(`⚠️ Page ${page}: 0 items`);
        continue;
      }
      console.log(`📄 Page ${page}: ${items.length} items`);
      pending.push(...items);
      totalItems += items.length;

      while (pending.length >= POST_BATCH_SIZE) {
        const batch = pending.splice(0, POST_BATCH_SIZE);
        const result = await apiPost('/admin/validate/restore-posters-bulk', { items: batch });
        totalRestored += result.restored;
        totalNotFound += result.notFound;
        console.log(`  ➡️ posted ${batch.length} -> restored ${result.restored}, notFound ${result.notFound} (totals restored ${totalRestored}, notFound ${totalNotFound})`);
        await sleep(DELAY_MS);
      }
    } catch (err) {
      console.log(`  ❌ Page ${page} error: ${err.message}`);
    }
  }

  // flush remaining
  while (pending.length > 0) {
    const batch = pending.splice(0, POST_BATCH_SIZE);
    const result = await apiPost('/admin/validate/restore-posters-bulk', { items: batch });
    totalRestored += result.restored;
    totalNotFound += result.notFound;
    console.log(`  ➡️ posted ${batch.length} -> restored ${result.restored}, notFound ${result.notFound}`);
    await sleep(DELAY_MS);
  }

  console.log(`\n✅ Done. Items scraped: ${totalItems}, Restored: ${totalRestored}, Not found: ${totalNotFound}`);
}

async function main() {
  const args = process.argv.slice(2);
  const startPage = parseInt(args[0]) || 1;
  const endPage = parseInt(args[1]) || 1149;
  console.log('🔑 Logging in...');
  await login();
  console.log('✅ Logged in.');
  await processPages(startPage, endPage);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
