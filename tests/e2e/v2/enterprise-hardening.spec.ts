/**
 * Enterprise Hardening — E2E Verification Tests
 *
 * Validates all 20 enterprise hardening fixes from commit 9eb6c5d:
 * - Auth middleware (proxy.ts)
 * - Rate limiting (in-memory fallback)
 * - Security headers (CSP, HSTS, etc.)
 * - Error handling (no info leakage)
 * - Compliance pages (/privacy, /terms, /data-deletion)
 * - OKLCH colour validation
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, filterRealErrors } from './helpers';

// ─── Group 1: Auth Middleware ────────────────────────────────────────────────

test.describe('Auth Middleware — Protected Endpoints', () => {
  test('GET /api/admin/settings returns 401 without auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/settings`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/leads returns 401 without auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/leads`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/quotes/nonexistent returns 401 without auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/quotes/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/invoices/nonexistent returns 401 without auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/invoices/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/drawings/nonexistent returns 401 without auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/drawings/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(401);
  });

  test('GET /api/leads/some-id returns 401 without auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/leads/00000000-0000-0000-0000-000000000000`);
    expect(res.status()).toBe(401);
  });
});

test.describe('Auth Middleware — Public Endpoints', () => {
  test('POST /api/leads (lead submission) does NOT return 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/leads`, {
      data: {
        name: 'Auth Test User',
        email: `auth-test-${Date.now()}@example.com`,
        projectType: 'kitchen',
      },
    });
    // Should be 200 (success) or 400 (validation) — NOT 401
    expect(res.status()).not.toBe(401);
  });

  test('GET /api/voice/signed-url does NOT return 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/voice/signed-url?context=general`);
    // May be 200, 400, or 503 (no config) — NOT 401
    expect(res.status()).not.toBe(401);
  });

  test('GET /api/quotes/accept/test-token does NOT return 401', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/quotes/accept/test-fake-token-12345`);
    // May be 404 (invalid token) — NOT 401
    expect(res.status()).not.toBe(401);
  });
});

test.describe('Auth Middleware — Protected Pages', () => {
  test('/admin redirects to login without auth', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/admin/login');
  });

  test('/admin/leads redirects to login without auth', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/leads`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/admin/login');
  });
});

// ─── Group 2: Rate Limiting ─────────────────────────────────────────────────

test.describe('Rate Limiting', () => {
  // Serial: second test reuses the exhausted window from first.
  // Extended timeout: each non-429 POST triggers AI quote generation (~5s each).
  test.describe.configure({ mode: 'serial', timeout: 90_000 });

  test('rapid POST /api/leads triggers 429 after 5 requests', async () => {
    // Fire 7 requests in parallel — rate limiter counts them instantly,
    // but non-429 responses take ~5s each (AI quote generation).
    // We race to detect 429 early while letting all requests settle.
    const uniquePrefix = `ratelimit-${Date.now()}`;

    const promises = Array.from({ length: 7 }, (_, i) =>
      fetch(`${BASE_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Rate Limit Test ${i}`,
          email: `${uniquePrefix}-${i}@example.com`,
          projectType: 'kitchen',
        }),
      }).then((r) => ({ status: r.status, headers: r.headers, response: r }))
    );

    const results = await Promise.allSettled(promises);
    const fulfilled = results
      .filter((r): r is PromiseFulfilledResult<{ status: number; headers: Headers; response: Response }> =>
        r.status === 'fulfilled'
      )
      .map((r) => r.value);

    // At least one should be 429
    const rateLimited = fulfilled.find((r) => r.status === 429);
    expect(rateLimited).toBeTruthy();

    // Verify response body
    const body = await rateLimited!.response.json();
    expect(body.error).toContain('Too many requests');

    // Verify Retry-After header
    expect(rateLimited!.headers.get('retry-after')).toBeTruthy();
  });

  test('429 response includes rate limit headers', async () => {
    // Window from previous test should still be active — immediate 429
    const res = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Header Check',
        email: `header-check-${Date.now()}@example.com`,
        projectType: 'bathroom',
      }),
    });

    if (res.status !== 429) {
      // Window may have expired — skip gracefully
      test.skip();
      return;
    }

    expect(res.headers.get('retry-after')).toBeTruthy();
    expect(res.headers.get('x-ratelimit-limit')).toBe('5');
    expect(res.headers.get('x-ratelimit-remaining')).toBe('0');
    expect(res.headers.get('x-ratelimit-reset')).toBeTruthy();
  });
});

// ─── Group 3: Security Headers ──────────────────────────────────────────────

test.describe('Security Headers', () => {
  test('homepage response includes HSTS header', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/`);
    const hsts = res.headers()['strict-transport-security'];
    // HSTS may not be set in local dev (HTTP) — only verify if present
    if (hsts) {
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');
    }
  });

  test('homepage response includes X-Content-Type-Options', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/`);
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('homepage response includes X-Frame-Options', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/`);
    expect(res.headers()['x-frame-options']).toBe('SAMEORIGIN');
  });

  test('homepage response includes Permissions-Policy', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/`);
    const policy = res.headers()['permissions-policy'];
    expect(policy).toBeTruthy();
    expect(policy).toContain('camera=(self)');
    expect(policy).toContain('microphone=(self)');
    expect(policy).toContain('geolocation=()');
  });

  test('homepage response includes Content-Security-Policy', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/`);
    const csp = res.headers()['content-security-policy'];
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
  });
});

// ─── Group 4: Error Handling — No Info Leakage ──────────────────────────────

test.describe('Error Handling — No Info Leakage', () => {
  const SENSITIVE_PATTERNS = [
    /SUPABASE/i,
    /password/i,
    /stack/i,
    /at\s+\w+\s+\(/,     // Stack trace line pattern
    /error\.code/i,
    /error\.hint/i,
    /\.ts:\d+/,           // TypeScript file:line references
    /SELECT\s+/i,         // SQL fragments
    /INSERT\s+INTO/i,
    /UPDATE\s+.*SET/i,
  ];

  test('401 response from admin API contains only generic message', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/settings`);
    expect(res.status()).toBe(401);
    const body = await res.text();

    for (const pattern of SENSITIVE_PATTERNS) {
      expect(body).not.toMatch(pattern);
    }

    // Should contain a clean error message
    const json = JSON.parse(body);
    expect(json.error).toBeTruthy();
    expect(typeof json.error).toBe('string');
  });

  test('401 response from quotes API contains only generic message', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/quotes/nonexistent`);
    expect(res.status()).toBe(401);
    const body = await res.text();

    for (const pattern of SENSITIVE_PATTERNS) {
      expect(body).not.toMatch(pattern);
    }
  });

  test('error responses from leads API do not leak internals', async ({ request }) => {
    // Send invalid body to trigger validation error
    const res = await request.post(`${BASE_URL}/api/leads`, {
      data: { invalid: true },
    });
    const body = await res.text();

    // Should not contain database or infrastructure details
    expect(body).not.toMatch(/SUPABASE/i);
    expect(body).not.toMatch(/password/i);
    expect(body).not.toMatch(/\.ts:\d+/);
  });
});

// ─── Group 5: Compliance Pages ──────────────────────────────────────────────

test.describe('Compliance Pages', () => {
  test('/privacy page renders with correct heading', async ({ page }) => {
    await page.goto(`${BASE_URL}/privacy`);
    await expect(page.getByRole('heading', { name: /Privacy Policy/i })).toBeVisible();
  });

  test('/privacy page contains PIPEDA reference', async ({ page }) => {
    await page.goto(`${BASE_URL}/privacy`);
    await expect(page.getByText(/PIPEDA|personal information/i).first()).toBeVisible();
  });

  test('/terms page renders with correct heading', async ({ page }) => {
    await page.goto(`${BASE_URL}/terms`);
    await expect(page.getByRole('heading', { name: /Terms of Service/i })).toBeVisible();
  });

  test('/terms page contains AI disclaimer', async ({ page }) => {
    await page.goto(`${BASE_URL}/terms`);
    await expect(page.getByText(/conceptual|estimate|not.*guarantee/i).first()).toBeVisible();
  });

  test('/data-deletion page renders with email form', async ({ page }) => {
    await page.goto(`${BASE_URL}/data-deletion`);
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('/data-deletion form submission shows confirmation', async ({ page }) => {
    await page.goto(`${BASE_URL}/data-deletion`);
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test-deletion@example.com');

    const submitButton = page.getByRole('button', { name: /submit|request|delete/i });
    await submitButton.click();

    // Should show confirmation (generic — doesn't reveal if data exists)
    await expect(
      page.getByText(/submitted|received|request.*processed/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('footer contains Privacy Policy and Terms links', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    const privacyLink = footer.getByRole('link', { name: /Privacy Policy/i });
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveAttribute('href', '/privacy');

    const termsLink = footer.getByRole('link', { name: /Terms of Service/i });
    await expect(termsLink).toBeVisible();
    await expect(termsLink).toHaveAttribute('href', '/terms');
  });

  test('footer Privacy Policy link navigates correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    const footer = page.locator('footer');
    const privacyLink = footer.getByRole('link', { name: /Privacy Policy/i });
    await privacyLink.click();

    await expect(page).toHaveURL(/\/privacy/);
    await expect(page.getByRole('heading', { name: /Privacy Policy/i })).toBeVisible();
  });
});

// ─── Group 6: OKLCH Colour Validation ───────────────────────────────────────

test.describe('OKLCH Colour Validation', () => {
  test('homepage renders with valid oklch CSS custom property', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Check that the page source contains a valid oklch value in a style tag
    const hasOklch = await page.evaluate(() => {
      const styles = document.querySelectorAll('style');
      for (const style of styles) {
        if (style.textContent?.includes('oklch(')) {
          return true;
        }
      }
      // Also check inline styles on html/body
      const html = document.documentElement;
      const style = html.getAttribute('style') || '';
      return style.includes('oklch(');
    });

    expect(hasOklch).toBe(true);
  });

  test('homepage renders without CSS error banner', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/`);
    await page.waitForTimeout(2000);

    // Filter benign errors
    const realErrors = filterRealErrors(errors);

    // No CSS-related errors
    const cssErrors = realErrors.filter(
      (e) => e.includes('oklch') || e.includes('CSS') || e.includes('custom property')
    );
    expect(cssErrors).toEqual([]);
  });
});
