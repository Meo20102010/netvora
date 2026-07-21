const BASE = 'https://netvora-green.vercel.app/api';
const SOURCE = 'https://www.fullhdfilmizlesene.nz';
const CONCURRENCY = 3;
const BATCH_SIZE = 25;
const DELAY_BETWEEN_REQUESTS_MS = 800;

let authToken = null;
let filmCategoryId = null;

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ibrahimseleme0@gmail.com', password: 'Meo20102010' }),
  });
  const data = await res.json();
  if (!data.success) throw new Error('Login failed: ' + JSON.stringify(data));
  authToken = data.data.token;
}

async function getCategories() {
  const res = await fetch(`${BASE}/admin/categories`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const data = await res.json();
  if (!data.success) throw new Error('Get categories failed: ' + JSON.stringify(data));
  const filmCat = data.data.find((c) => c.slug === 'film');
  filmCategoryId = filmCat ? filmCat.id : null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
}

function extractListMovies(html) {
  const movies = [];
  const chunks = html.split('<li class="film">').slice(1);
  for (const chunk of chunks) {
    const endIdx = chunk.indexOf('</li>');
    if (endIdx === -1) continue;
    const li = chunk.slice(0, endIdx);
    const urlMatch = li.match(/<a class="tt" href="(https:\/\/www\.fullhdfilmizlesene\.nz\/film\/[^"]+)"/);
    const titleMatch = li.match(/<h2 class="film-tt"><span class="film-title">([^<]+)<\/span>/);
    const origMatch = li.match(/<span class="kt">([^<]+)<\/span>/);
    if (urlMatch && titleMatch) {
      movies.push({
        url: urlMatch[1],
        title: titleMatch[1].trim(),
        originalTitle: origMatch ? origMatch[1].trim() : '',
      });
    }
  }
  return movies;
}

function rot13(str) {
  return String(str).replace(/[a-z]/gi, (s) => String.fromCharCode(s.charCodeAt(0) + (s.toLowerCase() < 'n' ? 13 : -13)));
}

function decodeVideoUrl(encoded) {
  try {
    const base64 = rot13(encoded);
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    return decoded;
  } catch {
    return null;
  }
}

