#!/usr/bin/env node
/**
 * Enhanced Audit Report Generator — comprehensive go-live readiness report.
 * Reads all QA result files and produces a markdown report + JSON verdict.
 *
 * Sections: Content Integrity, Visual QA, Live Site Audit, Original vs Demo,
 * PDF Branding, Email Branding, WCAG Contrast, Auto-Fixes, Human Review, Verdict.
 *
 * Usage:
 *   node qa/audit-report.mjs --site-id example --results-dir ./results/2026-02-26/example/
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import * as logger from '../lib/logger.mjs';

/**
 * Safely read and parse a JSON result file.
 * @returns {object|null}
 */
function readResult(resultsDir, filename) {
  const p = resolve(resultsDir, filename);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8'));
  } catch (e) {
    logger.warn(`Failed to read ${filename}: ${e.message?.slice(0, 60)}`);
    return null;
  }
}

/**
 * Determine go-live readiness verdict.
 * - READY: all checks pass, 0 critical violations
 * - REVIEW: passes but has warnings (WCAG near-miss, minor content delta, SVG logo)
 * - NOT READY: any critical failure (demo leakage, broken images, missing branding, visual QA < 3.5)
 */
function determineVerdict(results) {
  const { contentIntegrity, visualQa, liveSiteAudit, originalVsDemo, pdfBranding, emailBranding } = results;

  const criticalFailures = [];
  const warnings = [];

  // Content integrity
  if (contentIntegrity) {
    if (!contentIntegrity.passed) {
      const s = contentIntegrity.summary;
      if (s.demo_leakage > 0) criticalFailures.push('Demo leakage detected');
      if (s.broken_images > 0) criticalFailures.push(`${s.broken_images} broken image(s)`);
      if (s.demo_images > 0) warnings.push(`${s.demo_images} demo image path(s)`);
      if (s.empty_sections > 0) warnings.push(`${s.empty_sections} empty section(s)`);
      if (s.placeholder_text > 0) criticalFailures.push('Placeholder text found');
    }
  }

  // Visual QA
  if (visualQa) {
    if (!visualQa.pass) criticalFailures.push(`Visual QA failed (${visualQa.average}/5)`);
    else if (visualQa.average < 4.0) warnings.push(`Visual QA marginal (${visualQa.average}/5)`);
  }

  // Live site audit
  if (liveSiteAudit) {
    if (!liveSiteAudit.passed) {
      const failed = (liveSiteAudit.checks || []).filter(c => !c.passed);
      for (const c of failed) {
        if (c.check === 'wcag_contrast' || c.check === 'responsive_layout') {
          warnings.push(`${c.check} has issues`);
        } else {
          criticalFailures.push(`${c.check} failed`);
        }
      }
    }
  }

  // Original vs demo
  if (originalVsDemo) {
    if (originalVsDemo.matchScore < 50) criticalFailures.push(`Low match score: ${originalVsDemo.matchScore}%`);
    else if (originalVsDemo.matchScore < 70) warnings.push(`Match score marginal: ${originalVsDemo.matchScore}%`);
  }

  // PDF branding
  if (pdfBranding) {
    if (!pdfBranding.passed) criticalFailures.push('PDF branding has critical issues');
    else if (pdfBranding.violations?.some(v => v.severity === 'warning')) warnings.push('PDF branding has warnings');
  }

  // Email branding
  if (emailBranding) {
    if (!emailBranding.passed) criticalFailures.push('Email branding has critical issues');
    else if (emailBranding.violations?.some(v => v.severity === 'warning')) warnings.push('Email branding has warnings');
  }

  if (criticalFailures.length > 0) return { verdict: 'NOT READY', criticalFailures, warnings };
  if (warnings.length > 0) return { verdict: 'REVIEW', criticalFailures, warnings };
  return { verdict: 'READY', criticalFailures, warnings };
}

/**
 * Generate the full audit report.
 * @param {string} siteId
 * @param {string} resultsDir
 * @returns {{ verdict: string, markdown: string, reportPath: string, readinessPath: string }}
 */
