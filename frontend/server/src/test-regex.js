const fs = require('fs');
const html = fs.readFileSync('C:/Users/Wado2/AppData/Local/Temp/source-home.html', 'utf8');

const regex = /<div class="film">\s*<a class="tt" href="([^"]+)">[^<]*<\/a>\s*<h2 class="film-tt"><span class="film-title">([^<]+)<\/span>(?:\s*<span class="kt">([^<]*)<\/span>)?\s*<\/h2>[\s\S]*?<picture>[\s\S]*?<source data-srcset="([^"]+)"/g;
let m;
let count = 0;
while ((m = regex.exec(html)) !== null) {
  count++;
  if (count <= 5) console.log({ title: m[2].trim(), url: m[1], img: m[4] });
}
console.log('total', count);
