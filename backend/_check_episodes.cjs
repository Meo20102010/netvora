const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // Check Episode model fields
  const fields = Object.keys(prisma.episode.fields);
  console.log('Episode fields:', fields);
  
  // Get total counts
  const totalEpisodes = await prisma.episode.count();
  const totalSeries = await prisma.series.count();
  
  // Get all episodes with their seriesId
  const allEpisodes = await prisma.episode.findMany({ select: { seriesId: true } });
  
  // Count episodes per seriesId
  const epCountMap = new Map();
  for (const ep of allEpisodes) {
    epCountMap.set(ep.seriesId, (epCountMap.get(ep.seriesId) || 0) + 1);
  }
  
  const seriesWithEpCount = Array.from(epCountMap.entries());
  const seriesWithZero = totalSeries - seriesWithEpCount.length;
  const counts = seriesWithEpCount.map(([_, c]) => c).sort((a,b) => a-b);
  
  // kanald
  const kanaldSeries = await prisma.series.findMany({ where: { source: 'kanald' }, select: { id: true, title: true } });
  
  console.log('=== EPISODE OVERVIEW ===');
  console.log('Total series:', totalSeries);
  console.log('Series with episodes:', seriesWithEpCount.length);
  console.log('Series without any episodes:', seriesWithZero);
  console.log('Total episodes:', totalEpisodes);
  if (counts.length > 0) {
    console.log('Min episodes:', counts[0]);
    console.log('Max episodes:', counts[counts.length-1]);
    console.log('Median:', counts[Math.floor(counts.length/2)]);
  }
  
  // Top 10
  const top10 = seriesWithEpCount.sort((a,b) => b[1] - a[1]).slice(0, 10);
  console.log('\nTop 10 series by episode count:');
  for (const [id, count] of top10) {
    const s = await prisma.series.findUnique({ where: { id }, select: { title: true, source: true } });
    console.log(' ', s?.title, '('+s?.source+')', '-', count, 'episodes');
  }
  
  // Kanald
  console.log('\nKanald series episode counts:');
  for (const ks of kanaldSeries) {
    const count = epCountMap.get(ks.id) || 0;
    console.log(' ', ks.title, '-', count, 'episodes');
  }
  
  // Zero-episode sample
  const idsWithEp = new Set(seriesWithEpCount.map(([id]) => id));
  const zeroEpSeries = await prisma.series.findMany({
    where: { NOT: { id: { in: Array.from(idsWithEp) } } },
    select: { id: true, title: true, source: true },
    take: 20
  });
  console.log('\nSample series with 0 episodes (first 20):');
  for (const s of zeroEpSeries) {
    console.log(' ', s.title, '('+s.source+')');
  }
  
  // Also check how many tvmaze-sourced series
  const tvmazeCount = await prisma.series.count({ where: { source: 'tvmaze' } });
  console.log('\nTVmaze sourced series:', tvmazeCount);
  
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
