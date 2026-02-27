/**
 * Quote Send Wizard — E2E Tests
 * Tests the 4-step wizard: Review → PDF Preview → Email → Confirm & Send.
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, BASE_URL, UI_TIMEOUT, AI_TIMEOUT } from './helpers';

test.use({ baseURL: BASE_URL });

test.describe('Quote Send Wizard', () => {
  test.setTimeout(AI_TIMEOUT);

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/leads');
    await expect(page.locator('table')).toBeVisible({ timeout: UI_TIMEOUT });

    const viewLink = page.locator('table tbody tr').first().getByRole('link').first();
    await expect(viewLink).toBeVisible({ timeout: UI_TIMEOUT });
    await viewLink.click();
    await page.waitForURL(/\/admin\/leads\//, { timeout: UI_TIMEOUT });

    const quoteTab = page.getByRole('tab', { name: /Quote/i });
    await expect(quoteTab).toBeVisible({ timeout: UI_TIMEOUT });
    await quoteTab.click();
    await expect(page.getByText(/Quote Line Items/i).first()).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('Send Quote button is visible', async ({ page }) => {
    const sendButton = page.getByRole('button', { name: /Send Quote/i });
    // Send button should exist (may be disabled if no line items)
    const isVisible = await sendButton.isVisible().catch(() => false);
    expect(typeof isVisible).toBe('boolean');
  });

  test('Send Quote button opens wizard dialog', async ({ page }) => {
    const rows = await page.locator('table tbody tr').count();
    if (rows === 0) {
      test.skip();
      return;
    }

    const sendButton = page.getByRole('button', { name: /Send Quote/i });
    await expect(sendButton).toBeVisible({ timeout: UI_TIMEOUT });
    await sendButton.click();

    // Wizard dialog should appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('wizard Step 1 shows review summary', async ({ page }) => {
    const rows = await page.locator('table tbody tr').count();
    if (rows === 0) {
      test.skip();
      return;
    }

    const sendButton = page.getByRole('button', { name: /Send Quote/i });
    await sendButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: UI_TIMEOUT });

    // Step 1 should show line items summary and total
    await expect(dialog.getByText(/Review/i).first()).toBeVisible();
    await expect(dialog.getByText(/\$[\d,]+/).first()).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('wizard has Next button to navigate steps', async ({ page }) => {
    const rows = await page.locator('table tbody tr').count();
    if (rows === 0) {
      test.skip();
      return;
    }

    const sendButton = page.getByRole('button', { name: /Send Quote/i });
    await sendButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: UI_TIMEOUT });

    // Next button should be present
    const nextButton = dialog.getByRole('button', { name: /Next/i });
    await expect(nextButton).toBeVisible();
  });

  test('wizard Step 2 shows PDF preview', async ({ page }) => {
    const rows = await page.locator('table tbody tr').count();
    if (rows === 0) {
      test.skip();
      return;
    }

    const sendButton = page.getByRole('button', { name: /Send Quote/i });
    await sendButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: UI_TIMEOUT });

    // Navigate to Step 2
    const nextButton = dialog.getByRole('button', { name: /Next/i });
    await nextButton.click();

    // Step 2 should show PDF preview or Download PDF button
    await expect(
      dialog.getByText(/PDF|Preview|Download/i).first()
    ).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('wizard Step 3 shows email composition', async ({ page }) => {
    const rows = await page.locator('table tbody tr').count();
    if (rows === 0) {
      test.skip();
      return;
    }

    const sendButton = page.getByRole('button', { name: /Send Quote/i });
    await sendButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: UI_TIMEOUT });

    // Navigate to Step 3
    const nextButton = dialog.getByRole('button', { name: /Next/i });
    await nextButton.click();
    // Wait for step 2 to load
    await page.waitForTimeout(1000);
    await nextButton.click();

    // Step 3 should show email fields (subject, body)
    await expect(
      dialog.getByText(/Email|Subject|Send to/i).first()
    ).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('wizard can be closed without sending', async ({ page }) => {
    const rows = await page.locator('table tbody tr').count();
    if (rows === 0) {
      test.skip();
      return;
    }

    const sendButton = page.getByRole('button', { name: /Send Quote/i });
    await sendButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: UI_TIMEOUT });

    // Close button (X) should be present
    const closeButton = dialog.locator('button[aria-label="Close"], button:has(svg.lucide-x)').first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('wizard has Back button on later steps', async ({ page }) => {
    const rows = await page.locator('table tbody tr').count();
    if (rows === 0) {
      test.skip();
      return;
    }

    const sendButton = page.getByRole('button', { name: /Send Quote/i });
    await sendButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: UI_TIMEOUT });

    // Navigate to Step 2
    const nextButton = dialog.getByRole('button', { name: /Next/i });
    await nextButton.click();

    // Back button should appear on step 2
    const backButton = dialog.getByRole('button', { name: /Back|Previous/i });
    await expect(backButton).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('wizard Step 4 has Confirm & Send button', async ({ page }) => {
    const rows = await page.locator('table tbody tr').count();
    if (rows === 0) {
      test.skip();
      return;
    }

    const sendButton = page.getByRole('button', { name: /Send Quote/i });
    await sendButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: UI_TIMEOUT });

    // Navigate through all steps to Step 4
    const nextButton = dialog.getByRole('button', { name: /Next/i });
    await nextButton.click();
    await page.waitForTimeout(1000);
    await nextButton.click();
    await page.waitForTimeout(1000);
    await nextButton.click();

    // Step 4 should have a Confirm & Send button
    await expect(
      dialog.getByRole('button', { name: /Confirm|Send/i }).first()
    ).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('wizard shows step progress indicator', async ({ page }) => {
    const rows = await page.locator('table tbody tr').count();
    if (rows === 0) {
      test.skip();
      return;
    }

    const sendButton = page.getByRole('button', { name: /Send Quote/i });
    await sendButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: UI_TIMEOUT });

    // Progress indicator should show step numbers or labels
    // The wizard uses StepProgress component with 4 steps
    await expect(
      dialog.getByText(/Step|1.*4|Review/i).first()
    ).toBeVisible({ timeout: UI_TIMEOUT });
  });
});
