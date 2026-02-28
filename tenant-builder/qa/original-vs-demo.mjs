#!/usr/bin/env node
/**
 * Original-vs-Demo Comparison — compare scraped.json data against the live rendered site.
 * Verifies that the demo faithfully represents the original contractor's content.
 *
 * Usage:
 *   node qa/original-vs-demo.mjs --url https://example.norbotsystems.com --scraped-data ./results/scraped.json
 *   node qa/original-vs-demo.mjs --url https://example.norbotsystems.com --scraped-data ./scraped.json --output ./results/
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import * as logger from '../lib/logger.mjs';
import { hexToOklch, deltaE_oklch, parseOklch, levenshtein } from '../lib/colour-utils.mjs';

// ──────────────────────────────────────────────────────────
// Comparison 1: Business name
// ──────────────────────────────────────────────────────────

async function compareBusinessName(page, scrapedName) {
  if (!scrapedName) return { field: 'business_name', match: true, skipped: true };

  const liveName = await page.evaluate(() => {
    // Try header first, then title, then logo alt
    const headerText = document.querySelector('header')?.textContent?.trim() || '';
    const logoAlt = document.querySelector('header img, nav img')?.getAttribute('alt') || '';
    const title = document.title || '';
    return { headerText, logoAlt, title };
  });

  // Fuzzy match: Levenshtein <= 3 or substring match
  const normalise = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const scraped = normalise(scrapedName);

  const candidates = [
    liveName.headerText,
    liveName.logoAlt,
    liveName.title,
  ];

  let bestMatch = false;
  let bestCandidate = '';
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const norm = normalise(candidate);
    if (!norm) continue;

    // Substring match
    if (norm.includes(scraped) || scraped.includes(norm)) {
      bestMatch = true;
      bestCandidate = candidate;
      bestDistance = 0;
      break;
    }

    // Levenshtein distance (compare shortest segments)
    const scrapedWords = scraped.split(/\s+/);
    const candidateWords = norm.split(/\s+/);

    // Try matching the core business name (first few words)
    const scrapedCore = scrapedWords.slice(0, 3).join(' ');
    const candidateCore = candidateWords.slice(0, 3).join(' ');
    const dist = levenshtein(scrapedCore, candidateCore);

    if (dist < bestDistance) {
      bestDistance = dist;
      bestCandidate = candidate;
      if (dist <= 3) bestMatch = true;
    }
  }

  return {
    field: 'business_name',
    match: bestMatch,
    expected: scrapedName,
    actual: bestCandidate,
    levenshtein_distance: bestDistance,
    score: bestMatch ? 100 : Math.max(0, 100 - bestDistance * 15),
  };
}

// ──────────────────────────────────────────────────────────
// Comparison 2: Phone number
// ──────────────────────────────────────────────────────────

async function comparePhone(page, scrapedPhone) {
  if (!scrapedPhone) return { field: 'phone', match: true, skipped: true };

  const livePhone = await page.evaluate(() => {
    const footer = document.querySelector('footer');
    if (!footer) return '';
    const telLink = footer.querySelector('a[href^="tel:"]');
    if (telLink) return telLink.textContent?.trim() || '';
    // Fallback: regex in footer text
    const match = (footer.textContent || '').match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    return match ? match[0] : '';
  });

  // Normalise to digits only
  const normDigits = s => (s || '').replace(/\D/g, '');
  const scrapedDigits = normDigits(scrapedPhone);
  const liveDigits = normDigits(livePhone);

  // Last 10 digits (strip country code)
  const scraped10 = scrapedDigits.slice(-10);
  const live10 = liveDigits.slice(-10);

  return {
    field: 'phone',
    match: scraped10 === live10 && scraped10.length === 10,
    expected: scrapedPhone,
    actual: livePhone,
    score: scraped10 === live10 ? 100 : 0,
  };
}

// ──────────────────────────────────────────────────────────
// Comparison 3: Email
// ──────────────────────────────────────────────────────────

async function compareEmail(page, scrapedEmail) {
  if (!scrapedEmail) return { field: 'email', match: true, skipped: true };

  const liveEmail = await page.evaluate(() => {
    const footer = document.querySelector('footer');
    if (!footer) return '';
    const mailtoLink = footer.querySelector('a[href^="mailto:"]');
    if (mailtoLink) return mailtoLink.getAttribute('href')?.replace('mailto:', '') || '';
    // Fallback: regex in footer text
    const match = (footer.textContent || '').match(/[\w.-]+@[\w.-]+\.\w+/);
    return match ? match[0] : '';
  });

  return {
    field: 'email',
    match: scrapedEmail.toLowerCase() === liveEmail.toLowerCase(),
    expected: scrapedEmail,
    actual: liveEmail,
    score: scrapedEmail.toLowerCase() === liveEmail.toLowerCase() ? 100 : 0,
  };
}

// ──────────────────────────────────────────────────────────
// Comparison 4: Service count
// ──────────────────────────────────────────────────────────

async function compareServiceCount(browser, baseUrl, scrapedServices) {
  if (!scrapedServices || !Array.isArray(scrapedServices)) {
    return { field: 'service_count', match: true, skipped: true };
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    const response = await page.goto(`${baseUrl}/services`, { waitUntil: 'networkidle', timeout: 30000 });
    if (!response || response.status() >= 400) {
      return { field: 'service_count', match: true, skipped: true, reason: 'services page not found' };
    }

    const liveCount = await page.evaluate(() => {
      // Count service cards/items — look for common patterns
      const cards = document.querySelectorAll(
        '[class*="service"] > div, [class*="card"], section article, .grid > div'
      );
      // Filter to only visible cards with substantial content
      let count = 0;
      cards.forEach(card => {
        if (card.offsetParent === null) return;
        const text = card.textContent?.trim() || '';
        if (text.length > 20) count++;
      });
      return count;
    });

    const scrapedCount = scrapedServices.length;
    const delta = Math.abs(scrapedCount - liveCount);

    return {
      field: 'service_count',
      match: delta <= 1,
      expected: scrapedCount,
      actual: liveCount,
      delta,
      score: delta === 0 ? 100 : delta === 1 ? 80 : Math.max(0, 100 - delta * 20),
    };
  } finally {
    await page.close();
  }
}

// ──────────────────────────────────────────────────────────
// Comparison 5: Testimonials
// ──────────────────────────────────────────────────────────

async function compareTestimonials(page, scrapedTestimonials) {
  if (!scrapedTestimonials || !Array.isArray(scrapedTestimonials) || scrapedTestimonials.length < 2) {
    return { field: 'testimonials', match: true, skipped: true };
  }

  const bodyText = (await page.textContent('body') || '').toLowerCase();

  // Search for scraped author names in the live page
  let foundCount = 0;
  const authors = [];
  for (const t of scrapedTestimonials) {
    const author = (t.author || t.name || '').trim();
    if (!author || author.length < 3) continue;
    authors.push(author);
    if (bodyText.includes(author.toLowerCase())) {
      foundCount++;
    }
  }

  const validAuthors = authors.length;
  const match = foundCount >= 1;

  return {
    field: 'testimonials',
    match,
    expected_authors: validAuthors,
    found_authors: foundCount,
    authors_searched: authors,
    score: validAuthors === 0 ? 100 : Math.round((foundCount / validAuthors) * 100),
  };
}

// ──────────────────────────────────────────────────────────
// Comparison 6: Primary colour
// ──────────────────────────────────────────────────────────

async function comparePrimaryColour(page, scrapedColour) {
  if (!scrapedColour) return { field: 'primary_colour', match: true, skipped: true };

  const primaryVar = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
  );

  // Parse expected (hex) and actual (OKLCH or hex)
  const expectedOklch = hexToOklch(scrapedColour);
  const actualOklch = parseOklch(primaryVar);

  if (expectedOklch && actualOklch) {
    const dE = deltaE_oklch(actualOklch, expectedOklch);
    return {
      field: 'primary_colour',
      match: dE < 5.0,
      expected: scrapedColour,
      actual: primaryVar,
      deltaE: parseFloat(dE.toFixed(2)),
      score: dE < 2 ? 100 : dE < 5 ? 80 : dE < 10 ? 50 : 0,
    };
  }

  // Can't compare — don't fail
  return {
    field: 'primary_colour',
    match: primaryVar.length > 0,
    expected: scrapedColour,
    actual: primaryVar,
    warning: 'Could not parse colours for Delta-E comparison',
    score: primaryVar.length > 0 ? 70 : 0,
  };
}

// ──────────────────────────────────────────────────────────
// Comparison 7: Logo presence
// ──────────────────────────────────────────────────────────

async function compareLogoPresence(page, baseUrl) {
  const logoData = await page.evaluate(() => {
    const logo = document.querySelector('header img, nav img, [class*="logo"] img');
    if (!logo) return null;
    const src = logo.getAttribute('src') || '';
    const naturalWidth = logo.naturalWidth;
    const naturalHeight = logo.naturalHeight;
    return { src, naturalWidth, naturalHeight, loaded: naturalWidth > 0 };
  });

  if (!logoData) {
    // Check for text-only logo (SVG or styled text)
    const hasTextLogo = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return false;
      const svg = header.querySelector('svg');
      if (svg) return true;
      // Check for prominently styled text
      const h1 = header.querySelector('h1, [class*="logo"]');
      return !!h1;
    });

    return {
      field: 'logo_presence',
      match: hasTextLogo,
      type: hasTextLogo ? 'text_or_svg' : 'none',
      score: hasTextLogo ? 80 : 0,
    };
  }

  // Verify logo URL returns 200
  let httpOk = false;
  try {
    const fullUrl = logoData.src.startsWith('http') ? logoData.src : new URL(logoData.src, baseUrl).href;
    const resp = await fetch(fullUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    httpOk = resp.ok;
  } catch { /* fetch failed */ }

  return {
    field: 'logo_presence',
    match: logoData.loaded && httpOk,
    type: 'image',
    src: logoData.src?.slice(0, 120),
    loaded: logoData.loaded,
    http_ok: httpOk,
    dimensions: logoData.loaded ? `${logoData.naturalWidth}x${logoData.naturalHeight}` : null,
    score: logoData.loaded && httpOk ? 100 : logoData.loaded ? 70 : 0,
  };
}

