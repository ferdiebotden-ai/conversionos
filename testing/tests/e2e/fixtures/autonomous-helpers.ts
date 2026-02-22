/**
 * Shared helpers for autonomous E2E tests.
 */
import { type Page, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Test image (10×10 transparent PNG) for upload tests
// ---------------------------------------------------------------------------
export const TEST_IMAGE_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVQYV2P8/5+hnoEIwMgwqpCeCgEAhHkECfYbBBkAAAAASUVORK5CYII=',
  'base64',
);

// ---------------------------------------------------------------------------
// Navigation helper — navigate and wait for network idle
// ---------------------------------------------------------------------------
export async function navigateAndWait(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Give React/Next.js a moment to hydrate
  await page.waitForTimeout(1000);
}

// ---------------------------------------------------------------------------
// Upload a test image via file input
// ---------------------------------------------------------------------------
export async function uploadTestImage(
  page: Page,
  selector = 'input[type="file"]',
): Promise<void> {
  const fileInput = page.locator(selector);
  await fileInput.setInputFiles({
    name: 'test-room.png',
    mimeType: 'image/png',
    buffer: TEST_IMAGE_BUFFER,
  });
}

// ---------------------------------------------------------------------------
// Public routes for crawl tests
// ---------------------------------------------------------------------------
export const PUBLIC_ROUTES = [
  { name: 'Home', path: '/', hasCTA: true },
  { name: 'Services', path: '/services', hasCTA: true },
  { name: 'Projects', path: '/projects', hasCTA: true },
  { name: 'About', path: '/about', hasCTA: true },
  { name: 'Contact', path: '/contact', hasCTA: true },
  { name: 'Estimate', path: '/estimate', hasCTA: false },
  { name: 'Visualizer', path: '/visualizer', hasCTA: false },
];

// ---------------------------------------------------------------------------
// Admin routes for admin tests
// ---------------------------------------------------------------------------
export const ADMIN_ROUTES = [
  { name: 'Dashboard', path: '/admin' },
  { name: 'Leads', path: '/admin/leads' },
  { name: 'Quotes', path: '/admin/quotes' },
  { name: 'Invoices', path: '/admin/invoices' },
  { name: 'Settings', path: '/admin/settings' },
];

// ---------------------------------------------------------------------------
// Viewport definitions
// ---------------------------------------------------------------------------
export const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};

// ---------------------------------------------------------------------------
// Link helpers
// ---------------------------------------------------------------------------
export async function getAllLinks(page: Page): Promise<string[]> {
  return page.$$eval('a[href]', (anchors) =>
    anchors.map((a) => (a as HTMLAnchorElement).href),
  );
}

export async function checkUrlStatus(url: string): Promise<number> {
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return response.status;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Admin login helper
// ---------------------------------------------------------------------------
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/admin/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  const emailField = page.locator('input[type="email"], input[name="email"], #email').first();
  const passwordField = page.locator('input[type="password"], input[name="password"], #password').first();
  await emailField.fill(process.env['ADMIN_EMAIL'] || 'admin@example.com');
  await passwordField.fill(process.env['ADMIN_PASSWORD'] || 'admin123');
  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();
  await page.waitForTimeout(3000);
}

export async function ensureAdminLoggedIn(page: Page): Promise<void> {
  await page.goto('/admin', { waitUntil: 'domcontentloaded', timeout: 30000 });
  const isLoginPage = page.url().includes('/login');
  if (isLoginPage) {
    await loginAsAdmin(page);
  }
}

// ---------------------------------------------------------------------------
// Contact form helper
// ---------------------------------------------------------------------------
export async function fillContactForm(
  page: Page,
  data: { name: string; email: string; phone?: string; message: string },
): Promise<void> {
  await page.locator('#name').fill(data.name);
  await page.locator('#email').fill(data.email);
  if (data.phone) {
    const phoneField = page.locator('#phone');
    if (await phoneField.isVisible().catch(() => false)) {
      await phoneField.fill(data.phone);
    }
  }
  await page.locator('#message').fill(data.message);
}

// ---------------------------------------------------------------------------
// Soft assertion helper
// ---------------------------------------------------------------------------
export function createSoftAssert() {
  const failures: string[] = [];
  return {
    check(condition: boolean, message: string): void {
      if (!condition) {
        failures.push(message);
      }
    },
    flush(): void {
      if (failures.length > 0) {
        throw new Error(`Soft assertion failures:\n${failures.map((f) => `  - ${f}`).join('\n')}`);
      }
    },
  };
}
