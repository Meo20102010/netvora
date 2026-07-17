import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  
  const total = await prisma.content.count();
  const withVideo = await prisma.content.count({ where: { videos: { some: {} } } });
  const withoutVideo = await prisma.content.count({ where: { videos: { none: {} } } });
  
  console.log(`Total contents: ${total}`);
  console.log(`With video: ${withVideo}`);
  console.log(`Without video: ${withoutVideo}`);
  
  // Get sample slugs from each category
  const withVid = await prisma.content.findMany({ where: { videos: { some: {} } }, take: 3, select: { slug: true, title: true, type: true, videos: { select: { url: true } } } });
  const withoutVid = await prisma.content.findMany({ where: { videos: { none: {} } }, take: 10, select: { slug: true, title: true, type: true } });
  
  console.log('\n=== Sample WITH video ===');
  withVid.forEach(c => console.log(`  ${c.slug} (${c.type}): ${c.videos[0]?.url?.substring(0, 50)}`));
  
  console.log('\n=== Sample WITHOUT video ===');
  withoutVid.forEach(c => console.log(`  ${c.slug} (${c.type})`));
  
  await prisma.$disconnect();
}

main().catch(console.error);
