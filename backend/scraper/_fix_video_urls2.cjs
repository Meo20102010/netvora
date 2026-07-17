const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

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
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
];

function isWorking(url) {
  return url.includes('kanaldvod.duhnet.tv') || url.includes('.m3u8') || url.includes('.mp4');
}

function getWorkingUrl(index) {
  return HLS_STREAMS[index % HLS_STREAMS.length];
}

async function main() {
  const BATCH_SIZE = 5000;
  let offset = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  console.log('=== Kalan video URL guncellemesi ===');
  
  while (true) {
    const videos = await p.video.findMany({
      skip: offset,
      take: BATCH_SIZE,
      select: { id: true, url: true },
    });

    if (videos.length === 0) break;

    const toUpdate = [];
    let skipped = 0;
    for (let i = 0; i < videos.length; i++) {
      if (!isWorking(videos[i].url)) {
        toUpdate.push({ id: videos[i].id, newUrl: getWorkingUrl(offset + i) });
      } else {
        skipped++;
      }
    }

    totalSkipped += skipped;

    if (toUpdate.length > 0) {
      for (let i = 0; i < toUpdate.length; i += 200) {
        const batch = toUpdate.slice(i, i + 200);
        await Promise.all(
          batch.map(v => p.video.update({ where: { id: v.id }, data: { url: v.newUrl } }))
        );
      }
      totalUpdated += toUpdate.length;
    }

    console.log(`  ${offset + videos.length}/${67336} islendi... (+${totalUpdated} guncel, ${totalSkipped} atlandi)`);

    offset += BATCH_SIZE;
    if (videos.length < BATCH_SIZE) break;
  }

  const kanald = await p.video.count({ where: { url: { contains: 'kanaldvod.duhnet.tv' } } });
  const m3u8 = await p.video.count({ where: { url: { contains: '.m3u8' } } });
  const mp4 = await p.video.count({ where: { url: { contains: '.mp4' } } });
  const broken = await p.video.count({ where: { AND: [
    { url: { not: { contains: 'kanaldvod.duhnet.tv' } } },
    { url: { not: { contains: '.m3u8' } } },
    { url: { not: { contains: '.mp4' } } },
  ] } });

  console.log('\n=== TAMAMLANDI ===');
  console.log('Toplam guncellenen: ' + totalUpdated);
  console.log('\n--- SON DURUM ---');
  console.log('Toplam video: ' + (kanald + m3u8 + mp4 + broken));
  console.log('kanaldvod (proxy): ' + kanald);
  console.log('HLS .m3u8: ' + m3u8);
  console.log('MP4: ' + mp4);
  console.log('Hala calismayan: ' + broken);

  await p['$disconnect']();
}

main().catch(e => { console.error(e); process.exit(1); });
