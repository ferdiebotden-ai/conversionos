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
  // Production domains
  'mccarty.norbotsystems.com': 'mccarty-squared',
  'redwhite.norbotsystems.com': 'red-white-reno',
  // Demo / preview domains
  'conversionos-demo.norbotsystems.com': 'demo',
  'ai-reno-demo.vercel.app': 'demo',
  'leadquoteenginev2.vercel.app': 'red-white-reno',
  'mccarty-test.norbotsystems.com': 'mccarty-test',
  'eastview-homes.norbotsystems.com': 'eastview-homes',
  'mccarty-squared-inc.norbotsystems.com': 'mccarty-squared-inc',
  'redwhitereno-test.norbotsystems.com': 'redwhitereno-test',
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

  // Resolve site_id: dev override → domain map → env var
  const siteId =
    devOverride ||
    DOMAIN_TO_SITE[hostname] ||
    DOMAIN_TO_SITE[domain] ||
    process.env['NEXT_PUBLIC_SITE_ID'];

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
