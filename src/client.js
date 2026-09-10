import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';

let lastNetworkRequestTime = 0;

/**
 * Pauses execution for a specified duration in milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ensures a directory exists on disk.
 * @param {string} dirPath
 */
export async function ensureDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

/**
 * Generates a safe cache file name from a URL if not explicitly provided.
 * @param {string} url
 * @returns {string}
 */
export function urlToCacheFileName(url) {
  const parsed = new URL(url);
  let cleanPath = parsed.pathname.replace(/^\/+|\/+$/g, '').replace(/\//g, '_');
  if (!cleanPath) cleanPath = 'index';
  if (!cleanPath.endsWith('.html')) cleanPath += '.html';
  return cleanPath;
}

/**
 * Calculates retry delay, honoring Retry-After header or exponential backoff with jitter.
 *
 * @param {Response} [response]
 * @param {number} attempt
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(response, attempt) {
  if (response && response.headers) {
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }
  }

  // Exponential backoff: 2^attempt * 1000ms + random jitter (50-200ms)
  const baseDelay = Math.pow(2, attempt) * 1000;
  const jitter = Math.floor(Math.random() * 150) + 50;
  return baseDelay + jitter;
}

/**
 * Fetches HTML from cache if present, otherwise makes a polite HTTP request with
 * exponential backoff retries and structured logging.
 *
 * @param {string} url - Target URL to fetch
 * @param {object} [options]
 * @param {string} [options.cacheKey] - Custom cache filename
 * @param {number} [options.maxRetries=2] - Maximum retry attempts for transient errors
 * @returns {Promise<{ html: string, fromCache: boolean, status: number, size: number }>}
 */
export async function fetchWithCache(url, options = {}) {
  const { cacheKey, maxRetries = 2 } = options;
  await ensureDirectory(config.CACHE_DIR);

  const fileName = cacheKey || urlToCacheFileName(url);
  const cacheFilePath = path.join(config.CACHE_DIR, fileName);

  // 1. Check local disk cache
  try {
    const cachedContent = await fs.readFile(cacheFilePath, 'utf-8');
    const size = Buffer.byteLength(cachedContent, 'utf-8');
    console.log(`[CACHE HIT] ${url} (${size} bytes) -> cache/${fileName}`);
    return { html: cachedContent, fromCache: true, status: 200, size };
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[WARN] Failed to read cache for ${url}: ${err.message}`);
    }
  }

  // 2. Polite Rate Limiting: enforce minimum delay between live requests
  const elapsed = Date.now() - lastNetworkRequestTime;
  if (lastNetworkRequestTime > 0 && elapsed < config.POLITE_DELAY_MS) {
    await sleep(config.POLITE_DELAY_MS - elapsed);
  }

  console.log(`[FETCH] ${url}`);
  lastNetworkRequestTime = Date.now();

  let attempt = 0;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': config.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Only HTTP 200 means success
      if (response.status === 200) {
        const html = await response.text();
        const size = Buffer.byteLength(html, 'utf-8');

        // Save to cache
        await fs.writeFile(cacheFilePath, html, 'utf-8');
        console.log(`[FETCH SUCCESS] ${url} (${size} bytes) -> saved to cache/${fileName}`);

        return { html, fromCache: false, status: 200, size };
      }

      // Permanent errors: never retry 404 (not found) or 403 (forbidden)
      if (response.status === 404 || response.status === 403) {
        const error = new Error(`HTTP ${response.status}: Failed to fetch ${url}`);
        error.status = response.status;
        throw error;
      }

      // Server error (5xx) or 429 (rate limited) -> eligible for retry
      if (attempt < maxRetries) {
        const delay = calculateBackoffDelay(response, attempt);
        console.warn(
          JSON.stringify({
            level: 'warn',
            event: 'retry_backoff',
            url,
            status: response.status,
            attempt: attempt + 1,
            retry_delay_ms: delay
          })
        );
        attempt++;
        await sleep(delay);
        continue;
      }

      const error = new Error(`HTTP ${response.status}: Failed after ${attempt} retries`);
      error.status = response.status;
      throw error;
    } catch (err) {
      clearTimeout(timeoutId);

      // Never retry 404 or 403
      if (err.status === 404 || err.status === 403) {
        throw err;
      }

      const isTimeout = err.name === 'AbortError';

      if (attempt < maxRetries) {
        const delay = calculateBackoffDelay(null, attempt);
        console.warn(
          JSON.stringify({
            level: 'warn',
            event: 'retry_backoff',
            url,
            reason: isTimeout ? 'timeout' : err.message,
            attempt: attempt + 1,
            retry_delay_ms: delay
          })
        );
        attempt++;
        await sleep(delay);
        continue;
      }

      throw err;
    }
  }
}
