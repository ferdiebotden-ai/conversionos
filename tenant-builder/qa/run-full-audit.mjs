#!/usr/bin/env node
/**
 * Standalone Full Audit Runner — runs all QA checks on an existing tenant.
 * Single entry point for the complete go-live readiness audit.
 *
 * Usage:
 *   node qa/run-full-audit.mjs --url https://example.norbotsystems.com --site-id example
 *   node qa/run-full-audit.mjs --url ... --site-id ... --scraped-data ./scraped.json
 *   node qa/run-full-audit.mjs --url ... --site-id ... --output ./audit-results/ --tier accelerate
 */

import { parseArgs } from 'node:util';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import * as logger from '../lib/logger.mjs';
import { loadEnv } from '../lib/env-loader.mjs';

loadEnv();

const { values: args } = parseArgs({
  options: {
    url: { type: 'string' },
    'site-id': { type: 'string' },
    tier: { type: 'string', default: 'accelerate' },
    'scraped-data': { type: 'string' },
    output: { type: 'string' },
    help: { type: 'boolean' },
  },
});

if (args.help) {
  console.log(`Full Go-Live Readiness Audit

Usage:
  node qa/run-full-audit.mjs --url https://example.norbotsystems.com --site-id example
  node qa/run-full-audit.mjs --url URL --site-id ID --scraped-data ./scraped.json
  node qa/run-full-audit.mjs --url URL --site-id ID --output ./audit-results/ --tier accelerate

Runs ALL checks:
  1. Content integrity (Playwright — demo leakage, broken images, placeholders)
  2. Live site audit (Playwright — 8 checks: branding, nav, responsive, WCAG, SEO, images, footer, admin)
  3. Original vs demo comparison (if scraped-data provided — 7 field comparison)
  4. PDF branding check (Supabase data completeness, logo, colour, demo leakage)
  5. Email branding check (Supabase data + template source scan + outreach CASL)
  6. Go-live readiness report (verdict: READY / REVIEW / NOT READY)`);
  process.exit(0);
}

if (!args.url || !args['site-id']) {
  logger.error('Required: --url and --site-id');
  process.exit(1);
}

const siteId = args['site-id'];
const siteUrl = args.url;
const tier = args.tier;
const today = new Date().toISOString().slice(0, 10);
const outputDir = args.output || resolve(import.meta.dirname, `../results/${today}/${siteId}`);
mkdirSync(outputDir, { recursive: true });

const DEMO_ROOT = resolve(import.meta.dirname, '../..');
const QA_ROOT = import.meta.dirname;

logger.info(`Full audit: ${siteId} (${siteUrl})`);
logger.info(`Output: ${outputDir}`);

// ──────────────────────────────────────────────────────────
// 1. Content integrity
// ──────────────────────────────────────────────────────────

