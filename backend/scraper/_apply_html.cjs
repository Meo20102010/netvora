const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const posters = {
    'Çiçek Taksi': 'https://upload.wikimedia.org/wikipedia/tr/0/0f/%C3%87i%C3%A7ek_Taksi.jpg',
    'Kaygısızlar': 'https://upload.wikimedia.org/wikipedia/tr/c/c9/Kayg%C4%B1s%C4%B1zlar_logo.jpg',
    'Kim Milyoner Olmak İster?': 'https://upload.wikimedia.org/wikipedia/tr/3/34/KimMilyonerOlmak%C4%B0ster.png',
    'Komedi Dükkanı': 'https://upload.wikimedia.org/wikipedia/commons/6/61/Tolgacevik_Komedidukkani.jpg',
    'Lise Defteri': 'https://upload.wikimedia.org/wikipedia/tr/b/b1/Lise_defteri_afi%C5%9F.jpg',
    'Sakarya Fırat': 'https://upload.wikimedia.org/wikipedia/tr/2/2a/Sakarya_f%C4%B1rat_1.jpg',
    'Sessiz Fırtına': 'https://upload.wikimedia.org/wikipedia/tr/1/15/Sessiz_F%C4%B1rt%C4%B1na_Film_Afi%C5%9Fi.jpg',
    'Sonsuz Aşk': 'https://upload.wikimedia.org/wikipedia/tr/4/48/SonsuzA%C5%9Fk.jpg',
    'Şans Kapıyı Kırınca': 'https://upload.wikimedia.org/wikipedia/tr/0/0a/%C5%9Eans_kap%C4%B1y%C4%B1_k%C4%B1r%C4%B1nca.jpg',
    'Yalnız Kalpler': 'https://upload.wikimedia.org/wikipedia/tr/5/55/LonelyHearts2006MoviePoster.jpg',
    'Yanık Koza': 'https://upload.wikimedia.org/wikipedia/tr/0/06/Yan%C4%B1kKoza.jpg',
    'Yarım Elma': 'https://upload.wikimedia.org/wikipedia/tr/5/5c/Yar%C4%B1m_Elma_dizi.jpg',
    'Yemekteyiz': 'https://upload.wikimedia.org/wikipedia/tr/9/9f/Yemekteyiz_14sezon_afis.png',
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
  console.log(`\nTotal: ${totalSeries}, Real: ${real} (${(real/totalSeries*100).toFixed(1)}%), Placeholders: ${totalSeries - real}`);
  await p.$disconnect();
})();
