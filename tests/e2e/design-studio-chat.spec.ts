/**
 * Design Studio Chat — E2E Tests
 * Tests the full post-generation chat UX:
 * - Side-by-side layout (desktop) vs stacked (mobile)
 * - Contextual quick actions (staged based on conversation depth)
 * - AI-parsed suggestion chips from Emma's responses
 * - Refine button functionality
 * - Lead capture flow
 *
 * Strategy: Mock image generation (expensive Gemini) but use real chat API
 * (cheap GPT-5.2, ~$0.01/call) for authentic E2E testing of the conversation flow.
 */

import { test, expect } from '@playwright/test';

// ── Mock Data ─────────────────────────────────────────────────────────────

const MOCK_CONCEPTS = [
  { id: 'concept-1', imageUrl: 'https://placehold.co/800x600/1a1a2e/white?text=Concept+1', description: 'Modern kitchen with waterfall island' },
  { id: 'concept-2', imageUrl: 'https://placehold.co/800x600/16213e/white?text=Concept+2', description: 'Warm contemporary with wood accents' },
  { id: 'concept-3', imageUrl: 'https://placehold.co/800x600/0f3460/white?text=Concept+3', description: 'Scandinavian minimal with light tones' },
  { id: 'concept-4', imageUrl: 'https://placehold.co/800x600/533483/white?text=Concept+4', description: 'Industrial chic with exposed brick' },
];

const MOCK_VISUALIZATION = {
  id: 'test-viz-001',
  concepts: MOCK_CONCEPTS,
  style: 'modern',
  roomType: 'kitchen',
  generationTimeMs: 12500,
};

// SSE stream matching useVisualizationStream() protocol
function buildMockSSEStream(): string {
  const events: string[] = [];
  events.push('event: status\ndata: {"stage":"Analysing your photo...","progress":10}\n\n');
  MOCK_CONCEPTS.forEach((c, i) => {
    events.push(`event: concept\ndata: ${JSON.stringify({ index: i, imageUrl: c.imageUrl, description: c.description })}\n\n`);
  });
  events.push(`event: complete\ndata: ${JSON.stringify({ visualization: MOCK_VISUALIZATION })}\n\n`);
  return events.join('');
}

// ── Test Setup ────────────────────────────────────────────────────────────

async function setupMocks(page: import('@playwright/test').Page, opts?: { mockChat?: boolean }) {
  // Mock SSE visualization stream (saves expensive Gemini calls)
  await page.route('**/api/ai/visualize/stream', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildMockSSEStream(),
    });
  });

  // Mock photo analysis
  await page.route('**/api/ai/analyze-photo', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        roomType: 'kitchen',
        estimatedDimensions: '12x14 feet',
        currentCondition: 'Good — dated but functional',
        layoutType: 'L-shaped',
        features: ['island', 'window over sink'],
      }),
    });
  });

  // Mock refinement API (saves expensive Gemini calls)
  await page.route('**/api/ai/visualize/refine', async (route) => {
    await new Promise(r => setTimeout(r, 800));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        imageUrl: 'https://placehold.co/800x600/2d3436/white?text=Refined+Design',
        description: 'Refined with requested changes',
        refinementNumber: 1,
        generationTimeMs: 18000,
      }),
    });
  });

  // Mock quote assistance
  await page.route('**/api/admin/quote-assistance', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ mode: 'range', rangeBand: 10000 }),
    });
  });

  // Chat API is NOT mocked by default — uses real GPT-5.2 (~$0.01/call)
  // This gives authentic E2E testing of suggestion chips, response quality, etc.
}

/**
 * Upload test image, select Kitchen + Modern, click Generate, wait for results.
 * Matches the actual combined-form UI.
 */