try {
  logger.info('1/6 Content integrity...');
  const ciArgs = [
    resolve(QA_ROOT, 'content-integrity.mjs'),
    '--url', siteUrl,
    '--site-id', siteId,
    '--output', outputDir,
  ];
  if (args['scraped-data']) ciArgs.push('--scraped-data', args['scraped-data']);

  try {
    execFileSync('node', ciArgs, {
      cwd: DEMO_ROOT, env: process.env, timeout: 120000,
      maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    // exits 1 on violations — result file still written
  }

  const ciPath = resolve(outputDir, 'content-integrity.json');
  if (existsSync(ciPath)) {
    const ciResult = JSON.parse(readFileSync(ciPath, 'utf-8'));
    logger.info(`  Content integrity: ${ciResult.passed ? 'PASS' : 'FAIL'} (${ciResult.violations?.length || 0} violations)`);

    // Auto-fix critical violations
    if (ciResult.violations?.length > 0) {
      try {
        const { autoFixViolations } = await import('./content-integrity.mjs');
        const fixes = await autoFixViolations(siteId, ciResult.violations);
        if (fixes.length > 0) {
          const { writeFileSync } = await import('node:fs');
          writeFileSync(resolve(outputDir, 'auto-fixes.json'), JSON.stringify(fixes, null, 2));
          logger.info(`  Applied ${fixes.length} auto-fix(es)`);
        }
      } catch (fixErr) {
        logger.warn(`  Auto-fix failed: ${fixErr.message?.slice(0, 100)}`);
      }
    }
  }
} catch (e) {
  logger.warn(`Content integrity failed: ${e.message?.slice(0, 100)}`);
}

// ──────────────────────────────────────────────────────────
// 2. Live site audit
// ──────────────────────────────────────────────────────────

try {
  logger.info('2/6 Live site audit...');
  const { runLiveSiteAudit } = await import('./live-site-audit.mjs');
  const result = await runLiveSiteAudit(siteUrl, siteId, { outputPath: outputDir, tier });
  logger.info(`  Live site audit: ${result.passed ? 'PASS' : 'FAIL'} (${result.summary.checks_passed}/${result.summary.checks_run})`);
} catch (e) {
  logger.warn(`Live site audit failed: ${e.message?.slice(0, 100)}`);
}

// ──────────────────────────────────────────────────────────
// 3. Original vs demo comparison
// ──────────────────────────────────────────────────────────

if (args['scraped-data'] && existsSync(args['scraped-data'])) {
  try {
    logger.info('3/6 Original vs demo comparison...');
    const scrapedData = JSON.parse(readFileSync(args['scraped-data'], 'utf-8'));
    const { runOriginalVsDemo } = await import('./original-vs-demo.mjs');
    const result = await runOriginalVsDemo(siteUrl, scrapedData, { outputPath: outputDir });
    logger.info(`  Original vs demo: ${result.passed ? 'PASS' : 'FAIL'} (${result.matchScore}% match)`);
  } catch (e) {
    logger.warn(`Original vs demo failed: ${e.message?.slice(0, 100)}`);
  }
} else {
  logger.info('3/6 Original vs demo comparison... SKIP (no scraped-data)');
}

// ──────────────────────────────────────────────────────────
// 4. PDF branding check
// ──────────────────────────────────────────────────────────

try {
  logger.info('4/6 PDF branding check...');
  const { runPdfBrandingCheck } = await import('./pdf-branding-check.mjs');
  const result = await runPdfBrandingCheck(siteId, { outputPath: outputDir });
  logger.info(`  PDF branding: ${result.passed ? 'PASS' : 'FAIL'} (${result.summary.critical_violations} critical, ${result.summary.warning_violations} warnings)`);
} catch (e) {
  logger.warn(`PDF branding check failed: ${e.message?.slice(0, 100)}`);
}

// ──────────────────────────────────────────────────────────
// 5. Email branding check
// ──────────────────────────────────────────────────────────

try {
  logger.info('5/6 Email branding check...');
  const { runEmailBrandingCheck } = await import('./email-branding-check.mjs');
  const result = await runEmailBrandingCheck(siteId, { outputPath: outputDir });
  logger.info(`  Email branding: ${result.passed ? 'PASS' : 'FAIL'} (${result.summary.critical_violations} critical, ${result.summary.warning_violations} warnings)`);
} catch (e) {
  logger.warn(`Email branding check failed: ${e.message?.slice(0, 100)}`);
}

// ──────────────────────────────────────────────────────────
// 6. Generate audit report + go-live verdict
// ──────────────────────────────────────────────────────────

try {
  logger.info('6/6 Generating audit report...');
  const { generateAuditReport } = await import('./audit-report.mjs');
  const report = generateAuditReport(siteId, outputDir);

  logger.info(`\nVerdict: ${report.verdict}`);
  logger.info(`Report: ${report.reportPath}`);
  logger.info(`Readiness: ${report.readinessPath}`);

  // Print report to stdout
  console.log('\n' + report.markdown);
  process.exit(report.verdict === 'NOT READY' ? 1 : 0);
} catch (e) {
  logger.error(`Audit report failed: ${e.message}`);
  process.exit(1);
}
