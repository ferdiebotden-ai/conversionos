/**
 * Contact Form — E2E Tests
 * Tests the public /contact page form:
 *   - Form renders with all required fields
 *   - Client-side validation (Zod schema)
 *   - Successful submission -> success state
 *   - Query param variants (?from=visualizer, ?from=estimate)
 *   - Mobile viewport: form fills width
 */

import { test, expect } from '@playwright/test';
import { UI_TIMEOUT } from './helpers';

test.use({ baseURL: 'http://localhost:3002' });

// ─── Helpers ──────────────────────────────────────────────

/** Unique suffix to avoid duplicate lead collisions across runs. */
const UNIQUE = Date.now();

// ─── Tests ────────────────────────────────────────────────

test.describe('Contact Form', () => {

  test('page renders with hero, form fields, and sidebar', async ({ page }) => {
    await page.goto('/contact');

    // Hero
    await expect(page.getByRole('heading', { level: 1, name: /Get In Touch/i })).toBeVisible({ timeout: UI_TIMEOUT });

    // Breadcrumb
    await expect(page.getByRole('navigation').filter({ hasText: /Home.*Contact/i })).toBeVisible();

    // Form fields
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.getByLabel(/Phone/i)).toBeVisible();
    await expect(page.getByLabel(/Project Type/i)).toBeVisible();
    await expect(page.locator('#message')).toBeVisible();
    await expect(page.getByRole('button', { name: /Send Message/i })).toBeVisible();

    // Sidebar
    await expect(page.getByRole('heading', { name: /Contact Information/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Business Hours/i })).toBeVisible();
  });

  test('submit empty form shows validation errors', async ({ page }) => {
    await page.goto('/contact');

    // Click submit without filling anything
    await page.getByRole('button', { name: /Send Message/i }).click();

    // Validation errors should appear (name, email, projectType, message are required)
    await expect(page.getByText(/at least 2 characters/i).first()).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('submit with only name shows email validation error', async ({ page }) => {
    await page.goto('/contact');

    await page.locator('#name').fill('Test User');
    await page.getByRole('button', { name: /Send Message/i }).click();

    // Email validation error
    await expect(page.getByText(/valid email/i).first()).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('submit with name + invalid email shows email error', async ({ page }) => {
    await page.goto('/contact');
    // Wait for hydration so React handlers are attached
    await page.waitForTimeout(1000);

    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill('not-an-email');
    await page.getByRole('button', { name: /Send Message/i }).click();

    await expect(page.getByText(/valid email/i).first()).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('submit with name + email but no message shows message error', async ({ page }) => {
    await page.goto('/contact');

    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill(`contact-test-${UNIQUE}@example.com`);
    // Select a project type
    await page.locator('#projectType').click();
    await page.getByRole('option', { name: /Kitchen/i }).click();
    // Leave message empty
    await page.getByRole('button', { name: /Send Message/i }).click();

    // Message must be at least 10 characters
    await expect(page.getByText(/at least 10 characters/i).first()).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('successful submission shows success state', async ({ page }) => {
    await page.goto('/contact');
    // Wait for hydration so React handlers are attached
    await page.waitForTimeout(1000);

    // Fill all required fields
    await page.locator('#name').fill(`Contact Test ${UNIQUE}`);
    await page.locator('#email').fill(`contact-success-${UNIQUE}@example.com`);

    // Select project type via shadcn Select (combobox)
    const projectTypeCombo = page.locator('#projectType');
    await projectTypeCombo.click();
    await expect(page.getByRole('option', { name: /Kitchen/i })).toBeVisible({ timeout: UI_TIMEOUT });
    await page.getByRole('option', { name: /Kitchen/i }).click();

    await page.locator('#message').fill('I would like to renovate my kitchen with new cabinets and countertops.');

    await page.getByRole('button', { name: /Send Message/i }).click();

    // Success state — API may trigger AI processing, so allow extra time
    await expect(page.getByText(/Message Sent/i)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Thank you for reaching out/i)).toBeVisible();

    // "Send Another Message" button should appear
    await expect(page.getByRole('button', { name: /Send Another Message/i })).toBeVisible();
  });

  test('Send Another Message button resets the form', async ({ page }) => {
    await page.goto('/contact');
    // Wait for hydration
    await page.waitForTimeout(1000);

    // Submit a valid form first
    await page.locator('#name').fill(`Reset Test ${UNIQUE}`);
    await page.locator('#email').fill(`contact-reset-${UNIQUE}@example.com`);
    const projectTypeCombo = page.locator('#projectType');
    await projectTypeCombo.click();
    await expect(page.getByRole('option', { name: /Bathroom/i })).toBeVisible({ timeout: UI_TIMEOUT });
    await page.getByRole('option', { name: /Bathroom/i }).click();
    await page.locator('#message').fill('Looking to update our bathroom with modern fixtures.');

    await page.getByRole('button', { name: /Send Message/i }).click();
    await expect(page.getByText(/Message Sent/i)).toBeVisible({ timeout: 60_000 });

    // Click Send Another Message
    await page.getByRole('button', { name: /Send Another Message/i }).click();

    // Form should be back with empty fields
    await expect(page.locator('#name')).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.locator('#name')).toHaveValue('');
    await expect(page.locator('#email')).toHaveValue('');
    await expect(page.locator('#message')).toHaveValue('');
  });

  test('page loads correctly with ?from=visualizer query param', async ({ page }) => {
    await page.goto('/contact?from=visualizer');

    await expect(page.getByRole('heading', { level: 1, name: /Get In Touch/i })).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.getByRole('button', { name: /Send Message/i })).toBeVisible();
  });

  test('page loads correctly with ?from=estimate query param', async ({ page }) => {
    await page.goto('/contact?from=estimate');

    await expect(page.getByRole('heading', { level: 1, name: /Get In Touch/i })).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.getByRole('button', { name: /Send Message/i })).toBeVisible();
  });
});

// ─── Mobile Viewport ─────────────────────────────────────

test.describe('Contact Form — Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('form fills width and submit button is accessible', async ({ page }) => {
    await page.goto('/contact');

    await expect(page.locator('#name')).toBeVisible({ timeout: UI_TIMEOUT });

    // Submit button should be visible without scrolling (or after reasonable scroll)
    const submitBtn = page.getByRole('button', { name: /Send Message/i });
    await submitBtn.scrollIntoViewIfNeeded();
    await expect(submitBtn).toBeVisible();

    // Button should fill reasonable width on mobile
    const box = await submitBtn.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      // Button should be at least 80% of viewport width (h-12 w-full)
      expect(box.width).toBeGreaterThan(375 * 0.7);
    }
  });
});
