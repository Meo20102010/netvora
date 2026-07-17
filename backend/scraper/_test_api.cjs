const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, { timeout: 10000 }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function main() {
  // Test backend
  try {
    const r = await get('http://localhost:4000/api/content?limit=1&type=SERIES');
    const j = JSON.parse(r.data);
    console.log('Backend API: CALISIYOR (HTTP ' + r.status + ')');
    
    if (j.data && j.data[0]) {
      const id = j.data[0].id;
      const title = j.data[0].title;
      console.log('Dizi: ' + title);
      
      const d = await get('http://localhost:4000/api/content/' + id);
      const content = JSON.parse(d.data).data;
      if (content.seasons && content.seasons[0] && content.seasons[0].episodes[0]) {
        const ep = content.seasons[0].episodes[0];
        const vidUrl = ep.videos && ep.videos[0] ? ep.videos[0].url : 'YOK';
        console.log('  S1E1: ' + ep.title);
        console.log('  Video URL: ' + vidUrl);
      }
    }
  } catch(e) { console.log('Backend: HATA - ' + e.message); }
  
  // Test frontend
  try {
    const r = await get('http://localhost:3000');
    console.log('Frontend: CALISIYOR (HTTP ' + r.status + ')');
  } catch(e) { console.log('Frontend: HATA - ' + e.message); }

  // Test a video URL directly
  try {
    const testUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
    const r = await get(testUrl);
    console.log('HLS Test Stream: ' + (r.status === 200 ? 'CALISIYOR' : 'HATA ' + r.status));
  } catch(e) { console.log('HLS Test Stream: HATA - ' + e.message); }
}

main();
