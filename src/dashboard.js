import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { ensureDirectory } from './client.js';

/**
 * Generates a standalone observability HTML dashboard from books and report data.
 *
 * @param {Array<object>} books
 * @param {object} report
 * @param {string} [outputDir]
 * @returns {Promise<string>}
 */
export async function generateDashboard(books, report, outputDir = config.OUTPUT_DIR) {
  await ensureDirectory(outputDir);
  const dashboardPath = path.join(outputDir, 'dashboard.html');

  const prices = books.map((b) => b.price_gbp).filter((p) => typeof p === 'number');
  const minPrice = prices.length ? Math.min(...prices).toFixed(2) : '0.00';
  const maxPrice = prices.length ? Math.max(...prices).toFixed(2) : '0.00';
  const avgPrice = prices.length ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2) : '0.00';

  const ratingsCount = books.reduce((acc, b) => {
    acc[b.rating_text] = (acc[b.rating_text] || 0) + 1;
    return acc;
  }, {});

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Polite Scraper - Observability Dashboard</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #38bdf8;
      --success: #34d399;
      --warning: #fbbf24;
      --danger: #f87171;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 2rem; line-height: 1.5; }
    .container { max-width: 1200px; margin: 0 auto; }
    header { margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem; }
    h1 { font-size: 1.8rem; color: var(--accent); }
    .subtitle { color: var(--muted); font-size: 0.95rem; margin-top: 0.3rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; }
    .card-label { font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .card-val { font-size: 1.8rem; font-weight: 700; margin-top: 0.5rem; color: var(--text); }
    .card-val.success { color: var(--success); }
    .card-val.warning { color: var(--warning); }
    .card-val.danger { color: var(--danger); }
    table { width: 100%; border-collapse: collapse; background: var(--card-bg); border-radius: 8px; overflow: hidden; border: 1px solid var(--border); }
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
    th { background: #111827; color: var(--muted); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .badge { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; background: #0369a1; color: #e0f2fe; }
    footer { margin-top: 2rem; text-align: center; color: var(--muted); font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>The Polite Scraper - Live Observability</h1>
      <p class="subtitle">Audited data from Books to Scrape (First 3 Catalogue Pages)</p>
    </header>

    <div class="grid">
      <div class="card">
        <div class="card-label">Validated Records</div>
        <div class="card-val success">${report.valid_records || books.length}</div>
      </div>
      <div class="card">
        <div class="card-label">Average Price</div>
        <div class="card-val">&pound;${avgPrice}</div>
      </div>
      <div class="card">
        <div class="card-label">Price Range</div>
        <div class="card-val" style="font-size: 1.3rem;">&pound;${minPrice} - &pound;${maxPrice}</div>
      </div>
      <div class="card">
        <div class="card-label">Cache Hits / Live Fetched</div>
        <div class="card-val">${report.cache_hits} / ${report.pages_fetched}</div>
      </div>
      <div class="card">
        <div class="card-label">Failed Pages</div>
        <div class="card-val ${report.failed_pages > 0 ? 'warning' : 'success'}">${report.failed_pages}</div>
      </div>
      <div class="card">
        <div class="card-label">Execution Duration</div>
        <div class="card-val">${report.duration_seconds}s</div>
      </div>
    </div>

    <h2 style="font-size: 1.25rem; margin-bottom: 1rem; color: var(--muted);">Scraped Catalogue Sample (${books.length} Books)</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Title</th>
          <th>Price</th>
          <th>Rating</th>
          <th>Availability</th>
          <th>Link</th>
        </tr>
      </thead>
      <tbody>
        ${books
          .map(
            (b, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${b.title}</strong></td>
          <td>&pound;${b.price_gbp.toFixed(2)}</td>
          <td><span class="badge">${b.rating_text}</span></td>
          <td>${b.availability_text}</td>
          <td><a href="${b.product_url}" target="_blank" rel="noopener">View &rarr;</a></td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <footer>
      Generated on ${new Date().toUTCString()} &bull; FlyRank Internship W5 A9 &bull; Respectful &amp; Polite Scraping
    </footer>
  </div>
</body>
</html>`;

  await fs.writeFile(dashboardPath, html, 'utf-8');
  return dashboardPath;
}
