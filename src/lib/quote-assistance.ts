/**
 * Quote Assistance Configuration
 * Per-tenant setting controlling how pricing is displayed to homeowners.
 * Stored as `quote_assistance` key in admin_settings.
 */

import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync } from '@/lib/db/site';
import type { PlanTier } from '@/lib/entitlements';

export type QuoteAssistanceMode = 'none' | 'range' | 'estimate';

export interface QuoteAssistanceConfig {
  mode: QuoteAssistanceMode;
  /** Band width for range mode ($1000, $5000, $10000). Only used when mode === 'range'. */
  rangeBand: 1000 | 5000 | 10000;
}

const DEFAULT_CONFIG: QuoteAssistanceConfig = {
  mode: 'range',
  rangeBand: 10000,
};

/**
 * Get the quote assistance config for the current tenant.
 * Elevate tier always returns { mode: 'none' } — hardcoded, no setting UI.
 * Accelerate/Dominate read from admin_settings, defaulting to range/$10K.
 */
export async function getQuoteAssistanceConfig(
  tier?: PlanTier,
): Promise<QuoteAssistanceConfig> {
  // Elevate: always none (no admin dashboard to configure)
  if (tier === 'elevate') {
    return { mode: 'none', rangeBand: 10000 };
  }

  try {
    const supabase = createServiceClient();
    const siteId = await getSiteIdAsync();

    const { data } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('site_id', siteId)
      .eq('key', 'quote_assistance')
      .single();

    if (!data?.value) return DEFAULT_CONFIG;

    const raw = data.value as Record<string, unknown>;
    const mode = raw['mode'] as string | undefined;
    const rangeBand = raw['rangeBand'] as number | undefined;

    return {
      mode: (mode === 'none' || mode === 'range' || mode === 'estimate')
        ? mode
        : DEFAULT_CONFIG.mode,
      rangeBand: (rangeBand === 1000 || rangeBand === 5000 || rangeBand === 10000)
        ? rangeBand
        : DEFAULT_CONFIG.rangeBand,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Describe the quote assistance mode for display in admin settings.
 */
export const QUOTE_ASSISTANCE_MODE_LABELS: Record<QuoteAssistanceMode, {
  label: string;
  description: string;
}> = {
  none: {
    label: 'No Pricing',
    description: 'No dollar amounts shown. Homeowners see "Request a callback for pricing."',
  },
  range: {
    label: 'Price Range',
    description: 'Show cost ranges with configurable band width (e.g. "$25,000 – $35,000 + HST").',
  },
  estimate: {
    label: 'Full Estimate',
    description: 'Show best AI estimate with disclaimer (e.g. "AI estimate: ~$31,500 + HST").',
  },
};

export const RANGE_BAND_OPTIONS = [
  { value: 1000, label: '$1,000' },
  { value: 5000, label: '$5,000' },
  { value: 10000, label: '$10,000' },
] as const;
