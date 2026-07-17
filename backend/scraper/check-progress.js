const fs = require('fs');
const p = JSON.parse(fs.readFileSync(__dirname + '/enrich-progress.json', 'utf8'));
console.log('Keys:', Object.keys(p));
const c = p.contents || p;
console.log('Type:', typeof c, Array.isArray(c) ? 'array' : 'object');
if (Array.isArray(c)) {
  console.log('Total contents:', c.length);
  const noVideo = c.filter(x => x.videoUrls === 0 || !x.videoUrls);
  console.log('No video:', noVideo.length);
  const slugs = noVideo.slice(0, 10).map(x => x.slug || x.name || JSON.stringify(x).substring(0,80));
  console.log('Sample:', slugs);
  const withVideo = c.filter(x => x.videoUrls > 0);
  console.log('With video:', withVideo.length);
} else {
  console.log(JSON.stringify(c).substring(0, 500));
}
