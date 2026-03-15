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
import { captureScreenshots } from './screenshot-capture.mjs';
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
    bespoke: { type: 'boolean', default: false },
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
// Phase 2.5: Bespoke — HTML capture via Firecrawl
// ──────────────────────────────────────────────────────────

if (args.bespoke) {
  logger.info('Phase 2.5: Capturing HTML for bespoke rebuild');
  const htmlDir = resolve(outputDir, 'html');
  mkdirSync(htmlDir, { recursive: true });

  // Try Firecrawl first, fall back to Playwright for HTML capture
  let htmlCaptured = 0;
  const fallbackPages = ['/', '/about', '/about-us', '/services', '/contact', '/gallery', '/portfolio', '/testimonials', '/reviews'];

  try {
    const FirecrawlApp = (await import('@mendable/firecrawl-js')).default;
    const firecrawlInstance = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
    // Firecrawl v4 moved scrapeUrl to .v1 — use .v1 if available, fall back to root
    const firecrawl = firecrawlInstance.v1 ?? firecrawlInstance;

    for (const pagePath of fallbackPages) {
      const pageUrl = new URL(pagePath, url).href;
      try {
        const result = await firecrawl.scrapeUrl(pageUrl, { formats: ['html'], timeout: 30000 });
        if (result.success && result.html) {
          const slug = pagePath === '/' ? 'homepage' : pagePath.replace(/^\//, '').replace(/\//g, '-');
          writeFileSync(resolve(htmlDir, `${slug}.html`), result.html);
          logger.info(`HTML captured (Firecrawl): ${slug} (${result.html.length} chars)`);
          htmlCaptured++;
        }
      } catch (e) {
        if (!e.message?.includes('404')) {
          logger.debug(`Firecrawl HTML failed for ${pagePath}: ${e.message?.slice(0, 60)}`);
        }
      }
    }
  } catch (e) {
    logger.warn(`Firecrawl HTML phase failed: ${e.message}`);
  }

  // Playwright fallback: if Firecrawl captured 0 pages, use page.content()
  if (htmlCaptured === 0) {
    logger.info('Phase 2.5b: Playwright HTML fallback (Firecrawl returned no HTML)');
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      for (const pagePath of fallbackPages) {
        const pageUrl = new URL(pagePath, url).href;
        try {
          const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
          const response = await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 20000 });
          if (response && response.status() < 400) {
            const html = await page.content();
            if (html && html.length > 500) {
              const slug = pagePath === '/' ? 'homepage' : pagePath.replace(/^\//, '').replace(/\//g, '-');
              writeFileSync(resolve(htmlDir, `${slug}.html`), html);
              logger.info(`HTML captured (Playwright): ${slug} (${html.length} chars)`);
              htmlCaptured++;
            }
          }
          await page.close();
        } catch { /* page doesn't exist or timed out — skip */ }
      }
      await browser.close();
    } catch (e) {
      logger.warn(`Playwright HTML fallback failed: ${e.message}`);
    }
  }
  logger.info(`HTML capture complete: ${htmlCaptured} page(s)`);
}

// ──────────────────────────────────────────────────────────
// Phase 2.7: Bespoke — CSS token extraction + original screenshots
// ──────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────
// Phase 2.7: Screenshots for ALL builds + CSS tokens for bespoke
// ──────────────────────────────────────────────────────────

// Screenshots are now captured for ALL builds (not just bespoke)
// They are the primary visual data source for the pipeline
logger.info('Phase 2.7: Full-page screenshots of original site');
try {
  await captureScreenshots(url, outputDir, { timeout: 20000, mobile: true });
} catch (e) {
  logger.warn(`Screenshot capture failed: ${e.message} — continuing without`);
}

if (args.bespoke) {
  // CSS tokens (bespoke only — not needed for template builds)
  logger.info('Phase 2.7a: CSS token extraction via Playwright');
  try {
    const { extractCssTokens } = await import('./css-extract.mjs');
    const cssOutputPath = resolve(outputDir, 'css-tokens.json');
    await extractCssTokens(url, { outputFile: cssOutputPath, timeout: 60000 });
  } catch (e) {
    logger.warn(`CSS token extraction failed: ${e.message} — continuing without`);
  }
}

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
// Phase 4: Playwright social link extraction
// ──────────────────────────────────────────────────────────

