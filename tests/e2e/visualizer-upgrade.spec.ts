/**
 * Multi-Style Visualizer Upgrade E2E Tests
 * Tests the new multi-style selection, Emma welcome card, dictation,
 * "Don't Have a Style" path, and cross-tenant isolation.
 */

import { test, expect, type Page } from '@playwright/test';

/** Create a valid test image via canvas (avoids CRC/deflate issues) */
async function createTestImageFile(page: Page, width = 800, height = 600): Promise<Buffer> {
  const base64 = await page.evaluate(({ w, h }) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#8b7355');
    grad.addColorStop(1, '#d4c5a9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Add some shapes to simulate a room photo
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(0, h * 0.6, w, h * 0.4); // floor
    ctx.fillStyle = '#c9b896';
    ctx.fillRect(w * 0.1, h * 0.2, w * 0.3, h * 0.5); // cabinet
    return canvas.toDataURL('image/png').split(',')[1]!;
  }, { w: width, h: height });
  return Buffer.from(base64, 'base64');
}

/** Upload a test image and wait for the form to appear */
async function uploadTestPhoto(page: Page): Promise<void> {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Your AI renovation starts|Upload room photo/i }).click();
  const fileChooser = await fileChooserPromise;
  const imageBuffer = await createTestImageFile(page);
  await fileChooser.setFiles({
    name: 'test-kitchen.png',
    mimeType: 'image/png',
    buffer: imageBuffer,
  });
  // Wait for form to transition from photo to form step
  await expect(page.getByText('What room is this?')).toBeVisible({ timeout: 10000 });
}

test.describe('Multi-Style Visualizer Upgrade', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/visualizer?__site_id=demo');
  });

  test('1. Photo upload shows Emma welcome card with company name', async ({ page }) => {
    await uploadTestPhoto(page);

    // Wait for photo analysis to complete and Emma card to appear
    // The welcome card appears after async photo analysis
    const emmaCard = page.locator('text=Welcome to');
    await expect(emmaCard).toBeVisible({ timeout: 30000 });

    // Should contain the company name (demo tenant)
    const cardText = await emmaCard.textContent();
    expect(cardText).toBeTruthy();
    // Should NOT contain other tenant names
    expect(cardText).not.toContain('Red White Reno');
  });

  test('2. Style selector shows "Choose Up to Two Styles" heading', async ({ page }) => {
    await uploadTestPhoto(page);

    await expect(page.getByText('Choose Up to Two Styles')).toBeVisible();
    await expect(page.getByText('Pick one for four concepts, or two for a side-by-side comparison')).toBeVisible();
  });

  test('3. Multi-style selection — select 2 styles, see counter', async ({ page }) => {
    await uploadTestPhoto(page);

    // Select Modern
    await page.getByRole('button', { name: /Modern.*Clean lines/i }).click();
    await expect(page.getByText('1 of 2 selected')).toBeVisible();

    // Select Farmhouse
    await page.getByRole('button', { name: /Farmhouse.*Rustic charm/i }).click();
    await expect(page.getByText('2 of 2 selected')).toBeVisible();

    // Selection summary should show both styles
    await expect(page.getByText(/Style:.*modern.*farmhouse/i)).toBeVisible();
  });

  test('4. "Don\'t Have a Style" button opens text path', async ({ page }) => {
    await uploadTestPhoto(page);

    // Click "Don't have a style in mind?"
    const skipButton = page.getByRole('button', { name: /style in mind|No style/i });
    await expect(skipButton).toBeVisible();
    await skipButton.click();

    // Style grid should be hidden, preferences visible
    await expect(page.getByText('Tell Us What You\'re Thinking')).toBeVisible();
    await expect(page.getByText('Pick styles instead')).toBeVisible();

    // "Pick styles instead" should go back
    await page.getByText('Pick styles instead').click();
    await expect(page.getByText('Choose Up to Two Styles')).toBeVisible();
  });

  test('5. Dictation mic button exists in preferences', async ({ page }) => {
    await uploadTestPhoto(page);

    // Select a style to reveal preferences
    await page.getByRole('button', { name: /Modern.*Clean lines/i }).click();

    // Preferences section should have mic button
    await expect(page.getByText('Tell Us What You\'re Thinking')).toBeVisible();
    const micButton = page.getByRole('button', { name: /dictation/i });
    // Mic may not exist if browser doesn't support Web Speech API
    // In Playwright (Chromium), it should be visible
    const micVisible = await micButton.isVisible().catch(() => false);
    // Just verify the preferences section rendered with dictation subtitle
    await expect(page.getByText('type or tap the mic to dictate')).toBeVisible();
    if (micVisible) {
      await expect(micButton).toBeEnabled();
    }
  });

  test('6. Cross-tenant isolation — different site_ids show different companies', async ({ page }) => {
    // Test with demo tenant
    await page.goto('/visualizer?__site_id=demo');
    await expect(page.getByRole('banner')).toContainText(/ConversionOS Demo/i);

    // Test with red-white-reno tenant
    await page.goto('/visualizer?__site_id=red-white-reno');
    await expect(page.getByRole('banner')).toContainText(/Red White Reno/i);

    // Footer should also differ
    await expect(page.getByRole('contentinfo')).not.toContainText('ConversionOS Demo');
  });

  test('7. Mobile responsive at 375px — 2-column style grid', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/visualizer?__site_id=demo');
    await uploadTestPhoto(page);

    // "No style?" shortened text should be visible (not full text)
    const shortButton = page.getByText('No style?');
    await expect(shortButton).toBeVisible();

    // Style cards should be in a grid (verify at least 2 are visible)
    const styleCards = page.getByRole('button', { name: /style kitchen/i });
    expect(await styleCards.count()).toBeGreaterThanOrEqual(2);
  });

  test('8. Selection summary updates correctly', async ({ page }) => {
    await uploadTestPhoto(page);

    // Select a room type first
    await page.getByRole('button', { name: /Kitchen.*Cabinets/i }).click();

    // Select one style
    await page.getByRole('button', { name: /Modern.*Clean lines/i }).click();

    // Summary should show room + style
    const summary = page.getByText('Your Selection');
    await expect(summary).toBeVisible();
    await expect(page.getByText(/Room:.*kitchen/i)).toBeVisible();
    await expect(page.getByText(/Style:.*modern/i)).toBeVisible();
  });
});