export function generateAuditReport(siteId, resultsDir) {
  mkdirSync(resultsDir, { recursive: true });
  const lines = [];
  const now = new Date().toISOString();

  // Read all result files
  const contentIntegrity = readResult(resultsDir, 'content-integrity.json');
  const visualQa = readResult(resultsDir, 'visual-qa.json');
  const liveSiteAudit = readResult(resultsDir, 'live-site-audit.json');
  const originalVsDemo = readResult(resultsDir, 'original-vs-demo.json');
  const pdfBranding = readResult(resultsDir, 'pdf-branding-check.json');
  const emailBranding = readResult(resultsDir, 'email-branding-check.json');
  const autoFixes = readResult(resultsDir, 'auto-fixes.json');

  const verdictResult = determineVerdict({
    contentIntegrity, visualQa, liveSiteAudit, originalVsDemo, pdfBranding, emailBranding,
  });

  lines.push(`# Go-Live Readiness Report: ${siteId}`);
  lines.push(`Generated: ${now}`);
  lines.push(`**Verdict: ${verdictResult.verdict}**\n`);

  // ── Section 1: Content Integrity ──
  if (contentIntegrity) {
    lines.push('## 1. Content Integrity\n');
    const s = contentIntegrity.summary;
    lines.push('| Check | Result |');
    lines.push('|-------|--------|');
    lines.push(`| Demo leakage | ${s.demo_leakage === 0 ? 'PASS' : `FAIL ${s.demo_leakage} violation(s)`} |`);
    lines.push(`| Broken images | ${s.broken_images === 0 ? 'PASS' : `FAIL ${s.broken_images} violation(s)`} |`);
    lines.push(`| Demo images | ${s.demo_images === 0 ? 'PASS' : `WARN ${s.demo_images} path(s)`} |`);
    lines.push(`| Empty sections | ${s.empty_sections === 0 ? 'PASS' : `WARN ${s.empty_sections}`} |`);
    if (s.fabrication !== undefined) lines.push(`| Fabrication | ${s.fabrication === 0 ? 'PASS' : `WARN ${s.fabrication} field(s)`} |`);
    if (s.placeholder_text !== undefined) lines.push(`| Placeholder text | ${s.placeholder_text === 0 ? 'PASS' : `FAIL ${s.placeholder_text}`} |`);
    if (s.business_name !== undefined) lines.push(`| Business name | ${s.business_name === 0 ? 'PASS' : `WARN ${s.business_name} missing`} |`);
    if (s.copyright_format !== undefined) lines.push(`| Copyright format | ${s.copyright_format === 0 ? 'PASS' : `WARN`} |`);
    lines.push('');

    if (contentIntegrity.violations?.length > 0) {
      lines.push('<details><summary>Violations detail</summary>\n');
      for (const v of contentIntegrity.violations) {
        const label = (v.check || '').replace(/_/g, ' ');
        lines.push(`- **${label}** on ${v.page || 'N/A'}: ${v.leaked_string || v.src || v.section_heading || v.phrase || v.issue || ''}`);
      }
      lines.push('\n</details>\n');
    }
  } else {
    lines.push('## 1. Content Integrity\n_Not run_\n');
  }

  // ── Section 2: Visual QA ──
  if (visualQa) {
    lines.push('## 2. Visual QA\n');
    const dims = ['logo_fidelity', 'colour_match', 'copy_accuracy', 'layout_integrity', 'brand_cohesion'];
    lines.push('| Dimension | Score |');
    lines.push('|-----------|-------|');
    for (const d of dims) {
      const score = visualQa[d] || 0;
      const icon = score >= 4 ? 'PASS' : score >= 3 ? 'WARN' : 'FAIL';
      lines.push(`| ${d.replace(/_/g, ' ')} | ${icon} ${score}/5 |`);
    }
    lines.push(`| **Average** | **${visualQa.average}/5** |`);
    if (visualQa.notes) lines.push(`\nNotes: ${visualQa.notes}`);
    lines.push('');
  } else {
    lines.push('## 2. Visual QA\n_Not run_\n');
  }

  // ── Section 3: Live Site Audit ──
  if (liveSiteAudit) {
    lines.push('## 3. Live Site Audit\n');
    const checks = liveSiteAudit.checks || [];
    lines.push('| Check | Result |');
    lines.push('|-------|--------|');
    for (const c of checks) {
      const icon = c.passed ? 'PASS' : 'FAIL';
      const detail = (c.violations || []).length > 0 ? ` (${c.violations.length} issue(s))` : '';
      lines.push(`| ${c.check.replace(/_/g, ' ')} | ${icon}${detail} |`);
    }
    lines.push(`\n**${liveSiteAudit.summary.checks_passed}/${liveSiteAudit.summary.checks_run} checks passed**\n`);

    // WCAG detail
    const wcag = checks.find(c => c.check === 'wcag_contrast');
    if (wcag && wcag.contrast_white) {
      lines.push(`WCAG: Primary on white = ${wcag.contrast_white}:1 (AA normal ${wcag.wcag_aa_normal ? 'PASS' : 'FAIL'}, AA large ${wcag.wcag_aa_large ? 'PASS' : 'FAIL'})`);
      lines.push('');
    }
  } else {
    lines.push('## 3. Live Site Audit\n_Not run_\n');
  }

  // ── Section 4: Original vs Demo ──
  if (originalVsDemo) {
    lines.push('## 4. Original vs Demo Comparison\n');
    lines.push('| Field | Match | Score |');
    lines.push('|-------|-------|-------|');
    for (const c of (originalVsDemo.comparisons || [])) {
      if (c.skipped) {
        lines.push(`| ${c.field} | SKIP | — |`);
        continue;
      }
      const icon = c.match ? 'PASS' : 'FAIL';
      lines.push(`| ${c.field} | ${icon} | ${c.score}% |`);
    }
    lines.push(`\n**Overall match: ${originalVsDemo.matchScore}%**\n`);
  } else {
    lines.push('## 4. Original vs Demo Comparison\n_Not run (no scraped.json available)_\n');
  }

  // ── Section 5: PDF Branding ──
  if (pdfBranding) {
    lines.push('## 5. PDF Branding\n');
    const s = pdfBranding.summary;
    lines.push(`| Item | Status |`);
    lines.push(`|------|--------|`);
    lines.push(`| Branding data | ${s.has_data ? 'PASS' : 'FAIL'} |`);
    lines.push(`| Logo | ${s.has_logo ? (s.logo_is_svg ? 'WARN SVG (text fallback)' : 'PASS') : 'WARN None'} |`);
    lines.push(`| Primary colour | ${s.has_primary_colour ? 'PASS' : 'FAIL'} |`);
    lines.push(`| Critical issues | ${s.critical_violations === 0 ? 'PASS None' : `FAIL ${s.critical_violations}`} |`);
    lines.push(`| Warnings | ${s.warning_violations === 0 ? 'None' : s.warning_violations} |`);
    lines.push('');
  } else {
    lines.push('## 5. PDF Branding\n_Not run_\n');
  }

  // ── Section 6: Email Branding ──
  if (emailBranding) {
    lines.push('## 6. Email Branding\n');
    const s = emailBranding.summary;
    lines.push(`| Item | Status |`);
    lines.push(`|------|--------|`);
    lines.push(`| Branding data | ${s.has_data ? 'PASS' : 'FAIL'} |`);
    lines.push(`| Templates scanned | ${s.templates_scanned} |`);
    lines.push(`| Outreach template | ${s.outreach_scanned ? 'PASS Scanned' : 'SKIP'} |`);
    lines.push(`| Critical issues | ${s.critical_violations === 0 ? 'PASS None' : `FAIL ${s.critical_violations}`} |`);
    lines.push(`| Warnings | ${s.warning_violations === 0 ? 'None' : s.warning_violations} |`);
    lines.push('');
  } else {
    lines.push('## 6. Email Branding\n_Not run_\n');
  }

  // ── Auto-fixes ──
  if (autoFixes && autoFixes.length > 0) {
    lines.push('## Auto-Fixes Applied\n');
    for (const f of autoFixes) {
      lines.push(`- ${f.success ? 'OK' : 'FAILED'} ${f.fix}`);
    }
    lines.push('');
  }

  // ── Human Review Checklist ──
  lines.push('## Human Review Checklist\n');
  lines.push('These require Ferdie\'s judgment (not automatable):\n');
  lines.push('- [ ] Logo renders correctly in PDFs (non-SVG only)');
  lines.push('- [ ] Email headers show correct tenant branding');
  lines.push('- [ ] Colour contrast is readable for body text and CTAs');
  lines.push('- [ ] Quote numbers use correct prefix (QE, not DEMO-)');
  lines.push('- [ ] Original content is faithfully represented');
  lines.push('- [ ] Copy tone matches contractor\'s voice');
  lines.push('- [ ] Hero image is compelling and relevant');
  lines.push('- [ ] Overall brand feel is authentic');
  lines.push('- [ ] Service descriptions are accurate and complete');
  lines.push('- [ ] Testimonials are real (not fabricated)');
  lines.push('');

  // ── Verdict ──
  lines.push('## Go-Live Verdict\n');
  const emoji = verdictResult.verdict === 'READY' ? 'READY' :
                verdictResult.verdict === 'REVIEW' ? 'REVIEW' : 'NOT READY';
  lines.push(`### ${emoji}\n`);

  if (verdictResult.criticalFailures.length > 0) {
    lines.push('**Critical failures (must fix before go-live):**');
    for (const f of verdictResult.criticalFailures) {
      lines.push(`- ${f}`);
    }
    lines.push('');
  }

  if (verdictResult.warnings.length > 0) {
    lines.push('**Warnings (review recommended):**');
    for (const w of verdictResult.warnings) {
      lines.push(`- ${w}`);
    }
    lines.push('');
  }

  if (verdictResult.verdict === 'READY') {
    lines.push('All automated checks passed. Ready for outreach pending human review.\n');
  }

  const markdown = lines.join('\n');

  // Write markdown report
  const reportPath = resolve(resultsDir, 'audit-report.md');
  writeFileSync(reportPath, markdown);

  // Write go-live readiness JSON
  const readiness = {
    site_id: siteId,
    date: now,
    verdict: verdictResult.verdict,
    critical_failures: verdictResult.criticalFailures,
    warnings: verdictResult.warnings,
    checks: {
      content_integrity: contentIntegrity ? { passed: contentIntegrity.passed, violations: contentIntegrity.violations?.length || 0 } : null,
      visual_qa: visualQa ? { passed: visualQa.pass, average: visualQa.average } : null,
      live_site_audit: liveSiteAudit ? { passed: liveSiteAudit.passed, checks_passed: liveSiteAudit.summary?.checks_passed, checks_run: liveSiteAudit.summary?.checks_run } : null,
      original_vs_demo: originalVsDemo ? { passed: originalVsDemo.passed, match_score: originalVsDemo.matchScore } : null,
      pdf_branding: pdfBranding ? { passed: pdfBranding.passed, critical: pdfBranding.summary?.critical_violations } : null,
      email_branding: emailBranding ? { passed: emailBranding.passed, critical: emailBranding.summary?.critical_violations } : null,
    },
    human_review_required: true,
  };

  const readinessPath = resolve(resultsDir, 'go-live-readiness.json');
  writeFileSync(readinessPath, JSON.stringify(readiness, null, 2));

  logger.info(`Audit report written: ${reportPath}`);
  logger.info(`Go-live readiness: ${readinessPath}`);

  return { verdict: verdictResult.verdict, markdown, reportPath, readinessPath };
}

