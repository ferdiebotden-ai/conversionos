/**
 * Unit tests for scraper enhancements:
 * - OKLCH recomputation after branding-v2 override
 * - Trust metrics extraction shape
 * - Social links format normalization
 */

import { describe, it, expect } from 'vitest';
import { hexToOklch } from '../../../scripts/onboarding/convert-color.mjs';

// Path alias not available in vitest for .mjs — test the actual convert function

describe('hexToOklch (colour conversion)', () => {
  it('converts a known red hex to OKLCH', () => {
    const result = hexToOklch('#D60000');
    expect(typeof result).toBe('string');
    const parts = result.split(' ');
    expect(parts).toHaveLength(3);
    // L should be between 0 and 1
    expect(parseFloat(parts[0])).toBeGreaterThan(0);
    expect(parseFloat(parts[0])).toBeLessThanOrEqual(1);
    // C should be >= 0
    expect(parseFloat(parts[1])).toBeGreaterThanOrEqual(0);
    // H should be a number
    expect(Number.isFinite(parseInt(parts[2]))).toBe(true);
  });

  it('converts teal correctly', () => {
    const result = hexToOklch('#0D9488');
    expect(typeof result).toBe('string');
    const [l, c, h] = result.split(' ').map(Number);
    expect(l).toBeGreaterThan(0.4);
    expect(l).toBeLessThan(0.7);
    expect(c).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(150); // teal is around 180°
    expect(h).toBeLessThan(200);
  });

  it('converts blue correctly', () => {
    const result = hexToOklch('#1565C0');
    const [l, c, h] = result.split(' ').map(Number);
    expect(h).toBeGreaterThan(230);
    expect(h).toBeLessThan(280);
  });

  it('converts white to high lightness', () => {
    const result = hexToOklch('#FFFFFF');
    const [l] = result.split(' ').map(Number);
    expect(l).toBeCloseTo(1.0, 1);
  });

  it('converts black to low lightness', () => {
    const result = hexToOklch('#000000');
    const [l] = result.split(' ').map(Number);
    expect(l).toBeCloseTo(0.0, 1);
  });

  it('throws on invalid hex', () => {
    expect(() => hexToOklch('notahex')).toThrow();
    expect(() => hexToOklch('')).toThrow();
  });

  it('handles 3-char hex shorthand', () => {
    // culori should handle #F00 = #FF0000
    const result = hexToOklch('#F00');
    expect(typeof result).toBe('string');
    const parts = result.split(' ');
    expect(parts).toHaveLength(3);
  });

  it('produces consistent results for same input', () => {
    const a = hexToOklch('#2563EB');
    const b = hexToOklch('#2563EB');
    expect(a).toBe(b);
  });
});

describe('OKLCH recomputation logic (scrape-enhanced merge)', () => {
  it('recomputes OKLCH when branding overrides primary colour', () => {
    // Simulates the merge logic in scrape-enhanced.mjs
    const scraped = {
      primary_color_hex: '#1565C0',
      _meta: { primary_oklch: '0.45 0.18 250' },
    };
    const branding = {
      colors: [{ hex: '#D60000', role: 'primary' }],
    };

    const merged = { ...scraped };
    const primary = branding.colors.find(c => c.role === 'primary');
    if (primary?.hex) {
      merged.primary_color_hex = primary.hex;
      if (!merged._meta) merged._meta = {};
      merged._meta.primary_oklch = hexToOklch(primary.hex);
    }

    expect(merged.primary_color_hex).toBe('#D60000');
    // OKLCH should be different from the original
    expect(merged._meta.primary_oklch).not.toBe('0.45 0.18 250');
    // Should be a valid OKLCH string
    const parts = merged._meta.primary_oklch.split(' ');
    expect(parts).toHaveLength(3);
  });

  it('does NOT recompute if no branding primary colour', () => {
    const scraped = {
      primary_color_hex: '#1565C0',
      _meta: { primary_oklch: '0.45 0.18 250' },
    };
    const branding = { colors: [] };

    const merged = { ...scraped };
    const primary = branding.colors?.find(c => c.role === 'primary');
    if (primary?.hex) {
      merged._meta.primary_oklch = hexToOklch(primary.hex);
    }

    expect(merged._meta.primary_oklch).toBe('0.45 0.18 250');
  });

  it('creates _meta if missing', () => {
    const scraped = { primary_color_hex: '#1565C0' };
    const branding = { colors: [{ hex: '#FF5500', role: 'primary' }] };

    const merged = { ...scraped };
    const primary = branding.colors.find(c => c.role === 'primary');
    if (primary?.hex) {
      merged.primary_color_hex = primary.hex;
      if (!merged._meta) merged._meta = {};
      merged._meta.primary_oklch = hexToOklch(primary.hex);
    }

    expect(merged._meta).toBeDefined();
    expect(merged._meta.primary_oklch).toBeDefined();
    expect(typeof merged._meta.primary_oklch).toBe('string');
  });
});

