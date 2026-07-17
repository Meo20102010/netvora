const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, { timeout: 10000 }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: null }); }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== KAPSAMLI TEST ===\n');

  // Test 1: Content listing
  const r1 = await get('http://localhost:4000/api/content?limit=10&type=SERIES');
  console.log('1. Dizi listesi: ' + r1.status + ' - ' + r1.data?.data?.length + ' dizi');
  console.log('   Toplam: ' + r1.data?.pagination?.total);

  // Test 2: Content detail
  if (r1.data?.data?.length > 0) {
    const firstId = r1.data.data[0].id;
    const r2 = await get('http://localhost:4000/api/content/' + firstId);
    const detail = r2.data?.data;
    const eps = detail?.seasons?.[0]?.episodes || [];
    console.log('\n2. Detay: ' + detail?.title + ' - ' + eps.length + ' bolum (Sezon 1)');
    if (eps[0]?.videos?.[0]) {
      console.log('   Video URL: ' + eps[0].videos[0].url.substring(0, 60) + '...');
      // Test video proxy
      const proxyUrl = 'http://localhost:4000/api/proxy/ext?url=' + encodeURIComponent(eps[0].videos[0].url);
      const r3 = await get(proxyUrl);
      console.log('   Video proxy: ' + r3.status);
    }
  }

  // Test 3: Multiple series
  const r4 = await get('http://localhost:4000/api/content?limit=5&type=SERIES&offset=0');
  console.log('\n3. Seri 1-5:');
  for (const s of r4.data?.data || []) {
    console.log('   ' + s.title + ' (' + s.slug + ')');
  }

  // Test 4: Search
  const r5 = await get('http://localhost:4000/api/content?search=çukur&limit=5');
  console.log('\n4. Arama "çukur": ' + (r5.data?.data?.length || 0) + ' sonuc');
  for (const s of r5.data?.data || []) console.log('   ' + s.title);

  // Test 5: Kanald scraped series
  const KANALD_SLUGS = ['arka-sokaklar', 'uzak-sehir', 'esref-ruya', 'inci-taneleri', 'kuzeyguney', 'poyraz-karayel'];
  console.log('\n5. Kanald dizileri:');
  for (const slug of KANALD_SLUGS) {
    try {
      const r = await get('http://localhost:4000/api/content?search=' + encodeURIComponent(slug.replace(/-/g, ' ')) + '&limit=1');
      const s = r.data?.data?.[0];
      if (s) {
        const d = await get('http://localhost:4000/api/content/' + s.id);
        const detail = d.data?.data;
        const totalEps = detail?.seasons?.reduce((sum, sn) => sum + (sn.episodes?.length || 0), 0) || 0;
        console.log('   ' + detail.title + ': ' + totalEps + ' bolum, poster=' + (detail.posterUrl ? 'var' : 'yok'));
      } else {
        console.log('   ' + slug + ': BULUNAMADI');
      }
    } catch (e) { console.log('   ' + slug + ': HATA ' + e.message); }
  }

  // Test 6: Frontend
  try {
    const r6 = await get('http://localhost:3000/');
    console.log('\n6. Frontend: ' + r6.status);
  } catch (e) { console.log('\n6. Frontend: HATA ' + e.message); }

  // Test 7: Watch page
  if (r1.data?.data?.length > 0) {
    try {
      const r7 = await get('http://localhost:3000/watch/' + r1.data.data[0].id);
      console.log('7. Watch sayfasi: ' + r7.status);
    } catch (e) { console.log('7. Watch sayfasi: HATA ' + e.message); }
  }

  console.log('\n=== TEST BITTI ===');
}

main().catch(e => console.error(e));
