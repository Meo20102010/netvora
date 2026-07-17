const axios = require('axios');

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
          if (enc.startsWith('http')) {
            urls.push(enc);
            return;
          }
          const rot13d = rtt(enc);
          const dec = Buffer.from(rot13d, 'base64').toString('utf8');
          if (dec && dec.startsWith('http')) urls.push(dec);
        } catch {}
      });
    }
  }
  return urls;
}

// Test ALL slugs from the deep analysis + more random ones
const testSlugs = [
  // Known advid with working URLs
  'so-fades-the-light', 'neon-lights', 'mona-lisa-and-the-blood-moon', 'soror', 'angels-fallen-warriors-of-peace',
  // Known empty scx
  'apex-34xf', 'het-diner', 'plush', 'death-valley-wwu8', 'the-final-wish',
  // Random additional no-video slugs
  'kukla', 'basurman', 'tutsak-2', 'tehlikeli-adam', 'sarmal', 'umudunu-kaybetme',
  'casuslar-koyu', 'mutluluk-zamani', 'kara-gun-2', 'baskin',
  // Try series without videos
  'the-walking-dead', 'breaking-bad', 'game-of-thrones', 'friends', 'stranger-things',
  // Known working movies for comparison
  'hizli-ve-ofkeli-10', 'zirve-tutkusu',
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

(async () => {
  let totalWorking = 0;
  let totalEncodedWorking = 0;
  
  for (const slug of testSlugs) {
    // Try both film and dizi
    let url = `https://www.fullhdfilmizlesene.life/film/${slug}/`;
    let res;
    try {
      res = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 20000 });
    } catch {
      url = `https://www.fullhdfilmizlesene.life/dizi/${slug}/`;
      try {
        res = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 20000 });
      } catch(e) {
        console.log(`${slug}: FETCH ERROR ${e.message.substring(0,40)}`);
        continue;
      }
    }
    
    const scx = extractScx(res.data);
    if (!scx) { console.log(`${slug}: NO SCX`); continue; }
    
    const keys = Object.keys(scx);
    if (keys.length === 0) { console.log(`${slug}: EMPTY SCX`); continue; }
    
    const urls = extractUrls(scx);
    const working = urls.filter(u => !u.includes('sobreatsesuyp.com') && !u.includes('resim.hdmekani.com'));
    
    console.log(`${slug}: keys=${keys.join(',')} total=${urls.length} working=${working.length}`);
    
    if (working.length > 0) {
      totalWorking++;
      // Count how many from direct URL vs decoded
      const scxData = keys.reduce((acc, k) => { acc[k] = scx[k]; return acc; }, {});
      const scxStr = JSON.stringify(scxData);
      // Check if values were direct URLs or encoded
      const hasDirectUrls = urls.every(u => u.startsWith('http'));
      if (hasDirectUrls && urls.length > 0 && urls[0].startsWith('http')) {
        totalEncodedWorking++;
      }
    }
    
    await new Promise(r => setTimeout(r, 1500));
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total with working URLs: ${totalWorking}`);
  console.log(`Total with direct URL type: ${totalEncodedWorking}`);
})();
