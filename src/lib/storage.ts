/**
 * Supabase Storage helpers for tenant assets.
 *
 * Path convention: {site_id}/hero.jpg, {site_id}/logo.svg,
 * {site_id}/team/{slug}.jpg, {site_id}/portfolio/{index}.jpg
 */

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const BUCKET = 'tenant-assets';

/**
 * Get the public URL for a tenant asset in Supabase Storage.
 */
export function getAssetUrl(siteId: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${siteId}/${path}`;
}

/**
 * Return url if it's a valid non-empty string, otherwise return fallback.
 * Handles undefined, empty strings, and null gracefully.
 */
export function getAssetUrlOrFallback(url: string | undefined | null, fallback: string): string {
  if (url && url.trim().length > 0) return url;
  return fallback;
}
