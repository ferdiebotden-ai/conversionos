/**
 * Emma Chat Widget E2E Tests
 * Tests the receptionist widget FAB, chat panel, and voice toggle.
 * STRICT: No .or() fallbacks. Tests fail if elements are missing.
 */

import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://localhost:3002' });

test.describe('Emma Widget', () => {
  test('FAB trigger is visible on homepage', async ({ page }) => {
    await page.goto('/');
    // Wait for client-side widget to load
    const fab = page.getByRole('button', { name: /Chat with Emma/i });
    await expect(fab).toBeVisible({ timeout: 10000 });
  });

  test('clicking FAB opens chat panel', async ({ page }) => {
    await page.goto('/');
    const fab = page.getByRole('button', { name: /Chat with Emma/i });
    await expect(fab).toBeVisible({ timeout: 10000 });
    await fab.click();

    // Panel header should show Emma's name
    await expect(page.getByText('Emma').first()).toBeVisible({ timeout: 5000 });
    // Close button should be visible
    await expect(page.getByRole('button', { name: /Close chat/i }).first()).toBeVisible();
  });

  test('chat panel shows Emma greeting message', async ({ page }) => {
    await page.goto('/');
    const fab = page.getByRole('button', { name: /Chat with Emma/i });
    await expect(fab).toBeVisible({ timeout: 10000 });
    await fab.click();

    // Wait for greeting to appear in the chat
    await expect(page.getByText(/renovation/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('chat panel has text input', async ({ page }) => {
    await page.goto('/');
    const fab = page.getByRole('button', { name: /Chat with Emma/i });
    await expect(fab).toBeVisible({ timeout: 10000 });
    await fab.click();

    // Text input should be available
    const input = page.getByRole('textbox');
    await expect(input.first()).toBeVisible({ timeout: 5000 });
  });

  test('clicking close button closes chat panel', async ({ page }) => {
    await page.goto('/');
    const fab = page.getByRole('button', { name: /Chat with Emma/i });
    await expect(fab).toBeVisible({ timeout: 10000 });
    await fab.click();

    // Verify panel is open
    await expect(page.getByText('Emma').first()).toBeVisible({ timeout: 5000 });

    // Close it via the X button in header
    const closeButton = page.getByRole('button', { name: /Close chat/i }).first();
    await closeButton.click();

    // FAB should now show "Chat with Emma" again (not "Close chat")
    await expect(page.getByRole('button', { name: /Chat with Emma/i })).toBeVisible({ timeout: 5000 });
  });

  test('widget is hidden on /estimate page', async ({ page }) => {
    await page.goto('/estimate');
    // Wait for page to load
    await page.waitForTimeout(3000);
    // FAB should NOT be visible (HIDDEN_PATHS includes /estimate)
    await expect(page.getByRole('button', { name: /Chat with Emma/i })).not.toBeVisible();
  });

  test('widget is hidden on /visualizer page', async ({ page }) => {
    await page.goto('/visualizer');
    await page.waitForTimeout(3000);
    await expect(page.getByRole('button', { name: /Chat with Emma/i })).not.toBeVisible();
  });

  test('widget is visible on /services page', async ({ page }) => {
    await page.goto('/services');
    const fab = page.getByRole('button', { name: /Chat with Emma/i });
    await expect(fab).toBeVisible({ timeout: 10000 });
  });
});
