const axios = require('axios');
const cheerio = require('cheerio');

async function main() {
  // Check page 1 and page 2 listing structures
  for (const url of ['https://www.fullhdfilmizlesene.life/', 'https://www.fullhdfilmizlesene.life/yeni-filmler/2']) {
    console.log(`\n\n=== ${url} ===`);
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(res.data);
    
    console.log('Listing selector candidates:');
    
    // Check li.film
    console.log('li.film count:', $('li.film').length);
    
    // Check any li with class containing film
    $('li[class]').each((i, el) => {
      const cls = $(el).attr('class');
      if (cls.includes('film')) {
        console.log('  li with film class:', cls);
      }
    });
    
    // Check the list container
    console.log('ul.list count:', $('ul.list').length);
    console.log('ul.list li count:', $('ul.list li').length);
    
    // Check any container with film
    console.log('.film count (any element):', $('.film').length);
    
    // Check sayfalama (pagination)
    console.log('.sayfalama:', $('.sayfalama').length > 0 ? $('.sayfalama').text().trim().slice(0,200) : 'not found');
    
    // Check all links to see patterns
    const movieLinks = [];
    $('a[href*="/film/"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith('https://www.fullhdfilmizlesene.life/film/')) {
        movieLinks.push(href);
      }
    });
    console.log(`Found ${movieLinks.length} movie links matching /film/ pattern`);
    
    // Check first few film divs for structure
    $('.film').first().each((i, el) => {
      console.log('First .film element HTML (first 1000 chars):');
      console.log($.html(el).slice(0, 1000));
    });
  }
}

main().catch(console.error);
