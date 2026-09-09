import { config } from './config.js';
import { fetchWithCache } from './client.js';

async function main() {
  console.log('=== Stage 1: Fetch Once, Cache Once ===');
  const targetUrl = config.CATALOGUE_PAGE_1_URL;
  const result = await fetchWithCache(targetUrl, { cacheKey: 'catalogue-page-1.html' });

  console.log(`Summary: Status=${result.status}, FromCache=${result.fromCache}, Size=${result.size} bytes`);
}

main().catch((err) => {
  console.error('[FATAL ERROR]', err.message);
  process.exit(1);
});
