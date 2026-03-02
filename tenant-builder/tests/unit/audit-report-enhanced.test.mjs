import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateAuditReport } from '../../qa/audit-report.mjs';
import {
  mockContentIntegrityPass, mockContentIntegrityFail,
  mockQaResultPass, mockQaResultFail,
  mockLiveSiteAuditPass, mockLiveSiteAuditFail,
  mockOriginalVsDemoPass, mockOriginalVsDemoFail,
  mockPdfBrandingPass, mockPdfBrandingFail,
  mockEmailBrandingPass, mockEmailBrandingFail,
  mockPageCompletenessPass, mockPageCompletenessFail,
} from '../helpers/fixtures.mjs';

const tmpDir = resolve(import.meta.dirname, '../../.test-tmp-audit');

describe('audit-report (enhanced)', () => {
  beforeEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeResults(files) {
    for (const [filename, data] of Object.entries(files)) {
      writeFileSync(resolve(tmpDir, filename), JSON.stringify(data, null, 2));
    }
  }

  it('returns READY when all checks pass', () => {
    writeResults({
      'content-integrity.json': mockContentIntegrityPass,
      'visual-qa.json': mockQaResultPass,
      'live-site-audit.json': mockLiveSiteAuditPass,
      'original-vs-demo.json': mockOriginalVsDemoPass,
      'pdf-branding-check.json': mockPdfBrandingPass,
      'email-branding-check.json': mockEmailBrandingPass,
    });

    const result = generateAuditReport('test-reno', tmpDir);
    expect(result.verdict).toBe('READY');
    expect(result.markdown).toContain('READY');
  });

  it('returns REVIEW when visual QA is marginal', () => {
    const marginalQa = { ...mockQaResultPass, average: 3.9, pass: true };
    writeResults({
      'content-integrity.json': mockContentIntegrityPass,
      'visual-qa.json': marginalQa,
    });

    const result = generateAuditReport('test-reno', tmpDir);
    expect(result.verdict).toBe('REVIEW');
    expect(result.markdown).toContain('REVIEW');
  });

  it('returns NOT READY on demo leakage', () => {
    writeResults({
      'content-integrity.json': mockContentIntegrityFail,
      'visual-qa.json': mockQaResultPass,
    });

    const result = generateAuditReport('test-reno', tmpDir);
    expect(result.verdict).toBe('NOT READY');
    expect(result.markdown).toContain('NOT READY');
  });

  it('returns NOT READY on visual QA failure', () => {
    writeResults({
      'content-integrity.json': mockContentIntegrityPass,
      'visual-qa.json': mockQaResultFail,
    });

    const result = generateAuditReport('test-reno', tmpDir);
    expect(result.verdict).toBe('NOT READY');
  });

  it('handles missing result files gracefully', () => {
    // No files written — should still produce a report
    const result = generateAuditReport('test-reno', tmpDir);
    expect(result.verdict).toBe('READY'); // No checks = no failures
    expect(result.markdown).toContain('_Not run_');
    expect(result.reportPath).toBeTruthy();
    expect(result.readinessPath).toBeTruthy();
  });

  it('includes all 7 sections in markdown output', () => {
    writeResults({
      'content-integrity.json': mockContentIntegrityPass,
      'page-completeness.json': mockPageCompletenessPass,
      'visual-qa.json': mockQaResultPass,
      'live-site-audit.json': mockLiveSiteAuditPass,
      'original-vs-demo.json': mockOriginalVsDemoPass,
      'pdf-branding-check.json': mockPdfBrandingPass,
      'email-branding-check.json': mockEmailBrandingPass,
    });

    const result = generateAuditReport('test-reno', tmpDir);
    expect(result.markdown).toContain('## 1. Content Integrity');
    expect(result.markdown).toContain('## 2. Page Completeness');
    expect(result.markdown).toContain('## 3. Visual QA');
    expect(result.markdown).toContain('## 4. Live Site Audit');
    expect(result.markdown).toContain('## 5. Original vs Demo');
    expect(result.markdown).toContain('## 6. PDF Branding');
    expect(result.markdown).toContain('## 7. Email Branding');
    expect(result.markdown).toContain('## Human Review Checklist');
    expect(result.markdown).toContain('## Go-Live Verdict');
  });

  it('writes go-live-readiness.json with correct schema', () => {
    writeResults({
      'content-integrity.json': mockContentIntegrityPass,
      'visual-qa.json': mockQaResultPass,
      'page-completeness.json': mockPageCompletenessPass,
    });

    const result = generateAuditReport('test-reno', tmpDir);
    expect(existsSync(result.readinessPath)).toBe(true);

    const readiness = JSON.parse(readFileSync(result.readinessPath, 'utf-8'));
    expect(readiness.site_id).toBe('test-reno');
    expect(readiness.date).toBeTruthy();
    expect(['READY', 'REVIEW', 'NOT READY']).toContain(readiness.verdict);
    expect(readiness.human_review_required).toBe(true);
    expect(readiness.checks).toBeDefined();
    expect(readiness.checks.page_completeness).toBeDefined();
    expect(readiness.checks.page_completeness.passed).toBe(true);
    expect(readiness.checks.page_completeness.checks_passed).toBe(12);
    expect(readiness.checks.content_integrity).toBeDefined();
    expect(readiness.checks.visual_qa).toBeDefined();
  });

  it('reports warnings for page completeness failures', () => {
    writeResults({
      'page-completeness.json': mockPageCompletenessFail,
    });

    const result = generateAuditReport('test-reno', tmpDir);
    expect(result.verdict).toBe('REVIEW');
    expect(result.markdown).toContain('Page Completeness');
    expect(result.markdown).toContain('FAIL');
  });

  it('reports critical failure when homepage fails to load', () => {
    writeResults({
      'page-completeness.json': {
        passed: false,
        checks: [
          { page: '/', check: 'page_load', passed: false, detail: 'Homepage failed to load' },
        ],
        summary: { total_checks: 1, passed_count: 0, failed_count: 1, passed: false, failed_checks: ['/:page_load'] },
      },
    });

    const result = generateAuditReport('test-reno', tmpDir);
    expect(result.verdict).toBe('NOT READY');
    expect(result.markdown).toContain('Homepage failed to load');
  });

  it('includes human review checklist items', () => {
    const result = generateAuditReport('test-reno', tmpDir);
    expect(result.markdown).toContain('Logo renders correctly');
    expect(result.markdown).toContain('Email headers');
    expect(result.markdown).toContain('Colour contrast');
    expect(result.markdown).toContain('Quote numbers');
    expect(result.markdown).toContain('Original content');
  });

  it('reports critical failures for low match score', () => {
    writeResults({
      'original-vs-demo.json': { ...mockOriginalVsDemoFail, matchScore: 40 },
    });

    const result = generateAuditReport('test-reno', tmpDir);
    expect(result.verdict).toBe('NOT READY');
    expect(result.markdown).toContain('Low match score');
  });

  it('reports warnings for marginal match score', () => {
    writeResults({
      'original-vs-demo.json': { ...mockOriginalVsDemoPass, matchScore: 65 },
    });

    const result = generateAuditReport('test-reno', tmpDir);
    expect(result.verdict).toBe('REVIEW');
    expect(result.markdown).toContain('marginal');
  });

  it('reports critical failure for PDF branding issues', () => {
    writeResults({
      'pdf-branding-check.json': mockPdfBrandingFail,
    });

    const result = generateAuditReport('test-reno', tmpDir);
    expect(result.verdict).toBe('NOT READY');
    expect(result.markdown).toContain('PDF branding');
  });

  it('reports critical failure for email branding issues', () => {
    writeResults({
      'email-branding-check.json': mockEmailBrandingFail,
    });

    const result = generateAuditReport('test-reno', tmpDir);
    expect(result.verdict).toBe('NOT READY');
    expect(result.markdown).toContain('Email branding');
  });
});
