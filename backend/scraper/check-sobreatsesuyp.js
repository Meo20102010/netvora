const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  // Find videos from sobreatsesuyp.com
  const badVids = await p.video.findMany({ where: { url: { contains: 'sobreatsesuyp' } }, select: { id: true, contentId: true, url: true } });
  console.log('Total sobreatsesuyp.com videos:', badVids.length);
  
  // Check if these contents have alternative working videos
  const contentIds = badVids.map(v => v.contentId);
  const altVids = await p.video.findMany({ where: { contentId: { in: contentIds }, NOT: { url: { contains: 'sobreatsesuyp' } } }, select: { contentId: true, url: true } });
  const altMap = new Map();
  altVids.forEach(v => {
    if (!altMap.has(v.contentId)) altMap.set(v.contentId, []);
    altMap.get(v.contentId).push(v.url);
  });
  
  let withAlt = 0;
  let withoutAlt = 0;
  const noAltContentIds = [];
  for (const v of badVids) {
    if (altMap.has(v.contentId)) withAlt++;
    else { withoutAlt++; noAltContentIds.push(v.contentId); }
  }
  
  console.log('With alternative video:', withAlt);
  console.log('Without any alternative:', withoutAlt);
  
  // Check the IDs of those without alternatives
  if (noAltContentIds.length > 0) {
    const noAltContents = await p.content.findMany({ where: { id: { in: noAltContentIds } }, select: { id: true, title: true }, take: 10 });
    console.log('Sample contents that will lose video:');
    noAltContents.forEach(c => console.log(' ', c.title, '(' + c.id + ')'));
  }
  
  await p.$disconnect();
})();
