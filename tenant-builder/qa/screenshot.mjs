#!/usr/bin/env node
/**
 * Take desktop + mobile screenshots of a provisioned tenant site.
 * Uploads to Supabase Storage for QA panel display.
 *
 * Usage:
 *   node qa/screenshot.mjs --url https://example.norbotsystems.com --site-id example
 *   node qa/screenshot.mjs --url https://example.norbotsystems.com --site-id example --output ./screenshots/
 */

import { parseArgs } from 'node:util';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { loadEnv } from '../lib/env-loader.mjs';
import { uploadToStorage } from '../lib/supabase-client.mjs';
import * as logger from '../lib/logger.mjs';

loadEnv();

const { values: args } = parseArgs({
  options: {
    url: { type: 'string' },
    'site-id': { type: 'string' },
    output: { type: 'string' },
    'skip-upload': { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help || !args.url || !args['site-id']) {
  console.log(`Usage:
  node qa/screenshot.mjs --url https://example.norbotsystems.com --site-id example
  node qa/screenshot.mjs --url https://example.norbotsystems.com --site-id example --output ./screenshots/`);
  process.exit(args.help ? 0 : 1);
}

const siteUrl = args.url;
const siteId = args['site-id'];
const today = new Date().toISOString().slice(0, 10);
const outputDir = args.output || resolve(import.meta.dirname, `../results/${today}/${siteId}/screenshots`);
mkdirSync(outputDir, { recursive: true });

const desktopPath = resolve(outputDir, 'desktop.png');
const mobilePath = resolve(outputDir, 'mobile.png');

logger.info(`Screenshotting: ${siteUrl}`);

const browser = await chromium.launch({ headless: true });

try {
  // Desktop screenshot (1440x900)
  const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktopPage.goto(siteUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await desktopPage.screenshot({ path: desktopPath, fullPage: false });
  logger.info(`Desktop screenshot: ${desktopPath}`);
  await desktopPage.close();

  // Mobile screenshot (390x844)
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobilePage.goto(siteUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.screenshot({ path: mobilePath, fullPage: false });
  logger.info(`Mobile screenshot: ${mobilePath}`);
  await mobilePage.close();
} finally {
  await browser.close();
}

// Upload to Supabase Storage
const screenshots = { desktop: desktopPath, mobile: mobilePath };

if (!args['skip-upload']) {
  try {
    const desktopBuffer = readFileSync(desktopPath);
    const mobileBuffer = readFileSync(mobilePath);

    const desktopUrl = await uploadToStorage(
      'tenant-assets', `${siteId}/qa/desktop.png`, desktopBuffer, 'image/png'
    );
    const mobileUrl = await uploadToStorage(
      'tenant-assets', `${siteId}/qa/mobile.png`, mobileBuffer, 'image/png'
    );

    screenshots.desktop = desktopUrl;
    screenshots.mobile = mobileUrl;
    logger.info(`Screenshots uploaded to Supabase Storage`);
  } catch (e) {
    logger.warn(`Screenshot upload failed: ${e.message} — using local paths`);
  }
}

// Output JSON result for downstream
const result = JSON.stringify(screenshots);
console.log(result);
