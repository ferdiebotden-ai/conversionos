/**
 * Multi-tenancy helpers for site-based data isolation.
 *
 * Resolution order:
 * 1. NEXT_PUBLIC_SITE_ID env var (works in both patterns)
 * 2. Middleware-set x-site-id header (single Vercel project pattern)
 *
 * getSiteId() is synchronous and reads env var — covers all current tenants.
 * getSiteIdAsync() also checks middleware headers — use in new server code.
 */

import { headers } from 'next/headers';

/**
 * Synchronous site_id resolution (env var only).
 * Used by 80+ existing call sites. Do not make async.
 */
export function getSiteId(): string {
  const siteId = process.env['NEXT_PUBLIC_SITE_ID'];
  if (siteId) return siteId;

  throw new Error('Could not resolve site_id — set NEXT_PUBLIC_SITE_ID or configure middleware');
}

/**
 * Async site_id resolution with proxy header support.
 * Checks proxy-set header FIRST (enables single-project multi-tenancy),
 * then falls back to env var (for per-tenant Vercel projects).
 *
 * Calling headers() forces Next.js dynamic rendering — use this in pages
 * that need per-tenant content via proxy routing.
 */
export async function getSiteIdAsync(): Promise<string> {
  // 1. Proxy-set header (single Vercel project pattern)
  try {
    const h = await headers();
    const fromHeader = h.get('x-site-id');
    if (fromHeader) return fromHeader;
  } catch {
    // headers() throws outside request context (build time, scripts)
  }

  // 2. Env var fallback (per-tenant Vercel projects, or default tenant)
  const fromEnv = process.env['NEXT_PUBLIC_SITE_ID'];
  if (fromEnv) return fromEnv;

  throw new Error('Could not resolve site_id — set NEXT_PUBLIC_SITE_ID or configure proxy');
}

export function withSiteId<T extends Record<string, unknown>>(data: T): T & { site_id: string } {
  return { ...data, site_id: getSiteId() };
}
