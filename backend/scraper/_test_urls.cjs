const https = require('https');
const http = require('http');

function testUrl(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const start = Date.now();
    const req = mod.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, res => {
      const elapsed = Date.now() - start;
      let size = 0;
      res.on('data', c => { size += c.length; if (size > 1024) { req.destroy(); } });
      res.on('end', () => resolve({ url: url.split('/').pop(), status: res.statusCode, type: res.headers['content-type'], cors: res.headers['access-control-allow-origin'], elapsed }));
      req.on('close', () => resolve({ url: url.split('/').pop(), status: res.statusCode, type: res.headers['content-type'], cors: res.headers['access-control-allow-origin'], elapsed, aborted: true }));
    });
    req.on('error', e => resolve({ url: url.split('/').pop(), status: 'ERR', error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ url: url.split('/').pop(), status: 'TIMEOUT' }); });
  });
}

async function main() {
  const urls = [
    'https://www.w3schools.com/html/movie.mp4',
    'https://www.w3schools.com/html/mov_bbb.mp4',
    'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://storage.googleapis.com/samples.github.com/video.mp4',
    'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720p_30s.mp4',
    'https://filesamples.com/samples/video/mp4/sample_960x400_ocean.mp4',
    'https://download.samplelib.com/mp4/sample-5s.mp4',
    'https://www.florinpatron.com/videos/BigBuckBunny.mp4',
    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    'https://mdn.github.io/learning-area/html/multimedia-and-embedding/video-and-audio-content/rabbit320.mp4',
    'https://s3.eu-central-1.amazonaws.com/nextcloud-solutions/video/big_buck_bunny.mp4',
  ];

  console.log('Testing video URLs...\n');
  for (const u of urls) {
    const r = await testUrl(u);
    const ok = r.status === 200 || r.status === 206 || r.status === 302 || r.status === 301;
    console.log(`${ok ? 'OK' : 'FAIL'} | ${r.status} | CORS=${r.cors || 'none'} | ${r.type || '?'} | ${r.elapsed || '?'}ms | ${r.url}`);
  }
}

main();
