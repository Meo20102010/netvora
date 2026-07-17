const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const SERIES_NAMES = [
  'Sevda Kuşları', 'Yalı Çapkını', 'Kızılcık Şerbeti', 'Sandık Kokusu', 'Ömer',
  'Gönül Dağı', 'Teşkilat', 'Alparslan Büyük Selçuklu', 'Kuruluş Osman', 'Destan',
  'Barbaroslar Akdeniz\'in Kılıcı', 'Uyanış Büyük Selçuklu', 'Payitaht Abdülhamid',
  'Mehmed Bir Cihan Fatihi', 'Diriliş Ertuğrul', 'Kara Para Aşk', 'Medcezir',
  'Kuzey Güney', 'Çukur', 'İçerde', 'Ezel', 'Kurtlar Vadisi', 'Aşk-ı Memnu',
  'Yaprak Dökümü', 'Kavak Yelleri', 'Behzat Ç.', 'Leyla ile Mecnun', 'Muhteşem Yüzyıl',
  'Binbir Gece', 'Sıla', 'Acemi Cadı', 'Çocuklar Duymasın', 'Avrupa Yakası',
  'Belalı Baldız', 'Tatlı Hayat', 'Cennet Mahallesi', 'Yeditepe İstanbul',
  'Ruhsar', 'İkinci Bahar', 'Deli Yürek', 'Süper Baba', 'Mahallenin Muhtarları',
  'Çiçek Taksi', 'Bizimkiler', 'Kaygısızlar', 'Uğurlugil Ailesi', 'Çalıkuşu',
  'Küçük Ağa', 'Hekimoğlu', 'Mucize Doktor', 'Kadın', 'Zalim İstanbul',
  'Siyah Beyaz Aşk', 'Poyraz Karayel', 'Afili Aşk', 'Güneşin Kızları',
  'Fatmagül\'ün Suçu Ne?', 'Kuzey Güney', 'Annem', 'Güzel Köylü', 'Kiraz Mevsimi',
  'Aşk Laftan Anlamaz', 'Bana Sevmeyi Anlat', 'Kalbimdeki Deniz', 'Söz',
  'Kara Ekmek', 'Bodrum Masalı', 'İstanbullu Gelin', 'Ufak Tefek Cinayetler',
  'Masum', 'Çarpışma', 'Kızım', 'Hercai', 'Sen Çal Kapımı', 'Kırmızı Oda',
  'Camdaki Kız', 'Sadakatsiz', 'Masumiyet', 'Yargı', 'Baş Oğlan',
  'Üç Kuruş', 'Duy Beni', 'Kanunsuz Topraklar', 'Yakamoz', 'O Kız',
  'Siyah Kalp', 'Bir Peri Masalı', 'Bir Teselli Ver', 'Hayatım Şarkısı',
  'Aşkın Tarifi', 'Ben Hayatta Değilim', 'Son Şans', 'Gülümse Kaderine',
  'Yarım Elma', 'Kaderimin Oyunu', 'Siyah Giyen Adam', 'Gölgeler İçinde',
  'Kaybolan Yıllar', 'Sessiz Fırtına', 'Kanayan Yara', 'Kırık Kalpler',
  'Son Nefes', 'Gece Kuşu', 'Gündüz Hayali', 'Ateş Çemberi', 'Buzdağı',
  'Kopuk', 'Kördüğüm', 'Yalnız Kurt', 'Bozkır', 'Alev Alev',
  'Bir Zamanlar Çukurova', 'Ya İstiklal Ya Ölüm', 'Kıbrıs Zafere Doğru',
  'Sakarya Fırat', 'Kim Milyoner Olmak İster?', 'Survivor', 'MasterChef Türkiye',
  'O Ses Türkiye', 'Yetenek Sizsiniz Türkiye', 'Piramit', 'Buzdağı Dans',
  'Yemekteyiz', 'Zuhuratbaba', 'Yasak Elma', 'Çatı Katı Aşk',
  'Doktorlar', 'Akasya Durağı', 'Geniş Aile', 'Arkadaşım Hoşgeldin',
  'Leyla İle Mecnun', 'İşler Güçler', 'Kardeş Payı', 'Ben de Özledim',
  'Aşk Yeniden', 'Kiraz Mevsimi', 'Kocamın Ailesi', 'Beni Affet',
  'Kalbim Ege\'de Kaldı', 'Babalar ve Evlatlar', 'Kayıp Şehir',
  'Paramparça', 'Küçük Kadınlar', 'Öyle Bir Geçer Zaman Ki',
  'Adını Feriha Koydum', 'Kuzey Rüzgarı', 'Suskunlar', 'Şefkat Tepe',
  'Kurt Kanunu', 'Beyaz Gelincik', 'Menekşe ile Halil', 'Haziran Gecesi',
  'Aliye', 'Gümüş', 'Acı Hayat', 'Yabancı Damat', 'Yarım Elma',
  'Kayıp', 'Çılgın Dersane', 'Büyük Buluşma', 'Sila', 'Yedi Numara',
  'Aşk Oyunu', 'Sihirli Annem', 'Selena', 'Komedi Dükkanı', 'Çok Güzel Hareketler Bunlar',
  'Kara Gün', 'Kapanmış Defterler', 'Aşkın Halleri', 'Hayat Bilgisi',
  'Lise Defteri', 'Nehir', 'Deniz Yıldızı', 'Parmaklıklar Ardında',
  'Kurt Seyit ve Şura', 'Güneşi Beklerken', 'Kaçak', 'Bebek İşi',
  'Abdülhamid Düşerken', 'Seksenler', 'Aileler Yarışıyor', 'Enine Boyuna',
  'Kayıt Dışı', 'Kupa Kızı', 'Peşimde Aşk', 'Aşk Ölmez',
  'Yanık Koza', 'Ah Kalbim', 'Vazgeçme', 'Gönül İşleri',
  'Yasaklı', 'Umutsuz Ev Kadınları', 'Kalbimdeki Deniz', 'Güllerin Savaşı',
  'Sevda Kuşları', 'Duygular', 'Son Destan', 'Anadolu Kartalları',
  'Yaralı Kalp', 'İlk Aşk', 'Büyük Sır', 'Hayata Dön',
  'Can Feda', 'Köken', 'Sonsuza Kadar', 'Ruhumun Gülü',
  'Son Perde', 'Gece Yarısı', 'Mavi Gölge', 'Ateş Böceği',
  'Yıldızlar Altında', 'Şans Kapıyı Kırınca', 'Yalnız Kalpler',
  'İkinci Şans', 'Dönüş', 'Yasemin', 'Rüzgarın Kalbi',
  'Kırık Kanatlar', 'Sonsuz Aşk', 'Yalnız Kurt', 'Kayıp Ruhlar',
  'Kader Bağları', 'Işıltılar', 'Gecenin Ucunda', 'Zamanın Ötesinde',
  'Mühür', 'Kutsal Damacana', 'Vizontele', 'Eşkıya Dünyaya Hükümdar Olmaz',
];

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
  'Bir annenin çocukları için verdiği amansız mücadeleyi konu alıyor.',
  'Adalet arayışında bir avukatın ve onun sorguladığı değerlerin öyküsü.',
  'Hayallerinin peşinden koşan genç bir kadının karşılaştığı engeller.',
  'Baba ocağından kopup büyük şehre gelen bir gencin var olma savaşı.',
  'Savaşın ortasında filizlenen yasak bir aşkın dramatik hikayesi.',
  'Bir mahallenin sıcak komşuluk ilişkileri ve günlük yaşam mücadeleleri.',
  'Eski bir istihbaratçının geçmişiyle yüzleşmesini anlatan aksiyon dolu hikaye.',
  'Bir öğretmenin köydeki öğrencileri için verdiği mücadeleyi anlatıyor.',
  'Genç bir doktorun mesleki ve kişisel gelişimini konu alan etkileyici dizi.',
  'Polisiye bir olayın peşinde kaybolan dedektifin gerçeklerle yüzleşmesi.',
];

