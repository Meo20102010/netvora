const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== FINAL KONTROL ===\n');

  const totalSeries = await p.content.count({ where: { type: 'SERIES' } });
  const totalMovies = await p.content.count({ where: { type: 'MOVIE' } });
  const totalSeasons = await p.season.count();
  const totalEpisodes = await p.episode.count();
  const totalVideos = await p.video.count();

  console.log(`Diziler: ${totalSeries}`);
  console.log(`Filmler: ${totalMovies}`);
  console.log(`Sezonlar: ${totalSeasons}`);
  console.log(`Bolumler: ${totalEpisodes}`);
  console.log(`Videolar: ${totalVideos}`);

  // Episodes without videos
  const epsWithoutVideo = await p.episode.findMany({
    where: { videos: { none: {} } },
    select: { id: true },
  });
  console.log(`\nVideosuz bolum: ${epsWithoutVideo.length}`);

  // Series without episodes
  const seriesList = await p.content.findMany({
    where: { type: 'SERIES' },
    include: { seasons: { include: { _count: { select: { episodes: true } } } } },
    orderBy: { createdAt: 'desc' },
  });

  const noEps = seriesList.filter(s => s.seasons.reduce((sum, sn) => sum + sn._count.episodes, 0) === 0);
  console.log(`Bolumsuz dizi: ${noEps.length}`);

  // Kanald scraped series
  console.log('\n=== KANALD DIZILERI ===');
  const kanaldSeries = seriesList.filter(s => {
    const slugs = ['arka-sokaklar', 'uzak-sehir', 'esref-ruya', 'guller-ve-gunahlar',
      'inci-taneleri', 'kuzey-güney', 'kuzeyguney', 'poyraz-karayel', 'poyraz-karayel-15',
      'siyah-beyaz-ask', 'zalim-istanbul', 'afili-ask', 'gunesin-kizlari', 'fatmagulunsucune',
      'hekimoglu', 'hekimoglu-15', 'askimemnu', 'kuralsiz-sokaklar', 'daha-17'];
    return slugs.some(slug => s.slug.includes(slug) || s.slug === slug);
  });

  for (const s of kanaldSeries) {
    const totalEps = s.seasons.reduce((sum, sn) => sum + sn._count.episodes, 0);
    console.log(`  ${s.title}: ${totalEps} bolum, poster=${s.posterUrl ? 'var' : 'yok'}`);
  }

  // Sample series from different parts of the list
  console.log('\n=== ORNEK DIZILER (ilk 10) ===');
  for (const s of seriesList.slice(0, 10)) {
    const totalEps = s.seasons.reduce((sum, sn) => sum + sn._count.episodes, 0);
    console.log(`  ${s.title}: ${totalEps} bolum`);
  }

  console.log('\n=== ORNEK DIZILER (son 10) ===');
  for (const s of seriesList.slice(-10)) {
    const totalEps = s.seasons.reduce((sum, sn) => sum + sn._count.episodes, 0);
    console.log(`  ${s.title}: ${totalEps} bolum`);
  }

  // Episode count distribution
  const dist = { '1-5': 0, '6-10': 0, '11-20': 0, '21-50': 0, '51-100': 0, '100+': 0 };
  for (const s of seriesList) {
    const eps = s.seasons.reduce((sum, sn) => sum + sn._count.episodes, 0);
    if (eps <= 5) dist['1-5']++;
    else if (eps <= 10) dist['6-10']++;
    else if (eps <= 20) dist['11-20']++;
    else if (eps <= 50) dist['21-50']++;
    else if (eps <= 100) dist['51-100']++;
    else dist['100+']++;
  }
  console.log('\n=== BOLUM DAGILIMI ===');
  for (const [range, count] of Object.entries(dist)) {
    console.log(`  ${range} bolum: ${count} dizi`);
  }

  await p['$disconnect']();
}

main().catch(e => { console.error(e); process.exit(1); });
