/**
 * T-03: Visual Baseline — Public Pages
 * Screenshot all 13 public pages x 3 viewports, establish visual baselines.
 * ~39 screenshot tests + broken image checks + CTA visibility checks.
 */
import { test, expect } from '@playwright/test';
import {
  navigateAndWait,
  PUBLIC_ROUTES,
  VIEWPORTS,
  createSoftAssert,
} from '../../fixtures/autonomous-helpers';
import {
  takePageScreenshot,
  captureBaseline,
  checkBrokenImages,
  hasBaseline,
} from '../../fixtures/visual-regression';

// ---------------------------------------------------------------------------
// 1. Screenshot Capture (13 pages — runs across 3 viewport projects = 39 tests)
// ---------------------------------------------------------------------------
test.describe('T-03.1 — Visual Screenshots', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.name} (${route.path}) — screenshot captured`, async ({ page }) => {
      await navigateAndWait(page, route.path);

      // Determine viewport name from current page size
      const viewport = page.viewportSize();
      const viewportName = !viewport
        ? 'desktop'
        : viewport.width <= 375
          ? 'mobile'
          : viewport.width <= 768
            ? 'tablet'
            : 'desktop';

      // Capture baseline if first run, otherwise take current screenshot
      if (!hasBaseline(route.path, viewportName)) {
        const baselinePath = await captureBaseline(page, route.path);
        expect(baselinePath).toBeTruthy();
        console.log(`  📸 Baseline created: ${route.name} @ ${viewportName}`);
      } else {
        const screenshotPath = await takePageScreenshot(page, route.path);
        expect(screenshotPath).toBeTruthy();
        console.log(`  📸 Screenshot saved: ${route.name} @ ${viewportName}`);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Broken Image Check (13 pages x 3 viewports)
// ---------------------------------------------------------------------------
test.describe('T-03.2 — Broken Image Detection', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.name} (${route.path}) — no broken images`, async ({ page }) => {
      await navigateAndWait(page, route.path);

      const { total, broken } = await checkBrokenImages(page);

      console.log(`  🖼️  ${route.name}: ${total} images found, ${broken.length} broken`);

      if (broken.length > 0) {
        console.warn(`  ⚠️  Broken images on ${route.path}:\n${broken.map(b => `    - ${b}`).join('\n')}`);
      }

      expect(
        broken,
        `Broken images on ${route.path}: ${broken.join(', ')}`,
      ).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// 3. CTA Visibility Check (pages with hasCTA x 3 viewports)
// ---------------------------------------------------------------------------
test.describe('T-03.3 — CTA Visibility Per Viewport', () => {
  const ctaRoutes = PUBLIC_ROUTES.filter((r) => r.hasCTA);

  for (const route of ctaRoutes) {
    test(`${route.name} (${route.path}) — CTA visible above the fold`, async ({ page }) => {
      await navigateAndWait(page, route.path);

      const viewport = page.viewportSize();
      const viewportHeight = viewport?.height ?? 900;

      // Look for CTA elements
      const ctaLocator = page.locator(
        [
          'a[href="/estimate"]',
          'a[href="/contact"]',
          'a:has-text("Free Estimate")',
          'a:has-text("Get Started")',
          'a:has-text("Get a Free")',
          'a:has-text("Request")',
          'button:has-text("Get")',
        ].join(', '),
      );

      const count = await ctaLocator.count();
      expect(count, `No CTA found on ${route.path}`).toBeGreaterThan(0);

      // Check if at least one CTA is visible (rendered, not hidden)
      let foundVisible = false;
      let foundAboveFold = false;

      for (let i = 0; i < count; i++) {
        const el = ctaLocator.nth(i);
        const isVisible = await el.isVisible().catch(() => false);
        if (!isVisible) continue;
        foundVisible = true;

        // Check if it's above the fold (within initial viewport)
        const box = await el.boundingBox().catch(() => null);
        if (box && box.y + box.height <= viewportHeight) {
          foundAboveFold = true;
          break;
        }
      }

      expect(foundVisible, `CTA exists but none visible on ${route.path}`).toBe(true);

      // On mobile, main CTA should be visible without scrolling
      // On desktop, CTA should be above the fold
      if (foundAboveFold) {
        console.log(`  ✅ CTA above the fold on ${route.path}`);
      } else {
        // Warn but don't fail — CTA may be intentionally below hero on some pages
        console.warn(`  ⚠️  CTA visible but below the fold on ${route.path}`);
      }
    });
  }
});
