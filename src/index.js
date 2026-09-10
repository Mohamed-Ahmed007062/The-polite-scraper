import { discoverCatalogueBooks } from './crawler.js';
import { fetchWithCache } from './client.js';
import { extractRawBookRecord } from './extractor.js';
import { normalizeAndValidateBook } from './normalizer.js';
import { saveResults } from './storage.js';

async function main() {
  console.log('=== Stage 4: Clean It, Check It, Store It ===');

  // 1. Discover books from 3 catalogue pages
  const discovery = await discoverCatalogueBooks();
  console.log(`Discovered ${discovery.uniqueUrlsCount} books across ${discovery.cataloguePagesCount} catalogue pages.`);

  const validRecords = [];
  const errors = [];

  // 2. Fetch, extract, normalize, and validate each book
  for (const { productUrl, sourcePage } of discovery.books) {
    const fetchStart = new Date().toISOString();
    const { html } = await fetchWithCache(productUrl);
    const rawRecord = extractRawBookRecord(html, productUrl, sourcePage, fetchStart);

    const validation = normalizeAndValidateBook(rawRecord);
    if (validation.isValid) {
      validRecords.push(validation.record);
    } else {
      errors.push(validation.error);
    }
  }

  // 3. Persist results
  const { savedCount, errorCount, booksPath } = await saveResults(validRecords, errors);

  console.log('\n--- Stage 4 Verification ---');
  console.log(`Saved records in books.json: ${savedCount}`);
  console.log(`Errors in errors.json: ${errorCount}`);

  // 4. Verify checkpoint assertions
  const allPricesAreNumbers = validRecords.every((b) => typeof b.price_gbp === 'number' && !isNaN(b.price_gbp));
  const allUrlsStartHttps = validRecords.every((b) => b.product_url.startsWith('https://'));

  console.log(`Every price_gbp is a number: ${allPricesAreNumbers}`);
  console.log(`Every product_url starts with https://: ${allUrlsStartHttps}`);

  if (savedCount === 60 && allPricesAreNumbers && allUrlsStartHttps) {
    console.log('CHECKPOINT PASSED: books.json has exactly 60 validated records!');
  } else {
    console.error('CHECKPOINT FAILED: Check criteria mismatch.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[FATAL ERROR]', err.message);
  process.exit(1);
});
