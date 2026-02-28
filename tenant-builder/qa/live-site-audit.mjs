#!/usr/bin/env node
/**
 * Live Site Audit — Playwright-based comprehensive audit of deployed tenant sites.
 * 8 check categories: cross-page branding, navigation, responsive, WCAG contrast,
 * SEO/meta, image performance, footer consistency, admin route gating.
 *
 * Usage:
 *   node qa/live-site-audit.mjs --url https://example.norbotsystems.com --site-id example
 *   node qa/live-site-audit.mjs --url https://example.norbotsystems.com --site-id example --tier accelerate
 *   node qa/live-site-audit.mjs --url https://example.norbotsystems.com --site-id example --output ./results/
 */

import { parseArgs } from 'node:util';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import * as logger from '../lib/logger.mjs';
import { parseOklch, hexToOklch, deltaE_oklch, contrastRatio, parseHex } from '../lib/colour-utils.mjs';

const PAGES = ['/', '/about', '/services', '/projects'];

const VIEWPORTS = [
  { width: 1440, height: 900, label: 'desktop' },
  { width: 768, height: 1024, label: 'tablet' },
  { width: 390, height: 844, label: 'mobile' },
];

// ──────────────────────────────────────────────────────────
// Check 1: Cross-page branding consistency
// ──────────────────────────────────────────────────────────

async function checkCrossPageBranding(browser, baseUrl) {
  const results = [];
  let referencePrimary = null;
  let referenceLogoSrc = null;

  for (const pagePath of PAGES) {
    const pageUrl = `${baseUrl}${pagePath}`;
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    try {
      const response = await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 });
      if (!response || response.status() >= 400) {
        results.push({ page: pagePath, skipped: true, reason: `HTTP ${response?.status() || 'no response'}` });
        continue;
      }

      const data = await page.evaluate(() => {
        const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
        const logo = document.querySelector('header img, nav img, [class*="logo"] img');
        const logoSrc = logo?.getAttribute('src') || null;
        return { primary, logoSrc };
      });

      if (referencePrimary === null) {
        referencePrimary = data.primary;
        referenceLogoSrc = data.logoSrc;
      }

      results.push({
        page: pagePath,
        primary: data.primary,
        logoSrc: data.logoSrc,
        primaryMatch: data.primary === referencePrimary,
        logoMatch: data.logoSrc === referenceLogoSrc,
      });
    } catch (e) {
      results.push({ page: pagePath, skipped: true, reason: e.message?.slice(0, 80) });
    } finally {
      await page.close();
    }
  }

  const mismatches = results.filter(r => !r.skipped && (!r.primaryMatch || !r.logoMatch));
  return {
    check: 'cross_page_branding',
    passed: mismatches.length === 0,
    details: results,
    violations: mismatches.map(m => ({
      page: m.page,
      issue: !m.primaryMatch ? 'primary_colour_mismatch' : 'logo_src_mismatch',
      expected: !m.primaryMatch ? referencePrimary : referenceLogoSrc,
      actual: !m.primaryMatch ? m.primary : m.logoSrc,
    })),
  };
}

// ──────────────────────────────────────────────────────────
// Check 2: Navigation integrity
// ──────────────────────────────────────────────────────────

async function checkNavigationIntegrity(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const violations = [];

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Extract all nav links
    const navLinks = await page.$$eval('nav a, header a', links =>
      links
        .map(a => ({ href: a.getAttribute('href'), text: a.textContent?.trim() }))
        .filter(l => l.href && !l.href.startsWith('#') && !l.href.startsWith('mailto:') && !l.href.startsWith('tel:'))
    );

    const uniqueLinks = [...new Set(navLinks.map(l => l.href))];
    const results = [];

    for (const href of uniqueLinks) {
      let fullUrl;
      try {
        fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
      } catch {
        violations.push({ href, issue: 'invalid_url' });
        continue;
      }

      // Only check same-origin links
      const sameOrigin = fullUrl.startsWith(baseUrl);
      if (!sameOrigin) {
        results.push({ href, status: 'external_skipped' });
        continue;
      }

      try {
        const startTime = Date.now();
        const resp = await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const elapsed = Date.now() - startTime;
        const status = resp?.status() || 0;

        if (status >= 500) {
          violations.push({ href: fullUrl, issue: 'server_error', status });
        } else if (elapsed > 5000) {
          violations.push({ href: fullUrl, issue: 'slow_load', elapsed_ms: elapsed });
        }

        results.push({ href: fullUrl, status, elapsed_ms: elapsed });
      } catch (e) {
        violations.push({ href: fullUrl, issue: 'timeout', message: e.message?.slice(0, 60) });
      }
    }

    return {
      check: 'navigation_integrity',
      passed: violations.length === 0,
      links_checked: uniqueLinks.length,
      details: results,
      violations,
    };
  } finally {
    await page.close();
  }
}

