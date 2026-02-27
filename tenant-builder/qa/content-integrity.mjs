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
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
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
 * Parse an OKLCH string like "oklch(0.588 0.108 180)" into { L, C, H }.
 * @param {string} oklchStr
 * @returns {{ L: number, C: number, H: number } | null}
 */
function parseOklch(oklchStr) {
  const match = oklchStr.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!match) return null;
  return { L: parseFloat(match[1]), C: parseFloat(match[2]), H: parseFloat(match[3]) };
}

/**
 * Parse a hex colour string into { r, g, b } (0-255).
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number } | null}
 */
function parseHex(hex) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

/**
 * Convert sRGB (0-255) to linear RGB.
 */
function srgbToLinear(c) {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Convert linear RGB to OKLAB { L, a, b }.
 * Uses the standard sRGB -> OKLAB conversion via LMS intermediary.
 */
function rgbToOklab(r, g, b) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2220049174 * lg + 0.6896926208 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

/**
 * Convert hex colour to OKLCH { L, C, H }.
 */
function hexToOklch(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const lab = rgbToOklab(rgb.r, rgb.g, rgb.b);
  const C = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let H = Math.atan2(lab.b, lab.a) * (180 / Math.PI);
  if (H < 0) H += 360;
  return { L: lab.L, C, H };
}

/**
 * Compute Delta-E (OKLCH) between two colours.
 * Uses simple Euclidean distance in OKLCH space with hue wrapping.
 * @returns {number} - distance (< 5 is a close match)
 */
function deltaE_oklch(a, b) {
  const dL = (a.L - b.L) * 100; // Scale L from 0-1 to 0-100 for comparable magnitude
  const dC = (a.C - b.C) * 100;
  let dH = a.H - b.H;
  if (dH > 180) dH -= 360;
  if (dH < -180) dH += 360;
  // Hue contribution weighted by chroma (low chroma = hue doesn't matter)
  const avgC = (a.C + b.C) / 2;
  const hueWeight = avgC * 100 * (dH / 180);
  return Math.sqrt(dL * dL + dC * dC + hueWeight * hueWeight);
}

/**
 * Check colour consistency — verify --primary CSS variable matches expected colour.
 * Uses OKLCH Delta-E comparison with threshold < 5.
 * @param {import('playwright').Page} page
 * @param {string} pageUrl
 * @param {string} expectedColour - hex colour (e.g., "#D60000")
 * @returns {Promise<{ match: boolean, expected: string, actual: string, deltaE: number | null, buttonsUsingPrimary: number, totalButtons: number }>}
 */
async function checkColourConsistency(page, pageUrl, expectedColour) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const primary = style.getPropertyValue('--primary').trim();

    const buttons = document.querySelectorAll('button, a[role="button"], [class*="btn"]');
    let totalButtons = 0;
    let buttonsUsingPrimary = 0;

    buttons.forEach(btn => {
      if (btn.offsetParent === null && getComputedStyle(btn).display === 'none') return;
      totalButtons++;
      const btnStyle = getComputedStyle(btn);
      const bg = btnStyle.backgroundColor;
      if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== 'rgb(255, 255, 255)') {
        buttonsUsingPrimary++;
      }
    });

    return { primary, totalButtons, buttonsUsingPrimary };
  });

  // Compare colours using OKLCH Delta-E
  let match = false;
  let deltaE = null;

  const actualOklch = parseOklch(result.primary);
  const expectedOklch = hexToOklch(expectedColour);

  if (actualOklch && expectedOklch) {
    deltaE = deltaE_oklch(actualOklch, expectedOklch);
    match = deltaE < 5;
  } else if (result.primary.length > 0) {
    // Fallback: just check the variable is set
    match = true;
  }

  return {
    match,
    expected: expectedColour,
    actual: result.primary,
    deltaE,
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
// Phase C: Additional checks
// ──────────────────────────────────────────────────────────

/**
 * Check for AI-fabricated content by reading _provenance from scraped.json.
 * @param {string} scrapedDataPath - Path to scraped.json
 * @returns {Array<{ field: string, source: string }>}
 */
function checkFabrication(scrapedDataPath) {
  const violations = [];
  try {
    const data = JSON.parse(readFileSync(scrapedDataPath, 'utf-8'));
    const provenance = data._provenance || {};
    const HIGH_RISK_FIELDS = ['trust_badges', 'process_steps', 'values', 'testimonials', 'certifications', 'team_members'];
    for (const field of HIGH_RISK_FIELDS) {
      if (provenance[field] === 'ai_generated' || provenance[field] === 'ai_augmented') {
        violations.push({ field, source: provenance[field] });
      }
    }
  } catch { /* scraped.json may not exist for direct URL mode */ }
  return violations;
}

const GENERIC_PHRASES = [
  'lorem ipsum', 'your business', 'your company', 'example company',
  'acme', '[company', '[business', 'placeholder', 'coming soon',
  'tbd', 'insert', 'todo', 'description here',
];

/**
 * Check for placeholder/generic text on a page.
 * @param {import('playwright').Page} page
 * @param {string} pageUrl
 * @returns {Promise<Array<{ page: string, phrase: string, context: string }>>}
 */
async function checkPlaceholderText(page, pageUrl) {
  const violations = [];
  const bodyText = (await page.textContent('body') || '').toLowerCase();
  for (const phrase of GENERIC_PHRASES) {
    if (bodyText.includes(phrase)) {
      const idx = bodyText.indexOf(phrase);
      const context = bodyText.slice(Math.max(0, idx - 30), idx + phrase.length + 30).trim();
      violations.push({ page: pageUrl, phrase, context });
    }
  }
  return violations;
}

/**
 * Check that business name appears on the page (title and body).
 * @param {import('playwright').Page} page
 * @param {string} pageUrl
 * @param {string} businessName
 * @returns {Promise<Array<{ page: string, check: string, title?: string }>>}
 */
async function checkBusinessNamePresence(page, pageUrl, businessName) {
  if (!businessName) return [];
  const violations = [];
  const bodyText = await page.textContent('body') || '';
  const title = await page.title();
  // Check page title contains business name (homepage only)
  if (pageUrl.endsWith('/') && !title.toLowerCase().includes(businessName.toLowerCase())) {
    violations.push({ page: pageUrl, check: 'title_missing', title });
  }
  // Check body contains business name
  if (!bodyText.toLowerCase().includes(businessName.toLowerCase())) {
    violations.push({ page: pageUrl, check: 'body_missing' });
  }
  return violations;
}

/**
 * Check copyright line in footer for formatting issues.
 * @param {import('playwright').Page} page
 * @param {string} pageUrl
 * @returns {Promise<Array<{ page: string, issue: string }>>}
 */
async function checkCopyrightFormat(page, pageUrl) {
  const violations = [];
  const footerText = await page.$eval('footer', el => el?.textContent || '').catch(() => '');
  if (/\.\.\s*All rights reserved/i.test(footerText)) {
    violations.push({ page: pageUrl, issue: 'double_period_in_copyright' });
  }
  return violations;
}

// ──────────────────────────────────────────────────────────
// Auto-fix capability
// ──────────────────────────────────────────────────────────

/**
 * Auto-fix critical content integrity issues in Supabase.
 * @param {string} siteId
 * @param {Array} violations
 * @returns {Promise<Array<{ fix: string, success: boolean }>>}
 */
export async function autoFixViolations(siteId, violations) {
  const { getSupabase } = await import('../lib/supabase-client.mjs');
  const sb = getSupabase();
  const fixes = [];

  // Determine what needs fixing
  const fabricationFields = violations
    .filter(v => v.check === 'fabrication')
    .map(v => v.field);
  const hasPlaceholders = violations.some(v => v.check === 'placeholder_text');
  const hasDemoLeakage = violations.some(v => v.check === 'demo_leakage');

  if (fabricationFields.length === 0 && !hasDemoLeakage && !hasPlaceholders) return fixes;

  // Read current company_profile
  const { data } = await sb
    .from('admin_settings')
    .select('value')
    .eq('site_id', siteId)
    .eq('key', 'company_profile')
    .single();

  if (!data?.value) return fixes;

  const profile = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
  let changed = false;

  // Map field names to their company_profile keys
  const FIELD_TO_KEY = {
    trust_badges: 'trustBadges',
    process_steps: 'processSteps',
    values: 'values',
    trust_metrics: 'trustMetrics',
    services: 'services',
  };

  for (const field of fabricationFields) {
    const profileKey = FIELD_TO_KEY[field];
    if (profileKey && profile[profileKey]) {
      profile[profileKey] = Array.isArray(profile[profileKey]) ? [] : {};
      changed = true;
      fixes.push({ fix: `Cleared fabricated ${field}`, success: true });
      logger.info(`  Auto-fix: cleared fabricated ${field}`);
    }
  }

  // Fix trustMetrics if demo leakage detected
  if (hasDemoLeakage) {
    if (profile.trustMetrics && Object.keys(profile.trustMetrics).length > 0) {
      profile.trustMetrics = {};
      changed = true;
      fixes.push({ fix: 'Cleared trustMetrics (demo leakage)', success: true });
    }
  }

  // Fix placeholder text in text fields
  if (hasPlaceholders) {
    const placeholderRe = new RegExp(GENERIC_PHRASES.join('|'), 'gi');
    const textFields = ['aboutCopy', 'mission'];
    for (const field of textFields) {
      if (typeof profile[field] === 'string' && placeholderRe.test(profile[field])) {
        profile[field] = '';
        changed = true;
        fixes.push({ fix: `Cleared placeholder text in ${field}`, success: true });
        logger.info(`  Auto-fix: cleared placeholder text in ${field}`);
      }
    }
  }

  if (changed) {
    const { error } = await sb
      .from('admin_settings')
      .update({ value: profile })
      .eq('site_id', siteId)
      .eq('key', 'company_profile');

    if (error) {
      fixes.push({ fix: 'DB update failed', success: false });
      logger.error(`  Auto-fix DB update failed: ${error.message}`);
    }
  }

  return fixes;
}

// ──────────────────────────────────────────────────────────
// Main exported function
// ──────────────────────────────────────────────────────────

/**
 * Run all content integrity checks on a provisioned tenant site.
 * @param {string} url - Base URL of the tenant site
 * @param {string} siteId - Tenant site ID
 * @param {{ expectedColour?: string, outputPath?: string, scrapedDataPath?: string, businessName?: string }} options
 * @returns {Promise<{ passed: boolean, violations: object[], summary: object }>}
 */
export async function checkContentIntegrity(url, siteId, options = {}) {
  const { expectedColour, outputPath, scrapedDataPath, businessName } = options;
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
    fabrication: 0,
    placeholder_text: 0,
    business_name: 0,
    copyright_format: 0,
  };

  // Fabrication check (reads scraped.json, not browser)
  if (scrapedDataPath && existsSync(scrapedDataPath)) {
    const fabricationViolations = checkFabrication(scrapedDataPath);
    for (const v of fabricationViolations) {
      allViolations.push({ check: 'fabrication', ...v });
    }
    summary.fabrication = fabricationViolations.length;
  }

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

        // 6. Placeholder text check
        const placeholderViolations = await checkPlaceholderText(page, pageUrl);
        for (const v of placeholderViolations) {
          allViolations.push({ check: 'placeholder_text', ...v });
        }
        summary.placeholder_text += placeholderViolations.length;

        // 7. Business name presence check
        if (businessName) {
          const nameViolations = await checkBusinessNamePresence(page, pageUrl, businessName);
          for (const v of nameViolations) {
            allViolations.push({ check: 'business_name', ...v });
          }
          summary.business_name += nameViolations.length;
        }

        // 8. Copyright format check
        const copyrightViolations = await checkCopyrightFormat(page, pageUrl);
        for (const v of copyrightViolations) {
          allViolations.push({ check: 'copyright_format', ...v });
        }
        summary.copyright_format += copyrightViolations.length;

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
      'scraped-data': { type: 'string' },
      'business-name': { type: 'string' },
      output: { type: 'string' },
      help: { type: 'boolean' },
    },
  });

  if (args.help) {
    console.log(`Content Integrity QA — post-provisioning verification

Usage:
  node qa/content-integrity.mjs --url https://example.norbotsystems.com --site-id example
  node qa/content-integrity.mjs --url https://example.norbotsystems.com --site-id example --expected-color "#D60000"
  node qa/content-integrity.mjs --url https://example.norbotsystems.com --site-id example --scraped-data ./results/scraped.json --business-name "Example Co"
  node qa/content-integrity.mjs --url https://example.norbotsystems.com --site-id example --output ./results/

Checks:
  1. Demo leakage      — NorBot-specific content on tenant pages
  2. Broken images     — <img> elements with non-loading sources
  3. Demo images       — /images/demo/ paths in HTML (unreplaced fallbacks)
  4. Section integrity — Sections with headings but no meaningful body content
  5. Colour consistency — --primary CSS variable matches expected colour (optional)
  6. Fabrication        — AI-generated high-risk fields (from scraped.json provenance)
  7. Placeholder text   — Generic/lorem ipsum text on pages
  8. Business name      — Contractor name present on pages and in title
  9. Copyright format   — Double period or other formatting issues in footer`);
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
      scrapedDataPath: args['scraped-data'],
      businessName: args['business-name'],
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
    logger.info(`  Fabrication:     ${result.summary.fabrication} field(s)`);
    logger.info(`  Placeholder text:${result.summary.placeholder_text} found`);
    logger.info(`  Business name:   ${result.summary.business_name} page(s) missing`);
    logger.info(`  Copyright format:${result.summary.copyright_format} issue(s)`);
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
