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

function getVideoUrl(seed) {
  return WORKING_VIDEOS[hashStr(seed) % WORKING_VIDEOS.length];
}

function cleanTitle(html) {
  return (html || '').replace(/<[^>]*>/g, '').replace(/&#[xX][0-9a-fA-F]+;/g, m => {
    const code = parseInt(m.slice(3, -1), 16);
    return String.fromCharCode(code);
  }).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

// ======================== KANALD SCRAPED SERIES ========================
const KANALD_SERIES = [
  { title: 'Arka Sokaklar', slug: 'arka-sokaklar', episodes: 751, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/69f8f1072e1ebe9b5e9b8fb8.jpg', description: 'İstanbul sokaklarında geçen polisiye dizisi.', genre: 'Polisiye' },
  { title: 'Uzak Şehir', slug: 'uzak-sehir', episodes: 63, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34962d741ef4ddb25854.jpg', description: 'Uzak bir şehirde geçen aşk hikayesi.', genre: 'Drama' },
  { title: 'Eşref Rüya', slug: 'esref-ruya', episodes: 47, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34a22d741ef4ddb25857.jpg', description: 'Eşref adlı adamın rüyalar dünyasındaki maceraları.', genre: 'Drama' },
  { title: 'Güller ve Günahlar', slug: 'guller-ve-gunahlar', episodes: 32, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34b42d741ef4ddb2585b.jpg', description: 'Aşk, ihanet ve günahların hikayesi.', genre: 'Drama' },
  { title: 'İnci Taneleri', slug: 'inci-taneleri', episodes: 51, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/69f8f1072e1ebe9b5e9b8fb8.jpg', description: 'İnci tanecikleri gibi birbirine bağlı hayatlar.', genre: 'Drama' },
  { title: 'Daha 17', slug: 'daha-17', episodes: 31, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34dc2d741ef4ddb25864.jpg', description: 'Gençlik ve macera dolu bir hikaye.', genre: 'Drama' },
  { title: 'Kuralsız Sokaklar', slug: 'kuralsiz-sokaklar', episodes: 18, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34d22d741ef4ddb25862.jpg', description: 'Sokakların kural tanımayan hikayesi.', genre: 'Aksiyon' },
  { title: 'Vatanım Sensin', slug: 'vatanim-sensin', episodes: 59, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34b42d741ef4ddb2585b.jpg', description: 'Kurtuluş Savaşı\'nda geçen bir vatan hikayesi.', genre: 'Tarih' },
  { title: 'Siyah Beyaz Aşk', slug: 'siyah-beyaz-ask', episodes: 32, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34bd2d741ef4ddb2585d.jpg', description: 'Siyah ve beyaz kadar zıt iki insanın aşkı.', genre: 'Romantik' },
  { title: 'Zalim İstanbul', slug: 'zalim-istanbul', episodes: 39, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34c82d741ef4ddb2585f.jpg', description: 'İstanbul\'un zalim sokaklarında geçen bir hikaye.', genre: 'Drama' },
  { title: 'Poyraz Karayel', slug: 'poyraz-karayel', episodes: 82, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34d22d741ef4ddb25862.jpg', description: 'Poyraz adlı gizli ajansın hikayesi.', genre: 'Aksiyon' },
  { title: 'Afili Aşk', slug: 'afili-ask', episodes: 38, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34dc2d741ef4ddb25864.jpg', description: 'Affedici bir aşkın hikayesi.', genre: 'Romantik' },
  { title: 'Güneşin Kızları', slug: 'gunesin-kizlari', episodes: 39, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34e52d741ef4ddb25867.jpg', description: 'Güneşin sıcaklığında büyüyen kızların hikayesi.', genre: 'Drama' },
  { title: 'Fatmagülün Suçu Ne', slug: 'fatmagulunsucune', episodes: 80, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34ee2d741ef4ddb25869.jpg', description: 'Fatmagül\'ün adalet arayışı.', genre: 'Drama' },
  { title: 'Hekimoğlu', slug: 'hekimoglu', episodes: 51, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34ee2d741ef4ddb25869.jpg', description: 'Dahi doktorun hastane maceraları.', genre: 'Tıbbi' },
  { title: 'Kuzey Güney', slug: 'kuzey-guney', episodes: 80, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34962d741ef4ddb25854.jpg', description: 'İki kardeşin farklı hayatları.', genre: 'Drama' },
  { title: 'Aşk-ı Memnu', slug: 'askimemnu', episodes: 79, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34a22d741ef4ddb25857.jpg', description: 'Yasak aşkın acı hikayesi.', genre: 'Drama' },
  { title: 'İçerde', slug: 'icerde', episodes: 39, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34b42d741ef4ddb2585b.jpg', description: 'İki kardeşin polis ve mafya olarak karşı karşıya gelişi.', genre: 'Aksiyon' },
  { title: 'Çukur', slug: 'cukur', episodes: 132, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34bd2d741ef4ddb2585d.jpg', description: 'Çukur mahallesinin hikayesi.', genre: 'Aksiyon' },
  { title: 'Medcezir', slug: 'medcezir', episodes: 77, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34c82d741ef4ddb2585f.jpg', description: 'Zengin bir ailenin ve sokaktan gelen bir gencin hikayesi.', genre: 'Drama' },
  { title: 'Kara Para Aşk', slug: 'kara-para-ask', episodes: 54, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34d22d741ef4ddb25862.jpg', description: 'Para ve aşkın kara kavuşması.', genre: 'Aksiyon' },
  { title: 'Diriliş Ertuğrul', slug: 'dirilis-ertugrul', episodes: 450, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34dc2d741ef4ddb25864.jpg', description: 'Ertuğrul Bey\'in destansı hikayesi.', genre: 'Tarih' },
  { title: 'Kuruluş Osman', slug: 'kurulus-osman', episodes: 160, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34e52d741ef4ddb25867.jpg', description: 'Osman Bey\'in devlet kurma mücadelesi.', genre: 'Tarih' },
  { title: 'Payitaht Abdülhamid', slug: 'payitaht-abdulhamid', episodes: 139, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34ee2d741ef4ddb25869.jpg', description: 'Son dönem Osmanlı padişahının hayatı.', genre: 'Tarih' },
  { title: 'Yalı Çapkını', slug: 'yali-capkini', episodes: 45, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/69f8f1072e1ebe9b5e9b8fb8.jpg', description: 'Zengin bir ailenin çapkın oğlunun aşk hikayesi.', genre: 'Romantik' },
  { title: 'Kızılcık Şerbeti', slug: 'kizilcik-serifeti', episodes: 39, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34a22d741ef4ddb25857.jpg', description: 'İki ailenin birleşen hikayesi.', genre: 'Drama' },
  { title: 'Gönül Dağı', slug: 'gonul-dagi', episodes: 120, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34b42d741ef4ddb2585b.jpg', description: 'Küçük bir kasabada gönül işleri.', genre: 'Drama' },
  { title: 'Teşkilat', slug: 'teskilat', episodes: 85, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34bd2d741ef4ddb2585d.jpg', description: 'Milli istihbarat teşkilatınınOperasyonları.', genre: 'Aksiyon' },
  { title: 'Sandık Kokusu', slug: 'sandik-kokusu', episodes: 20, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34c82d741ef4ddb2585f.jpg', description: 'Sandıktan çıkan sırlar.', genre: 'Drama' },
  { title: 'Ömer', slug: 'omer', episodes: 30, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34d22d741ef4ddb25862.jpg', description: 'Ömer adlı bir gencin hayatı.', genre: 'Drama' },
  { title: 'Hayat Şarkısı', slug: 'hayat-sarkisi', episodes: 17, poster: 'https://image.kanald.com.tr/i/kanald/100/264x365/682f34dc2d741ef4ddb25864.jpg', description: 'Hayatın şarkısını söyleyenlerin hikayesi.', genre: 'Drama' },
];

// ======================== ADDITIONAL TURKISH SERIES ========================
const EXTRA_SERIES = [
  'Ezel', 'Behzat Ç.', 'Leyla ile Mecnun', 'Muhteşem Yüzyıl', 'Binbir Gece', 'Sıla',
  'Avrupa Yakası', 'Cennet Mahallesi', 'Yeditepe İstanbul', 'İkinci Bahar',
  'Deli Yürek', 'Süper Baba', 'Çalıkuşu', 'Küçük Ağa', 'Mucize Doktor',
  'Kadın', 'Sen Çal Kapımı', 'Kırmızı Oda', 'Camdaki Kız', 'Sadakatsiz',
  'Yargı', 'Üç Kuruş', 'Kanunsuz Topraklar', 'Bir Peri Masalı',
  'Kaderimin Oyunu', 'Gölgeler İçinde', 'Sessiz Fırtına', 'Son Nefes',
  'Kördüğüm', 'Yalnız Kurt', 'Bozkır', 'Alev Alev', 'Bir Zamanlar Çukurova',
  'Sakarya Fırat', 'Yasak Elma', 'Doktorlar', 'Geniş Aile', 'Kardeş Payi',
  'Aşk Yeniden', 'Beni Affet', 'Paramparça', 'Öyle Bir Geçer Zaman Ki',
  'Adını Feriha Koydum', 'Gümüş', 'Acı Hayat', 'Yabancı Damat',
  'Büyük Buluşma', 'Yedi Numara', 'Sihirli Annem', 'Hayat Bilgisi',
  'Deniz Yıldızı', 'Parmaklıklar Ardında', 'Güneşi Beklerken', 'Kaçak',
  'Seksenler', 'Eşkıya Dünyaya Hükümdar Olmaz', 'Kara Sevda',
  'İçimdeki Fırtına', 'Kuzey Rüzgarı', 'Beyaz Gelincik', 'Haziran Gecesi',
  'Aliye', 'Yeni Hayat', 'Maria ile Mustafa', 'Tövbeler Tövbesi',
  'No: 309', 'Dolunay', 'Elimi Bırakma', 'Her Yerde Sen',
  'Benim Adım Melek', 'Vuslat', 'Kasaba Doktoru', 'Oğlum',
  'Gelsin Hayat Bildiği Gibi', 'Senden Daha Güzel', 'Kalp Yarası',
  'Tozkoparan', 'Dünyayla Benim Aramda', 'Aktris', 'Çember',
  'Cesur Yürek', 'Baş Belası', 'Dağlı Çocuk', 'Bir Umut Yeter',
  'Huzur Sokağı', 'Çilek Kokusu', 'Tatlı Intikam', 'Kaçış',
  'Hayat Sevince Güzel', 'Tutsak', 'Aşk ve Mavi', 'Yeni Gelin',
  'İsimsizler', 'Savaşçı', 'Mehmetçik Kutlu Zafer', 'Esaret',
  'Kara Kutu', 'Fi', 'Atiye', 'The Gift',
  'Fatma', 'Bir Başkadır', 'Hamlet', 'Erşan Kuneri',
  'Baba', 'Kulüp', 'Akrep', 'Sıcak Kafa',
  'Şahane Hayatım', 'Hudutsuz Sevda', 'Al Sancak', 'Yürek Çıkmazı',
  'Aldatmak', 'Sipahi', 'Üç Kız Kardeş', 'Yüzyıllık Mucize',
  'Karadeniz Aşkı', 'Yabani', 'Kuzey Yıldızı İlk Aşk', 'Yemin',
  'Sevda Kuşları', 'Son Destan', 'Yaralı Kalp', 'İlk Aşk',
  'Büyük Sır', 'Can Feda', 'Sonsuza Kadar', 'Ruhumun Gülü',
  'Son Perde', 'Gece Yarısı', 'Yıldızlar Altında', 'Yalnız Kalpler',
  'İkinci Şans', 'Dönüş', 'Yasemin', 'Rüzgarın Kalbi',
  'Sonsuz Aşk', 'Kader Bağları', 'Gecenin Ucunda', 'Mühür',
  'Vizontele', 'Aşk Oyunu', 'Selena', 'Komedi Dükkanı',
  'Hayatım Sana Feda', 'Melek', 'Yalancı Yarim', 'Zeynep',
  'Bir Bulut Olsam', 'Güzel Günler', 'Annem', 'Yaralı Yürek',
  'Ömre Bedel', 'Şöhret', 'Kader', 'Güneş',
  'Melekler Korusun', 'Yalnız Yürek', 'Bir Zamanlar Kıbrıs',
  'Pulse', 'The Protector', 'Ethos', 'Yaşamayanlar',
  'Kumarbazlar', 'Yaratılan', 'Cem Yılmaz',
  'Menajerimi Ara', 'Hayaller ve Hayatlar', 'Gizli Saklı',
  'Aşk-ı Memnu', 'Yaprak Dökümü', 'Kavak Yelleri',
  'Belalı Baldız', 'Tatlı Hayat', 'Ruhsar',
  'Çiçek Taksi', 'Bizimkiler', 'Kaygısızlar',
  'Mahallenin Muhtarları', 'Acemi Cadı', 'Çocuklar Duymasın',
  'Kara Ekmek', 'Bodrum Masalı', 'İstanbullu Gelin',
  'Ufak Tefek Cinayetler', 'Masum', 'Çarpışma', 'Kızım',
  'Hercai', 'Kırmızı Yaprak', 'Masumiyet',
  'Duy Beni', 'Yakamoz', 'Siyah Kalp',
  'Bir Teselli Ver', 'Kaybolan Yıllar', 'Kırık Kalpler',
  'Gece Kuşu', 'Ateş Çemberi', 'Buzdağı',
  'Kopuk', 'Bozkır', 'Alparslan Büyük Selçuklu',
  'Destan', 'Barbaroslar Akdeniz\'in Kılıcı', 'Uyanış Büyük Selçuklu',
  'Mehmed Bir Cihan Fatihi', 'Diriliş Ertuğrul', 'Kara Sevda',
  'Medcezir', 'Kuzey Güney', 'Çukur', 'İçerde',
  'Kurtlar Vadisi', 'Yaprak Dökümü', 'Kavak Yelleri',
  'Behzat Ç.', 'Leyla ile Mecnun', 'Muhteşem Yüzyıl',
  'Binbir Gece', 'Sıla', 'Acemi Cadı', 'Çocuklar Duymasın',
  'Avrupa Yakası', 'Belalı Baldız', 'Tatlı Hayat',
  'Cennet Mahallesi', 'Yeditepe İstanbul', 'Ruhsar',
  'İkinci Bahar', 'Deli Yürek', 'Süper Baba',
  'Çalıkuşu', 'Küçük Ağa', 'Mucize Doktor', 'Kadın',
  'Zalim İstanbul', 'Siyah Beyaz Aşk', 'Poyraz Karayel',
  'Afili Aşk', 'Güneşin Kızları', 'Fatmagül\'ün Suçu Ne?',
  'Güzel Köylü', 'Kiraz Mevsimi', 'Aşk Laftan Anlamaz',
  'Kalbimdeki Deniz', 'Söz', 'İstanbullu Gelin',
  'Ufak Tefek Cinayetler', 'Masum', 'Çarpışma', 'Kızım',
  'Sen Çal Kapımı', 'Kırmızı Oda', 'Camdaki Kız',
  'Sadakatsiz', 'Masumiyet', 'Yargı', 'Üç Kuruş',
  'Duy Beni', 'Kanunsuz Topraklar', 'Yakamoz',
  'Siyah Kalp', 'Bir Peri Masalı', 'Hayatım Şarkısı',
  'Aşkın Tarifi', 'Son Şans', 'Gülümse Kaderine',
  'Kaderimin Oyunu', 'Gölgeler İçinde', 'Kaybolan Yıllar',
  'Sessiz Fırtına', 'Kırık Kalpler', 'Son Nefes',
  'Gece Kuşu', 'Gündüz Hayali', 'Ateş Çemberi',
  'Buzdağı', 'Kördüğüm', 'Yalnız Kurt', 'Bozkır',
  'Alev Alev', 'Bir Zamanlar Çukurova', 'Sakarya Fırat',
  'Yasak Elma', 'Çatı Katı Aşk', 'Doktorlar',
  'Akasya Durağı', 'Geniş Aile', 'Leyla İle Mecnun',
  'İşler Güçler', 'Kardeş Payi', 'Aşk Yeniden',
  'Beni Affet', 'Paramparça', 'Öyle Bir Geçer Zaman Ki',
  'Adını Feriha Koydum', 'Suskunlar', 'Haziran Gecesi',
  'Aliye', 'Gümüş', 'Acı Hayat', 'Yabancı Damat',
  'Kayıp', 'Büyük Buluşma', 'Yedi Numara',
  'Aşk Oyunu', 'Sihirli Annem', 'Selena',
  'Hayat Bilgisi', 'Deniz Yıldızı', 'Parmaklıklar Ardında',
  'Kurt Seyit ve Şura', 'Güneşi Beklerken', 'Kaçak',
  'Bebek İşi', 'Seksenler', 'Kupa Kızı',
  'Peşimde Aşk', 'Yanık Koza', 'Gönül İşleri',
  'Vazgeçme', 'Sevda Kuşları', 'Son Destan',
  'Yaralı Kalp', 'İlk Aşk', 'Büyük Sır', 'Can Feda',
  'Sonsuza Kadar', 'Ruhumun Gülü', 'Son Perde',
  'Gece Yarısı', 'Mavi Gölge', 'Yıldızlar Altında',
  'Yalnız Kalpler', 'İkinci Şans', 'Dönüş', 'Yasemin',
  'Rüzgarın Kalbi', 'Kırık Kanatlar', 'Sonsuz Aşk',
  'Kader Bağları', 'Gecenin Ucunda', 'Mühür',
  'Vizontele', 'Eşkıya Dünyaya Hükümdar Olmaz',
  'İçimdeki Fırtına', 'Kuzey Rüzgarı', 'Beyaz Gelincik',
  'Menekşe ile Halil', 'Kurt Kanunu', 'Abdülhamid Düşerken',
  'Enine Boyuna', 'Kayıt Dışı', 'Aşk Ölmez',
  'Aşkın Halleri', 'Lise Defteri', 'Nehir',
  'Kurtlar Vadisi Pusu', 'Behzat Ç. Bir Ankara Polisiyesi',
  'Emanet', 'Yeni Hayat', 'Maria ile Mustafa',
  'Tövbeler Tövbesi', 'No: 309', 'İkimizin Yerine',
  'Dayan Yüreğim', 'Ateş ve Su', 'Dolunay',
  'Yüzleşme', 'Darısı Başımıza', 'Kızlarım İçin',
  'Bir Litre Gözyaşı', 'Elimi Bırakma', 'Her Yerde Sen',
  'Vuslat', 'Benim Adım Melek', 'Çember',
  'Kasaba Doktoru', 'Oğlum', 'Gelsin Hayat Bildiği Gibi',
  'Senden Daha Güzel', 'Kalp Yarası', 'Tozkoparan',
  'Dünyayla Benim Aramda', 'Aktris', 'Çember',
  'Cesur Yürek', 'Baş Belası', 'Dağlı Çocuk',
  'Bir Umut Yeter', 'Huzur Sokağı', 'Çilek Kokusu',
  'Tatlı Intikam', 'Kaçış', 'Hayat Sevince Güzel',
  'Tutsak', 'Aşk ve Mavi', 'Yeni Gelin',
  'İsimsizler', 'Savaşçı', 'Mehmetçik Kutlu Zafer',
];

const GENRES = ['Drama', 'Romantik', 'Aksiyon', 'Komedi', 'Gerilim', 'Polisiye', 'Tarih', 'Aile', 'Macera', 'Fantastik'];
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

async function main() {
  const startTime = Date.now();
  console.log('=== 1000 DIZI OLUSTUR ===\n');

  // Load ALL existing slugs from DB (movies + series share unique slug)
  const existing = await p.content.findMany({ select: { slug: true } });
  const usedSlugs = new Set(existing.map(e => e.slug));
  console.log(`Mevcut icerik (tum sluglar): ${usedSlugs.size}`);

  // PHASE 1: Import kanald scraped series
  console.log('--- FAZE 1: Kanald dizileri ---');
  let count = 0;

  for (const s of KANALD_SERIES) {
    if (usedSlugs.has(s.slug)) continue;
    usedSlugs.add(s.slug);

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
        year: 2015 + (count % 10),
        imdbRating: parseFloat((6 + (count % 40) / 10).toFixed(1)),
      }
    });

    // Determine seasons
    const numSeasons = s.episodes > 100 ? Math.ceil(s.episodes / 40) : (s.episodes > 50 ? 3 : (s.episodes > 25 ? 2 : 1));
    const epsPerSeason = Math.ceil(s.episodes / numSeasons);
    let epCounter = 1;

    for (let sn = 1; sn <= numSeasons; sn++) {
      const season = await p.season.create({ data: { contentId: content.id, seasonNumber: sn, title: `${sn}. Sezon` } });
      const epsCount = sn < numSeasons ? epsPerSeason : s.episodes - (epsPerSeason * (numSeasons - 1));

      // Create episodes in batches
      const epData = [];
      const vidData = [];
      for (let e = 0; e < epsCount; e++) {
        const epId = require('crypto').randomUUID();
        epData.push({ id: epId, seasonId: season.id, episodeNumber: e + 1, title: `${epCounter}. Bölüm` });
        vidData.push({ episodeId: epId, url: getVideoUrl(content.id + '_s' + sn + 'e' + e), quality: 'HD', language: 'tr' });
        epCounter++;
      }
      await p.episode.createMany({ data: epData });
      await p.video.createMany({ data: vidData });
    }

    count++;
    if (count % 10 === 0) console.log(`  ${count} kanald dizi olusturuldu...`);
  }
  console.log(`Kanald: ${count} dizi`);

  // Deduplicate EXTRA_SERIES by slug
  const seenExtraSlugs = new Set();
  const uniqueExtra = [];
  for (const t of EXTRA_SERIES) {
    const s = slugify(t);
    if (!seenExtraSlugs.has(s)) {
      seenExtraSlugs.add(s);
      uniqueExtra.push(t);
    }
  }
  console.log(`Benzersiz ek dizi: ${uniqueExtra.length}`);

  // PHASE 2: Add extra Turkish series to reach 1000
  console.log('\n--- FAZE 2: Ek Turk dizileri ---');
  const needed = 1000 - count;

  for (let i = 0; i < needed && i < uniqueExtra.length; i++) {
    const title = uniqueExtra[i];
    const slug = slugify(title);
    if (usedSlugs.has(slug)) { console.log(`SKIP ${title} (slug ${slug} in usedSlugs)`); continue; }
    usedSlugs.add(slug);

    const numSeasons = 1 + (i % 4);
    const totalEps = 10 + (hashStr(slug) % 80);
    const genre = GENRES[i % GENRES.length];

    console.log(`  Creating: ${title} [slug: ${slug}]`);
    const content = await p.content.create({
      data: {
        title,
        slug,
        description: DESCRIPTIONS[i % DESCRIPTIONS.length],
        type: 'SERIES',
        tags: JSON.stringify([genre]),
        language: 'tr',
        country: 'Türkiye',
        quality: 'HD',
        isActive: true,
        year: 2005 + (i % 20),
        imdbRating: parseFloat((5 + (i % 50) / 10).toFixed(1)),
      }
    });

    const epsPerSeason = Math.ceil(totalEps / numSeasons);
    let epCounter = 1;

    for (let sn = 1; sn <= numSeasons; sn++) {
      const season = await p.season.create({ data: { contentId: content.id, seasonNumber: sn, title: `${sn}. Sezon` } });
      const epsCount = sn < numSeasons ? epsPerSeason : totalEps - (epsPerSeason * (numSeasons - 1));

      const epData = [];
      const vidData = [];
      for (let e = 0; e < epsCount; e++) {
        const epId = require('crypto').randomUUID();
        epData.push({ id: epId, seasonId: season.id, episodeNumber: e + 1, title: `${epCounter}. Bölüm` });
        vidData.push({ episodeId: epId, url: getVideoUrl(content.id + '_s' + sn + 'e' + e), quality: 'HD', language: 'tr' });
        epCounter++;
      }
      await p.episode.createMany({ data: epData });
      await p.video.createMany({ data: vidData });
    }

    count++;
    if (count % 100 === 0) console.log(`  ${count}/1000 dizi olusturuldu...`);
  }

  // If still need more, generate unique ones
  let extra = 1;
  while (count < 1000) {
    const title = `Türk Dizisi ${2000 + extra}`;
    const slug = slugify(title);
    if (usedSlugs.has(slug)) { extra++; continue; }
    usedSlugs.add(slug);

    const content = await p.content.create({
      data: {
        title, slug,
        description: DESCRIPTIONS[extra % DESCRIPTIONS.length],
        type: 'SERIES',
        tags: JSON.stringify([GENRES[extra % GENRES.length]]),
        language: 'tr', country: 'Türkiye', quality: 'HD', isActive: true,
        year: 2010 + (extra % 15),
        imdbRating: parseFloat((5 + (extra % 50) / 10).toFixed(1)),
      }
    });

    const numSeasons = 1 + (extra % 3);
    const totalEps = 8 + (extra % 40);
    const epsPerSeason = Math.ceil(totalEps / numSeasons);
    let epCounter = 1;

    for (let sn = 1; sn <= numSeasons; sn++) {
      const season = await p.season.create({ data: { contentId: content.id, seasonNumber: sn, title: `${sn}. Sezon` } });
      const epsCount = sn < numSeasons ? epsPerSeason : totalEps - (epsPerSeason * (numSeasons - 1));
      const epData = [];
      const vidData = [];
      for (let e = 0; e < epsCount; e++) {
        const epId = require('crypto').randomUUID();
        epData.push({ id: epId, seasonId: season.id, episodeNumber: e + 1, title: `${epCounter}. Bölüm` });
        vidData.push({ episodeId: epId, url: getVideoUrl(content.id + '_s' + sn + 'e' + e), quality: 'HD', language: 'tr' });
        epCounter++;
      }
      await p.episode.createMany({ data: epData });
      await p.video.createMany({ data: vidData });
    }
    count++;
    extra++;
  }

  console.log(`Ek dizi: ${count - KANALD_SERIES.length}`);

  // PHASE 3: Verify
  console.log('\n--- FAZE 3: Dogrulama ---');
  const total = await p.content.count({ where: { type: 'SERIES' } });
  const seasons = await p.season.count();
  const episodes = await p.episode.count();
  const videos = await p.video.count();
  const noVid = await p.episode.findMany({ where: { videos: { none: {} } }, select: { id: true } });

  console.log(`Diziler: ${total}`);
  console.log(`Sezonlar: ${seasons}`);
  console.log(`Bolumler: ${episodes}`);
  console.log(`Videolar: ${videos}`);
  console.log(`Videosuz bolum: ${noVid.length}`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nSure: ${elapsed}s`);
  console.log('DONE!');

  await p['$disconnect']();
}

main().catch(e => { console.error(e); process.exit(1); });
