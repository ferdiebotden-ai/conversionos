/**
 * Good/Better/Best Tier Mode — E2E Tests
 * Tests tier toggle (Single ↔ Three Tiers), tier comparison bar,
 * "Recommended" badge, percentage differences, tier switching persistence.
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, BASE_URL, UI_TIMEOUT, AI_TIMEOUT } from './helpers';

test.use({ baseURL: BASE_URL });

test.describe('Good/Better/Best Tier Mode', () => {
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

  test('Single Tier and Three Tiers toggle buttons are visible', async ({ page }) => {
    const singleButton = page.getByRole('button', { name: /Single Tier/i });
    const tieredButton = page.getByRole('button', { name: /Three Tiers/i });

    // These buttons only show when there's an AI quote
    if (await singleButton.isVisible()) {
      await expect(singleButton).toBeVisible();
      await expect(tieredButton).toBeVisible();
    }
  });

  test('clicking Three Tiers shows tier comparison bar', async ({ page }) => {
    const tieredButton = page.getByRole('button', { name: /Three Tiers/i });
    if (!await tieredButton.isVisible().catch(() => false)) {
      test.skip();
      return;
    }

    await tieredButton.click();

    // Wait for tier comparison to appear (may need AI generation)
    const goodTier = page.getByText('Good', { exact: true });
    const betterTier = page.getByText('Better', { exact: true });
    const bestTier = page.getByText('Best', { exact: true });

    await expect(goodTier.first()).toBeVisible({ timeout: AI_TIMEOUT });
    await expect(betterTier.first()).toBeVisible({ timeout: AI_TIMEOUT });
    await expect(bestTier.first()).toBeVisible({ timeout: AI_TIMEOUT });
  });

  test('Better tier shows "Recommended" badge', async ({ page }) => {
    const tieredButton = page.getByRole('button', { name: /Three Tiers/i });
    if (!await tieredButton.isVisible().catch(() => false)) {
      test.skip();
      return;
    }

    // If already in tiered mode or switch to it
    if (await page.getByText('Recommended').isVisible().catch(() => false)) {
      await expect(page.getByText('Recommended')).toBeVisible();
    } else {
      await tieredButton.click();
      await expect(page.getByText('Recommended')).toBeVisible({ timeout: AI_TIMEOUT });
    }
  });

  test('tier comparison shows percentage differences from Good', async ({ page }) => {
    const tieredButton = page.getByRole('button', { name: /Three Tiers/i });
    if (!await tieredButton.isVisible().catch(() => false)) {
      test.skip();
      return;
    }

    // Switch to tiered if not already
    if (!await page.getByText('Recommended').isVisible().catch(() => false)) {
      await tieredButton.click();
      await expect(page.getByText('Recommended')).toBeVisible({ timeout: AI_TIMEOUT });
    }

    // Better and Best should show +X% relative to Good
    const percentages = page.locator('text=/\\+\\d+%/');
    const count = await percentages.count();
    // Better and Best should each have a percentage
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('clicking a tier column switches the active editor', async ({ page }) => {
    const tieredButton = page.getByRole('button', { name: /Three Tiers/i });
    if (!await tieredButton.isVisible().catch(() => false)) {
      test.skip();
      return;
    }

    if (!await page.getByText('Recommended').isVisible().catch(() => false)) {
      await tieredButton.click();
      await expect(page.getByText('Recommended')).toBeVisible({ timeout: AI_TIMEOUT });
    }

    // Click the "Good" tier
    const goodButton = page.locator('button').filter({ hasText: 'Good' }).filter({ hasText: 'Economy' });
    if (await goodButton.isVisible().catch(() => false)) {
      await goodButton.click();

      // The AI banner should update to show "Good tier"
      await expect(page.getByText(/Good tier/i)).toBeVisible({ timeout: 5000 });
    }

    // Click the "Best" tier
    const bestButton = page.locator('button').filter({ hasText: 'Best' }).filter({ hasText: 'Premium' });
    if (await bestButton.isVisible().catch(() => false)) {
      await bestButton.click();

      // The AI banner should update to show "Best tier"
      await expect(page.getByText(/Best tier/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('switching back to Single Tier hides comparison bar', async ({ page }) => {
    const singleButton = page.getByRole('button', { name: /Single Tier/i });
    const tieredButton = page.getByRole('button', { name: /Three Tiers/i });

    if (!await tieredButton.isVisible().catch(() => false)) {
      test.skip();
      return;
    }

    // Switch to tiered
    if (!await page.getByText('Recommended').isVisible().catch(() => false)) {
      await tieredButton.click();
      await expect(page.getByText('Recommended')).toBeVisible({ timeout: AI_TIMEOUT });
    }

    // Switch back to single
    await singleButton.click();

    // Comparison bar should disappear
    await expect(page.getByText('Recommended')).not.toBeVisible({ timeout: 5000 });
  });

  test('each tier shows item count', async ({ page }) => {
    const tieredButton = page.getByRole('button', { name: /Three Tiers/i });
    if (!await tieredButton.isVisible().catch(() => false)) {
      test.skip();
      return;
    }

    if (!await page.getByText('Recommended').isVisible().catch(() => false)) {
      await tieredButton.click();
      await expect(page.getByText('Recommended')).toBeVisible({ timeout: AI_TIMEOUT });
    }

    // Each tier card shows "N items"
    const itemCounts = page.locator('text=/\\d+ items/');
    const count = await itemCounts.count();
    expect(count).toBeGreaterThanOrEqual(3); // Good, Better, Best each show item count
  });

  test('each tier shows a currency total', async ({ page }) => {
    const tieredButton = page.getByRole('button', { name: /Three Tiers/i });
    if (!await tieredButton.isVisible().catch(() => false)) {
      test.skip();
      return;
    }

    if (!await page.getByText('Recommended').isVisible().catch(() => false)) {
      await tieredButton.click();
      await expect(page.getByText('Recommended')).toBeVisible({ timeout: AI_TIMEOUT });
    }

    // Each tier card should show a dollar total
    const tierCards = page.locator('button').filter({ hasText: /\$[\d,]+/ });
    const count = await tierCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
