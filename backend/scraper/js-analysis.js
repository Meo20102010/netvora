const axios = require('axios');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

(async () => {
  const slug = 'neon-lights';
  const url = `https://www.fullhdfilmizlesene.life/film/${slug}/`;
  const res = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 20000 });
  const html = res.data;
  
  // Find ALL inline scripts related to video
  const scripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
  
  for (const script of scripts) {
    const text = script.replace(/<\/?script[^>]*>/gi, '');
    
    // Look for scripts that contain: scx, player, video, iframe, turbo, imgz
    if (text.includes('scx') || text.includes('turbo') || text.includes('imgz') || text.includes('trplayer') || text.includes('player')) {
      console.log(`\n=== Script (${text.length} chars) ===`);
      console.log(text.substring(0, 2000));
      console.log(`... [${text.length} chars total]`);
      if (text.length > 2000) console.log('(...truncated)');
    }
  }
  
  // Also look for specific patterns
  const patterns = [
    { name: 'scx rewrite', pat: /scx\s*=\s*/ },
    { name: 'turbo.imgz', pat: /turbo\.imgz/ },
    { name: 'trplayer', pat: /trplayer/ },
    { name: 'advid', pat: /advid/ },
    { name: 'sobreatsesuyp', pat: /sobreatsesuyp/ },
  ];
  
  console.log('\n=== Pattern matches in full HTML ===');
  for (const {name, pat} of patterns) {
    const matches = html.match(new RegExp(`.{0,100}${pat.source}.{0,100}`, 'gi'));
    if (matches) {
      console.log(`\n${name}: ${matches.length} matches`);
      matches.slice(0, 3).forEach(m => console.log(`  ${m.substring(0, 200)}`));
    }
  }
  
  // Save the full HTML for analysis
  require('fs').writeFileSync(`page-${slug}.html`, html);
  console.log(`\nFull HTML saved to page-${slug}.html`);
  
  // Also check external scripts
  const scriptSrcs = [...html.matchAll(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
  console.log(`\nExternal scripts: ${scriptSrcs.length}`);
  scriptSrcs.slice(0, 10).forEach(s => console.log(`  ${s}`));
})();
