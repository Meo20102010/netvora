const BASE = 'https://netvora-green.vercel.app/api';

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ibrahimseleme0@gmail.com', password: 'Meo20102010' }),
  });
  const data = await res.json();
  if (!data.success) throw new Error('Login failed: ' + JSON.stringify(data));
  return data.data.token;
}

async function getCategories(token) {
  const res = await fetch(`${BASE}/admin/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.success) throw new Error('Get categories failed: ' + JSON.stringify(data));
  return data.data;
}

async function createContent(token, content) {
  const res = await fetch(`${BASE}/admin/content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(content),
  });
  const data = await res.json();
  if (!data.success) throw new Error('Create content failed: ' + JSON.stringify(data));
  return data.data;
}

async function createSeason(token, contentId, seasonNumber, title) {
  const res = await fetch(`${BASE}/admin/content/${contentId}/seasons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ seasonNumber, title }),
  });
  const data = await res.json();
  if (!data.success) throw new Error('Create season failed: ' + JSON.stringify(data));
  return data.data;
}

async function createEpisode(token, seasonId, episodeNumber, title, description) {
  const res = await fetch(`${BASE}/admin/content/seasons/${seasonId}/episodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ episodeNumber, title, description }),
  });
  const data = await res.json();
  if (!data.success) throw new Error('Create episode failed: ' + JSON.stringify(data));
  return data.data;
}

const series = [
  {
    title: 'Daha 17',
    type: 'SERIES',
    description: 'Yurtlarda büyüyen 17 yaşındaki Aras, öldü zannettiği kardeşinin yaşadığını öğrenir. İstanbuldan Bodruma uzanan gizemli bir yolculuğa çıkan Aras, Bodrumun en güçlü ailesi Akkaya ailesiyle yollarının kesişmesiyle hayatı tamamen değişir. Sırlar, yüzleşmeler ve beklenmedik bir aşk üçgeni arasında kalan Aras, hem geçmişine hem de ailesine ulaşmaya çalışır.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/yInuFU1pSk1La75DnFJgDaBYCFq.jpg',
    coverUrl: 'https://image.tmdb.org/t/p/original/waikcPCfq0X5qs1Braw32seByLz.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=bf4tGsRcT-Q',
    year: 2026,
    duration: 146,
    imdbRating: 7.8,
    director: 'Emre Kabakuşak',
    cast: ['Çağan Efe Ak', 'Nesrin Cavadzade', 'Ceren Ayruk', 'Armağan Oğuz', 'Ata Yaşat', 'Dilara Aksüyek', 'Çağdaş Onur Öztürk', 'Helin Elveren'],
    tags: ['Drama', 'Gençlik', 'Romantik'],
    country: 'Türkiye',
    language: 'Türkçe',
    quality: 'FULL_HD',
    isFeatured: true,
    episodes: 7,
    seasons: [{ number: 1, title: 'Sezon 1', epCount: 7 }],
  },
  {
    title: 'Eşref Rüya',
    type: 'SERIES',
    description: 'Çocukken uzaktan aşık olduğu ve "Rüya" adını verdiği kızı yıllarca arayan Eşref, güçlü bir mafya figürüne dönüşür. İdealist müzisyen Nisan, Eşrefin otelinde sahne almasıyla kendini büyük bir tehlikenin içinde bulur. Eşref Nisana aşık olur ancak onun aslında yıllardır peşinde olduğu Rüya ve aynı zamanda polis için muhbirlik yaptığını bilmemektedir.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/wwwKL2Pq3JZdI52wIYqjAdUF8fx.jpg',
    coverUrl: 'https://image.tmdb.org/t/p/original/sR3Y7Z2wC0Xa6T1pE8JzX9rJwMl.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=WVlvaL7_q90',
    year: 2025,
    duration: 142,
    imdbRating: 6.8,
    director: 'Uluç Bayraktar',
    cast: ['Çağatay Ulusoy', 'Demet Özdemir', 'Büşra Develi', 'Necip Memili', 'Ahmet Rıfat Şungar', 'Tolga Tekin', 'Görkem Sevindik', 'Ceren Benderlioğlu'],
    tags: ['Aksiyon', 'Dram', 'Romantik', 'Suç'],
    country: 'Türkiye',
    language: 'Türkçe',
    quality: 'FULL_HD',
    isFeatured: true,
    episodes: 47,
    seasons: [
      { number: 1, title: 'Sezon 1', epCount: 13 },
      { number: 2, title: 'Sezon 2', epCount: 34 },
    ],
  },
  {
    title: 'Gaddar',
    type: 'SERIES',
    description: 'Sevdiği kadını ve ailesini geride bırakıp askere giden Dağhan, döndüğünde ailesinin dağıldığını ve mahallesinin tamamen değiştiğini görür. Beklenmedik olaylar onu zalim bir adama dönüştürür. Dağhan, hem geçmişinin hesabını verecek hem de sevdiklerini korumak için var gücüyle savaşacaktır.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg',
    coverUrl: 'https://image.tmdb.org/t/p/original/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=pHuUjUpYsjA',
    year: 2024,
    duration: 133,
    imdbRating: 7.2,
    director: 'Sinan Öztürk',
    cast: ['Çağatay Ulusoy', 'Sümeyye Aydoğan', 'Onur Saylak', 'Erdal Özyağcılar', 'Laçin Ceylan', 'Hakan Salınmış', 'Fatih Berk Şahin', 'Uğur Yıldıran'],
    tags: ['Aksiyon', 'Dram', 'Suç', 'Gerilim'],
    country: 'Türkiye',
    language: 'Türkçe',
    quality: 'FULL_HD',
    isFeatured: true,
    episodes: 20,
    seasons: [{ number: 1, title: 'Sezon 1', epCount: 20 }],
  },
  {
    title: 'Son Yaz',
    type: 'SERIES',
    description: 'İdealist Cumhuriyet Savcısı Selim Kara, organize suç lideri Selçuk Taşkınsın oğlu Akgünü koruması karşılığında tanıklık yapmasını ister. Selimin hayatına giren Akgün, ailesi dağılmış, suç dünyası içinde büyümüş havai bir gençtir. Bu beklenmedik ittifak her iki dünyanın da dengelerini değiştirecektir.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/hv2YdPpzHkjIRKQr5GKsF2JwJw.jpg',
    coverUrl: 'https://image.tmdb.org/t/p/original/kLd2abMv8b2E7W3dJ9rJwMl3X5k.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=example_sonyaz',
    year: 2021,
    duration: 120,
    imdbRating: 8.0,
    director: 'Burak Arlıel',
    cast: ['Alperen Duymaz', 'Ali Atay', 'Funda Eryiğit', 'Hafsanur Sancaktutan', 'Birce Akalay', 'Emre Karayel'],
    tags: ['Dram', 'Suç', 'Polisiye', 'Romantik'],
    country: 'Türkiye',
    language: 'Türkçe',
    quality: 'HD',
    isFeatured: true,
    episodes: 26,
    seasons: [
      { number: 1, title: 'Sezon 1', epCount: 21 },
      { number: 2, title: 'Sezon 2', epCount: 5 },
    ],
  },
  {
    title: 'Üç Kuruş',
    type: 'SERIES',
    description: 'Çıngıraklı mahallesinde bir seri katil dehşet saçmaktadır. Kurbanlarının üzerine üç kuruş bırakan katili yakalamakla görevlendirilen komiser Efe, ilk olarak mahallenin mafya lideri Kartalı şüpheli olarak görür. Ancak Kartalın katil olmadığını anlayan Efe, onunla birlikte katili bulmak için zorunlu bir ittifak kurar.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/k3lXR5M0FmBQVf4F8X8aX9JwMl3.jpg',
    coverUrl: 'https://image.tmdb.org/t/p/original/bN3Y5wMl8kXR5kFjE9t9p0D3X5k.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=exampleuckurus',
    year: 2021,
    duration: 120,
    imdbRating: 6.7,
    director: 'Sinan Öztürk',
    cast: ['Uraz Kaygılaroğlu', 'Ekin Koç', 'Nesrin Cavadzade', 'Diren Polatoğulları', 'Aslıhan Malbora', 'Nursel Köse', 'Ercan Kesal'],
    tags: ['Aksiyon', 'Dram', 'Suç', 'Polisiye', 'Komedi'],
    country: 'Türkiye',
    language: 'Türkçe',
    quality: 'FULL_HD',
    isFeatured: true,
    episodes: 28,
    seasons: [{ number: 1, title: 'Sezon 1', epCount: 28 }],
  },
];

