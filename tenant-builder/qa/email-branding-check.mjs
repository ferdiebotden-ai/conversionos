#!/usr/bin/env node
/**
 * Email Branding Check — verify tenant branding for email templates.
 * Checks admin_settings completeness, scans email template source for anti-patterns,
 * and verifies outreach email template fills correctly.
 *
 * Usage:
 *   node qa/email-branding-check.mjs --site-id example
 *   node qa/email-branding-check.mjs --site-id example --output ./results/
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as logger from '../lib/logger.mjs';
import { loadEnv } from '../lib/env-loader.mjs';

loadEnv();

// Email template files relative to the demo project root
const DEMO_ROOT = resolve(import.meta.dirname, '../..');
const EMAIL_TEMPLATES = [
  { name: 'quote-email', path: 'src/lib/email/quote-email.tsx' },
  { name: 'invoice-email', path: 'src/lib/email/invoice-email.tsx' },
  { name: 'new-lead-notification', path: 'src/emails/new-lead-notification.tsx' },
];

// Anti-patterns in email templates
const SOURCE_ANTI_PATTERNS = [
  { pattern: 'DEMO-', description: 'Hard-coded DEMO- prefix' },
  { pattern: 'leadquoteenginev2.vercel.app', description: 'Hard-coded Vercel URL' },
  { pattern: 'ConversionOS Demo', description: 'Demo tenant name leak' },
  { pattern: "'ferdie@norbotsystems.com'", description: 'Hard-coded NorBot email' },
  { pattern: "'(226) 444-3478'", description: 'Hard-coded NorBot phone' },
];

// Required branding fields for emails
const REQUIRED_EMAIL_FIELDS = ['name', 'phone', 'email', 'city', 'province', 'primaryColor'];

// ──────────────────────────────────────────────────────────
// Branding data fetch
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
    phone: info.phone || '',
    email: info.email || '',
    website: info.website || '',
    city: info.city || '',
    province: info.province || '',
    primaryColor: colors.primary_hex || '',
    logoUrl: profile.logoUrl || brand.logoUrl || '',
    tagline: brand.tagline || info.tagline || '',
    quotesEmail: info.quotes_email || '',
    paymentEmail: info.payment_email || '',
    _raw: { info, brand, profile },
  };
}

// ──────────────────────────────────────────────────────────
// Check 1: Branding data completeness
// ──────────────────────────────────────────────────────────

function checkBrandingCompleteness(branding) {
  const violations = [];

  for (const field of REQUIRED_EMAIL_FIELDS) {
    if (!branding[field] || branding[field].trim().length === 0) {
      violations.push({
        check: 'missing_field',
        field,
        template: 'all',
        severity: 'critical',
      });
    }
  }

  // Logo for email (important but not critical — emails work without)
  if (!branding.logoUrl) {
    violations.push({
      check: 'missing_logo',
      detail: 'No logoUrl — email headers will show text-only brand name',
      template: 'all',
      severity: 'warning',
    });
  } else if (branding.logoUrl.toLowerCase().endsWith('.svg')) {
    violations.push({
      check: 'svg_logo',
      detail: 'Logo is SVG — email clients have inconsistent SVG support, logo will be skipped',
      template: 'all',
      severity: 'info',
    });
  }

  // Quotes email (needed for quote-email Reply CTA)
  if (!branding.quotesEmail) {
    violations.push({
      check: 'missing_quotes_email',
      detail: 'No quotes_email — "Reply to This Quote" CTA will use empty mailto',
      template: 'quote-email',
      severity: 'warning',
    });
  }

  // Payment email (needed for invoice-email)
  if (!branding.paymentEmail) {
    violations.push({
      check: 'missing_payment_email',
      detail: 'No payment_email — invoice email payment instructions will be empty',
      template: 'invoice-email',
      severity: 'warning',
    });
  }

  return violations;
}

// ──────────────────────────────────────────────────────────
// Check 2: Template source scan
// ──────────────────────────────────────────────────────────

function checkTemplateSource() {
  const violations = [];

  for (const tmpl of EMAIL_TEMPLATES) {
    const fullPath = resolve(DEMO_ROOT, tmpl.path);
    if (!existsSync(fullPath)) {
      violations.push({
        check: 'template_missing',
        template: tmpl.name,
        path: tmpl.path,
        severity: 'critical',
      });
      continue;
    }

    const source = readFileSync(fullPath, 'utf-8');

    // Check anti-patterns
    for (const ap of SOURCE_ANTI_PATTERNS) {
      if (source.includes(ap.pattern)) {
        violations.push({
          check: 'source_anti_pattern',
          template: tmpl.name,
          pattern: ap.pattern,
          description: ap.description,
          severity: 'critical',
        });
      }
    }

    // Check that templates reference branding props (not hardcoded values)
    if (!source.includes('branding') && tmpl.name !== 'new-lead-notification') {
      violations.push({
        check: 'no_branding_prop',
        template: tmpl.name,
        detail: 'Template does not reference branding prop',
        severity: 'warning',
      });
    }

    // Check logo rendering (quote and invoice emails)
    if (tmpl.name === 'quote-email' || tmpl.name === 'invoice-email') {
      if (!source.includes('logoUrl') && !source.includes('Img')) {
        violations.push({
          check: 'no_logo_rendering',
          template: tmpl.name,
          detail: 'Template does not render logo',
          severity: 'warning',
        });
      }
    }

    // Check primary colour usage
    if ((tmpl.name === 'quote-email' || tmpl.name === 'invoice-email') && !source.includes('primaryColor')) {
      violations.push({
        check: 'no_primary_colour',
        template: tmpl.name,
        detail: 'Template does not use primaryColor from branding',
        severity: 'warning',
      });
    }

    // Check NEXT_PUBLIC_APP_URL usage in notification email
    if (tmpl.name === 'new-lead-notification') {
      if (source.includes('leadquoteenginev2.vercel.app')) {
        violations.push({
          check: 'hardcoded_url',
          template: tmpl.name,
          detail: 'Still references old Vercel URL',
          severity: 'critical',
        });
      }
    }
  }

  return violations;
}

// ──────────────────────────────────────────────────────────
// Check 3: Demo leakage in branding data
// ──────────────────────────────────────────────────────────

function checkDemoLeakageInData(branding) {
  const violations = [];
  const DEMO_PATTERNS = [
    'ConversionOS Demo',
    'conversionos-demo',
    'ferdie@norbotsystems.com',
    '(226) 444-3478',
    '1 Ontario Street',
    'N5A 3H1',
  ];

  const allValues = JSON.stringify(branding._raw);
  for (const pattern of DEMO_PATTERNS) {
    if (allValues.includes(pattern)) {
      violations.push({
        check: 'demo_leakage_in_data',
        pattern,
        template: 'all',
        severity: 'critical',
      });
    }
  }

  return violations;
}

// ──────────────────────────────────────────────────────────
// Check 4: Outreach email template
// ──────────────────────────────────────────────────────────

function checkOutreachTemplate() {
  const violations = [];
  const outreachPath = resolve(DEMO_ROOT, 'scripts/outreach/generate-email.mjs');

  if (!existsSync(outreachPath)) {
    violations.push({
      check: 'outreach_template_missing',
      severity: 'warning',
    });
    return violations;
  }

  const source = readFileSync(outreachPath, 'utf-8');

  // CASL compliance
  if (!source.includes('STOP')) {
    violations.push({
      check: 'outreach_missing_casl_unsubscribe',
      severity: 'critical',
    });
  }

  if (!source.includes('NorBot Systems Inc.')) {
    violations.push({
      check: 'outreach_missing_business_name',
      severity: 'critical',
    });
  }

  if (!source.includes('PO Box 23030')) {
    violations.push({
      check: 'outreach_missing_address',
      severity: 'critical',
    });
  }

  // Signature includes website link
  if (!source.includes('norbotsystems.com')) {
    violations.push({
      check: 'outreach_missing_website',
      detail: 'Signature should include norbotsystems.com',
      severity: 'warning',
    });
  }

  return violations;
}

// ──────────────────────────────────────────────────────────
// Main exported function
// ──────────────────────────────────────────────────────────

/**
 * Run email branding checks for a tenant.
 * @param {string} siteId
 * @param {{ outputPath?: string }} options
 * @returns {Promise<{ passed: boolean, violations: object[], summary: object }>}
 */