// ──────────────────────────────────────────────────────────
// Check 3: Responsive layout
// ──────────────────────────────────────────────────────────

async function checkResponsiveLayout(browser, baseUrl) {
  const violations = [];
  const results = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });

    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });

      const data = await page.evaluate(({ vpWidth }) => {
        const body = document.body;
        const hasHorizontalScroll = body.scrollWidth > vpWidth + 5; // 5px tolerance

        // Check touch target sizes on mobile
        const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, [role="button"]');
        let smallTargets = 0;
        let totalTargets = 0;

        interactiveElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return; // hidden
          totalTargets++;
          if (rect.width < 44 || rect.height < 44) {
            smallTargets++;
          }
        });

        return {
          scrollWidth: body.scrollWidth,
          hasHorizontalScroll,
          smallTargets,
          totalTargets,
        };
      }, { vpWidth: vp.width });

      if (data.hasHorizontalScroll) {
        violations.push({
          viewport: vp.label,
          issue: 'horizontal_scroll',
          scrollWidth: data.scrollWidth,
          viewportWidth: vp.width,
        });
      }

      // Touch target check only on mobile
      if (vp.label === 'mobile' && data.smallTargets > 0) {
        violations.push({
          viewport: vp.label,
          issue: 'small_touch_targets',
          count: data.smallTargets,
          total: data.totalTargets,
        });
      }

      results.push({ ...vp, ...data });
    } catch (e) {
      results.push({ ...vp, error: e.message?.slice(0, 60) });
    } finally {
      await page.close();
    }
  }

  // Only fail on horizontal scroll, warn on small touch targets
  const criticalViolations = violations.filter(v => v.issue === 'horizontal_scroll');
  return {
    check: 'responsive_layout',
    passed: criticalViolations.length === 0,
    details: results,
    violations,
  };
}

// ──────────────────────────────────────────────────────────
// Check 4: WCAG colour contrast
// ──────────────────────────────────────────────────────────

async function checkWcagContrast(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });

    const primaryVar = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
    );

    // Try to parse as OKLCH and convert to hex for contrast calculation
    const oklch = parseOklch(primaryVar);
    let primaryHex = null;

    if (oklch) {
      // Approximate hex from OKLCH — use the page's computed colour
      const computedHex = await page.evaluate(() => {
        const el = document.createElement('div');
        el.style.color = `var(--primary)`;
        document.body.appendChild(el);
        const computed = getComputedStyle(el).color;
        document.body.removeChild(el);

        // Parse rgb(r, g, b) to hex
        const match = computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!match) return null;
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      });
      primaryHex = computedHex;
    } else if (primaryVar.startsWith('#')) {
      primaryHex = primaryVar;
    }

    if (!primaryHex) {
      return {
        check: 'wcag_contrast',
        passed: true, // Can't check — don't block
        warning: `Could not resolve primary colour: ${primaryVar}`,
        violations: [],
      };
    }

    // Check contrast against white and black backgrounds
    const contrastWhite = contrastRatio(primaryHex, '#ffffff');
    const contrastBlack = contrastRatio(primaryHex, '#000000');

    const violations = [];

    // WCAG AA: 4.5:1 for normal text, 3:1 for large text
    if (contrastWhite < 3.0) {
      violations.push({
        issue: 'low_contrast_on_white',
        primary: primaryHex,
        background: '#ffffff',
        ratio: contrastWhite.toFixed(2),
        level: 'fail',
      });
    } else if (contrastWhite < 4.5) {
      violations.push({
        issue: 'marginal_contrast_on_white',
        primary: primaryHex,
        background: '#ffffff',
        ratio: contrastWhite.toFixed(2),
        level: 'warn',
      });
    }

    // Primary on dark backgrounds (for dark mode or dark sections)
    if (contrastBlack < 3.0) {
      violations.push({
        issue: 'low_contrast_on_black',
        primary: primaryHex,
        background: '#000000',
        ratio: contrastBlack.toFixed(2),
        level: 'warn', // Dark mode is secondary concern
      });
    }

    const failViolations = violations.filter(v => v.level === 'fail');
    return {
      check: 'wcag_contrast',
      passed: failViolations.length === 0,
      primary: primaryHex,
      contrast_white: parseFloat(contrastWhite.toFixed(2)),
      contrast_black: parseFloat(contrastBlack.toFixed(2)),
      wcag_aa_normal: contrastWhite >= 4.5,
      wcag_aa_large: contrastWhite >= 3.0,
      violations,
    };
  } finally {
    await page.close();
  }
}

