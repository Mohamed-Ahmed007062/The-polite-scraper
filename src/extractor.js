import * as cheerio from 'cheerio';

/**
 * Extracts the 8 required raw fields from a book's detail page HTML.
 * Scoped strictly to the product area (article.product_page).
 *
 * @param {string} html - Raw HTML of the book detail page
 * @param {string} productUrl - Absolute URL of the book
 * @param {string} sourcePage - Provenance: catalogue page URL where book was listed
 * @param {string} [fetchedAt] - ISO timestamp of when the page arrived
 * @returns {{
 *   title: string,
 *   product_url: string,
 *   price_text: string,
 *   availability_text: string,
 *   rating_text: string,
 *   description: string | null,
 *   source_page: string,
 *   fetched_at: string
 * }}
 */
export function extractRawBookRecord(html, productUrl, sourcePage, fetchedAt = new Date().toISOString()) {
  const $ = cheerio.load(html);
  const productArea = $('article.product_page');

  // If the product area is missing, throw an informative parsing error
  if (!productArea.length) {
    throw new Error(`Malformed page structure: article.product_page not found on ${productUrl}`);
  }

  // 1. Title: inside .product_main h1
  const title = productArea.find('.product_main h1').text().trim();

  // 2. Price text: inside .product_main p.price_color
  const priceText = productArea.find('.product_main p.price_color').text().trim();

  // 3. Availability text: normalize internal whitespace
  const rawAvailability = productArea.find('.product_main p.instock.availability').text();
  const availabilityText = rawAvailability ? rawAvailability.replace(/\s+/g, ' ').trim() : '';

  // 4. Rating text: extracted from class (e.g., 'star-rating Three' -> 'Three')
  const ratingEl = productArea.find('.product_main p.star-rating');
  const ratingClasses = (ratingEl.attr('class') || '').split(/\s+/);
  const ratingText = ratingClasses.find((cls) => cls && cls !== 'star-rating') || 'None';

  // 5. Description: paragraph immediately following #product_description
  const descEl = productArea.find('#product_description').next('p');
  const rawDesc = descEl.text().trim();
  const description = rawDesc.length > 0 ? rawDesc : null;

  return {
    title,
    product_url: productUrl,
    price_text: priceText,
    availability_text: availabilityText,
    rating_text: ratingText,
    description,
    source_page: sourcePage,
    fetched_at: fetchedAt
  };
}
