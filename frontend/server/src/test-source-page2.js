const axios = require('axios');

(async () => {
  const url = 'https://www.fullhdfilmizlesene.nz/yeni-filmler/2';
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  const text = res.data;
  require('fs').writeFileSync('C:/Users/Wado2/AppData/Local/Temp/source-page2.html', text);
  console.log('status', res.status, 'len', text.length);
  const liCount = (text.match(/<li class="film">/g) || []).length;
  const divCount = (text.match(/<div class="film">/g) || []).length;
  console.log('li class film:', liCount, 'div class film:', divCount);
})();
