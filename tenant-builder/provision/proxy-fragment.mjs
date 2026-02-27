/**
 * Write a proxy.ts fragment for a new tenant.
 * Writes a JSON file to results/{date}/proxy-fragments/{site-id}.json.
 * This avoids multiple workers editing proxy.ts simultaneously.
 */

import { writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import * as logger from '../lib/logger.mjs';

/**
 * Write a proxy fragment for later merging.
 * Uses atomic write (temp file + rename) to prevent parallel corruption.
 * @param {string} siteId - tenant site ID
 * @param {string} domain - full domain (e.g., example.norbotsystems.com)
 * @param {object} [options]
 * @param {string} [options.date] - date string for results directory (YYYY-MM-DD)
 * @param {string} [options.resultsDir] - base results directory
 */
export function writeProxyFragment(siteId, domain, options = {}) {
  const date = options.date || new Date().toISOString().slice(0, 10);
  const resultsDir = options.resultsDir || resolve(import.meta.dirname, '../results');
  const fragmentDir = resolve(resultsDir, date, 'proxy-fragments');
  mkdirSync(fragmentDir, { recursive: true });

  const fragmentPath = resolve(fragmentDir, `${siteId}.json`);
  const tmpPath = `${fragmentPath}.${process.pid}.tmp`;
  const fragment = { domain, siteId };

  writeFileSync(tmpPath, JSON.stringify(fragment, null, 2));
  renameSync(tmpPath, fragmentPath);
  logger.info(`Proxy fragment written: ${fragmentPath}`);
}
