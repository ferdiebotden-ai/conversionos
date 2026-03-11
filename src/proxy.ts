import { NextResponse, type NextRequest } from 'next/server';
import { get } from '@vercel/edge-config';

/**
 * Proxy (Next.js 16 replacement for middleware)
 * Handles domain-based tenant routing (sets x-site-id header).
 *
 * Tenant resolution order:
 * 1. Dev override (?__site_id= query param, dev mode only)
 * 2. Vercel Edge Config lookup (fast, <1ms at edge)
 * 3. Hardcoded fallback map (retained for safety)
 * 4. NEXT_PUBLIC_SITE_ID env var (dev mode only)
 *
 * Edge Config store: create via Vercel dashboard, populate with domain:siteId entries.
 * Required env vars: EDGE_CONFIG (connection string)
 *
 * TODO(phase-1): Re-enable auth gating when moving to subdomain admin pattern.
 * Auth bypass is active — all admin routes are open for prospect demo previews.
 * See git history for the full auth implementation (Supabase SSR + role check).
 *
 * In Next.js 16, proxy.ts replaces middleware.ts — they cannot coexist.
 */

// ─── Tenant Resolution ──────────────────────────────────────────────────────

/**
 * Fallback map — retained for safety until Edge Config is proven in production.
 * Once stable, this can be removed. New tenants should be added via Edge Config API.
 */
const DOMAIN_TO_SITE_FALLBACK: Record<string, string> = {
  'conversionos.norbotsystems.com': 'conversionos',
  'conversionos-demo.norbotsystems.com': 'demo',
  'red-white-reno.norbotsystems.com': 'red-white-reno',
  'redwhitereno-test-prov-test.norbotsystems.com': 'redwhitereno-test-prov-test',
  'mccarty-squared-inc.norbotsystems.com': 'mccarty-squared-inc',
  'md-construction.norbotsystems.com': 'md-construction',
  'bl-renovations.norbotsystems.com': 'bl-renovations',
  'ccr-renovations.norbotsystems.com': 'ccr-renovations',
  'brouwer-home-renovations.norbotsystems.com': 'brouwer-home-renovations',
  'go-hard-corporation.norbotsystems.com': 'go-hard-corporation',
  'westmount-craftsmen.norbotsystems.com': 'westmount-craftsmen',
  'graham-s-son-interiors.norbotsystems.com': 'graham-s-son-interiors',
  'caliber-contracting.norbotsystems.com': 'caliber-contracting',
  'joes-carpentry.norbotsystems.com': 'joes-carpentry',
  'tyton-homes.norbotsystems.com': 'tyton-homes',
  'ashton-renovations.norbotsystems.com': 'ashton-renovations',
  'sonce-homes.norbotsystems.com': 'sonce-homes',
  'way-mar-home-renovation-contractors.norbotsystems.com': 'way-mar-home-renovation-contractors',
  'donmoyer-construction.norbotsystems.com': 'donmoyer-construction',
  'lrc-construction.norbotsystems.com': 'lrc-construction',
  'devrye-custom-renovations.norbotsystems.com': 'devrye-custom-renovations',
  'sunny-side-kitchens.norbotsystems.com': 'sunny-side-kitchens',
  'a-and-a-home-renovations.norbotsystems.com': 'a-and-a-home-renovations',
  'hemeryck-homes-construction-ltd.norbotsystems.com': 'hemeryck-homes-construction-ltd',
  'ancaster-home-renovations.norbotsystems.com': 'ancaster-home-renovations',
  'zwicker-contracting.norbotsystems.com': 'zwicker-contracting',
  'house-renovations.norbotsystems.com': 'house-renovations',
  'running-renos.norbotsystems.com': 'running-renos',
  'rose-building-group.norbotsystems.com': 'rose-building-group',
  'a-p-hurley-construction.norbotsystems.com': 'a-p-hurley-construction',
  'eagleview-construction.norbotsystems.com': 'eagleview-construction',
};

// ─── Proxy Entry Point ──────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') ?? '';
  // Strip port for local dev (e.g. localhost:3000)
  const [domain = ''] = hostname.split(':');

  // Dev-only: ?__site_id= query param override
  const devOverride = process.env.NODE_ENV === 'development'
    ? request.nextUrl.searchParams.get('__site_id')
    : null;

  let siteId: string | null = devOverride;

  // Edge Config lookup (fast, <1ms at edge)
  if (!siteId) {
    try {
      siteId = await get<string>(`domain:${domain}`) ?? await get<string>(`domain:${hostname}`) ?? null;
    } catch {
      // Edge Config unavailable — fall through to hardcoded map
    }
  }

  // Fallback to hardcoded map
  if (!siteId) {
    siteId = DOMAIN_TO_SITE_FALLBACK[hostname] || DOMAIN_TO_SITE_FALLBACK[domain] || null;
  }

  // Env var fallback (dev only)
  if (!siteId && process.env.NODE_ENV === 'development') {
    siteId = process.env['NEXT_PUBLIC_SITE_ID'] ?? null;
  }

  if (!siteId) {
    return new NextResponse('Tenant not found', { status: 404 });
  }

  // Set x-site-id on the request headers so server components can read it
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-site-id', siteId);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}
