/**
 * Entitlements — Feature gating by pricing tier.
 * Pure functions, no DB calls. Import anywhere (client or server).
 */

export type PlanTier = 'elevate' | 'accelerate' | 'dominate';

export type Feature =
  | 'branded_website'
  | 'ai_visualizer'
  | 'lead_capture'
  | 'emma_text_chat'
  | 'admin_dashboard'
  | 'ai_quote_engine'
  | 'pdf_quotes'
  | 'invoicing'
  | 'drawings'
  | 'voice_web'
  | 'voice_phone'
  | 'custom_integrations'
  | 'location_exclusivity'
  | 'pricing_display'
  | 'analytics_dashboard'
  | 'contractor_lead_intake'
  | 'csv_price_upload'
  | 'assembly_templates';

const TIER_FEATURES: Record<PlanTier, Set<Feature>> = {
  elevate: new Set([
    'branded_website',
    'ai_visualizer',
    'lead_capture',
    'emma_text_chat',
    'voice_web',
  ]),
  accelerate: new Set([
    'branded_website',
    'ai_visualizer',
    'lead_capture',
    'emma_text_chat',
    'admin_dashboard',
    'ai_quote_engine',
    'pdf_quotes',
    'invoicing',
    'drawings',
    'voice_web',
    'pricing_display',
    'contractor_lead_intake',
    'csv_price_upload',
    'assembly_templates',
  ]),
  dominate: new Set([
    'branded_website',
    'ai_visualizer',
    'lead_capture',
    'emma_text_chat',
    'admin_dashboard',
    'ai_quote_engine',
    'pdf_quotes',
    'invoicing',
    'drawings',
    'voice_web',
    'voice_phone',
    'custom_integrations',
    'location_exclusivity',
    'pricing_display',
    'analytics_dashboard',
    'contractor_lead_intake',
    'csv_price_upload',
    'assembly_templates',
  ]),
};

/** Check if a tier has access to a feature. */
export function canAccess(tier: PlanTier, feature: Feature): boolean {
  return TIER_FEATURES[tier]?.has(feature) ?? false;
}

/** Get all features available for a tier. */
export function getFeaturesForTier(tier: PlanTier): Feature[] {
  return Array.from(TIER_FEATURES[tier] ?? []);
}
