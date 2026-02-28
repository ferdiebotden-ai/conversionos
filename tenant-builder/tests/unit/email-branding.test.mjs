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

// Mock Supabase client
const mockIn = vi.fn();
const mockEq = vi.fn(() => ({ in: mockIn }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('../../lib/supabase-client.mjs', () => ({
  getSupabase: vi.fn(() => ({ from: mockFrom })),
}));

const { runEmailBrandingCheck } = await import('../../qa/email-branding-check.mjs');

// -- Test data --

const completeBrandingRows = [
  {
    key: 'business_info',
    value: {
      name: 'Test Reno Inc.',
      phone: '519-555-0100',
      email: 'info@testreno.com',
      city: 'London',
      province: 'Ontario',
      quotes_email: 'quotes@testreno.com',
      payment_email: 'pay@testreno.com',
    },
  },
  {
    key: 'branding',
    value: {
      colors: { primary_hex: '#2563eb' },
      logoUrl: 'https://example.com/logo.png',
    },
  },
  {
    key: 'company_profile',
    value: {
      logoUrl: 'https://example.com/logo.png',
    },
  },
];

function setupMock(rows) {
  mockIn.mockResolvedValue({ data: rows, error: null });
}

describe('email-branding-check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes with complete branding data and clean templates', async () => {
    setupMock(completeBrandingRows);
    const result = await runEmailBrandingCheck('test-reno');

    expect(result.summary.has_data).toBe(true);
    expect(result.summary.templates_scanned).toBeGreaterThanOrEqual(1);
  });

  it('fails when no branding data exists', async () => {
    setupMock([]);
    const result = await runEmailBrandingCheck('missing-tenant');

    expect(result.passed).toBe(false);
    expect(result.violations[0].check).toBe('no_branding_data');
  });

  it('detects missing required email fields', async () => {
    const incompleteRows = [
      {
        key: 'business_info',
        value: { name: '', phone: '', email: '' },
      },
      { key: 'branding', value: { colors: {} } },
      { key: 'company_profile', value: {} },
    ];
    setupMock(incompleteRows);
    const result = await runEmailBrandingCheck('incomplete-tenant');

    expect(result.passed).toBe(false);
    const missingFields = result.violations.filter(v => v.check === 'missing_field');
    expect(missingFields.length).toBeGreaterThanOrEqual(3);
  });

  it('detects demo leakage in branding data', async () => {
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
    const result = await runEmailBrandingCheck('demo-leaked');

    const leakage = result.violations.filter(v => v.check === 'demo_leakage_in_data');
    expect(leakage.length).toBeGreaterThan(0);
  });

  it('scans email template sources for anti-patterns', async () => {
    // This test runs against actual template files -- verifies the source scan works
    setupMock(completeBrandingRows);
    const result = await runEmailBrandingCheck('test-reno');

    // The source scan should have run (templates_scanned > 0)
    expect(result.summary.templates_scanned).toBeGreaterThanOrEqual(1);

    // If any template source has anti-patterns, they should be detected
    const sourceViolations = result.violations.filter(v => v.check === 'source_anti_pattern');
    // After Phase 0 fixes, there should be no anti-patterns in templates
    // (If this fails, it means a Phase 0 fix regressed)
    expect(sourceViolations.length).toBe(0);
  });

  it('verifies outreach template CASL compliance', async () => {
    setupMock(completeBrandingRows);
    const result = await runEmailBrandingCheck('test-reno');

    // Outreach template should be scanned
    expect(result.summary.outreach_scanned).toBe(true);

    // No outreach CASL violations (the template should have STOP, business name, address)
    const caslViolations = result.violations.filter(v =>
      v.check === 'outreach_missing_casl_unsubscribe' ||
      v.check === 'outreach_missing_business_name' ||
      v.check === 'outreach_missing_address'
    );
    expect(caslViolations.length).toBe(0);
  });

  it('flags missing quotes_email as warning', async () => {
    const noQuotesEmail = [
      {
        key: 'business_info',
        value: {
          name: 'Test Reno',
          phone: '519-555-0100',
          email: 'info@testreno.com',
          city: 'London',
          province: 'Ontario',
        },
      },
      {
        key: 'branding',
        value: { colors: { primary_hex: '#2563eb' } },
      },
      { key: 'company_profile', value: {} },
    ];
    setupMock(noQuotesEmail);
    const result = await runEmailBrandingCheck('no-quotes-email');

    const quotesWarning = result.violations.find(v => v.check === 'missing_quotes_email');
    expect(quotesWarning).toBeDefined();
    expect(quotesWarning.severity).toBe('warning');
  });

  it('writes result file when outputPath provided', async () => {
    const { mkdirSync, existsSync, rmSync } = await import('node:fs');
    const { resolve } = await import('node:path');

    const tmpDir = resolve(import.meta.dirname, '../../.test-tmp-email-branding');
    rmSync(tmpDir, { recursive: true, force: true });

    setupMock(completeBrandingRows);
    const result = await runEmailBrandingCheck('test-reno', { outputPath: tmpDir });

    expect(result.summary.has_data).toBe(true);
    expect(existsSync(resolve(tmpDir, 'email-branding-check.json'))).toBe(true);

    rmSync(tmpDir, { recursive: true, force: true });
  });
});
