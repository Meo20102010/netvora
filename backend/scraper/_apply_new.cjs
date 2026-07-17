const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const posters = {
    'Abdülhamid Düşerken': 'https://upload.wikimedia.org/wikipedia/tr/2/2e/Abd%C3%BClhamid_D%C3%BC%C5%9Ferken_afi%C5%9Fi.jpg',
    'Anadolu Kartalları': 'https://upload.wikimedia.org/wikipedia/tr/1/1a/Anadolu_Kartallar%C4%B1.jpg',
    'Aşk Ölmez': 'https://upload.wikimedia.org/wikipedia/tr/7/7c/Sertab_Erener_2005_Ask_Olmez.jpg',
    'Büyük Buluşma': 'https://upload.wikimedia.org/wikipedia/tr/1/15/B%C3%BCy%C3%BCk_Bulu%C5%9Fma.jpg',
    'Büyük Sır': 'https://upload.wikimedia.org/wikipedia/tr/3/35/Buyuksir.jpg',
    'Can Feda': 'https://upload.wikimedia.org/wikipedia/tr/thumb/3/3a/CanFedafilm.jpg/960px-CanFedafilm.jpg',
    'Çılgın Dersane': 'https://upload.wikimedia.org/wikipedia/tr/5/5f/%C3%87%C4%B1lg%C4%B1n_Dersane.jpg',
    'Kayıt Dışı': 'https://upload.wikimedia.org/wikipedia/tr/thumb/7/7f/Kay%C4%B1td%C4%B1%C5%9F%C4%B1.jpg/960px-Kay%C4%B1td%C4%B1%C5%9F%C4%B1.jpg',
    'Kupa Kızı': 'https://upload.wikimedia.org/wikipedia/tr/2/22/Kupa_kizi_film.jpg',
    'Kurt Kanunu': 'https://upload.wikimedia.org/wikipedia/tr/5/56/Kurt_Kanunu_kapa%C4%9F%C4%B1.jpg',
    'Parmaklıklar Ardında': 'https://upload.wikimedia.org/wikipedia/tr/thumb/5/57/Parmakliklar_ard%C4%B1nda_logo.jpg/960px-Parmakliklar_ard%C4%B1nda_logo.jpg',
    'Yetenek Sizsiniz Türkiye': 'https://upload.wikimedia.org/wikipedia/tr/5/5d/Yetenek_Sizsiniz_T%C3%BCrkiye_logosu.png',
  };
  let total = 0;
  for (const [name, url] of Object.entries(posters)) {
    const r = await p.content.updateMany({
      where: { type: 'SERIES', posterUrl: { contains: 'placehold.co' }, title: { startsWith: name } },
      data: { posterUrl: url },
    });
    console.log(`${name}: ${r.count} updated`);
    total += r.count;
  }
  
  const totalSeries = await p.content.count({ where: { type: 'SERIES' } });
  const real = await p.content.count({ where: { type: 'SERIES', NOT: { posterUrl: { contains: 'placehold.co' } } } });
  const placehold = totalSeries - real;
  console.log(`\nTotal: ${totalSeries}, Real: ${real} (${(real/totalSeries*100).toFixed(1)}%), Placeholders: ${placehold}`);
  await p.$disconnect();
})();
