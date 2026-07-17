const { PrismaClient } = require('@prisma/client');
const https = require('https');
const p = new PrismaClient();

function checkUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 });
      res.resume();
    }).on('error', (e) => resolve({ status: 'ERR', ok: false, error: e.message }));
  });
}

(async () => {
  // Test TVmaze and Wikipedia poster URLs are reachable
  const tvmazeSamples = await p.content.findMany({
    where: { posterUrl: { contains: 'tvmaze.com' } },
    take: 5,
    select: { title: true, posterUrl: true },
  });
  
  const wikiSamples = await p.content.findMany({
    where: { posterUrl: { contains: 'upload.wikimedia.org' } },
    take: 5,
    select: { title: true, posterUrl: true },
  });
  
  console.log('=== Testing poster URL reachability ===\n');
  
  let allOk = true;
  for (const sample of [...tvmazeSamples, ...wikiSamples]) {
    process.stdout.write(`${sample.title}... `);
    const result = await checkUrl(sample.posterUrl);
    console.log(result.ok ? 'OK' : `FAIL (${result.status})`);
    if (!result.ok) allOk = false;
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Summary
  const total = await p.content.count({ where: { type: 'SERIES' } });
  const real = await p.content.count({ where: { type: 'SERIES', NOT: { posterUrl: { contains: 'placehold.co' } } } });
  const broken = await p.content.count({ where: { type: 'SERIES', OR: [
    { posterUrl: { contains: 'kanald.com.tr' } },
    { posterUrl: { contains: 'example.com' } },
  ]}});
  
  console.log(`\n=== Summary ===`);
  console.log(`Series: ${total}`);
  console.log(`Real posters: ${real}`);
  console.log(`Still broken URLs (kanald/example): ${broken}`);
  console.log(`All tested URLs reachable: ${allOk ? 'YES' : 'NO - some may need proxy'}`);
  
  await p.$disconnect();
})();
