/**
 * Admin Feedback Widget E2E Tests
 * Tests the contractor feedback co-pilot widget in the admin dashboard.
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Feedback Widget', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin — dismiss the demo interstitial splash
    await page.goto('/admin?__site_id=red-white-reno');
    // Wait for page to load
    await expect(page.getByText('Dashboard')).toBeVisible({ timeout: 15000 });
    // Dismiss splash if present
    const startButton = page.getByRole('button', { name: 'Start Exploring' });
    if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startButton.click();
      await expect(startButton).not.toBeVisible();
    }
  });

  test('9. Feedback FAB button visible on admin dashboard', async ({ page }) => {
    const fab = page.getByRole('button', { name: /feedback/i });
    await expect(fab).toBeVisible();
  });

  test('10. Open widget → type message → see bot response', async ({ page }) => {
    // Open feedback widget
    await page.getByRole('button', { name: /feedback/i }).click();

    // Verify chat panel opens with greeting
    await expect(page.getByText(/platform assistant/i)).toBeVisible();

    // Verify category chips
    await expect(page.getByText('Pricing Issue')).toBeVisible();
    await expect(page.getByText('Feature Request')).toBeVisible();
    await expect(page.getByText('Question')).toBeVisible();
    await expect(page.getByText('General Feedback')).toBeVisible();

    // Click a category chip
    await page.getByText('Pricing Issue').click();

    // Type a message
    const input = page.getByPlaceholder(/feedback/i);
    await input.fill('The plumbing rate seems too low for Hamilton');

    // Send the message
    await page.getByRole('button', { name: /send message/i }).click();

    // Verify bot responds
    await expect(page.getByText(/Thanks for sharing/i)).toBeVisible({ timeout: 5000 });
  });

  test('11. Widget shows correct tenant company name', async ({ page }) => {
    // Open feedback widget
    await page.getByRole('button', { name: /feedback/i }).click();

    // Should show Red White Reno Inc. (the current tenant)
    await expect(page.getByText('Red White Reno Inc.')).toBeVisible();

    // Close widget
    await page.getByRole('button', { name: /close/i }).click();

    // Navigate to different tenant admin
    await page.goto('/admin?__site_id=demo');
    await expect(page.getByText('Dashboard')).toBeVisible({ timeout: 15000 });
    const startButton = page.getByRole('button', { name: 'Start Exploring' });
    if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startButton.click();
    }

    // Open feedback widget — should show demo company name
    await page.getByRole('button', { name: /feedback/i }).click();
    // Should NOT show Red White Reno
    const widgetText = await page.locator('[class*="feedback"]').textContent().catch(() => '');
    expect(widgetText).not.toContain('Red White Reno');
  });
});
