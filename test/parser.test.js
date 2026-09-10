import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizePrice, normalizeAndValidateBook } from '../src/normalizer.js';
import { extractRawBookRecord } from '../src/extractor.js';
import { saveResults } from '../src/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, 'fixtures');

const readFixture = (fileName) => fs.readFileSync(path.join(fixturesDir, fileName), 'utf-8');

test('Unit Test 1: Price normalization converts messy text to real float number', () => {
  assert.equal(normalizePrice('£51.77'), 51.77);
  assert.equal(normalizePrice('  £ 19.99 '), 19.99);
  assert.equal(normalizePrice('100.00'), 100.0);
  assert.equal(normalizePrice('£0.99'), 0.99);

  // Throws on malformed price strings
  assert.throws(() => normalizePrice('Not a price'), /Unable to parse numeric price/);
  assert.throws(() => normalizePrice(''), /Invalid priceText input/);
});

test('Unit Test 2: Relative to absolute URL resolution handles deep and shallow links safely', () => {
  const baseUrl = 'https://books.toscrape.com/catalogue/page-1.html';
  const relativeLink = 'a-light-in-the-attic_1000/index.html';

  const resolved = new URL(relativeLink, baseUrl).href;
  assert.equal(resolved, 'https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html');
  assert.ok(resolved.startsWith('https://'));

  // Also test resolving from nested category path
  const nestedCategoryBase = 'https://books.toscrape.com/catalogue/category/books_1/index.html';
  const nestedRelative = '../../tipping-the-velvet_999/index.html';
  const resolvedNested = new URL(nestedRelative, nestedCategoryBase).href;
  assert.equal(resolvedNested, 'https://books.toscrape.com/catalogue/tipping-the-velvet_999/index.html');
});

test('Unit Test 3: Missing description produces strict null (never invented text)', () => {
  const html = readFixture('missing-description.html');
  const dummyUrl = 'https://books.toscrape.com/catalogue/missing-desc_100/index.html';
  const sourcePage = 'https://books.toscrape.com/catalogue/page-1.html';

  const raw = extractRawBookRecord(html, dummyUrl, sourcePage);
  assert.equal(raw.title, 'Book Without Description');
  assert.equal(raw.description, null, 'Description must be null when absent from HTML');

  const validated = normalizeAndValidateBook(raw);
  assert.ok(validated.isValid);
  assert.equal(validated.record.description, null);
});

test('Unit Test 4: Duplicate canonical URLs are deduplicated idempotently', async () => {
  const sampleBook1 = {
    title: 'Book A',
    product_url: 'https://books.toscrape.com/catalogue/book-a_1/index.html',
    price_text: '£10.00',
    price_gbp: 10.0,
    availability_text: 'In stock',
    rating_text: 'Five',
    description: 'Sample A',
    source_page: 'https://books.toscrape.com/catalogue/page-1.html',
    fetched_at: new Date().toISOString()
  };

  const sampleBookDuplicate = {
    ...sampleBook1,
    title: 'Book A (Duplicate Attempt)'
  };

  const tempOutputDir = path.join(__dirname, '../cache/test-output');
  const result = await saveResults([sampleBook1, sampleBookDuplicate], [], tempOutputDir);

  assert.equal(result.savedCount, 1, 'Duplicate record with same canonical product_url must be deduplicated to 1');
});

test('Unit Test 5: Malformed fixture without product structure fails parsing gracefully', () => {
  const html = readFixture('malformed.html');
  const dummyUrl = 'https://books.toscrape.com/catalogue/malformed_999/index.html';
  const sourcePage = 'https://books.toscrape.com/catalogue/page-1.html';

  assert.throws(
    () => extractRawBookRecord(html, dummyUrl, sourcePage),
    /Malformed page structure: article\.product_page not found/
  );
});

test('Unit Test 6: Messy whitespace is cleaned and collapsed properly', () => {
  const html = readFixture('whitespace-messy.html');
  const dummyUrl = 'https://books.toscrape.com/catalogue/messy_50/index.html';
  const sourcePage = 'https://books.toscrape.com/catalogue/page-1.html';

  const raw = extractRawBookRecord(html, dummyUrl, sourcePage);
  assert.equal(raw.title, 'The   Messy    Title   With Extra    Spaces');
  assert.equal(raw.availability_text, 'In stock (12 available)');
  assert.equal(raw.rating_text, 'Four');
  assert.equal(raw.price_text, '£42.50');
  assert.equal(raw.description, 'A description surrounded by strange padding and newlines.');

  const validated = normalizeAndValidateBook(raw);
  assert.ok(validated.isValid);
  assert.equal(validated.record.price_gbp, 42.5);
});