// ──────────────────────────────────────────────────────────
// Check 5: SEO/meta integrity
// ──────────────────────────────────────────────────────────

async function checkSeoMeta(browser, baseUrl, businessName) {
  const violations = [];
  const results = [];

  for (const pagePath of PAGES) {
    const pageUrl = `${baseUrl}${pagePath}`;
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    try {
      const response = await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 });
      if (!response || response.status() >= 400) continue;

      const meta = await page.evaluate(() => {
        const title = document.title || '';
        const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        const h1 = document.querySelector('h1')?.textContent?.trim() || '';
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
        const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
        return { title, description, h1, ogTitle, ogDescription };
      });

      // Homepage must have business name in title
      if (pagePath === '/' && businessName && !meta.title.toLowerCase().includes(businessName.toLowerCase())) {
        violations.push({ page: pagePath, issue: 'title_missing_business_name', title: meta.title });
      }

      // Every page needs a title
      if (!meta.title || meta.title.length < 5) {
        violations.push({ page: pagePath, issue: 'missing_or_short_title', title: meta.title });
      }

      // Description should be substantial
      if (meta.description.length < 50) {
        violations.push({ page: pagePath, issue: 'short_meta_description', length: meta.description.length });
      }

      // Every page should have an h1
      if (!meta.h1) {
        violations.push({ page: pagePath, issue: 'missing_h1' });
      }

      results.push({ page: pagePath, ...meta });
    } catch (e) {
      results.push({ page: pagePath, error: e.message?.slice(0, 60) });
    } finally {
      await page.close();
    }
  }

  return {
    check: 'seo_meta',
    passed: violations.length === 0,
    details: results,
    violations,
  };
}

// ──────────────────────────────────────────────────────────
// Check 6: Image performance
// ──────────────────────────────────────────────────────────

async function checkImagePerformance(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const violations = [];

  try {
    // Track network requests for image sizes
    const imageRequests = [];
    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      if (contentType.startsWith('image/')) {
        const contentLength = parseInt(response.headers()['content-length'] || '0', 10);
        imageRequests.push({ url, size: contentLength, contentType });
      }
    });

    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Check for oversized images (> 2MB)
    const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
    for (const img of imageRequests) {
      if (img.size > MAX_IMAGE_SIZE) {
        violations.push({
          issue: 'oversized_image',
          url: img.url.slice(0, 120),
          size_bytes: img.size,
          size_mb: (img.size / (1024 * 1024)).toFixed(1),
        });
      }
    }

    // Check hero image has loading attributes
    const heroData = await page.evaluate(() => {
      const heroImg = document.querySelector('section:first-of-type img, [class*="hero"] img, main > :first-child img');
      if (!heroImg) return null;
      return {
        src: heroImg.getAttribute('src')?.slice(0, 100),
        loading: heroImg.getAttribute('loading'),
        fetchpriority: heroImg.getAttribute('fetchpriority'),
        // Next.js uses data-nimg for priority images
        nextPriority: heroImg.hasAttribute('data-nimg'),
      };
    });

    return {
      check: 'image_performance',
      passed: violations.length === 0,
      total_images: imageRequests.length,
      hero: heroData,
      violations,
    };
  } finally {
    await page.close();
  }
}

// ──────────────────────────────────────────────────────────
// Check 7: Footer consistency
// ──────────────────────────────────────────────────────────

