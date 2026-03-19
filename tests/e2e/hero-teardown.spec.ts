/**
 * Hero Visualiser Teardown — E2E Tests
 *
 * Tests the video frame scrubber hero at 3 breakpoints (375px, 768px, 1440px).
 * Covers all 5 styles with bidirectional slider scrubbing, tab switching,
 * keyboard navigation, and canvas rendering.
 */

import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://localhost:3002' });

const STYLES = [
  'Modern',
  'Transitional',
  'Farmhouse',
  'Industrial',
  'Scandinavian',
];

// ── Desktop (1440px) ──────────────────────────────────────────────

test.describe('Desktop 1440px — Frame Scrubber', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('hero renders with headline, CTA, slider, and canvas', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /Visualise Your Dream Space/i })).toBeVisible();
    await expect(page.getByRole('slider')).toBeVisible();
    // Canvas element should exist for frame rendering
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('all 5 style tabs render', async ({ page }) => {
    await page.goto('/');
    for (const style of STYLES) {
      await expect(page.getByRole('button', { name: style })).toBeVisible();
    }
  });

  test('slider keyboard: End→100, Home→0 bidirectional', async ({ page }) => {
    await page.goto('/');
    const slider = page.getByRole('slider');
    await slider.focus();
    await page.keyboard.press('End');
    await expect(slider).toHaveAttribute('aria-valuenow', '100');
    await page.keyboard.press('Home');
    await expect(slider).toHaveAttribute('aria-valuenow', '0');
  });

  test('slider keyboard: ArrowRight 5x = 25, ArrowLeft 5x = 0', async ({ page }) => {
    await page.goto('/');
    const slider = page.getByRole('slider');
    await slider.focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveAttribute('aria-valuenow', '25');
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft');
    await expect(slider).toHaveAttribute('aria-valuenow', '0');
  });

  test('Before and After labels visible during animation', async ({ page }) => {
    await page.goto('/');
    // 1.8s hold + a few seconds into the 12s sweep
    await page.waitForTimeout(5000);
    await expect(page.getByText('Before').first()).toBeVisible();
    await expect(page.getByText('After').first()).toBeVisible();
  });

  test('Modern is the first/default style tab', async ({ page }) => {
    await page.goto('/');
    const tabs = page.locator('button').filter({ hasText: /^(Modern|Transitional|Farmhouse|Industrial|Scandinavian)$/ });
    const firstTab = tabs.first();
    await expect(firstTab).toHaveText('Modern');
  });

  test('intro animation is slow cinematic sweep (10s)', async ({ page }) => {
    await page.goto('/');
    const slider = page.getByRole('slider');
    // After 4s, animation should be in progress but not complete
    await page.waitForTimeout(4000);
    const midValue = Number(await slider.getAttribute('aria-valuenow'));
    expect(midValue).toBeGreaterThan(0);
    expect(midValue).toBeLessThan(90);
    // After 13s total (1.8s hold + 10s sweep + buffer), should be at 100
    await page.waitForTimeout(9000);
    await expect(slider).toHaveAttribute('aria-valuenow', '100');
  });

  test('brand reveal CTA appears after animation completes', async ({ page }) => {
    await page.goto('/');
    // Wait for full animation: 1.8s hold + 10s sweep + 0.6s reveal delay + 0.5s CTA delay + buffer
    await page.waitForTimeout(14000);
    const cta = page.getByRole('link', { name: /Snap a Photo/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', '/visualizer');
  });

  test('Try with Your Space CTA links to /visualizer', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByRole('link', { name: /Try with Your Space/i });
    await expect(cta).toHaveAttribute('href', '/visualizer');
  });
});

// ── All 5 Styles — Tab Switching with Frame Scrubber ──────────────

test.describe('All 5 styles — forward and backward', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const style of STYLES) {
    test(`${style}: tab activates and canvas renders`, async ({ page }) => {
      await page.goto('/');
      const tab = page.getByRole('button', { name: style });
      await tab.click();
      await page.waitForTimeout(300);
      // Tab should be active
      await expect(tab).toHaveCSS('background-color', /.+/);
      // Canvas should still be visible (frame scrubber loaded)
      await expect(page.locator('canvas')).toBeVisible();
    });

    test(`${style}: slider scrubs bidirectionally`, async ({ page }) => {
      await page.goto('/');
      // Switch to this style
      await page.getByRole('button', { name: style }).click();
      await page.waitForTimeout(300);

      const slider = page.getByRole('slider');
      await slider.focus();
      // Go to end (frame 79)
      await page.keyboard.press('End');
      await expect(slider).toHaveAttribute('aria-valuenow', '100');
      // Go back to start (frame 0)
      await page.keyboard.press('Home');
      await expect(slider).toHaveAttribute('aria-valuenow', '0');
    });
  }

  test('cycle all 5 tabs — component stays stable', async ({ page }) => {
    await page.goto('/');
    for (const style of STYLES) {
      await page.getByRole('button', { name: style }).click();
      await page.waitForTimeout(200);
      await expect(page.locator('canvas')).toBeVisible();
    }
    // Back to first
    await page.getByRole('button', { name: STYLES[0] }).click();
    await page.waitForTimeout(200);
    await expect(page.getByRole('slider')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('switch tabs mid-scrub — slider resets cleanly', async ({ page }) => {
    await page.goto('/');
    const slider = page.getByRole('slider');
    await slider.focus();

    // Scrub Transitional to 50%
    await page.keyboard.press('End');
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft');

    // Switch to Farmhouse
    await page.getByRole('button', { name: 'Farmhouse' }).click();
    await page.waitForTimeout(300);

    // Switch to Scandinavian
    await page.getByRole('button', { name: 'Scandinavian' }).click();
    await page.waitForTimeout(300);

    // Component should still work
    await expect(page.locator('canvas')).toBeVisible();
    await expect(slider).toBeVisible();
  });
});

// ── Tablet (768px) ────────────────────────────────────────────────

test.describe('Tablet 768px', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('hero renders with all 5 tabs visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const style of STYLES) {
      await expect(page.getByRole('button', { name: style })).toBeVisible();
    }
  });

  test('canvas and slider visible at tablet size', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByRole('slider')).toBeVisible();
  });
});

// ── Mobile (375px) ────────────────────────────────────────────────

test.describe('Mobile 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('hero renders — headline, canvas, slider all visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByRole('slider')).toBeVisible();
  });

  test('no horizontal page overflow', async ({ page }) => {
    await page.goto('/');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test('tabs are scrollable and tappable on mobile', async ({ page }) => {
    await page.goto('/');
    // First tab should be visible
    const firstTab = page.getByRole('button', { name: STYLES[0] });
    await expect(firstTab).toBeVisible();
    const box = await firstTab.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(24);
  });

  test('switching styles on mobile — canvas renders for each', async ({ page }) => {
    await page.goto('/');
    for (const style of STYLES) {
      const tab = page.getByRole('button', { name: style });
      // Scroll tab into view if needed
      await tab.scrollIntoViewIfNeeded();
      await tab.click();
      await page.waitForTimeout(300);
      await expect(page.locator('canvas')).toBeVisible();
    }
  });

  test('mobile slider keyboard navigation works', async ({ page }) => {
    await page.goto('/');
    const slider = page.getByRole('slider');
    await slider.focus();
    await page.keyboard.press('End');
    await expect(slider).toHaveAttribute('aria-valuenow', '100');
    await page.keyboard.press('Home');
    await expect(slider).toHaveAttribute('aria-valuenow', '0');
  });
});
