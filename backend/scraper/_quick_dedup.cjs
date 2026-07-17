const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== HIZLI TEKRAR TEMIZLEME ===\n');

  const allSeries = await p.content.findMany({
    where: { type: 'SERIES' },
    select: { id: true, title: true, slug: true },
  });

  console.log(`Toplam dizi: ${allSeries.length}`);

  // Group by base title
  const groups = {};
  for (const s of allSeries) {
    const baseTitle = s.title.replace(/\s+\d+$/, '').trim();
    if (!groups[baseTitle]) groups[baseTitle] = [];
    groups[baseTitle].push(s);
  }

  const toDelete = [];
  for (const [title, items] of Object.entries(groups)) {
    if (items.length > 1) {
      // Keep the first one, delete the rest
      toDelete.push(...items.slice(1).map(s => s.id));
    }
  }

  console.log(`Silinecek tekrar: ${toDelete.length}`);

  // Delete in batches
  for (let i = 0; i < toDelete.length; i += 50) {
    const batch = toDelete.slice(i, i + 50);
    await p.content.deleteMany({ where: { id: { in: batch } } });
    process.stdout.write(`\r  Silindi: ${Math.min(i + 50, toDelete.length)}/${toDelete.length}`);
  }

  const finalCount = await p.content.count({ where: { type: 'SERIES' } });
  const finalEps = await p.episode.count();
  const finalVids = await p.video.count();
  console.log(`\n\nKalan dizi: ${finalCount}`);
  console.log(`Kalan bolum: ${finalEps}`);
  console.log(`Kalan video: ${finalVids}`);

  await p['$disconnect']();
}

main().catch(e => { console.error(e); process.exit(1); });
