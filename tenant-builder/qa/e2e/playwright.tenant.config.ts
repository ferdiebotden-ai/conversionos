import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config for tenant site verification.
 *
 * Accepts TEST_TARGET_URL env var for the tenant site URL.
 * Accepts SCRAPED_JSON_PATH env var for the scraped.json fixture path.
 *
 * Usage:
 *   TEST_TARGET_URL=https://example.norbotsystems.com npx playwright test --config=qa/e2e/playwright.tenant.config.ts
 *   TEST_TARGET_URL=https://example.norbotsystems.com SCRAPED_JSON_PATH=./results/scraped.json npx playwright test --config=qa/e2e/playwright.tenant.config.ts
 */
export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  ...(process.env['CI'] ? { workers: '50%' } : {}),
  reporter: [
    ['html', { open: 'never', outputFolder: '../../results/playwright-report' }],
    ['list'],
  ],

  use: {
    baseURL: process.env['TEST_TARGET_URL'] || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  timeout: 60000,
  expect: {
    timeout: 10000,
  },

  projects: [
    {
      name: 'Desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'Tablet',
      use: {
        ...devices['iPad Mini'],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'Mobile',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
