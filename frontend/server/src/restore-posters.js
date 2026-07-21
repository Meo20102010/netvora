const BASE = 'https://netvora-green.vercel.app/api';
const BATCH_SIZE = 5;
const DELAY_MS = 2000;

const credentials = {
  email: 'ibrahimseleme0@gmail.com',
  password: 'Meo20102010',
};

let authToken = null;

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const data = await res.json();
  if (!data.success) throw new Error('Login failed: ' + JSON.stringify(data));
  authToken = data.data.token;
}

async function api(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`${path} failed: ${JSON.stringify(data)}`);
  return data.data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('🔑 Logging in...');
  await login();
  console.log('✅ Logged in.');

  let cursor = 1;
  let totalProcessed = 0;
  let totalRestored = 0;
  let batch = 0;

  while (cursor) {
    batch++;
    const result = await api('/admin/validate/restore-posters', { cursor, batchSize: BATCH_SIZE });
    totalProcessed += result.totalProcessed;
    totalRestored += result.totalRestored;
    console.log(
      `Batch ${batch} (pages ${cursor}-${cursor + BATCH_SIZE - 1}): processed ${result.totalProcessed}, restored ${result.totalRestored}`
    );
    if (result.restoredSamples?.length > 0) {
      console.log('  Samples:', result.restoredSamples.slice(0, 3).join(', '));
    }
    if (result.notFoundSamples?.length > 0) {
      console.log('  Not found:', result.notFoundSamples.slice(0, 3).join(', '));
    }
    cursor = result.nextCursor;
    if (!cursor) {
      console.log('\n✅ Restoration complete.');
      break;
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nTotal processed: ${totalProcessed}, Total restored: ${totalRestored}`);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
