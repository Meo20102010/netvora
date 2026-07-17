const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  // Clear ALL content
  await prisma.video.deleteMany();
  await prisma.episode.deleteMany();
  await prisma.season.deleteMany();
  await prisma.content.deleteMany();
  const c = await prisma.content.count();
  console.log('All content deleted. Count:', c);
  await prisma.$disconnect();
})();
