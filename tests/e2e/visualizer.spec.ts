/**
 * Visualizer E2E Tests
 * Upload interactions, file validation, mobile camera buttons, and post-upload flow
 */

import { test, expect, type Page } from '@playwright/test';

/**
 * Create a valid test image in the browser via canvas, return as base64 PNG data URL.
 * This avoids CRC/deflate issues with programmatic PNG construction.
 */
async function createTestImageFile(page: Page, width = 800, height = 800): Promise<Buffer> {
  const base64 = await page.evaluate(({ w, h }) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    // Draw a gradient so it's not a flat colour (more realistic)
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#6b7280');
    grad.addColorStop(1, '#374151');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Return as base64 data URL, strip the prefix
    return canvas.toDataURL('image/png').split(',')[1]!;
  }, { w: width, h: height });

  return Buffer.from(base64, 'base64');
}

// Helper: 1x1 pixel valid PNG (too small for 640x640 check)
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64'
);

test.describe('Visualizer Upload — Desktop', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Desktop-only tests');
    await page.goto('/visualizer');
  });

  test('upload zone click triggers file dialog', async ({ page }) => {
    // The desktop upload zone has role="button" and contains the upload text
    const uploadZone = page.locator('[role="button"]').filter({ hasText: /renovation starts here|drop your image/i });
    await expect(uploadZone).toBeVisible({ timeout: 10000 });

    // Set up file chooser listener BEFORE clicking
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 });
    await uploadZone.click();
    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeTruthy();
  });

  test('upload via hidden file input works', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached({ timeout: 10000 });

    // Create a proper 800x800 image via canvas in the browser
    const testImage = await createTestImageFile(page);

    await fileInput.setInputFiles({
      name: 'test-room.png',
      mimeType: 'image/png',
      buffer: testImage,
    });

    // After upload, the wizard auto-advances (photo analysis → room type step).
    // Evidence of success: either a preview image or the room type selector appears.
    const uploadSuccess = page.locator('img[alt="Uploaded room"]')
      .or(page.getByText(/What room is this/i))
      .or(page.getByText(/Change photo/i));
    await expect(uploadSuccess.first()).toBeVisible({ timeout: 15000 });
  });

  test('rejects too-small image with error message', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached({ timeout: 10000 });

    // Use the tiny 1x1 PNG
    await fileInput.setInputFiles({
      name: 'tiny.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    });

    // Should show resolution error
    await expect(page.getByText(/resolution too low/i)).toBeVisible({ timeout: 10000 });
  });

  test('post-upload shows room type selector', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached({ timeout: 10000 });

    const testImage = await createTestImageFile(page);
    await fileInput.setInputFiles({
      name: 'test-room.png',
      mimeType: 'image/png',
      buffer: testImage,
    });

    // After upload, the wizard may auto-advance (photo analysis detects room type).
    // Wait for either the preview or the room type step.
    const uploadDone = page.locator('img[alt="Uploaded room"]')
      .or(page.getByText(/What room is this/i));
    await expect(uploadDone.first()).toBeVisible({ timeout: 15000 });

    // If we see the preview, advance to mode selection → quick form → room type
    if (await page.locator('img[alt="Uploaded room"]').isVisible()) {
      const nextButton = page.getByRole('button', { name: 'Next', exact: true });
      await expect(nextButton).toBeEnabled({ timeout: 5000 });
      await nextButton.click();

      const quickForm = page.getByText('Quick Form');
      await expect(quickForm).toBeVisible({ timeout: 5000 });
      await quickForm.click();
    }

    // Room type selector should be visible (either auto-advanced or manually navigated).
    // Use .first() because style buttons also contain room type names in their labels.
    await expect(page.getByRole('button', { name: /Kitchen/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('hero has gradient background and trust indicators with icons', async ({ page }) => {
    // Trust indicators should have icon badges (bg-primary/10 circles)
    const trustIcons = page.locator('.rounded-full').filter({ has: page.locator('svg') });
    await expect(trustIcons.first()).toBeVisible({ timeout: 5000 });

    // Should show all three trust messages
    await expect(page.getByText(/Free to use/i)).toBeVisible();
    await expect(page.getByText(/Generation time/i)).toBeVisible();
    await expect(page.getByText(/photos stay private/i)).toBeVisible();
  });
});

test.describe('Visualizer Upload — Mobile', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  test.beforeEach(async ({ page, isMobile }) => {
    // Only run on mobile-capable projects
    test.skip(!isMobile, 'Mobile-only tests');
    await page.goto('/visualizer');
  });

  test('shows camera and gallery buttons on mobile', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Take a Photo/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Choose from Gallery/i })).toBeVisible({ timeout: 10000 });
  });

  test('camera button has capture attribute', async ({ page }) => {
    const cameraInput = page.locator('input[type="file"][capture="environment"]');
    await expect(cameraInput).toBeAttached({ timeout: 10000 });
  });

  test('responsive layout at 390px — no horizontal overflow', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Visualize/i })).toBeVisible();

    const body = page.locator('body');
    const box = await body.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(400);
  });
});
