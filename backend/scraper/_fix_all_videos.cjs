const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
];

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

async function main() {
  // ADIM 1: Kanaldhariç tum videolari BigBuckBunny ile doldur (tek SQL)
  console.log('ADIM 1: Toplu guncelle...');
  const r1 = await p.$executeRawUnsafe(
    `UPDATE videos SET url = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' WHERE url NOT LIKE '%kanaldvod.duhnet.tv%'`
  );
  console.log('Guncellenen: ' + r1);

  // ADIM 2: Her dizi slug'i icin benzersiz URL ata (tek SQL, CASE WHEN ile)
  console.log('ADIM 2: Dizi bazli benzersiz URL...');
  const series = await p.content.findMany({
    where: { type: 'SERIES' },
    select: { id: true, slug: true },
  });

  // CASE WHEN ile tek SQL'de tumunu guncelle
  const chunks = [];
  for (let i = 0; i < series.length; i += 50) {
    const chunk = series.slice(i, i + 50);
    let cases = '';
    const ids = [];
    for (const s of chunk) {
      const videoUrl = SAMPLE_VIDEOS[hashCode(s.slug) % SAMPLE_VIDEOS.length];
      cases += ` WHEN episodeId IN (SELECT e.id FROM episodes e INNER JOIN seasons sn ON e.seasonId = sn.id WHERE sn.contentId = '${s.id}') THEN '${videoUrl}'`;
      ids.push(s.id);
    }
    const sql = `UPDATE videos SET url = CASE ${cases} ELSE url END WHERE episodeId IN (SELECT e.id FROM episodes e INNER JOIN seasons sn ON e.seasonId = sn.id WHERE sn.contentId IN (${ids.map(id => `'${id}'`).join(',')}))`;
    const r = await p.$executeRawUnsafe(sql);
    chunks.push(r);
    process.stdout.write(`\r  Islenen: ${Math.min(i + 50, series.length)}/${series.length}`);
  }
  console.log('\nDizi guncellenen: ' + chunks.reduce((a, b) => a + b, 0));

  // ADIM 3: Movie'leri guncelle
  console.log('ADIM 3: Movie guncelle...');
  const movies = await p.content.findMany({
    where: { type: 'MOVIE' },
    select: { id: true, slug: true },
  });

  const movieChunks = [];
  for (let i = 0; i < movies.length; i += 50) {
    const chunk = movies.slice(i, i + 50);
    let cases = '';
    const ids = [];
    for (const m of chunk) {
      const videoUrl = `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${['BigBuckBunny','ElephantsDream','Sintel','TearsOfSteel'][hashCode(m.slug) % 4]}.mp4`;
      cases += ` WHEN contentId = '${m.id}' THEN '${videoUrl}'`;
      ids.push(m.id);
    }
    if (cases) {
      const sql = `UPDATE videos SET url = CASE ${cases} ELSE url END WHERE contentId IN (${ids.map(id => `'${id}'`).join(',')})`;
      const r = await p.$executeRawUnsafe(sql);
      movieChunks.push(r);
    }
  }
  console.log('Movie guncellenen: ' + movieChunks.reduce((a, b) => a + b, 0));

  // ADIM 4: Videosuz bolumlere video ekle
  console.log('ADIM 4: Videosuz bolumler...');
  const epsWithoutVideo = await p.$queryRawUnsafe(
    `SELECT e.id as episodeId, sn.contentId FROM episodes e INNER JOIN seasons sn ON e.seasonId = sn.id LEFT JOIN videos v ON v.episodeId = e.id WHERE v.id IS NULL`
  );
  console.log('Videosuz bolum: ' + epsWithoutVideo.length);

  if (epsWithoutVideo.length > 0) {
    const vids = epsWithoutVideo.map(ep => ({
      episodeId: ep.episodeId,
      url: SAMPLE_VIDEOS[hashCode(ep.contentId || '') % SAMPLE_VIDEOS.length],
      quality: 'HD',
      language: 'tr',
    }));
    for (let i = 0; i < vids.length; i += 1000) {
      await p.video.createMany({ data: vids.slice(i, i + 1000) });
    }
    console.log('Yeni video: ' + vids.length);
  }

  // FINAL
  console.log('\n=== FINAL ===');
  const total = await p.video.count();
  const kanald = await p.video.count({ where: { url: { contains: 'kanaldvod.duhnet.tv' } } });
  const google = await p.video.count({ where: { url: { contains: 'googleapis.com' } } });
  console.log('Toplam: ' + total + ' | Google: ' + google + ' | Kanald: ' + kanald + ' | Diger: ' + (total - google - kanald));

  // Ornek
  console.log('\n=== ORNEKLER ===');
  for (const s of series.slice(0, 3)) {
    const v = await p.$queryRawUnsafe(`SELECT v.url FROM videos v INNER JOIN episodes e ON v.episodeId = e.id INNER JOIN seasons sn ON e.seasonId = sn.id WHERE sn.contentId = '${s.id}' LIMIT 1`);
    console.log(s.slug + ': ' + (v[0] ? v[0].url : 'YOK'));
  }
  for (const m of movies.slice(0, 2)) {
    const v = await p.$queryRawUnsafe(`SELECT url FROM videos WHERE contentId = '${m.id}' LIMIT 1`);
    console.log(m.slug + ': ' + (v[0] ? v[0].url : 'YOK'));
  }

  await p['$disconnect']();
}

main().catch(e => { console.error(e); process.exit(1); });
