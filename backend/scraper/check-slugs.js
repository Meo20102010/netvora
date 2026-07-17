import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  
  const slugs = [
    'so-fades-the-light',
    'neon-lights',
    'mona-lisa-and-the-blood-moon',
    'soror',
    'angels-fallen-warriors-of-peace',
    'apex-34xf',
    'het-diner',
    'plush',
    'death-valley-wwu8',
    'the-final-wish',
  ];
  
  for (const slug of slugs) {
    const c = await prisma.content.findFirst({
      where: { slug },
      include: { videos: { select: { url: true } } },
    });
    if (!c) { console.log(`${slug}: NOT IN DB`); continue; }
    console.log(`${slug} (${c.type}, ${c.title}): ${c.videos.length} videos`);
    c.videos.forEach(v => console.log(`  ${v.url}`));
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
