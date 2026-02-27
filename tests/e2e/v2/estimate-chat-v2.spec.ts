/**
 * Estimate Chat V2 E2E Tests
 * Tests the /estimate page chat interface, progress tracker, and input.
 * STRICT: No .or() fallbacks. Tests fail if elements are missing.
 */

import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://localhost:3002' });

test.describe('Estimate Chat Page', () => {
  test('page loads with sr-only heading', async ({ page }) => {
    await page.goto('/estimate');
    // The h1 is sr-only but still in the DOM
    const heading = page.getByRole('heading', { level: 1, name: /Instant Renovation Estimate/i });
    await expect(heading).toBeAttached();
  });

  test('renders Emma greeting message', async ({ page }) => {
    await page.goto('/estimate');
    // Emma's greeting should be the first message
    await expect(page.getByText(/Emma/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/renovation assistant/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('renders progress tracker with steps', async ({ page }) => {
    await page.goto('/estimate');
    // Progress tracker shows step labels (use exact match to avoid substring collisions)
    await expect(page.getByText('Start', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Type', { exact: true })).toBeVisible();
    await expect(page.getByText('Details', { exact: true })).toBeVisible();
    await expect(page.getByText('Quote', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText('Contact', { exact: true })).toBeVisible();
  });

  test('renders text input with placeholder', async ({ page }) => {
    await page.goto('/estimate');
    const textInput = page.getByRole('textbox', { name: /Describe your renovation/i });
    await expect(textInput).toBeVisible({ timeout: 10000 });
    await expect(textInput).toBeEnabled();
  });

  test('renders voice button', async ({ page }) => {
    await page.goto('/estimate');
    await expect(page.getByRole('button', { name: /Talk to Emma/i })).toBeVisible({ timeout: 10000 });
  });

  test('renders image attach button', async ({ page }) => {
    await page.goto('/estimate');
    await expect(page.getByRole('button', { name: /Attach image/i })).toBeVisible({ timeout: 10000 });
  });

  test('send button is disabled when input is empty', async ({ page }) => {
    await page.goto('/estimate');
    const sendButton = page.getByRole('button', { name: /Send message/i });
    await expect(sendButton).toBeVisible({ timeout: 10000 });
    await expect(sendButton).toBeDisabled();
  });

  test('renders sidebar with project details panel', async ({ page }) => {
    await page.goto('/estimate');
    // Sidebar shows "Your Project" heading (exact match to avoid "Tell us about your project" collision)
    await expect(page.getByText('Your Project', { exact: true })).toBeVisible({ timeout: 10000 });
    // Shows empty project fields with "Add" buttons
    await expect(page.getByText('Project Type', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Room Size', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add' }).first()).toBeVisible();
  });
});
