import path from 'node:path';

export const config = {
  BASE_URL: 'https://books.toscrape.com/',
  CATALOGUE_PAGE_1_URL: 'https://books.toscrape.com/catalogue/page-1.html',
  USER_AGENT: 'FlyRankInternship-A9/1.0 (+https://github.com/Mohamed-Ahmed007062/the-polite-scraper)',
  REQUEST_TIMEOUT_MS: 8000,
  POLITE_DELAY_MS: 600, // At least 500ms between live requests
  CACHE_DIR: path.resolve(process.cwd(), 'cache'),
  OUTPUT_DIR: path.resolve(process.cwd(), 'output'),
  MAX_CATALOGUE_PAGES: 3,
  TOTAL_EXPECTED_BOOKS: 60
};
