/**
 * Structural QA — wraps existing verify.mjs.
 * Calls verify.mjs as subprocess and parses result.
 */

import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import * as logger from '../lib/logger.mjs';

const VERIFY_SCRIPT = resolve(import.meta.dirname, '../../scripts/onboarding/verify.mjs');

/**
 * Run structural QA checks on a provisioned tenant.
 * @param {string} url - tenant URL (e.g., https://example.norbotsystems.com)
 * @param {string} siteId - tenant site ID
 * @returns {{ pass: boolean, exitCode: number, output: string }}
 */
export function runStructuralQA(url, siteId) {
  logger.info(`Structural QA: ${url} (site-id: ${siteId})`);

  try {
    const stdout = execFileSync('node', [
      VERIFY_SCRIPT,
      '--url', url,
      '--site-id', siteId,
    ], {
      cwd: resolve(import.meta.dirname, '../../'),
      env: process.env,
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    logger.info('Structural QA: PASS');
    return { pass: true, exitCode: 0, output: stdout };
  } catch (e) {
    const output = e.stdout || e.message || '';
    const exitCode = e.status || 1;

    // Parse pass/fail from output
    const passed = output.includes('STATUS: PASS');
    logger.info(`Structural QA: ${passed ? 'PASS' : 'FAIL'} (exit code ${exitCode})`);

    return { pass: passed, exitCode, output };
  }
}
