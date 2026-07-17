const axios = require('axios');

// Verify that turbo.imgz.me URLs actually work
const testUrls = [
  'https://turbo.imgz.me/play/04d00480e1be53d077284bf3ee2882a6',  // neon-lights
  'https://turbo.imgz.me/play/077a036321a5979d7bddde18035372b4',  // mona-lisa
  'https://turbo.imgz.me/play/77de5df19c952db88af7cb1e9c03ecfd',  // soror
  'https://watch.trplayer.com/watch/78J4G9CR',                    // so-fades (from axios)
  'https://turbo.imgz.me/play/78J4G9CR',                          // so-fades (from Playwright)
  'https://turbo.imgz.me/play/ZYW631KP',                          // angels-fallen (from Playwright)
  'https://watch.trplayer.com/watch/ZYW631KP',                    // angels-fallen (from axios)
  'https://vidmoxy.net/fl/v1xffe8b062',                           // kukla fastly
  'https://vidmoxy.net/pt/v1x198a0375',                           // kukla proton
];

(async () => {
  for (const url of testUrls) {
    try {
      const res = await axios.get(url, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 15000,
        maxRedirects: 5,
      });
      console.log(`${url.substring(0, 55)}: HTTP ${res.status} (${(res.data || '').substring(0, 80)})`);
    } catch (err) {
      console.log(`${url.substring(0, 55)}: ${err.message.substring(0, 60)}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
})();
