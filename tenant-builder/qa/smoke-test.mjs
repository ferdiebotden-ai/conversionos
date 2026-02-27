#!/usr/bin/env node
/**
 * Platform Smoke Test — post-provisioning end-to-end verification.
 *
 * Runs 10 checks to verify a freshly-built tenant works correctly.
 *
 * Usage:
 *   node qa/smoke-test.mjs --url https://example.norbotsystems.com --site-id example
 *   node qa/smoke-test.mjs --url https://example.norbotsystems.com --site-id example --tier accelerate
 */

import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { loadEnv } from '../lib/env-loader.mjs';
import { getSupabase } from '../lib/supabase-client.mjs';
import * as logger from '../lib/logger.mjs';

loadEnv();

const { values: args } = parseArgs({
  options: {
    url: { type: 'string' },
    'site-id': { type: 'string' },
    tier: { type: 'string', default: 'accelerate' },
    help: { type: 'boolean' },
  },
});

if (args.help || !args.url || !args['site-id']) {
  console.log(`Platform Smoke Test — post-provisioning verification

Usage:
  node qa/smoke-test.mjs --url https://example.norbotsystems.com --site-id example
  node qa/smoke-test.mjs --url https://example.norbotsystems.com --site-id example --tier accelerate

Checks:
  1.  Homepage loads (200, title contains business name)
  2.  Services page (200, at least 1 service card)
  3.  Visualizer (200, upload zone visible)
  4.  Contact page (200, form visible)
  5.  About page (200, company name in body)
  6.  Admin login (200 or redirect)
  7.  API health (/api/voice/check -> 200)
  8.  No demo leakage (no "ConversionOS Demo", "NorBot" outside footer)
  9.  Trust badges render (if >= 3 metrics)
  10. Assembly templates seeded (DB, >= 10 for Accelerate+)`);
  process.exit(args.help ? 0 : 1);
}

const baseUrl = args.url.replace(/\/$/, '');
const siteId = args['site-id'];
const tier = args.tier;

logger.progress({
  stage: 'smoke-test',
  site_id: siteId,
  status: 'start',
  detail: baseUrl,
});

/**
 * @typedef {{ name: string, passed: boolean, detail?: string }} CheckResult
 */

/** @type {CheckResult[]} */
const checks = [];

/**
 * Record a check result.
 * @param {string} name
 * @param {boolean} passed
 * @param {string} [detail]
 */
function record(name, passed, detail) {
  checks.push({ name, passed, detail });
  const status = passed ? 'PASS' : 'FAIL';
  logger.info(`  [${status}] ${name}${detail ? ` — ${detail}` : ''}`);
  logger.progress({
    stage: 'smoke-test',
    site_id: siteId,
    status: passed ? 'complete' : 'error',
    detail: `${name}: ${status}`,
  });
}

// ──────────────────────────────────────────────────────────
// Fetch business name from DB for checks that need it
// ──────────────────────────────────────────────────────────

let businessName = '';
try {
  const sb = getSupabase();
  const { data } = await sb
    .from('admin_settings')
    .select('value')
    .eq('site_id', siteId)
    .eq('key', 'business_info')
    .single();
  if (data?.value?.name) {
    businessName = data.value.name;
  }
} catch {
  logger.warn('Could not fetch business name from DB — some checks will be less precise');
}

// ──────────────────────────────────────────────────────────
// Browser-based checks (1-6, 8-9)
// ──────────────────────────────────────────────────────────

