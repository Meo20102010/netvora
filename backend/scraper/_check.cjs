const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const t = await p.content.count();
  const m = await p.content.count({ where: { type: 'MOVIE' } });
  const s = await p.content.count({ where: { type: 'SERIES' } });
  const v = await p.video.count();
  const kanaldUrls = await p.video.count({ where: { url: { contains: 'kanald.com.tr' } } });
  const exampleUrls = await p.video.count({ where: { url: { contains: 'example.com' } } });
  const hlsUrls = await p.video.count({ where: { url: { contains: 'kanaldvod' } } });
  const embedUrls = await p.video.count({ where: { url: { contains: 'youtube' } } });
  const otherUrls = v - kanaldUrls - exampleUrls - hlsUrls - embedUrls;
  console.log(`Total: ${t} | Movies: ${m} | Series: ${s} | Videos: ${v}`);
  console.log(`Video URL breakdown: kanald.com.tr: ${kanaldUrls} | example.com: ${exampleUrls} | kanaldvod HLS: ${hlsUrls} | YouTube embed: ${embedUrls} | other: ${otherUrls}`);
  await p.$disconnect();
})();
