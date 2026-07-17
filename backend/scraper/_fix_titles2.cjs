const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Clean all titles that have HTML entities, emoji, or excessive whitespace
  const allSeries = await p.content.findMany({
    where: { type: 'SERIES' },
    select: { id: true, title: true },
  });

  let fixed = 0;
  for (const s of allSeries) {
    let clean = s.title
      .replace(/<[^>]*>/g, '')
      .replace(/&#[xX][0-9a-fA-F]+;/g, m => {
        const code = parseInt(m.slice(3, -1), 16);
        return String.fromCharCode(code);
      })
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n/g, ' ')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\S]+/g, ' ')
      .trim();

    // Remove non-printable characters and common emoji
    clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

    // Remove lines that look like schedule info
    clean = clean.replace(/(?:PAZAR|CUMARTESİ|HAFTA İÇİ|CUMA|SALI|ÇARŞAMBA|PERŞEMBE|PAZARTESİ|PAZAR)\s*[\d.:]+\s*/gi, '');
    clean = clean.replace(/\d{1,2}:\d{2}\s*/g, '');
    clean = clean.replace(/YAYINDA\.?\.\.\.\s*/gi, '');
    clean = clean.replace(/Takip Et\s*/gi, '');
    clean = clean.replace(/\s+/g, ' ').trim();

    if (clean !== s.title && clean.length > 1) {
      await p.content.update({ where: { id: s.id }, data: { title: clean } });
      fixed++;
      if (fixed <= 10) console.log(`"${s.title.substring(0, 40)}" -> "${clean.substring(0, 40)}"`);
    }
  }

  console.log(`\nToplam duzeltilen: ${fixed}`);
  await p['$disconnect']();
}

main().catch(e => { console.error(e); process.exit(1); });