export async function runEmailBrandingCheck(siteId, options = {}) {
  const { outputPath } = options;

  logger.info(`Email branding check: ${siteId}`);

  const allViolations = [];

  // Check 1: Branding data completeness
  logger.info('  Checking branding data completeness...');
  const branding = await fetchBrandingData(siteId);
  if (!branding) {
    return {
      passed: false,
      violations: [{ check: 'no_branding_data', severity: 'critical' }],
      summary: { site_id: siteId, has_data: false },
    };
  }
  allViolations.push(...checkBrandingCompleteness(branding));

  // Check 2: Template source analysis
  logger.info('  Scanning email template sources...');
  allViolations.push(...checkTemplateSource());

  // Check 3: Demo leakage in data
  logger.info('  Checking for demo leakage in branding data...');
  allViolations.push(...checkDemoLeakageInData(branding));

  // Check 4: Outreach template
  logger.info('  Checking outreach email template...');
  allViolations.push(...checkOutreachTemplate());

  // Verdict
  const criticalCount = allViolations.filter(v => v.severity === 'critical').length;
  const warningCount = allViolations.filter(v => v.severity === 'warning').length;
  const passed = criticalCount === 0;

  const summary = {
    site_id: siteId,
    has_data: true,
    templates_scanned: EMAIL_TEMPLATES.length,
    outreach_scanned: true,
    critical_violations: criticalCount,
    warning_violations: warningCount,
    passed,
  };

  // Log
  for (const v of allViolations) {
    const icon = v.severity === 'critical' ? 'FAIL' : v.severity === 'warning' ? 'WARN' : 'INFO';
    logger.info(`  ${icon} [${v.template || 'outreach'}] ${v.check}: ${v.detail || v.pattern || v.field || ''}`);
  }

  // Write results
  if (outputPath) {
    mkdirSync(outputPath, { recursive: true });
    const resultFile = resolve(outputPath, 'email-branding-check.json');
    const { _raw, ...brandingClean } = branding;
    writeFileSync(resultFile, JSON.stringify({ passed, violations: allViolations, summary, branding: brandingClean }, null, 2));
    logger.info(`Results written: ${resultFile}`);
  }

  return { passed, violations: allViolations, summary };
}

// ──────────────────────────────────────────────────────────
// CLI entry point
// ──────────────────────────────────────────────────────────

const isDirectRun = process.argv[1] &&
  (resolve(process.argv[1]) === resolve(import.meta.dirname, 'email-branding-check.mjs') ||
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
    console.log(`Email Branding Check — verify tenant branding for email templates

Usage:
  node qa/email-branding-check.mjs --site-id example

Checks:
  1. Branding completeness — required fields present for email rendering
  2. Template source scan   — no hard-coded DEMO- prefix, Vercel URLs, or demo data
  3. Demo leakage in data   — branding data doesn't contain ConversionOS Demo values
  4. Outreach template      — CASL compliance, signature completeness`);
    process.exit(0);
  }

  if (!args['site-id']) {
    logger.error('Required: --site-id');
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const outputPath = args.output || resolve(import.meta.dirname, `../results/${today}/${args['site-id']}`);

  try {
    const result = await runEmailBrandingCheck(args['site-id'], { outputPath });
    console.log(JSON.stringify(result));
    process.exit(result.passed ? 0 : 1);
  } catch (e) {
    logger.error(`Email branding check failed: ${e.message}`);
    process.exit(1);
  }
}
