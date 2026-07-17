const http = require('http');
const https = require('https');

function headReq(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(url, { method: 'HEAD', timeout: 10000 }, res => {
      resolve({ status: res.statusCode, headers: res.headers });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

async function main() {
  const tests = [
    { name: 'Big Buck Bunny (MP4)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
    { name: 'Sintel (MP4)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' },
    { name: 'Tears of Steel (MP4)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' },
    { name: 'Elephants Dream (MP4)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
  ];

  console.log('=== VIDEO URL TESTLERI ===\n');
  for (const t of tests) {
    try {
      const r = await headReq(t.url);
      const cors = r.headers['access-control-allow-origin'];
      const size = r.headers['content-length'];
      const type = r.headers['content-type'];
      const ok = r.status === 200 || r.status === 206;
      console.log(`${t.name}:`);
      console.log(`  Status: ${r.status} ${ok ? 'OK' : 'HATA'}`);
      console.log(`  CORS: ${cors || 'YOK!'}`);
      console.log(`  Boyut: ${size ? (parseInt(size) / 1024 / 1024).toFixed(1) + ' MB' : 'bilinmiyor'}`);
      console.log(`  Tip: ${type || 'bilinmiyor'}`);
    } catch (e) {
      console.log(`${t.name}: HATA - ${e.message}`);
    }
  }

  // Backend API test
  console.log('\n=== BACKEND API TEST ===');
  const getContent = (url) => new Promise((resolve, reject) => {
    http.get(url, { timeout: 5000 }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: d }));
    }).on('error', reject);
  });

  try {
    const r = await getContent('http://localhost:4000/api/content?limit=3&type=SERIES');
    const j = JSON.parse(r.data);
    console.log('API yaniti: ' + r.status + ' - ' + j.data.length + ' dizi');
    for (const c of j.data) {
      const d = await getContent('http://localhost:4000/api/content/' + c.id);
      const content = JSON.parse(d.data).data;
      const eps = content.seasons?.[0]?.episodes || [];
      const firstEp = eps[0];
      const vidUrl = firstEp?.videos?.[0]?.url || 'YOK';
      console.log(`  ${c.title}: S1E1=${firstEp?.title || '?'} | URL=${vidUrl.substring(0, 80)}`);
    }
  } catch (e) {
    console.log('API HATA: ' + e.message);
  }
}

main();
