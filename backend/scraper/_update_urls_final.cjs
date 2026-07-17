const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const WORKING_VIDEOS = [
  'https://www.w3schools.com/html/movie.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://mdn.github.io/learning-area/html/multimedia-and-embedding/video-and-audio-content/rabbit320.mp4',
  'https://placeholdervideo.dev/1920x1080',
  'https://placeholdervideo.dev/1280x720',
  'https://placeholdervideo.dev/854x480',
  'https://placeholdervideo.dev/640x360',
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

async function main() {
  console.log('Updating all video URLs...');
  const all = await p.video.findMany({ select: { id: true } });
  console.log('Total videos:', all.length);

  for (let i = 0; i < all.length; i += 5000) {
    const batch = all.slice(i, i + 5000);
    const ids = batch.map(v => `'${v.id}'`);
    const cases = batch.map((v, idx) => {
      const url = WORKING_VIDEOS[(hashStr(v.id) + i + idx) % WORKING_VIDEOS.length];
      return `WHEN id = '${v.id}' THEN '${url}'`;
    }).join(' ');
    await p.$executeRawUnsafe(`UPDATE videos SET url = CASE ${cases} ELSE url END WHERE id IN (${ids.join(',')})`);
    process.stdout.write(`\r  Updated: ${Math.min(i + 5000, all.length)}/${all.length}`);
  }
  console.log('\nDone!');

  const dist = {};
  for (const v of WORKING_VIDEOS) dist[v] = 0;
  const check = await p.video.findMany({ select: { url: true } });
  for (const v of check) dist[v.url] = (dist[v.url] || 0) + 1;
  console.log('\nDistribution:');
  for (const [url, count] of Object.entries(dist)) {
    console.log(`  ${count}x ${url}`);
  }

  await p['$disconnect']();
}

main().catch(e => { console.error(e); process.exit(1); });
