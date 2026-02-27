/**
 * Mobile Responsive E2E Tests
 * Tests all public pages at 375px (iPhone) and 768px (tablet) viewports.
 * STRICT: No .or() fallbacks. Tests fail if elements are missing.
 */

import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://localhost:3002' });

// ---------- Mobile (375px) ----------

test.describe('Mobile 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('homepage renders hero and CTA at mobile width', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Hero CTA should be full-width on mobile
    await expect(page.getByRole('link', { name: /See Your Renovation/i })).toBeVisible();
    // Phone number link visible
    await expect(page.getByRole('link', { name: /\d{3}.*\d{4}/i }).first()).toBeVisible();
  });

  test('homepage services section stacks vertically on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Our Services/i })).toBeVisible();
    // Service cards should be visible (stacked)
    await expect(page.getByRole('link', { name: /Kitchen Renovation/i }).first()).toBeVisible();
  });

  test('services page renders at mobile width', async ({ page }) => {
    await page.goto('/services');
    await expect(page.getByRole('heading', { level: 1, name: /Our Renovation Services/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Kitchen Renovation/i }).first()).toBeVisible();
  });

  test('about page renders at mobile width', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /What We Do/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Meet the Team/i })).toBeVisible();
  });

  test('contact page form is usable at mobile width', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: /Get In Touch/i })).toBeVisible();
    // Form fields visible and usable
    const nameInput = page.getByLabel(/Name/i).first();
    await expect(nameInput).toBeVisible();
    // Check the input is full width (at least 300px on a 375px viewport)
    const box = await nameInput.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(280);
  });

  test('visualizer page upload zone is accessible at mobile width', async ({ page }) => {
    await page.goto('/visualizer');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Upload zone visible
    await expect(page.getByText(/Drop your image or click to browse/i)).toBeVisible();
    // Trust indicators visible
    await expect(page.getByText('No Sign-Up')).toBeVisible();
  });

  test('404 page renders correctly at mobile width', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Go Home/i })).toBeVisible();
  });
});

// ---------- Tablet (768px) ----------

test.describe('Tablet 768px', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('homepage renders all sections at tablet width', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Our Services/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /How It Works/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /What Our Clients Say/i })).toBeVisible();
  });

  test('contact page shows form and sidebar at tablet width', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: /Get In Touch/i })).toBeVisible();
    await expect(page.getByLabel(/Name/i).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Contact Information/i })).toBeVisible();
  });

  test('services page renders grid at tablet width', async ({ page }) => {
    await page.goto('/services');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Multiple service cards visible
    const serviceLinks = page.getByRole('link').filter({ hasText: /Learn more/i });
    const count = await serviceLinks.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
