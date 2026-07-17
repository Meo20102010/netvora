const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  // Check resim.hdmekani.com
  const imgVids = await p.video.findMany({
    where: { OR: [{ url: { contains: 'resim.hdmekani' } }, { url: { contains: 'turbo.imgz' } }] },
    select: { url: true, contentId: true }
  });
  console.log('Image URLs stored as video:');
  imgVids.forEach(v => console.log(' ', v.contentId, '->', v.url));
  await p.$disconnect();
})();
