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

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const testSlugs = [
  'so-fades-the-light',
  'neon-lights',
  'mona-lisa-and-the-blood-moon',
  'soror',
  'angels-fallen-warriors-of-peace',
  'apex-34xf',
  'het-diner',
  'plush',
  // Add one that we know works with atom type
  'hizli-ve-ofkeli-10',
];

(async () => {
  for (const slug of testSlugs) {
    const url = `https://www.fullhdfilmizlesene.life/film/${slug}/`;
    try {
      const res = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 20000 });
      const scx = extractScx(res.data);
      if (!scx) { console.log(`${slug}: NO SCX`); continue; }
      const keys = Object.keys(scx);
      const urls = extractUrls(scx);
      const goodUrls = urls.filter(u => !['sobreatsesuyp.com','resim.hdmekani.com'].every(d => !u.includes(d)) || !u.includes('sobreatsesuyp.com'));
      const working = urls.filter(u => !u.includes('sobreatsesuyp.com') && !u.includes('resim.hdmekani.com'));
      console.log(`${slug}: keys=${keys.join(',')} total=${urls.length} working=${working.length}`);
      if (working.length > 0) {
        working.forEach(u => console.log(`  -> ${u.substring(0,70)}`));
      }
      await new Promise(r => setTimeout(r, 1000));
    } catch(e) {
      console.log(`${slug}: ERROR ${e.message.substring(0,50)}`);
    }
  }
})();
