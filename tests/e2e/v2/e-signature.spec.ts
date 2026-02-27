/**
 * E-Signature Acceptance Flow E2E Tests
 * Tests the public quote acceptance page (F7).
 * Covers: invalid tokens, form validation, seeded token flows,
 * submit acceptance, revisit after acceptance.
 *
 * STRICT: No .or() fallbacks. Tests fail if elements are missing.
 */

import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  BASE_URL,
  UI_TIMEOUT,
  getFirstLeadId,
  seedAcceptanceToken,
  navigateToQuoteEditor,
  saveQuote,
} from './helpers';

test.use({ baseURL: BASE_URL });

// ---------- API-Level Invalid Token Tests ----------

test.describe('E-Signature — API Invalid Tokens', () => {
  test('GET returns 404 for non-existent token', async ({ page }) => {
    const response = await page.request.get('/api/quotes/accept/invalidtoken123');
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Quote not found');
  });

  test('GET returns 400 for short token (< 10 chars)', async ({ page }) => {
    const response = await page.request.get('/api/quotes/accept/short');
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid token');
  });

  test('POST returns 400 for missing name', async ({ page }) => {
    const response = await page.request.post('/api/quotes/accept/validlengthtoken123', {
      data: { confirm: true },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/Name is required/i);
  });

  test('POST returns 400 for short name (1 char)', async ({ page }) => {
    const response = await page.request.post('/api/quotes/accept/validlengthtoken123', {
      data: { name: 'A', confirm: true },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/minimum 2/i);
  });

  test('POST returns 400 without confirmation flag', async ({ page }) => {
    const response = await page.request.post('/api/quotes/accept/validlengthtoken123', {
      data: { name: 'John Doe', confirm: false },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/Confirmation is required/i);
  });

  test('POST returns 400 for whitespace-only name', async ({ page }) => {
    const response = await page.request.post('/api/quotes/accept/validlengthtoken123', {
      data: { name: '   ', confirm: true },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/Name is required/i);
  });
});

// ---------- Page-Level Invalid Token Tests ----------

test.describe('E-Signature — Page Invalid Token', () => {
  test('renders "Quote Not Found" for invalid token', async ({ page }) => {
    await page.goto('/quote/accept/invalidtoken123');
    await expect(page.getByText('Quote Not Found')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/invalid or has been removed/i)).toBeVisible();
  });

  test('renders "Quote Not Found" for short token', async ({ page }) => {
    // Short token triggers 400 from API, which the client renders as not_found
    await page.goto('/quote/accept/abc');
    await expect(page.getByText('Quote Not Found')).toBeVisible({ timeout: 15_000 });
  });
});

// ---------- Seeded Token — Full Acceptance Flow ----------

test.describe('E-Signature — Acceptance Flow', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60_000);

  let token: string;
  let leadId: string;

  test('seed acceptance token for testing', async () => {
    // Seed the acceptance token on any existing quote draft
    token = await seedAcceptanceToken();
    expect(token.length).toBeGreaterThanOrEqual(10);
  });

  test('pending page shows "Review Your Quote" heading', async ({ page }) => {
    await page.goto(`/quote/accept/${token}`);
    await expect(page.getByText('Review Your Quote')).toBeVisible({ timeout: 15_000 });
  });

  test('quote summary shows project type, line items, total, and deposit', async ({ page }) => {
    await page.goto(`/quote/accept/${token}`);
    await expect(page.getByText('Review Your Quote')).toBeVisible({ timeout: 15_000 });

    // Quote Summary section
    await expect(page.getByText('Quote Summary')).toBeVisible();

    // Project Type row
    await expect(page.getByText('Project Type')).toBeVisible();

    // Line Items row — should show a count with "items"
    await expect(page.getByText(/\d+ items/)).toBeVisible();

    // Total (incl. HST) label
    await expect(page.getByText('Total (incl. HST)')).toBeVisible();

    // Total amount in CAD format ($X,XXX.XX)
    await expect(page.getByText(/\$[\d,]+\.\d{2}/).first()).toBeVisible();

    // Deposit required
    await expect(page.getByText(/Deposit required/)).toBeVisible();
  });

  test('button disabled when name is empty and checkbox unchecked', async ({ page }) => {
    await page.goto(`/quote/accept/${token}`);
    await expect(page.getByText('Review Your Quote')).toBeVisible({ timeout: 15_000 });

    const button = page.getByRole('button', { name: /Approve Quote/i });
    await expect(button).toBeVisible();

    // Button should be disabled (grey background #9ca3af)
    const bgColor = await button.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    // #9ca3af = rgb(156, 163, 175)
    expect(bgColor).toBe('rgb(156, 163, 175)');
  });

  test('button disabled with valid name but unchecked checkbox', async ({ page }) => {
    await page.goto(`/quote/accept/${token}`);
    await expect(page.getByText('Review Your Quote')).toBeVisible({ timeout: 15_000 });

    const nameInput = page.locator('#accept-name');
    await nameInput.fill('Jane Doe');

    const button = page.getByRole('button', { name: /Approve Quote/i });
    const bgColor = await button.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).toBe('rgb(156, 163, 175)');
  });

  test('button disabled with whitespace-only name and checked checkbox', async ({ page }) => {
    await page.goto(`/quote/accept/${token}`);
    await expect(page.getByText('Review Your Quote')).toBeVisible({ timeout: 15_000 });

    const nameInput = page.locator('#accept-name');
    await nameInput.fill('   ');

    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.check();

    const button = page.getByRole('button', { name: /Approve Quote/i });
    const bgColor = await button.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).toBe('rgb(156, 163, 175)');
  });

  test('button enabled with valid name and checked checkbox', async ({ page }) => {
    await page.goto(`/quote/accept/${token}`);
    await expect(page.getByText('Review Your Quote')).toBeVisible({ timeout: 15_000 });

    const nameInput = page.locator('#accept-name');
    await nameInput.fill('Jane Doe');

    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.check();

    // Wait for React to re-render after state change
    await page.waitForTimeout(500);

    const button = page.getByRole('button', { name: /Approve Quote/i });
    // Use polling to wait for the button colour to change
    await expect(async () => {
      const bgColor = await button.evaluate(
        (el) => window.getComputedStyle(el).backgroundColor
      );
      // Should NOT be #9ca3af — should be the branding primary colour
      expect(bgColor).not.toBe('rgb(156, 163, 175)');
    }).toPass({ timeout: 5_000 });
  });

  test('submitting acceptance shows "Quote Approved!" confirmation', async ({ page }) => {
    await page.goto(`/quote/accept/${token}`);
    await expect(page.getByText('Review Your Quote')).toBeVisible({ timeout: 15_000 });

    const nameInput = page.locator('#accept-name');
    await nameInput.fill('Jane Doe');

    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.check();

    const button = page.getByRole('button', { name: /Approve Quote/i });
    await button.click();

    // Wait for the submitted state
    await expect(page.getByText('Quote Approved!')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Approved on/)).toBeVisible();
  });

  test('revisiting the same token shows "Quote Already Approved"', async ({ page }) => {
    await page.goto(`/quote/accept/${token}`);

    // Should show already-approved state
    await expect(page.getByText('Quote Already Approved')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Jane Doe/)).toBeVisible();
  });
});
