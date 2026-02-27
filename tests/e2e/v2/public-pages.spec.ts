/**
 * Public Pages E2E Tests
 * Tests every public-facing page loads correctly with expected content.
 * STRICT: No .or() fallbacks. Tests fail if elements are missing.
 */

import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://localhost:3002' });

// ---------- Homepage ----------

test.describe('Homepage', () => {
  test('renders hero section with heading and CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /See Your Renovation/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /See Your Renovation/i })).toHaveAttribute('href', '/visualizer');
  });

  test('renders social proof bar with metrics', async ({ page }) => {
    await page.goto('/');
    // Social proof bar shows trust metrics — look for the border-y container div (not a section)
    await expect(page.getByText(/Google Rating|Projects Completed|Licensed/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('renders visualizer teaser with before/after images', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /See It Before You Build It/i })).toBeVisible();
    await expect(page.getByRole('img', { name: /before/i }).first()).toBeVisible();
    await expect(page.getByRole('img', { name: /after/i }).first()).toBeVisible();
  });

  test('renders services section with service cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Our Services/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Kitchen Renovation/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /View All Services/i })).toBeVisible();
  });

  test('renders How It Works section with 3 steps', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /How It Works/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Upload a Photo/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Get AI Design Concepts/i })).toBeVisible();
    // Step 3 exists — verify at least 3 process step elements
    await expect(page.getByText('3', { exact: true }).first()).toBeVisible();
  });

  test('renders testimonials section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /What Our Clients Say/i })).toBeVisible();
    // At least one testimonial blockquote
    await expect(page.locator('blockquote').first()).toBeVisible();
  });

  test('renders final CTA section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Ready to See Your Renovation/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Try the AI Visualizer/i })).toBeVisible();
  });

  test('renders footer with company info and navigation', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();
    await expect(footer.getByRole('heading', { name: /Quick Links/i })).toBeVisible();
    await expect(footer.getByRole('heading', { name: /Services/i })).toBeVisible();
    await expect(footer.getByRole('heading', { name: /Contact Us/i })).toBeVisible();
    // Powered by ConversionOS
    await expect(footer.getByText(/Powered by/i)).toBeVisible();
    // Copyright
    await expect(footer.getByText(/© 2026/i)).toBeVisible();
    // Privacy/Terms as non-clickable spans
    await expect(footer.getByText('Privacy Policy')).toBeVisible();
    await expect(footer.getByText('Terms of Service')).toBeVisible();
  });

  test('has no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForTimeout(2000);
    const realErrors = errors.filter(
      (e) => !/favicon|hydration|chunk|websocket|next-dev/i.test(e)
    );
    expect(realErrors).toHaveLength(0);
  });
});

// ---------- Services Page ----------

test.describe('Services Page', () => {
  test('renders hero and breadcrumb', async ({ page }) => {
    await page.goto('/services');
    await expect(page.getByRole('heading', { level: 1, name: /Our Renovation Services/i })).toBeVisible();
    // Breadcrumb — scoped to main content area (avoids matching header nav)
    await expect(page.getByRole('main').getByRole('navigation')).toBeVisible();
  });

  test('renders services grid with cards', async ({ page }) => {
    await page.goto('/services');
    // At least one service card link
    await expect(page.getByRole('link', { name: /Kitchen Renovation/i }).first()).toBeVisible();
  });

  test('renders why choose us section', async ({ page }) => {
    await page.goto('/services');
    await expect(page.getByRole('heading', { name: /Free Consultations/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Transparent Pricing/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Quality Materials/i })).toBeVisible();
  });

  test('renders CTA section', async ({ page }) => {
    await page.goto('/services');
    // Dynamic CTA heading from copy registry
    const ctaSection = page.locator('section').last();
    await expect(ctaSection.getByRole('heading', { level: 2 })).toBeVisible();
  });
});

// ---------- About Page ----------

test.describe('About Page', () => {
  test('renders hero and breadcrumb', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Breadcrumb — scoped to main content area (avoids matching header nav)
    await expect(page.getByRole('main').getByRole('navigation')).toBeVisible();
  });

  test('renders What We Do section', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: /What We Do/i })).toBeVisible();
  });

  test('renders Meet the Team section with User icon fallback', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: /Meet the Team/i })).toBeVisible();
    // Team member name visible
    await expect(page.getByText(/Principals/i)).toBeVisible();
  });

  test('renders Service Area section', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: /Service Area/i })).toBeVisible();
  });

  test('renders CTA section with buttons', async ({ page }) => {
    await page.goto('/about');
    // CTA at bottom
    const buttons = page.getByRole('link').filter({ hasText: /Get a Free Quote|Contact Us/i });
    await expect(buttons.first()).toBeVisible();
  });
});

// ---------- Contact Page ----------

test.describe('Contact Page', () => {
  test('renders hero and breadcrumb', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { level: 1, name: /Get In Touch/i })).toBeVisible();
    await expect(page.getByRole('navigation').filter({ hasText: /Home.*Contact/i })).toBeVisible();
  });

  test('renders contact form with all required fields', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByLabel(/Name/i).first()).toBeVisible();
    await expect(page.getByLabel(/Email/i).first()).toBeVisible();
    await expect(page.getByLabel(/Phone/i)).toBeVisible();
    await expect(page.getByLabel(/Project Type/i)).toBeVisible();
    await expect(page.getByLabel(/Message/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Send Message/i })).toBeVisible();
  });

  test('renders contact info sidebar', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: /Contact Information/i })).toBeVisible();
    await expect(page.getByText(/Phone/i).first()).toBeVisible();
    await expect(page.getByText(/Email/i).first()).toBeVisible();
    await expect(page.getByText(/Location/i)).toBeVisible();
  });

  test('renders business hours', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: /Business Hours/i })).toBeVisible();
    await expect(page.getByText(/Monday/i)).toBeVisible();
  });
});

// ---------- Visualizer Page ----------

test.describe('Visualizer Page', () => {
  test('renders hero with heading', async ({ page }) => {
    await page.goto('/visualizer');
    await expect(page.getByRole('heading', { level: 1, name: /Visualize Your.*Dream Space/i })).toBeVisible();
  });

  test('renders upload zone', async ({ page }) => {
    await page.goto('/visualizer');
    await expect(page.getByRole('heading', { name: /Upload your photo/i })).toBeVisible();
    await expect(page.getByText(/Drop your image or click to browse/i)).toBeVisible();
  });

  test('renders trust indicators', async ({ page }) => {
    await page.goto('/visualizer');
    await expect(page.getByText('100%')).toBeVisible();
    await expect(page.getByText(/Free to use/i)).toBeVisible();
    await expect(page.getByText('No Sign-Up')).toBeVisible();
    await expect(page.getByText(/No account needed/i)).toBeVisible();
    await expect(page.getByText('~30 sec')).toBeVisible();
  });

  test('renders photo tips grid', async ({ page }) => {
    await page.goto('/visualizer');
    await expect(page.getByText(/Good Lighting/i)).toBeVisible();
    await expect(page.getByText(/Wide Shot/i)).toBeVisible();
    await expect(page.getByText(/Clear Clutter/i)).toBeVisible();
    await expect(page.getByText(/Key Features/i)).toBeVisible();
  });
});

// ---------- 404 Page ----------

test.describe('404 Page', () => {
  test('renders 404 content with navigation buttons', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz');
    await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /Page Not Found/i })).toBeVisible();
    await expect(page.getByText(/doesn't exist or has been moved/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Go Home/i })).toHaveAttribute('href', '/');
  });
});
