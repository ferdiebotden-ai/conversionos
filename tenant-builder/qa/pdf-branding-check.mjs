#!/usr/bin/env node
/**
 * PDF Branding Check — verify tenant branding data is complete for PDF generation.
 * Checks admin_settings for required fields, logo accessibility, and anti-patterns.
 *
 * Usage:
 *   node qa/pdf-branding-check.mjs --site-id example
 *   node qa/pdf-branding-check.mjs --site-id example --output ./results/
 */

import { parseArgs } from 'node:util';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import * as logger from '../lib/logger.mjs';
import { loadEnv } from '../lib/env-loader.mjs';

loadEnv();

// Known anti-patterns that indicate demo leakage or unfinished provisioning
const DEMO_LEAKAGE_PATTERNS = [
  'ConversionOS Demo',
  'conversionos-demo',
  'DEMO-',
  'ferdie@norbotsystems.com',
  '(226) 444-3478',
  '.vercel.app',
  '1 Ontario Street',
  'N5A 3H1',
];

// ──────────────────────────────────────────────────────────
// Branding data extraction (mirrors getBranding() from src/lib/branding.ts)
// ──────────────────────────────────────────────────────────

async function fetchBrandingData(siteId) {
  const { getSupabase } = await import('../lib/supabase-client.mjs');
  const sb = getSupabase();

  const { data, error } = await sb
    .from('admin_settings')
    .select('key, value')
    .eq('site_id', siteId)
    .in('key', ['business_info', 'branding', 'company_profile']);

  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  if (!data || data.length === 0) return null;

  const map = Object.fromEntries(data.map(r => [r.key, r.value]));
  const info = map['business_info'] || {};
  const brand = map['branding'] || {};
  const profile = map['company_profile'] || {};
  const colors = brand.colors || {};

  return {
    name: info.name || '',
    tagline: brand.tagline || info.tagline || '',
    phone: info.phone || '',
    email: info.email || '',
    website: info.website || '',
    address: info.address || '',
    city: info.city || '',
    province: info.province || '',
    postal: info.postal || '',
    paymentEmail: info.payment_email || '',
    quotesEmail: info.quotes_email || '',
    primaryColor: colors.primary_hex || '',
    primaryOklch: colors.primary_oklch || '',
    logoUrl: profile.logoUrl || brand.logoUrl || '',
    services: profile.services || [],
    _raw: { info, brand, profile },
  };
}

// ──────────────────────────────────────────────────────────
// Individual checks
// ──────────────────────────────────────────────────────────

function checkRequiredFields(branding) {
  const violations = [];
  const REQUIRED = ['name', 'phone', 'email', 'city', 'province', 'primaryColor'];

  for (const field of REQUIRED) {
    if (!branding[field] || branding[field].trim().length === 0) {
      violations.push({ check: 'missing_field', field, severity: 'critical' });
    }
  }

  // PDF-specific fields (important but not critical)
  const PDF_IMPORTANT = ['address', 'postal', 'paymentEmail', 'website'];
  for (const field of PDF_IMPORTANT) {
    if (!branding[field] || branding[field].trim().length === 0) {
      violations.push({ check: 'missing_field', field, severity: 'warning' });
    }
  }

  return violations;
}

function checkDemoLeakage(branding) {
  const violations = [];
  const allValues = JSON.stringify(branding._raw);

  for (const pattern of DEMO_LEAKAGE_PATTERNS) {
    if (allValues.includes(pattern)) {
      violations.push({
        check: 'demo_leakage',
        pattern,
        severity: pattern === 'DEMO-' ? 'critical' : 'warning',
      });
    }
  }

  return violations;
}

function checkQuoteNumberPrefix(branding) {
  // The formatQuoteNumber function in pdf-utils.ts now defaults to 'QE'.
  // Verify by checking that the raw data doesn't force a DEMO- prefix.
  const violations = [];
  const rawStr = JSON.stringify(branding._raw);

  if (rawStr.includes('DEMO-') || rawStr.includes('"prefix":"DEMO"') || rawStr.includes("'DEMO'")) {
    violations.push({
      check: 'demo_quote_prefix',
      detail: 'DEMO- prefix found in branding data',
      severity: 'critical',
    });
  }

  return violations;
}

