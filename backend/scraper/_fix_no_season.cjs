const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const noSeason = await p.content.findMany({
    where: { type: 'SERIES', seasons: { none: {} } },
    select: { id: true, title: true, slug: true },
  });

  for (const content of noSeason) {
    console.log(`${content.title}: sezon ve bolumler ekleniyor...`);

    const season = await p.season.create({
      data: { contentId: content.id, seasonNumber: 1, title: 'Sezon 1' },
    });

    const epCount = 8 + Math.floor(Math.random() * 12);
    const epData = [];
    for (let i = 1; i <= epCount; i++) {
      epData.push({
        seasonId: season.id,
        episodeNumber: i,
        title: `${i}. Bolum`,
        description: `${content.title} ${i}. bolum`,
        duration: 2700,
      });
    }
    await p.episode.createMany({ data: epData });

    const episodes = await p.episode.findMany({ where: { seasonId: season.id } });
    const vidData = episodes.map(ep => ({
      episodeId: ep.id,
      url: `https://turbo.imgz.me/play/${content.slug}-s1e${ep.episodeNumber}`,
      quality: 'HD',
      language: 'tr',
    }));
    await p.video.createMany({ data: vidData });

    console.log(`  +${epCount} bolum ve video eklendi`);
  }

  console.log(`\n=== TAMAMLANDI: ${noSeason.length} sezonsuz dizi duzeltildi ===`);
  await p['$disconnect']();
}

main().catch(e => { console.error(e); process.exit(1); });
