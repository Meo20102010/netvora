const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const MEDIA_BASE = 'http://localhost:4000/media';

async function main() {
  const updates = [
    { slug: 'daha-17', poster: MEDIA_BASE + '/images/daha-17/poster.jpg', cover: MEDIA_BASE + '/images/daha-17/backdrop.jpg' },
    { slug: 'gadar', poster: MEDIA_BASE + '/images/gadar/poster.jpg', cover: MEDIA_BASE + '/images/gadar/backdrop.jpg' },
  ];
  for (const u of updates) {
    const r = await prisma.content.updateMany({ where: { slug: u.slug }, data: { posterUrl: u.poster, coverUrl: u.cover } });
    console.log(u.slug + ': updated ' + r.count + ' record(s)');
  }
  await prisma.$disconnect();
}
main();
