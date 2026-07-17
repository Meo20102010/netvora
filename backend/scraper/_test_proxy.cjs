const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    http.get(url, { timeout: 15000 }, res => {
      let size = 0;
      res.on('data', c => { size += c.length; if (size > 4096) res.destroy(); });
      res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], cors: res.headers['access-control-allow-origin'], size, time: Date.now() - start }));
      res.on('close', () => resolve({ status: res.statusCode, type: res.headers['content-type'], size, time: Date.now() - start, partial: true }));
    }).on('error', e => reject(e));
  });
}

async function main() {
  console.log('=== PROXY TEST ===\n');

  // Test 1: Backend proxy ext
  try {
    const url = 'http://localhost:4000/api/proxy/ext?url=' + encodeURIComponent('https://www.w3schools.com/html/movie.mp4');
    const r = await get(url);
    console.log('Backend proxy: ' + r.status + ' | ' + r.type + ' | CORS=' + r.cors + ' | ' + r.time + 'ms');
  } catch (e) { console.log('Backend proxy: ERR ' + e.message); }

  // Test 2: Frontend proxy (Next.js rewrites)
  try {
    const url = 'http://localhost:3000/api/proxy/ext?url=' + encodeURIComponent('https://www.w3schools.com/html/movie.mp4');
    const r = await get(url);
    console.log('Frontend proxy: ' + r.status + ' | ' + r.type + ' | CORS=' + r.cors + ' | ' + r.time + 'ms');
  } catch (e) { console.log('Frontend proxy: ERR ' + e.message); }

  // Test 3: API content
  try {
    const r = await get('http://localhost:4000/api/content?limit=2&type=SERIES');
    let d = '';
    const req = http.get('http://localhost:4000/api/content?limit=2&type=SERIES', { timeout: 5000 }, res => {
      res.on('data', c => d += c);
      res.on('end', () => {
        const j = JSON.parse(d);
        for (const c of j.data) {
          console.log('\nSerie: ' + c.title + ' (slug: ' + c.slug + ')');
        }
      });
    });
  } catch (e) { console.log('API: ERR ' + e.message); }

  // Test 4: Content detail with videos
  try {
    let d = '';
    const req = http.get('http://localhost:4000/api/content?limit=1&type=SERIES', { timeout: 5000 }, res => {
      res.on('data', c => d += c);
      res.on('end', async () => {
        const j = JSON.parse(d);
        const id = j.data[0].id;
        let d2 = '';
        const req2 = http.get('http://localhost:4000/api/content/' + id, { timeout: 5000 }, res2 => {
          res2.on('data', c => d2 += c);
          res2.on('end', () => {
            const c = JSON.parse(d2).data;
            const eps = c.seasons?.[0]?.episodes || [];
            if (eps[0]?.videos?.[0]) {
              console.log('Video URL: ' + eps[0].videos[0].url);
              const proxyUrl = '/api/proxy/ext?url=' + encodeURIComponent(eps[0].videos[0].url);
              console.log('Proxy URL: ' + proxyUrl);
            } else {
              console.log('No video found!');
            }
          });
        });
      });
    });
  } catch (e) { console.log('Detail: ERR ' + e.message); }
}

main();
