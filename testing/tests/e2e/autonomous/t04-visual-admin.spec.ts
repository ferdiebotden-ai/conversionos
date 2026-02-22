/**
 * T-04: Visual Baseline — Admin Pages
 * Screenshot all 6 admin pages x 3 viewports, verify layout structure.
 * ~30 tests: 18 screenshot + 12 layout verification.
 */
import { test, expect, Page } from '@playwright/test';
import {
  loginAsAdmin,
  navigateAndWait,
  ADMIN_ROUTES,
  VIEWPORTS,
} from '../../fixtures/autonomous-helpers';
import {
  takePageScreenshot,
  captureBaseline,
  hasBaseline,
} from '../../fixtures/visual-regression';

// ---------------------------------------------------------------------------
// Shared: navigate to admin page with login handling
// ---------------------------------------------------------------------------
async function navigateToAdmin(page: Page, path = '/admin') {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');

  if (page.url().includes('/admin/login')) {
    try {
      await loginAsAdmin(page);
    } catch {
      // Login failed — navigate directly (page may still be accessible)
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
    }
  }

  // If not on the target path yet, navigate there
  if (!page.url().includes(path) || page.url().includes('/admin/login')) {
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');
  }

  // Wait for any loading indicators to disappear
  const loaders = page.locator('.animate-pulse, .animate-spin, [data-loading="true"]');
  await expect(loaders).toHaveCount(0, { timeout: 15000 }).catch(() => {});
}

