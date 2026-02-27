import { describe, it, expect } from 'vitest';
import { canAccess, getFeaturesForTier, type PlanTier, type Feature } from '@/lib/entitlements';

describe('Entitlements', () => {
  // Test tier feature counts
  it('Elevate has exactly 5 features', () => {
    expect(getFeaturesForTier('elevate')).toHaveLength(5);
  });
  it('Accelerate has exactly 14 features', () => {
    expect(getFeaturesForTier('accelerate')).toHaveLength(14);
  });
  it('Dominate has exactly 18 features', () => {
    expect(getFeaturesForTier('dominate')).toHaveLength(18);
  });

  // Exhaustive matrix: all 18 features x 3 tiers
  const allFeatures: Feature[] = [
    'branded_website', 'ai_visualizer', 'lead_capture', 'emma_text_chat',
    'admin_dashboard', 'ai_quote_engine', 'pdf_quotes', 'invoicing', 'drawings',
    'voice_web', 'voice_phone', 'custom_integrations', 'location_exclusivity',
    'pricing_display', 'analytics_dashboard', 'contractor_lead_intake',
    'csv_price_upload', 'assembly_templates',
  ];

  const tiers: PlanTier[] = ['elevate', 'accelerate', 'dominate'];

  // Elevate features
  const elevateFeatures = new Set<string>([
    'branded_website', 'ai_visualizer', 'lead_capture', 'emma_text_chat', 'voice_web',
  ]);

  // Accelerate adds these
  const accelerateFeatures = new Set<string>([
    ...elevateFeatures,
    'admin_dashboard', 'ai_quote_engine', 'pdf_quotes', 'invoicing', 'drawings',
    'pricing_display', 'contractor_lead_intake', 'csv_price_upload', 'assembly_templates',
  ]);

  // Dominate adds these
  const dominateFeatures = new Set<string>([
    ...accelerateFeatures,
    'voice_phone', 'custom_integrations', 'location_exclusivity', 'analytics_dashboard',
  ]);

  const tierFeatureSets: Record<PlanTier, Set<string>> = {
    elevate: elevateFeatures,
    accelerate: accelerateFeatures,
    dominate: dominateFeatures,
  };

  describe('exhaustive feature x tier matrix', () => {
    for (const tier of tiers) {
      for (const feature of allFeatures) {
        const expected = tierFeatureSets[tier].has(feature);
        it(`${tier} ${expected ? 'CAN' : 'CANNOT'} access ${feature}`, () => {
          expect(canAccess(tier, feature)).toBe(expected);
        });
      }
    }
  });

  describe('edge cases', () => {
    it('invalid tier returns false', () => {
      expect(canAccess('invalid' as PlanTier, 'branded_website')).toBe(false);
    });

    it('invalid feature returns false', () => {
      expect(canAccess('dominate', 'nonexistent' as Feature)).toBe(false);
    });

    it('each tier is a superset of the tier below', () => {
      const elevate = new Set(getFeaturesForTier('elevate'));
      const accelerate = new Set(getFeaturesForTier('accelerate'));
      const dominate = new Set(getFeaturesForTier('dominate'));

      for (const f of elevate) {
        expect(accelerate.has(f)).toBe(true);
        expect(dominate.has(f)).toBe(true);
      }
      for (const f of accelerate) {
        expect(dominate.has(f)).toBe(true);
      }
    });
  });
});