function extractMovieDetail(html, url) {
  // Title
  const titleMatch = html.match(/<h1><a href="[^"]*">([^<]+)<\/a><\/h1>(?:\s*<h2>([^<]*)<\/h2>)?/);
  const title = titleMatch ? titleMatch[1].trim() : '';
  const originalTitle = titleMatch && titleMatch[2] ? titleMatch[2].trim() : '';

  // Description
  const descMatch = html.match(/<div class="ozet-ic"><p>([\s\S]*?)<\/p><\/div>/);
  const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  // Year
  let year = null;
  const yearMatches = [
    html.match(/<title>[^<]*\((\d{4})\)<\/title>/),
    html.match(/<span class="film-yil">(\d{4})<\/span>/),
    html.match(/\/yil\/(\d{4})-filmleri/),
    html.match(/<(span|a)[^>]*>(\d{4}) Filmleri<\/\1>/),
  ];
  for (const m of yearMatches) {
    if (m) {
      year = parseInt(m[1] || m[2]);
      break;
    }
  }

  // Duration
  const durationMatch = html.match(/<span class="sure">(\d+)\s*dk<\/span>/);
  const duration = durationMatch ? parseInt(durationMatch[1]) : null;

  // IMDB
  const imdbMatch = html.match(/<div class="imdb-ic">\s*IMDB\s*<span>([\d.,]+)<\/span>/);
  const imdbRating = imdbMatch ? parseFloat(imdbMatch[1].replace(',', '.')) : null;

  // Director
  const directorMatch = html.match(/<span class="dt">Yönetmen<\/span>[\s\S]*?<a[^>]*><span>([^<]+)<\/span><\/a>/);
  const director = directorMatch ? directorMatch[1].trim() : '';

  // Cast
  const castMatch = html.match(/<span class="dt">Oyuncular<\/span>[\s\S]*?<div class="dd">([\s\S]*?)<\/div>/);
  let cast = [];
  if (castMatch) {
    const castHtml = castMatch[1];
    const castRegex = /<a[^>]*><span>([^<]+)<\/span><\/a>/g;
    let cm;
    while ((cm = castRegex.exec(castHtml)) !== null) {
      cast.push(cm[1].trim());
    }
  }

  // Tags
  const tagsMatch = html.match(/<span class="dt">Tür<\/span>[\s\S]*?<div class="dd">([\s\S]*?)<\/div>/);
  let tags = [];
  if (tagsMatch) {
    const tagsHtml = tagsMatch[1];
    const tagRegex = /<a[^>]*>([^<]+)<\/a>/g;
    let tm;
    while ((tm = tagRegex.exec(tagsHtml)) !== null) {
      const tag = tm[1].replace('Filmleri', '').replace('Filmi', '').replace('Filmler', '').trim();
      if (tag) tags.push(tag);
    }
  }

  // Language
  const langMatch = html.match(/<span class="dt">Dil<\/span>[\s\S]*?<div class="dd">([\s\S]*?)<\/div>/);
  let language = 'Türkçe';
  if (langMatch) {
    const langHtml = langMatch[1].toLowerCase();
    if (langHtml.includes('dublaj')) language = 'Türkçe';
    else if (langHtml.includes('altyazı')) language = 'Türkçe';
  }

  // Quality
  let quality = 'HD';
  if (html.includes('class="uhd">4K<\/span>') || html.includes('>4K<')) quality = 'ULTRA_HD';
  else if (html.includes('1080p') || html.includes('class="hd hd-2">HD<\/span>')) quality = 'FULL_HD';

  // Country
  let country = 'Amerika';
  const katMatch = html.match(/<span class="dt">Kategori<\/span>[\s\S]*?<div class="dd">([\s\S]*?)<\/div>/);
  if (katMatch && katMatch[1].includes('Yerli')) country = 'Türkiye';
  if (tags.some((t) => t.toLowerCase().includes('yerli'))) country = 'Türkiye';

  // Poster and cover
  const posterMatch = html.match(/<meta property="og:image" content="([^"]+)">/);
  const posterUrl = posterMatch ? posterMatch[1] : '';
  const coverUrl = posterUrl.replace('/izle/', '/izle-lg/');

  // Video URL from scx
  let videoUrl = null;
  const scxMatch = html.match(/var scx = (\{[\s\S]*?\});/);
  if (scxMatch) {
    try {
      const scx = JSON.parse(scxMatch[1]);
      for (const sourceName in scx) {
        const source = scx[sourceName];
        if (source && source.sx) {
          // Prefer 't' (tek part) sources
          const tSources = source.sx.t;
          if (tSources && Object.keys(tSources).length > 0) {
            for (const key of Object.keys(tSources)) {
              const decoded = decodeVideoUrl(tSources[key]);
              if (decoded && decoded.startsWith('http')) {
                videoUrl = decoded;
                break;
              }
            }
          }
          // Fallback to 'p' sources
          if (!videoUrl && source.sx.p) {
            const pSources = source.sx.p;
            for (const key of Object.keys(pSources)) {
              const decoded = decodeVideoUrl(pSources[key]);
              if (decoded && decoded.startsWith('http')) {
                videoUrl = decoded;
                break;
              }
            }
          }
        }
        if (videoUrl) break;
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  return {
    title,
    originalTitle,
    description,
    year,
    duration,
    imdbRating,
    director,
    cast,
    tags,
    country,
    language,
    quality,
    posterUrl,
    coverUrl,
    videoUrl,
    sourceUrl: url,
  };
}

async function createMovie(movie, stats) {
  const payload = {
    title: movie.title,
    type: 'MOVIE',
    description: movie.description,
    posterUrl: movie.posterUrl,
    coverUrl: movie.coverUrl,
    trailerUrl: null,
    year: movie.year,
    duration: movie.duration,
    imdbRating: movie.imdbRating,
    director: movie.director,
    cast: movie.cast,
    tags: movie.tags,
    country: movie.country,
    language: movie.language,
    quality: movie.quality,
    sourceUrl: movie.sourceUrl,
    isFeatured: false,
    categoryId: filmCategoryId,
  };

  const res = await fetch(`${BASE}/admin/content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    if (data.error && data.error.includes('zaten mevcut')) {
      stats.existing++;
      console.log(`  ⚠️ Already exists: ${movie.title}`);
      return null;
    }
    throw new Error('Create content failed: ' + JSON.stringify(data));
  }

  // Add video URL if available
  if (movie.videoUrl) {
    await fetch(`${BASE}/admin/content/${data.data.id}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ url: movie.videoUrl, quality: movie.quality, language: movie.language }),
    });
  }

  return data.data;
}

