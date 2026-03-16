import { test as base } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Tenant context fixture — reads scraped.json and exposes tenant data to tests.
 *
 * Set SCRAPED_JSON_PATH env var to the path of scraped.json.
 * Falls back to a sensible default path based on the results directory.
 */

export interface TenantContext {
  businessName: string;
  phone: string;
  email: string;
  services: Array<{ name: string; description?: string }>;
  primaryColour: string;
  siteId: string;
  /** Whether scraped data was loaded successfully */
  loaded: boolean;
}

function loadScrapedData(): TenantContext {
  const scrapedPath = process.env['SCRAPED_JSON_PATH'];

  if (!scrapedPath || !existsSync(scrapedPath)) {
    // Return defaults when no scraped data available
    return {
      businessName: '',
      phone: '',
      email: '',
      services: [],
      primaryColour: '',
      siteId: 'unknown',
      loaded: false,
    };
  }

  try {
    const raw = JSON.parse(readFileSync(resolve(scrapedPath), 'utf-8'));
    return {
      businessName: raw.business_name || raw.businessName || '',
      phone: raw.phone || '',
      email: raw.email || '',
      services: Array.isArray(raw.services) ? raw.services : [],
      primaryColour: raw.primary_color_hex || raw.primaryColorHex || raw.primaryColor || '',
      siteId: raw.site_id || raw.slug || 'unknown',
      loaded: true,
    };
  } catch {
    return {
      businessName: '',
      phone: '',
      email: '',
      services: [],
      primaryColour: '',
      siteId: 'unknown',
      loaded: false,
    };
  }
}

// Extend Playwright's base test with tenant context fixture
export const test = base.extend<{ tenant: TenantContext }>({
  tenant: async ({}, _use) => {
    const ctx = loadScrapedData();
    await _use(ctx);
  },
});

export { expect } from '@playwright/test';
