const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const p = new PrismaClient();

const NAV_KEYS = ['son bölümü izle', 'bölümler', 'fragmanlar', 'd-shorts', 'özetler', 'özel klipler', 'foto galeri', 'haberler', 'oyuncular', 'bilgi', 'tümünü gör', 'başvuru formu', 'yarışma', 'yemek tarifleri', 'daha sonra izle'];

function isNavLink(title) {
  const t = title.toLowerCase().trim();
  return NAV_KEYS.some(k => t.includes(k)) || !t;
}

function parseDuration(str) {
  if (!str) return null;
  const m = str.match(/(\d+):(\d+):(\d+)/);
  if (m) return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]);
  const m2 = str.match(/(\d+):(\d+)/);
  if (m2) return parseInt(m2[1]) * 60 + parseInt(m2[2]);
  return null;
}

function cleanTitle(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').replace(/Daha Sonra İzle\s*/g, '').trim();
}

async function main() {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'kanald-series.json'), 'utf-8'));
  const seriesList = data.series;

  let imported = 0;
  for (const s of seriesList) {
    const slug = s.slug.replace(/[^a-z0-9-]/g, '');
    const existing = await p.content.findUnique({ where: { slug } });
    if (existing) {
      console.log(`SKIP ${s.title} (already exists)`);
      continue;
    }

    const content = await p.content.create({
      data: {
        title: s.title,
        slug,
        description: s.description || null,
        type: 'SERIES',
        posterUrl: s.poster || null,
        tags: JSON.stringify(s.genre ? [s.genre] : []),
        quality: 'HD',
      },
    });

    const actualEps = s.episodes.filter(e => {
      const cleaned = cleanTitle(e.title);
      return cleaned && !isNavLink(cleaned) && !e.url.includes('/fragmanlar') && !e.url.includes('/ozetler') && !e.url.includes('/ozel-klipler') && !e.url.includes('/foto-galeri') && !e.url.includes('/haber') && !e.url.includes('/oyuncular') && !e.url.includes('/d-shorts') && !e.url.includes('/yemek-tarifleri') && !e.url.includes('/hikaye-ve-kunye') && !e.url.includes('/dogru-yanlis') && !e.url.includes('/basvuru-formu');
    });

    if (actualEps.length === 0) {
      console.log(`  ${s.title}: 0 real episodes, skipping`);
      continue;
    }

    const season = await p.season.create({
      data: { contentId: content.id, seasonNumber: 1, title: 'Sezon 1' },
    });

    for (let i = 0; i < actualEps.length; i++) {
      const ep = actualEps[i];
      const cleaned = cleanTitle(ep.title);
      const dur = parseDuration(cleaned);

      let epTitle = cleaned;
      if (dur) epTitle = cleaned.replace(/\d+:\d+:\d+/, '').replace(/\d+:\d+/, '').trim();
      if (!epTitle) epTitle = `Bölüm ${i + 1}`;

      const episode = await p.episode.create({
        data: {
          seasonId: season.id,
          episodeNumber: i + 1,
          title: epTitle,
          duration: dur || null,
        },
      });

      await p.video.create({
        data: {
          episodeId: episode.id,
          url: ep.url,
          quality: 'HD',
          language: 'tr',
        },
      });
    }

    imported++;
    console.log(`  ${s.title}: ${actualEps.length} episodes`);
  }

  console.log(`\nImported ${imported} series`);
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
