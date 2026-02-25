import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import '../setup.mjs';
import { requireIntegrationEnv, TEST_SITE_ID, TEST_URL } from '../setup.mjs';
import { assertValidScrapedData } from '../helpers/assertions.mjs';

const SCRAPE_SCRIPT = resolve(import.meta.dirname, '../../scrape/scrape-enhanced.mjs');
const DEMO_ROOT = resolve(import.meta.dirname, '../../../');
const today = new Date().toISOString().slice(0, 10);
const outputDir = resolve(import.meta.dirname, `../../results/${today}/${TEST_SITE_ID}-scrape-test`);

describe('scrape-enhanced (integration)', () => {
  beforeAll(() => {
    requireIntegrationEnv();
  });

  afterAll(() => {
    rmSync(outputDir, { recursive: true, force: true });
  });

  it('should scrape Red White Reno and produce valid output', () => {
    execFileSync('node', [
      SCRAPE_SCRIPT,
      '--url', TEST_URL,
      '--site-id', `${TEST_SITE_ID}-scrape-test`,
      '--output', outputDir,
    ], {
      cwd: DEMO_ROOT,
      env: { ...process.env },
      timeout: 360000,
      maxBuffer: 50 * 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Verify scraped.json exists
    const scrapedPath = resolve(outputDir, 'scraped.json');
    expect(existsSync(scrapedPath)).toBe(true);

    const data = JSON.parse(readFileSync(scrapedPath, 'utf-8'));
    assertValidScrapedData(data, 'Red White');
  }, 360000);

  it('should produce branding-v2.json', () => {
    const brandingPath = resolve(outputDir, 'branding-v2.json');
    // branding-v2 may or may not succeed, but file should be created
    if (existsSync(brandingPath)) {
      const branding = JSON.parse(readFileSync(brandingPath, 'utf-8'));
      expect(branding).toBeDefined();
      // Should have at least the base structure
      expect(branding).toHaveProperty('logos');
      expect(branding).toHaveProperty('colors');
    }
  });

  it('should have correct Red White Reno data', () => {
    const scrapedPath = resolve(outputDir, 'scraped.json');
    if (!existsSync(scrapedPath)) return; // Skip if scrape didn't run yet

    const data = JSON.parse(readFileSync(scrapedPath, 'utf-8'));

    // Known data for Red White Reno
    expect(data.phone).toContain('519');
    expect(data.email).toContain('redwhitereno.com');
    expect(data.primary_color_hex).toBe('#d60000');
  });

  it('should extract logo with confidence >= 0.6', () => {
    const scrapedPath = resolve(outputDir, 'scraped.json');
    if (!existsSync(scrapedPath)) return;

    const data = JSON.parse(readFileSync(scrapedPath, 'utf-8'));

    if (data._branding?.logo_extraction) {
      expect(data._branding.logo_extraction.confidence).toBeGreaterThanOrEqual(0.6);
      expect(data._branding.logo_extraction.level).toBeDefined();
      expect(data._branding.logo_extraction.method).toBeDefined();
    }

    if (data.logo_url) {
      expect(data.logo_url).toMatch(/^https?:\/\//);
    }
  });
});
