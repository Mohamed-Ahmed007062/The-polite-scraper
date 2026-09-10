import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { ensureDirectory } from './client.js';

/**
 * Persists validated book records to output/books.json and errors to output/errors.json.
 * Enforces idempotency by deduplicating on canonical product_url.
 *
 * @param {Array<object>} records - Validated book records
 * @param {Array<object>} errors - Error records
 * @param {string} [outputDir] - Target directory
 * @returns {Promise<{ savedCount: number, errorCount: number, booksPath: string, errorsPath: string }>}
 */
export async function saveResults(records, errors = [], outputDir = config.OUTPUT_DIR) {
  await ensureDirectory(outputDir);

  // Enforce idempotency: deduplicate records by canonical product_url
  const recordMap = new Map();
  for (const item of records) {
    if (item && item.product_url) {
      recordMap.set(item.product_url, item);
    }
  }

  const uniqueRecords = Array.from(recordMap.values());

  const booksPath = path.join(outputDir, 'books.json');
  await fs.writeFile(booksPath, JSON.stringify(uniqueRecords, null, 2), 'utf-8');

  const errorsPath = path.join(outputDir, 'errors.json');
  await fs.writeFile(errorsPath, JSON.stringify(errors, null, 2), 'utf-8');

  return {
    savedCount: uniqueRecords.length,
    errorCount: errors.length,
    booksPath,
    errorsPath
  };
}
