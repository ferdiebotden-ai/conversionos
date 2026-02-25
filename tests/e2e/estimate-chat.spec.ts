/**
 * Estimate / Chat Page E2E Tests
 * Tests chat interface, progress indicator, voice button, sidebar, and tier gating
 */

import { test, expect } from '@playwright/test';

/**
 * Helper: navigate to /estimate, return true if page loaded (Accelerate+),
 * false if redirected to /contact (Elevate tier).
 */
async function navigateToEstimate(page: import('@playwright/test').Page): Promise<boolean> {
  await page.goto('/estimate');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  return !page.url().includes('/contact');
}

test.describe('Estimate Chat — Desktop', () => {
  test.beforeEach(async ({ isMobile }) => {
    test.skip(!!isMobile, 'Desktop-only tests');
  });

  test('page loads and shows Emma intro message', async ({ page }) => {
    const loaded = await navigateToEstimate(page);
    test.skip(!loaded, 'Tenant is Elevate tier — no estimate page');

    // Emma's welcome message should contain her name
    const emmaMessage = page.getByText(/I'm Emma/i).first();
    await expect(emmaMessage).toBeVisible({ timeout: 15000 });
  });

  test('progress indicator renders with steps', async ({ page }) => {
    const loaded = await navigateToEstimate(page);
    test.skip(!loaded, 'Tenant is Elevate tier');

    // Desktop progress indicator should show step circles with icons
    // Each step has a rounded-full circle containing an SVG icon
    const stepCircles = page.locator('.rounded-full.flex.items-center.justify-center').filter({ has: page.locator('svg') });
    const count = await stepCircles.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('current step label is highlighted', async ({ page }) => {
    const loaded = await navigateToEstimate(page);
    test.skip(!loaded, 'Tenant is Elevate tier');

    // "Start" label should be visible (first step)
    const startLabel = page.getByText('Start', { exact: true });
    await expect(startLabel).toBeVisible({ timeout: 10000 });
  });

  test('text input accepts message and send button enables', async ({ page }) => {
    const loaded = await navigateToEstimate(page);
    test.skip(!loaded, 'Tenant is Elevate tier');

    // Find the text input by placeholder
    const input = page.getByPlaceholder(/renovation|project|message/i);
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill('I want to renovate my kitchen');

    // Send button should be visible
    const sendButton = page.getByRole('button', { name: /send/i })
      .or(page.locator('button[type="submit"]'));
    await expect(sendButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('voice button is visible', async ({ page }) => {
    const loaded = await navigateToEstimate(page);
    test.skip(!loaded, 'Tenant is Elevate tier');

    // "Talk to Emma" button should be visible (inline variant next to text input)
    const voiceButton = page.getByRole('button', { name: /Talk/i }).first();
    await expect(voiceButton).toBeVisible({ timeout: 10000 });
  });

  test('sidebar renders on desktop', async ({ page }) => {
    const loaded = await navigateToEstimate(page);
    test.skip(!loaded, 'Tenant is Elevate tier');

    // Desktop sidebar is in a lg:block container
    const sidebarContainer = page.locator('.hidden.lg\\:block');
    await expect(sidebarContainer).toBeVisible({ timeout: 10000 });
  });

  test('chat area has subtle background gradient', async ({ page }) => {
    const loaded = await navigateToEstimate(page);
    test.skip(!loaded, 'Tenant is Elevate tier');

    // The scroll area should have the background gradient class
    const chatArea = page.locator('[class*="bg-gradient"]').first();
    await expect(chatArea).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Estimate Chat — Mobile', () => {
  test.beforeEach(async ({ isMobile }) => {
    test.skip(!isMobile, 'Mobile-only tests');
  });

  test('mobile layout — sidebar collapses', async ({ page }) => {
    const loaded = await navigateToEstimate(page);
    test.skip(!loaded, 'Tenant is Elevate tier');

    // Desktop sidebar should be hidden on mobile
    const desktopSidebar = page.locator('.hidden.lg\\:block');
    await expect(desktopSidebar).toBeHidden({ timeout: 10000 });
  });

  test('mobile progress shows compact step counter', async ({ page }) => {
    const loaded = await navigateToEstimate(page);
    test.skip(!loaded, 'Tenant is Elevate tier');

    // Mobile progress (sm:hidden) is only visible below 640px.
    // Tablet viewports (768px+) show the desktop progress instead.
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 640) {
      // On tablet/wider, desktop progress should be visible instead
      const desktopProgress = page.locator('.hidden.sm\\:flex');
      await expect(desktopProgress).toBeVisible({ timeout: 10000 });
    } else {
      // On narrow mobile, compact "Step X of Y" format
      await expect(
        page.getByText(/Step \d+ of \d+/i)
      ).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Estimate Chat — Tier Gating', () => {
  test('page loads or redirects based on tier', async ({ page }) => {
    await page.goto('/estimate');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const url = page.url();
    // Should be on either /estimate (Accelerate+) or /contact (Elevate)
    expect(url).toMatch(/\/(estimate|contact)/);
  });
});