async function processMovie(movieInfo, stats) {
  try {
    const html = await fetchHtml(movieInfo.url);
    const movie = extractMovieDetail(html, movieInfo.url);
    if (!movie.title || !movie.videoUrl) {
      stats.skipped++;
      console.log(`  ⚠️ Skipped (no title or video): ${movieInfo.url}`);
      return;
    }
    const created = await createMovie(movie, stats);
    if (created) {
      stats.added++;
      console.log(`  ✅ Added: ${movie.title} (${movie.year}) - ${movie.videoUrl}`);
    }
  } catch (err) {
    stats.failed++;
    console.log(`  ❌ Failed: ${movieInfo.url} - ${err.message}`);
  }
}

async function processBatch(movies, stats) {
  for (let i = 0; i < movies.length; i += CONCURRENCY) {
    const batch = movies.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((m) => processMovie(m, stats)));
    if (i + CONCURRENCY < movies.length) await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }
}

async function scrapePage(pageNum, stats) {
  const url = pageNum === 1 ? `${SOURCE}/` : `${SOURCE}/yeni-filmler/${pageNum}`;
  console.log(`\n📄 Page ${pageNum}: ${url}`);
  const html = await fetchHtml(url);
  const movies = extractListMovies(html);
  console.log(`  Found ${movies.length} movies`);
  await processBatch(movies, stats);
  return movies.length;
}

async function main() {
  const args = process.argv.slice(2);
  const startPage = parseInt(args[0]) || 1;
  const endPage = parseInt(args[1]) || 10;
  const stopOnEmpty = args.includes('--stop-on-empty');
  const maxEmptyStreak = 3;

  console.log(`🔑 Logging in...`);
  await login();
  await getCategories();
  console.log(`✅ Logged in. Film category: ${filmCategoryId}`);

  const stats = { added: 0, failed: 0, skipped: 0, existing: 0 };
  const startTime = Date.now();
  let emptyStreak = 0;

  for (let page = startPage; page <= endPage; page++) {
    try {
      const count = await scrapePage(page, stats);
      if (stopOnEmpty) {
        if (count === 0) {
          emptyStreak++;
          console.log(`  ⚠️ Empty page ${page} (${emptyStreak}/${maxEmptyStreak})`);
          if (emptyStreak >= maxEmptyStreak) {
            console.log(`\n🏁 Reached end of catalog at page ${page}. Stopping.`);
            break;
          }
        } else {
          emptyStreak = 0;
        }
      }
    } catch (err) {
      console.log(`  ❌ Page ${page} error: ${err.message}`);
    }
    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`⏱️ Elapsed: ${elapsed}m | Added: ${stats.added} | Failed: ${stats.failed} | Skipped: ${stats.skipped} | Existing: ${stats.existing}`);
  }

  console.log(`\n🎉 DONE! Added: ${stats.added}, Failed: ${stats.failed}, Skipped: ${stats.skipped}, Existing: ${stats.existing}`);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