describe('trust metrics shape', () => {
  it('has correct shape when all fields present', () => {
    const metrics = {
      google_rating: '4.6',
      projects_completed: '32+ Reviews',
      years_in_business: '5',
      licensed_insured: true,
    };

    expect(typeof metrics.google_rating).toBe('string');
    expect(typeof metrics.projects_completed).toBe('string');
    expect(typeof metrics.years_in_business).toBe('string');
    expect(typeof metrics.licensed_insured).toBe('boolean');
  });

  it('can be constructed from Turso target row', () => {
    const row = {
      google_rating: 4.6,
      google_review_count: 32,
      years_in_business: 5,
    };

    const trustMetrics = {};
    if (row.google_rating) trustMetrics.google_rating = String(row.google_rating);
    if (row.google_review_count) trustMetrics.projects_completed = `${row.google_review_count}+ Reviews`;
    if (row.years_in_business) trustMetrics.years_in_business = String(row.years_in_business);
    trustMetrics.licensed_insured = true;

    expect(trustMetrics.google_rating).toBe('4.6');
    expect(trustMetrics.projects_completed).toBe('32+ Reviews');
    expect(trustMetrics.years_in_business).toBe('5');
    expect(trustMetrics.licensed_insured).toBe(true);
  });

  it('computes years_in_business from founded_year fallback', () => {
    const row = { google_rating: 4.6, google_review_count: null, years_in_business: null };
    const foundedYear = 2020;

    const trustMetrics = {};
    if (row.google_rating) trustMetrics.google_rating = String(row.google_rating);
    const yib = row.years_in_business || (foundedYear ? new Date().getFullYear() - foundedYear : null);
    if (yib && yib > 0) trustMetrics.years_in_business = String(yib);

    expect(Number(trustMetrics.years_in_business)).toBeGreaterThanOrEqual(5);
  });

  it('omits fields when data is missing', () => {
    const row = { google_rating: null, google_review_count: null, years_in_business: null };

    const trustMetrics = {};
    if (row.google_rating) trustMetrics.google_rating = String(row.google_rating);
    if (row.google_review_count) trustMetrics.projects_completed = `${row.google_review_count}+ Reviews`;
    if (row.years_in_business) trustMetrics.years_in_business = String(row.years_in_business);

    expect(trustMetrics.google_rating).toBeUndefined();
    expect(trustMetrics.projects_completed).toBeUndefined();
    expect(trustMetrics.years_in_business).toBeUndefined();
  });
});

describe('social links format normalization', () => {
  it('handles {platform, url} format (expected shape)', () => {
    const socials = [
      { platform: 'Facebook', url: 'https://facebook.com/test' },
      { platform: 'Instagram', url: 'https://instagram.com/test' },
    ];
    const normalized = socials.map(s => ({
      platform: s['platform'] || s['label'] || '',
      url: s['url'] || s['href'] || '',
    }));

    expect(normalized[0].platform).toBe('Facebook');
    expect(normalized[0].url).toBe('https://facebook.com/test');
  });

  it('handles {label, href} format (provisioner writes this)', () => {
    const socials = [
      { label: 'Facebook', href: 'https://facebook.com/test' },
      { label: 'Instagram', href: 'https://instagram.com/test' },
    ];
    const normalized = socials.map(s => ({
      platform: s['platform'] || s['label'] || '',
      url: s['url'] || s['href'] || '',
    }));

    expect(normalized[0].platform).toBe('Facebook');
    expect(normalized[0].url).toBe('https://facebook.com/test');
  });

  it('handles mixed format array', () => {
    const socials = [
      { platform: 'Facebook', url: 'https://facebook.com/test' },
      { label: 'Instagram', href: 'https://instagram.com/test' },
    ];
    const normalized = socials.map(s => ({
      platform: s['platform'] || s['label'] || '',
      url: s['url'] || s['href'] || '',
    }));

    expect(normalized[0].platform).toBe('Facebook');
    expect(normalized[1].platform).toBe('Instagram');
    expect(normalized[1].url).toBe('https://instagram.com/test');
  });

  it('handles empty socials array', () => {
    const normalized = [].map(s => ({
      platform: s['platform'] || s['label'] || '',
      url: s['url'] || s['href'] || '',
    }));
    expect(normalized).toHaveLength(0);
  });

  it('handles entries with no platform or label', () => {
    const socials = [{ url: 'https://facebook.com/test' }];
    const normalized = socials.map(s => ({
      platform: s['platform'] || s['label'] || '',
      url: s['url'] || s['href'] || '',
    }));
    expect(normalized[0].platform).toBe('');
    expect(normalized[0].url).toBe('https://facebook.com/test');
  });

  it('prefers platform over label when both exist', () => {
    const socials = [{ platform: 'Official', label: 'Fallback', url: 'https://test.com' }];
    const normalized = socials.map(s => ({
      platform: s['platform'] || s['label'] || '',
      url: s['url'] || s['href'] || '',
    }));
    expect(normalized[0].platform).toBe('Official');
  });
});
