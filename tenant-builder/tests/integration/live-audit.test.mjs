import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { requireIntegrationEnv, TEST_SITE_ID, TEST_URL, TEST_TIER } from '../setup.mjs';

const OUTPUT_DIR = resolve(import.meta.dirname, '../../.test-tmp-live-audit');

describe('live-site-audit (integration)', () => {
  beforeAll(() => {
    requireIntegrationEnv();
    rmSync(OUTPUT_DIR, { recursive: true, force: true });
    mkdirSync(OUTPUT_DIR, { recursive: true });
  });

  it('produces valid result shape against real tenant', async () => {
    const { runLiveSiteAudit } = await import('../../qa/live-site-audit.mjs');
    const result = await runLiveSiteAudit(
      'https://redwhite.norbotsystems.com',
      'redwhitereno',
      { outputPath: OUTPUT_DIR, tier: 'accelerate' },
    );

    expect(result).toBeDefined();
    expect(typeof result.passed).toBe('boolean');
    expect(Array.isArray(result.checks)).toBe(true);
    expect(result.checks.length).toBe(8);
    expect(result.summary).toBeDefined();
    expect(result.summary.checks_run).toBe(8);
  }, 120000);

  it('checks all 8 audit categories', async () => {
    const resultPath = resolve(OUTPUT_DIR, 'live-site-audit.json');
    if (!existsSync(resultPath)) {
      // Run audit if not already done
      const { runLiveSiteAudit } = await import('../../qa/live-site-audit.mjs');
      await runLiveSiteAudit(
        'https://redwhite.norbotsystems.com',
        'redwhitereno',
        { outputPath: OUTPUT_DIR, tier: 'accelerate' },
      );
    }

    const result = JSON.parse(readFileSync(resultPath, 'utf-8'));
    const checkNames = result.checks.map(c => c.check);

    expect(checkNames).toContain('cross_page_branding');
    expect(checkNames).toContain('navigation_integrity');
    expect(checkNames).toContain('responsive_layout');
    expect(checkNames).toContain('wcag_contrast');
    expect(checkNames).toContain('seo_meta');
    expect(checkNames).toContain('image_performance');
    expect(checkNames).toContain('footer_consistency');
    expect(checkNames).toContain('admin_route_gating');
  }, 120000);

  it('writes result file to output directory', async () => {
    const resultPath = resolve(OUTPUT_DIR, 'live-site-audit.json');
    expect(existsSync(resultPath)).toBe(true);

    const result = JSON.parse(readFileSync(resultPath, 'utf-8'));
    expect(result.passed).toBeDefined();
    expect(result.summary.checks_passed).toBeLessThanOrEqual(result.summary.checks_run);
  });

  it('includes WCAG contrast data', async () => {
    const resultPath = resolve(OUTPUT_DIR, 'live-site-audit.json');
    if (!existsSync(resultPath)) return;

    const result = JSON.parse(readFileSync(resultPath, 'utf-8'));
    const wcag = result.checks.find(c => c.check === 'wcag_contrast');
    expect(wcag).toBeDefined();
    // WCAG check should have contrast ratio data
    if (wcag.contrast_white) {
      expect(typeof wcag.contrast_white).toBe('number');
      expect(wcag.contrast_white).toBeGreaterThan(1);
    }
  });
});