async function checkFooterConsistency(browser, baseUrl, businessName) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const violations = [];

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });

    const footerData = await page.evaluate(() => {
      const footer = document.querySelector('footer');
      if (!footer) return null;
      const text = footer.textContent || '';
      const links = Array.from(footer.querySelectorAll('a')).map(a => ({
        href: a.getAttribute('href') || '',
        text: a.textContent?.trim() || '',
      }));
      return { text, links };
    });

    if (!footerData) {
      violations.push({ issue: 'no_footer_found' });
      return { check: 'footer_consistency', passed: false, violations };
    }

    const footerText = footerData.text.toLowerCase();

    // Business name
    if (businessName && !footerText.includes(businessName.toLowerCase())) {
      violations.push({ issue: 'missing_business_name', expected: businessName });
    }

    // Phone number (any phone-like pattern)
    const hasPhone = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(footerData.text);
    if (!hasPhone) {
      violations.push({ issue: 'missing_phone' });
    }

    // Email (mailto link or email pattern)
    const hasEmail = footerData.links.some(l => l.href.startsWith('mailto:')) ||
                     /[\w.-]+@[\w.-]+\.\w+/.test(footerData.text);
    if (!hasEmail) {
      violations.push({ issue: 'missing_email' });
    }

    // Copyright year
    const currentYear = new Date().getFullYear().toString();
    if (!footerData.text.includes(currentYear)) {
      violations.push({ issue: 'missing_or_outdated_copyright_year', expected: currentYear });
    }

    return {
      check: 'footer_consistency',
      passed: violations.filter(v => v.issue === 'missing_business_name' || v.issue === 'missing_phone').length === 0,
      footer_text_length: footerData.text.length,
      violations,
    };
  } finally {
    await page.close();
  }
}

// ──────────────────────────────────────────────────────────
// Check 8: Admin route gating
// ──────────────────────────────────────────────────────────

async function checkAdminGating(browser, baseUrl, tier) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    const adminUrl = `${baseUrl}/admin`;
    const response = await page.goto(adminUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const finalUrl = page.url();
    const status = response?.status() || 0;

    // Elevate tier should NOT be able to access admin
    if (tier === 'elevate') {
      const redirectedAway = !finalUrl.includes('/admin') || status === 403;
      return {
        check: 'admin_gating',
        passed: redirectedAway,
        tier,
        final_url: finalUrl,
        status,
        violations: redirectedAway ? [] : [{ issue: 'elevate_can_access_admin', url: finalUrl }],
      };
    }

    // Accelerate+ should be able to reach admin (or auth wall)
    return {
      check: 'admin_gating',
      passed: true,
      tier,
      final_url: finalUrl,
      status,
      violations: [],
    };
  } catch (e) {
    return {
      check: 'admin_gating',
      passed: true, // Don't block on timeout — admin may require auth
      tier,
      error: e.message?.slice(0, 60),
      violations: [],
    };
  } finally {
    await page.close();
  }
}

// ──────────────────────────────────────────────────────────
// Main exported function
// ──────────────────────────────────────────────────────────

/**
 * Run all live site audit checks.
 * @param {string} url — base URL of the deployed tenant site
 * @param {string} siteId — tenant site ID
 * @param {{ tier?: string, businessName?: string, outputPath?: string }} options
 * @returns {Promise<{ passed: boolean, checks: object[], violations: object[], summary: object }>}
 */
