import { discoverCatalogueBooks } from './crawler.js';
import { fetchWithCache } from './client.js';
import { extractRawBookRecord } from './extractor.js';

async function main() {
  console.log('=== Stage 3: Extract Book Details ===');

  // 1. Discover the 60 book URLs
  const discovery = await discoverCatalogueBooks();
  console.log(`Discovered ${discovery.uniqueUrlsCount} books across ${discovery.cataloguePagesCount} catalogue pages.`);

  const rawRecords = [];

  // 2. Extract raw records for each book
  for (let i = 0; i < discovery.books.length; i++) {
    const { productUrl, sourcePage } = discovery.books[i];
    const fetchStart = new Date().toISOString();
    const { html } = await fetchWithCache(productUrl);
    const record = extractRawBookRecord(html, productUrl, sourcePage, fetchStart);
    rawRecords.push(record);
  }

  // 3. Print Checkpoint output: one complete raw record and summary detail_pages=60
  console.log('\n--- Sample Complete Raw Record ---');
  console.log(JSON.stringify(rawRecords[0], null, 2));
  console.log('\n--- Checkpoint Summary ---');
  console.log(`detail_pages=${rawRecords.length}`);
}

main().catch((err) => {
  console.error('[FATAL ERROR]', err.message);
  process.exit(1);
});
