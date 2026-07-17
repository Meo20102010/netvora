const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== DATABASE RESET - SERIES ONLY ===\n');

  // Disable foreign keys for faster operations
  await p.$executeRawUnsafe('PRAGMA foreign_keys = OFF');

  // Count before
  const before = await p.content.count({ where: { type: 'SERIES' } });
  console.log('Once series:', before);

  // Delete all series-related data at once
  console.log('Deleting videos for series episodes...');
  await p.$executeRawUnsafe(`
    DELETE FROM videos WHERE episodeId IN (
      SELECT e.id FROM episodes e 
      INNER JOIN seasons s ON e.seasonId = s.id 
      INNER JOIN contents c ON s.contentId = c.id 
      WHERE c.type = 'SERIES'
    )
  `);

  console.log('Deleting watch history...');
  await p.$executeRawUnsafe(`
    DELETE FROM watch_history WHERE episodeId IN (
      SELECT e.id FROM episodes e 
      INNER JOIN seasons s ON e.seasonId = s.id 
      INNER JOIN contents c ON s.contentId = c.id 
      WHERE c.type = 'SERIES'
    )
  `);
  await p.$executeRawUnsafe(`
    DELETE FROM watch_history WHERE contentId IN (
      SELECT id FROM contents WHERE type = 'SERIES'
    )
  `);

  console.log('Deleting favorites for series...');
  await p.$executeRawUnsafe(`DELETE FROM favorites WHERE contentId IN (SELECT id FROM contents WHERE type = 'SERIES')`);

  console.log('Deleting ratings for series...');
  await p.$executeRawUnsafe(`DELETE FROM ratings WHERE contentId IN (SELECT id FROM contents WHERE type = 'SERIES')`);

  console.log('Deleting episodes...');
  await p.$executeRawUnsafe(`
    DELETE FROM episodes WHERE seasonId IN (
      SELECT s.id FROM seasons s 
      INNER JOIN contents c ON s.contentId = c.id 
      WHERE c.type = 'SERIES'
    )
  `);

  console.log('Deleting seasons...');
  await p.$executeRawUnsafe(`
    DELETE FROM seasons WHERE contentId IN (
      SELECT id FROM contents WHERE type = 'SERIES'
    )
  `);

  console.log('Deleting series...');
  await p.$executeRawUnsafe(`DELETE FROM contents WHERE type = 'SERIES'`);

  // Re-enable foreign keys
  await p.$executeRawUnsafe('PRAGMA foreign_keys = ON');

  const after = await p.content.count({ where: { type: 'SERIES' } });
  console.log('\nAfter series:', after);

  // Check what remains
  const movies = await p.content.count({ where: { type: 'MOVIE' } });
  const users = await p.user.count();
  const profiles = await p.profile.count();
  console.log('Movies:', movies);
  console.log('Users:', users);
  console.log('Profiles:', profiles);

  // Compact database
  console.log('\nVacuuming database...');
  await p.$executeRawUnsafe('VACUUM');

  console.log('\nRESET COMPLETE!');
  await p['$disconnect']();
}

main().catch(e => { console.error(e); process.exit(1); });