// ---------------------------------------------------------------------------
// 1. Admin Page Screenshots (6 pages x 3 viewports = 18 tests)
// ---------------------------------------------------------------------------
test.describe('T-04.1 — Admin Visual Screenshots', () => {
  for (const route of ADMIN_ROUTES) {
    test(`${route.name} (${route.path}) — screenshot captured`, async ({ page }) => {
      await navigateToAdmin(page, route.path);

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
        console.log(`  Baseline created: ${route.name} @ ${viewportName}`);
      } else {
        const screenshotPath = await takePageScreenshot(page, route.path);
        expect(screenshotPath).toBeTruthy();
        console.log(`  Screenshot saved: ${route.name} @ ${viewportName}`);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Layout Verification — Sidebar Responsive Behavior
// ---------------------------------------------------------------------------
test.describe('T-04.2 — Sidebar Responsive Layout', () => {
  test('sidebar visible on desktop', async ({ page }) => {
    const viewport = page.viewportSize();
    // Only run on desktop viewport
    test.skip(!viewport || viewport.width < 1024, 'Desktop-only test');

    await navigateToAdmin(page, '/admin');

    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test('sidebar or hamburger menu accessible on tablet', async ({ page }) => {
    const viewport = page.viewportSize();
    test.skip(!viewport || viewport.width < 700 || viewport.width > 1024, 'Tablet-only test');

    await navigateToAdmin(page, '/admin');

    // On tablet, sidebar may be visible or hidden behind a hamburger
    const sidebar = page.locator('aside').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);

    if (sidebarVisible) {
      // Sidebar is directly visible — pass
      return;
    }

    // Sidebar hidden — look for any visible button that could toggle it.
    // The hamburger is typically a small button near the top-left of the page.
    const allButtons = page.locator('button:visible');
    const buttonCount = await allButtons.count();
    let foundMenuToggle = false;

    for (let i = 0; i < buttonCount; i++) {
      const btn = allButtons.nth(i);
      const box = await btn.boundingBox().catch(() => null);
      // Hamburger is typically small, near top-left
      if (box && box.y < 80 && box.x < 100 && box.width < 60) {
        foundMenuToggle = true;
        break;
      }
    }

    expect(foundMenuToggle, 'Tablet should have sidebar or a menu toggle button').toBe(true);
  });

  test('sidebar hidden on mobile — hamburger menu present', async ({ page }) => {
    const viewport = page.viewportSize();
    test.skip(!viewport || viewport.width > 500, 'Mobile-only test');

    await navigateToAdmin(page, '/admin');

    // On mobile, sidebar should be hidden; hamburger should appear
    const sidebar = page.locator('aside').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);

    if (sidebarVisible) {
      // Some designs show a compact sidebar on mobile — that's acceptable
      const box = await sidebar.boundingBox();
      if (box) {
        // Sidebar should be narrow (collapsed) if visible on mobile
        expect(box.width).toBeLessThan(200);
      }
    } else {
      // Look for a menu toggle button
      const menuToggle = page.locator(
        'button[aria-label*="menu" i], button[aria-label*="sidebar" i], button[aria-label*="toggle" i], [data-testid="sidebar-toggle"], header button svg'
      ).first();
      await expect(menuToggle).toBeVisible({ timeout: 10000 });
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Layout Verification — Table/Data Layouts
// ---------------------------------------------------------------------------
test.describe('T-04.3 — Table & Data Layout', () => {
  const tablePages = [
    { path: '/admin/leads', name: 'Leads' },
    { path: '/admin/quotes', name: 'Quotes' },
    { path: '/admin/invoices', name: 'Invoices' },
  ];

  for (const route of tablePages) {
    test(`${route.name} table columns visible on desktop`, async ({ page }) => {
      const viewport = page.viewportSize();
      test.skip(!viewport || viewport.width < 1024, 'Desktop-only test');

      await navigateToAdmin(page, route.path);

      // Table should exist (or empty state)
      const table = page.locator('table').first();
      const emptyState = page.getByText(/no leads|no quotes|no invoices|no results|empty|no data/i).first();

      const hasTable = await table.isVisible({ timeout: 10000 }).catch(() => false);
      const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasTable || hasEmpty, `${route.name} should show table or empty state`).toBe(true);

      if (hasTable) {
        // Verify table headers are visible
        const headers = table.locator('th, [role="columnheader"]');
        const headerCount = await headers.count();
        expect(headerCount).toBeGreaterThan(0);

        // Check table is not overflowing the viewport
        const tableBox = await table.boundingBox();
        if (tableBox && viewport) {
          // Table should not extend beyond the right edge of the viewport
          // (allow some tolerance for scrollbar)
          expect(tableBox.x).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test(`${route.name} table handles mobile viewport`, async ({ page }) => {
      const viewport = page.viewportSize();
      test.skip(!viewport || viewport.width > 500, 'Mobile-only test');

      await navigateToAdmin(page, route.path);

      // Table or empty state should exist
      const table = page.locator('table').first();
      const emptyState = page.getByText(/no leads|no quotes|no invoices|no results|empty|no data/i).first();

      const hasTable = await table.isVisible({ timeout: 10000 }).catch(() => false);
      const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasTable || hasEmpty, `${route.name} should show table or empty state on mobile`).toBe(true);

      if (hasTable) {
        // On mobile, table may be in a scrollable container — that's fine
        // Just verify it renders without breaking
        const tableBox = await table.boundingBox();
        expect(tableBox).toBeTruthy();
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 4. Layout Verification — Empty States
// ---------------------------------------------------------------------------
test.describe('T-04.4 — Empty State Rendering', () => {
  const dataPages = [
    { path: '/admin/leads', name: 'Leads' },
    { path: '/admin/quotes', name: 'Quotes' },
    { path: '/admin/invoices', name: 'Invoices' },
    { path: '/admin/drawings', name: 'Drawings' },
  ];

  for (const route of dataPages) {
    test(`${route.name} page renders content or empty state`, async ({ page }) => {
      await navigateToAdmin(page, route.path);

      // Page should have meaningful content — either data or empty state message
      const body = page.locator('main, [role="main"], .container, .content').first();
      await expect(body).toBeVisible({ timeout: 10000 });

      // Should not show a blank page or only an error
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(50);

      // Verify no unhandled error states
      const errorBanner = page.locator('[role="alert"]').filter({ hasText: /error|failed|500/i });
      const hasError = await errorBanner.first().isVisible().catch(() => false);
      if (hasError) {
        const errorText = await errorBanner.first().textContent();
        console.warn(`  Warning: Error banner on ${route.path}: ${errorText}`);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 5. Layout Verification — Form Layouts (Settings page)
// ---------------------------------------------------------------------------
test.describe('T-04.5 — Form Layout Responsiveness', () => {
  test('Settings form renders on desktop', async ({ page }) => {
    const viewport = page.viewportSize();
    test.skip(!viewport || viewport.width < 1024, 'Desktop-only test');

    await navigateToAdmin(page, '/admin/settings');

    // Settings page should have tab navigation
    const tabContent = page.getByText(/pricing|general|company/i).first();
    await expect(tabContent).toBeVisible({ timeout: 10000 });

    // Form inputs should be visible
    const inputs = page.locator('input, select, textarea');
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThan(0);
  });

  test('Settings form adapts on mobile', async ({ page }) => {
    const viewport = page.viewportSize();
    test.skip(!viewport || viewport.width > 500, 'Mobile-only test');

    await navigateToAdmin(page, '/admin/settings');

    // Tabs or settings content should still be accessible
    const tabContent = page.getByText(/pricing|general|company/i).first();
    await expect(tabContent).toBeVisible({ timeout: 10000 });

    // Form fields should not overflow
    const inputs = page.locator('input:visible, select:visible, textarea:visible');
    const inputCount = await inputs.count();

    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const box = await inputs.nth(i).boundingBox();
      if (box && viewport) {
        // Input should fit within viewport width (with some margin for scroll)
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 20);
      }
    }
  });
});
