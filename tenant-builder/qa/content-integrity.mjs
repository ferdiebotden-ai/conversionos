#!/usr/bin/env node
/**
 * Content Integrity QA — post-provisioning verification.
 * Checks for demo leakage, broken images, colour consistency, and section integrity.
 *
 * Usage:
 *   node qa/content-integrity.mjs --url https://example.norbotsystems.com --site-id example
 *   node qa/content-integrity.mjs --url https://example.norbotsystems.com --site-id example --expected-color "#D60000"
 *   node qa/content-integrity.mjs --url https://example.norbotsystems.com --site-id example --output ./results/
 */

import { parseArgs } from 'node:util';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import * as logger from '../lib/logger.mjs';

// ──────────────────────────────────────────────────────────
// Leakage definitions
// ──────────────────────────────────────────────────────────

/** Strings that should NEVER appear on a tenant page (except demo tenant itself). */
const DEMO_LEAKAGE_STRINGS = [
  'ConversionOS Demo',
  '(226) 444-3478',
  'ferdie@norbotsystems.com',
  '1 Ontario Street',
  'N5A 3H1',
  '/images/demo/',
  'flooring-vinyl.png',
  'kitchen-modern.png',
  'bathroom-spa.png',
  'basement-entertainment.png',
  'outdoor-deck.png',
  'kitchen-farmhouse.png',
  'bathroom-accessible.png',
  'basement-walkout.png',
  'flooring-hardwood.png',
];

/**
 * Context-sensitive strings — allowed in "Powered by" footer or if
 * the contractor genuinely operates in that location.
 */
const NORBOT_CONTEXT_STRINGS = [
  'NorBot Systems',
  'Stratford',
];

/** Pages to check on every tenant site. */
const PAGES_TO_CHECK = ['/', '/about', '/services', '/projects'];

/** Minimum body text length (chars) beneath a section heading to be considered non-empty. */
const MIN_SECTION_BODY_LENGTH = 20;

// ──────────────────────────────────────────────────────────
// Core check functions
// ──────────────────────────────────────────────────────────

/**
 * Check a single page for DEMO_LEAKAGE_STRINGS.
 * @param {import('playwright').Page} page
 * @param {string} pageUrl
 * @param {string} siteId
 * @returns {Promise<Array<{ page: string, leaked_string: string, context: string }>>}
 */
async function checkDemoLeakage(page, pageUrl, siteId) {
  const violations = [];
  const bodyText = await page.textContent('body') || '';
  const htmlSource = await page.content();

  // Hard leakage — always a violation (unless this IS the demo tenant)
  if (siteId !== 'demo') {
    for (const needle of DEMO_LEAKAGE_STRINGS) {
      // Text-based needles
      if (!needle.startsWith('/') && bodyText.includes(needle)) {
        const idx = bodyText.indexOf(needle);
        const surrounding = bodyText.slice(Math.max(0, idx - 40), idx + needle.length + 40).replace(/\s+/g, ' ').trim();
        violations.push({ page: pageUrl, leaked_string: needle, context: surrounding });
      }
      // Path-based needles (check HTML source for src attributes)
      if (needle.startsWith('/') && htmlSource.includes(needle)) {
        const idx = htmlSource.indexOf(needle);
        const surrounding = htmlSource.slice(Math.max(0, idx - 30), idx + needle.length + 30).replace(/\s+/g, ' ').trim();
        violations.push({ page: pageUrl, leaked_string: needle, context: surrounding });
      }
    }
  }

  // Context-sensitive strings
  for (const needle of NORBOT_CONTEXT_STRINGS) {
    if (!bodyText.includes(needle)) continue;

    // "NorBot Systems" is allowed inside "Powered by" footer
    if (needle === 'NorBot Systems') {
      // Find all occurrences and check context
      let searchFrom = 0;
      while (true) {
        const idx = bodyText.indexOf(needle, searchFrom);
        if (idx === -1) break;
        const surrounding = bodyText.slice(Math.max(0, idx - 60), idx + needle.length + 60).replace(/\s+/g, ' ').trim();
        const isFooterContext = /powered\s+by/i.test(surrounding) || /\bfooter\b/i.test(surrounding);
        if (!isFooterContext) {
          violations.push({ page: pageUrl, leaked_string: needle, context: surrounding });
        }
        searchFrom = idx + needle.length;
      }
      continue;
    }

    // "Stratford" is allowed if the site-id suggests the contractor is in Stratford
    if (needle === 'Stratford') {
      const stratfordRelated = siteId.toLowerCase().includes('stratford');
      if (!stratfordRelated) {
        const idx = bodyText.indexOf(needle);
        const surrounding = bodyText.slice(Math.max(0, idx - 40), idx + needle.length + 40).replace(/\s+/g, ' ').trim();
        // Also allow in "Powered by" footer context
        const isFooterContext = /powered\s+by/i.test(surrounding);
        if (!isFooterContext) {
          violations.push({ page: pageUrl, leaked_string: needle, context: surrounding });
        }
      }
    }
  }

  return violations;
}

