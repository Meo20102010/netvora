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

function getVideoUrl(seed) {
  return WORKING_VIDEOS[hashStr(seed) % WORKING_VIDEOS.length];
}

async function main() {
  console.log('=== Toplu dizi bolum guncelleme ===');

  // Get all series with their episode counts
  const allSeries = await p.content.findMany({
    where: { type: 'SERIES' },
    include: {
      seasons: {
        select: {
          id: true,
          seasonNumber: true,
          _count: { select: { episodes: true } },
        },
      },
    },
  });

  // Identify series with < 10 episodes
  const needMore = allSeries.filter(s => {
    const totalEps = s.seasons.reduce((sum, sn) => sum + sn._count.episodes, 0);
    return totalEps < 10;
  });

  console.log(`Toplam dizi: ${allSeries.length}`);
  console.log(`10'dan az bolumu olan dizi: ${needMore.length}`);

  let updated = 0;
  let totalEpsAdded = 0;

  for (const series of needMore) {
    const currentTotal = series.seasons.reduce((sum, sn) => sum + sn._count.episodes, 0);
    const targetEps = 10 + (hashStr(series.slug) % 40); // 10-50 episodes

    // Get or create season 1
    let season = series.seasons[0];
    if (!season) {
      season = await p.season.create({ data: { contentId: series.id, seasonNumber: 1, title: '1. Sezon' } });
    }

    // Add episodes to reach target
    const epsToAdd = targetEps - currentTotal;
    if (epsToAdd <= 0) continue;

    const maxEpNum = season._count.episodes;

    for (let i = 0; i < epsToAdd; i++) {
      const epNum = maxEpNum + i + 1;
      const ep = await p.episode.create({
        data: {
          seasonId: season.id,
          episodeNumber: epNum,
          title: `${epNum}. Bölüm`,
        },
      });
      await p.video.create({
        data: {
          episodeId: ep.id,
          url: getVideoUrl(series.id + '_ep' + epNum),
          quality: 'HD',
          language: 'tr',
        },
      });
    }

    totalEpsAdded += epsToAdd;
    updated++;

    if (updated % 100 === 0) {
      console.log(`  ${updated}/${needMore.length} guncellendi (${totalEpsAdded} bolum eklendi)...`);
    }
  }

  console.log(`\nGuncellenen dizi: ${updated}`);
  console.log(`Eklenen bolum: ${totalEpsAdded}`);

  // Final stats
  const finalSeries = await p.content.count({ where: { type: 'SERIES' } });
  const finalSeasons = await p.season.count();
  const finalEpisodes = await p.episode.count();
  const finalVideos = await p.video.count();

  console.log(`\n=== FINAL ===`);
  console.log(`Diziler: ${finalSeries}`);
  console.log(`Sezonlar: ${finalSeasons}`);
  console.log(`Bolumler: ${finalEpisodes}`);
  console.log(`Videolar: ${finalVideos}`);

  // Verify no missing videos
  const epsWithoutVideo = await p.episode.findMany({
    where: { videos: { none: {} } },
    select: { id: true },
  });
  console.log(`Videosuz bolum: ${epsWithoutVideo.length}`);

  await p['$disconnect']();
}

main().catch(e => { console.error(e); process.exit(1); });
