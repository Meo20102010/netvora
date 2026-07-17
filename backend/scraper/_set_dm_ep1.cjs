const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const DAILYMOTION_URL = 'https://geo.dailymotion.com/player/xbcf4.html?video=k4XGlaCpNpdgh4yWjVK&loop=false&autostart=firstTimeViewable&playsinline=1&customConfig%5Bdynamiciu%5D=%2F9927946%2C22421055942%2Fkanald%2Fdiziler&customConfig%5Bkeyvalues%5D=kanald_kategori%3Dp1%2Carsiv-dizi-bolum%2Csiyah_beyaz_ask_1%2Cdiziler%2Csiyah-beyaz-ask%2Cbolum-1%2Csiyah-beyaz-ask%2CSiyah+Beyaz+A%C5%9Fk%2C59e4b3264967833b8c3cc930%26cue%3Dpre%26owner%3Dp_202_kanaldcom%26source%3Dkanald.com.tr%26Category%3Dsiyah-beyaz-ask-1-bolum%26PartnerStatus%3DDailymotion%26vid%3D59e4b3264967833b8c3cc930&customConfig%5Botherparams%5D=pmnd%3D0%26pmxd%3D600000%26pmad%3D2&customConfig%5BcustomParams%5D=pmnd%3D0%26pmxd%3D600000%26pmad%3D1&customConfig%5Bplcmt%5D=1&customConfig%5Bvpa%5D=click&customConfig%5Bvpmute%5D=1';

(async () => {
  const content = await p.content.findUnique({ where: { slug: 'siyah-beyaz-ask' }, include: { seasons: { include: { episodes: { include: { videos: true } } } } } });
  
  if (!content) { console.log('Dizi bulunamadi'); await p.$disconnect(); return; }
  console.log('Dizi:', content.title);
  console.log('Sezon:', content.seasons.length);
  
  // Find first episode
  const season1 = content.seasons.find(s => s.seasonNumber === 1);
  if (!season1 || !season1.episodes.length) { console.log('Bolum bulunamadi'); await p.$disconnect(); return; }
  
  const ep1 = season1.episodes[0];
  console.log('Bolum:', ep1.title, '(ID:', ep1.id + ')');
  console.log('Mevcut video:', ep1.videos[0]?.url?.substring(0, 50) + '...');
  
  // Update video URL
  if (ep1.videos.length > 0) {
    await p.video.update({ where: { id: ep1.videos[0].id }, data: { url: DAILYMOTION_URL } });
    console.log('Video URL guncellendi (update)');
  } else {
    await p.video.create({ data: { episodeId: ep1.id, url: DAILYMOTION_URL, quality: 'HD', language: 'tr' } });
    console.log('Video URL olusturuldu (create)');
  }
  
  // Verify
  const updated = await p.video.findFirst({ where: { episodeId: ep1.id } });
  console.log('Dogrulama:', updated.url.substring(0, 60) + '...');
  
  await p.$disconnect();
})();
