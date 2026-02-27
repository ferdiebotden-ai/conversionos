/**
 * Retry utility with exponential backoff.
 *
 * Usage:
 *   const result = await withRetry(() => uploadImage(url), { maxRetries: 3 });
 */

import * as logger from './logger.mjs';

/**
 * Execute a function with retry and exponential backoff.
 * @param {() => Promise<T>} fn - async function to retry
 * @param {object} [options]
 * @param {number} [options.maxRetries=3] - maximum number of retries (not including initial attempt)
 * @param {number} [options.baseDelay=1000] - initial delay in ms
 * @param {number} [options.multiplier=3] - backoff multiplier (1000, 3000, 9000)
 * @param {string} [options.label='operation'] - label for log messages
 * @returns {Promise<T>}
 * @template T
 */
export async function withRetry(fn, options = {}) {
  const { maxRetries = 3, baseDelay = 1000, multiplier = 3, label = 'operation' } = options;

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(multiplier, attempt);
        logger.warn(`${label} failed (attempt ${attempt + 1}/${maxRetries + 1}): ${e.message?.slice(0, 80)}. Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}
