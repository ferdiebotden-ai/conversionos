#!/usr/bin/env node
/**
 * Enhanced scraping pipeline — orchestrates 3 phases:
 * 1. Firecrawl Branding v2 → structured colours, fonts, logos, personality
 * 2. Existing scrape.mjs (7-stage extraction) → full content
 * 3. Logo extraction (4-level fallback) → reliable logo URL
 *
 * Merge strategy:
 * - Branding v2 colours override hex-counted colours from scrape.mjs
 * - Logo extraction result overrides scraped logo_url
 * - Output: merged JSON in results/{date}/{site-id}/scraped.json
 *
 * Usage:
 *   node scrape/scrape-enhanced.mjs --url https://example.com --site-id example --output ./results/2026-02-25/example/
 */

import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv, requireEnv } from '../lib/env-loader.mjs';
import * as logger from '../lib/logger.mjs';
import { extractBranding } from './branding-v2.mjs';
import { extractLogo } from './logo-extract.mjs';
import { hexToOklch } from '../../scripts/onboarding/convert-color.mjs';
import { createClient } from '@libsql/client';

loadEnv();
requireEnv(['FIRECRAWL_API_KEY']);

const { values: args } = parseArgs({
  options: {
    url: { type: 'string' },
    'site-id': { type: 'string' },
    output: { type: 'string' },
    'skip-branding': { type: 'boolean', default: false },
    'skip-logo': { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help || !args.url || !args['site-id']) {
  console.log(`Usage:
  node scrape/scrape-enhanced.mjs --url https://example.com --site-id example --output ./results/2026-02-25/example/`);
  process.exit(args.help ? 0 : 1);
}

const url = args.url;
const siteId = args['site-id'];
const today = new Date().toISOString().slice(0, 10);
const outputDir = args.output || resolve(import.meta.dirname, `../results/${today}/${siteId}`);

mkdirSync(outputDir, { recursive: true });

const scrapeOutputPath = resolve(outputDir, 'scraped-raw.json');
const mergedOutputPath = resolve(outputDir, 'scraped.json');
const brandingOutputPath = resolve(outputDir, 'branding-v2.json');

logger.progress({ stage: 'scrape', site_id: siteId, status: 'start', detail: url });

// ──────────────────────────────────────────────────────────
// Phase 1: Branding v2
// ──────────────────────────────────────────────────────────

let branding = { logos: [], colors: [], fonts: [] };

if (!args['skip-branding']) {
  logger.info('Phase 1: Firecrawl Branding v2 extraction');
  try {
    branding = await extractBranding(url);
    writeFileSync(brandingOutputPath, JSON.stringify(branding, null, 2));
    logger.info(`Branding v2 saved to ${brandingOutputPath}`);
  } catch (e) {
    logger.warn(`Branding v2 failed: ${e.message} — continuing with scrape.mjs`);
  }
} else {
  logger.info('Phase 1: Skipping branding v2 (--skip-branding)');
}

// ──────────────────────────────────────────────────────────
// Phase 2: Existing scrape.mjs (7-stage pipeline)
// ──────────────────────────────────────────────────────────

logger.info('Phase 2: Running existing scrape.mjs pipeline');
const scrapeScript = resolve(import.meta.dirname, '../../scripts/onboarding/scrape.mjs');

try {
  execFileSync('node', [scrapeScript, '--url', url, '--output', scrapeOutputPath], {
    cwd: resolve(import.meta.dirname, '../../'),
    env: process.env,
    timeout: 300000, // 5 minutes — scrape.mjs does multiple pages
    maxBuffer: 50 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  logger.info(`scrape.mjs output saved to ${scrapeOutputPath}`);
} catch (e) {
  // scrape.mjs writes to stdout/stderr but still produces output file
  if (existsSync(scrapeOutputPath)) {
    logger.warn(`scrape.mjs exited with error but produced output: ${e.message?.slice(0, 100)}`);
  } else {
    logger.error(`scrape.mjs failed completely: ${e.message?.slice(0, 200)}`);
    logger.progress({ stage: 'scrape', site_id: siteId, status: 'error', detail: 'scrape.mjs failed' });
    process.exit(1);
  }
}

// Load the raw scraped data
const scraped = JSON.parse(readFileSync(scrapeOutputPath, 'utf-8'));

// ──────────────────────────────────────────────────────────
// Phase 3: Logo extraction
// ──────────────────────────────────────────────────────────

let logoResult = null;

if (!args['skip-logo']) {
  logger.info('Phase 3: Multi-level logo extraction');
  try {
    logoResult = await extractLogo(url, branding, { outputDir });
    logger.info(`Logo extraction: level=${logoResult.level}, method=${logoResult.method}, confidence=${logoResult.confidence}`);
  } catch (e) {
    logger.warn(`Logo extraction failed: ${e.message}`);
  }
} else {
  logger.info('Phase 3: Skipping logo extraction (--skip-logo)');
}

// ──────────────────────────────────────────────────────────
// Merge: branding v2 overrides + logo override
// ──────────────────────────────────────────────────────────

logger.info('Merging results');
const merged = { ...scraped };

// Override primary colour from branding v2
if (branding.colors?.length > 0) {
  const primary = branding.colors.find(c => c.role === 'primary');
  if (primary?.hex) {
    logger.info(`Overriding primary_color_hex: ${scraped.primary_color_hex || 'none'} -> ${primary.hex}`);
    merged.primary_color_hex = primary.hex;
    // Recompute OKLCH when primary colour is overridden
    if (!merged._meta) merged._meta = {};
    merged._meta.primary_oklch = hexToOklch(primary.hex);
    logger.info(`Recomputed OKLCH: ${merged._meta.primary_oklch}`);
  }
}

// Override logo URL from logo extraction
if (logoResult?.url && logoResult.confidence >= 0.6) {
  logger.info(`Overriding logo_url: ${scraped.logo_url || 'none'} -> ${logoResult.url}`);
  merged.logo_url = logoResult.url;
}

// Add branding metadata
merged._branding = {
  colors: branding.colors || [],
  fonts: branding.fonts || [],
  personality: branding.personality || {},
  logo_extraction: logoResult ? {
    level: logoResult.level,
    method: logoResult.method,
    confidence: logoResult.confidence,
  } : null,
};

// Add trust metrics from pipeline target data (Turso DB)
try {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (tursoUrl && tursoToken) {
    const turso = createClient({ url: tursoUrl, authToken: tursoToken });
    // Look up target by URL match
    const urlBase = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const { rows } = await turso.execute({
      sql: `SELECT google_rating, google_review_count, years_in_business FROM targets WHERE website LIKE ? LIMIT 1`,
      args: [`%${urlBase}%`],
    });
    if (rows.length > 0) {
      const row = rows[0];
      const trustMetrics = {};
      if (row.google_rating) trustMetrics.google_rating = String(row.google_rating);
      if (row.google_review_count) trustMetrics.projects_completed = `${row.google_review_count}+ Reviews`;
      const yib = row.years_in_business || (merged.founded_year ? new Date().getFullYear() - Number(merged.founded_year) : null);
      if (yib && yib > 0) trustMetrics.years_in_business = String(yib);
      trustMetrics.licensed_insured = true; // Safe assumption for licensed contractors
      merged._trust_metrics = trustMetrics;
      logger.info(`Trust metrics: ${JSON.stringify(trustMetrics)}`);
    } else {
      logger.info('No Turso target found for trust metrics — skipping');
    }
  } else {
    logger.info('Turso credentials not available — skipping trust metrics');
  }
} catch (e) {
  logger.warn(`Trust metrics extraction failed: ${e.message}`);
}

// Write merged output
writeFileSync(mergedOutputPath, JSON.stringify(merged, null, 2));
logger.info(`Merged output saved to ${mergedOutputPath}`);

logger.progress({ stage: 'scrape', site_id: siteId, status: 'complete', detail: `output: ${mergedOutputPath}` });

// Output the path for downstream scripts
console.log(mergedOutputPath);