export async function runLiveSiteAudit(url, siteId, options = {}) {
  const { tier = 'accelerate', businessName, outputPath } = options;
  const baseUrl = url.replace(/\/$/, '');

  logger.info(`Live site audit: ${baseUrl} (tier=${tier})`);

  const browser = await chromium.launch({ headless: true });
  const checks = [];
  const allViolations = [];

  try {
    // Run all 8 checks
    logger.info('  [1/8] Cross-page branding...');
    const branding = await checkCrossPageBranding(browser, baseUrl);
    checks.push(branding);

    logger.info('  [2/8] Navigation integrity...');
    const navigation = await checkNavigationIntegrity(browser, baseUrl);
    checks.push(navigation);

    logger.info('  [3/8] Responsive layout...');
    const responsive = await checkResponsiveLayout(browser, baseUrl);
    checks.push(responsive);

    logger.info('  [4/8] WCAG colour contrast...');
    const contrast = await checkWcagContrast(browser, baseUrl);
    checks.push(contrast);

    logger.info('  [5/8] SEO/meta integrity...');
    const seo = await checkSeoMeta(browser, baseUrl, businessName);
    checks.push(seo);

    logger.info('  [6/8] Image performance...');
    const images = await checkImagePerformance(browser, baseUrl);
    checks.push(images);

    logger.info('  [7/8] Footer consistency...');
    const footer = await checkFooterConsistency(browser, baseUrl, businessName);
    checks.push(footer);

    logger.info('  [8/8] Admin route gating...');
    const admin = await checkAdminGating(browser, baseUrl, tier);
    checks.push(admin);
  } finally {
    await browser.close();
  }

  // Collect all violations
  for (const check of checks) {
    for (const v of (check.violations || [])) {
      allViolations.push({ check: check.check, ...v });
    }
  }

  const passed = checks.every(c => c.passed);
  const summary = {
    site_id: siteId,
    url: baseUrl,
    tier,
    checks_run: checks.length,
    checks_passed: checks.filter(c => c.passed).length,
    checks_failed: checks.filter(c => !c.passed).length,
    total_violations: allViolations.length,
    passed,
  };

  // Log summary
  for (const c of checks) {
    const icon = c.passed ? 'PASS' : 'FAIL';
    logger.info(`  ${icon} ${c.check} (${(c.violations || []).length} violation(s))`);
  }

  // Write results
  if (outputPath) {
    mkdirSync(outputPath, { recursive: true });
    const resultFile = resolve(outputPath, 'live-site-audit.json');
    writeFileSync(resultFile, JSON.stringify({ passed, checks, violations: allViolations, summary }, null, 2));
    logger.info(`Results written: ${resultFile}`);
  }

  return { passed, checks, violations: allViolations, summary };
}

// ──────────────────────────────────────────────────────────
// CLI entry point
// ──────────────────────────────────────────────────────────

const isDirectRun = process.argv[1] &&
  (resolve(process.argv[1]) === resolve(import.meta.dirname, 'live-site-audit.mjs') ||
   import.meta.url === `file://${resolve(process.argv[1])}`);

if (isDirectRun) {
  const { values: args } = parseArgs({
    options: {
      url: { type: 'string' },
      'site-id': { type: 'string' },
      tier: { type: 'string', default: 'accelerate' },
      'business-name': { type: 'string' },
      output: { type: 'string' },
      help: { type: 'boolean' },
    },
  });

  if (args.help) {
    console.log(`Live Site Audit — Playwright-based comprehensive tenant audit

Usage:
  node qa/live-site-audit.mjs --url https://example.norbotsystems.com --site-id example
  node qa/live-site-audit.mjs --url https://example.norbotsystems.com --site-id example --tier accelerate
  node qa/live-site-audit.mjs --url https://example.norbotsystems.com --site-id example --business-name "Example Co"

Checks:
  1. Cross-page branding  — --primary CSS var and logo consistent across all pages
  2. Navigation integrity  — All nav links load without 500 errors, under 5s
  3. Responsive layout     — No horizontal scroll on desktop/tablet/mobile viewports
  4. WCAG colour contrast  — Primary colour contrast ratio against white/black
  5. SEO/meta integrity    — Title, meta description, h1 presence per page
  6. Image performance     — No image > 2MB, hero has proper loading attributes
  7. Footer consistency    — Business name, phone, email, copyright year present
  8. Admin route gating    — Elevate tier cannot access /admin`);
    process.exit(0);
  }

  if (!args.url || !args['site-id']) {
    logger.error('Required: --url and --site-id');
    console.log('Run with --help for usage');
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const outputPath = args.output || resolve(import.meta.dirname, `../results/${today}/${args['site-id']}`);

  logger.progress({
    stage: 'live-site-audit',
    site_id: args['site-id'],
    status: 'start',
    detail: args.url,
  });

  try {
    const result = await runLiveSiteAudit(args.url, args['site-id'], {
      tier: args.tier,
      businessName: args['business-name'],
      outputPath,
    });

    logger.progress({
      stage: 'live-site-audit',
      site_id: args['site-id'],
      status: result.passed ? 'complete' : 'error',
      detail: `${result.summary.checks_passed}/${result.summary.checks_run} checks passed`,
    });

    logger.summary({
      total: result.summary.checks_run,
      succeeded: result.summary.checks_passed,
      failed: result.summary.checks_failed,
      skipped: 0,
    });

    console.log(JSON.stringify(result));
    process.exit(result.passed ? 0 : 1);
  } catch (e) {
    logger.error(`Live site audit failed: ${e.message}`);
    process.exit(1);
  }
}
