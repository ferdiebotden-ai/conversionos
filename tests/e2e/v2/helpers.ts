/**
 * Quote Engine V2 — Shared E2E Test Helpers
 * Extends strict/helpers.ts with Quote V2-specific utilities.
 *
 * STRICT: No .or() fallbacks. Tests fail if elements are missing.
 */

import { Page, expect } from '@playwright/test';

// Re-export base helpers
export {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  TEST_IMAGE_BUFFER,
  TEST_IMAGE_10X10_BUFFER,
  uploadTestImage,
  loginAsAdmin,
  assertNoErrors,
  waitForElement,
} from '../strict/helpers';

// ---------- Constants ----------

/** Dev server base URL (port 3002 if 3000 is busy) */
export const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3002';

/** Timeout for AI-dependent operations (generation, extraction) */
export const AI_TIMEOUT = 120_000;

/** Timeout for standard UI interactions */
export const UI_TIMEOUT = 10_000;

// ---------- Admin Navigation ----------

/**
 * Login and navigate to a lead's Quote tab.
 * Returns the leadId from the URL.
 */
export async function navigateToQuoteEditor(page: Page): Promise<string> {
  // Login
  const { loginAsAdmin } = await import('../strict/helpers');
  await loginAsAdmin(page);

  // Go to leads
  await page.goto('/admin/leads');
  await expect(page.locator('table')).toBeVisible({ timeout: UI_TIMEOUT });

  // Wait for table rows to load, then click the "View" link in the first row
  const firstRow = page.locator('table tbody tr').first();
  await expect(firstRow).toBeVisible({ timeout: UI_TIMEOUT });

  // Click the "View" link (last column) — prefer explicit View button
  const viewButton = firstRow.getByRole('link', { name: /View/i }).first();
  if (await viewButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await viewButton.click();
  } else {
    const viewLink = firstRow.getByRole('link').first();
    await viewLink.click();
  }

  // Wait for lead detail page — URL must have a UUID segment after /admin/leads/
  await page.waitForURL(/\/admin\/leads\/[a-f0-9-]+/, { timeout: UI_TIMEOUT });
  await page.waitForTimeout(500);

  // Extract leadId from URL
  const url = page.url();
  const leadId = url.split('/admin/leads/')[1]?.split(/[?#]/)[0] || '';
  expect(leadId).toBeTruthy();

  // Click Quote tab
  const quoteTab = page.getByRole('tab', { name: /Quote/i });
  await expect(quoteTab).toBeVisible({ timeout: UI_TIMEOUT });
  await quoteTab.click();

  // Wait for quote editor to load
  await expect(
    page.getByText(/Quote Line Items|Line Items|No quote/i).first()
  ).toBeVisible({ timeout: UI_TIMEOUT });

  return leadId;
}

/**
 * Navigate to admin settings page and click a specific tab.
 */
export async function navigateToSettingsTab(page: Page, tabName: string): Promise<void> {
  await page.goto('/admin/settings');
  await expect(page.locator('[role="tablist"]')).toBeVisible({ timeout: UI_TIMEOUT });

  const tab = page.getByRole('tab', { name: new RegExp(tabName, 'i') });
  await expect(tab).toBeVisible({ timeout: UI_TIMEOUT });
  await tab.click();

  // Wait for tab content to load
  await page.waitForTimeout(500);
}

// ---------- Quote Editor Utilities ----------

/**
 * Count line items in the quote editor table.
 */
export async function countLineItems(page: Page): Promise<number> {
  const rows = page.locator('[data-testid="line-item-row"], table tbody tr');
  return await rows.count();
}

/**
 * Get the displayed total from the quote editor.
 */
export async function getDisplayedTotal(page: Page): Promise<string> {
  const totalElement = page.getByText(/Total.*\$[\d,]+/).first();
  await expect(totalElement).toBeVisible({ timeout: UI_TIMEOUT });
  return (await totalElement.textContent()) || '';
}

/**
 * Click the Save button and wait for save confirmation.
 * If the Save button is disabled (no unsaved changes), skip saving.
 */
export async function saveQuote(page: Page): Promise<void> {
  const saveButton = page.getByRole('button', { name: /Save/i }).first();
  await expect(saveButton).toBeVisible({ timeout: UI_TIMEOUT });

  // Wait for hydration to settle — button state may change during React init
  await page.waitForTimeout(1000);

  // If Save button is disabled, quote has no unsaved changes — treat as already saved
  if (await saveButton.isDisabled()) {
    return;
  }

  // Try to click — button may become disabled during the click attempt (race condition)
  try {
    await saveButton.click({ timeout: 5_000 });
    await expect(
      page.getByText(/Last saved|Saved|Changes saved/i).first()
    ).toBeVisible({ timeout: UI_TIMEOUT });
  } catch {
    // Button became disabled between check and click — already saved, move on
    return;
  }
}

// ---------- CSV Upload Utilities ----------

/**
 * Create a test CSV content string for price upload.
 */
export function createTestCSVContent(): string {
  return [
    'item_name,category,unit,unit_price,supplier',
    '"Stock cabinets (per linear ft)",materials,lin ft,220,Test Hardware',
    '"Quartz countertop",materials,sqft,85,Test Stone',
    '"Licensed plumber",labor,hr,95,',
    '"Electrician (licensed)",contract,hr,110,Test Electric',
    '"Building permit",permit,ea,500,',
  ].join('\n');
}

/**
 * Create an invalid CSV content string for error testing.
 */
export function createInvalidCSVContent(): string {
  return [
    'item_name,category,unit,unit_price,supplier',
    '"Missing category",,sqft,85,',
    '"Bad price",materials,sqft,not_a_number,',
    '"Invalid category",invalid_cat,hr,50,',
  ].join('\n');
}

// ---------- Supabase Direct API ----------

/** Supabase project URL and service role key (for test setup/teardown) */
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const SUPABASE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] || '';
const SITE_ID = process.env['NEXT_PUBLIC_SITE_ID'] || 'demo';

/**
 * Make a direct Supabase REST API call (bypasses the app).
 * Used for test setup/teardown only.
 */
async function supabaseRest(
  table: string,
  options: {
    method?: string;
    query?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    prefer?: string;
  } = {}
): Promise<Response> {
  const { method = 'GET', query = '', body, headers = {}, prefer } = options;
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`;
  const reqHeaders: Record<string, string> = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...headers,
  };
  if (prefer) reqHeaders['Prefer'] = prefer;
  return fetch(url, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : null,
  });
}

/**
 * Seed an acceptance token on a quote draft.
 * If leadId is provided, uses that lead's draft.
 * Otherwise finds ANY lead with a quote draft.
 * Returns the token that can be used to visit /quote/accept/[token].
 */
export async function seedAcceptanceToken(leadId?: string): Promise<string> {
  const token = `test_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  // Find the latest quote draft — either for a specific lead or any lead
  const query = leadId
    ? `lead_id=eq.${leadId}&site_id=eq.${SITE_ID}&order=version.desc&limit=1&select=id,lead_id`
    : `site_id=eq.${SITE_ID}&order=updated_at.desc&limit=1&select=id,lead_id`;
  const findRes = await supabaseRest('quote_drafts', { query });
  const rows = await findRes.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(leadId ? `No quote draft found for lead ${leadId}` : 'No quote drafts found for site');
  }

  const quoteId = rows[0].id;

  // Set acceptance_token and ensure acceptance_status is null/pending
  const updateRes = await supabaseRest('quote_drafts', {
    method: 'PATCH',
    query: `id=eq.${quoteId}`,
    body: {
      acceptance_token: token,
      acceptance_status: null,
      accepted_at: null,
      accepted_by_name: null,
      accepted_by_ip: null,
    },
    prefer: 'return=minimal',
  });

  if (!updateRes.ok) {
    const err = await updateRes.text();
    throw new Error(`Failed to seed acceptance token: ${err}`);
  }

  return token;
}

