const fs = require('fs');

const js = fs.readFileSync('C:/Users/Wado2/AppData/Local/Temp/opencode/alljs.js', 'utf8');

// Search for key patterns related to video player transformation
const searches = [
  'appendWatchToken', 'partBtnSec', 'turbo', 'imgz', 'trplayer',
  'watch.trplayer', '/watch/', '/play/', 'siteUrl', 'vidSef',
  '\"tt\"', 'tt:', 'atob', 'btoa', 'base64', 'decode',
  'scx[', 'advid', 'sx.t', 'sx[\"t\"]', 'code.replace', 'ply-cover', 'data-src',
];

for (const term of searches) {
  let idx = 0;
  let count = 0;
  while ((idx = js.indexOf(term, idx)) >= 0 && count < 3) {
    const start = Math.max(0, idx - 30);
    const end = Math.min(js.length, idx + 150);
    console.log(`\n=== "${term}" at ${idx} ===`);
    console.log(js.substring(start, end));
    idx++;
    count++;
  }
}
