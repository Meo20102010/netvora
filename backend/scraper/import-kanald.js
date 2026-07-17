const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const DATA_FILE = path.join(__dirname, 'kanald-series.json');
const PROGRESS_FILE = path.join(__dirname, 'kanald-import.json');

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u')
    .replace(/ö/g,'o').replace(/ı/g,'i').replace(/ç/g,'c')
    .replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
    .substring(0, 100) || 'series';
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const existing = await prisma.content.findMany({ where: { type: 'SERIES' }, select: { slug: true, title: true } });
  const existingSlugs = new Set(existing.map(c => c.slug));
  const existingTitles = new Set(existing.map(c => c.title.toLowerCase()));

  let imported = 0, skipped = 0;
  const results = [];

  for (const series of data.series) {
    const slug = slugify(series.title);
    
    // Skip if already exists
    if (existingSlugs.has(slug) || existingTitles.has(series.title.toLowerCase())) {
      console.log(`SKIP: ${series.title} (already exists)`);
      skipped++;
      continue;
    }

    try {
      // Create content record
      const content = await prisma.content.create({
        data: {
          title: series.title,
          slug,
          description: series.description || null,
          type: 'SERIES',
          posterUrl: series.poster || null,
          coverUrl: series.poster || null,
          tags: JSON.stringify(series.genre ? [series.genre] : []),
          language: 'tr',
          country: 'Türkiye',
          quality: 'HD',
          isActive: true,
        }
      });

      // Add a basic season 1
      const season = await prisma.season.create({
        data: {
          contentId: content.id,
          seasonNumber: 1,
          title: `1. Sezon`,
        }
      });

      // Add episodes from the scraped data
      if (series.episodes && series.episodes.length > 0) {
        let epNum = 1;
        // Filter out non-episode links (like "Bilgi", "Oyuncular", "Fragmanlar" etc.)
        const episodeLinks = series.episodes.filter(e => {
          const text = e.title?.toLowerCase().trim() || '';
          return text.includes('bölüm') || text.includes('bolum') || text.includes('son bölüm') || text.includes('son bolum');
        });

        for (const ep of episodeLinks) {
          try {
            await prisma.episode.create({
              data: {
                seasonId: season.id,
                episodeNumber: epNum++,
                title: ep.title?.trim() || `Bölüm ${epNum - 1}`,
                description: null,
              }
            });
          } catch (e) {
            console.log(`  Episode error: ${e.message}`);
          }
        }
      }

      console.log(`IMPORTED: ${series.title} -> ${content.id}`);
      imported++;
      results.push({ title: series.title, slug, id: content.id, status: 'imported' });
    } catch (err) {
      console.log(`ERROR: ${series.title} -> ${err.message}`);
      results.push({ title: series.title, slug, status: 'error', error: err.message });
    }
  }

  console.log(`\nDone: ${imported} imported, ${skipped} skipped`);
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(results, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