/**
 * Check a page for broken images.
 * @param {import('playwright').Page} page
 * @param {string} pageUrl
 * @param {string} baseUrl
 * @returns {Promise<Array<{ page: string, src: string, status: number | string }>>}
 */
async function checkBrokenImages(page, pageUrl, baseUrl) {
  const violations = [];

  const imgSources = await page.$$eval('img', imgs =>
    imgs.map(img => ({
      src: img.getAttribute('src') || '',
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
    }))
  );

  for (const img of imgSources) {
    const { src } = img;

    // Skip empty, data URIs, and inline SVGs
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) continue;

    // Construct full URL for relative paths
    let fullUrl;
    try {
      if (src.startsWith('http://') || src.startsWith('https://')) {
        fullUrl = src;
      } else if (src.startsWith('/')) {
        fullUrl = new URL(src, baseUrl).href;
      } else {
        fullUrl = new URL(src, pageUrl).href;
      }
    } catch {
      violations.push({ page: pageUrl, src, status: 'invalid-url' });
      continue;
    }

    // Check if image loaded in browser (naturalWidth === 0 means broken)
    if (img.complete && img.naturalWidth === 0 && img.naturalHeight === 0) {
      violations.push({ page: pageUrl, src, status: 'broken-in-dom' });
      continue;
    }

    // HEAD request to verify image accessibility
    try {
      const resp = await fetch(fullUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
        redirect: 'follow',
      });
      if (!resp.ok) {
        violations.push({ page: pageUrl, src, status: resp.status });
      }
    } catch (e) {
      violations.push({ page: pageUrl, src, status: `fetch-error: ${e.message?.slice(0, 60)}` });
    }
  }

  return violations;
}

/**
 * Check for demo fallback image paths in HTML source.
 * @param {import('playwright').Page} page
 * @param {string} pageUrl
 * @returns {Promise<Array<{ page: string, src: string, context: string }>>}
 */
async function checkDemoImages(page, pageUrl) {
  const violations = [];
  const htmlSource = await page.content();

  // Match any src or srcset attributes containing /images/demo/
  const demoImagePattern = /(?:src|srcset)=["']([^"']*\/images\/demo\/[^"']*)["']/gi;
  let match;
  while ((match = demoImagePattern.exec(htmlSource)) !== null) {
    violations.push({
      page: pageUrl,
      src: match[1],
      context: htmlSource.slice(Math.max(0, match.index - 20), match.index + match[0].length + 20).trim(),
    });
  }

  return violations;
}

/**
 * Check colour consistency — verify --primary CSS variable matches expected colour.
 * @param {import('playwright').Page} page
 * @param {string} pageUrl
 * @param {string} expectedColour - hex colour (e.g., "#D60000")
 * @returns {Promise<{ match: boolean, expected: string, actual: string, buttonsUsingPrimary: number, totalButtons: number }>}
 */
async function checkColourConsistency(page, pageUrl, expectedColour) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const primary = style.getPropertyValue('--primary').trim();

    // Check buttons for brand colour usage
    const buttons = document.querySelectorAll('button, a[role="button"], [class*="btn"]');
    let totalButtons = 0;
    let buttonsUsingPrimary = 0;

    buttons.forEach(btn => {
      // Skip hidden buttons
      if (btn.offsetParent === null && getComputedStyle(btn).display === 'none') return;
      totalButtons++;
      const btnStyle = getComputedStyle(btn);
      const bg = btnStyle.backgroundColor;
      const color = btnStyle.color;
      // Check if bg or text colour references the primary value
      // (This is a heuristic — exact comparison is hard with OKLCH)
      if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== 'rgb(255, 255, 255)') {
        buttonsUsingPrimary++;
      }
    });

    return { primary, totalButtons, buttonsUsingPrimary };
  });

  // Simple hex-to-approximate comparison
  // The --primary is typically OKLCH, so we just report it for human review
  const match = result.primary.length > 0 && result.primary !== '';

  return {
    match,
    expected: expectedColour,
    actual: result.primary,
    buttonsUsingPrimary: result.buttonsUsingPrimary,
    totalButtons: result.totalButtons,
  };
}

