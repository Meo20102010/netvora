const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const vids = await p.video.findMany({
    take: 30,
    include: {
      episode: {
        include: {
          season: {
            include: { content: { select: { title: true, slug: true, type: true } } }
          }
        }
      }
    }
  });
  vids.forEach(v => {
    const ep = v.episode;
    const sn = ep ? ep.season : null;
    const c = sn ? sn.content : null;
    const name = c ? c.title : 'MOVIE';
    const season = sn ? sn.seasonNumber : '-';
    const episode = ep ? ep.episodeNumber : '-';
    console.log(`${name} S${season}E${episode}: ${v.url}`);
  });

  const placeholder = await p.video.count({ where: { url: { contains: 'turbo.imgz.me' } } });
  const kanald = await p.video.count({ where: { url: { contains: 'kanaldvod' } } });
  const sobreat = await p.video.count({ where: { url: { contains: 'sobreatsesuyp' } } });
  const other = await p.video.count({ where: { AND: [
    { url: { notContains: 'turbo.imgz.me' } },
    { url: { notContains: 'kanaldvod' } },
    { url: { notContains: 'sobreatsesuyp' } },
  ] } });
  const total = await p.video.count();
  console.log(`\n--- URL DAGILIMI ---`);
  console.log(`Toplam video: ${total}`);
  console.log(`turbo.imgz.me (placeholder): ${placeholder}`);
  console.log(`kanaldvod (gercek): ${kanald}`);
  console.log(`sobreatsesuyp (gercek): ${sobreat}`);
  console.log(`diger: ${other}`);
  await p['$disconnect']();
})();
