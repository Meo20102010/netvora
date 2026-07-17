const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== Baslik duzeltme ===');

  // Fix titles that have garbage appended
  const badTitles = await p.content.findMany({
    where: { type: 'SERIES', title: { contains: '16' } },
    select: { id: true, title: true, slug: true },
  });

  let fixed = 0;
  for (const s of badTitles) {
    const cleanTitle = s.title.replace(/\s*\d{1,2}:\d{2}\s*/g, '').replace(/\s+\d{1,2}\s*$/, '').replace(/\s+/g, ' ').trim();
    if (cleanTitle !== s.title && cleanTitle.length > 2) {
      await p.content.update({ where: { id: s.id }, data: { title: cleanTitle } });
      console.log(`  "${s.title}" -> "${cleanTitle}"`);
      fixed++;
    }
  }

  // Also clean up titles that start with HTML
  const htmlTitles = await p.content.findMany({
    where: { type: 'SERIES', title: { startsWith: '<' } },
    select: { id: true, title: true, slug: true },
  });

  for (const s of htmlTitles) {
    const cleanTitle = s.title.replace(/<[^>]*>/g, '').replace(/&#[xX][0-9a-fA-F]+;/g, m => {
      const code = parseInt(m.slice(3, -1), 16);
      return String.fromCharCode(code);
    }).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
    if (cleanTitle && cleanTitle !== s.title && cleanTitle.length > 2) {
      await p.content.update({ where: { id: s.id }, data: { title: cleanTitle } });
      console.log(`  HTML: "${s.title.substring(0, 40)}..." -> "${cleanTitle}"`);
      fixed++;
    }
  }

  // Fix titles with newlines and whitespace
  const messyTitles = await p.content.findMany({
    where: { type: 'SERIES' },
    select: { id: true, title: true },
  });

  for (const s of messyTitles) {
    const clean = s.title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const emojiClean = clean.replace(/[\u{1F600}-\u{1F64F}]/gu, '').replace(/[\u{1F300}-\u{1F5FF}]/gu, '').replace(/[\u{1F680}-\u{1F6FF}]/gu, '').replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
    if (emojiClean !== s.title && emojiClean.length > 2) {
      await p.content.update({ where: { id: s.id }, data: { title: emojiClean } });
      if (fixed < 20) console.log(`  "${s.title.substring(0, 30)}" -> "${emojiClean.substring(0, 30)}"`);
      fixed++;
    } else if (clean !== s.title && clean.length > 2) {
      await p.content.update({ where: { id: s.id }, data: { title: clean } });
      if (fixed < 20) console.log(`  "${s.title.substring(0, 30)}" -> "${clean.substring(0, 30)}"`);
      fixed++;
    }
  }

  console.log(`\nToplam duzeltilen: ${fixed}`);

  // Also clean "www.kanald.com.tr" title
  const wrongTitle = await p.content.findFirst({ where: { title: 'www.kanald.com.tr' } });
  if (wrongTitle) {
    await p.content.update({ where: { id: wrongTitle.id }, data: { title: 'Kanal D Dizileri', slug: 'kanal-d-dizileri' } });
    console.log('  "www.kanald.com.tr" -> "Kanal D Dizileri"');
  }

  await p['$disconnect']();
}

main().catch(e => { console.error(e); process.exit(1); });
