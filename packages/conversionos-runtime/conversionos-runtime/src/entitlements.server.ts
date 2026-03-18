/**
 * Server-side tier resolution.
 * Reads the `plan` key from admin_settings for the current tenant.
 */

import { createServiceClient } from './db/server';
import { getSiteIdAsync } from './db/site';
import type { PlanTier } from './entitlements';

const DEFAULT_TIER: PlanTier = 'elevate';

/**
 * Fetch the plan tier for the current tenant.
 * Defaults to 'elevate' (deny-by-default) if plan not found.
 */
export async function getTier(): Promise<PlanTier> {
  try {
    const supabase = createServiceClient();
    const siteId = await getSiteIdAsync();

    const { data } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('site_id', siteId)
      .eq('key', 'plan')
      .single();

    if (!data?.value) return DEFAULT_TIER;

    const plan = data.value as Record<string, unknown>;
    const tier = plan['tier'] as string | undefined;

    if (tier === 'elevate' || tier === 'accelerate' || tier === 'dominate' || tier === 'black_label') {
      return tier;
    }

    return DEFAULT_TIER;
  } catch {
    return DEFAULT_TIER;
  }
}
