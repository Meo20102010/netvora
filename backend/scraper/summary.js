const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  console.log('=== Netvora Icerik Durumu ===');
  console.log('Toplam film:', await p.content.count());
  console.log('Video kaydi:', await p.video.count());
  const withVid = await p.video.groupBy({ by: ['contentId'], _count: true });
  console.log('Video bagli film:', withVid.length);
  const cats = await p.category.findMany();
  console.log('Kategori:', cats.length);
  const topCat = await p.content.groupBy({
    by: ['categoryId'], _count: true,
    orderBy: { _count: { id: 'desc' } }, take: 5
  });
  console.log('En cok film olan kategoriler:');
  for (const c of topCat) {
    const cat = cats.find(x => x.id === c.categoryId);
    if (cat) console.log(' -', cat.name, ':', JSON.stringify(c._count), 'film');
  }
  await p.$disconnect();
})();
