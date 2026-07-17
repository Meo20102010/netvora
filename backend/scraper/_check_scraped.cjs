const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'kanald-series.json'), 'utf8'));

// Filter: must have episodes > 0 and must have a valid URL (not footer, not javascript, etc.)
const EXCLUDE_SLUGS = new Set([
  'javascript:;', 'login', 'register', 'profilim', 'kanald', '@kanald', '%40kanald',
  'kanaldcomtr', 'yayin-akisi', 'basvurular', 'foto-galeri', 'haber', 'sinemalar',
  'd-shorts', 'yemek-tarifleri', 'cannel-d', 'iletisim', 'hata-bildir',
  'kanal-d', 'teve2', 'eurod', 'cnnturk', 'dreamtv', 'dsmart',
]);

const valid = [];
const invalid = [];

for (const s of data.series) {
  const slug = s.slug?.toLowerCase().trim() || '';
  const hasEps = s.episodes && s.episodes.length > 0;
  const hasPoster = s.poster && s.poster.startsWith('http');
  const isExcluded = EXCLUDE_SLUGS.has(slug) || slug.includes('javascript') || slug.includes('?') || slug.includes('login') || slug.includes('register') || slug.includes('taboola') || slug.includes('footer') || slug.includes('logo');

  // Clean up title - remove HTML
  const cleanTitle = (s.title || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

  if (hasEps && !isExcluded && cleanTitle.length > 1) {
    valid.push({
      ...s,
      title: cleanTitle,
      episodes: s.episodes.filter(e => {
        const t = (e.title || '').toLowerCase();
        return t.includes('bölüm') || t.includes('bolum');
      }),
    });
  } else {
    invalid.push({ slug, title: cleanTitle, reason: !hasEps ? 'no-eps' : 'excluded' });
  }
}

console.log(`Geçerli dizi: ${valid.length}`);
console.log(`Geçersiz: ${invalid.length}`);
console.log('\n--- Geçerli diziler ---');
for (const s of valid) {
  const epCount = s.episodes.length;
  console.log(`  ${s.title} (${s.slug}): ${epCount} bölüm, poster=${s.poster ? 'var' : 'yok'}`);
}
console.log('\n--- Geçersiz diziler ---');
for (const s of invalid) {
  console.log(`  ${s.slug}: ${s.title} [${s.reason}]`);
}
