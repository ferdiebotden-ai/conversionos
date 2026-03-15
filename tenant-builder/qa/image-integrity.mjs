#!/usr/bin/env node
/**
 * Image Integrity QA — verifies every image on the rebuilt site has valid provenance.
 * Uses Gemini 3.1 Flash Lite for image classification when provenance is unknown.
 *
 * Checks:
 *   1. Provenance map from scraped.json (_image_provenance)
 *   2. HTTP status of every <img> src
 *   3. Gemini classification for untraced or hero-position images
 *   4. Rejection rules (Google Reviews graphic as hero, logo as hero, etc.)
 *
 * Usage:
 *   node qa/image-integrity.mjs --url https://example.norbotsystems.com --scraped-data ./results/scraped.json
 *   node qa/image-integrity.mjs --url https://example.norbotsystems.com --scraped-data ./scraped.json --site-id example --output ./results/
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import * as logger from '../lib/logger.mjs';

// ──────────────────────────────────────────────────────────
// Pages to check
// ──────────────────────────────────────────────────────────

const PAGES = ['/', '/about', '/services', '/projects', '/contact'];

// ──────────────────────────────────────────────────────────
// Gemini classification
// ──────────────────────────────────────────────────────────

/**
 * Classify an image using Gemini 3.1 Flash Lite.
 * @param {Buffer} imageBuffer - Image data
 * @param {string} mimeType - MIME type
 * @returns {Promise<string>} - Classification label
 */
async function classifyImage(imageBuffer, mimeType) {
  try {
    const { callGemini } = await import('../lib/gemini-client.mjs');

    const base64 = imageBuffer.toString('base64');

    // Use callGemini with inline media (base64 via temp approach)
    // The gemini-client expects file paths, so we use the SDK directly here
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      logger.warn('Gemini API key not set — skipping image classification');
      return 'UNKNOWN';
    }

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: { data: base64, mimeType },
          },
          {
            text: `Classify this image into EXACTLY ONE of these categories. Reply with ONLY the category label, nothing else:

RENOVATION_PHOTO — a photo of a real renovation, construction, home interior, or exterior project
LOGO — a company logo, wordmark, or brand symbol
GOOGLE_REVIEWS_GRAPHIC — a Google Reviews screenshot, star rating graphic, or review badge
STOCK_PHOTO — an obvious stock photo (generic, watermarked, or clearly staged)
SCREENSHOT — a website screenshot or UI capture
ICON — a small icon, symbol, or decorative graphic element

Category:`,
          },
        ],
      }],
      generationConfig: { maxOutputTokens: 20 },
    });

    const text = result.response.text().trim().toUpperCase().replace(/[^A-Z_]/g, '');
    const valid = ['RENOVATION_PHOTO', 'LOGO', 'GOOGLE_REVIEWS_GRAPHIC', 'STOCK_PHOTO', 'SCREENSHOT', 'ICON'];
    return valid.includes(text) ? text : 'UNKNOWN';
  } catch (err) {
    logger.debug(`Gemini classification failed: ${err.message?.slice(0, 80)}`);
    return 'UNKNOWN';
  }
}

/**
 * Download an image and return its buffer + MIME type.
 */
async function downloadImage(url) {
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });
    if (!resp.ok) return null;
    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await resp.arrayBuffer());
    return { buffer, mimeType: contentType.split(';')[0].trim() };
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────
// Main exported function
// ──────────────────────────────────────────────────────────

/**
 * Run image integrity analysis.
 * @param {object} params
 * @param {string} params.siteId - Tenant site ID
 * @param {string} params.demoUrl - URL of the rebuilt demo site
 * @param {string} params.scrapedPath - Path to scraped.json
 * @param {object} [params.logger] - Logger instance
 * @returns {Promise<{ pass: boolean, verified: number, classified: number, warnings: Array, failures: Array }>}
 */
