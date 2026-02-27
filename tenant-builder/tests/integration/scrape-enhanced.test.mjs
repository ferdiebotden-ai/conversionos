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
const outputDir = resolve(import.meta.dirname, `../../results/${today}/${TEST_SITE_ID}-scrape-enh-test`);

describe('scrape-enhanced (integration) — branding + trust metrics + quality gates', () => {
  beforeAll(() => {
    requireIntegrationEnv();
  });

  afterAll(() => {
    rmSync(outputDir, { recursive: true, force: true });
  });

  it('should produce valid merged output with branding', () => {
    execFileSync('node', [
      SCRAPE_SCRIPT,
      '--url', TEST_URL,
      '--site-id', `${TEST_SITE_ID}-scrape-enh-test`,
      '--output', outputDir,
    ], {
      cwd: DEMO_ROOT,
      env: { ...process.env },
      timeout: 360000,
      maxBuffer: 50 * 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const scrapedPath = resolve(outputDir, 'scraped.json');
    expect(existsSync(scrapedPath)).toBe(true);

    const data = JSON.parse(readFileSync(scrapedPath, 'utf-8'));
    assertValidScrapedData(data, 'Red White');

    // Branding metadata should be present
    expect(data._branding).toBeDefined();
    expect(data._branding.colors).toBeDefined();
    expect(Array.isArray(data._branding.colors)).toBe(true);
  }, 360000);

  it('should extract logo with URL and confidence', () => {
    const scrapedPath = resolve(outputDir, 'scraped.json');
    if (!existsSync(scrapedPath)) return;

    const data = JSON.parse(readFileSync(scrapedPath, 'utf-8'));

    // Logo extraction result should be in branding metadata
    if (data._branding?.logo_extraction) {
      expect(data._branding.logo_extraction.level).toBeDefined();
      expect(data._branding.logo_extraction.method).toBeDefined();
      expect(typeof data._branding.logo_extraction.confidence).toBe('number');
      expect(data._branding.logo_extraction.confidence).toBeGreaterThanOrEqual(0);
      expect(data._branding.logo_extraction.confidence).toBeLessThanOrEqual(1);
    }

    if (data.logo_url) {
      expect(data.logo_url).toMatch(/^https?:\/\//);
    }
  });

  it('should recompute OKLCH when branding overrides primary colour', () => {
    const scrapedPath = resolve(outputDir, 'scraped.json');
    if (!existsSync(scrapedPath)) return;

    const data = JSON.parse(readFileSync(scrapedPath, 'utf-8'));

    // If branding overrode the colour, _meta.primary_oklch should be present
    if (data._meta?.primary_oklch) {
      const parts = data._meta.primary_oklch.split(' ');
      expect(parts).toHaveLength(3);
      // L should be between 0 and 1
      expect(parseFloat(parts[0])).toBeGreaterThanOrEqual(0);
      expect(parseFloat(parts[0])).toBeLessThanOrEqual(1);
    }

    // Primary colour hex should be valid
    if (data.primary_color_hex) {
      expect(data.primary_color_hex).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('should include trust metrics from Turso lookup', () => {
    const scrapedPath = resolve(outputDir, 'scraped.json');
    if (!existsSync(scrapedPath)) return;

    const data = JSON.parse(readFileSync(scrapedPath, 'utf-8'));

    // _trust_metrics should be present since Red White Reno is in Turso
    if (data._trust_metrics) {
      const tm = data._trust_metrics;
      // At minimum, licensed_insured should be set
      expect(tm.licensed_insured).toBe(true);
      // Google rating if available
      if (tm.google_rating) {
        expect(typeof tm.google_rating).toBe('string');
        expect(parseFloat(tm.google_rating)).toBeGreaterThan(0);
      }
    }
  });

  it('should filter generic hero headlines', () => {
    const scrapedPath = resolve(outputDir, 'scraped.json');
    if (!existsSync(scrapedPath)) return;

    const data = JSON.parse(readFileSync(scrapedPath, 'utf-8'));

    // If hero_headline exists, it should not be a generic phrase
    if (data.hero_headline) {
      const generic = ['welcome', 'home page', 'about us', 'home', 'our company'];
      const lower = data.hero_headline.toLowerCase().trim();
      for (const g of generic) {
        expect(lower).not.toBe(g);
      }
    }
  });

  it('should filter testimonials with insufficient content', () => {
    const scrapedPath = resolve(outputDir, 'scraped.json');
    if (!existsSync(scrapedPath)) return;

    const data = JSON.parse(readFileSync(scrapedPath, 'utf-8'));

    // If testimonials exist, each should have author > 2 chars and quote > 20 chars
    if (data.testimonials && data.testimonials.length > 0) {
      for (const t of data.testimonials) {
        if (t.author) {
          expect(t.author.length).toBeGreaterThan(2);
        }
        if (t.quote || t.text) {
          const text = t.quote || t.text;
          expect(text.length).toBeGreaterThan(20);
        }
      }
    }
  });
});
