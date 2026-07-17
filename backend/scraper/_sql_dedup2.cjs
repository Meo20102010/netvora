const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== TEKRAR TEMIZLEME DEVAM ===\n');

  const allSeries = await p.content.findMany({
    where: { type: 'SERIES' },
    select: { id: true, title: true },
  });

  console.log(`Toplam dizi: ${allSeries.length}`);

  const groups = {};
  for (const s of allSeries) {
    const base = s.title.replace(/\s+\d+$/, '').trim();
    if (!groups[base]) groups[base] = [];
    groups[base].push(s);
  }

  const toDelete = [];
  for (const [, items] of Object.entries(groups)) {
    if (items.length > 1) {
      toDelete.push(...items.slice(1).map(i => i.id));
    }
  }

  console.log(`Kalan tekrar: ${toDelete.length}`);

  if (toDelete.length === 0) {
    console.log('Tekrar kalmadi!');
    await p['$disconnect']();
    return;
  }

  const BATCH = 200;
  for (let i = 0; i < toDelete.length; i += BATCH) {
    const batch = toDelete.slice(i, i + BATCH);
    const ids = batch.map(id => `'${id}'`).join(',');

    await p.$executeRawUnsafe(`DELETE FROM videos WHERE episodeId IN (SELECT e.id FROM episodes e INNER JOIN seasons s ON e.seasonId = s.id WHERE s.contentId IN (${ids}))`);
    await p.$executeRawUnsafe(`DELETE FROM watch_history WHERE episodeId IN (SELECT e.id FROM episodes e INNER JOIN seasons s ON e.seasonId = s.id WHERE s.contentId IN (${ids}))`);
    await p.$executeRawUnsafe(`DELETE FROM episodes WHERE seasonId IN (SELECT id FROM seasons WHERE contentId IN (${ids}))`);
    await p.$executeRawUnsafe(`DELETE FROM watch_history WHERE contentId IN (${ids})`);
    await p.$executeRawUnsafe(`DELETE FROM favorites WHERE contentId IN (${ids})`);
    await p.$executeRawUnsafe(`DELETE FROM ratings WHERE contentId IN (${ids})`);
    await p.$executeRawUnsafe(`DELETE FROM seasons WHERE contentId IN (${ids})`);
    await p.$executeRawUnsafe(`DELETE FROM contents WHERE id IN (${ids})`);

    process.stdout.write(`\r  Silindi: ${Math.min(i + BATCH, toDelete.length)}/${toDelete.length}`);
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