const TAGS = ['Dram', 'Komedi', 'Aksiyon', 'Romantik', 'Polisiye', 'Tarihi', 'Gerilim', 'Gençlik', 'Aile', 'Psikolojik'];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9çğıöşü]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  const target = 3500;
  const existing = await p.content.count({ where: { type: 'SERIES' } });
  const needed = target - existing;
  if (needed <= 0) { console.log(`Already have ${existing} series, no need to generate`); return; }

  console.log(`Need ${needed} more series...`);
  let created = 0;

  for (let i = 0; i < needed; i++) {
    const name = SERIES_NAMES[i % SERIES_NAMES.length];
    const num = Math.floor(i / SERIES_NAMES.length);
    const title = num === 0 ? name : `${name} ${num + 1}`;
    let slug = slugify(title);
    const slugBase = slug;

    let attempt = 0;
    while (await p.content.findUnique({ where: { slug } })) {
      attempt++;
      slug = `${slugBase}-${attempt}`;
    }

    const desc = DESCRIPTIONS[i % DESCRIPTIONS.length];
    const tag1 = TAGS[i % TAGS.length];
    const tag2 = TAGS[(i + 3) % TAGS.length];
    const epCount = 6 + (i % 15);
    const duration = 2400 + Math.floor(Math.random() * 1800);

    const content = await p.content.create({
      data: {
        title,
        slug,
        description: desc,
        type: 'SERIES',
        posterUrl: `https://picsum.photos/seed/${slug}/400/600`,
        tags: JSON.stringify([tag1, tag2]),
        quality: 'HD',
      },
    });

    const season = await p.season.create({
      data: { contentId: content.id, seasonNumber: 1, title: 'Sezon 1' },
    });

    const epData = [];
    for (let j = 0; j < epCount; j++) {
      epData.push({
        seasonId: season.id,
        episodeNumber: j + 1,
        title: `${j + 1}. Bölüm`,
        duration,
      });
    }
    await p.episode.createMany({ data: epData });

    const episodes = await p.episode.findMany({ where: { seasonId: season.id } });
    const vidData = episodes.map(ep => ({
      episodeId: ep.id,
      url: `https://example.com/video/${slug}/${ep.episodeNumber}`,
      quality: 'HD',
      language: 'tr',
    }));
    await p.video.createMany({ data: vidData });

    created++;
    if (created % 100 === 0) console.log(`  ${created}/${needed} series created...`);
  }

  console.log(`Created ${created} series`);
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
