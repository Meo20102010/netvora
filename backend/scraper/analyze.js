const axios = require('axios');
const cheerio = require('cheerio');

async function main() {
  const listRes = await axios.get('https://www.fullhdfilmizlesene.life/');
  const $ = cheerio.load(listRes.data);
  const firstLink = $('.list .film a.tt').first().attr('href');
  console.log('First movie URL:', firstLink);

  const movieRes = await axios.get(firstLink);
  const $2 = cheerio.load(movieRes.data);

  $2('script[type="application/ld+json"]').each((i, el) => {
    try {
      const json = JSON.parse($2(el).html());
      if (json['@type'] === 'Movie') {
        console.log('\n--- LD+JSON ---');
        console.log(JSON.stringify(json, null, 2));
      }
    } catch(e) {}
  });

  console.log('\n--- Titles ---');
  console.log('h1:', $2('h1').first().text().trim());
  console.log('.izle-titles h2:', $2('.izle-titles h2').text().trim());

  console.log('\n--- Description ---');
  console.log('.film-ozeti p:', $2('.film-ozeti p').text().trim());

  console.log('\n--- Film Info ---');
  $2('.film-info li').each((i, el) => {
    console.log($2(el).text().trim());
  });

  console.log('\n--- Poster ---');
  const posterImg = $2('.detay-sol picture img').first();
  console.log('poster data-src:', posterImg.attr('data-src'));

  console.log('\n--- Badges ---');
  console.log('.uhd:', $2('.uhd').first().text().trim());
  console.log('.sure:', $2('.sure').text().trim());
  console.log('.imdb-ic:', $2('.imdb-ic').text().trim());

  console.log('\n--- Player ---');
  console.log('.ply:', $2('.ply').length);
  console.log('#plx:', $2('#plx').length);
  console.log('#play-video:', $2('#play-video').length);

  console.log('\n--- Iframes ---');
  console.log('iframe count:', $2('iframe').length);
  $2('iframe').each((i, el) => {
    console.log('iframe src:', $2(el).attr('src'));
  });

  console.log('\n--- Data attrs on player ---');
  const plyDiv = $2('.ply');
  if (plyDiv.length) console.log('.ply attrs:', plyDiv.get(0).attribs);
  
  const plxDiv = $2('#plx');
  if (plxDiv.length) console.log('#plx attrs:', plxDiv.get(0).attribs);

  console.log('\n--- Genre links ---');
  $2('.kategori a, .film-info a[href*="filmizle"]').each((i, el) => {
    console.log($2(el).text().trim(), '->', $2(el).attr('href'));
  });
  
  console.log('\n--- Part selector ---');
  console.log('.part-btns:', $2('.part-btns').length > 0 ? $2('.part-btns').html().slice(0,500) : 'not found');
  console.log('.part-sources:', $2('.part-sources').length > 0 ? $2('.part-sources').html().slice(0,500) : 'not found');
}

main().catch(console.error);
