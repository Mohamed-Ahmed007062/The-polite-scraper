import * as cheerio from 'cheerio';
import { config } from './config.js';
import { fetchWithCache } from './client.js';

/**
 * Crawls catalogue pages starting from startUrl, following pagination links,
 * and extracts all product links as absolute URLs.
 *
 * @param {string} [startUrl] - Entry catalogue page URL
 * @param {number} [maxPages] - Max catalogue pages to crawl (default: 3)
 * @returns {Promise<{
 *   cataloguePagesCount: number,
 *   discoveredCount: number,
 *   uniqueUrlsCount: number,
 *   books: Array<{ productUrl: string, sourcePage: string }>
 * }>}
 */
export async function discoverCatalogueBooks(
  startUrl = config.CATALOGUE_PAGE_1_URL,
  maxPages = config.MAX_CATALOGUE_PAGES
) {
  let currentUrl = startUrl;
  let cataloguePagesCount = 0;
  const discovered = [];

  while (currentUrl && cataloguePagesCount < maxPages) {
    const pageNumber = cataloguePagesCount + 1;
    const cacheKey = `catalogue-page-${pageNumber}.html`;

    // Fetch page (from cache if already stored, else network with polite delay)
    const { html } = await fetchWithCache(currentUrl, { cacheKey });
    cataloguePagesCount++;

    const $ = cheerio.load(html);

    // Collect all book links on this catalogue page
    $('article.product_pod h3 a').each((_, el) => {
      const relativeHref = $(el).attr('href');
      if (relativeHref) {
        // Resolve absolute URL using Node's standard URL API
        const absoluteUrl = new URL(relativeHref, currentUrl).href;
        discovered.push({
          productUrl: absoluteUrl,
          sourcePage: currentUrl
        });
      }
    });

    // Follow the "next" page link
    const nextRelativeHref = $('li.next a').attr('href');
    if (nextRelativeHref && cataloguePagesCount < maxPages) {
      currentUrl = new URL(nextRelativeHref, currentUrl).href;
    } else {
      currentUrl = null;
    }
  }

  // De-duplicate book links while preserving discovery order
  const uniqueMap = new Map();
  for (const item of discovered) {
    if (!uniqueMap.has(item.productUrl)) {
      uniqueMap.set(item.productUrl, item);
    }
  }

  const uniqueBooks = Array.from(uniqueMap.values());

  return {
    cataloguePagesCount,
    discoveredCount: discovered.length,
    uniqueUrlsCount: uniqueBooks.length,
    books: uniqueBooks
  };
}
