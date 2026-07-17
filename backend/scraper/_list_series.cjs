const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const series = await p.content.findMany({
    where: { type: 'SERIES', posterUrl: { contains: 'placehold.co' } },
    select: { title: true },
    distinct: ['title'],
  });
  const baseNames = new Set();
  for (const s of series) {
    const base = s.title.replace(/\s+\d+$/, '');
    baseNames.add(base);
  }
  console.log('Unique base series:', baseNames.size);
  const names = [...baseNames].sort();
  for (const n of names) console.log(n);
  await p.$disconnect();
})();
