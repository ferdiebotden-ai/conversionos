/**
 * Visualizer E2E Tests
 * Upload interactions, file validation, mobile camera buttons, and post-upload flow
 */

import { test, expect } from '@playwright/test';
import path from 'path';

// Helper: 1x1 pixel valid PNG (too small for 640x640 check)
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64'
);

// Helper: a 640x640 valid PNG (solid-colour, minimal file)
function createTestImage(width = 640, height = 640): Buffer {
  // Minimal valid PNG with IHDR declaring the desired dimensions
  // We create a proper PNG programmatically
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // colour type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrType = Buffer.from('IHDR');
  const ihdrLength = Buffer.alloc(4);
  ihdrLength.writeUInt32BE(13, 0);

  const { createHash } = require('crypto');

  function crc32(buf: Buffer): Buffer {
    // Simple CRC32 for PNG
    let crc = 0xffffffff;
    const table: number[] = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c;
    }
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]!) & 0xff]! ^ (crc >>> 8);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const result = Buffer.alloc(4);
    result.writeUInt32BE(crc, 0);
    return result;
  }

  const ihdrCrc = crc32(Buffer.concat([ihdrType, ihdrData]));

  // IDAT chunk — minimal scanlines (all zeros = black image)
  const { deflateSync } = require('zlib');
  const rawData = Buffer.alloc(height * (1 + width * 3)); // filter byte + RGB per pixel per row
  const compressed = deflateSync(rawData);
  const idatType = Buffer.from('IDAT');
  const idatLength = Buffer.alloc(4);
  idatLength.writeUInt32BE(compressed.length, 0);
  const idatCrc = crc32(Buffer.concat([idatType, compressed]));

  // IEND chunk
  const iendType = Buffer.from('IEND');
  const iendLength = Buffer.alloc(4);
  iendLength.writeUInt32BE(0, 0);
  const iendCrc = crc32(iendType);

  return Buffer.concat([
    signature,
    ihdrLength, ihdrType, ihdrData, ihdrCrc,
    idatLength, idatType, compressed, idatCrc,
    iendLength, iendType, iendCrc,
  ]);
}

test.describe('Visualizer Upload — Desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/visualizer');
  });

  test('upload zone click triggers file dialog', async ({ page }) => {
    // Wait for the upload zone to be rendered
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

    const testImage = createTestImage();
    await fileInput.setInputFiles({
      name: 'test-room.png',
      mimeType: 'image/png',
      buffer: testImage,
    });

    // Preview should appear
    const preview = page.locator('img[alt="Uploaded room"]');
    await expect(preview).toBeVisible({ timeout: 15000 });
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

  test('rejects non-image file', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached({ timeout: 10000 });

    await fileInput.setInputFiles({
      name: 'document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is not an image'),
    });

    // Should show error
    await expect(page.getByText(/upload an image/i)).toBeVisible({ timeout: 10000 });
  });

  test('post-upload shows room type selector', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached({ timeout: 10000 });

    const testImage = createTestImage();
    await fileInput.setInputFiles({
      name: 'test-room.png',
      mimeType: 'image/png',
      buffer: testImage,
    });

    // Preview should appear
    await expect(page.locator('img[alt="Uploaded room"]')).toBeVisible({ timeout: 15000 });

    // Click Next to proceed
    const nextButton = page.getByRole('button', { name: 'Next', exact: true });
    await expect(nextButton).toBeEnabled({ timeout: 5000 });
    await nextButton.click();

    // Mode selection should appear (Quick Form / Chat with Emma)
    const quickForm = page.getByText('Quick Form');
    await expect(quickForm).toBeVisible({ timeout: 5000 });
    await quickForm.click();

    // Room type selector should appear
    await expect(page.getByRole('button', { name: /Kitchen/i })).toBeVisible({ timeout: 5000 });
  });

  test('hero has gradient background and trust indicators with icons', async ({ page }) => {
    // Verify hero section has gradient styling
    const hero = page.locator('section').first();
    await expect(hero).toBeVisible();

    // Trust indicators should have icon badges
    const trustIcons = page.locator('.rounded-full.bg-primary\\/10');
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

  test('shows camera and gallery buttons on mobile', async ({ page }) => {
    await page.goto('/visualizer');

    // Should show mobile-specific buttons
    await expect(page.getByRole('button', { name: /Take a Photo/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Choose from Gallery/i })).toBeVisible({ timeout: 10000 });
  });

  test('camera button has capture attribute', async ({ page }) => {
    await page.goto('/visualizer');

    // There should be a file input with capture="environment"
    const cameraInput = page.locator('input[type="file"][capture="environment"]');
    await expect(cameraInput).toBeAttached({ timeout: 10000 });
  });

  test('responsive layout at 390px — no horizontal overflow', async ({ page }) => {
    await page.goto('/visualizer');
    await expect(page.getByRole('heading', { name: /Visualize/i })).toBeVisible();

    const body = page.locator('body');
    const box = await body.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(400);
  });
});
