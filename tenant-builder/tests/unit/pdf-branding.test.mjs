import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies before importing the module under test
vi.mock('../../lib/env-loader.mjs', () => ({
  loadEnv: vi.fn(),
}));

vi.mock('../../lib/logger.mjs', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// Mock Supabase client -- will be configured per test
const mockIn = vi.fn();
const mockEq = vi.fn(() => ({ in: mockIn }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('../../lib/supabase-client.mjs', () => ({
  getSupabase: vi.fn(() => ({ from: mockFrom })),
}));

// Mock global fetch for logo accessibility checks
const originalFetch = globalThis.fetch;
globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200 }));

const { runPdfBrandingCheck } = await import('../../qa/pdf-branding-check.mjs');

// -- Test data --

const completeBrandingRows = [
  {
    key: 'business_info',
    value: {
      name: 'Test Reno Inc.',
      phone: '519-555-0100',
      email: 'info@testreno.com',
      website: 'https://testreno.com',
      city: 'London',
      province: 'Ontario',
      address: '123 Main St',
      postal: 'N6A 1A1',
      payment_email: 'pay@testreno.com',
      quotes_email: 'quotes@testreno.com',
    },
  },
  {
    key: 'branding',
    value: {
      colors: { primary_hex: '#2563eb', primary_oklch: '0.588 0.108 180' },
      logoUrl: 'https://example.com/logo.png',
      tagline: 'Your Renovation Experts',
    },
  },
  {
    key: 'company_profile',
    value: {
      logoUrl: 'https://example.com/logo.png',
      services: ['Kitchen', 'Bathroom'],
    },
  },
];

function setupMock(rows) {
  mockIn.mockResolvedValue({ data: rows, error: null });
}

describe('pdf-branding-check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes with complete branding data', async () => {
    setupMock(completeBrandingRows);
    const result = await runPdfBrandingCheck('test-reno');

    expect(result.passed).toBe(true);
    expect(result.summary.has_data).toBe(true);
    expect(result.summary.has_primary_colour).toBe(true);
    expect(result.summary.critical_violations).toBe(0);
  });

  it('fails when no branding data exists', async () => {
    setupMock([]);
    const result = await runPdfBrandingCheck('missing-tenant');

    expect(result.passed).toBe(false);
    expect(result.violations[0].check).toBe('no_branding_data');
  });

  it('detects missing required fields', async () => {
    const incompleteRows = [
      {
        key: 'business_info',
        value: { name: '', phone: '', email: '' },
      },
      { key: 'branding', value: { colors: {} } },
      { key: 'company_profile', value: {} },
    ];
    setupMock(incompleteRows);
    const result = await runPdfBrandingCheck('incomplete-tenant');

    expect(result.passed).toBe(false);
    const missingFields = result.violations.filter(v => v.check === 'missing_field');
    expect(missingFields.length).toBeGreaterThanOrEqual(4);
  });

  it('detects demo leakage patterns', async () => {
    const demoRows = [
      {
        key: 'business_info',
        value: {
          name: 'ConversionOS Demo',
          phone: '(226) 444-3478',
          email: 'ferdie@norbotsystems.com',
          city: 'Stratford',
          province: 'Ontario',
        },
      },
      {
        key: 'branding',
        value: { colors: { primary_hex: '#2563eb' } },
      },
      { key: 'company_profile', value: {} },
    ];
    setupMock(demoRows);
    const result = await runPdfBrandingCheck('demo-leaked');

    const leakage = result.violations.filter(v => v.check === 'demo_leakage');
    expect(leakage.length).toBeGreaterThan(0);
  });

  it('flags invalid colour format', async () => {
    const badColourRows = [...completeBrandingRows];
    badColourRows[1] = {
      key: 'branding',
      value: {
        colors: { primary_hex: 'not-a-hex', primary_oklch: 'invalid' },
        logoUrl: 'https://example.com/logo.png',
      },
    };
    setupMock(badColourRows);
    const result = await runPdfBrandingCheck('bad-colour');

    const colourViolation = result.violations.find(v => v.check === 'invalid_colour_format');
    expect(colourViolation).toBeDefined();
    expect(colourViolation.severity).toBe('critical');
  });

  it('notes SVG logo as info-level (not blocking)', async () => {
    const svgRows = [...completeBrandingRows];
    svgRows[1] = {
      key: 'branding',
      value: {
        colors: { primary_hex: '#2563eb' },
        logoUrl: 'https://example.com/logo.svg',
      },
    };
    svgRows[2] = {
      key: 'company_profile',
      value: { logoUrl: 'https://example.com/logo.svg' },
    };
    setupMock(svgRows);
    const result = await runPdfBrandingCheck('svg-logo');

    const svgNote = result.violations.find(v => v.check === 'logo_svg');
    expect(svgNote).toBeDefined();
    expect(svgNote.severity).toBe('info');
    // SVG is noted but doesn't cause failure
    expect(result.summary.logo_is_svg).toBe(true);
  });

  it('writes result file when outputPath provided', async () => {
    const { mkdirSync, existsSync, rmSync } = await import('node:fs');
    const { resolve } = await import('node:path');

    const tmpDir = resolve(import.meta.dirname, '../../.test-tmp-pdf-branding');
    rmSync(tmpDir, { recursive: true, force: true });

    setupMock(completeBrandingRows);
    const result = await runPdfBrandingCheck('test-reno', { outputPath: tmpDir });

    expect(result.passed).toBe(true);
    expect(existsSync(resolve(tmpDir, 'pdf-branding-check.json'))).toBe(true);

    rmSync(tmpDir, { recursive: true, force: true });
  });
});
