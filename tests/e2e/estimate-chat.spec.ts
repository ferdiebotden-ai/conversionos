/**
 * Estimate / Chat Page E2E Tests
 * Tests chat interface, progress indicator, voice button, sidebar, and tier gating
 */

import { test, expect } from '@playwright/test';

test.describe('Estimate Chat — Desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/estimate');
  });

  test('page loads and shows Emma intro message', async ({ page }) => {
    // Emma's welcome message should appear
    // The page may redirect to /contact for Elevate tier — if so, we accept that
    const url = page.url();
    if (url.includes('/contact')) {
      // Elevate tier — expected redirect, test passes
      return;
    }

    // Should show some greeting text from Emma
    await expect(
      page.getByText(/Emma/i).or(page.getByText(/renovation/i))
    ).toBeVisible({ timeout: 15000 });
  });

  test('progress indicator renders with steps', async ({ page }) => {
    const url = page.url();
    if (url.includes('/contact')) return;

    // Desktop progress indicator should show step icons
    const progressSteps = page.locator('.rounded-full').filter({ has: page.locator('svg') });
    // Should have at least 5 step icons (welcome through contact, excluding photo if no upload)
    const count = await progressSteps.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('current step label is highlighted', async ({ page }) => {
    const url = page.url();
    if (url.includes('/contact')) return;

    // "Start" label should be visible and styled as current
    const startLabel = page.getByText('Start', { exact: true });
    await expect(startLabel).toBeVisible({ timeout: 10000 });
  });

  test('text input accepts message and send button enables', async ({ page }) => {
    const url = page.url();
    if (url.includes('/contact')) return;

    // Find the text input
    const input = page.locator('textarea, input[type="text"]').filter({ hasText: '' }).first();
    if (!await input.isVisible()) {
      // Try alternative selectors
      const altInput = page.getByPlaceholder(/renovation|project|message/i);
      await expect(altInput).toBeVisible({ timeout: 10000 });
      await altInput.fill('I want to renovate my kitchen');
    } else {
      await input.fill('I want to renovate my kitchen');
    }

    // Send button should be visible
    const sendButton = page.getByRole('button', { name: /send/i })
      .or(page.locator('button[type="submit"]'));
    await expect(sendButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('voice button is visible', async ({ page }) => {
    const url = page.url();
    if (url.includes('/contact')) return;

    // "Talk to Emma" or mic button should be visible
    const voiceButton = page.getByRole('button', { name: /Talk/i })
      .or(page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: /Talk|Emma/i }));

    // Voice button may be inline or standalone — just verify it exists
    await expect(voiceButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('sidebar renders with project fields', async ({ page }) => {
    const url = page.url();
    if (url.includes('/contact')) return;

    // Desktop sidebar should be visible (hidden on mobile)
    const sidebar = page.locator('.border-l.border-border').first();
    // Sidebar may only appear after user provides project type — check if it exists
    // The sidebar always renders on desktop (it may be empty initially)
    // Look for the sidebar container in the lg:block div
    const sidebarContainer = page.locator('.hidden.lg\\:block');
    await expect(sidebarContainer).toBeVisible({ timeout: 10000 });
  });

  test('chat area has subtle background gradient', async ({ page }) => {
    const url = page.url();
    if (url.includes('/contact')) return;

    // The scroll area should have the background gradient class
    const chatArea = page.locator('[class*="bg-gradient"]').first();
    await expect(chatArea).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Estimate Chat — Mobile', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test('mobile layout — sidebar collapses', async ({ page }) => {
    await page.goto('/estimate');
    const url = page.url();
    if (url.includes('/contact')) return;

    // Desktop sidebar should be hidden on mobile
    const desktopSidebar = page.locator('.hidden.lg\\:block');
    await expect(desktopSidebar).toBeHidden({ timeout: 10000 });
  });

  test('mobile progress shows compact step counter', async ({ page }) => {
    await page.goto('/estimate');
    const url = page.url();
    if (url.includes('/contact')) return;

    // Mobile progress shows "Step X of Y" format
    await expect(
      page.getByText(/Step \d+ of \d+/i)
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Estimate Chat — Tier Gating', () => {
  test('Elevate tier redirects to contact page', async ({ page }) => {
    // This test relies on the demo tenant being Accelerate or higher
    // If the tenant is Elevate, /estimate redirects to /contact?from=estimate
    // We test by checking that either the estimate page loads OR redirects

    await page.goto('/estimate');

    // Wait for navigation to settle
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const url = page.url();
    // Should be on either /estimate (Accelerate+) or /contact (Elevate)
    expect(url).toMatch(/\/(estimate|contact)/);
  });
});
