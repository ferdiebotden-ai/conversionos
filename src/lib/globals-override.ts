/**
 * Globals Override — CSS Variable Injection
 *
 * Reads `globals_override` from admin_settings and returns a CSS string
 * that overrides :root CSS variables. Used by layout.tsx to inject
 * per-tenant colour palettes for warm-lead builds.
 *
 * The `globals_override` value in admin_settings is a JSON object like:
 * {
 *   "--primary": "oklch(0.85 0.16 85)",
 *   "--primary-foreground": "oklch(0.2 0.05 85)",
 *   "--accent": "oklch(0.7 0.1 45)"
 * }
 *
 * Only CSS custom property names (starting with "--") are accepted.
 * Invalid entries are silently skipped.
 */

import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync } from '@/lib/db/site';

/** Allowlist pattern: only CSS custom properties (--something). */
const CSS_VAR_PATTERN = /^--[a-zA-Z][a-zA-Z0-9-]*$/;

/**
 * Fetch globals_override from admin_settings and return a `:root` CSS string.
 * Returns null if no override exists or the value is invalid.
 */
export async function getGlobalsOverride(): Promise<string | null> {
  try {
    const siteId = await getSiteIdAsync();
    const supabase = createServiceClient();

    const { data } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('site_id', siteId)
      .eq('key', 'globals_override')
      .single();

    if (!data?.value || typeof data.value !== 'object') return null;

    const overrides = data.value as Record<string, unknown>;
    const declarations: string[] = [];

    for (const [key, val] of Object.entries(overrides)) {
      // Only accept CSS custom properties with string values
      if (!CSS_VAR_PATTERN.test(key)) continue;
      if (typeof val !== 'string') continue;
      // Sanitise: strip semicolons and braces to prevent CSS injection
      const safeVal = val.replace(/[;{}]/g, '');
      declarations.push(`${key}:${safeVal};`);
    }

    if (declarations.length === 0) return null;

    return `:root{${declarations.join('')}}`;
  } catch {
    // DB unavailable or key not found — graceful fallback
    return null;
  }
}
