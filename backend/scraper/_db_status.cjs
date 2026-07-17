const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const totalContent = await p.content.count();
  const series = await p.content.count({ where: { type: 'SERIES' } });
  const movies = await p.content.count({ where: { type: 'MOVIE' } });
  const seasons = await p.season.count();
  const episodes = await p.episode.count();
  const videos = await p.video.count();
  
  console.log('=== DB STATUS ===');
  console.log('Content:', totalContent, '(Series:', series, ', Movies:', movies, ')');
  console.log('Seasons:', seasons);
  console.log('Episodes:', episodes);
  console.log('Videos:', videos);
  
  // Count series with episodes
  const seriesWithEps = await p.$queryRaw`SELECT COUNT(DISTINCT c.id) as cnt FROM content c INNER JOIN seasons sn ON sn.contentId = c.id INNER JOIN episodes e ON e.seasonId = sn.id WHERE c.type = 'SERIES'`;
  console.log('Series with episodes:', seriesWithEps[0].cnt);
  
  // Count series with videos
  const seriesWithVids = await p.$queryRaw`SELECT COUNT(DISTINCT c.id) as cnt FROM content c INNER JOIN seasons sn ON sn.contentId = c.id INNER JOIN episodes e ON e.seasonId = sn.id INNER JOIN videos v ON v.episodeId = e.id WHERE c.type = 'SERIES'`;
  console.log('Series with videos:', seriesWithVids[0].cnt);
  
  // Sample kanald series
  const kanald = await p.content.findMany({ where: { type: 'SERIES' }, select: { title: true, slug: true, posterUrl: true }, orderBy: { createdAt: 'desc' }, take: 10 });
  console.log('\nRecent series:');
  for (const s of kanald) console.log('  ' + s.title + ' (' + s.slug + ') poster=' + (s.posterUrl ? 'YES' : 'NO'));
  
  await p['$disconnect']();
}
main().catch(e => { console.error(e); process.exit(1); });
