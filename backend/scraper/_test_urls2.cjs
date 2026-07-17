const https = require('https');

function testUrl(url) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = https.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, res => {
      let size = 0;
      res.on('data', c => { size += c.length; if (size > 2048) req.destroy(); });
      res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], cors: res.headers['access-control-allow-origin'], cache: res.headers['cache-control'], elapsed: Date.now() - start }));
      req.on('close', () => resolve({ status: res.statusCode, type: res.headers['content-type'], cors: res.headers['access-control-allow-origin'], elapsed: Date.now() - start, partial: true }));
    });
    req.on('error', e => resolve({ status: 'ERR', error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT' }); });
  });
}

async function main() {
  const urls = [
    'https://placeholdervideo.dev/1920x1080',
    'https://placeholdervideo.dev/1280x720',
    'https://placeholdervideo.dev/640x360',
    'https://placeholdervideo.dev/854x480',
    'https://placeholdervideo.dev/1080x1920',
  ];

  console.log('=== PLACEHOLDERVIDEO.DEV TEST ===\n');
  for (const u of urls) {
    const r = await testUrl(u);
    console.log(`${r.status === 200 ? 'OK' : 'FAIL'} | ${r.status} | CORS=${r.cors || 'none'} | ${r.type || '?'} | ${r.elapsed}ms | ${u.split('/').pop()}`);
  }

  // Also test with query params to get unique URLs
  console.log('\n=== QUERY PARAM TEST ===');
  for (let i = 0; i < 3; i++) {
    const u = `https://placeholdervideo.dev/1280x720?t=${i}`;
    const r = await testUrl(u);
    console.log(`${r.status === 200 ? 'OK' : 'FAIL'} | ${r.status} | ${r.elapsed}ms | t=${i}`);
  }

  // Test samplelib redirect
  console.log('\n=== SAMPLELIB REDIRECT ===');
  const r = await testUrl('https://download.samplelib.com/mp4/sample-5s.mp4');
  console.log(JSON.stringify(r));
}

main();
