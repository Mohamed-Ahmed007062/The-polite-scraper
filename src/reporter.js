import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { ensureDirectory } from './client.js';

export class RunReporter {
  constructor() {
    this.startTime = new Date();
    this.endTime = null;
    this.pagesFetched = 0;
    this.cacheHits = 0;
    this.validRecords = 0;
    this.invalidRecords = 0;
    this.failedPages = 0;
  }

  recordFetch(fromCache) {
    if (fromCache) {
      this.cacheHits++;
    } else {
      this.pagesFetched++;
    }
  }

  recordRecordValidation(isValid) {
    if (isValid) {
      this.validRecords++;
    } else {
      this.invalidRecords++;
    }
  }

  recordFailedPage() {
    this.failedPages++;
  }

  async finish(outputDir = config.OUTPUT_DIR) {
    this.endTime = new Date();
    const durationSeconds = Number(((this.endTime.getTime() - this.startTime.getTime()) / 1000).toFixed(2));

    const report = {
      start_time: this.startTime.toISOString(),
      end_time: this.endTime.toISOString(),
      duration_seconds: durationSeconds,
      pages_fetched: this.pagesFetched,
      cache_hits: this.cacheHits,
      valid_records: this.validRecords,
      invalid_records: this.invalidRecords,
      failed_pages: this.failedPages
    };

    await ensureDirectory(outputDir);
    const reportPath = path.join(outputDir, 'run-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    return { report, reportPath };
  }
}
