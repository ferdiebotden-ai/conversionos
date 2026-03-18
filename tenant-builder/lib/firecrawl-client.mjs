/**
 * Firecrawl SDK wrapper with credit tracking and batch support.
 * Reads FIRECRAWL_API_KEY from env.
 */

import FirecrawlApp from '@mendable/firecrawl-js';
import * as logger from './logger.mjs';

let app = null;
let creditsUsed = 0;

// Rate limiting state
let requestTimestamps = [];
let rateLimitRpm = 30; // default, overridden by configure()

/**
 * Configure rate limiting from config.yaml.
 * @param {{ requests_per_minute?: number }} opts
 */
export function configure(opts = {}) {
  if (opts.requests_per_minute) rateLimitRpm = opts.requests_per_minute;
}

/**
 * Wait if we've exceeded the rate limit (sliding window).
 */
async function enforceRateLimit() {
  const now = Date.now();
  const windowStart = now - 60000;
  requestTimestamps = requestTimestamps.filter(t => t > windowStart);

  if (requestTimestamps.length >= rateLimitRpm) {
    const oldestInWindow = requestTimestamps[0];
    const waitMs = oldestInWindow + 60000 - now + 100; // +100ms buffer
    logger.debug(`Rate limit: waiting ${waitMs}ms (${requestTimestamps.length} requests in last 60s)`);
    await new Promise(r => setTimeout(r, waitMs));
  }

  requestTimestamps.push(Date.now());
}

/**
 * Retry on 429 with exponential backoff.
 * @param {() => Promise<T>} fn
 * @param {number} maxRetries
 * @returns {Promise<T>}
 * @template T
 */
