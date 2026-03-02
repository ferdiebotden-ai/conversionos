/**
 * Security Hardening E2E Tests
 *
 * Verifies security headers, rate limiting, and entitlements enforcement
 * against the local dev server.
 *
 * - Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
 * - Rate limiting: rapid requests to rate-limited endpoints return 429
 * - Entitlements: Elevate-tier tenants get 403 on Accelerate+ features
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// 1. Security Headers
// ---------------------------------------------------------------------------

test.describe('Security Headers', () => {
  test('homepage response includes all required security headers', async ({ request }) => {
    const response = await request.get('/');

    expect(response.status()).toBe(200);

    const headers = response.headers();

    // X-Content-Type-Options
    expect(headers['x-content-type-options']).toBe('nosniff');

    // X-Frame-Options
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');

    // Strict-Transport-Security
    expect(headers['strict-transport-security']).toContain('max-age=31536000');
    expect(headers['strict-transport-security']).toContain('includeSubDomains');

    // Referrer-Policy
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');

    // Permissions-Policy
    expect(headers['permissions-policy']).toBeTruthy();
    expect(headers['permissions-policy']).toContain('camera=(self)');
    expect(headers['permissions-policy']).toContain('microphone=(self)');
  });

  test('homepage response includes Content-Security-Policy', async ({ request }) => {
    const response = await request.get('/');
    const csp = response.headers()['content-security-policy'];

    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("img-src 'self'");
    expect(csp).toContain("connect-src 'self'");
  });

  test('API route responses include security headers', async ({ request }) => {
    // Use a lightweight API endpoint that does not require auth
    const response = await request.get('/api/voice/check');
    const headers = response.headers();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  test('X-XSS-Protection is set to 0 (modern best practice)', async ({ request }) => {
    const response = await request.get('/');
    // Modern best practice: disable XSS auditor (CSP is the replacement)
    expect(response.headers()['x-xss-protection']).toBe('0');
  });

  test('security headers present on static asset routes', async ({ request }) => {
    const response = await request.get('/about');

    expect(response.status()).toBe(200);
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers()['strict-transport-security']).toContain('max-age=31536000');
  });
});

// ---------------------------------------------------------------------------
// 2. Rate Limiting
// ---------------------------------------------------------------------------

test.describe('Rate Limiting', () => {
  // data-deletion has the lowest limit: 3 requests per 60s window.
  // Sending 5 rapid requests should trigger 429 on the 4th or 5th.
  test('returns 429 after exceeding rate limit on /api/data-deletion', async ({ request }) => {
    const endpoint = '/api/data-deletion';
    const body = { email: `ratelimit-test-${Date.now()}@example.com`, name: 'Rate Limit Test' };

    let got429 = false;
    const responses: number[] = [];

    // The limit is 3 requests per 60s. Send 5 to guarantee we exceed it.
    for (let i = 0; i < 5; i++) {
      const res = await request.post(endpoint, { data: body });
      responses.push(res.status());
      if (res.status() === 429) {
        got429 = true;
        // Verify the 429 response body
        const json = await res.json();
        expect(json.error).toContain('Too many requests');
        break;
      }
    }

    expect(got429).toBe(true);
  });

  test('429 response includes rate limit headers', async ({ request }) => {
    const endpoint = '/api/data-deletion';
    const body = { email: `ratelimit-headers-${Date.now()}@example.com`, name: 'Headers Test' };

    let rateLimitResponse: Awaited<ReturnType<typeof request.post>> | null = null;

    for (let i = 0; i < 5; i++) {
      const res = await request.post(endpoint, { data: body });
      if (res.status() === 429) {
        rateLimitResponse = res;
        break;
      }
    }

    expect(rateLimitResponse).not.toBeNull();

    if (rateLimitResponse) {
      const headers = rateLimitResponse.headers();
      expect(headers['retry-after']).toBeTruthy();
      expect(headers['x-ratelimit-remaining']).toBe('0');
      expect(headers['x-ratelimit-limit']).toBeTruthy();
    }
  });

  test('non-rate-limited endpoints do not return 429 on first request', async ({ request }) => {
    // Homepage is not rate-limited
    const res = await request.get('/');
    expect(res.status()).not.toBe(429);
  });
});

// ---------------------------------------------------------------------------
// 3. Entitlements Enforcement (Elevate tier = deny by default)
// ---------------------------------------------------------------------------

test.describe('Entitlements — Elevate tier restrictions', () => {
  // Force the server to resolve an unknown site_id, which defaults to 'elevate' tier.
  // getSiteIdAsync() reads x-site-id header before env var, so setting a
  // non-existent tenant triggers the DEFAULT_TIER = 'elevate' fallback.
  const elevateHeaders = { 'x-site-id': 'test-elevate-nonexistent' };

  test('GET /api/invoices returns 403 for Elevate tier', async ({ request }) => {
    const res = await request.get('/api/invoices', { headers: elevateHeaders });
    expect(res.status()).toBe(403);

    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  test('GET /api/drawings returns 403 for Elevate tier', async ({ request }) => {
    const res = await request.get('/api/drawings', { headers: elevateHeaders });
    expect(res.status()).toBe(403);

    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  test('GET /api/quotes/[leadId] returns 403 for Elevate tier', async ({ request }) => {
    // Use a dummy lead ID — the tier check happens before the ID lookup
    const res = await request.get('/api/quotes/00000000-0000-0000-0000-000000000000', {
      headers: elevateHeaders,
    });
    expect(res.status()).toBe(403);

    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  test('GET /api/admin/settings returns 403 for Elevate tier', async ({ request }) => {
    const res = await request.get('/api/admin/settings', { headers: elevateHeaders });
    expect(res.status()).toBe(403);

    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  test('POST /api/invoices returns 403 for Elevate tier', async ({ request }) => {
    const res = await request.post('/api/invoices', {
      headers: elevateHeaders,
      data: { lead_id: '00000000-0000-0000-0000-000000000000', quote_draft_id: '00000000-0000-0000-0000-000000000000' },
    });
    expect(res.status()).toBe(403);
  });

  test('PUT /api/quotes/[leadId] returns 403 for Elevate tier', async ({ request }) => {
    const res = await request.put('/api/quotes/00000000-0000-0000-0000-000000000000', {
      headers: elevateHeaders,
      data: { line_items: [] },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe('Entitlements — Accelerate tier access', () => {
  // The demo tenant (NEXT_PUBLIC_SITE_ID=demo) is Accelerate tier.
  // These endpoints should NOT return 403 when using the default site_id.

  test('GET /api/invoices is accessible for Accelerate tier', async ({ request }) => {
    const res = await request.get('/api/invoices');
    // Should not be 403 — may be 200 (empty list) or another non-403 status
    expect(res.status()).not.toBe(403);
  });

  test('GET /api/drawings is accessible for Accelerate tier', async ({ request }) => {
    const res = await request.get('/api/drawings');
    expect(res.status()).not.toBe(403);
  });

  test('GET /api/admin/settings is accessible for Accelerate tier', async ({ request }) => {
    const res = await request.get('/api/admin/settings');
    expect(res.status()).not.toBe(403);
  });
});

test.describe('Entitlements — Dominate-only features', () => {
  // Accelerate (demo tenant) should NOT have analytics_dashboard
  // Note: voice_web IS available on all tiers, so signed-url should not 403 for entitlements.

  test('GET /api/admin/visualizations/trends returns 403 for Accelerate tier (Dominate only)', async ({ request }) => {
    // The demo tenant is Accelerate — analytics_dashboard is Dominate-only
    const res = await request.get('/api/admin/visualizations/trends?days=30');
    expect(res.status()).toBe(403);

    const json = await res.json();
    expect(json.error).toBeTruthy();
  });
});
