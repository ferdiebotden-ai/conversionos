import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { requireIntegrationEnv } from '../setup.mjs';

const OUTPUT_DIR = resolve(import.meta.dirname, '../../.test-tmp-original-vs-demo');

// Known scraped data for Red White Reno (use actual scraped data if available)
const KNOWN_SCRAPED = {
  business_name: 'Red White Reno',
  phone: '519-878-1589',
  email: 'info@redwhitereno.com',
  services: [
    { name: 'Basement Renovations' },
    { name: 'Bathroom Renovations' },
    { name: 'Kitchen Renovations' },
  ],
  testimonials: [
    { author: 'Google Review' },
  ],
  primary_color_hex: '#D60000',
  logo_url: 'https://ktpfyangnmpwufghgasx.supabase.co/storage/v1/object/public/images/redwhitereno/logo.png',
};

describe('original-vs-demo (integration)', () => {
  beforeAll(() => {
    requireIntegrationEnv();
    rmSync(OUTPUT_DIR, { recursive: true, force: true });
    mkdirSync(OUTPUT_DIR, { recursive: true });
  });

  it('produces valid comparison against real tenant', async () => {
    const { runOriginalVsDemo } = await import('../../qa/original-vs-demo.mjs');
    const result = await runOriginalVsDemo(
      'https://redwhite.norbotsystems.com',
      KNOWN_SCRAPED,
      { outputPath: OUTPUT_DIR },
    );

    expect(result).toBeDefined();
    expect(typeof result.passed).toBe('boolean');
    expect(typeof result.matchScore).toBe('number');
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.matchScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.comparisons)).toBe(true);
  }, 120000);

  it('returns 7 comparison fields', async () => {
    const resultPath = resolve(OUTPUT_DIR, 'original-vs-demo.json');
    if (!existsSync(resultPath)) {
      const { runOriginalVsDemo } = await import('../../qa/original-vs-demo.mjs');
      await runOriginalVsDemo(
        'https://redwhite.norbotsystems.com',
        KNOWN_SCRAPED,
        { outputPath: OUTPUT_DIR },
      );
    }

    const result = JSON.parse(readFileSync(resultPath, 'utf-8'));
    expect(result.comparisons.length).toBe(7);

    const fields = result.comparisons.map(c => c.field);
    expect(fields).toContain('business_name');
    expect(fields).toContain('phone');
    expect(fields).toContain('email');
    expect(fields).toContain('service_count');
    expect(fields).toContain('testimonials');
    expect(fields).toContain('primary_colour');
    expect(fields).toContain('logo_presence');
  }, 120000);

  it('match score is in reasonable range for real tenant', async () => {
    const resultPath = resolve(OUTPUT_DIR, 'original-vs-demo.json');
    if (!existsSync(resultPath)) return;

    const result = JSON.parse(readFileSync(resultPath, 'utf-8'));
    // For a properly provisioned tenant, score should be at least moderate
    expect(result.matchScore).toBeGreaterThanOrEqual(40);
  });

  it('writes result file to output directory', async () => {
    const resultPath = resolve(OUTPUT_DIR, 'original-vs-demo.json');
    expect(existsSync(resultPath)).toBe(true);

    const result = JSON.parse(readFileSync(resultPath, 'utf-8'));
    expect(result.summary).toBeDefined();
    expect(result.summary.total_comparisons).toBe(7);
  });
});
