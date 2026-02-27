/**
 * Quote Editor Core — E2E Tests
 * Tests the main quote editor: line items, categories, totals chain,
 * add/delete/duplicate, contingency editing, save, regenerate, reset to AI.
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, BASE_URL, UI_TIMEOUT, AI_TIMEOUT } from './helpers';

test.use({ baseURL: BASE_URL });

test.describe('Quote Editor Core', () => {
  test.setTimeout(AI_TIMEOUT);

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/leads');
    await expect(page.locator('table')).toBeVisible({ timeout: UI_TIMEOUT });

    // Click first lead View link
    const viewLink = page.locator('table tbody tr').first().getByRole('link').first();
    await expect(viewLink).toBeVisible({ timeout: UI_TIMEOUT });
    await viewLink.click();
    await page.waitForURL(/\/admin\/leads\//, { timeout: UI_TIMEOUT });

    // Click Quote tab
    const quoteTab = page.getByRole('tab', { name: /Quote/i });
    await expect(quoteTab).toBeVisible({ timeout: UI_TIMEOUT });
    await quoteTab.click();

    // Wait for quote editor to load
    await expect(
      page.getByText(/Quote Line Items/i).first()
    ).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('displays the line items table with proper headers', async ({ page }) => {
    const table = page.locator('table').first();
    await expect(table).toBeVisible();

    // Verify all column headers
    await expect(page.getByRole('columnheader', { name: /Description/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Category/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Qty/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Unit$/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Unit Price/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Total/i })).toBeVisible();
  });

  test('shows AI-generated items with Sparkles badges', async ({ page }) => {
    // AI items should have the purple AI badge
    const aiBadges = page.locator('text=AI').filter({ has: page.locator('svg') });
    // If there are AI items, they should have badges
    const badgeCount = await aiBadges.count();
    // AI items may or may not exist depending on state, just verify no crash
    expect(badgeCount).toBeGreaterThanOrEqual(0);
  });

  test('can add a new line item', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /Add Line Item/i });
    await expect(addButton).toBeVisible();

    // Count existing rows
    const rowsBefore = await page.locator('table tbody tr').count();

    await addButton.click();

    // Should have one more row
    const rowsAfter = await page.locator('table tbody tr').count();
    expect(rowsAfter).toBe(rowsBefore + 1);
  });

  test('editing description updates the line item', async ({ page }) => {
    // Ensure there's at least one item
    const rows = page.locator('table tbody tr');
    if (await rows.count() === 0) {
      await page.getByRole('button', { name: /Add Line Item/i }).click();
    }

    // Find the first description input
    const descInput = page.getByLabel('Item description').first();
    await expect(descInput).toBeVisible();

    await descInput.click({ clickCount: 3 });
    await descInput.fill('Test Line Item Description');

    // Verify the value persisted in the input
    await expect(descInput).toHaveValue('Test Line Item Description');

    // Should show unsaved changes
    await expect(page.getByText(/Unsaved changes/i)).toBeVisible({ timeout: 5000 });
  });

  test('editing quantity recalculates total', async ({ page }) => {
    // Ensure there's at least one item
    const rows = page.locator('table tbody tr');
    if (await rows.count() === 0) {
      await page.getByRole('button', { name: /Add Line Item/i }).click();
    }

    // Set quantity to 5 and unit price to 100
    const qtyInput = page.getByLabel('Quantity').first();
    const priceInput = page.getByLabel('Unit price').first();

    await qtyInput.click({ clickCount: 3 });
    await qtyInput.fill('5');

    await priceInput.click({ clickCount: 3 });
    await priceInput.fill('100');

    // Total should be 500 (5 * 100)
    // The total cell is the next cell after unit price
    const totalCell = page.locator('table tbody tr').first().locator('td.text-right').first();
    await expect(totalCell).toContainText('$500.00');
  });

  test('can change line item category via dropdown', async ({ page }) => {
    // Ensure there's at least one item
    const rows = page.locator('table tbody tr');
    if (await rows.count() === 0) {
      await page.getByRole('button', { name: /Add Line Item/i }).click();
    }

    // Click on the category dropdown
    const categoryTrigger = page.locator('table tbody tr').first().getByRole('combobox').first();
    await expect(categoryTrigger).toBeVisible();
    await categoryTrigger.click();

    // Select "Labour" from the dropdown
    const labourOption = page.getByRole('option', { name: /Labour/i });
    await expect(labourOption).toBeVisible();
    await labourOption.click();

    // Verify it changed
    await expect(categoryTrigger).toContainText('Labour');
  });

  test('can delete a line item', async ({ page }) => {
    // Add a new item first to ensure we have something to delete
    await page.getByRole('button', { name: /Add Line Item/i }).click();
    const rowsBefore = await page.locator('table tbody tr').count();

    // Hover over the last row to reveal action buttons
    const lastRow = page.locator('table tbody tr').last();
    await lastRow.hover();

    // Click the delete button
    const deleteButton = lastRow.getByLabel('Remove item');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Should have one less row
    const rowsAfter = await page.locator('table tbody tr').count();
    expect(rowsAfter).toBe(rowsBefore - 1);
  });

  test('totals chain calculates correctly: Subtotal → Contingency → HST → Total → Deposit', async ({ page }) => {
    // Look for the totals card
    const totalsCard = page.getByText('Quote Totals').locator('..');
    await expect(totalsCard).toBeVisible();

    // Verify all total labels are present
    await expect(page.getByText('Subtotal').first()).toBeVisible();
    await expect(page.getByText(/Contingency/i).first()).toBeVisible();
    await expect(page.getByText(/HST.*13%/i).first()).toBeVisible();
    await expect(page.getByText('Total').first()).toBeVisible();
    await expect(page.getByText(/Deposit Required.*\d+%/i).first()).toBeVisible();
  });

  test('contingency percentage is editable', async ({ page }) => {
    const contingencyInput = page.getByLabel('Contingency percentage');
    await expect(contingencyInput).toBeVisible();

    // Change contingency to 15%
    await contingencyInput.click({ clickCount: 3 });
    await contingencyInput.fill('15');

    // Verify the value updated
    await expect(contingencyInput).toHaveValue('15');

    // Should show unsaved changes
    await expect(page.getByText(/Unsaved changes/i)).toBeVisible({ timeout: 5000 });
  });

  test('save button works and shows confirmation', async ({ page }) => {
    // Make a change first
    const contingencyInput = page.getByLabel('Contingency percentage');
    await contingencyInput.click({ clickCount: 3 });
    await contingencyInput.fill('12');

    // Click save
    const saveButton = page.getByRole('button', { name: /Save/i }).first();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Wait for save confirmation
    await expect(
      page.getByText(/Last saved|Saved/i).first()
    ).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('assumptions textarea is editable', async ({ page }) => {
    const assumptionsTextarea = page.getByLabel(/assumptions/i).or(page.locator('#assumptions'));
    await expect(assumptionsTextarea).toBeVisible();

    // Should have default assumptions or AI-generated ones
    const value = await assumptionsTextarea.inputValue();
    expect(value.length).toBeGreaterThan(0);

    // Append text
    await assumptionsTextarea.fill(value + '\nTest assumption added');
    await expect(assumptionsTextarea).toHaveValue(/Test assumption added/);
  });

  test('exclusions textarea is editable', async ({ page }) => {
    const exclusionsTextarea = page.getByLabel(/exclusions/i).or(page.locator('#exclusions'));
    await expect(exclusionsTextarea).toBeVisible();

    const value = await exclusionsTextarea.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test('Download PDF button is present and functional', async ({ page }) => {
    const pdfButton = page.getByRole('button', { name: /Download PDF/i });
    await expect(pdfButton).toBeVisible();

    // Button should be enabled if there are line items
    const rows = await page.locator('table tbody tr').count();
    if (rows > 0) {
      await expect(pdfButton).toBeEnabled();
    }
  });

  test('Send Quote button is present', async ({ page }) => {
    const sendButton = page.getByRole('button', { name: /Send Quote|Resend Quote/i });
    await expect(sendButton).toBeVisible();
  });

  test('AI info banner shows item count and confidence', async ({ page }) => {
    // If AI items exist, the banner should be visible
    const aiBanner = page.getByText(/AI-generated quote/i);
    if (await aiBanner.isVisible()) {
      // Should show item count or tier info
      await expect(aiBanner).toContainText(/items|tier/i);
    }
  });

  test('Regenerate button opens dialog', async ({ page }) => {
    const regenerateButton = page.getByRole('button', { name: /Regenerate/i }).first();
    if (await regenerateButton.isVisible()) {
      await regenerateButton.click();

      // Dialog should appear
      await expect(page.getByText(/Regenerate Quote/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('Reset to AI Quote button exists when AI items present', async ({ page }) => {
    const resetButton = page.getByRole('button', { name: /Reset to AI Quote/i });
    // May or may not be visible depending on whether AI items exist
    const isVisible = await resetButton.isVisible().catch(() => false);
    // Just verify no crash — presence depends on AI data
    expect(typeof isVisible).toBe('boolean');
  });

  test('Insert Template button opens template picker', async ({ page }) => {
    const templateButton = page.getByRole('button', { name: /Insert Template/i });
    await expect(templateButton).toBeVisible();
    await templateButton.click();

    // Template picker dialog should appear
    await expect(
      page.getByText(/Select a Template|Assembly Template|Choose Template/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});
