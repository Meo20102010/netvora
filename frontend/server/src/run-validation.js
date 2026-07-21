const BASE = 'https://netvora-green.vercel.app/api';
const BATCH_SIZE = 25;
const DELAY_BETWEEN_BATCHES_MS = 1000;

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

async function getReport() {
  const res = await fetch(`${BASE}/admin/validate/report`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const data = await res.json();
  if (!data.success) throw new Error('Report failed: ' + JSON.stringify(data));
  return data.data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runBatchValidation() {
  console.log('\n🔎 Starting batch validation...');
  let cursor = null;
  let totalProcessed = 0;
  let totalDisabled = 0;
  let totalBrokenVideos = 0;
  let totalBrokenImages = 0;
  let totalMetadataFixed = 0;
  let totalQualityUpgraded = 0;
  let batch = 0;

  while (true) {
    batch++;
    const result = await api('/admin/validate/batch', {
      cursor,
      batchSize: BATCH_SIZE,
      checkVideos: true,
      checkImages: true,
      checkMetadata: true,
      disableBroken: true,
      fixMetadata: true,
      upgradeQuality: true,
    });

    totalProcessed += result.processed;
    totalDisabled += result.stats.disabled;
    totalBrokenVideos += result.stats.videosBroken;
    totalBrokenImages += result.stats.imagesBroken;
    totalMetadataFixed += result.stats.metadataFixed;
    totalQualityUpgraded += result.stats.qualityUpgraded;

    console.log(
      `  Batch ${batch}: processed ${result.processed}, disabled ${result.stats.disabled}, broken videos ${result.stats.videosBroken}, broken images ${result.stats.imagesBroken}, metadata fixed ${result.stats.metadataFixed}, quality upgraded ${result.stats.qualityUpgraded}`
    );

    if (result.stats.issueSamples?.length > 0) {
      for (const sample of result.stats.issueSamples.slice(0, 3)) {
        console.log(`    ⚠️ ${sample.title}: ${sample.issues.join(', ')}`);
      }
    }

    if (!result.hasMore || !result.nextCursor) {
      console.log(`\n✅ Validation complete. Processed ${totalProcessed} movies.`);
      break;
    }

    cursor = result.nextCursor;
    await sleep(DELAY_BETWEEN_BATCHES_MS);
  }

  return {
    processed: totalProcessed,
    disabled: totalDisabled,
    brokenVideos: totalBrokenVideos,
    brokenImages: totalBrokenImages,
    metadataFixed: totalMetadataFixed,
    qualityUpgraded: totalQualityUpgraded,
  };
}

async function runDuplicates() {
  console.log('\n🧹 Checking for duplicates (dry run)...');
  const dryRun = await api('/admin/validate/duplicates', { dryRun: true });
  console.log(`  Duplicate groups: ${dryRun.duplicateGroups}, movies to remove: ${dryRun.removed}`);

  if (dryRun.removed > 0) {
    console.log('  🗑️ Removing duplicates...');
    const real = await api('/admin/validate/duplicates', { dryRun: false });
    console.log(`  Removed ${real.removed} duplicate movies.`);
    return real.removed;
  }
  return 0;
}

async function runOptimization() {
  console.log('\n⚡ Optimizing database (dry run)...');
  const dryRun = await api('/admin/validate/optimize', { dryRun: true });
  console.log(`  Indexes to create: ${dryRun.indexes.length}`);

  console.log('  ⚡ Applying optimization...');
  const real = await api('/admin/validate/optimize', { dryRun: false });
  console.log(`  Created ${real.created.length} indexes.`);
  return real.created.length;
}

async function main() {
  console.log('🔑 Logging in...');
  await login();
  console.log('✅ Logged in.');

  const before = await getReport();
  console.log('\n📊 BEFORE:');
  console.log(JSON.stringify(before, null, 2));

  const validation = await runBatchValidation();
  const removedDuplicates = await runDuplicates();
  const indexesCreated = await runOptimization();

  const after = await getReport();
  console.log('\n📊 AFTER:');
  console.log(JSON.stringify(after, null, 2));

  console.log('\n\n🎉 FINAL REPORT');
  console.log('================');
  console.log(`Total movies: ${after.totalMovies}`);
  console.log(`Active movies: ${after.activeMovies}`);
  console.log(`Disabled movies: ${after.inactiveMovies}`);
  console.log(`Movies with videos: ${after.withVideos}`);
  console.log(`Movies without videos: ${after.withoutVideos}`);
  console.log(`Movies with poster: ${after.withPoster}`);
  console.log(`Movies without poster: ${after.withoutPoster}`);
  console.log(`Movies with description: ${after.withDescription}`);
  console.log(`Movies missing description: ${after.missingDescription}`);
  console.log(`---`);
  console.log(`Processed during validation: ${validation.processed}`);
  console.log(`Disabled (broken/dead): ${validation.disabled}`);
  console.log(`Broken videos found: ${validation.brokenVideos}`);
  console.log(`Broken images found: ${validation.brokenImages}`);
  console.log(`Metadata fixed: ${validation.metadataFixed}`);
  console.log(`Quality upgraded: ${validation.qualityUpgraded}`);
  console.log(`Duplicate movies removed: ${removedDuplicates}`);
  console.log(`DB indexes created: ${indexesCreated}`);
  console.log(`---`);
  console.log(`SEO pages: ${after.totalMovies} (dynamic sitemap auto-updates)`);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