// ──────────────────────────────────────────────────────────
// CLI entry point
// ──────────────────────────────────────────────────────────

const isDirectRun = process.argv[1] &&
  (resolve(process.argv[1]) === resolve(import.meta.dirname, 'audit-report.mjs') ||
   import.meta.url === `file://${resolve(process.argv[1])}`);

if (isDirectRun) {
  const { values: args } = parseArgs({
    options: {
      'site-id': { type: 'string' },
      'results-dir': { type: 'string' },
      help: { type: 'boolean' },
    },
    strict: false,
  });

  if (args.help) {
    console.log(`Go-Live Readiness Audit Report

Usage:
  node qa/audit-report.mjs --site-id example --results-dir ./results/2026-02-26/example/

Reads: content-integrity.json, visual-qa.json, live-site-audit.json,
       original-vs-demo.json, pdf-branding-check.json, email-branding-check.json
Outputs: audit-report.md, go-live-readiness.json

Verdict: READY / REVIEW / NOT READY`);
    process.exit(0);
  }

  if (args['site-id'] && args['results-dir']) {
    const result = generateAuditReport(args['site-id'], args['results-dir']);
    console.log(result.markdown);
    process.exit(result.verdict === 'NOT READY' ? 1 : 0);
  } else if (!args.help) {
    console.log('Required: --site-id and --results-dir');
    console.log('Run with --help for usage');
    process.exit(1);
  }
}