// ──────────────────────────────────────────────────────────
// Main exported function
// ──────────────────────────────────────────────────────────

/**
 * Compare scraped data against live rendered site.
 * @param {string} url — base URL of the deployed tenant site
 * @param {object} scrapedData — parsed scraped.json
 * @param {{ outputPath?: string }} options
 * @returns {Promise<{ passed: boolean, matchScore: number, comparisons: object[], summary: object }>}
 */
export async function runOriginalVsDemo(url, scrapedData, options = {}) {
  const { outputPath } = options;
  const baseUrl = url.replace(/\/$/, '');

  logger.info(`Original-vs-demo comparison: ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  const comparisons = [];

  try {
    // Homepage for most comparisons
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // 1. Business name
    logger.info('  [1/7] Business name...');
    const name = await compareBusinessName(
      page,
      scrapedData.business_name || scrapedData.businessName
    );
    comparisons.push(name);

    // 2. Phone
    logger.info('  [2/7] Phone number...');
    const phone = await comparePhone(page, scrapedData.phone);
    comparisons.push(phone);

    // 3. Email
    logger.info('  [3/7] Email...');
    const email = await compareEmail(page, scrapedData.email);
    comparisons.push(email);

    // 4. Service count (navigates to /services)
    logger.info('  [4/7] Service count...');
    const services = await compareServiceCount(
      browser, baseUrl,
      scrapedData.services
    );
    comparisons.push(services);

    // 5. Testimonials
    logger.info('  [5/7] Testimonials...');
    const testimonials = await compareTestimonials(
      page,
      scrapedData.testimonials
    );
    comparisons.push(testimonials);

    // 6. Primary colour
    logger.info('  [6/7] Primary colour...');
    const colour = await comparePrimaryColour(
      page,
      scrapedData.primary_color_hex || scrapedData.primaryColorHex || scrapedData.primaryColor
    );
    comparisons.push(colour);

    // 7. Logo presence
    logger.info('  [7/7] Logo presence...');
    const logo = await compareLogoPresence(page, baseUrl);
    comparisons.push(logo);

    await page.close();
  } finally {
    await browser.close();
  }

  // Calculate overall match score
  const scored = comparisons.filter(c => !c.skipped);
  const totalScore = scored.reduce((sum, c) => sum + (c.score || 0), 0);
  const matchScore = scored.length > 0 ? Math.round(totalScore / scored.length) : 100;

  const passed = matchScore >= 70;
  const summary = {
    url: baseUrl,
    match_score: matchScore,
    fields_compared: scored.length,
    fields_matched: scored.filter(c => c.match).length,
    fields_skipped: comparisons.filter(c => c.skipped).length,
    passed,
  };

  // Log summary
  for (const c of comparisons) {
    if (c.skipped) {
      logger.debug(`  SKIP ${c.field} (no data)`);
      continue;
    }
    const icon = c.match ? 'PASS' : 'FAIL';
    logger.info(`  ${icon} ${c.field}: score=${c.score}%`);
  }
  logger.info(`  Overall match: ${matchScore}%`);

  // Write results
  if (outputPath) {
    mkdirSync(outputPath, { recursive: true });
    const resultFile = resolve(outputPath, 'original-vs-demo.json');
    writeFileSync(resultFile, JSON.stringify({ passed, matchScore, comparisons, summary }, null, 2));
    logger.info(`Results written: ${resultFile}`);
  }

  return { passed, matchScore, comparisons, summary };
}

// ──────────────────────────────────────────────────────────
// CLI entry point
// ──────────────────────────────────────────────────────────

const isDirectRun = process.argv[1] &&
  (resolve(process.argv[1]) === resolve(import.meta.dirname, 'original-vs-demo.mjs') ||
   import.meta.url === `file://${resolve(process.argv[1])}`);

if (isDirectRun) {
  const { values: args } = parseArgs({
    options: {
      url: { type: 'string' },
      'scraped-data': { type: 'string' },
      output: { type: 'string' },
      help: { type: 'boolean' },
    },
  });

  if (args.help) {
    console.log(`Original-vs-Demo Comparison — scraped.json vs live rendered site

Usage:
  node qa/original-vs-demo.mjs --url https://example.norbotsystems.com --scraped-data ./results/scraped.json

Comparisons:
  1. Business name   — Header/logo text vs scraped name (fuzzy match, Levenshtein <= 3)
  2. Phone number    — Footer phone vs scraped phone (normalised digits)
  3. Email           — Footer mailto vs scraped email (exact)
  4. Service count   — /services page card count vs scraped services length (delta <= 1)
  5. Testimonials    — Scraped author names found in page text (at least 1 of 2+)
  6. Primary colour  — CSS --primary vs scraped hex colour (Delta-E < 5.0)
  7. Logo presence   — Header <img> loads with HTTP 200`);
    process.exit(0);
  }

  if (!args.url || !args['scraped-data']) {
    logger.error('Required: --url and --scraped-data');
    console.log('Run with --help for usage');
    process.exit(1);
  }

  if (!existsSync(args['scraped-data'])) {
    logger.error(`Scraped data file not found: ${args['scraped-data']}`);
    process.exit(1);
  }

  const scrapedData = JSON.parse(readFileSync(args['scraped-data'], 'utf-8'));
  const siteId = scrapedData.site_id || scrapedData.slug || 'unknown';
  const today = new Date().toISOString().slice(0, 10);
  const outputPath = args.output || resolve(import.meta.dirname, `../results/${today}/${siteId}`);

  logger.progress({
    stage: 'original-vs-demo',
    site_id: siteId,
    status: 'start',
    detail: args.url,
  });

  try {
    const result = await runOriginalVsDemo(args.url, scrapedData, { outputPath });

    logger.progress({
      stage: 'original-vs-demo',
      site_id: siteId,
      status: result.passed ? 'complete' : 'error',
      detail: `match=${result.matchScore}%, fields=${result.summary.fields_matched}/${result.summary.fields_compared}`,
    });

    logger.summary({
      total: result.summary.fields_compared,
      succeeded: result.summary.fields_matched,
      failed: result.summary.fields_compared - result.summary.fields_matched,
      skipped: result.summary.fields_skipped,
    });

    console.log(JSON.stringify(result));
    process.exit(result.passed ? 0 : 1);
  } catch (e) {
    logger.error(`Original-vs-demo comparison failed: ${e.message}`);
    process.exit(1);
  }
}
