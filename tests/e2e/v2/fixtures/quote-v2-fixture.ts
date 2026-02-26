/**
 * Quote V2 — Extended Playwright Fixture
 * Provides reusable test utilities for Quote Engine V2 E2E tests.
 */

import { test as base, expect } from '@playwright/test';
import { loginAsAdmin, ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers';

interface QuoteV2Fixtures {
  /** Login as admin and return the page */
  adminPage: ReturnType<typeof base['extend']> extends infer T ? T : never;
  /** Navigate to first lead's quote editor */
  quoteEditorPage: { page: ReturnType<typeof base['extend']> extends infer T ? T : never; leadId: string };
}

export const test = base.extend<{
  loginAndGoToLeads: () => Promise<void>;
  loginAndGoToSettings: () => Promise<void>;
}>({
  loginAndGoToLeads: async ({ page }, use) => {
    const fn = async () => {
      await loginAsAdmin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto('/admin/leads');
      await expect(page.locator('table, [data-testid="leads-table"]').first()).toBeVisible({ timeout: 10000 });
    };
    await use(fn);
  },

  loginAndGoToSettings: async ({ page }, use) => {
    const fn = async () => {
      await loginAsAdmin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto('/admin/settings');
      await expect(page.locator('[role="tablist"]')).toBeVisible({ timeout: 10000 });
    };
    await use(fn);
  },
});

export { expect };
