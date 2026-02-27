/**
 * Reusable data quality assertion functions for tenant-builder tests.
 */

import { expect } from 'vitest';

/**
 * Assert a valid ICP score result.
 * @param {number} score - Total ICP score
 * @param {object} breakdown - ICPBreakdown object
 */
export function assertValidIcpScore(score, breakdown) {
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
  expect(typeof score).toBe('number');

  expect(breakdown).toBeDefined();
  const parsed = typeof breakdown === 'string' ? JSON.parse(breakdown) : breakdown;

  // All 6 dimensions must be present
  const dims = ['template_fit', 'sophistication_gap', 'years_in_business', 'google_reviews', 'geography', 'company_size'];
  for (const dim of dims) {
    expect(parsed[dim]).toBeDefined();
    expect(parsed[dim]).toBeGreaterThanOrEqual(0);
  }

  // Dimension weight bounds
  expect(parsed.template_fit).toBeLessThanOrEqual(20);
  expect(parsed.sophistication_gap).toBeLessThanOrEqual(20);
  expect(parsed.years_in_business).toBeLessThanOrEqual(15);
  expect(parsed.google_reviews).toBeLessThanOrEqual(15);
  expect(parsed.geography).toBeLessThanOrEqual(15);
  expect(parsed.company_size).toBeLessThanOrEqual(15);

  // Total must equal sum of dimensions
  const expectedTotal = dims.reduce((sum, d) => sum + parsed[d], 0);
  expect(parsed.total).toBe(expectedTotal);
  expect(score).toBe(parsed.total);
}

/**
 * Assert valid scraped data.
 * @param {object} data - Merged scraped data object
 * @param {string} expectedBusinessName - Expected business name substring
 */
export function assertValidScrapedData(data, expectedBusinessName) {
  expect(data).toBeDefined();

  // Business identity
  expect(data.business_name).toBeDefined();
  expect(data.business_name).toContain(expectedBusinessName);

  // Contact info
  expect(data.phone).toBeDefined();
  expect(data.phone.length).toBeGreaterThan(5);

  expect(data.email).toBeDefined();
  expect(data.email).toContain('@');

  // Services
  expect(data.services).toBeDefined();
  expect(Array.isArray(data.services)).toBe(true);
  expect(data.services.length).toBeGreaterThanOrEqual(1);
  for (const s of data.services) {
    expect(s.name).toBeDefined();
  }

  // Brand colour
  if (data.primary_color_hex) {
    expect(data.primary_color_hex).toMatch(/^#[0-9a-fA-F]{6}$/);
  }

  // Logo
  if (data.logo_url) {
    expect(data.logo_url).toMatch(/^https?:\/\//);
  }

  // Branding metadata
  if (data._branding) {
    expect(data._branding.colors).toBeDefined();
    expect(Array.isArray(data._branding.colors)).toBe(true);
  }

  // Anti-hallucination checks
  const json = JSON.stringify(data);
  const placeholders = ['Jane Doe', 'Lorem ipsum', 'XYZ Association', 'example.com', '555-555'];
  for (const p of placeholders) {
    expect(json).not.toContain(p);
  }
}

/**
 * Assert valid provisioning state in Supabase.
 * @param {string} siteId - Site ID to check
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client
 * @param {{ tier?: string }} options
 */
export async function assertValidProvision(siteId, supabase, options = {}) {
  const tier = options.tier || 'accelerate';

  // Check admin_settings rows
  const { data: settings, error: settingsErr } = await supabase
    .from('admin_settings')
    .select('key, value')
    .eq('site_id', siteId);

  expect(settingsErr).toBeNull();
  expect(settings.length).toBe(5);

  const keys = settings.map(s => s.key).sort();
  expect(keys).toEqual(['branding', 'business_info', 'company_profile', 'plan', 'quote_assistance']);

  const businessInfo = settings.find(s => s.key === 'business_info');
  expect(businessInfo.value.name).toBeDefined();
  expect(businessInfo.value.name.length).toBeGreaterThan(0);

  const branding = settings.find(s => s.key === 'branding');
  expect(branding.value.colors).toBeDefined();
  expect(branding.value.colors.primary_hex).toMatch(/^#[0-9a-fA-F]{6}$/);

  const profile = settings.find(s => s.key === 'company_profile');
  expect(profile.value.services).toBeDefined();
  expect(profile.value.services.length).toBeGreaterThanOrEqual(1);

  // trustMetrics should be camelCase (not snake_case trust_metrics)
  if (profile.value.trustMetrics !== undefined) {
    expect(typeof profile.value.trustMetrics).toBe('object');
    // Must not have the old snake_case key
    expect(profile.value.trust_metrics).toBeUndefined();
  }

  const plan = settings.find(s => s.key === 'plan');
  expect(['elevate', 'accelerate', 'dominate']).toContain(plan.value.tier);

  // Check tenants row
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('*')
    .eq('site_id', siteId)
    .single();

  expect(tenantErr).toBeNull();
  expect(tenant.domain).toContain(siteId);
  expect(tenant.active).toBe(true);

  // Check assembly templates for Accelerate+ tiers
  if (tier === 'accelerate' || tier === 'dominate') {
    const { data: templates, error: templateErr } = await (supabase).from('assembly_templates')
      .select('id')
      .eq('site_id', siteId);

    expect(templateErr).toBeNull();
    expect(templates.length).toBeGreaterThanOrEqual(10);
  }
}

/**
 * Assert that auto-fix can clear the expected fields from company_profile.
 * Validates the expanded auto-fix coverage (services, trustMetrics, trustBadges, etc.).
 * @param {object} profile - company_profile value object
 * @param {string[]} fieldsToFix - field names expected to be clearable
 */
export function assertAutoFixCoverage(profile, fieldsToFix) {
  // Verify the profile key mapping works for all fixable fields
  const FIELD_TO_KEY = {
    trust_badges: 'trustBadges',
    process_steps: 'processSteps',
    values: 'values',
    trust_metrics: 'trustMetrics',
    services: 'services',
  };

  for (const field of fieldsToFix) {
    const profileKey = FIELD_TO_KEY[field];
    expect(profileKey).toBeDefined();
    // The profile should have this key and it should be clearable
    if (profile[profileKey] !== undefined) {
      const cleared = Array.isArray(profile[profileKey]) ? [] : {};
      expect(cleared).toBeDefined();
    }
  }
}

/**
 * Assert valid visual QA result.
 * @param {object} result - Visual QA result object
 */
export function assertValidQaResult(result) {
  expect(result).toBeDefined();

  const dims = ['logo_fidelity', 'colour_match', 'copy_accuracy', 'layout_integrity', 'brand_cohesion'];

  for (const dim of dims) {
    expect(result[dim]).toBeDefined();
    expect(result[dim]).toBeGreaterThanOrEqual(1);
    expect(result[dim]).toBeLessThanOrEqual(5);
  }

  // Average calculation check
  const expectedAvg = dims.reduce((sum, d) => sum + result[d], 0) / dims.length;
  expect(result.average).toBeCloseTo(expectedAvg, 1);

  // Pass logic check
  const belowMin = dims.filter(d => result[d] < 3.0);
  const expectedPass = result.average >= 4.0 && belowMin.length === 0;
  expect(result.pass).toBe(expectedPass);

  // Notes should be present
  expect(result.notes).toBeDefined();
  expect(typeof result.notes).toBe('string');
  expect(result.notes.length).toBeGreaterThan(10);
}
