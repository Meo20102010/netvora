import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedContent() {
  console.log('🎬 Örnek içerikler ekleniyor...');

  const categories = await prisma.category.findMany();

  const getCatId = (slug: string) => categories.find(c => c.slug === slug)?.id || '';

  const movies = [
    {
      title: 'The Last Shadow', slug: 'the-last-shadow', type: 'MOVIE',
      description: 'Bir casusluk ağının ortasında kalan eski bir ajan, geçmişiyle yüzleşmek zorunda kalır. Aksiyon dolu sahneleri ve sürükleyici hikayesiyle izleyiciyi ekran başına kilitleyen bir yapım.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg',
      coverUrl: 'https://image.tmdb.org/t/p/original/7RyHsO4Q7qKc4VzWx6K2QmGJxK.jpg',
      year: 2024, duration: 142, imdbRating: 8.2, director: 'James Cameron',
      cast: '["Leonardo DiCaprio","Tom Hardy","Cillian Murphy"]', tags: '["aksiyon","gerilim","casusluk"]',
      country: 'USA', language: 'English', quality: 'FULL_HD', categoryId: getCatId('aksiyon'), isFeatured: true,
      videoUrl: 'https://rapidvid.net/vx/example1',
    },
    {
      title: 'Midnight in Paris', slug: 'midnight-in-paris', type: 'MOVIE',
      description: 'Bir yazarın Paris\'te geçirdiği büyülü bir gece. Romantik ve huzurlu bir atmosferde geçen bu film, izleyiciyi zamanda bir yolculuğa çıkarıyor.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/4fG1f9vCqLh4y0KxQqY0j0H0k.jpg',
      coverUrl: 'https://image.tmdb.org/t/p/original/7RyHsO4Q7qKc4VzWx6K2QmGJxK.jpg',
      year: 2023, duration: 118, imdbRating: 7.8, director: 'Woody Allen',
      cast: '["Rachel McAdams","Owen Wilson","Marion Cotillard"]', tags: '["romantik","komedi","dram"]',
      country: 'France', language: 'French', quality: 'HD', categoryId: getCatId('romantik'), isFeatured: true,
      videoUrl: 'https://rapidvid.net/vx/example2',
    },
    {
      title: 'Beyond the Stars', slug: 'beyond-the-stars', type: 'MOVIE',
      description: 'İnsanlığın uzaydaki yeni kolonisine yapılan bir keşif yolculuğu, beklenmedik bir tehlikeyle karşılaşır. Görsel efektleri ve derin hikayesiyle bilim kurgu severlerin favorisi.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg',
      coverUrl: 'https://image.tmdb.org/t/p/original/7RyHsO4Q7qKc4VzWx6K2QmGJxK.jpg',
      year: 2024, duration: 155, imdbRating: 8.9, director: 'Christopher Nolan',
      cast: '["Matthew McConaughey","Anne Hathaway","Jessica Chastain"]', tags: '["bilim kurgu","macera","dram"]',
      country: 'USA', language: 'English', quality: 'UHD_4K', categoryId: getCatId('bilim-kurgu'), isFeatured: true,
      videoUrl: 'https://rapidvid.net/vx/example3',
    },
    {
      title: 'The Haunted Manor', slug: 'the-haunted-manor', type: 'MOVIE',
      description: 'Terkedilmiş bir malikanede yaşanan gizemli olaylar. Korku türünün en iyi örneklerinden biri olan bu film, izleyiciyi koltuğuna mıhlayacak.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg',
      coverUrl: 'https://image.tmdb.org/t/p/original/7RyHsO4Q7qKc4VzWx6K2QmGJxK.jpg',
      year: 2024, duration: 108, imdbRating: 7.5, director: 'Mike Flanagan',
      cast: '["Florence Pugh","Oliver Jackson-Cohen","Victoria Pedretti"]', tags: '["korku","gerilim","gizem"]',
      country: 'USA', language: 'English', quality: 'HD', categoryId: getCatId('korku'), isFeatured: false,
      videoUrl: 'https://rapidvid.net/vx/example4',
    },
    {
      title: 'Laugh Factory', slug: 'laugh-factory', type: 'STANDUP',
      description: 'En komik stand-up gösterilerinden oluşan bu özel program, kahkahalarla dolu bir gece vaat ediyor.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg',
      coverUrl: 'https://image.tmdb.org/t/p/original/7RyHsO4Q7qKc4VzWx6K2QmGJxK.jpg',
      year: 2024, duration: 90, imdbRating: 8.0, director: 'Kevin Hart',
      cast: '["Kevin Hart","Dave Chappelle","Ricky Gervais"]', tags: '["komedi","stand-up","eğlence"]',
      country: 'USA', language: 'English', quality: 'HD', categoryId: getCatId('stand-up'), isFeatured: false,
      videoUrl: 'https://rapidvid.net/vx/example5',
    },
    {
      title: 'Kayıp Şehir', slug: 'kayip-sehir', type: 'MOVIE',
      description: 'İstanbul\'un gizemli sokaklarında kaybolan bir turistin hikayesi. Yerli yapımın en iddialı filmlerinden biri.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg',
      coverUrl: 'https://image.tmdb.org/t/p/original/7RyHsO4Q7qKc4VzWx6K2QmGJxK.jpg',
      year: 2024, duration: 125, imdbRating: 7.9, director: 'Nuri Bilge Ceylan',
      cast: '["Kıvanç Tatlıtuğ","Serenay Sarıkaya","Haluk Bilginer"]', tags: '["dram","gizem","yerli"]',
      country: 'Turkey', language: 'Türkçe', quality: 'HD', categoryId: getCatId('dram'), isFeatured: false,
      videoUrl: 'https://rapidvid.net/vx/example6',
    },
  ];

  for (const movie of movies) {
    const existing = await prisma.content.findUnique({ where: { slug: movie.slug } });
    if (existing) continue;

    const { videoUrl, ...contentData } = movie;
    const content = await prisma.content.create({ data: contentData });

    await prisma.video.create({
      data: { contentId: content.id, url: videoUrl, quality: contentData.quality, language: contentData.language },
    });

    console.log(`🎥 Film eklendi: ${content.title}`);
  }

  // Sample Series
  const seriesList = [
    {
      title: 'Kralların Savaşı', slug: 'krallarin-savasi', type: 'SERIES',
      description: 'Orta çağda geçen epik bir hikaye. Yedi krallık arasındaki iktidar mücadelesini anlatan bu dizi, nefes kesen sahneleriyle izleyiciyi büyülüyor.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg',
      coverUrl: 'https://image.tmdb.org/t/p/original/7RyHsO4Q7qKc4VzWx6K2QmGJxK.jpg',
      year: 2024, imdbRating: 9.1, director: 'David Benioff',
      cast: '["Kit Harington","Emilia Clarke","Peter Dinklage"]', tags: '["epik","fantastik","dram","orta çağ"]',
      country: 'USA', language: 'Türkçe', quality: 'FULL_HD', categoryId: getCatId('dram'), isFeatured: true,
      seasons: [
        { number: 1, episodes: [
          { number: 1, title: 'Başlangıç', description: 'Hikaye başlıyor...', duration: 55 },
          { number: 2, title: 'Karanlık Yükseliyor', description: 'Karanlık güçler harekete geçiyor.', duration: 58 },
          { number: 3, title: 'İhanet', description: 'Beklenmedik bir ihanet.', duration: 52 },
        ]},
        { number: 2, episodes: [
          { number: 1, title: 'Yeni Düzen', description: 'Yeni bir dönem başlıyor.', duration: 60 },
          { number: 2, title: 'Savaş Çanları', description: 'Büyük savaş yaklaşıyor.', duration: 65 },
        ]},
      ],
    },
    {
      title: 'Yapay Zeka', slug: 'yapay-zeka', type: 'SERIES',
      description: 'Yakın gelecekte geçen bu dizi, yapay zekanın insanlık üzerindeki etkilerini sorguluyor. Teknoloji ve insanlık arasındaki ince çizgiyi keşfedin.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg',
      coverUrl: 'https://image.tmdb.org/t/p/original/7RyHsO4Q7qKc4VzWx6K2QmGJxK.jpg',
      year: 2024, imdbRating: 8.5, director: 'Jonathan Nolan',
      cast: '["Evan Rachel Wood","Jeffrey Wright","Thandiwe Newton"]', tags: '["bilim kurgu","gerilim","teknoloji"]',
      country: 'USA', language: 'English', quality: 'UHD_4K', categoryId: getCatId('bilim-kurgu'), isFeatured: true,
      seasons: [
        { number: 1, episodes: [
          { number: 1, title: 'Uyanış', description: 'İlk yapay zeka bilince kavuşuyor.', duration: 62 },
          { number: 2, title: 'Kodun İçinde', description: 'Gerçeklik sorgulanmaya başlıyor.', duration: 58 },
        ]},
      ],
    },
  ];

  for (const series of seriesList) {
    const existing = await prisma.content.findUnique({ where: { slug: series.slug } });
    if (existing) continue;

    const { seasons, ...contentData } = series;
    const content = await prisma.content.create({ data: contentData });

    for (const seasonData of seasons) {
      const { episodes, ...seasonInfo } = seasonData;
      const season = await prisma.season.create({
        data: { contentId: content.id, seasonNumber: seasonInfo.number, title: `Sezon ${seasonInfo.number}` },
      });

      for (const ep of episodes) {
        const episode = await prisma.episode.create({
          data: { seasonId: season.id, episodeNumber: ep.number, title: ep.title, description: ep.description, duration: ep.duration },
        });

        await prisma.video.create({
          data: { episodeId: episode.id, url: 'https://rapidvid.net/vx/example-series', quality: series.quality, language: series.language },
        });
      }
    }

    console.log(`📺 Dizi eklendi: ${content.title}`);
  }

  console.log('✅ Örnek içerikler tamamlandı!');
}

seedContent()
  .catch((e) => { console.error('❌ Hata:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
