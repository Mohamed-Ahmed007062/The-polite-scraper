import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { runScrapingPipeline } from './pipeline.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Helper to safely read JSON from output
async function readJsonFile(fileName) {
  const filePath = path.join(config.OUTPUT_DIR, fileName);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}

// 1. API Overview
app.get('/', (req, res) => {
  res.json({
    name: 'The Polite Scraper API',
    version: '1.0.0',
    description: 'REST API interface for Books to Scrape pipeline (FlyRank W5 · A9)',
    endpoints: {
      'GET /health': 'System health check and scraper status',
      'GET /api/books': 'Retrieve validated books (supports ?search, ?rating, ?minPrice, ?maxPrice, ?limit)',
      'GET /api/books/:id': 'Retrieve a specific book by 1-based index or keyword',
      'GET /api/report': 'View the latest run-report.json audit metrics',
      'GET /api/errors': 'View errors.json tracking quarantined failures',
      'POST /api/scrape': 'Trigger the scraping pipeline (accepts { "testFailure": true/false })',
      'GET /api/csv': 'Download books.csv format',
      'GET /dashboard': 'View the HTML observability dashboard'
    }
  });
});

// 2. Health Check
app.get('/health', async (req, res) => {
  const report = await readJsonFile('run-report.json');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime_seconds: process.uptime(),
    node_version: process.version,
    last_scrape: report
      ? {
          completed_at: report.end_time,
          valid_records: report.valid_records,
          failed_pages: report.failed_pages,
          duration_seconds: report.duration_seconds
        }
      : 'No run executed yet'
  });
});

// 3. Get Books (with filtering and pagination)
app.get('/api/books', async (req, res) => {
  const books = await readJsonFile('books.json');
  if (!books) {
    return res.status(503).json({ error: 'Data not available. Please run POST /api/scrape first.' });
  }

  let filtered = [...books];
  const { search, rating, minPrice, maxPrice, limit, offset } = req.query;

  if (search) {
    const term = search.toLowerCase();
    filtered = filtered.filter(
      (b) => b.title.toLowerCase().includes(term) || (b.description && b.description.toLowerCase().includes(term))
    );
  }

  if (rating) {
    filtered = filtered.filter((b) => b.rating_text.toLowerCase() === rating.toLowerCase());
  }

  if (minPrice) {
    const min = parseFloat(minPrice);
    if (!isNaN(min)) filtered = filtered.filter((b) => b.price_gbp >= min);
  }

  if (maxPrice) {
    const max = parseFloat(maxPrice);
    if (!isNaN(max)) filtered = filtered.filter((b) => b.price_gbp <= max);
  }

  const totalMatches = filtered.length;
  const start = parseInt(offset, 10) || 0;
  const count = parseInt(limit, 10) || totalMatches;

  const paginated = filtered.slice(start, start + count);

  res.json({
    total: totalMatches,
    count: paginated.length,
    offset: start,
    limit: count,
    data: paginated
  });
});

// 4. Get Book by ID (1-based index)
app.get('/api/books/:id', async (req, res) => {
  const books = await readJsonFile('books.json');
  if (!books) {
    return res.status(503).json({ error: 'Data not available. Run POST /api/scrape first.' });
  }

  const id = parseInt(req.params.id, 10);
  if (!isNaN(id) && id >= 1 && id <= books.length) {
    return res.json({ id, ...books[id - 1] });
  }

  // Fallback search by title
  const book = books.find((b) => b.title.toLowerCase().includes(req.params.id.toLowerCase()));
  if (book) {
    return res.json(book);
  }

  res.status(404).json({ error: `Book not found for identifier: ${req.params.id}` });
});

// 5. Get Run Audit Report
app.get('/api/report', async (req, res) => {
  const report = await readJsonFile('run-report.json');
  if (!report) {
    return res.status(404).json({ error: 'No run report found. Run POST /api/scrape first.' });
  }
  res.json(report);
});

// 6. Get Errors Log
app.get('/api/errors', async (req, res) => {
  const errors = await readJsonFile('errors.json');
  res.json(errors || []);
});

// 7. Trigger Live Scraper
app.post('/api/scrape', async (req, res) => {
  try {
    const { testFailure = false } = req.body || {};
    const result = await runScrapingPipeline({ injectFakeUrl: testFailure });

    res.json({
      message: 'Scraping pipeline executed successfully.',
      test_failure_mode: testFailure,
      saved_records: result.savedCount,
      report: result.report
    });
  } catch (err) {
    res.status(500).json({ error: 'Pipeline execution failed', details: err.message });
  }
});

// 8. Download / View CSV
app.get('/api/csv', async (req, res) => {
  const csvPath = path.join(config.OUTPUT_DIR, 'books.csv');
  try {
    const csvData = await fs.readFile(csvPath, 'utf-8');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="books.csv"');
    res.send(csvData);
  } catch (err) {
    res.status(404).json({ error: 'CSV file not found. Run POST /api/scrape first.' });
  }
});

// 9. Observability Dashboard HTML
app.get('/dashboard', async (req, res) => {
  const dashPath = path.join(config.OUTPUT_DIR, 'dashboard.html');
  try {
    const html = await fs.readFile(dashPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(404).send('<h1>Dashboard not found. Run POST /api/scrape first.</h1>');
  }
});

app.listen(PORT, () => {
  console.log(`[API Server] The Polite Scraper server running on http://localhost:${PORT}`);
  console.log(`[API Server] Open http://localhost:${PORT}/dashboard in your browser.`);
});