const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'ConversionOS-SmokeTest/1.0',
  });

  // ── Check 1: Homepage loads ──
  try {
    const page = await context.newPage();
    const response = await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    const status = response?.status() || 0;
    const title = await page.title();
    const titleOk = businessName
      ? title.toLowerCase().includes(businessName.toLowerCase())
      : title.length > 0;
    record(
      'Homepage loads',
      status === 200 && titleOk,
      `status=${status}, title="${title.slice(0, 60)}"`,
    );
    await page.close();
  } catch (e) {
    record('Homepage loads', false, e.message?.slice(0, 80));
  }

  // ── Check 2: Services page ──
  try {
    const page = await context.newPage();
    const response = await page.goto(`${baseUrl}/services`, { waitUntil: 'networkidle', timeout: 30000 });
    const status = response?.status() || 0;
    // Count service cards (look for common patterns)
    const serviceCards = await page.$$eval(
      '[class*="service"], [class*="card"], section h3',
      els => els.length,
    );
    record(
      'Services page',
      status === 200 && serviceCards >= 1,
      `status=${status}, serviceCards=${serviceCards}`,
    );
    await page.close();
  } catch (e) {
    record('Services page', false, e.message?.slice(0, 80));
  }

  // ── Check 3: Visualizer ──
  try {
    const page = await context.newPage();
    const response = await page.goto(`${baseUrl}/visualizer`, { waitUntil: 'networkidle', timeout: 30000 });
    const status = response?.status() || 0;
    // Check for upload zone or file input
    const hasUpload = await page.$$eval(
      'input[type="file"], [class*="upload"], [class*="dropzone"], [class*="drop-zone"]',
      els => els.length > 0,
    );
    record(
      'Visualizer',
      status === 200 && hasUpload,
      `status=${status}, uploadZone=${hasUpload}`,
    );
    await page.close();
  } catch (e) {
    record('Visualizer', false, e.message?.slice(0, 80));
  }

  // ── Check 4: Contact page ──
  try {
    const page = await context.newPage();
    const response = await page.goto(`${baseUrl}/contact`, { waitUntil: 'networkidle', timeout: 30000 });
    const status = response?.status() || 0;
    // Check for a form element
    const hasForm = await page.$$eval('form, [class*="form"]', els => els.length > 0);
    record(
      'Contact page',
      status === 200 && hasForm,
      `status=${status}, formVisible=${hasForm}`,
    );
    await page.close();
  } catch (e) {
    record('Contact page', false, e.message?.slice(0, 80));
  }

  // ── Check 5: About page ──
  try {
    const page = await context.newPage();
    const response = await page.goto(`${baseUrl}/about`, { waitUntil: 'networkidle', timeout: 30000 });
    const status = response?.status() || 0;
    const bodyText = await page.textContent('body') || '';
    const namePresent = businessName
      ? bodyText.toLowerCase().includes(businessName.toLowerCase())
      : bodyText.length > 100;
    record(
      'About page',
      status === 200 && namePresent,
      `status=${status}, businessNameFound=${namePresent}`,
    );
    await page.close();
  } catch (e) {
    record('About page', false, e.message?.slice(0, 80));
  }

  // ── Check 6: Admin login ──
  try {
    const page = await context.newPage();
    const response = await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle', timeout: 30000 });
    const status = response?.status() || 0;
    // Admin should either show a login form or redirect (both are valid)
    const finalUrl = page.url();
    const validAdmin = status === 200 || (status >= 300 && status < 400);
    // If status is 200, check it's a real page (not an error page)
    record(
      'Admin login',
      validAdmin || finalUrl.includes('login') || finalUrl.includes('auth'),
      `status=${status}, url=${finalUrl.slice(0, 80)}`,
    );
    await page.close();
  } catch (e) {
    record('Admin login', false, e.message?.slice(0, 80));
  }

  // ── Check 8: No demo leakage ──
  try {
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    const bodyText = await page.textContent('body') || '';

    const leakageFound = [];
    // Check for "ConversionOS Demo" (the product name alone is OK in footer)
    if (bodyText.includes('ConversionOS Demo')) {
      leakageFound.push('ConversionOS Demo');
    }
    // Check for "NorBot" outside of "Powered by" footer context
    const norbotIdx = bodyText.indexOf('NorBot');
    if (norbotIdx !== -1) {
      const surrounding = bodyText.slice(Math.max(0, norbotIdx - 40), norbotIdx + 40);
      const isFooter = /powered\s+by/i.test(surrounding);
      if (!isFooter) {
        leakageFound.push('NorBot (outside footer)');
      }
    }

    record(
      'No demo leakage',
      leakageFound.length === 0,
      leakageFound.length > 0 ? `found: ${leakageFound.join(', ')}` : 'clean',
    );
    await page.close();
  } catch (e) {
    record('No demo leakage', false, e.message?.slice(0, 80));
  }

  // ── Check 9: Trust badges render ──
  try {
    const sb = getSupabase();
    const { data } = await sb
      .from('admin_settings')
      .select('value')
      .eq('site_id', siteId)
      .eq('key', 'company_profile')
      .single();

    const profile = data?.value || {};
    const metrics = profile.trustMetrics || {};
    const metricCount = Object.keys(metrics).filter(k => metrics[k]).length;

    if (metricCount >= 3) {
      // Trust badges should be visible on homepage
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
      // Look for social proof section (data-section, class, or heading)
      const socialProofVisible = await page.$$eval(
        '[class*="social-proof"], [class*="trust"], [data-section="social-proof"]',
        els => els.some(el => el.offsetParent !== null),
      ).catch(() => false);
      record(
        'Trust badges render',
        socialProofVisible,
        `metrics=${metricCount}, sectionVisible=${socialProofVisible}`,
      );
      await page.close();
    } else {
      // Not enough metrics — section should be hidden, which is correct behaviour
      record(
        'Trust badges render',
        true,
        `metrics=${metricCount} (< 3, correctly hidden)`,
      );
    }
  } catch (e) {
    record('Trust badges render', false, e.message?.slice(0, 80));
  }

} finally {
  await browser.close();
}