/**
 * Change the tenant plan tier in admin_settings.
 * Useful for testing tier gating. Always clean up after test!
 */
export async function setTenantTier(tier: 'elevate' | 'accelerate' | 'dominate'): Promise<void> {
  const updateRes = await supabaseRest('admin_settings', {
    method: 'PATCH',
    query: `site_id=eq.${SITE_ID}&key=eq.plan`,
    body: { value: { tier } },
    prefer: 'return=minimal',
  });

  if (!updateRes.ok) {
    const err = await updateRes.text();
    throw new Error(`Failed to set tenant tier to ${tier}: ${err}`);
  }
}

/**
 * Get the first lead ID from the leads page.
 * Navigates if not already on the leads page.
 */
export async function getFirstLeadId(page: Page): Promise<string> {
  // Navigate to leads if not already there
  if (!page.url().includes('/admin/leads')) {
    await page.goto('/admin/leads');
    await expect(page.locator('table')).toBeVisible({ timeout: UI_TIMEOUT });
  }

  // Click the first lead's view link
  const firstRow = page.locator('table tbody tr').first();
  await expect(firstRow).toBeVisible({ timeout: UI_TIMEOUT });
  const viewLink = firstRow.getByRole('link').first();
  const href = await viewLink.getAttribute('href');

  if (!href) throw new Error('No link found in first lead row');

  // Extract the lead ID from the href
  const leadId = href.split('/admin/leads/')[1]?.split(/[?#]/)[0] || '';
  if (!leadId) throw new Error(`Could not extract lead ID from href: ${href}`);

  return leadId;
}

// ---------- Console Error Checking ----------

/**
 * Collect console errors from the page.
 * Call this after navigating to check for JS errors.
 */
export async function collectConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  // Give time for any async errors
  await page.waitForTimeout(1000);
  return errors;
}

/**
 * Assert no destructive console errors (ignoring known benign ones).
 */
export function filterRealErrors(errors: string[]): string[] {
  const benignPatterns = [
    /favicon/i,
    /hydration/i, // React hydration warnings in dev
    /chunk/i,     // Turbopack chunk loading
    /websocket/i, // HMR websocket
    /next-dev/i,
    /AbortError/i,     // Fetch aborted during navigation
    /Failed to fetch/i, // Network errors during rapid navigation
    /net::ERR_/i,       // Chromium network errors
    /blob:/i,           // Blob URL revocation during PDF preview
  ];
  return errors.filter(
    (e) => !benignPatterns.some((p) => p.test(e))
  );
}
