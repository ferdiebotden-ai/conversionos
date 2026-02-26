#!/usr/bin/env node
/**
 * Audit Report Generator — human-readable markdown summary.
 * Reads content-integrity.json and visual-qa.json, outputs audit-report.md.
 *
 * Usage:
 *   node qa/audit-report.mjs --site-id example --results-dir ./results/2026-02-26/example/
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as logger from '../lib/logger.mjs';

const { values: args } = parseArgs({
  options: {
    'site-id': { type: 'string' },
    'results-dir': { type: 'string' },
    help: { type: 'boolean' },
  },
});

if (args.help) {
  console.log('Usage: node qa/audit-report.mjs --site-id example --results-dir ./results/2026-02-26/example/');
  process.exit(0);
}

export function generateAuditReport(siteId, resultsDir) {
  const lines = [];
  const now = new Date().toISOString();

  lines.push(`# Audit Report: ${siteId}`);
  lines.push(`Generated: ${now}\n`);

  // Content Integrity
  const ciPath = resolve(resultsDir, 'content-integrity.json');
  let contentIntegrity = null;
  if (existsSync(ciPath)) {
    contentIntegrity = JSON.parse(readFileSync(ciPath, 'utf-8'));
    lines.push('## Content Integrity\n');
    const s = contentIntegrity.summary;
    lines.push(`| Check | Result |`);
    lines.push(`|-------|--------|`);
    lines.push(`| Demo leakage | ${s.demo_leakage === 0 ? 'PASS Clean' : `WARN ${s.demo_leakage} violation(s)`} |`);
    lines.push(`| Broken images | ${s.broken_images === 0 ? 'PASS Clean' : `WARN ${s.broken_images} violation(s)`} |`);
    lines.push(`| Demo images | ${s.demo_images === 0 ? 'PASS Clean' : `WARN ${s.demo_images} violation(s)`} |`);
    lines.push(`| Empty sections | ${s.empty_sections === 0 ? 'PASS Clean' : `WARN ${s.empty_sections} violation(s)`} |`);
    if (s.fabrication !== undefined) {
      lines.push(`| Fabrication | ${s.fabrication === 0 ? 'PASS Clean' : `WARN ${s.fabrication} field(s)`} |`);
    }
    if (s.placeholder_text !== undefined) {
      lines.push(`| Placeholder text | ${s.placeholder_text === 0 ? 'PASS Clean' : `WARN ${s.placeholder_text} found`} |`);
    }
    if (s.business_name !== undefined) {
      lines.push(`| Business name | ${s.business_name === 0 ? 'PASS Present' : `WARN ${s.business_name} page(s) missing`} |`);
    }
    if (s.copyright_format !== undefined) {
      lines.push(`| Copyright format | ${s.copyright_format === 0 ? 'PASS Clean' : `WARN Issue found`} |`);
    }
    lines.push('');

    if (contentIntegrity.violations?.length > 0) {
      lines.push('### Violations Detail\n');
      for (const v of contentIntegrity.violations) {
        const label = (v.check || '').replace(/_/g, ' ');
        lines.push(`- **${label}** on ${v.page || 'N/A'}: ${v.leaked_string || v.src || v.section_heading || v.phrase || v.issue || ''}`);
      }
      lines.push('');
    }
  } else {
    lines.push('## Content Integrity\n_Not run_\n');
  }

  // Visual QA
  const vqaPath = resolve(resultsDir, 'visual-qa.json');
  let visualQa = null;
  if (existsSync(vqaPath)) {
    visualQa = JSON.parse(readFileSync(vqaPath, 'utf-8'));
    lines.push('## Visual QA\n');
    const dims = ['logo_fidelity', 'colour_match', 'copy_accuracy', 'layout_integrity', 'brand_cohesion'];
    lines.push(`| Dimension | Score |`);
    lines.push(`|-----------|-------|`);
    for (const d of dims) {
      const score = visualQa[d] || 0;
      const indicator = score >= 4 ? 'PASS' : score >= 3 ? 'WARN' : 'FAIL';
      lines.push(`| ${d.replace(/_/g, ' ')} | ${indicator} ${score}/5 |`);
    }
    lines.push(`| **Average** | **${visualQa.average}/5** |`);
    lines.push(`| **Pass** | ${visualQa.pass ? 'PASS Yes' : 'FAIL No'} |`);
    if (visualQa.notes) {
      lines.push(`\nNotes: ${visualQa.notes}`);
    }
    lines.push('');
  } else {
    lines.push('## Visual QA\n_Not run_\n');
  }

  // Auto-fixes applied
  const fixesPath = resolve(resultsDir, 'auto-fixes.json');
  if (existsSync(fixesPath)) {
    const fixes = JSON.parse(readFileSync(fixesPath, 'utf-8'));
    if (fixes.length > 0) {
      lines.push('## Auto-Fixes Applied\n');
      for (const f of fixes) {
        lines.push(`- ${f.success ? 'OK' : 'FAILED'} ${f.fix}`);
      }
      lines.push('');
    }
  }

  // Human review items
  lines.push('## Items for Human Review\n');
  lines.push('These require human judgment (not automatable):');
  lines.push('- [ ] Logo quality -- is the extracted logo correct?');
  lines.push('- [ ] Copy tone -- does the tagline/mission match the contractor?');
  lines.push('- [ ] Hero image -- is the chosen image compelling?');
  lines.push('- [ ] Overall brand feel -- does the site feel authentic?');
  lines.push('- [ ] Service accuracy -- are descriptions complete?');
  lines.push('');

  // Overall verdict
  const ciPass = contentIntegrity?.passed ?? true;
  const vqaPass = visualQa?.pass ?? true;
  const overallPass = ciPass && vqaPass;
  const status = overallPass ? 'complete' : 'review';

  lines.push('## Verdict\n');
  lines.push(`**Status:** ${status === 'complete' ? 'COMPLETE' : 'NEEDS REVIEW'}`);
  if (visualQa) lines.push(`**Visual QA:** ${visualQa.average}/5`);
  if (contentIntegrity) lines.push(`**Content Issues:** ${contentIntegrity.violations?.length || 0}`);
  lines.push('');

  const markdown = lines.join('\n');
  const reportPath = resolve(resultsDir, 'audit-report.md');
  writeFileSync(reportPath, markdown);
  logger.info(`Audit report written: ${reportPath}`);

  return { status, markdown, reportPath };
}

// CLI entry point
if (args['site-id'] && args['results-dir']) {
  const result = generateAuditReport(args['site-id'], args['results-dir']);
  console.log(result.markdown);
  process.exit(result.status === 'complete' ? 0 : 1);
} else if (!args.help) {
  console.log('Required: --site-id and --results-dir');
  console.log('Run with --help for usage');
  process.exit(1);
}
