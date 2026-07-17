const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const contents = await p.content.findMany({
    where: { type: 'SERIES' },
    include: { seasons: { include: { episodes: true } } },
  });

  let totalAdded = 0;
  let seriesFixed = 0;

  for (const content of contents) {
    for (const season of content.seasons) {
      const existingNums = new Set(season.episodes.map(e => e.episodeNumber));
      if (existingNums.size === 0) continue;

      const maxEp = Math.max(...existingNums);
      const missing = [];
      for (let i = 1; i < maxEp; i++) {
        if (!existingNums.has(i)) missing.push(i);
      }

      if (missing.length === 0) continue;

      console.log(`${content.title} S${season.seasonNumber}: ${missing.length} eksik bolum ekleniyor (1-${maxEp - 1} arasi)...`);

      const epData = missing.map(epNum => ({
        seasonId: season.id,
        episodeNumber: epNum,
        title: `${epNum}. Bolum`,
        description: `${content.title} ${epNum}. bolum`,
        duration: 2700,
      }));

      await p.episode.createMany({ data: epData });

      const createdEps = await p.episode.findMany({
        where: { seasonId: season.id, episodeNumber: { in: missing } },
        select: { id: true, episodeNumber: true },
      });

      const vidData = createdEps.map(ep => ({
        episodeId: ep.id,
        url: `https://turbo.imgz.me/play/${content.slug}-s${season.seasonNumber}e${ep.episodeNumber}`,
        quality: 'HD',
        language: 'tr',
      }));

      await p.video.createMany({ data: vidData });

      totalAdded += missing.length;
      seriesFixed++;
      console.log(`  +${missing.length} bolum ve video eklendi`);
    }
  }

  console.log(`\n=== TAMAMLANDI ===`);
  console.log(`Duzeltilen dizi: ${seriesFixed}`);
  console.log(`Toplam eklenen bolum: ${totalAdded}`);

  await p['$disconnect']();
}

main().catch(e => { console.error(e); process.exit(1); });
