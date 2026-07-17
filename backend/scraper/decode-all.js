const axios = require('axios');

function rtt(str) {
  return (str + '').replace(/[a-z]/gi, s => String.fromCharCode(s.charCodeAt(0) + (s.toLowerCase() < 'n' ? 13 : -13)));
}

const slug = 'kukla';
const url = `https://www.fullhdfilmizlesene.life/film/${slug}/`;

(async () => {
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 20000 });
  const m = res.data.match(/var\s+scx\s*=\s*(\{[^;]+?\});/);
  const scx = JSON.parse(m[1]);
  
  console.log('Decoding fastly.t[0]:');
  const enc1 = scx.fastly.sx.t[0];
  const rot1 = rtt(enc1);
  const dec1 = Buffer.from(rot1, 'base64').toString('utf8');
  console.log(`  Encoded: ${enc1.substring(0, 40)}...`);
  console.log(`  ROT13:   ${rot1.substring(0, 40)}...`);
  console.log(`  Decoded: ${dec1}`);
  
  console.log('\nDecoding proton.t[0]:');
  const enc2 = scx.proton.sx.t[0];
  const rot2 = rtt(enc2);
  const dec2 = Buffer.from(rot2, 'base64').toString('utf8');
  console.log(`  Encoded: ${enc2.substring(0, 40)}...`);
  console.log(`  ROT13:   ${rot2.substring(0, 40)}...`);
  console.log(`  Decoded: ${dec2}`);
  
  // Also decode all advid movies from deep analysis
  const advidTest = ['so-fades-the-light', 'neon-lights', 'mona-lisa-and-the-blood-moon', 'soror', 'angels-fallen-warriors-of-peace'];
  for (const slug2 of advidTest) {
    const url2 = `https://www.fullhdfilmizlesene.life/film/${slug2}/`;
    const res2 = await axios.get(url2, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 20000 });
    const m2 = res2.data.match(/var\s+scx\s*=\s*(\{[^;]+?\});/);
    if (!m2) { console.log(`${slug2}: no scx`); continue; }
    const scx2 = JSON.parse(m2[1]);
    
    if (scx2.advid && scx2.advid.sx && scx2.advid.sx.t) {
      const t = scx2.advid.sx.t;
      console.log(`\n${slug2} advid.sx.t values:`);
      for (const [lang, val] of Object.entries(t)) {
        console.log(`  ${lang}: "${String(val).substring(0, 60)}"`);
        if (typeof val === 'string' && val.startsWith('http')) {
          console.log(`    -> DIRECT URL`);
        } else if (typeof val === 'string') {
          const decoded = Buffer.from(rtt(val), 'base64').toString('utf8');
          console.log(`    -> DECODED: ${decoded.substring(0, 80)}`);
        }
      }
    }
    
    await new Promise(r => setTimeout(r, 1500));
  }
})();
