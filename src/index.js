import { runScrapingPipeline } from './pipeline.js';

const isTestFailure = process.argv.includes('--test-failure');

async function main() {
  console.log('=== The Polite Scraper: Running Pipeline ===');
  if (isTestFailure) {
    console.log('[Notice] Running in --test-failure mode to verify Stage 5 failure survival.');
  }

  const { savedCount, report } = await runScrapingPipeline({ injectFakeUrl: isTestFailure });

  console.log('\n=======================================');
  console.log(`Pipeline Complete!`);
  console.log(`- Valid Books Saved: ${savedCount}`);
  console.log(`- Cache Hits: ${report.cache_hits}`);
  console.log(`- Pages Fetched: ${report.pages_fetched}`);
  console.log(`- Failed Pages: ${report.failed_pages}`);
  console.log(`- Duration: ${report.duration_seconds}s`);
  console.log('=======================================');

  if (isTestFailure) {
    if (savedCount === 60 && report.failed_pages === 1) {
      console.log('STAGE 5 CHECKPOINT PASSED: 1 fake URL skipped, 60 good records survived, failed_pages: 1 recorded.');
    } else {
      console.error('STAGE 5 CHECKPOINT FAILED: Expected 60 valid records and 1 failed page.');
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error('[FATAL ERROR]', err.message);
  process.exit(1);
});
