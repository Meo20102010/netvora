const axios = require('axios');
const fs = require('fs');

function rtt(str) {
  return (str + '').replace(/[a-z]/gi, s => String.fromCharCode(s.charCodeAt(0) + (s.toLowerCase() < 'n' ? 13 : -13)));
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
      if (!arr) continue;
      arr.forEach((enc) => {
        if (!enc) return;
        try {
          const rot13d = rtt(enc);
          const dec = Buffer.from(rot13d, 'base64').toString('utf8');
          if (dec && dec.startsWith('http')) urls.push(dec);
        } catch {}
      });
    }
  }
  return urls;
}

async function main() {
  // Test first 5 movies from cache
  const cache = JSON.parse(fs.readFileSync('scraper/url-cache.json', 'utf8'));
  let found = 0;
  let total = 0;
  
  for (let i = 0; i < Math.min(20, cache.length); i++) {
    const item = cache[i];
    try {
      const res = await axios.get(item.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 });
      const scxMatch = res.data.match(/var\s+scx\s*=\s*(\{[\s\S]*?\});/);
      if (scxMatch) {
        const scx = JSON.parse(scxMatch[1]);
        const urls = extractUrls(scx);
        if (urls.length > 0) {
          found++;
          console.log(`[${i}] ${item.turkishTitle}: ${urls.length} URLs, first: ${urls[0].substring(0, 60)}`);
        } else {
          console.log(`[${i}] ${item.turkishTitle}: scx found but 0 URLs`);
        }
      } else {
        console.log(`[${i}] ${item.turkishTitle}: NO scx`);
      }
      total++;
    } catch(e) {
      console.log(`[${i}] ${item.turkishTitle}: ERROR ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log(`\nResults: ${found}/${total} have video URLs`);
}

main().catch(console.error);
