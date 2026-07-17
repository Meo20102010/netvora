const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== SQL ILE TEKRAR TEMIZLEME ===\n');

  // Find duplicates using raw SQL
  const dupes = await p.$queryRawUnsafe(`
    SELECT title, GROUP_CONCAT(id) as ids, COUNT(*) as cnt
    FROM contents
    WHERE type = 'SERIES'
    GROUP BY REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(title, ' 0',''), ' 1',''), ' 2',''), ' 3',''), ' 4',''), ' 5',''), ' 6',''), ' 7',''), ' 8',''), ' 9','')
    HAVING COUNT(*) > 1
  `);

  console.log(`Tekrarlayan grup: ${dupes.length}`);

  // Get all series with their titles for easy lookup
  const allSeries = await p.content.findMany({
    where: { type: 'SERIES' },
    select: { id: true, title: true },
  });

  const groups = {};
  for (const s of allSeries) {
    const base = s.title.replace(/\s+\d+$/, '').trim();
    if (!groups[base]) groups[base] = [];
    groups[base].push(s);
  }

  // Collect IDs to delete (keep first of each group)
  const toDelete = [];
  for (const [base, items] of Object.entries(groups)) {
    if (items.length > 1) {
      toDelete.push(...items.slice(1).map(i => i.id));
    }
  }

  console.log(`Silinecek tekrar: ${toDelete.length}`);

  // Use raw SQL to delete in proper order (videos -> episodes -> seasons -> content)
  const BATCH = 100;
  for (let i = 0; i < toDelete.length; i += BATCH) {
    const batch = toDelete.slice(i, i + BATCH);
    const ids = batch.map(id => `'${id}'`).join(',');

    // Delete videos for episodes of these series
    await p.$executeRawUnsafe(`DELETE FROM videos WHERE episodeId IN (SELECT e.id FROM episodes e INNER JOIN seasons s ON e.seasonId = s.id WHERE s.contentId IN (${ids}))`);
    // Delete episodes
    await p.$executeRawUnsafe(`DELETE FROM episodes WHERE seasonId IN (SELECT id FROM seasons WHERE contentId IN (${ids}))`);
    // Delete seasons
    await p.$executeRawUnsafe(`DELETE FROM seasons WHERE contentId IN (${ids})`);
    // Delete watch history
    await p.$executeRawUnsafe(`DELETE FROM watch_history WHERE contentId IN (${ids})`);
    // Delete favorites
    await p.$executeRawUnsafe(`DELETE FROM favorites WHERE contentId IN (${ids})`);
    // Delete ratings
    await p.$executeRawUnsafe(`DELETE FROM ratings WHERE contentId IN (${ids})`);
    // Delete content
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
