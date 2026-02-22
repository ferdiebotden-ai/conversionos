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
 * Async site_id resolution with middleware header support.
 * Use in new server components and API routes for single-project deployments.
 */
export async function getSiteIdAsync(): Promise<string> {
  // 1. Env var takes precedence (works in both deployment patterns)
  const fromEnv = process.env['NEXT_PUBLIC_SITE_ID'];
  if (fromEnv) return fromEnv;

  // 2. Middleware-set header (single Vercel project pattern)
  try {
    const h = await headers();
    const fromHeader = h.get('x-site-id');
    if (fromHeader) return fromHeader;
  } catch {
    // headers() throws outside request context (build time, scripts)
  }

  throw new Error('Could not resolve site_id — set NEXT_PUBLIC_SITE_ID or configure middleware');
}

export function withSiteId<T extends Record<string, unknown>>(data: T): T & { site_id: string } {
  return { ...data, site_id: getSiteId() };
}