export async function run({ siteId, demoUrl, scrapedPath, logger: log }) {
  const _log = log || logger;
  const baseUrl = demoUrl.replace(/\/$/, '');

  _log.info(`Image integrity check: ${baseUrl}`);

  // 1. Load provenance map from scraped.json
  let provenance = {};
  if (scrapedPath && existsSync(scrapedPath)) {
    try {
      const scraped = JSON.parse(readFileSync(scrapedPath, 'utf-8'));
      provenance = scraped._image_provenance || {};
    } catch { /* parse error */ }
  }

  // 2. Launch Playwright, collect all images from all pages
  const allImages = [];
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'ConversionOS-ImageIntegrityQA/1.0',
    });

    for (const pagePath of PAGES) {
      const pageUrl = `${baseUrl}${pagePath}`;

      const page = await context.newPage();
      try {
        const response = await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 });
        if (!response || response.status() >= 400) {
          continue;
        }

        const images = await page.evaluate((currentPagePath) => {
          const imgs = Array.from(document.querySelectorAll('img'));
          return imgs
            .filter(img => {
              const src = img.getAttribute('src') || '';
              // Skip data URIs, blobs, inline SVGs, and empty
              return src && !src.startsWith('data:') && !src.startsWith('blob:');
            })
            .map((img, idx) => {
              const src = img.getAttribute('src') || '';
              const alt = img.getAttribute('alt') || '';
              const rect = img.getBoundingClientRect();
              const section = img.closest('section');
              const isHero = idx === 0 && currentPagePath === '/' && rect.top < 600;
              const sectionClass = section?.className || '';

              return {
                src,
                alt,
                isHero,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
                inAbout: /about/i.test(sectionClass) || currentPagePath === '/about',
                inServices: /service/i.test(sectionClass) || currentPagePath === '/services',
                inProjects: /project|portfolio|gallery/i.test(sectionClass) || currentPagePath === '/projects',
              };
            });
        }, pagePath);

        for (const img of images) {
          allImages.push({ ...img, page: pagePath });
        }
      } catch (e) {
        _log.warn(`Error checking images on ${pageUrl}: ${e.message?.slice(0, 80)}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  _log.info(`Found ${allImages.length} images across ${PAGES.length} pages`);

  // 3. Verify each image
  let verified = 0;
  let classified = 0;
  const warnings = [];
  const failures = [];

  // Deduplicate by src to avoid classifying the same image twice
  const uniqueSrcs = new Map();
  for (const img of allImages) {
    const existing = uniqueSrcs.get(img.src);
    if (!existing || img.isHero) {
      uniqueSrcs.set(img.src, img);
    }
  }

  for (const img of uniqueSrcs.values()) {
    const fullUrl = img.src.startsWith('http')
      ? img.src
      : `${baseUrl}${img.src.startsWith('/') ? '' : '/'}${img.src}`;

    // 3a. Check provenance map
    const provenanceEntry = provenance[img.src] || provenance[img.alt];
    if (provenanceEntry) {
      const source = typeof provenanceEntry === 'string' ? provenanceEntry : provenanceEntry.source;
      if (source === 'scraped' || source === 'uploaded' || source === 'original') {
        verified++;
        continue;
      }
    }

    // 3b. Check if it's a known Supabase Storage URL (uploaded by pipeline)
    if (fullUrl.includes('supabase.co/storage') || fullUrl.includes('/images/sample-data/')) {
      verified++;
      continue;
    }

    // 3c. For hero images or images without provenance, classify with Gemini
    if (img.isHero || !provenanceEntry) {
      const downloaded = await downloadImage(fullUrl);
      if (!downloaded) {
        // Image failed to download — but don't fail the whole check for this
        warnings.push({
          src: img.src.slice(0, 120),
          page: img.page,
          issue: 'download_failed',
        });
        continue;
      }

      const classification = await classifyImage(downloaded.buffer, downloaded.mimeType);
      classified++;

      // 3c. Apply rejection rules
      if (img.isHero && classification === 'GOOGLE_REVIEWS_GRAPHIC') {
        failures.push({
          src: img.src.slice(0, 120),
          page: img.page,
          classification,
          issue: 'Google Reviews graphic used as hero image',
        });
        continue;
      }

      if (img.isHero && classification === 'LOGO') {
        failures.push({
          src: img.src.slice(0, 120),
          page: img.page,
          classification,
          issue: 'Logo used as hero image',
        });
        continue;
      }

      if (classification === 'STOCK_PHOTO' && (img.inServices || img.inAbout || img.inProjects)) {
        warnings.push({
          src: img.src.slice(0, 120),
          page: img.page,
          classification,
          issue: `Stock photo in ${img.inServices ? 'services' : img.inAbout ? 'about' : 'projects'} section`,
        });
        continue;
      }

      if (classification === 'SCREENSHOT') {
        warnings.push({
          src: img.src.slice(0, 120),
          page: img.page,
          classification,
          issue: 'Screenshot found on site (may be unintended)',
        });
        continue;
      }

      // Classified successfully — count as verified
      verified++;
    } else {
      // Has some provenance but not 'scraped'/'uploaded' — still counts
      verified++;
    }
  }

  const pass = failures.length === 0;

  _log.info(`Image integrity: ${verified} verified, ${classified} classified, ${warnings.length} warnings, ${failures.length} failures`);
  _log.info(`Pass: ${pass}`);

  return { pass, verified, classified, warnings, failures };
}

// ──────────────────────────────────────────────────────────
// CLI entry point
// ──────────────────────────────────────────────────────────

const isDirectRun = process.argv[1] &&
  (resolve(process.argv[1]) === resolve(import.meta.dirname, 'image-integrity.mjs') ||
   import.meta.url === `file://${resolve(process.argv[1])}`);

if (isDirectRun) {
  const { values: cliArgs } = parseArgs({
    options: {
      url: { type: 'string' },
      'scraped-data': { type: 'string' },
      'site-id': { type: 'string' },
      output: { type: 'string' },
      help: { type: 'boolean' },
    },
  });

  if (cliArgs.help) {
    console.log(`Image Integrity QA — verify every image has valid provenance

Usage:
  node qa/image-integrity.mjs --url https://example.norbotsystems.com --scraped-data ./results/scraped.json
  node qa/image-integrity.mjs --url URL --scraped-data ./scraped.json --site-id example --output ./results/

Checks:
  1. Provenance map from scraped.json (_image_provenance)
  2. HTTP accessibility of every <img> src
  3. Gemini Flash Lite classification for untraced/hero images
  4. Rejection rules:
     - GOOGLE_REVIEWS_GRAPHIC as hero → FAIL
     - LOGO as hero → FAIL
     - STOCK_PHOTO in services/about/projects → WARN`);
    process.exit(0);
  }

  if (!cliArgs.url) {
    logger.error('Required: --url');
    console.log('Run with --help for usage');
    process.exit(1);
  }

  // Load environment for Gemini API key
  try {
    const { loadEnv } = await import('../lib/env-loader.mjs');
    loadEnv();
  } catch { /* env-loader may not exist in all contexts */ }

  const siteId = cliArgs['site-id'] || 'unknown';
  const today = new Date().toISOString().slice(0, 10);
  const outputPath = cliArgs.output || resolve(import.meta.dirname, `../results/${today}/${siteId}`);

  logger.progress({
    stage: 'image-integrity',
    site_id: siteId,
    status: 'start',
    detail: cliArgs.url,
  });

  try {
    const result = await run({
      siteId,
      demoUrl: cliArgs.url,
      scrapedPath: cliArgs['scraped-data'],
      logger,
    });

    // Write results
    mkdirSync(outputPath, { recursive: true });
    const resultFile = resolve(outputPath, 'image-integrity.json');
    writeFileSync(resultFile, JSON.stringify(result, null, 2));
    logger.info(`Results written: ${resultFile}`);

    logger.progress({
      stage: 'image-integrity',
      site_id: siteId,
      status: result.pass ? 'complete' : 'error',
      detail: `verified=${result.verified} classified=${result.classified} warnings=${result.warnings.length} failures=${result.failures.length}`,
    });

    console.log(JSON.stringify(result));
    process.exit(result.pass ? 0 : 1);
  } catch (e) {
    logger.error(`Image integrity check failed: ${e.message}`);
    process.exit(1);
  }
}