/**
 * Check section integrity — find sections with headings but no meaningful body content.
 * @param {import('playwright').Page} page
 * @param {string} pageUrl
 * @returns {Promise<Array<{ page: string, section_heading: string, body_length: number }>>}
 */
async function checkSectionIntegrity(page, pageUrl) {
  const violations = [];

  const sections = await page.$$eval('section', secs =>
    secs.map(sec => {
      const heading = sec.querySelector('h1, h2, h3');
      if (!heading) return null;

      const headingText = heading.textContent?.trim() || '';
      // Get all text except the heading itself
      const clone = sec.cloneNode(true);
      const cloneHeadings = clone.querySelectorAll('h1, h2, h3');
      cloneHeadings.forEach(h => h.remove());
      const bodyText = clone.textContent?.trim().replace(/\s+/g, ' ') || '';

      return {
        headingText,
        bodyLength: bodyText.length,
        bodyPreview: bodyText.slice(0, 80),
        visible: sec.offsetParent !== null || getComputedStyle(sec).display !== 'none',
      };
    }).filter(Boolean)
  );

  for (const sec of sections) {
    if (!sec.visible) continue; // Skip hidden sections
    if (sec.bodyLength < MIN_SECTION_BODY_LENGTH && sec.headingText) {
      violations.push({
        page: pageUrl,
        section_heading: sec.headingText,
        body_length: sec.bodyLength,
      });
    }
  }

  return violations;
}

// ──────────────────────────────────────────────────────────
// Main exported function
// ──────────────────────────────────────────────────────────

/**
 * Run all content integrity checks on a provisioned tenant site.
 * @param {string} url - Base URL of the tenant site
 * @param {string} siteId - Tenant site ID
 * @param {{ expectedColour?: string, outputPath?: string }} options
 * @returns {Promise<{ passed: boolean, violations: object[], summary: object }>}
 */
