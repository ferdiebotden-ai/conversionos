/**
 * Firecrawl SDK wrapper with credit tracking and batch support.
 * Reads FIRECRAWL_API_KEY from env.
 */

import FirecrawlApp from '@mendable/firecrawl-js';
import * as logger from './logger.mjs';

let app = null;
let creditsUsed = 0;

/**
 * Get or create the Firecrawl client singleton.
 */
function getApp() {
  if (app) return app;

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error('Missing FIRECRAWL_API_KEY');

  app = new FirecrawlApp({ apiKey });
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
  const result = await fc.search(query, { limit });
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
 * Scrape a single URL and return markdown + metadata.
 * @param {string} url - URL to scrape
 * @param {object} [options]
 * @param {string[]} [options.formats=['markdown']] - output formats
 * @param {number} [options.timeout=30000] - timeout in ms
 * @returns {Promise<{ markdown: string, metadata: object }>}
 */
export async function scrape(url, options = {}) {
  const fc = getApp();
  const { formats = ['markdown'], timeout = 30000 } = options;

  logger.debug(`Firecrawl scrape: ${url}`);
  const result = await fc.scrapeUrl(url, { formats, timeout });
  creditsUsed += 1;

  if (!result.success) {
    throw new Error(`Firecrawl scrape failed for ${url}: ${result.error || 'unknown'}`);
  }

  return {
    markdown: result.markdown || '',
    metadata: result.metadata || {},
  };
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