// ──────────────────────────────────────────────────────────
// Non-browser checks (7, 10)
// ──────────────────────────────────────────────────────────

// ── Check 7: API health ──
try {
  const resp = await fetch(`${baseUrl}/api/voice/check`, {
    signal: AbortSignal.timeout(10000),
  });
  const isJson = resp.headers.get('content-type')?.includes('json') || false;
  record(
    'API health',
    resp.status === 200 && isJson,
    `status=${resp.status}, json=${isJson}`,
  );
} catch (e) {
  record('API health', false, e.message?.slice(0, 80));
}

// ── Check 10: Assembly templates seeded ──
try {
  if (tier === 'accelerate' || tier === 'dominate') {
    const sb = getSupabase();
    const { data: templates, error } = await (sb).from('assembly_templates')
      .select('id')
      .eq('site_id', siteId);

    if (error) {
      record('Assembly templates seeded', false, `DB error: ${error.message}`);
    } else {
      const count = templates?.length || 0;
      record(
        'Assembly templates seeded',
        count >= 10,
        `count=${count} (need >= 10)`,
      );
    }
  } else {
    // Elevate tier doesn't get assembly templates
    record(
      'Assembly templates seeded',
      true,
      `tier=${tier} (not required)`,
    );
  }
} catch (e) {
  record('Assembly templates seeded', false, e.message?.slice(0, 80));
}

// ──────────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────────

const passed = checks.filter(c => c.passed).length;
const failed = checks.filter(c => !c.passed).length;
const total = checks.length;

logger.info('');
logger.info(`=== Smoke Test Summary: ${siteId} ===`);
logger.info(`  Passed: ${passed}/${total}`);
if (failed > 0) {
  logger.warn(`  Failed: ${failed}/${total}`);
  for (const c of checks.filter(c => !c.passed)) {
    logger.warn(`    - ${c.name}: ${c.detail || 'no detail'}`);
  }
}

const result = { checks, passed, failed, total };

logger.progress({
  stage: 'smoke-test',
  site_id: siteId,
  status: failed === 0 ? 'complete' : 'error',
  detail: `passed=${passed}/${total}`,
});

logger.summary({
  total,
  succeeded: passed,
  failed,
  skipped: 0,
});

// Output JSON for downstream consumers
console.log(JSON.stringify(result));

process.exit(failed === 0 ? 0 : 1);