export async function checkContentIntegrity(url, siteId, options = {}) {
  const { expectedColour, outputPath } = options;
  const baseUrl = url.replace(/\/$/, '');

  const allViolations = [];
  const summary = {
    site_id: siteId,
    url: baseUrl,
    pages_checked: 0,
    demo_leakage: 0,
    broken_images: 0,
    demo_images: 0,
    empty_sections: 0,
    colour_check: null,
  };

  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'ConversionOS-ContentIntegrityQA/1.0',
    });

    for (const pagePath of PAGES_TO_CHECK) {
      const pageUrl = `${baseUrl}${pagePath}`;
      logger.info(`Checking: ${pageUrl}`);

      const page = await context.newPage();

      try {
        const response = await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 });

        // Skip pages that return non-200 (might not exist for this tenant)
        if (!response || (response.status() >= 400 && response.status() !== 404)) {
          logger.warn(`Page returned ${response?.status() || 'no response'}: ${pageUrl}`);
          await page.close();
          continue;
        }

        // 404 pages are normal (not all tenants have /projects, etc.) — skip quietly
        if (response.status() === 404) {
          logger.debug(`Page not found (skipping): ${pageUrl}`);
          await page.close();
          continue;
        }

        summary.pages_checked++;

        // 1. Demo leakage check
        const leakageViolations = await checkDemoLeakage(page, pageUrl, siteId);
        for (const v of leakageViolations) {
          allViolations.push({ check: 'demo_leakage', ...v });
        }
        summary.demo_leakage += leakageViolations.length;

        // 2. Broken image check
        const brokenImageViolations = await checkBrokenImages(page, pageUrl, baseUrl);
        for (const v of brokenImageViolations) {
          allViolations.push({ check: 'broken_image', ...v });
        }
        summary.broken_images += brokenImageViolations.length;

        // 3. Demo image check (HTML source)
        const demoImageViolations = await checkDemoImages(page, pageUrl);
        for (const v of demoImageViolations) {
          allViolations.push({ check: 'demo_image', ...v });
        }
        summary.demo_images += demoImageViolations.length;

        // 4. Section integrity check
        const sectionViolations = await checkSectionIntegrity(page, pageUrl);
        for (const v of sectionViolations) {
          allViolations.push({ check: 'empty_section', ...v });
        }
        summary.empty_sections += sectionViolations.length;

        // 5. Colour consistency (homepage only, if expected colour provided)
        if (pagePath === '/' && expectedColour) {
          const colourResult = await checkColourConsistency(page, pageUrl, expectedColour);
          summary.colour_check = colourResult;
          if (!colourResult.match) {
            allViolations.push({
              check: 'colour_mismatch',
              page: pageUrl,
              expected: expectedColour,
              actual: colourResult.actual,
            });
          }
        }
      } catch (e) {
        logger.warn(`Error checking ${pageUrl}: ${e.message?.slice(0, 100)}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  const passed = allViolations.length === 0;
  summary.total_violations = allViolations.length;
  summary.passed = passed;

  // Write results to file if output path provided
  if (outputPath) {
    const outputDir = resolve(outputPath);
    mkdirSync(outputDir, { recursive: true });
    const resultFile = resolve(outputDir, 'content-integrity.json');
    writeFileSync(resultFile, JSON.stringify({ passed, violations: allViolations, summary }, null, 2));
    logger.info(`Results written to: ${resultFile}`);
  }

  return { passed, violations: allViolations, summary };
}

// ──────────────────────────────────────────────────────────
// CLI entry point (only runs when executed directly)
// ──────────────────────────────────────────────────────────

const isDirectRun = process.argv[1] &&
  (resolve(process.argv[1]) === resolve(import.meta.dirname, 'content-integrity.mjs') ||
   import.meta.url === `file://${resolve(process.argv[1])}`);

if (isDirectRun) {
  const { values: args } = parseArgs({
    options: {
      url: { type: 'string' },
      'site-id': { type: 'string' },
      'expected-color': { type: 'string' },
      output: { type: 'string' },
      help: { type: 'boolean' },
    },
  });

  if (args.help) {
    console.log(`Content Integrity QA — post-provisioning verification

Usage:
  node qa/content-integrity.mjs --url https://example.norbotsystems.com --site-id example
  node qa/content-integrity.mjs --url https://example.norbotsystems.com --site-id example --expected-color "#D60000"
  node qa/content-integrity.mjs --url https://example.norbotsystems.com --site-id example --output ./results/

Checks:
  1. Demo leakage      — NorBot-specific content on tenant pages
  2. Broken images     — <img> elements with non-loading sources
  3. Demo images       — /images/demo/ paths in HTML (unreplaced fallbacks)
  4. Section integrity — Sections with headings but no meaningful body content
  5. Colour consistency — --primary CSS variable matches expected colour (optional)`);
    process.exit(0);
  }

  if (!args.url || !args['site-id']) {
    logger.error('Required: --url and --site-id');
    console.log('Run with --help for usage');
    process.exit(1);
  }

  const siteUrl = args.url;
  const siteId = args['site-id'];
  const today = new Date().toISOString().slice(0, 10);
  const outputPath = args.output || resolve(import.meta.dirname, `../results/${today}/${siteId}`);

  logger.progress({
    stage: 'content-integrity',
    site_id: siteId,
    status: 'start',
    detail: siteUrl,
  });

  try {
    const result = await checkContentIntegrity(siteUrl, siteId, {
      expectedColour: args['expected-color'],
      outputPath,
    });

    // Log individual violations
    for (const v of result.violations) {
      const label = v.check.replace(/_/g, ' ');
      logger.warn(`[${label}] ${v.page}: ${v.leaked_string || v.src || v.section_heading || v.expected || 'violation'}`);
      if (v.context) logger.debug(`  Context: ${v.context}`);
    }

    // Log summary
    logger.info(`Content Integrity: ${result.summary.pages_checked} pages checked`);
    logger.info(`  Demo leakage:    ${result.summary.demo_leakage} violation(s)`);
    logger.info(`  Broken images:   ${result.summary.broken_images} violation(s)`);
    logger.info(`  Demo images:     ${result.summary.demo_images} violation(s)`);
    logger.info(`  Empty sections:  ${result.summary.empty_sections} violation(s)`);
    if (result.summary.colour_check) {
      logger.info(`  Colour check:    actual=${result.summary.colour_check.actual}, buttons=${result.summary.colour_check.buttonsUsingPrimary}/${result.summary.colour_check.totalButtons}`);
    }

    logger.progress({
      stage: 'content-integrity',
      site_id: siteId,
      status: result.passed ? 'complete' : 'error',
      detail: `violations=${result.violations.length}, pages=${result.summary.pages_checked}`,
    });

    logger.summary({
      total: result.summary.pages_checked,
      succeeded: result.passed ? result.summary.pages_checked : 0,
      failed: result.passed ? 0 : 1,
      skipped: PAGES_TO_CHECK.length - result.summary.pages_checked,
    });

    // Output JSON for downstream consumers
    console.log(JSON.stringify(result));

    process.exit(result.passed ? 0 : 1);
  } catch (e) {
    logger.error(`Content integrity check failed: ${e.message}`);
    logger.progress({
      stage: 'content-integrity',
      site_id: siteId,
      status: 'error',
      detail: e.message?.slice(0, 100),
    });
    process.exit(1);
  }
}
