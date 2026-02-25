/**
 * Claude Vision-based logo identification.
 * Takes a screenshot of the header region, asks Claude to identify the logo.
 * Used as Level 4 fallback when DOM and branding methods fail.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import * as logger from '../lib/logger.mjs';

/**
 * Find the claude binary.
 */
function findClaude() {
  const candidates = [
    process.env.HOME + '/.local/bin/claude',
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
  ];
  for (const p of candidates) {
    try {
      execFileSync(p, ['--version'], { stdio: 'pipe' });
      return p;
    } catch { /* not found */ }
  }
  return 'claude';
}

const CLAUDE_BIN = findClaude();

/**
 * Use Claude Vision to identify logo in a screenshot.
 * @param {string} screenshotPath - path to PNG screenshot of header region
 * @returns {Promise<{ found: boolean, description?: string, location?: string, bounding_box?: object, confidence: number }>}
 */
export async function identifyLogo(screenshotPath) {
  logger.info(`Logo vision: analysing ${screenshotPath}`);

  const schemaContent = readFileSync(
    resolve(import.meta.dirname, '../schemas/logo-vision.json'),
    'utf-8'
  );

  const prompt = `Look at this screenshot of a website header region. Identify the company logo.

If you find a logo, describe it and estimate its bounding box (x, y, width, height in pixels from the top-left corner of the image).

If there is no visible logo, set found=false.`;

  try {
    const args = [
      '-p', prompt,
      '--output-format', 'json',
      '--max-turns', '3',
      '--model', 'sonnet',
      '--json-schema', schemaContent,
      screenshotPath,
    ];

    const env = { ...process.env };
    delete env.CLAUDECODE;

    const stdout = execFileSync(CLAUDE_BIN, args, {
      env,
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const envelope = JSON.parse(stdout);
    const result = envelope.structured_output || envelope.result;

    if (typeof result === 'string') {
      return JSON.parse(result);
    }
    return result;
  } catch (e) {
    logger.warn(`Logo vision failed: ${e.message}`);
    return { found: false, confidence: 0 };
  }
}
