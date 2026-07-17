const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== TEKRARLARI TEMIZLE ===\n');

  const allSeries = await p.content.findMany({
    where: { type: 'SERIES' },
    include: {
      seasons: {
        include: {
          _count: { select: { episodes: true } },
        },
      },
    },
  });

  // Group by base title (remove trailing numbers)
  const groups = {};
  for (const s of allSeries) {
    const baseTitle = s.title.replace(/\s+\d+$/, '').trim();
    if (!groups[baseTitle]) groups[baseTitle] = [];
    const totalEps = s.seasons.reduce((sum, sn) => sum + sn._count.episodes, 0);
    groups[baseTitle].push({ ...s, totalEps });
  }

  // Find duplicates
  const duplicates = {};
  for (const [title, items] of Object.entries(groups)) {
    if (items.length > 1) {
      duplicates[title] = items;
    }
  }

  console.log(`Tekrarlayan dizi grubu: ${Object.keys(duplicates).length}`);
  let totalDeleted = 0;

  for (const [title, items] of Object.entries(duplicates)) {
    // Sort by episode count descending - keep the one with most episodes
    items.sort((a, b) => b.totalEps - a.totalEps);
    const keep = items[0];
    const toDelete = items.slice(1);

    console.log(`\n"${title}": ${items.length} kopya`);
    console.log(`  SAKLANAN: ${keep.title} (${keep.totalEps} bolum)`);
    for (const d of toDelete) {
      console.log(`  SILINEN: ${d.title} (${d.totalEps} bolum)`);
      await p.content.delete({ where: { id: d.id } });
      totalDeleted++;
    }
  }

  console.log(`\nToplam silinen tekrar: ${totalDeleted}`);

  // Final count
  const finalCount = await p.content.count({ where: { type: 'SERIES' } });
  const finalEps = await p.episode.count();
  const finalVids = await p.video.count();
  console.log(`\nKalan dizi: ${finalCount}`);
  console.log(`Kalan bolum: ${finalEps}`);
  console.log(`Kalan video: ${finalVids}`);

  // If we need more series to reach 1000
  if (finalCount < 1000) {
    console.log(`\n${1000 - finalCount} dizi daha gerekiyor!`);
  }

  await p['$disconnect']();
}

main().catch(e => { console.error(e); process.exit(1); });
