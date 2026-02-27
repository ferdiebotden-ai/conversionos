import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy (Next.js 16 replacement for middleware)
 * Handles:
 * 1. Domain-based tenant routing (sets x-site-id header)
 * 2. Auth gating for protected admin routes and pages
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
  'redwhite.norbotsystems.com': 'redwhitereno',
  // Demo / preview domains
  'conversionos-demo.norbotsystems.com': 'demo',
  'ai-reno-demo.vercel.app': 'demo',
  'leadquoteenginev2.vercel.app': 'redwhitereno',
  'mccarty-test.norbotsystems.com': 'mccarty-test',
  'eastview-homes.norbotsystems.com': 'eastview-homes',
  'mccarty-squared-inc.norbotsystems.com': 'mccarty-squared-inc',
  'redwhitereno-test.norbotsystems.com': 'redwhitereno-test',
};

// ─── Auth Route Classification ──────────────────────────────────────────────

const PROTECTED_API_PREFIXES = [
  '/api/admin/',
  '/api/quotes/',
  '/api/invoices/',
  '/api/drawings/',
];

const PUBLIC_API_PATTERNS = [
  '/api/quotes/accept/', // Public e-signature acceptance
];

const PROTECTED_PAGE_PREFIXES = ['/admin'];
const PUBLIC_PAGE_PATHS = ['/admin/login'];

function isProtectedAPI(pathname: string, method: string): boolean {
  // POST /api/leads is public (lead form submission), GET is admin
  if (pathname === '/api/leads' && method === 'GET') return true;
  if (pathname === '/api/leads' && method !== 'GET') return false;
  if (pathname.startsWith('/api/leads/') && !pathname.startsWith('/api/leads/unsubscribe')) return true;

  for (const pattern of PUBLIC_API_PATTERNS) {
    if (pathname.startsWith(pattern)) return false;
  }

  for (const prefix of PROTECTED_API_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }

  return false;
}

function isProtectedPage(pathname: string): boolean {
  for (const path of PUBLIC_PAGE_PATHS) {
    if (pathname === path) return false;
  }

  for (const prefix of PROTECTED_PAGE_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }

  return false;
}

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

  // ── Auth Check for Protected Routes ─────────────────────────────────────

  const { pathname } = request.nextUrl;
  const method = request.method;
  const needsAPIAuth = isProtectedAPI(pathname, method);
  const needsPageAuth = !needsAPIAuth && isProtectedPage(pathname);

  if (!needsAPIAuth && !needsPageAuth) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Create Supabase client that reads/refreshes auth cookies
  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (needsAPIAuth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify admin role
  const metadata = user.app_metadata as Record<string, unknown> | undefined;
  if (metadata?.['role'] !== 'admin') {
    if (needsAPIAuth) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
