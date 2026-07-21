const axios = require('axios');

(async () => {
  const url = 'https://www.fullhdfilmizlesene.nz/film/benden-onceki-ben-aku-sebelum-aku/';
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const text = res.data;
  const m = text.match(/<h1><a href="[^"]*">([^<]+)<\/a><\/h1>/);
  console.log('title:', m ? m[1] : 'no match');
})();
