/**
 * Server-side deposit rate helper.
 * Reads deposit_rate from admin_settings, falls back to DEFAULT_DEPOSIT_PERCENT.
 */

import { createServiceClient } from '@/lib/db/server';
import { getSiteId } from '@/lib/db/site';
import { DEFAULT_DEPOSIT_PERCENT } from './constants';

/**
 * Get the tenant's deposit percentage from admin_settings.
 * Returns DEFAULT_DEPOSIT_PERCENT (15) if not configured.
 */
export async function getDepositPercent(): Promise<number> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('site_id', getSiteId())
      .eq('key', 'deposit_rate')
      .single();

    const percent = (data?.value as { percent?: number } | null)?.percent;
    if (typeof percent === 'number' && percent >= 0 && percent <= 100) {
      return percent;
    }
  } catch {
    // Fall through to default
  }
  return DEFAULT_DEPOSIT_PERCENT;
}
