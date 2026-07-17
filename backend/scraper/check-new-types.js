const axios = require('axios');

function rtt(str) {
  return (str + '').replace(/[a-z]/gi, s => String.fromCharCode(s.charCodeAt(0) + (s.toLowerCase() < 'n' ? 13 : -13)));
}

function extractScx(html) {
  const m = html.match(/var\s+scx\s*=\s*(\{[^;]+?\});/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch {}
  try { const fixed = m[1].replace(/'/g, '"').replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); return JSON.parse(fixed); } catch {}
  return null;
}

// Also test what kukla gives
(async () => {
  const slug = 'kukla';
  const url = `https://www.fullhdfilmizlesene.life/film/${slug}/`;
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 20000 });
  const scx = extractScx(res.data);
  console.log('Full scx:', JSON.stringify(scx, null, 2));
  
  // Also test so-fades-the-light for full structure  
  const res2 = await axios.get('https://www.fullhdfilmizlesene.life/film/so-fades-the-light/', 
    { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 20000 });
  const scx2 = extractScx(res2.data);
  console.log('\nso-fades-the-light scx:', JSON.stringify(scx2, null, 2));
  
  // Test angels-fallen
  const res3 = await axios.get('https://www.fullhdfilmizlesene.life/film/angels-fallen-warriors-of-peace/', 
    { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 20000 });
  const scx3 = extractScx(res3.data);
  console.log('\nangels-fallen scx:', JSON.stringify(scx3, null, 2));
})();
