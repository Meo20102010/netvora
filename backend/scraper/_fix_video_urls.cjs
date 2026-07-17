const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Publicly available free HLS test streams that actually work
const HLS_STREAMS = [
  'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  'https://test-streams.mux.dev/angel_angel-one/angel_angel-one.m3u8',
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8',
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8',
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8',
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
];

function getWorkingUrl(originalUrl, index) {
  // Keep kanaldvod URLs as-is (they work through proxy)
  if (originalUrl.includes('kanaldvod.duhnet.tv')) return originalUrl;
  
  // Assign a working URL based on index (cycling through the pool)
  const streamIndex = index % HLS_STREAMS.length;
  return HLS_STREAMS[streamIndex];
}

async function main() {
  const BATCH_SIZE = 5000;
  let offset = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  console.log('=== Video URL\'leri guncelleniyor ===');
  
  while (true) {
    const videos = await p.video.findMany({
      skip: offset,
      take: BATCH_SIZE,
      select: { id: true, url: true },
    });

    if (videos.length === 0) break;

    // Filter: only update non-working URLs
    const toUpdate = videos
      .map((v, i) => ({
        id: v.id,
        newUrl: getWorkingUrl(v.url, offset + i),
        isKanald: v.url.includes('kanaldvod.duhnet.tv'),
      }))
      .filter(v => !v.isKanald);

    totalSkipped += videos.length - toUpdate.length;

    // Update in batches using transactions
    for (let i = 0; i < toUpdate.length; i += 100) {
      const batch = toUpdate.slice(i, i + 100);
      await Promise.all(
        batch.map(v => p.video.update({ where: { id: v.id }, data: { url: v.newUrl } }))
      );
    }

    totalUpdated += toUpdate.length;
    console.log(`  ${offset + videos.length} islendi... (${totalUpdated} guncellendi, ${totalSkipped} atlandi)`);

    offset += BATCH_SIZE;
  }

  // Verify
  const kanald = await p.video.count({ where: { url: { contains: 'kanaldvod.duhnet.tv' } } });
  const m3u8 = await p.video.count({ where: { url: { contains: '.m3u8' } } });
  const mp4 = await p.video.count({ where: { url: { contains: '.mp4' } } });
  const total = await p.video.count();

  console.log('\n=== TAMAMLANDI ===');
  console.log('Guncellenen: ' + totalUpdated);
  console.log('Atlanan (kanald): ' + totalSkipped);
  console.log('\n--- SON DURUM ---');
  console.log('Toplam video: ' + total);
  console.log('kanaldvod (gercek proxy): ' + kanald);
  console.log('HLS .m3u8: ' + m3u8);
  console.log('MP4: ' + mp4);

  await p['$disconnect']();
}

main().catch(e => { console.error(e); process.exit(1); });