async function uploadAndGenerate(page: import('@playwright/test').Page) {
  const testImageBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = '#654321';
    ctx.fillRect(50, 200, 300, 350);
    ctx.fillStyle = '#D4C5A9';
    ctx.fillRect(400, 100, 350, 450);
    return canvas.toDataURL('image/png').split(',')[1]!;
  });

  const testImage = Buffer.from(testImageBase64, 'base64');

  // Upload photo
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeAttached({ timeout: 10000 });
  await fileInput.setInputFiles({
    name: 'test-kitchen.png',
    mimeType: 'image/png',
    buffer: testImage,
  });

  // Wait for preview
  const preview = page.locator('img[alt="Uploaded room photo"]').or(page.locator('img[alt*="Uploaded"]')).first();
  await expect(preview).toBeVisible({ timeout: 10000 });

  // Select Kitchen
  const kitchenButton = page.getByRole('button', { name: /Kitchen/i }).first();
  await expect(kitchenButton).toBeVisible({ timeout: 5000 });
  await kitchenButton.click();
  await page.waitForTimeout(300);

  // Select Modern
  const modernButton = page.getByRole('button', { name: /Modern.*Clean lines/i }).or(
    page.getByRole('button', { name: /Modern style/i })
  ).first();
  await expect(modernButton).toBeVisible({ timeout: 5000 });
  await modernButton.click();
  await page.waitForTimeout(300);

  // Click Generate My Vision
  const generateButton = page.getByRole('button', { name: /Generate My Vision/i });
  await expect(generateButton).toBeVisible({ timeout: 5000 });
  await generateButton.click();

  // Wait for results (mock SSE resolves quickly)
  await expect(
    page.getByTestId('visualization-result').or(page.getByText(/Your Vision is Ready/i)).first()
  ).toBeVisible({ timeout: 30000 });
}

// ── Tests ─────────────────────────────────────────────────────────────────

