const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const total = await p.video.count();
  
  const turbo = await p.video.count({ where: { url: { contains: 'turbo.imgz.me' } } });
  const rickroll = await p.video.count({ where: { url: { contains: 'youtube.com' } } });
  const placeholder = await p.video.count({ where: { url: { contains: 'placeholder.video' } } });
  const kanaldvod = await p.video.count({ where: { url: { contains: 'kanaldvod.duhnet.tv' } } });
  const sobreat = await p.video.count({ where: { url: { contains: 'sobreatsesuyp' } } });
  const example = await p.video.count({ where: { url: { contains: 'example.com' } } });
  const rapidvid = await p.video.count({ where: { url: { contains: 'rapidvid' } } });

  console.log('=== URL DAGILIMI ===');
  console.log('Toplam video: ' + total);
  console.log('turbo.imgz.me: ' + turbo);
  console.log('youtube.com (rickroll): ' + rickroll);
  console.log('placeholder.video: ' + placeholder);
  console.log('kanaldvod.duhnet.tv (GERCEK): ' + kanaldvod);
  console.log('sobreatsesuyp: ' + sobreat);
  console.log('example.com: ' + example);
  console.log('rapidvid: ' + rapidvid);

  // Show some sample kanaldvod URLs
  const kanaldVids = await p.video.findMany({
    where: { url: { contains: 'kanaldvod.duhnet.tv' } },
    take: 5,
    include: { episode: { include: { season: { include: { content: { select: { title: true } } } } } } }
  });
  console.log('\n--- ORNEK KANALD URLLERI ---');
  kanaldVids.forEach(v => {
    const ep = v.episode;
    const title = ep ? ep.season?.content?.title : 'MOVIE';
    console.log(title + ': ' + v.url);
  });

  // Count how many content/episodes use each URL type
  const seriesWithKanald = await p.content.findMany({
    where: { type: 'SERIES', seasons: { some: { episodes: { some: { videos: { some: { url: { contains: 'kanaldvod.duhnet.tv' } } } } } } } },
    select: { id: true, title: true }
  });
  const seriesWithTurbo = await p.content.findMany({
    where: { type: 'SERIES', seasons: { some: { episodes: { some: { videos: { some: { url: { contains: 'turbo.imgz.me' } } } } } } } },
    select: { id: true, title: true }
  });
  const seriesWithRickroll = await p.content.findMany({
    where: { type: 'SERIES', seasons: { some: { episodes: { some: { videos: { some: { url: { contains: 'youtube.com' } } } } } } } },
    select: { id: true, title: true }
  });

  console.log('\n--- DIZI TURLERI ---');
  console.log('Kanald URL\'li dizi: ' + seriesWithKanald.length);
  console.log('turbo URL\'li dizi: ' + seriesWithTurbo.length);
  console.log('Rickroll URL\'li dizi: ' + seriesWithRickroll.length);

  await p['$disconnect']();
})();
