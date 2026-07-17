const initSqlJs = require('sql.js');
const fs = require('fs');

async function main() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync('prisma/dev-fixed.db');
  const db = new SQL.Database(buf);
  
  // Check what content we have
  const contents = db.exec("SELECT id, title, slug, type FROM contents");
  console.log('Content items:', contents[0]?.values?.length || 0);
  
  // Show the first 20
  if (contents[0]?.values) {
    console.log('\nFirst 20 content items:');
    for (const row of contents[0].values.slice(0, 20)) {
      console.log(`  ${row[0].substring(0, 24)} | ${row[1]?.substring(0, 30)} | ${row[2]?.substring(0, 20)} | ${row[3]}`);
    }
    
    // Check if we have the scraped series
    const scrapedSeries = ['daha-17', 'uzak-sehir', 'esref-ruya', 'arka-sokaklar', 'incitaneleri', 'beyazla-joker', 'kuralsiz-sokaklar', 'gelinim-mutfakta', 'neler-oluyor-hayatta', 'ardanin-mutfagi', 'arda-ile-omuz-omuza', 'kanal-d-ana-haber', 'kanal-d-haber-hafta-sonu', 'magazin-d-yaz', 'magazin-d-cumartesi', 'magazin-d-pazar', 'konustukca', 'pazar-gezmesi', 'inci-taneleri', 'guller-ve-gunahlar', 'vatanim-sensin', 'hekimoglu', 'kuzey-guney', 'afili-ask', 'poyraz-karayel', 'ask-i-memnu', 'siyah-beyaz-ask', 'zalim-istanbul', 'gunesin-kizlari', 'fatmagul'];
    
    const slugs = new Set((contents[0].values || []).map(r => r[2]));
    console.log('\nScraped series found in recovered DB:');
    for (const slug of scrapedSeries) {
      console.log(`  ${slug}: ${slugs.has(slug) ? 'YES' : 'NO'}`);
    }
  }
  
  // Check seasons
  const seasons = db.exec("SELECT s.id, s.seasonNumber, c.title FROM seasons s JOIN contents c ON s.contentId = c.id");
  console.log(`\nSeasons: ${seasons[0]?.values?.length || 0}`);
  if (seasons[0]?.values) {
    for (const row of seasons[0].values.slice(0, 10)) {
      console.log(`  Season ${row[1]} of "${row[2]?.substring(0, 20)}"`);
    }
  }
  
  db.close();
}
main();
