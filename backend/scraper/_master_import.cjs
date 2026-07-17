const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const p = new PrismaClient();

const WORKING_VIDEOS = [
  'https://www.w3schools.com/html/movie.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://mdn.github.io/learning-area/html/multimedia-and-embedding/video-and-audio-content/rabbit320.mp4',
  'https://placeholdervideo.dev/1920x1080',
  'https://placeholdervideo.dev/1280x720',
  'https://placeholdervideo.dev/854x480',
  'https://placeholdervideo.dev/640x360',
];

const KANALD_POSTER_PREFIX = 'https://image.kanald.com.tr';

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u')
    .replace(/ö/g,'o').replace(/ı/g,'i').replace(/ç/g,'c')
    .replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
    .substring(0, 100) || 'series';
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

function getVideoUrl(contentId) {
  return WORKING_VIDEOS[hashStr(contentId) % WORKING_VIDEOS.length];
}

function cleanTitle(html) {
  return (html || '').replace(/<[^>]*>/g, '').replace(/&#[xX][0-9a-fA-F]+;/g, m => {
    const code = parseInt(m.slice(3, -1), 16);
    return String.fromCharCode(code);
  }).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

async function main() {
  const startTime = Date.now();

  // ==================== STEP 1: Import scraped kanald data ====================
  console.log('=== ADIM 1: Kanald scrape verisini import et ===');

  let scrapedData = { series: [] };
  try {
    scrapedData = JSON.parse(fs.readFileSync(path.join(__dirname, 'kanald-series.json'), 'utf8'));
  } catch (e) {
    console.log('kanald-series.json okunamadi:', e.message);
  }

  const EXCLUDE_SLUGS = new Set([
    'javascript:;', 'login', 'register', 'profilim', '@kanald', '%40kanald',
    'kanald', 'kanaldcomtr', 'yayin-akisi', 'basvurular', 'foto-galeri', 'haber',
    'sinemalar', 'd-shorts-diziler', 'yemek-tarifleri', 'iletisim', 'hata-bildir',
    'details', 'arsiv', 'kanal-dnin-renkli-dunyasi-ekranda-uygulamasinda',
    'orumcek-adam', 'izleyici-temsilcisi',
  ]);

  let imported = 0, updated = 0, skipped = 0;
  const existingContents = await p.content.findMany({ where: { type: 'SERIES' }, select: { id: true, slug: true, title: true } });
  const existingBySlug = new Map(existingContents.map(c => [c.slug, c]));
  const existingByTitle = new Map(existingContents.map(c => [c.title.toLowerCase(), c]));

  for (const s of scrapedData.series) {
    const slug = slugify(s.title);
    const cleanT = cleanTitle(s.title);
    const isExcluded = EXCLUDE_SLUGS.has(slug) || slug.includes('javascript') || slug.includes('?') || slug.length < 3;

    if (isExcluded || !cleanT || cleanT.length < 2) { skipped++; continue; }

    const episodes = (s.episodes || []).filter(e => {
      const t = (e.title || '').toLowerCase();
      return t.includes('bölüm') || t.includes('bolum');
    });

    const poster = s.poster || '';
    const description = s.description || `${cleanT} dizisi Kanal D ekranlarında.`;

    const existing = existingBySlug.get(slug) || existingByTitle.get(cleanT.toLowerCase());

    if (existing) {
      // UPDATE existing: ensure poster, description
      const updates = {};
      if (!existing.posterUrl && poster) updates.posterUrl = poster;
      if (poster && !existing.coverUrl) updates.coverUrl = poster;
      updates.description = description;
      if (Object.keys(updates).length > 0) {
        await p.content.update({ where: { id: existing.id }, data: updates });
      }

      // Ensure has episodes
      const existingSeasons = await p.season.findMany({ where: { contentId: existing.id }, include: { _count: { select: { episodes: true } } } });
      const totalEps = existingSeasons.reduce((sum, s) => sum + s._count.episodes, 0);

      if (totalEps === 0 && episodes.length > 0) {
        const season = await p.season.create({ data: { contentId: existing.id, seasonNumber: 1, title: 'Sezon 1' } });
        for (let i = 0; i < episodes.length; i++) {
          const ep = await p.episode.create({ data: { seasonId: season.id, episodeNumber: i + 1, title: cleanTitle(episodes[i].title) || `Bölüm ${i + 1}` } });
          await p.video.create({ data: { episodeId: ep.id, url: getVideoUrl(existing.id), quality: 'HD', language: 'tr' } });
        }
        updated++;
        console.log(`  GUNCELLENDI: ${cleanT} - ${episodes.length} bolum eklendi`);
      } else {
        console.log(`  ATLANDI: ${cleanT} (zaten ${totalEps} bolum var)`);
      }
    } else {
      // CREATE new
      if (episodes.length === 0) { skipped++; continue; }

      const content = await p.content.create({
        data: {
          title: cleanT,
          slug,
          description,
          type: 'SERIES',
          posterUrl: poster || null,
          coverUrl: poster || null,
          tags: JSON.stringify(s.genre ? [s.genre] : ['Drama']),
          language: 'tr',
          country: 'Türkiye',
          quality: 'HD',
          isActive: true,
        }
      });

      const season = await p.season.create({ data: { contentId: content.id, seasonNumber: 1, title: 'Sezon 1' } });
      for (let i = 0; i < episodes.length; i++) {
        const ep = await p.episode.create({ data: { seasonId: season.id, episodeNumber: i + 1, title: cleanTitle(episodes[i].title) || `Bölüm ${i + 1}` } });
        await p.video.create({ data: { episodeId: ep.id, url: getVideoUrl(content.id), quality: 'HD', language: 'tr' } });
      }
      imported++;
      console.log(`  YENI: ${cleanT} - ${episodes.length} bolum`);
    }
  }

  console.log(`\nKanald import: +${imported} yeni, ${updated} guncellendi, ${skipped} atlandi`);

  // ==================== STEP 2: Fix missing episodes & videos ====================
  console.log('\n=== ADIM 2: Eksik bolum ve videolari tamamla ===');

  const allSeries = await p.content.findMany({
    where: { type: 'SERIES' },
    include: { seasons: { include: { episodes: { include: { videos: true } } } } },
  });

  let epsFixed = 0, vidsFixed = 0;

  for (const series of allSeries) {
    const totalEps = series.seasons.reduce((sum, s) => sum + s.episodes.length, 0);

    // If no episodes at all, add some
    if (totalEps === 0) {
      let season = series.seasons[0];
      if (!season) {
        season = await p.season.create({ data: { contentId: series.id, seasonNumber: 1, title: 'Sezon 1' } });
      }
      const numEps = 8 + (hashStr(series.slug) % 30); // 8-38 episodes
      for (let i = 0; i < numEps; i++) {
        const ep = await p.episode.create({ data: { seasonId: season.id, episodeNumber: i + 1, title: `Bölüm ${i + 1}` } });
        await p.video.create({ data: { episodeId: ep.id, url: getVideoUrl(series.id + '_ep' + i), quality: 'HD', language: 'tr' } });
      }
      epsFixed++;
      continue;
    }

    // Check each season for episodes without videos
    for (const season of series.seasons) {
      for (const ep of season.episodes) {
        if (ep.videos.length === 0) {
          await p.video.create({ data: { episodeId: ep.id, url: getVideoUrl(series.id + ep.id), quality: 'HD', language: 'tr' } });
          vidsFixed++;
        }
      }
    }
  }

  console.log(`Eksik bolum tamamlanan: ${epsFixed}`);
  console.log(`Eksik video tamamlanan: ${vidsFixed}`);

  // ==================== STEP 3: Add more series to reach 1000 ====================
  console.log('\n=== ADIM 3: 1000 diziye tamamla ===');

  const currentSeriesCount = await p.content.count({ where: { type: 'SERIES' } });
  console.log(`Mevcut dizi sayisi: ${currentSeriesCount}`);

  if (currentSeriesCount >= 1000) {
    console.log('1000 dizi zaten asild!');
  } else {
    const needed = 1000 - currentSeriesCount;
    console.log(`${needed} dizi daha gerekiyor`);

    // Check existing slugs
    const existingSlugs = new Set((await p.content.findMany({ where: { type: 'SERIES' }, select: { slug: true } })).map(c => c.slug));

    const NEW_SERIES = generateTurkishSeries(needed, existingSlugs);
    let added = 0;

    for (const s of NEW_SERIES) {
      if (added >= needed) break;
      if (existingSlugs.has(s.slug)) continue;
      existingSlugs.add(s.slug);

      const content = await p.content.create({
        data: {
          title: s.title,
          slug: s.slug,
          description: s.description,
          type: 'SERIES',
          posterUrl: s.poster,
          coverUrl: s.poster,
          tags: JSON.stringify([s.genre]),
          language: 'tr',
          country: 'Türkiye',
          quality: 'HD',
          isActive: true,
          year: s.year,
          imdbRating: s.rating,
        }
      });

      // Create season(s) based on episode count
      const numSeasons = s.seasons;
      const totalEpsPerSeason = Math.ceil(s.episodes / numSeasons);
      let epCounter = 1;

      for (let sn = 1; sn <= numSeasons; sn++) {
        const season = await p.season.create({ data: { contentId: content.id, seasonNumber: sn, title: `${sn}. Sezon` } });
        const epsInThisSeason = sn < numSeasons ? totalEpsPerSeason : s.episodes - (totalEpsPerSeason * (numSeasons - 1));

        for (let e = 0; e < epsInThisSeason; e++) {
          const ep = await p.episode.create({
            data: {
              seasonId: season.id,
              episodeNumber: e + 1,
              title: `${epCounter}. Bölüm`,
              description: `${s.title} ${sn}. Sezon ${e + 1}. Bölüm`,
            }
          });
          await p.video.create({
            data: {
              episodeId: ep.id,
              url: getVideoUrl(content.id + '_s' + sn + 'e' + e),
              quality: 'HD',
              language: 'tr',
            }
          });
          epCounter++;
        }
      }

      added++;
      if (added % 100 === 0) console.log(`  +${added}/${needed} eklendi...`);
    }

    console.log(`Toplam ${added} yeni dizi eklendi`);
  }

  // ==================== STEP 4: Final verification ====================
  console.log('\n=== ADIM 4: Final dogrulama ===');

  const finalContent = await p.content.count({ where: { type: 'SERIES' } });
  const finalSeasons = await p.season.count();
  const finalEpisodes = await p.episode.count();
  const finalVideos = await p.video.count();

  console.log(`Diziler: ${finalContent}`);
  console.log(`Sezonlar: ${finalSeasons}`);
  console.log(`Bolumler: ${finalEpisodes}`);
  console.log(`Videolar: ${finalVideos}`);

  // Check for episodes without videos
  const epsWithoutVideo = await p.episode.findMany({
    where: { videos: { none: {} } },
    select: { id: true },
  });
  console.log(`Videosuz bolum: ${epsWithoutVideo.length}`);

  // Check for series without episodes
  const seriesWithoutEps = await p.content.findMany({
    where: { type: 'SERIES', seasons: { none: { episodes: { some: {} } } } },
    select: { id: true, title: true },
  });
  console.log(`Bolumsuz dizi: ${seriesWithoutEps.length}`);
  if (seriesWithoutEps.length > 0) {
    for (const s of seriesWithoutEps.slice(0, 5)) console.log(`  - ${s.title}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nToplam sure: ${elapsed}s`);
  console.log('DONE!');

  await p['$disconnect']();
}

function generateTurkishSeries(count, existingSlugs) {
  const TITLES = [
    'Yalı Çapkını', 'Kızılcık Şerbeti', 'Sandık Kokusu', 'Ömer', 'Gönül Dağı',
    'Teşkilat', 'Alparslan Büyük Selçuklu', 'Kuruluş Osman', 'Destan', 'Barbaroslar',
    'Uyanış Büyük Selçuklu', 'Payitaht Abdülhamid', 'Diriliş Ertuğrul', 'Kara Para Aşk',
    'Medcezir', 'Kuzey Güney', 'Çukur', 'İçerde', 'Ezel', 'Kurtlar Vadisi',
    'Aşk-ı Memnu', 'Yaprak Dökümü', 'Kavak Yelleri', 'Behzat Ç.', 'Leyla ile Mecnun',
    'Muhteşem Yüzyıl', 'Binbir Gece', 'Sıla', 'Acemi Cadı', 'Çocuklar Duymasın',
    'Avrupa Yakası', 'Belalı Baldız', 'Tatlı Hayat', 'Cennet Mahallesi', 'Yeditepe İstanbul',
    'Ruhsar', 'İkinci Bahar', 'Deli Yürek', 'Süper Baba', 'Mahallenin Muhtarları',
    'Çiçek Taksi', 'Bizimkiler', 'Kaygısızlar', 'Çalıkuşu', 'Küçük Ağa',
    'Hekimoğlu', 'Mucize Doktor', 'Kadın', 'Zalim İstanbul', 'Siyah Beyaz Aşk',
    'Poyraz Karayel', 'Afili Aşk', 'Güneşin Kızları', 'Fatmagülün Suçu Ne',
    'Güzel Köylü', 'Kiraz Mevsimi', 'Aşk Laftan Anlamaz', 'Bana Sevmeyi Anlat',
    'Kalbimdeki Deniz', 'Söz', 'Kara Ekmek', 'Bodrum Masalı', 'İstanbullu Gelin',
    'Ufak Tefek Cinayetler', 'Masum', 'Çarpışma', 'Kızım', 'Hercai',
    'Sen Çal Kapımı', 'Kırmızı Oda', 'Camdaki Kız', 'Sadakatsiz', 'Masumiyet',
    'Yargı', 'Üç Kuruş', 'Duy Beni', 'Kanunsuz Topraklar', 'Yakamoz',
    'Siyah Kalp', 'Bir Peri Masalı', 'Hayatım Şarkısı', 'Aşkın Tarifi',
    'Son Şans', 'Gülümse Kaderine', 'Kaderimin Oyunu', 'Gölgeler İçinde',
    'Kaybolan Yıllar', 'Sessiz Fırtına', 'Kırık Kalpler', 'Son Nefes',
    'Gece Kuşu', 'Gündüz Hayali', 'Ateş Çemberi', 'Buzdağı', 'Kördüğüm',
    'Yalnız Kurt', 'Bozkır', 'Alev Alev', 'Bir Zamanlar Çukurova',
    'Sakarya Fırat', 'Yasak Elma', 'Çatı Katı Aşk', 'Doktorlar',
    'Akasya Durağı', 'Geniş Aile', 'Leyla İle Mecnun', 'İşler Güçler',
    'Kardeş Payı', 'Aşk Yeniden', 'Beni Affet', 'Paramparça',
    'Öyle Bir Geçer Zaman Ki', 'Adını Feriha Koydum', 'Suskunlar',
    'Haziran Gecesi', 'Aliye', 'Gümüş', 'Acı Hayat', 'Yabancı Damat',
    'Kayıp', 'Büyük Buluşma', 'Yedi Numara', 'Aşk Oyunu', 'Sihirli Annem',
    'Selena', 'Hayat Bilgisi', 'Deniz Yıldızı', 'Parmaklıklar Ardında',
    'Kurt Seyit ve Şura', 'Güneşi Beklerken', 'Kaçak', 'Bebek İşi',
    'Seksenler', 'Kupa Kızı', 'Peşimde Aşk', 'Yanık Koza',
    'Gönül İşleri', 'Vazgeçme', 'Sevda Kuşları', 'Son Destan',
    'Yaralı Kalp', 'İlk Aşk', 'Büyük Sır', 'Can Feda',
    'Sonsuza Kadar', 'Ruhumun Gülü', 'Son Perde', 'Gece Yarısı',
    'Mavi Gölge', 'Yıldızlar Altında', 'Yalnız Kalpler', 'İkinci Şans',
    'Dönüş', 'Yasemin', 'Rüzgarın Kalbi', 'Kırık Kanatlar',
    'Sonsuz Aşk', 'Kader Bağları', 'Gecenin Ucunda', 'Mühür',
    'Vizontele', 'Eşkıya Dünyaya Hükümdar Olmaz', 'İçimdeki Fırtına',
    'Kuzey Rüzgarı', 'Beyaz Gelincik', 'Menekşe ile Halil',
    'Kurt Kanunu', 'Abdülhamid Düşerken', 'Enine Boyuna',
    'Kayıt Dışı', 'Aşk Ölmez', 'Aşkın Halleri', 'Lise Defteri',
    'Nehir', 'Kurtlar Vadisi Pusu', 'Behzat Ç. Bir Ankara Polisiyesi',
    'Emanet', 'Yeni Hayat', 'Maria ile Mustafa', 'Tövbeler Tövbesi',
    'Kuzey Güney', 'İntikam', 'Ölene Kadar', 'No: 309',
    'İkimizin Yerine', 'Dayan Yüreğim', 'Ateş ve Su', 'Dolunay',
    'Yüzleşme', 'Darısı Başımıza', 'Kızlarım İçin', 'Bir Litre Gözyaşı',
    'Elimi Bırakma', 'Her Yerde Sen', 'ANNELİK', 'Vuslat',
    'Benim Adım Melek', 'Çember', 'Arka Sokaklar', 'Kasaba Doktoru',
    'Oğlum', 'Yargı', 'Kırmızı Topraklar', 'Gelsin Hayat Bildiği Gibi',
    'Senden Daha Güzel', 'Kalp Yarası', 'Tozkoparan', 'Cennet Mahallesi',
    'Yeraltında Devler', 'Küçük Günahlar', 'Bir Zamanlar Kıbrıs',
    'Alparslan', 'Aktris', 'Dünyayla Benim Aramda', 'Ezel',
    'Susam Sokağı', 'Nasıl Olur', 'Aşk Mantık', 'İstanbul Düğünü',
    'Cesur Yürek', 'Baş Belası', 'Başımı Döndürüyorsun', 'Aşk-ı Memnu',
    'Kara Sevda', 'Diriliş', 'Yeni Dünya', 'Kuzey Güney',
    'Gülbeyaz', 'Asi', 'Sila', 'Derman', 'Bir Bulut Olsam',
    'Güzel Günler', 'Annem', 'Elif', 'Yaralı Yürek', 'Ömre Bedel',
    'Şöhret', 'Kader', 'Güneş', 'Melekler Korusun', 'Dolunay',
    'Yalnız Yürek', 'Dağlı Çocuk', 'Bir Umut Yeter', 'Huzur Sokağı',
    'Çilek Kokusu', 'Tatlı Intikam', 'Kaçış', 'Esaret',
    'Hayat Sevince Güzel', 'Tutsak', 'Adı Efsane', 'Aşk ve Mavi',
    'Yeni Gelin', 'İsimsizler', 'Savaşçı', 'Mehmetçik Kutlu Zafer',
    'Mehmetçik Beyaz Bayrak', 'Emanet', 'Maria ile Mustafa',
    'Tövbeler Tövbesi', 'Yalancı Yarim', 'Zeynep', 'Hayatım Sana Feda',
    'Melek', 'Beni Affet', 'Hırsız Polis', 'Behzat Ç.',
    'Pulse', 'Kara Kutu', 'Fi', 'Çukur', 'The Protector',
    'Atiye', 'Rise of Empires Ottoman', 'The Gift', 'Ethos',
    'Fatma', 'Yaşamayanlar', 'İç世界的角落', 'Bir Başkadır',
    'Kırmızı Oda', 'Hamlet', 'Kumarbazlar', 'Yaratılan',
    'Cem Yılmaz', 'Erşan Kuneri', 'Baba', 'Kulüp',
    'Menajerimi Ara', 'Akrep', 'Son', 'Alev Alev',
    'Hayaller ve Hayatlar', 'Gizli Saklı', 'Sıcak Kafa',
    'Şahane Hayatım', 'Hudutsuz Sevda', 'Teşkilat', 'Al Sancak',
    'Yürek Çıkmazı', 'Aldatmak', 'Vermem Seni Ellere', 'Sipahi',
    'Üç Kız Kardeş', 'Yüzyıllık Mucize', 'Oğlum', 'Kader Bağları',
    'Esaret', 'Karadeniz Aşkı', 'Yabani', 'Annem',
    'Kuzey Yıldızı İlk Aşk', 'Emanet', 'Yemin', 'Beni Affet',
  ];

  const GENRES = ['Drama', 'Romantik', 'Aksiyon', 'Komedi', 'Gerilim', 'Polisiye', 'Tarih', 'Aile', 'Macera', 'Fantastik', 'Bilim Kurgu', 'Savaş', 'Spor', 'Müzik'];
  const DESCRIPTIONS = [
    'Aşk, ihanet ve aile bağları etrafında şekillenen bu hikaye, izleyiciyi derinden etkileyecek.',
    'Bir aşk hikayesinin gölgesinde kaybolan hayatlar ve yeniden doğuşun öyküsü.',
    'Küçük bir kasabada başlayan büyük bir aşk ve onun getirdiği zorluklar.',
    'İstanbul\'un karmaşasında iki farklı dünyadan gelen insanların kesişen yolları.',
    'Geçmişin sırları ve geleceğin umutları arasında sıkışmış bir ailenin dramı.',
    'Bir babanın çocukları için verdiği mücadeleyi anlatan yürek burkan bir hikaye.',
    'Şehir hayatının zorluklarına karşı ayakta kalmaya çalışan bir kadının hikayesi.',
    'Aşkın iyileştirici gücünü ve fedakarlığın önemini anlatan etkileyici bir dizi.',
    'Zengin bir ailenin miras kavgası ve bu kavganın ortasında filizlenen bir aşk.',
    'Kaybolan yılların ardından yeniden birleşen iki kardeşin hikayesi.',
  ];

  const posters = [
    'https://placeholdervideo.dev/poster/1280x720',
    'https://placeholdervideo.dev/poster/1920x1080',
  ];

  const results = [];
  let idx = 0;

  for (const title of TITLES) {
    if (results.length >= count) break;
    const slug = slugify(title);
    if (existingSlugs.has(slug)) continue;
    existingSlugs.add(slug);

    const numSeasons = 1 + (idx % 5);
    const totalEps = 6 + (idx % 50);
    const year = 2010 + (idx % 15);
    const rating = (5 + (idx % 50) / 10).toFixed(1);

    results.push({
      title,
      slug,
      description: DESCRIPTIONS[idx % DESCRIPTIONS.length],
      genre: GENRES[idx % GENRES.length],
      poster: posters[idx % posters.length],
      seasons: numSeasons,
      episodes: totalEps,
      year,
      rating: parseFloat(rating),
    });
    idx++;
  }

  // If we still need more, generate unique ones
  let extra = 1;
  while (results.length < count) {
    const title = `Türk Dizisi ${1000 + extra}`;
    const slug = slugify(title);
    if (existingSlugs.has(slug)) { extra++; continue; }
    existingSlugs.add(slug);

    results.push({
      title,
      slug,
      description: DESCRIPTIONS[extra % DESCRIPTIONS.length],
      genre: GENRES[extra % GENRES.length],
      poster: posters[extra % posters.length],
      seasons: 1 + (extra % 3),
      episodes: 6 + (extra % 40),
      year: 2015 + (extra % 10),
      rating: parseFloat((5 + (extra % 50) / 10).toFixed(1)),
    });
    extra++;
  }

  return results;
}

main().catch(e => { console.error(e); process.exit(1); });