async function retryOn429(fn, maxRetries = 4) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const is429 = e.statusCode === 429 || e.message?.includes('429') || e.message?.includes('rate limit');
      if (is429 && attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s, 8s
        logger.warn(`Firecrawl 429 rate limited (attempt ${attempt + 1}/${maxRetries + 1}). Waiting ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
}

/**
 * Get or create the Firecrawl client singleton.
 */
function getApp() {
  if (app) return app;

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error('Missing FIRECRAWL_API_KEY');

  const fc = new FirecrawlApp({ apiKey });
  // v4.13.0+ requires .v1 accessor for scrape/search methods
  app = fc.v1 || fc;
  return app;
}

/**
 * Search the web for a query string.
 * @param {string} query - search query
 * @param {object} [options]
 * @param {number} [options.limit=10] - max results
 * @returns {Promise<Array<{ url: string, title: string, description: string }>>}
 */
export async function search(query, options = {}) {
  const fc = getApp();
  const { limit = 10 } = options;

  logger.info(`Firecrawl search: "${query}" (limit ${limit})`);
  await enforceRateLimit();
  const result = await retryOn429(() => fc.search(query, { limit }));
  creditsUsed += 1;

  if (!result.success) {
    throw new Error(`Firecrawl search failed: ${result.error || 'unknown error'}`);
  }

  return (result.data || []).map(r => ({
    url: r.url,
    title: r.title || '',
    description: r.description || '',
  }));
}

/**
 * Scrape a single URL and return markdown + metadata + optional branding.
 * @param {string} url - URL to scrape
 * @param {object} [options]
 * @param {string[]} [options.formats=['markdown']] - output formats (supports 'markdown', 'branding', etc.)
 * @param {number} [options.timeout=30000] - timeout in ms
 * @returns {Promise<{ markdown: string, metadata: object, branding: object|null }>}
 */
export async function scrape(url, options = {}) {
  const fc = getApp();
  const { formats = ['markdown'], timeout = 30000 } = options;

  logger.debug(`Firecrawl scrape: ${url} (formats: ${formats.join(', ')})`);
  await enforceRateLimit();
  const result = await retryOn429(() => fc.scrapeUrl(url, { formats, timeout }));
  creditsUsed += 1;

  if (!result.success) {
    throw new Error(`Firecrawl scrape failed for ${url}: ${result.error || 'unknown'}`);
  }

  return {
    markdown: result.markdown || '',
    metadata: result.metadata || {},
    branding: result.branding || null,
    images: result.images || null,
    actions: result.actions || null,
    screenshot: result.screenshot || null,
  };
}

/**
 * Map a website to discover all its URLs.
 * @param {string} url - root URL to map
 * @param {object} [options]
 * @param {number} [options.limit=50] - max URLs to return
 * @param {string} [options.search] - filter URLs by keyword
 * @returns {Promise<{ links: Array<string|{url:string,title?:string}> }>}
 */
export async function map(url, options = {}) {
  const fc = getApp();
  const { limit = 50, search } = options;

  logger.info(`Firecrawl map: ${url} (limit ${limit}${search ? `, search: "${search}"` : ''})`);
  await enforceRateLimit();
  // Defensive: SDK may expose map() or mapUrl() depending on version
  const mapFn = fc.mapUrl || fc.map;
  if (!mapFn) throw new Error('Firecrawl SDK has no map/mapUrl method — check SDK version');
  const result = await retryOn429(() => mapFn.call(fc, url, { limit, ...(search ? { search } : {}) }));
  creditsUsed += 1;

  if (!result.success) {
    throw new Error(`Firecrawl map failed for ${url}: ${result.error || 'unknown'}`);
  }

  return { links: result.links || [] };
}

/**
 * Scrape a URL with full options (formats, actions, onlyMainContent).
 * Extended version of scrape() that passes through all Firecrawl options.
 * @param {string} url - URL to scrape
 * @param {object} [options] - all Firecrawl scrapeUrl options
 * @returns {Promise<object>} full Firecrawl response
 */
export async function scrapeAdvanced(url, options = {}) {
  const fc = getApp();
  const { timeout = 30000, ...rest } = options;

  logger.debug(`Firecrawl scrapeAdvanced: ${url} (options: ${JSON.stringify(Object.keys(rest))})`);
  await enforceRateLimit();
  const result = await retryOn429(() => fc.scrapeUrl(url, { timeout, ...rest }));
  creditsUsed += 1;

  if (!result.success) {
    throw new Error(`Firecrawl scrapeAdvanced failed for ${url}: ${result.error || 'unknown'}`);
  }

  return result;
}

/**
 * Batch scrape multiple URLs simultaneously.
 * Starts the batch and polls until complete.
 * @param {string[]} urls - URLs to scrape
 * @param {object} [scrapeOptions] - options for each scrape (formats, actions, etc.)
 * @param {number} [pollInterval=3000] - ms between status checks
 * @param {number} [maxWaitMs=300000] - max wait time (5 min)
 * @returns {Promise<Array<object>>} array of scrape results
 */
export async function batchScrape(urls, scrapeOptions = {}, pollInterval = 3000, maxWaitMs = 300000) {
  const fc = getApp();

  logger.info(`Firecrawl batchScrape: ${urls.length} URLs`);
  await enforceRateLimit();

  const batch = await retryOn429(() => fc.asyncBulkScrapeUrls(urls, scrapeOptions));

  if (!batch.success) {
    throw new Error(`Firecrawl batchScrape failed: ${batch.error || 'unknown'}`);
  }

  const jobId = batch.id;
  logger.info(`Batch job started: ${jobId}`);

  // Poll for completion
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(r => setTimeout(r, pollInterval));
    const status = await fc.checkBulkScrapeStatus(jobId);

    if (status.status === 'completed') {
      creditsUsed += urls.length;
      logger.info(`Batch job ${jobId} completed: ${status.completed}/${status.total} pages`);
      return status.data || [];
    }

    if (status.status === 'failed') {
      throw new Error(`Batch job ${jobId} failed`);
    }

    logger.debug(`Batch ${jobId}: ${status.completed || 0}/${status.total || urls.length} pages...`);
  }

  throw new Error(`Batch job ${jobId} timed out after ${maxWaitMs}ms`);
}

/**
 * Get total credits used in this session.
 * @returns {number}
 */
export function getCreditsUsed() {
  return creditsUsed;
}

/**
 * Reset the credit counter.
 */
export function resetCredits() {
  creditsUsed = 0;
}
