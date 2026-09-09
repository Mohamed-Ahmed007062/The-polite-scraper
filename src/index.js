import { discoverCatalogueBooks } from './crawler.js';

async function main() {
  console.log('=== Stage 2: Discover Three Catalogue Pages ===');
  const result = await discoverCatalogueBooks();

  console.log(
    `catalogue_pages=${result.cataloguePagesCount}, discovered=${result.discoveredCount}, unique_urls=${result.uniqueUrlsCount}`
  );
}

main().catch((err) => {
  console.error('[FATAL ERROR]', err.message);
  process.exit(1);
});
