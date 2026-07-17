const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const s = await p.content.findMany({
    where: { type: 'SERIES' },
    select: {
      title: true,
      slug: true,
      posterUrl: true,
      coverUrl: true,
      year: true,
      imdbRating: true,
      _count: { select: { seasons: true } }
    }
  });
  for (const r of s) {
    console.log(r.title + ' (' + r.slug + ') year:' + r.year + ' imdb:' + r.imdbRating + ' seasons:' + r._count.seasons);
    console.log('  poster: ' + (r.posterUrl || 'NONE'));
    console.log('  cover: ' + (r.coverUrl || 'NONE'));
  }

  const episodes = await p.episode.count();
  const videos = await p.video.count();
  console.log('\nTotal seasons:', await p.season.count());
  console.log('Total episodes:', episodes);
  console.log('Total videos:', videos);

  await p.$disconnect();
}
main();
