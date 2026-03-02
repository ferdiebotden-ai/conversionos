/**
 * Multi-Tenancy Tests
 * Tests for tenant isolation: site_id resolution, data injection, domain routing,
 * and tier-based feature gating (deny-by-default).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { canAccess, getFeaturesForTier, type PlanTier, type Feature } from '@/lib/entitlements';

// ─── Mock next/headers (imported by @/lib/db/site) ─────────────────────────────
// Must be hoisted so that dynamic imports of site.ts don't fail.
vi.mock('next/headers', () => ({
  headers: () => {
    throw new Error('headers() called outside request context');
  },
}));

// ─── Mock next/server (imported by proxy.ts) ───────────────────────────────────
vi.mock('next/server', () => {
  class MockNextResponse {
    body: string | null;
    status: number;
    options: Record<string, unknown>;

    constructor(body: string | null, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.options = {};
    }

    static next(opts?: { request?: { headers?: Headers } }) {
      const resp = new MockNextResponse(null);
      resp.options = opts ?? {};
      return resp;
    }
  }

  return { NextResponse: MockNextResponse };
});

// ─── getSiteId ─────────────────────────────────────────────────────────────────

describe('getSiteId()', () => {
  const originalEnv = process.env['NEXT_PUBLIC_SITE_ID'];

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['NEXT_PUBLIC_SITE_ID'] = originalEnv;
    } else {
      delete process.env['NEXT_PUBLIC_SITE_ID'];
    }
    vi.resetModules();
  });

  it('returns the value from NEXT_PUBLIC_SITE_ID', async () => {
    process.env['NEXT_PUBLIC_SITE_ID'] = 'mccarty-squared';
    const { getSiteId } = await import('@/lib/db/site');
    expect(getSiteId()).toBe('mccarty-squared');
  });

  it('returns a different site_id when env var changes', async () => {
    process.env['NEXT_PUBLIC_SITE_ID'] = 'red-white-reno';
    const { getSiteId } = await import('@/lib/db/site');
    expect(getSiteId()).toBe('red-white-reno');
  });

  it('throws when NEXT_PUBLIC_SITE_ID is not set', async () => {
    delete process.env['NEXT_PUBLIC_SITE_ID'];
    const { getSiteId } = await import('@/lib/db/site');
    expect(() => getSiteId()).toThrow('Could not resolve site_id');
  });

  it('throws when NEXT_PUBLIC_SITE_ID is empty string', async () => {
    process.env['NEXT_PUBLIC_SITE_ID'] = '';
    const { getSiteId } = await import('@/lib/db/site');
    expect(() => getSiteId()).toThrow('Could not resolve site_id');
  });
});

// ─── withSiteId ────────────────────────────────────────────────────────────────

describe('withSiteId()', () => {
  const originalEnv = process.env['NEXT_PUBLIC_SITE_ID'];

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['NEXT_PUBLIC_SITE_ID'] = originalEnv;
    } else {
      delete process.env['NEXT_PUBLIC_SITE_ID'];
    }
    vi.resetModules();
  });

  it('injects site_id into a plain data object', async () => {
    process.env['NEXT_PUBLIC_SITE_ID'] = 'demo';
    const { withSiteId } = await import('@/lib/db/site');

    const result = withSiteId({ name: 'Test Lead', email: 'test@example.com' });

    expect(result).toEqual({
      name: 'Test Lead',
      email: 'test@example.com',
      site_id: 'demo',
    });
  });

  it('injects the correct site_id for a different tenant', async () => {
    process.env['NEXT_PUBLIC_SITE_ID'] = 'mccarty-squared';
    const { withSiteId } = await import('@/lib/db/site');

    const result = withSiteId({ lead_id: 42 });

    expect(result.site_id).toBe('mccarty-squared');
    expect(result.lead_id).toBe(42);
  });

  it('preserves all original properties', async () => {
    process.env['NEXT_PUBLIC_SITE_ID'] = 'demo';
    const { withSiteId } = await import('@/lib/db/site');

    const original = { a: 1, b: 'two', c: true, d: null, e: [1, 2, 3] };
    const result = withSiteId(original);

    expect(result.a).toBe(1);
    expect(result.b).toBe('two');
    expect(result.c).toBe(true);
    expect(result.d).toBe(null);
    expect(result.e).toEqual([1, 2, 3]);
    expect(result.site_id).toBe('demo');
  });

  it('overrides an existing site_id in the data object', async () => {
    process.env['NEXT_PUBLIC_SITE_ID'] = 'demo';
    const { withSiteId } = await import('@/lib/db/site');

    // withSiteId spreads the original first, then adds site_id from getSiteId()
    const result = withSiteId({ site_id: 'wrong-tenant', name: 'Test' });
    expect(result.site_id).toBe('demo');
  });

  it('returns a new object (does not mutate input)', async () => {
    process.env['NEXT_PUBLIC_SITE_ID'] = 'demo';
    const { withSiteId } = await import('@/lib/db/site');

    const original = { name: 'Test' };
    const result = withSiteId(original);

    expect(result).not.toBe(original);
    expect(original).not.toHaveProperty('site_id');
  });

  it('throws when no site_id can be resolved', async () => {
    delete process.env['NEXT_PUBLIC_SITE_ID'];
    const { withSiteId } = await import('@/lib/db/site');

    expect(() => withSiteId({ name: 'Test' })).toThrow('Could not resolve site_id');
  });
});

// ─── DOMAIN_TO_SITE (proxy.ts) ────────────────────────────────────────────────

describe('DOMAIN_TO_SITE mapping', () => {
  const originalEnv = process.env['NEXT_PUBLIC_SITE_ID'];

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['NEXT_PUBLIC_SITE_ID'] = originalEnv;
    } else {
      delete process.env['NEXT_PUBLIC_SITE_ID'];
    }
    vi.resetModules();
  });

  function createMockRequest(hostname: string, searchParams?: Record<string, string>) {
    const headersMap = new Map<string, string>();
    headersMap.set('host', hostname);

    const params = new URLSearchParams(searchParams);

    return {
      headers: {
        get: (key: string) => headersMap.get(key) ?? null,
      },
      nextUrl: {
        searchParams: {
          get: (key: string) => params.get(key),
        },
      },
    };
  }

  it('resolves conversionos-demo.norbotsystems.com to "demo"', async () => {
    delete process.env['NEXT_PUBLIC_SITE_ID'];
    const { proxy } = await import('@/proxy');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await proxy(createMockRequest('conversionos-demo.norbotsystems.com') as any);

    expect(result.options?.request?.headers?.get('x-site-id')).toBe('demo');
  });

  it('returns 404 for an unknown domain when no env fallback is set', async () => {
    delete process.env['NEXT_PUBLIC_SITE_ID'];
    const { proxy } = await import('@/proxy');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await proxy(createMockRequest('unknown.example.com') as any);

    expect(result.status).toBe(404);
  });

  it('falls back to NEXT_PUBLIC_SITE_ID when domain is not in the map', async () => {
    process.env['NEXT_PUBLIC_SITE_ID'] = 'red-white-reno';
    const { proxy } = await import('@/proxy');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await proxy(createMockRequest('localhost:3000') as any);

    expect(result.options?.request?.headers?.get('x-site-id')).toBe('red-white-reno');
  });

  it('strips port from hostname before domain lookup', async () => {
    delete process.env['NEXT_PUBLIC_SITE_ID'];
    const { proxy } = await import('@/proxy');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await proxy(createMockRequest('conversionos-demo.norbotsystems.com:443') as any);

    expect(result.options?.request?.headers?.get('x-site-id')).toBe('demo');
  });

  it('returns 404 when host header is missing and no env fallback', async () => {
    delete process.env['NEXT_PUBLIC_SITE_ID'];
    const { proxy } = await import('@/proxy');

    const request = {
      headers: { get: () => null },
      nextUrl: { searchParams: { get: () => null } },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await proxy(request as any);

    expect(result.status).toBe(404);
  });
});

// ─── Entitlements: deny-by-default ─────────────────────────────────────────────

describe('Entitlements deny-by-default', () => {
  it('default tier (elevate) denies admin-level features', () => {
    const deniedForElevate: Feature[] = [
      'admin_dashboard',
      'invoicing',
      'drawings',
      'ai_quote_engine',
      'pdf_quotes',
      'voice_phone',
      'analytics_dashboard',
      'custom_integrations',
      'location_exclusivity',
      'pricing_display',
      'contractor_lead_intake',
      'csv_price_upload',
      'assembly_templates',
    ];

    for (const feature of deniedForElevate) {
      expect(canAccess('elevate', feature)).toBe(false);
    }
  });

  it('Elevate grants only the 5 base features', () => {
    const baseFeatures: Feature[] = [
      'branded_website',
      'ai_visualizer',
      'lead_capture',
      'emma_text_chat',
      'voice_web',
    ];

    for (const feature of baseFeatures) {
      expect(canAccess('elevate', feature)).toBe(true);
    }

    // Confirm the count is exactly 5
    expect(getFeaturesForTier('elevate')).toHaveLength(5);
  });
});

// ─── Entitlements: tier escalation ─────────────────────────────────────────────

describe('Entitlements tier escalation', () => {
  it('Accelerate can access admin_dashboard', () => {
    expect(canAccess('accelerate', 'admin_dashboard')).toBe(true);
  });

  it('Accelerate can access invoicing and drawings', () => {
    expect(canAccess('accelerate', 'invoicing')).toBe(true);
    expect(canAccess('accelerate', 'drawings')).toBe(true);
  });

  it('Accelerate can access ai_quote_engine and pdf_quotes', () => {
    expect(canAccess('accelerate', 'ai_quote_engine')).toBe(true);
    expect(canAccess('accelerate', 'pdf_quotes')).toBe(true);
  });

  it('Accelerate CANNOT access Dominate-only features', () => {
    expect(canAccess('accelerate', 'voice_phone')).toBe(false);
    expect(canAccess('accelerate', 'custom_integrations')).toBe(false);
    expect(canAccess('accelerate', 'location_exclusivity')).toBe(false);
    expect(canAccess('accelerate', 'analytics_dashboard')).toBe(false);
  });

  it('Dominate can access voice_phone', () => {
    expect(canAccess('dominate', 'voice_phone')).toBe(true);
  });

  it('Dominate can access analytics_dashboard', () => {
    expect(canAccess('dominate', 'analytics_dashboard')).toBe(true);
  });

  it('Dominate can access location_exclusivity and custom_integrations', () => {
    expect(canAccess('dominate', 'location_exclusivity')).toBe(true);
    expect(canAccess('dominate', 'custom_integrations')).toBe(true);
  });

  it('Dominate has access to every defined feature', () => {
    const allDominateFeatures = getFeaturesForTier('dominate');

    expect(allDominateFeatures.length).toBeGreaterThanOrEqual(
      getFeaturesForTier('accelerate').length
    );

    for (const feature of allDominateFeatures) {
      expect(canAccess('dominate', feature)).toBe(true);
    }
  });

  it('invalid tier returns false for all features', () => {
    expect(canAccess('invalid' as PlanTier, 'branded_website')).toBe(false);
    expect(canAccess('invalid' as PlanTier, 'voice_phone')).toBe(false);
  });

  it('invalid feature returns false for all tiers', () => {
    expect(canAccess('dominate', 'nonexistent' as Feature)).toBe(false);
    expect(canAccess('elevate', 'nonexistent' as Feature)).toBe(false);
  });
});

// ─── getTier() default behaviour ───────────────────────────────────────────────

describe('getTier() defaults to elevate', () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  function mockSupabaseReturning(data: unknown) {
    vi.doMock('@/lib/db/server', () => ({
      createServiceClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data, error: null }),
              }),
            }),
          }),
        }),
      }),
    }));

    vi.doMock('@/lib/db/site', () => ({
      getSiteIdAsync: () => Promise.resolve('demo'),
    }));
  }

  function mockSupabaseThrows() {
    vi.doMock('@/lib/db/server', () => ({
      createServiceClient: () => {
        throw new Error('DB connection failed');
      },
    }));

    vi.doMock('@/lib/db/site', () => ({
      getSiteIdAsync: () => Promise.resolve('demo'),
    }));
  }

  it('returns elevate when DB query returns no data', async () => {
    mockSupabaseReturning(null);
    const { getTier } = await import('@/lib/entitlements.server');
    const tier = await getTier();
    expect(tier).toBe('elevate');
  });

  it('returns elevate when DB query throws an error', async () => {
    mockSupabaseThrows();
    const { getTier } = await import('@/lib/entitlements.server');
    const tier = await getTier();
    expect(tier).toBe('elevate');
  });

  it('returns elevate when plan value has invalid tier string', async () => {
    mockSupabaseReturning({ value: { tier: 'premium' } });
    const { getTier } = await import('@/lib/entitlements.server');
    const tier = await getTier();
    expect(tier).toBe('elevate');
  });

  it('returns elevate when plan value is empty object', async () => {
    mockSupabaseReturning({ value: {} });
    const { getTier } = await import('@/lib/entitlements.server');
    const tier = await getTier();
    expect(tier).toBe('elevate');
  });

  it('returns dominate when DB stores dominate tier', async () => {
    mockSupabaseReturning({ value: { tier: 'dominate' } });
    const { getTier } = await import('@/lib/entitlements.server');
    const tier = await getTier();
    expect(tier).toBe('dominate');
  });

  it('returns accelerate when DB stores accelerate tier', async () => {
    mockSupabaseReturning({ value: { tier: 'accelerate' } });
    const { getTier } = await import('@/lib/entitlements.server');
    const tier = await getTier();
    expect(tier).toBe('accelerate');
  });
});
