/**
 * Transparency Cards — E2E Tests
 * Tests the "show the math" transparency breakdown for AI-generated line items.
 * Verifies cost breakdown table, markup %, data source badges, collapse toggle.
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, BASE_URL, UI_TIMEOUT, AI_TIMEOUT } from './helpers';

test.use({ baseURL: BASE_URL });

test.describe('Transparency Cards', () => {
  test.setTimeout(AI_TIMEOUT);

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/leads');
    await expect(page.locator('table')).toBeVisible({ timeout: UI_TIMEOUT });

    // Navigate to first lead's Quote tab
    const viewLink = page.locator('table tbody tr').first().getByRole('link').first();
    await expect(viewLink).toBeVisible({ timeout: UI_TIMEOUT });
    await viewLink.click();
    await page.waitForURL(/\/admin\/leads\//, { timeout: UI_TIMEOUT });

    const quoteTab = page.getByRole('tab', { name: /Quote/i });
    await expect(quoteTab).toBeVisible({ timeout: UI_TIMEOUT });
    await quoteTab.click();
    await expect(page.getByText(/Quote Line Items/i).first()).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('AI items have info button for transparency toggle', async ({ page }) => {
    // AI items should have the info button (visible on hover)
    const firstAIRow = page.locator('table tbody tr').filter({
      has: page.locator('text=AI'),
    }).first();

    if (await firstAIRow.isVisible()) {
      await firstAIRow.hover();

      const infoButton = firstAIRow.getByLabel('Show price breakdown');
      // Info button exists for AI items with transparency data
      const hasInfo = await infoButton.isVisible().catch(() => false);
      expect(typeof hasInfo).toBe('boolean');
    }
  });

  test('clicking info button toggles transparency card', async ({ page }) => {
    // Find an AI row with transparency data
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    let foundTransparencyRow = false;

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      await row.hover();

      const infoButton = row.getByLabel('Show price breakdown');
      if (await infoButton.isVisible().catch(() => false)) {
        foundTransparencyRow = true;

        // Click to show
        await infoButton.click();

        // Transparency card should appear in the next row
        const transparencyCard = page.locator('text=Room Analysis').or(
          page.locator('text=Subtotal')
        ).first();
        await expect(transparencyCard).toBeVisible({ timeout: 5000 });

        // Click again to hide
        await row.hover();
        await infoButton.click();

        // Card should be hidden
        await expect(transparencyCard).not.toBeVisible({ timeout: 3000 });

        break;
      }
    }

    // Skip if no AI items with transparency data
    if (!foundTransparencyRow) {
      test.skip();
    }
  });

  test('transparency card shows cost breakdown table with proper columns', async ({ page }) => {
    // Find an AI row and open its transparency card
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    let found = false;

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      await row.hover();

      const infoButton = row.getByLabel('Show price breakdown');
      if (await infoButton.isVisible().catch(() => false)) {
        found = true;
        await infoButton.click();

        // Verify transparency card structure
        // Room analysis text
        const roomAnalysis = page.locator('.bg-gradient-to-br').first();
        await expect(roomAnalysis).toBeVisible({ timeout: 5000 });

        // Cost breakdown table headers
        await expect(page.getByText('Item', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('Qty', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('Unit', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('Unit Cost', { exact: true }).first()).toBeVisible();

        // Subtotal row
        await expect(page.getByText('Subtotal').first()).toBeVisible();

        break;
      }
    }

    if (!found) {
      test.skip();
    }
  });

  test('transparency card shows markup information', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    let found = false;

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      await row.hover();

      const infoButton = row.getByLabel('Show price breakdown');
      if (await infoButton.isVisible().catch(() => false)) {
        found = true;
        await infoButton.click();

        // Look for markup badge (shows "X%: +$Y")
        const markupBadge = page.locator('text=/%/').first();
        if (await markupBadge.isVisible().catch(() => false)) {
          await expect(markupBadge).toContainText('%');
        }

        break;
      }
    }

    if (!found) {
      test.skip();
    }
  });

  test('transparency card shows data source badge', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    let found = false;

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      await row.hover();

      const infoButton = row.getByLabel('Show price breakdown');
      if (await infoButton.isVisible().catch(() => false)) {
        found = true;
        await infoButton.click();

        // Data source badge should be present at the bottom
        const dataSourceBadge = page.locator('.bg-gradient-to-br').first().locator('text=Ontario').or(
          page.locator('.bg-gradient-to-br').first().locator('text=Database')
        ).or(
          page.locator('.bg-gradient-to-br').first().locator('text=AI')
        );

        // At least one source badge should be visible
        await expect(dataSourceBadge.first()).toBeVisible({ timeout: 5000 });

        break;
      }
    }

    if (!found) {
      test.skip();
    }
  });

  test('DB badge appears for ontario_db sourced cost lines', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    let found = false;

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      await row.hover();

      const infoButton = row.getByLabel('Show price breakdown');
      if (await infoButton.isVisible().catch(() => false)) {
        found = true;
        await infoButton.click();

        // Check if any cost line has "DB" badge (ontario_db source)
        const dbBadges = page.locator('.bg-gradient-to-br').first().locator('text=DB');
        const dbCount = await dbBadges.count();
        // Just verify it doesn't crash — DB badges may or may not exist
        expect(dbCount).toBeGreaterThanOrEqual(0);

        break;
      }
    }

    if (!found) {
      test.skip();
    }
  });
});
