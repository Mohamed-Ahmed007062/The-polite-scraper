import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { ensureDirectory } from './client.js';

/**
 * Escapes and quotes a field for RFC 4180 compliant CSV output.
 * @param {any} val
 * @returns {string}
 */
function escapeCsvField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  // Flatten multiline strings/newlines to single line for cleaner tabular representation
  const flattened = str.replace(/[\r\n]+/g, ' ').trim();
  // Escape double quotes by doubling them
  const escaped = flattened.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Exports validated book records to a clean CSV file.
 *
 * @param {Array<object>} records
 * @param {string} [outputDir]
 * @returns {Promise<string>} Path to generated CSV file
 */
export async function exportToCsv(records, outputDir = config.OUTPUT_DIR) {
  await ensureDirectory(outputDir);
  const csvPath = path.join(outputDir, 'books.csv');

  const headers = [
    'title',
    'product_url',
    'price_text',
    'price_gbp',
    'availability_text',
    'rating_text',
    'description',
    'source_page',
    'fetched_at'
  ];

  const rows = [headers.join(',')];

  for (const item of records) {
    const row = headers.map((header) => escapeCsvField(item[header]));
    rows.push(row.join(','));
  }

  await fs.writeFile(csvPath, rows.join('\n'), 'utf-8');
  return csvPath;
}
