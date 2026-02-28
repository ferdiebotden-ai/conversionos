/**
 * Live Design Refinement — E2E Tests
 * Tests the rendering panel on the estimate page, including:
 * - Panel appearance with starred concepts
 * - Panel absence without starred concepts
 * - Enlarge dialog
 * - Generating state
 * - Submit CTA remains visible alongside panel
 */

import { test, expect } from '@playwright/test';

// Mock visualization data with starred concept
const MOCK_VISUALIZATION = {
  id: 'test-viz-id',
  room_type: 'kitchen',
  style: 'modern',
  original_photo_url: '/images/demo/before-kitchen.png',
  generated_concepts: [
    { id: 'c1', imageUrl: '/images/demo/bathroom-modern.png', description: 'Modern kitchen concept 1' },
    { id: 'c2', imageUrl: '/images/demo/bathroom-transitional.png', description: 'Modern kitchen concept 2' },
  ],
  conversation_context: {
    clientFavouritedConcepts: [0],
  },
  photo_analysis: null,
  concept_pricing: null,
  constraints: null,
  generation_time_ms: 12000,
  share_token: 'abc123',
  source: 'visualizer',
  device_type: 'desktop',
  user_agent: null,
  site_id: 'demo',
  created_at: new Date().toISOString(),
};

// Mock refine API response
const MOCK_REFINE_RESPONSE = {
  imageUrl: '/images/demo/bathroom-modern.png',
  description: 'quartz countertops, open concept layout',
  refinementNumber: 1,
  generationTimeMs: 15000,
};

test.describe('Live Design Refinement', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the refine API to avoid real Gemini calls
    await page.route('**/api/ai/visualize/refine', async (route) => {
      // Simulate generation time
      await new Promise(r => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_REFINE_RESPONSE),
      });
    });

    // Mock the visualization API
    await page.route('**/api/visualizations/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_VISUALIZATION),
      });
    });

    // Mock the chat API to avoid real AI calls
    await page.route('**/api/ai/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-response',
          role: 'assistant',
          content: "Great choices! I can see your vision taking shape. Let me gather a few more details to give you an accurate estimate.",
        }),
      });
    });

    // Mock admin settings for tier check
    await page.route('**/api/admin/quote-assistance', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mode: 'range', rangeBand: 10000 }),
      });
    });
  });

  /** Helper to set handoff context with starred concept in sessionStorage */
  async function setHandoffContext(page: import('@playwright/test').Page, extra?: Record<string, unknown>) {
    await page.goto('/');
    await page.evaluate(({ vizData, extra: extraData }) => {
      const handoff = {
        fromPersona: 'design-assistant',
        toPersona: 'quote-specialist',
        fromPage: 'visualizer',
        toPage: 'estimate',
        summary: 'User wants modern kitchen renovation',
        recentMessages: [],
        visualizationData: {
          id: vizData.id,
          concepts: vizData.generated_concepts,
          originalImageUrl: vizData.original_photo_url,
          roomType: vizData.room_type,
          style: vizData.style,
        },
        clientFavouritedConcepts: [0],
        timestamp: Date.now(),
        ...extraData,
      };
      sessionStorage.setItem('demo_handoff_context', JSON.stringify(handoff));
    }, { vizData: MOCK_VISUALIZATION, extra: extra ?? {} });
  }

  /** Navigate to estimate and skip if Elevate tier */
  async function gotoEstimate(page: import('@playwright/test').Page) {
    await page.goto('/estimate');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    if (page.url().includes('/contact')) {
      test.skip(true, 'Tenant is Elevate tier');
    }
  }

  test('rendering panel appears with starred concept on estimate page (desktop)', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Desktop-only test');

    await setHandoffContext(page);
    await gotoEstimate(page);

    // Desktop panel visible via data-testid
    const desktopPanel = page.getByTestId('rendering-panel-desktop');
    await expect(desktopPanel).toBeVisible({ timeout: 10000 });
    await expect(desktopPanel.getByText('Your Vision')).toBeVisible();

    // Image should be present
    await expect(desktopPanel.getByAltText('Your design concept')).toBeVisible();
  });

  test('panel does not appear without starred concept', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Desktop-only test');

    // Navigate to estimate without handoff context
    await page.goto('/estimate');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    if (page.url().includes('/contact')) {
      test.skip(true, 'Tenant is Elevate tier');
      return;
    }

    // Panel should not exist (no starred concept → currentRendering is null → not rendered)
    await expect(page.getByTestId('rendering-panel-desktop')).not.toBeVisible({ timeout: 5000 });
  });

  test('enlarge button opens full-size rendering dialog', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Desktop-only test');

    await setHandoffContext(page);
    await gotoEstimate(page);

    // Wait for desktop panel
    const desktopPanel = page.getByTestId('rendering-panel-desktop');
    await expect(desktopPanel).toBeVisible({ timeout: 10000 });

    // Click enlarge button
    const enlargeButton = desktopPanel.getByLabel('Enlarge rendering');
    await expect(enlargeButton).toBeVisible();
    await enlargeButton.click();

    // Dialog should appear with full image
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText('Your Design Vision')).toBeVisible();
    await expect(dialog.getByAltText('Your refined design concept')).toBeVisible();
  });

  test('estimate sidebar remains accessible alongside rendering panel', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'Desktop-only test');

    await setHandoffContext(page, {
      designPreferences: { roomType: 'kitchen', style: 'modern', textPreferences: '' },
    });
    await gotoEstimate(page);

    // Desktop rendering panel visible
    await expect(page.getByTestId('rendering-panel-desktop')).toBeVisible({ timeout: 10000 });

    // Estimate sidebar ("Your Project") should also be visible below the panel
    await expect(page.getByText('Your Project', { exact: true })).toBeVisible();
  });

  test('mobile rendering panel shows compact card', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test');

    await setHandoffContext(page);
    await gotoEstimate(page);

    // Mobile panel visible via data-testid
    const mobilePanel = page.getByTestId('rendering-panel-mobile');
    await expect(mobilePanel).toBeVisible({ timeout: 10000 });
    await expect(mobilePanel.getByText('Your Vision')).toBeVisible();
  });
});
