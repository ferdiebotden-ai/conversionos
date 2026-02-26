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

  // Click first lead's "View" link
  const firstRow = page.locator('table tbody tr').first();
  await expect(firstRow).toBeVisible({ timeout: UI_TIMEOUT });
  const viewLink = firstRow.getByRole('link').first();
  await viewLink.click();

  // Wait for lead detail to load
  await page.waitForURL(/\/admin\/leads\//, { timeout: UI_TIMEOUT });

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
 */
export async function saveQuote(page: Page): Promise<void> {
  const saveButton = page.getByRole('button', { name: /Save/i }).first();
  await expect(saveButton).toBeVisible({ timeout: UI_TIMEOUT });
  await saveButton.click();

  // Wait for save indicator
  await expect(
    page.getByText(/Last saved|Saved|Changes saved/i).first()
  ).toBeVisible({ timeout: UI_TIMEOUT });
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
  ];
  return errors.filter(
    (e) => !benignPatterns.some((p) => p.test(e))
  );
}