async function main() {
  console.log('🔑 Logging in...');
  const token = await login();
  console.log('✅ Logged in');

  console.log('📂 Getting categories...');
  const categories = await getCategories(token);
  const diziCat = categories.find(c => c.slug === 'dizi');
  const categoryId = diziCat ? diziCat.id : null;
  console.log(`✅ Dizi category: ${categoryId}`);

  for (const s of series) {
    console.log(`\n🎬 Creating: ${s.title}...`);

    const content = await createContent(token, {
      title: s.title,
      type: s.type,
      description: s.description,
      posterUrl: s.posterUrl,
      coverUrl: s.coverUrl,
      trailerUrl: s.trailerUrl,
      year: s.year,
      duration: s.duration,
      imdbRating: s.imdbRating,
      director: s.director,
      cast: s.cast,
      tags: s.tags,
      country: s.country,
      language: s.language,
      quality: s.quality,
      isFeatured: s.isFeatured,
      categoryId,
    });

    console.log(`  ✅ Content created: ${content.id}`);

    for (const season of s.seasons) {
      console.log(`  📺 Creating Season ${season.number}: ${season.title}...`);
      const seasonData = await createSeason(token, content.id, season.number, season.title);
      console.log(`  ✅ Season created: ${seasonData.id}`);

      for (let ep = 1; ep <= season.epCount; ep++) {
        const epTitle = `${ep}. Bölüm`;
        const epDesc = `${s.title} ${season.number}. Sezon ${ep}. Bölüm`;
        await createEpisode(token, seasonData.id, ep, epTitle, epDesc);
        process.stdout.write(`  📄 Episode ${ep}/${season.epCount}\r`);
      }
      console.log(`  ✅ ${season.epCount} episodes created`);
    }
  }

  console.log('\n🎉 ALL DONE! 5 series added successfully!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
