/**
 * AI Rematch Scraper Implementation (Quarantined)
 *
 * Generated based on prompt specification for Books to Scrape.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { z } from 'zod';

const BASE_URL = 'https://books.toscrape.com/catalogue/page-1.html';
const USER_AGENT = 'FlyRankScraperBot/1.0';
const DELAY = 500;

// In-memory cache attempt (lost across restarts!)
const memoryCache = new Map();

const BookSchema = z.object({
  title: z.string(),
  product_url: z.string().url(),
  price_text: z.string(),
  price_gbp: z.number(),
  availability_text: z.string(),
  rating_text: z.string(),
  description: z.string().nullable().optional(),
  source_page: z.string(),
  fetched_at: z.string()
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPage(url) {
  if (memoryCache.has(url)) {
    return memoryCache.get(url);
  }

  await sleep(DELAY);
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

  const text = await res.text();
  memoryCache.set(url, text);
  return text;
}

async function scrapeAi() {
  const startTime = new Date();
  console.log('[AI Scraper] Starting crawl...');

  let currentUrl = BASE_URL;
  let pageCount = 0;
  const bookUrls = [];

  // Crawl first 3 pages
  while (currentUrl && pageCount < 3) {
    try {
      const html = await fetchPage(currentUrl);
      const $ = cheerio.load(html);
      pageCount++;

      $('article.product_pod h3 a').each((_, el) => {
        const href = $(el).attr('href');
        // AI typical approach: string replacement rather than proper relative URL base resolution
        const cleanHref = href.replace('../../../', '').replace('../../', '');
        const fullUrl = `https://books.toscrape.com/catalogue/${cleanHref}`;
        bookUrls.push({ url: fullUrl, source: currentUrl });
      });

      const next = $('li.next a').attr('href');
      if (next && pageCount < 3) {
        currentUrl = new URL(next, currentUrl).href;
      } else {
        currentUrl = null;
      }
    } catch (e) {
      console.error('[AI Scraper] Catalogue crawl error:', e.message);
      break;
    }
  }

  console.log(`[AI Scraper] Discovered ${bookUrls.length} books.`);

  const books = [];
  let failures = 0;

  for (const item of bookUrls) {
    try {
      const html = await fetchPage(item.url);
      const $ = cheerio.load(html);

      const title = $('h1').text().trim();
      const priceText = $('.price_color').text().trim();
      // AI simple regex extraction
      const priceVal = parseFloat(priceText.replace('£', ''));
      const avail = $('.availability').text().replace(/\s+/g, ' ').trim();
      
      const starClass = $('.star-rating').attr('class') || '';
      const rating = starClass.replace('star-rating', '').trim();

      const desc = $('#product_description').next('p').text().trim() || null;

      const record = {
        title,
        product_url: item.url,
        price_text: priceText,
        price_gbp: priceVal,
        availability_text: avail,
        rating_text: rating,
        description: desc,
        source_page: item.source,
        fetched_at: new Date().toISOString()
      };

      const parsed = BookSchema.parse(record);
      books.push(parsed);
    } catch (err) {
      console.error(`[AI Scraper] Failed ${item.url}:`, err.message);
      failures++;
    }
  }

  // Deduplication
  const uniqueBooks = Array.from(new Map(books.map((b) => [b.product_url, b])).values());

  await fs.mkdir('./output', { recursive: true });
  await fs.writeFile('./output/ai-books.json', JSON.stringify(uniqueBooks, null, 2));

  const endTime = new Date();
  const report = {
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    total_discovered: bookUrls.length,
    valid_records: uniqueBooks.length,
    failures
  };
  await fs.writeFile('./output/ai-report.json', JSON.stringify(report, null, 2));
  console.log('[AI Scraper] Finished. Report:', report);
}

scrapeAi().catch(console.error);
