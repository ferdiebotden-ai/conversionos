import { describe, it, expect, afterAll } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateAuditReport } from '../../qa/audit-report.mjs';

const today = new Date().toISOString().slice(0, 10);
const baseDir = resolve(import.meta.dirname, `../../results/${today}`);

describe('audit-report (integration)', () => {
  const cleanDirs = [];

  afterAll(() => {
    for (const dir of cleanDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should generate a "complete" report when all checks pass', () => {
    const resultsDir = resolve(baseDir, 'audit-complete-test');
    mkdirSync(resultsDir, { recursive: true });
    cleanDirs.push(resultsDir);

    // Write passing content-integrity result
    writeFileSync(resolve(resultsDir, 'content-integrity.json'), JSON.stringify({
      passed: true,
      violations: [],
      summary: {
        site_id: 'test-pass',
        pages_checked: 4,
        demo_leakage: 0,
        broken_images: 0,
        demo_images: 0,
        empty_sections: 0,
        fabrication: 0,
        placeholder_text: 0,
        business_name: 0,
        copyright_format: 0,
        total_violations: 0,
        passed: true,
      },
    }));

    // Write passing visual-qa result
    writeFileSync(resolve(resultsDir, 'visual-qa.json'), JSON.stringify({
      logo_fidelity: 5,
      colour_match: 5,
      copy_accuracy: 4,
      layout_integrity: 5,
      brand_cohesion: 4,
      average: 4.6,
      pass: true,
      notes: 'Excellent rendering with strong brand cohesion.',
    }));

    const result = generateAuditReport('test-pass', resultsDir);

    expect(result.status).toBe('complete');
    expect(result.markdown).toContain('# Audit Report: test-pass');
    expect(result.markdown).toContain('COMPLETE');
    expect(result.markdown).toContain('4.6/5');

    // Content integrity table should show all PASS
    expect(result.markdown).toContain('PASS Clean');
    expect(result.markdown).not.toContain('WARN');

    // Report file should exist on disk
    expect(existsSync(resolve(resultsDir, 'audit-report.md'))).toBe(true);
  });

  it('should generate a "review" report when checks fail and include human checklist', () => {
    const resultsDir = resolve(baseDir, 'audit-review-test');
    mkdirSync(resultsDir, { recursive: true });
    cleanDirs.push(resultsDir);

    // Write failing content-integrity result
    writeFileSync(resolve(resultsDir, 'content-integrity.json'), JSON.stringify({
      passed: false,
      violations: [
        { check: 'demo_leakage', page: '/', leaked_string: '(226) 444-3478', context: 'Call: (226) 444-3478' },
        { check: 'broken_image', page: '/services', src: '/img/broken.png', status: 404 },
      ],
      summary: {
        site_id: 'test-fail',
        pages_checked: 4,
        demo_leakage: 1,
        broken_images: 1,
        demo_images: 0,
        empty_sections: 0,
        fabrication: 0,
        placeholder_text: 0,
        business_name: 0,
        copyright_format: 0,
        total_violations: 2,
        passed: false,
      },
    }));

    // Write failing visual-qa result
    writeFileSync(resolve(resultsDir, 'visual-qa.json'), JSON.stringify({
      logo_fidelity: 2,
      colour_match: 3,
      copy_accuracy: 4,
      layout_integrity: 4,
      brand_cohesion: 3,
      average: 3.2,
      pass: false,
      notes: 'Logo is broken, colours need adjustment.',
    }));

    const result = generateAuditReport('test-fail', resultsDir);

    expect(result.status).toBe('review');
    expect(result.markdown).toContain('NEEDS REVIEW');
    expect(result.markdown).toContain('3.2/5');

    // Should have violation details
    expect(result.markdown).toContain('demo leakage');
    expect(result.markdown).toContain('(226) 444-3478');
    expect(result.markdown).toContain('broken image');

    // Human review checklist must be present
    expect(result.markdown).toContain('Items for Human Review');
    expect(result.markdown).toContain('Logo quality');
    expect(result.markdown).toContain('Copy tone');
    expect(result.markdown).toContain('Hero image');
    expect(result.markdown).toContain('Overall brand feel');
    expect(result.markdown).toContain('Service accuracy');
  });

  it('should include all QA dimensions in the report', () => {
    const resultsDir = resolve(baseDir, 'audit-dims-test');
    mkdirSync(resultsDir, { recursive: true });
    cleanDirs.push(resultsDir);

    writeFileSync(resolve(resultsDir, 'content-integrity.json'), JSON.stringify({
      passed: true,
      violations: [],
      summary: {
        site_id: 'test-dims',
        pages_checked: 4,
        demo_leakage: 0,
        broken_images: 0,
        demo_images: 0,
        empty_sections: 0,
        fabrication: 0,
        placeholder_text: 0,
        business_name: 0,
        copyright_format: 0,
        total_violations: 0,
        passed: true,
      },
    }));

    writeFileSync(resolve(resultsDir, 'visual-qa.json'), JSON.stringify({
      logo_fidelity: 4,
      colour_match: 3,
      copy_accuracy: 5,
      layout_integrity: 4,
      brand_cohesion: 4,
      average: 4.0,
      pass: true,
      notes: 'Good overall.',
    }));

    // Write auto-fixes
    writeFileSync(resolve(resultsDir, 'auto-fixes.json'), JSON.stringify([
      { fix: 'Cleared fabricated trust_badges', success: true },
      { fix: 'Cleared trustMetrics (demo leakage)', success: true },
    ]));

    const result = generateAuditReport('test-dims', resultsDir);

    // All 5 visual QA dimensions should be present
    expect(result.markdown).toContain('logo fidelity');
    expect(result.markdown).toContain('colour match');
    expect(result.markdown).toContain('copy accuracy');
    expect(result.markdown).toContain('layout integrity');
    expect(result.markdown).toContain('brand cohesion');

    // Auto-fixes section should be present
    expect(result.markdown).toContain('Auto-Fixes Applied');
    expect(result.markdown).toContain('Cleared fabricated trust_badges');
    expect(result.markdown).toContain('Cleared trustMetrics');
  });
});
