import { discoverCatalogueBooks } from './crawler.js';
import { fetchWithCache } from './client.js';
import { extractRawBookRecord } from './extractor.js';
import { normalizeAndValidateBook } from './normalizer.js';
import { saveResults } from './storage.js';
import { RunReporter } from './reporter.js';
import { exportToCsv } from './csvExporter.js';
import { generateDashboard } from './dashboard.js';

/**
 * Orchestrates the full polite scraping pipeline.
 *
 * @param {object} [options]
 * @param {boolean} [options.injectFakeUrl=false] - Injects a deliberate fake URL to prove failure resilience
 * @returns {Promise<{
 *   validRecords: Array<object>,
 *   errors: Array<object>,
 *   report: object
 * }>}
 */
export async function runScrapingPipeline(options = {}) {
  const { injectFakeUrl = false } = options;
  const reporter = new RunReporter();

  console.log('--- Step 1: Discovering Catalogue Pages ---');
  const discovery = await discoverCatalogueBooks();
  console.log(
    `Discovered ${discovery.uniqueUrlsCount} books across ${discovery.cataloguePagesCount} catalogue pages.`
  );

  const bookList = [...discovery.books];

  // Stage 5 Checkpoint: In deliberate test mode, inject a single fake URL to test fault isolation
  if (injectFakeUrl) {
    console.log('[TEST MODE] Injecting 1 deliberately broken fake book URL to test failure survival...');
    bookList.push({
      productUrl: 'https://books.toscrape.com/catalogue/non-existent-broken-book_9999/index.html',
      sourcePage: 'https://books.toscrape.com/catalogue/page-1.html'
    });
  }

  console.log(`\n--- Step 2: Extracting & Validating ${bookList.length} Books ---`);
  const validRecords = [];
  const errors = [];

  for (let i = 0; i < bookList.length; i++) {
    const { productUrl, sourcePage } = bookList[i];
    const fetchStart = new Date().toISOString();

    try {
      // Fetch book page (uses cache if available, enforces polite rate limit & retries for 5xx/timeouts)
      const fetchResult = await fetchWithCache(productUrl);
      reporter.recordFetch(fetchResult.fromCache);

      // Extract raw record
      const rawRecord = extractRawBookRecord(fetchResult.html, productUrl, sourcePage, fetchStart);

      // Normalize and validate against Zod schema
      const validation = normalizeAndValidateBook(rawRecord);
      reporter.recordRecordValidation(validation.isValid);

      if (validation.isValid) {
        validRecords.push(validation.record);
      } else {
        console.warn(`[INVALID RECORD] ${productUrl}: ${validation.error.reason}`);
        errors.push(validation.error);
      }
    } catch (err) {
      // Stage 5: Handle each page separately so 1 broken page does not kill the run
      console.warn(`[PAGE SKIPPED] Surviving failure on ${productUrl} -> ${err.message}`);
      reporter.recordFailedPage();
      errors.push({
        url: productUrl,
        reason: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  console.log('\n--- Step 3: Storing Data & Enforcing Idempotency ---');
  const { savedCount, errorCount } = await saveResults(validRecords, errors);
  const csvPath = await exportToCsv(validRecords);
  console.log(`Exported clean CSV to: output/books.csv`);

  console.log('\n--- Step 4: Finalizing Run Audit Report & Observability Dashboard ---');
  const { report, reportPath } = await reporter.finish();
  const dashboardPath = await generateDashboard(validRecords, report);
  console.log(`Generated observability dashboard to: output/dashboard.html`);

  console.log('Run Audit Report:', JSON.stringify(report, null, 2));

  return {
    validRecords,
    errors,
    report,
    savedCount,
    errorCount,
    csvPath,
    dashboardPath,
    reportPath
  };
}