async function checkLogoAccessibility(branding) {
  const violations = [];
  const logoUrl = branding.logoUrl;

  if (!logoUrl) {
    violations.push({
      check: 'logo_missing',
      detail: 'No logoUrl in branding data — PDFs will use text fallback',
      severity: 'warning',
    });
    return violations;
  }

  // SVG logos can't be used in react-pdf — note but don't fail
  if (logoUrl.toLowerCase().endsWith('.svg')) {
    violations.push({
      check: 'logo_svg',
      detail: 'Logo is SVG — react-pdf will use text fallback (email clients may also skip it)',
      severity: 'info',
    });
    return violations;
  }

  // Check logo is accessible via HTTP
  try {
    let fullUrl = logoUrl;
    if (!logoUrl.startsWith('http')) {
      // Relative URL — construct from NEXT_PUBLIC_APP_URL or Supabase storage
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      fullUrl = `${appUrl}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`;
    }

    if (fullUrl.startsWith('http')) {
      const resp = await fetch(fullUrl, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
      if (!resp.ok) {
        violations.push({
          check: 'logo_inaccessible',
          url: fullUrl,
          status: resp.status,
          severity: 'critical',
        });
      }
    }
  } catch (e) {
    violations.push({
      check: 'logo_fetch_error',
      url: logoUrl,
      error: e.message?.slice(0, 60),
      severity: 'warning',
    });
  }

  return violations;
}

function checkColourFormat(branding) {
  const violations = [];

  if (branding.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(branding.primaryColor)) {
    violations.push({
      check: 'invalid_colour_format',
      value: branding.primaryColor,
      expected: '#RRGGBB hex format',
      severity: 'critical',
    });
  }

  if (branding.primaryOklch && !/^\d+\.\d+\s+\d+\.\d+\s+\d+/.test(branding.primaryOklch)) {
    violations.push({
      check: 'invalid_oklch_format',
      value: branding.primaryOklch,
      expected: 'L C H numeric format (e.g. 0.588 0.108 180)',
      severity: 'warning',
    });
  }

  return violations;
}

// ──────────────────────────────────────────────────────────
// Main exported function
// ──────────────────────────────────────────────────────────

/**
 * Run PDF branding checks for a tenant.
 * @param {string} siteId
 * @param {{ outputPath?: string }} options
 * @returns {Promise<{ passed: boolean, violations: object[], summary: object, branding: object }>}
 */
export async function runPdfBrandingCheck(siteId, options = {}) {
  const { outputPath } = options;

  logger.info(`PDF branding check: ${siteId}`);

  const branding = await fetchBrandingData(siteId);
  if (!branding) {
    return {
      passed: false,
      violations: [{ check: 'no_branding_data', severity: 'critical' }],
      summary: { site_id: siteId, has_data: false },
      branding: null,
    };
  }

  const allViolations = [];

  // Run checks
  logger.info('  Checking required fields...');
  allViolations.push(...checkRequiredFields(branding));

  logger.info('  Checking for demo leakage...');
  allViolations.push(...checkDemoLeakage(branding));

  logger.info('  Checking quote number prefix...');
  allViolations.push(...checkQuoteNumberPrefix(branding));

  logger.info('  Checking logo accessibility...');
  allViolations.push(...(await checkLogoAccessibility(branding)));

  logger.info('  Checking colour format...');
  allViolations.push(...checkColourFormat(branding));

  // Verdict
  const criticalCount = allViolations.filter(v => v.severity === 'critical').length;
  const warningCount = allViolations.filter(v => v.severity === 'warning').length;
  const passed = criticalCount === 0;

  const summary = {
    site_id: siteId,
    has_data: true,
    has_logo: !!branding.logoUrl,
    logo_is_svg: branding.logoUrl?.toLowerCase().endsWith('.svg') || false,
    has_primary_colour: !!branding.primaryColor,
    critical_violations: criticalCount,
    warning_violations: warningCount,
    passed,
  };

  // Log
  for (const v of allViolations) {
    const icon = v.severity === 'critical' ? 'FAIL' : v.severity === 'warning' ? 'WARN' : 'INFO';
    logger.info(`  ${icon} ${v.check}: ${v.field || v.pattern || v.detail || v.url || ''}`);
  }

  // Write results
  if (outputPath) {
    mkdirSync(outputPath, { recursive: true });
    const resultFile = resolve(outputPath, 'pdf-branding-check.json');
    const { _raw, ...brandingClean } = branding;
    writeFileSync(resultFile, JSON.stringify({ passed, violations: allViolations, summary, branding: brandingClean }, null, 2));
    logger.info(`Results written: ${resultFile}`);
  }

  return { passed, violations: allViolations, summary, branding };
}

// ──────────────────────────────────────────────────────────
// CLI entry point
// ──────────────────────────────────────────────────────────

const isDirectRun = process.argv[1] &&
  (resolve(process.argv[1]) === resolve(import.meta.dirname, 'pdf-branding-check.mjs') ||
   import.meta.url === `file://${resolve(process.argv[1])}`);

if (isDirectRun) {
  const { values: args } = parseArgs({
    options: {
      'site-id': { type: 'string' },
      output: { type: 'string' },
      help: { type: 'boolean' },
    },
  });

  if (args.help) {
    console.log(`PDF Branding Check — verify tenant branding for PDF generation

Usage:
  node qa/pdf-branding-check.mjs --site-id example

Checks:
  1. Required fields     — name, phone, email, city, province, primaryColor present
  2. Demo leakage        — No "ConversionOS Demo", "DEMO-", demo contact info
  3. Quote prefix        — No DEMO- prefix in quote numbering
  4. Logo accessibility  — Logo URL exists and returns HTTP 200 (SVG noted)
  5. Colour format       — primaryColor is valid #RRGGBB hex`);
    process.exit(0);
  }

  if (!args['site-id']) {
    logger.error('Required: --site-id');
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const outputPath = args.output || resolve(import.meta.dirname, `../results/${today}/${args['site-id']}`);

  try {
    const result = await runPdfBrandingCheck(args['site-id'], { outputPath });
    console.log(JSON.stringify(result));
    process.exit(result.passed ? 0 : 1);
  } catch (e) {
    logger.error(`PDF branding check failed: ${e.message}`);
    process.exit(1);
  }
}