logger.info('Phase 4: Playwright social link extraction');
try {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const SOCIAL_SELECTORS = {
    social_facebook: 'a[href*="facebook.com"]',
    social_instagram: 'a[href*="instagram.com"]',
    social_twitter: 'a[href*="twitter.com"], a[href*="x.com"]',
    social_linkedin: 'a[href*="linkedin.com"]',
    social_youtube: 'a[href*="youtube.com"]',
    social_tiktok: 'a[href*="tiktok.com"]',
    social_houzz: 'a[href*="houzz.com"], a[href*="houzz.ca"]',
    social_pinterest: 'a[href*="pinterest.com"]',
    social_google: 'a[href*="google.com/maps"], a[href*="g.co"], a[href*="goo.gl"]',
  };

  const extractedSocials = {};
  for (const [key, selector] of Object.entries(SOCIAL_SELECTORS)) {
    const href = await page.$eval(selector, el => el.href).catch(() => null);
    if (href) extractedSocials[key] = href;
  }

  await browser.close();

  if (Object.keys(extractedSocials).length > 0) {
    logger.info(`Playwright social links found: ${Object.keys(extractedSocials).join(', ')}`);
  } else {
    logger.info('No social links found via Playwright');
  }

  // Merge — Playwright fills gaps where Firecrawl missed
  for (const [key, href] of Object.entries(extractedSocials)) {
    if (!scraped[key]) {
      scraped[key] = href;
      logger.info(`Social link filled by Playwright: ${key} = ${href}`);
    }
  }
} catch (e) {
  logger.warn(`Playwright social extraction failed: ${e.message} — continuing without`);
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

// ──────────────────────────────────────────────────────────
// Completeness score — weighted field presence (0-100)
// ──────────────────────────────────────────────────────────

const completenessFields = {
  business_name: { weight: 10, check: () => Boolean(merged.business_name) },
  phone: { weight: 10, check: () => Boolean(merged.phone) },
  email: { weight: 10, check: () => Boolean(merged.email) },
  logo_url: { weight: 10, check: () => Boolean(merged.logo_url) },
  primary_color_hex: { weight: 8, check: () => Boolean(merged.primary_color_hex) },
  testimonials_2plus: { weight: 8, check: () => (merged.testimonials || []).length >= 2 },
  services_2plus: { weight: 8, check: () => (merged.services || []).length >= 2 },
  portfolio_1plus: { weight: 6, check: () => (merged.portfolio || []).length >= 1 },
  about_copy: { weight: 6, check: () => (merged.about_copy || []).length > 0 },
  social_any: { weight: 5, check: () => ['social_facebook', 'social_instagram', 'social_houzz', 'social_google', 'social_twitter', 'social_linkedin', 'social_youtube', 'social_tiktok', 'social_pinterest'].some(k => Boolean(merged[k])) },
  hero_image_url: { weight: 5, check: () => Boolean(merged.hero_image_url) },
  about_image_url: { weight: 4, check: () => Boolean(merged.about_image_url) },
  team_members: { weight: 4, check: () => (merged.team_members || []).length > 0 },
  mission: { weight: 3, check: () => Boolean(merged.mission) },
  business_hours_valid: { weight: 3, check: () => {
    const h = merged.business_hours;
    if (!h || typeof h !== 'string') return false;
    const lower = h.trim().toLowerCase();
    return !['n/a', 'na', 'not available', 'not specified', 'unknown', 'none', '', '-'].includes(lower);
  }},
};

let completenessScore = 0;
const missingFields = [];
for (const [field, { weight, check }] of Object.entries(completenessFields)) {
  if (check()) {
    completenessScore += weight;
  } else {
    missingFields.push(field);
  }
}

merged._completeness = { score: completenessScore, missing: missingFields };
logger.info(`Completeness score: ${completenessScore}/100 — missing: ${missingFields.join(', ') || 'none'}`);
logger.progress({ stage: 'scrape', site_id: siteId, status: 'scored', completeness: completenessScore, missing: missingFields });

// Write merged output
writeFileSync(mergedOutputPath, JSON.stringify(merged, null, 2));
logger.info(`Merged output saved to ${mergedOutputPath}`);

logger.progress({ stage: 'scrape', site_id: siteId, status: 'complete', detail: `output: ${mergedOutputPath}`, completeness: completenessScore });

// Output the path for downstream scripts
console.log(mergedOutputPath);
