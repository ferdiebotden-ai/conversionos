import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy (Next.js 16 replacement for middleware)
 * Handles domain-based tenant routing (sets x-site-id header).
 *
 * TODO(phase-1): Re-enable auth gating when moving to subdomain admin pattern.
 * Auth bypass is active — all admin routes are open for prospect demo previews.
 * See git history for the full auth implementation (Supabase SSR + role check).
 *
 * In Next.js 16, proxy.ts replaces middleware.ts — they cannot coexist.
 */

// ─── Tenant Resolution ──────────────────────────────────────────────────────

/**
 * Domain → site_id mapping.
 * Add new tenants here. When >20 tenants, migrate to Vercel Edge Config.
 */
const DOMAIN_TO_SITE: Record<string, string> = {
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

  // Resolve site_id: dev override → domain map → env var (dev only)
  const siteId =
    devOverride ||
    DOMAIN_TO_SITE[hostname] ||
    DOMAIN_TO_SITE[domain] ||
    (process.env.NODE_ENV === 'development' ? process.env['NEXT_PUBLIC_SITE_ID'] : null);

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