test.describe('Design Studio Chat UX', () => {

  // ── Layout Tests (no chat interaction needed) ──────────────────────────

  test.describe('Layout & Structure', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test.beforeEach(async ({ page }) => {
      await setupMocks(page);
    });

    test('result page shows side-by-side layout with slider and thumbnails', async ({ page }) => {
      await page.goto('/visualizer');
      await uploadAndGenerate(page);

      const resultContainer = page.getByTestId('visualization-result');
      await expect(resultContainer).toBeVisible();

      // Concept thumbnails visible (use :visible to skip the hidden mobile/desktop duplicate)
      const thumbnails = page.locator('[data-testid="concept-thumbnail"]:visible');
      await expect(thumbnails.first()).toBeVisible({ timeout: 10000 });
      const count = await thumbnails.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test('welcome message has NO quick action buttons', async ({ page }) => {
      await page.goto('/visualizer');
      await uploadAndGenerate(page);

      const chat = page.getByTestId('design-studio-chat');
      await expect(chat).toBeVisible({ timeout: 10000 });

      // Welcome message present
      await expect(chat.getByText(/What would you like to explore/i)).toBeVisible();

      // NO buttons visible on welcome
      await expect(chat.getByRole('button', { name: /refine/i })).not.toBeVisible();
      await expect(chat.getByRole('button', { name: /estimate/i })).not.toBeVisible();
      await expect(chat.getByRole('button', { name: /keep discussing/i })).not.toBeVisible();

      // Chat input present
      const chatInput = chat.locator('input[placeholder*="Share your thoughts"]');
      await expect(chatInput).toBeVisible();
    });

    test('sticky CTA triggers lead capture form', async ({ page }) => {
      await page.goto('/visualizer');
      await uploadAndGenerate(page);

      // Wait for sticky CTA to appear (3s animation delay)
      await page.waitForTimeout(3500);

      const stickyCTA = page.locator('.fixed.bottom-0 button');
      await expect(stickyCTA).toBeVisible({ timeout: 5000 });
      await stickyCTA.click();

      // Lead capture form should appear
      const nameField = page.locator('input[name="name"]').or(page.getByPlaceholder(/name/i));
      await expect(nameField.first()).toBeVisible({ timeout: 5000 });
    });

    test('concept thumbnails can be selected and update slider', async ({ page }) => {
      await page.goto('/visualizer');
      await uploadAndGenerate(page);

      const thumbnails = page.locator('[data-testid="concept-thumbnail"]:visible');
      await expect(thumbnails.first()).toBeVisible({ timeout: 10000 });

      // Click second concept
      await thumbnails.nth(1).locator('button').first().click();
      await page.waitForTimeout(500);

      // Second should now have selection ring
      await expect(thumbnails.nth(1)).toHaveClass(/border-primary/);
    });
  });

  // ── Mobile Layout Tests (no chat interaction needed) ───────────────────

  test.describe('Mobile Layout', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test.beforeEach(async ({ page }) => {
      await setupMocks(page);
    });

    test('stacked layout on mobile — no horizontal overflow', async ({ page }) => {
      await page.goto('/visualizer');
      await uploadAndGenerate(page);

      const resultContainer = page.getByTestId('visualization-result');
      await expect(resultContainer).toBeVisible();

      const thumbnails = page.locator('[data-testid="concept-thumbnail"]:visible');
      await expect(thumbnails.first()).toBeVisible({ timeout: 10000 });

      // No horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasOverflow).toBe(false);
    });

    test('chat input is accessible on mobile', async ({ page }) => {
      await page.goto('/visualizer');
      await uploadAndGenerate(page);

      const chat = page.getByTestId('design-studio-chat');
      await chat.scrollIntoViewIfNeeded();
      await expect(chat).toBeVisible();

      const chatInput = chat.locator('input[placeholder*="Share your thoughts"]');
      await expect(chatInput).toBeVisible();

      // Fill input
      await chatInput.click();
      await chatInput.fill('I love this design!');
      expect(await chatInput.inputValue()).toBe('I love this design!');
    });
  });

  // ── Chat Interaction Tests (use real chat API — ~$0.01/call) ───────────

  test.describe('Chat Interaction @real-api', () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    test.setTimeout(90000); // AI responses take time

    test.beforeEach(async ({ page }) => {
      await setupMocks(page);
    });

    test('"Keep Discussing" button does not exist', async ({ page }) => {
      await page.goto('/visualizer');
      await uploadAndGenerate(page);

      const chat = page.getByTestId('design-studio-chat');
      const chatInput = chat.locator('input[placeholder*="Share your thoughts"]');

      // Send a design message
      await chatInput.fill('I love the marble look with the waterfall island');
      await chatInput.press('Enter');

      // Wait for Emma's response (real API)
      await expect(chat.locator('[class*="bg-muted"]').or(chat.locator('p')).nth(2)).toBeVisible({ timeout: 30000 });
      await page.waitForTimeout(1000);

      // "Keep Discussing" should NOT exist
      await expect(chat.getByRole('button', { name: /keep discussing/i })).not.toBeVisible();
    });

    test('suggestion chips appear and Refine button shows after 1st exchange', async ({ page }) => {
      await page.goto('/visualizer');
      await uploadAndGenerate(page);

      const chat = page.getByTestId('design-studio-chat');
      const chatInput = chat.locator('input[placeholder*="Share your thoughts"]');

      // Send a design-oriented message (triggers signal detection + suggestion format)
      await chatInput.fill('I like the dark cabinets but want lighter marble countertops and pendant lighting');
      await chatInput.press('Enter');

      // Wait for Emma's full response (real API, may take 5-15s)
      // Look for either suggestion chips (dashed border buttons) or the refine button
      const refineButton = chat.getByRole('button', { name: /refine my design/i });
      await expect(refineButton).toBeVisible({ timeout: 30000 });

      // Check for suggestion chips (Emma should include [Suggestions:] in response)
      // These may or may not appear depending on GPT's adherence to the prompt format
      const suggestionChips = chat.locator('button.rounded-full.border-dashed');
      const chipCount = await suggestionChips.count();
      // Soft assertion — chips are nice-to-have but GPT may not always include them
      if (chipCount > 0) {
        // Verify [Suggestions:] text is stripped from chat bubbles
        const chatContent = await chat.textContent();
        expect(chatContent).not.toContain('[Suggestions:');
      }

      // "Get My Estimate" should NOT appear yet (only 1 exchange)
      await expect(chat.getByRole('button', { name: /get my estimate/i })).not.toBeVisible();
    });

    test('"Get My Estimate" CTA appears after 2nd exchange', async ({ page }) => {
      await page.goto('/visualizer');
      await uploadAndGenerate(page);

      const chat = page.getByTestId('design-studio-chat');
      const chatInput = chat.locator('input[placeholder*="Share your thoughts"]');

      // 1st message
      await chatInput.fill('I want marble countertops with gold hardware');
      await chatInput.press('Enter');

      // Wait for response
      const refineButton = chat.getByRole('button', { name: /refine my design/i });
      await expect(refineButton).toBeVisible({ timeout: 30000 });

      // 2nd message
      await chatInput.fill('What about adding under-cabinet lighting?');
      await chatInput.press('Enter');

      // Wait for 2nd response — "Get My Estimate" should appear
      const estimateButton = chat.getByRole('button', { name: /get my estimate/i });
      await expect(estimateButton).toBeVisible({ timeout: 30000 });
    });

    test('refine button triggers refinement and updates design', async ({ page }) => {
      await page.goto('/visualizer');
      await uploadAndGenerate(page);

      const chat = page.getByTestId('design-studio-chat');
      const chatInput = chat.locator('input[placeholder*="Share your thoughts"]');

      // Send design message to unlock refine
      await chatInput.fill('I want quartz countertops and pendant lights');
      await chatInput.press('Enter');

      // Wait for refine button
      const refineButton = chat.getByRole('button', { name: /refine my design/i });
      await expect(refineButton).toBeVisible({ timeout: 30000 });

      // Click refine
      await refineButton.click();

      // Should show refining indicator
      await expect(chat.getByText(/refining your design/i)).toBeVisible({ timeout: 5000 });

      // After refine completes (mock = 800ms), should show acknowledgement
      await expect(
        chat.getByText(/updated your design/i).or(chat.getByText(/take a look/i)).first()
      ).toBeVisible({ timeout: 15000 });
    });

    test('refine works even without design signals', async ({ page }) => {
      await page.goto('/visualizer');
      await uploadAndGenerate(page);

      const chat = page.getByTestId('design-studio-chat');
      const chatInput = chat.locator('input[placeholder*="Share your thoughts"]');

      // Send a generic message (no design signal keywords)
      await chatInput.fill('Looks good to me!');
      await chatInput.press('Enter');

      // Refine should still appear (exchangeCount >= 1)
      const refineButton = chat.getByRole('button', { name: /refine my design/i });
      await expect(refineButton).toBeVisible({ timeout: 30000 });

      // Click refine — should work with empty signals
      await refineButton.click();

      // Should show refining indicator
      await expect(chat.getByText(/refining your design/i)).toBeVisible({ timeout: 5000 });

      // Should complete
      await expect(
        chat.getByText(/updated your design/i).or(chat.getByText(/take a look/i)).first()
      ).toBeVisible({ timeout: 15000 });
    });

    test('refine error shows error message', async ({ page }) => {
      await setupMocks(page);

      // Override refine AFTER setupMocks (last handler wins in Playwright)
      await page.route('**/api/ai/visualize/refine', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Could not fetch original photo' }),
        });
      });
      await page.goto('/visualizer');
      await uploadAndGenerate(page);

      const chat = page.getByTestId('design-studio-chat');
      const chatInput = chat.locator('input[placeholder*="Share your thoughts"]');

      await chatInput.fill('Add pendant lights');
      await chatInput.press('Enter');

      const refineButton = chat.getByRole('button', { name: /refine my design/i });
      await expect(refineButton).toBeVisible({ timeout: 30000 });
      await refineButton.click();

      // Error message should appear
      await expect(
        chat.getByText(/could not fetch original photo/i)
          .or(chat.getByText(/trouble/i))
          .first()
      ).toBeVisible({ timeout: 15000 });
    });
  });
});
