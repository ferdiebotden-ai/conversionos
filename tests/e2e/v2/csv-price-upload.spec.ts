/**
 * CSV Price Upload (F9) — E2E Tests
 * Tests the contractor price list upload flow:
 *   - Upload zone visibility
 *   - Valid CSV upload with preview
 *   - Confirm import + success count
 *   - Current price list table
 *   - Second upload replaces
 *   - Clear all prices
 *   - Error cases: empty CSV, malformed headers, invalid rows
 *   - API-level entitlement gating
 */

import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  createTestCSVContent,
  createInvalidCSVContent,
  navigateToSettingsTab,
  UI_TIMEOUT,
} from './helpers';

test.use({ baseURL: 'http://localhost:3002' });

// ─── Helpers ──────────────────────────────────────────────

async function navigateToPriceList(page: test.FixtureType<typeof test>['page']) {
  await loginAsAdmin(page);
  await navigateToSettingsTab(page, 'Price List');
  await expect(page.getByText('Upload Price List')).toBeVisible({ timeout: UI_TIMEOUT });
}

function csvBuffer(content: string): Buffer {
  return Buffer.from(content, 'utf-8');
}

// ─── Tests ────────────────────────────────────────────────

test.describe('CSV Price Upload', () => {
  test.describe.configure({ mode: 'serial' });

  test('Price List tab is visible for Accelerate tier', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/settings');
    await expect(page.locator('[role="tablist"]')).toBeVisible({ timeout: UI_TIMEOUT });
    const priceListTab = page.getByRole('tab', { name: /Price List/i });
    await expect(priceListTab).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('upload zone shows drag-drop area and sample CSV link', async ({ page }) => {
    await navigateToPriceList(page);

    // Drag-drop zone with instructions
    await expect(page.getByText(/Drag and drop your CSV file/i)).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.getByText(/Required columns.*item_name/i)).toBeVisible();

    // Download sample link
    await expect(page.getByText(/Download sample CSV/i)).toBeVisible();
  });

  test('current price list shows empty state when no prices uploaded', async ({ page }) => {
    // First ensure prices are cleared
    await fetch('http://localhost:3002/api/admin/prices', { method: 'DELETE' });

    await navigateToPriceList(page);

    await expect(page.getByText(/No prices uploaded/i)).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('selecting a CSV file shows preview table', async ({ page }) => {
    await navigateToPriceList(page);

    // Upload CSV via hidden file input
    const fileInput = page.locator('input[type="file"][accept=".csv"]');
    await expect(fileInput).toBeAttached({ timeout: UI_TIMEOUT });

    await fileInput.setInputFiles({
      name: 'test-prices.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer(createTestCSVContent()),
    });

    // Preview should show
    await expect(page.getByText(/Preview/i)).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.getByText('test-prices.csv')).toBeVisible();

    // Preview table should show some items
    await expect(page.getByText('Stock cabinets')).toBeVisible();

    // Upload and Cancel buttons should be visible
    await expect(page.getByRole('button', { name: /Upload Price List/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible();
  });

  test('cancelling preview returns to upload zone', async ({ page }) => {
    await navigateToPriceList(page);

    const fileInput = page.locator('input[type="file"][accept=".csv"]');
    await fileInput.setInputFiles({
      name: 'test-prices.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer(createTestCSVContent()),
    });

    await expect(page.getByText(/Preview/i)).toBeVisible({ timeout: UI_TIMEOUT });

    // Click cancel
    await page.getByRole('button', { name: /Cancel/i }).click();

    // Should return to drag-drop zone
    await expect(page.getByText(/Drag and drop your CSV file/i)).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('confirming upload imports prices and shows success count', async ({ page }) => {
    // Clear first
    await fetch('http://localhost:3002/api/admin/prices', { method: 'DELETE' });

    await navigateToPriceList(page);

    const fileInput = page.locator('input[type="file"][accept=".csv"]');
    await fileInput.setInputFiles({
      name: 'test-prices.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer(createTestCSVContent()),
    });

    // Click Upload
    await page.getByRole('button', { name: /Upload Price List/i }).click();

    // Wait for success
    await expect(page.getByText(/Imported 5 prices? successfully/i)).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('current price list table shows uploaded prices', async ({ page }) => {
    // Ensure prices exist
    const res = await fetch('http://localhost:3002/api/admin/prices');
    const json = await res.json();
    if (json.count === 0) {
      const form = new FormData();
      form.append('csv', new Blob([createTestCSVContent()], { type: 'text/csv' }), 'prices.csv');
      await fetch('http://localhost:3002/api/admin/prices', { method: 'POST', body: form });
    }

    await navigateToPriceList(page);

    // Price list table should show items
    await expect(page.getByText(/Current Price List/i)).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.getByText(/5 items? uploaded/i)).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.getByText('Stock cabinets')).toBeVisible();

    // Clear All button should be visible
    await expect(page.getByRole('button', { name: /Clear All/i })).toBeVisible();
  });

  test('second upload replaces existing prices', async ({ page }) => {
    await navigateToPriceList(page);

    // Upload a smaller CSV
    const smallCSV = [
      'item_name,category,unit,unit_price,supplier',
      '"Replacement item 1",materials,ea,50,',
      '"Replacement item 2",labor,hr,75,',
    ].join('\n');

    const fileInput = page.locator('input[type="file"][accept=".csv"]');
    await fileInput.setInputFiles({
      name: 'replace.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer(smallCSV),
    });

    // Should show warning about replacing
    await expect(page.getByText(/will replace your existing/i)).toBeVisible({ timeout: UI_TIMEOUT });

    // Confirm upload
    await page.getByRole('button', { name: /Upload Price List/i }).click();
    await expect(page.getByText(/Imported 2 prices? successfully/i)).toBeVisible({ timeout: UI_TIMEOUT });

    // Verify replacement
    await expect(page.getByText(/2 items? uploaded/i)).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('Clear All removes all prices', async ({ page }) => {
    // Ensure prices exist first
    const form = new FormData();
    form.append('csv', new Blob([createTestCSVContent()], { type: 'text/csv' }), 'prices.csv');
    await fetch('http://localhost:3002/api/admin/prices', { method: 'POST', body: form });

    await navigateToPriceList(page);
    await expect(page.getByRole('button', { name: /Clear All/i })).toBeVisible({ timeout: UI_TIMEOUT });

    // Click Clear All and accept confirm dialog
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /Clear All/i }).click();

    // Should show empty state
    await expect(page.getByText(/No prices uploaded/i)).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('non-CSV file shows error', async ({ page }) => {
    await navigateToPriceList(page);

    const fileInput = page.locator('input[type="file"][accept=".csv"]');
    await fileInput.setInputFiles({
      name: 'not-a-csv.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('this is not a csv'),
    });

    await expect(page.getByText(/Please upload a CSV file/i)).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('CSV with only header row shows error', async ({ page }) => {
    await navigateToPriceList(page);

    const headerOnly = 'item_name,category,unit,unit_price,supplier\n';
    const fileInput = page.locator('input[type="file"][accept=".csv"]');
    await fileInput.setInputFiles({
      name: 'header-only.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer(headerOnly),
    });

    // Client-side: should show error about needing data rows
    await expect(page.getByText(/must have a header row and at least one data row/i)).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('CSV with invalid rows reports errors from server', async ({ page }) => {
    await navigateToPriceList(page);

    const fileInput = page.locator('input[type="file"][accept=".csv"]');
    await fileInput.setInputFiles({
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer(createInvalidCSVContent()),
    });

    // Preview should show
    await expect(page.getByText(/Preview/i)).toBeVisible({ timeout: UI_TIMEOUT });

    // Upload
    await page.getByRole('button', { name: /Upload Price List/i }).click();

    // Server should report errors
    await expect(page.getByText(/No valid rows found|row.*had errors/i)).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('API: GET /api/admin/prices returns JSON with success field', async () => {
    const res = await fetch('http://localhost:3002/api/admin/prices');
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(typeof json.count).toBe('number');
  });

  test('API: POST with valid CSV returns imported count', async () => {
    const form = new FormData();
    form.append('csv', new Blob([createTestCSVContent()], { type: 'text/csv' }), 'test.csv');

    const res = await fetch('http://localhost:3002/api/admin/prices', {
      method: 'POST',
      body: form,
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.imported).toBe(5);
    expect(json.errors).toEqual([]);

    // Cleanup
    await fetch('http://localhost:3002/api/admin/prices', { method: 'DELETE' });
  });

  test('API: DELETE clears all prices', async () => {
    // Upload first
    const form = new FormData();
    form.append('csv', new Blob([createTestCSVContent()], { type: 'text/csv' }), 'test.csv');
    await fetch('http://localhost:3002/api/admin/prices', { method: 'POST', body: form });

    // Delete
    const res = await fetch('http://localhost:3002/api/admin/prices', { method: 'DELETE' });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.deleted).toBeGreaterThan(0);

    // Verify empty
    const verify = await fetch('http://localhost:3002/api/admin/prices');
    const verifyJson = await verify.json();
    expect(verifyJson.count).toBe(0);
  });

  test('download sample CSV link triggers download', async ({ page }) => {
    await navigateToPriceList(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByText(/Download sample CSV/i).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('price-list-template.csv');
  });
});
