/**
 * Scope Gap Detection Rules — Unit Tests
 * Tests for the pure-function rules engine that detects commonly missing
 * items in renovation quotes.
 */

import { describe, it, expect } from 'vitest';
import {
  detectScopeGaps,
  type ScopeGap,
  type ScopeGapContext,
} from '@/lib/ai/scope-gap-rules';
import type { LineItem } from '@/components/admin/quote-line-item';

// ─── Test Helpers ────────────────────────────────────────────────

let idCounter = 0;

/** Build a minimal LineItem with sensible defaults. */
function makeItem(overrides: Partial<LineItem> & { description: string }): LineItem {
  idCounter += 1;
  return {
    id: `item-${idCounter}`,
    category: 'materials',
    quantity: 1,
    unit: 'each',
    unit_price: 500,
    total: 500,
    ...overrides,
  };
}

/** Shorthand: build an array of items from description strings. */
function itemsFromDescriptions(descriptions: string[]): LineItem[] {
  return descriptions.map((d) => makeItem({ description: d }));
}

/** Find a gap by ruleId in the result array. */
function findGap(gaps: ScopeGap[], ruleId: string): ScopeGap | undefined {
  return gaps.find((g) => g.ruleId === ruleId);
}

// ─── Empty / Baseline ────────────────────────────────────────────

describe('detectScopeGaps', () => {
  describe('baseline behaviour', () => {
    it('returns empty array for empty line items', () => {
      const result = detectScopeGaps([], 'kitchen');
      expect(result).toEqual([]);
    });

    it('returns empty array when no rules match', () => {
      const items = itemsFromDescriptions(['Random thing that matches nothing']);
      const result = detectScopeGaps(items, 'kitchen');
      // May still trigger protection-cleanup if item count >= 4, but with 1 item it should not
      expect(result).toEqual([]);
    });

    it('never produces duplicate rule IDs in output', () => {
      // Deliberately large list that could trigger multiple universal rules
      const items = itemsFromDescriptions([
        'Demolition of existing kitchen',
        'Cabinet install',
        'Countertop install',
        'Flooring laminate',
        'Electrical panel upgrade',
        'Plumbing rough-in work',
      ]);
      const result = detectScopeGaps(items, 'kitchen');
      const ruleIds = result.map((g) => g.ruleId);
      const uniqueIds = new Set(ruleIds);
      expect(ruleIds.length).toBe(uniqueIds.size);
    });

    it('sorts warnings before info items', () => {
      // Bathroom with tile (triggers warning: waterproofing) and no exhaust (triggers info: exhaust fan)
      const items = itemsFromDescriptions([
        'Tile shower installation',
        'Vanity install',
        'Floor tile ceramic',
        'Toilet replacement',
      ]);
      const result = detectScopeGaps(items, 'bathroom');
      const severities = result.map((g) => g.severity);
      const firstInfoIdx = severities.indexOf('info');
      const lastWarningIdx = severities.lastIndexOf('warning');
      if (firstInfoIdx !== -1 && lastWarningIdx !== -1) {
        expect(lastWarningIdx).toBeLessThan(firstInfoIdx);
      }
    });
  });

  // ─── Bathroom Rules ──────────────────────────────────────────

  describe('bathroom rules', () => {
    describe('bath-waterproofing', () => {
      it('triggers when tile is present but no waterproofing membrane', () => {
        const items = itemsFromDescriptions(['Ceramic tile installation', 'Vanity']);
        const gaps = detectScopeGaps(items, 'bathroom');
        const gap = findGap(gaps, 'bath-waterproofing');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('warning');
        expect(gap!.estimatedCostLow).toBe(200);
        expect(gap!.estimatedCostHigh).toBe(600);
        expect(gap!.suggestedItem.category).toBe('materials');
      });

      it('triggers when shower is present but no waterproofing', () => {
        const items = itemsFromDescriptions(['Shower base install']);
        const gaps = detectScopeGaps(items, 'bathroom');
        expect(findGap(gaps, 'bath-waterproofing')).toBeDefined();
      });

      it('does NOT trigger when waterproofing membrane is included', () => {
        const items = itemsFromDescriptions([
          'Tile installation',
          'Waterproofing membrane application',
        ]);
        const gaps = detectScopeGaps(items, 'bathroom');
        expect(findGap(gaps, 'bath-waterproofing')).toBeUndefined();
      });

      it('does NOT trigger when Schluter Kerdi is included', () => {
        const items = itemsFromDescriptions([
          'Shower tile work',
          'Schluter Kerdi waterproof system',
        ]);
        const gaps = detectScopeGaps(items, 'bathroom');
        expect(findGap(gaps, 'bath-waterproofing')).toBeUndefined();
      });

      it('does NOT trigger for kitchen project type', () => {
        const items = itemsFromDescriptions(['Tile backsplash']);
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'bath-waterproofing')).toBeUndefined();
      });
    });

    describe('bath-exhaust-fan', () => {
      it('triggers when no exhaust fan is present in bathroom', () => {
        const items = itemsFromDescriptions(['Vanity install', 'Toilet']);
        const gaps = detectScopeGaps(items, 'bathroom');
        const gap = findGap(gaps, 'bath-exhaust-fan');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('info');
        expect(gap!.estimatedCostLow).toBe(150);
        expect(gap!.estimatedCostHigh).toBe(400);
      });

      it('does NOT trigger when exhaust fan is included', () => {
        const items = itemsFromDescriptions(['Vanity install', 'Exhaust fan supply and install']);
        const gaps = detectScopeGaps(items, 'bathroom');
        expect(findGap(gaps, 'bath-exhaust-fan')).toBeUndefined();
      });

      it('does NOT trigger when ventilation fan is included', () => {
        const items = itemsFromDescriptions(['Vanity', 'Ventilation fan upgrade']);
        const gaps = detectScopeGaps(items, 'bathroom');
        expect(findGap(gaps, 'bath-exhaust-fan')).toBeUndefined();
      });
    });

    describe('bath-subfloor', () => {
      it('triggers when floor tile is present but no backer board', () => {
        const items = itemsFromDescriptions(['Floor tile installation']);
        const gaps = detectScopeGaps(items, 'bathroom');
        const gap = findGap(gaps, 'bath-subfloor');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('info');
        expect(gap!.estimatedCostLow).toBe(200);
        expect(gap!.estimatedCostHigh).toBe(500);
      });

      it('does NOT trigger when backer board is included', () => {
        const items = itemsFromDescriptions([
          'Floor tile ceramic installation',
          'Cement board backer board',
        ]);
        const gaps = detectScopeGaps(items, 'bathroom');
        expect(findGap(gaps, 'bath-subfloor')).toBeUndefined();
      });

      it('does NOT trigger when DITRA is included', () => {
        const items = itemsFromDescriptions([
          'Porcelain floor tile',
          'DITRA uncoupling membrane',
        ]);
        const gaps = detectScopeGaps(items, 'bathroom');
        expect(findGap(gaps, 'bath-subfloor')).toBeUndefined();
      });

      it('does NOT trigger for plain "tile" without floor keyword', () => {
        // The rule checks for 'floor tile', 'tile floor', 'ceramic floor', 'porcelain floor'
        const items = itemsFromDescriptions(['Wall tile installation']);
        const gaps = detectScopeGaps(items, 'bathroom');
        expect(findGap(gaps, 'bath-subfloor')).toBeUndefined();
      });
    });
  });

  // ─── Kitchen Rules ───────────────────────────────────────────

  describe('kitchen rules', () => {
    describe('kitchen-backsplash-prep', () => {
      it('triggers when backsplash is present but no wall prep', () => {
        const items = itemsFromDescriptions(['Subway tile backsplash install']);
        const gaps = detectScopeGaps(items, 'kitchen');
        const gap = findGap(gaps, 'kitchen-backsplash-prep');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('info');
        expect(gap!.suggestedItem.category).toBe('labor');
      });

      it('does NOT trigger when wall prep is included', () => {
        const items = itemsFromDescriptions([
          'Backsplash installation',
          'Wall prep and skim coat',
        ]);
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'kitchen-backsplash-prep')).toBeUndefined();
      });

      it('does NOT trigger when drywall repair is included', () => {
        const items = itemsFromDescriptions([
          'Backsplash tile',
          'Drywall repair behind cabinets',
        ]);
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'kitchen-backsplash-prep')).toBeUndefined();
      });
    });

    describe('kitchen-plumbing-rough', () => {
      it('triggers when new sink is present but no rough-in', () => {
        const items = itemsFromDescriptions(['New sink installation']);
        const gaps = detectScopeGaps(items, 'kitchen');
        const gap = findGap(gaps, 'kitchen-plumbing-rough');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('warning');
        expect(gap!.suggestedItem.category).toBe('contract');
      });

      it('does NOT trigger when rough-in is included', () => {
        const items = itemsFromDescriptions([
          'New sink installation',
          'Plumbing rough-in and hookup',
        ]);
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'kitchen-plumbing-rough')).toBeUndefined();
      });

      it('does NOT trigger when supply line work is included', () => {
        const items = itemsFromDescriptions([
          'Sink install new',
          'Supply line replacement',
        ]);
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'kitchen-plumbing-rough')).toBeUndefined();
      });
    });

    describe('kitchen-electrical', () => {
      it('triggers for major renovation (5+ items) with no electrical work', () => {
        const items = itemsFromDescriptions([
          'Cabinet install',
          'Countertop install',
          'New sink installation',
          'Flooring laminate',
          'Painting walls',
        ]);
        const gaps = detectScopeGaps(items, 'kitchen');
        const gap = findGap(gaps, 'kitchen-electrical');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('info');
        expect(gap!.estimatedCostLow).toBe(1500);
        expect(gap!.estimatedCostHigh).toBe(4000);
      });

      it('does NOT trigger when fewer than 5 items', () => {
        const items = itemsFromDescriptions([
          'Cabinet install',
          'Countertop install',
          'Sink install',
          'Painting',
        ]);
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'kitchen-electrical')).toBeUndefined();
      });

      it('does NOT trigger when electrical work is included', () => {
        const items = itemsFromDescriptions([
          'Cabinet install',
          'Countertop install',
          'New sink installation',
          'Flooring laminate',
          'Electrical panel upgrade',
        ]);
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'kitchen-electrical')).toBeUndefined();
      });
    });

    describe('kitchen-demolition', () => {
      it('triggers when renovation items present but no demolition', () => {
        const items = itemsFromDescriptions(['New cabinet installation', 'Countertop granite']);
        const gaps = detectScopeGaps(items, 'kitchen');
        const gap = findGap(gaps, 'kitchen-demolition');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('warning');
        expect(gap!.suggestedItem.category).toBe('labor');
      });

      it('does NOT trigger when demolition is included', () => {
        const items = itemsFromDescriptions([
          'Cabinet installation',
          'Demolition of existing kitchen',
        ]);
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'kitchen-demolition')).toBeUndefined();
      });

      it('does NOT trigger when removal is included', () => {
        const items = itemsFromDescriptions([
          'Countertop replacement',
          'Removal of old countertops',
        ]);
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'kitchen-demolition')).toBeUndefined();
      });

      it('does NOT trigger for bathroom project type', () => {
        const items = itemsFromDescriptions(['Cabinet vanity installation']);
        const gaps = detectScopeGaps(items, 'bathroom');
        expect(findGap(gaps, 'kitchen-demolition')).toBeUndefined();
      });
    });
  });

  // ─── Basement Rules ──────────────────────────────────────────

  describe('basement rules', () => {
    describe('basement-egress', () => {
      it('triggers when context.includesBedroom is true but no egress window', () => {
        const items = itemsFromDescriptions(['Framing walls', 'Drywall installation']);
        const context: ScopeGapContext = { includesBedroom: true };
        const gaps = detectScopeGaps(items, 'basement', context);
        const gap = findGap(gaps, 'basement-egress');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('warning');
        expect(gap!.estimatedCostLow).toBe(3000);
        expect(gap!.estimatedCostHigh).toBe(6000);
      });

      it('triggers when line item mentions bedroom and no egress', () => {
        const items = itemsFromDescriptions(['Bedroom framing', 'Insulation']);
        const gaps = detectScopeGaps(items, 'basement');
        expect(findGap(gaps, 'basement-egress')).toBeDefined();
      });

      it('does NOT trigger when egress window is included', () => {
        const items = itemsFromDescriptions(['Bedroom framing', 'Egress window install']);
        const gaps = detectScopeGaps(items, 'basement');
        expect(findGap(gaps, 'basement-egress')).toBeUndefined();
      });

      it('does NOT trigger when includesBedroom is false and no bedroom items', () => {
        const items = itemsFromDescriptions(['Framing', 'Drywall']);
        const context: ScopeGapContext = { includesBedroom: false };
        const gaps = detectScopeGaps(items, 'basement', context);
        expect(findGap(gaps, 'basement-egress')).toBeUndefined();
      });

      it('does NOT trigger for kitchen project type', () => {
        const items = itemsFromDescriptions(['Bedroom addition']);
        const context: ScopeGapContext = { includesBedroom: true };
        const gaps = detectScopeGaps(items, 'kitchen', context);
        expect(findGap(gaps, 'basement-egress')).toBeUndefined();
      });
    });

    describe('basement-moisture', () => {
      it('triggers when finishing items present but no moisture barrier', () => {
        const items = itemsFromDescriptions(['Drywall installation', 'Framing walls']);
        const gaps = detectScopeGaps(items, 'basement');
        const gap = findGap(gaps, 'basement-moisture');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('warning');
      });

      it('does NOT trigger when vapour barrier is included', () => {
        const items = itemsFromDescriptions([
          'Drywall installation',
          'Vapour barrier installation',
        ]);
        const gaps = detectScopeGaps(items, 'basement');
        expect(findGap(gaps, 'basement-moisture')).toBeUndefined();
      });

      it('does NOT trigger when dimple board is included', () => {
        const items = itemsFromDescriptions([
          'Insulation batts',
          'Dimple board on foundation walls',
        ]);
        const gaps = detectScopeGaps(items, 'basement');
        expect(findGap(gaps, 'basement-moisture')).toBeUndefined();
      });
    });

    describe('basement-fire-sep', () => {
      it('triggers when bedroom planned but no fire separation', () => {
        const items = itemsFromDescriptions(['Framing', 'Drywall']);
        const context: ScopeGapContext = { includesBedroom: true };
        const gaps = detectScopeGaps(items, 'basement', context);
        const gap = findGap(gaps, 'basement-fire-sep');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('warning');
        expect(gap!.estimatedCostLow).toBe(500);
        expect(gap!.estimatedCostHigh).toBe(1200);
      });

      it('does NOT trigger when smoke alarm is included', () => {
        const items = itemsFromDescriptions(['Bedroom sleeping area', 'Smoke alarm install']);
        const gaps = detectScopeGaps(items, 'basement');
        expect(findGap(gaps, 'basement-fire-sep')).toBeUndefined();
      });

      it('does NOT trigger when fire-rated drywall is included', () => {
        const items = itemsFromDescriptions(['Bedroom framing', 'Fire-rated drywall']);
        const gaps = detectScopeGaps(items, 'basement');
        expect(findGap(gaps, 'basement-fire-sep')).toBeUndefined();
      });
    });
  });

  // ─── Universal Rules ─────────────────────────────────────────

  describe('universal rules (all project types)', () => {
    describe('permit-missing', () => {
      it('triggers when structural work present but no permit', () => {
        const items = itemsFromDescriptions(['Structural beam replacement']);
        const gaps = detectScopeGaps(items, 'kitchen');
        const gap = findGap(gaps, 'permit-missing');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('warning');
        expect(gap!.suggestedItem.category).toBe('permit');
      });

      it('triggers for electrical work without permit', () => {
        const items = itemsFromDescriptions(['Electrical panel upgrade']);
        const gaps = detectScopeGaps(items, 'basement');
        expect(findGap(gaps, 'permit-missing')).toBeDefined();
      });

      it('triggers for plumbing work without permit', () => {
        const items = itemsFromDescriptions(['Plumbing rough-in']);
        const gaps = detectScopeGaps(items, 'bathroom');
        expect(findGap(gaps, 'permit-missing')).toBeDefined();
      });

      it('triggers for any project type (universal rule)', () => {
        const items = itemsFromDescriptions(['HVAC ductwork install']);
        const gaps = detectScopeGaps(items, 'flooring');
        expect(findGap(gaps, 'permit-missing')).toBeDefined();
      });

      it('does NOT trigger when permit line item exists', () => {
        const items = itemsFromDescriptions([
          'Electrical panel upgrade',
          'Building permit application',
        ]);
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'permit-missing')).toBeUndefined();
      });

      it('does NOT trigger when a permit-category item exists', () => {
        const items = [
          makeItem({ description: 'Framing new wall', category: 'labor' }),
          makeItem({ description: 'Municipal fee', category: 'permit' }),
        ];
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'permit-missing')).toBeUndefined();
      });
    });

    describe('dumpster-disposal', () => {
      it('triggers when demolition present but no disposal', () => {
        const items = itemsFromDescriptions(['Kitchen demolition']);
        const gaps = detectScopeGaps(items, 'kitchen');
        const gap = findGap(gaps, 'dumpster-disposal');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('info');
        expect(gap!.suggestedItem.category).toBe('equipment');
      });

      it('does NOT trigger when dumpster rental is included', () => {
        const items = itemsFromDescriptions([
          'Demolition of old bathroom',
          'Dumpster rental 14-day',
        ]);
        const gaps = detectScopeGaps(items, 'bathroom');
        expect(findGap(gaps, 'dumpster-disposal')).toBeUndefined();
      });

      it('does NOT trigger when waste removal is included', () => {
        const items = itemsFromDescriptions([
          'Demo tear out of flooring',
          'Waste removal and haul away',
        ]);
        const gaps = detectScopeGaps(items, 'flooring');
        expect(findGap(gaps, 'dumpster-disposal')).toBeUndefined();
      });
    });

    describe('protection-cleanup', () => {
      it('triggers for 4+ items with no protection or cleanup', () => {
        const items = itemsFromDescriptions([
          'Item A',
          'Item B',
          'Item C',
          'Item D',
        ]);
        const gaps = detectScopeGaps(items, 'kitchen');
        const gap = findGap(gaps, 'protection-cleanup');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('info');
        expect(gap!.suggestedItem.category).toBe('allowances');
      });

      it('does NOT trigger with fewer than 4 items', () => {
        const items = itemsFromDescriptions(['Item A', 'Item B', 'Item C']);
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'protection-cleanup')).toBeUndefined();
      });

      it('does NOT trigger when cleanup is already included', () => {
        const items = itemsFromDescriptions([
          'Item A',
          'Item B',
          'Item C',
          'Final cleanup and sweep',
        ]);
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'protection-cleanup')).toBeUndefined();
      });

      it('does NOT trigger when floor protection is included', () => {
        const items = itemsFromDescriptions([
          'Item A',
          'Item B',
          'Item C',
          'Floor protection during reno',
        ]);
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'protection-cleanup')).toBeUndefined();
      });
    });

    describe('asbestos-testing', () => {
      it('triggers for demolition in pre-1980 home', () => {
        const items = itemsFromDescriptions(['Demolition of ceiling tiles']);
        const context: ScopeGapContext = { homeBuiltYear: 1965 };
        const gaps = detectScopeGaps(items, 'kitchen', context);
        const gap = findGap(gaps, 'asbestos-testing');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('warning');
        expect(gap!.estimatedCostLow).toBe(300);
        expect(gap!.estimatedCostHigh).toBe(600);
      });

      it('does NOT trigger for post-1980 home', () => {
        const items = itemsFromDescriptions(['Demolition work']);
        const context: ScopeGapContext = { homeBuiltYear: 1985 };
        const gaps = detectScopeGaps(items, 'kitchen', context);
        expect(findGap(gaps, 'asbestos-testing')).toBeUndefined();
      });

      it('does NOT trigger for exactly 1980 (boundary: requires < 1980)', () => {
        const items = itemsFromDescriptions(['Demo and tear-out']);
        const context: ScopeGapContext = { homeBuiltYear: 1980 };
        const gaps = detectScopeGaps(items, 'kitchen', context);
        expect(findGap(gaps, 'asbestos-testing')).toBeUndefined();
      });

      it('does NOT trigger when homeBuiltYear is undefined', () => {
        const items = itemsFromDescriptions(['Demolition of walls']);
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'asbestos-testing')).toBeUndefined();
      });

      it('does NOT trigger when asbestos testing is already included', () => {
        const items = itemsFromDescriptions([
          'Demolition work',
          'Asbestos testing and report',
        ]);
        const context: ScopeGapContext = { homeBuiltYear: 1970 };
        const gaps = detectScopeGaps(items, 'kitchen', context);
        expect(findGap(gaps, 'asbestos-testing')).toBeUndefined();
      });

      it('does NOT trigger when no demolition is planned', () => {
        const items = itemsFromDescriptions(['Painting walls', 'New fixtures']);
        const context: ScopeGapContext = { homeBuiltYear: 1960 };
        const gaps = detectScopeGaps(items, 'kitchen', context);
        expect(findGap(gaps, 'asbestos-testing')).toBeUndefined();
      });
    });
  });

  // ─── Flooring Rules ──────────────────────────────────────────

  describe('flooring rules', () => {
    describe('underlayment', () => {
      it('triggers when flooring present but no underlayment', () => {
        const items = itemsFromDescriptions(['Laminate flooring install']);
        const gaps = detectScopeGaps(items, 'flooring');
        const gap = findGap(gaps, 'underlayment');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('info');
        expect(gap!.suggestedItem.category).toBe('materials');
      });

      it('applies to kitchen project type as well', () => {
        const items = itemsFromDescriptions(['Vinyl plank flooring']);
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'underlayment')).toBeDefined();
      });

      it('applies to basement project type as well', () => {
        const items = itemsFromDescriptions(['Engineered hardwood']);
        const gaps = detectScopeGaps(items, 'basement');
        expect(findGap(gaps, 'underlayment')).toBeDefined();
      });

      it('does NOT trigger when underlayment is included', () => {
        const items = itemsFromDescriptions([
          'Hardwood flooring',
          'Underlayment moisture barrier',
        ]);
        const gaps = detectScopeGaps(items, 'flooring');
        expect(findGap(gaps, 'underlayment')).toBeUndefined();
      });

      it('does NOT trigger when subfloor is included', () => {
        const items = itemsFromDescriptions([
          'Laminate flooring',
          'Subfloor levelling',
        ]);
        const gaps = detectScopeGaps(items, 'flooring');
        expect(findGap(gaps, 'underlayment')).toBeUndefined();
      });

      it('does NOT apply to bathroom project type', () => {
        // underlayment rule projectTypes: ['flooring', 'kitchen', 'basement'] — bathroom not included
        const items = itemsFromDescriptions(['Vinyl plank flooring']);
        const gaps = detectScopeGaps(items, 'bathroom');
        expect(findGap(gaps, 'underlayment')).toBeUndefined();
      });
    });

    describe('flooring-transitions', () => {
      it('triggers when flooring present but no transitions', () => {
        const items = itemsFromDescriptions(['Hardwood flooring installation']);
        const gaps = detectScopeGaps(items, 'flooring');
        const gap = findGap(gaps, 'flooring-transitions');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('info');
        expect(gap!.estimatedCostLow).toBe(100);
        expect(gap!.estimatedCostHigh).toBe(350);
      });

      it('does NOT trigger when trim is included', () => {
        const items = itemsFromDescriptions([
          'Laminate flooring',
          'Baseboard trim installation',
        ]);
        const gaps = detectScopeGaps(items, 'flooring');
        expect(findGap(gaps, 'flooring-transitions')).toBeUndefined();
      });

      it('does NOT trigger when threshold is included', () => {
        const items = itemsFromDescriptions([
          'Vinyl plank install',
          'Door threshold strips',
        ]);
        const gaps = detectScopeGaps(items, 'flooring');
        expect(findGap(gaps, 'flooring-transitions')).toBeUndefined();
      });

      it('applies to bathroom project type', () => {
        const items = itemsFromDescriptions(['Tile flooring new']);
        const gaps = detectScopeGaps(items, 'bathroom');
        expect(findGap(gaps, 'flooring-transitions')).toBeDefined();
      });
    });
  });

  // ─── Painting Rules ──────────────────────────────────────────

  describe('painting rules', () => {
    describe('paint-primer', () => {
      it('triggers when paint and drywall present but no primer', () => {
        const items = itemsFromDescriptions([
          'Interior painting 2 coats',
          'New drywall installation',
        ]);
        const gaps = detectScopeGaps(items, 'painting');
        const gap = findGap(gaps, 'paint-primer');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('info');
        expect(gap!.suggestedItem.description).toContain('Primer');
      });

      it('does NOT trigger when primer is included', () => {
        const items = itemsFromDescriptions([
          'Painting walls',
          'Drywall finishing',
          'Primer application',
        ]);
        const gaps = detectScopeGaps(items, 'painting');
        expect(findGap(gaps, 'paint-primer')).toBeUndefined();
      });

      it('does NOT trigger when only paint is present (no drywall)', () => {
        const items = itemsFromDescriptions(['Interior painting 2 coats']);
        const gaps = detectScopeGaps(items, 'painting');
        expect(findGap(gaps, 'paint-primer')).toBeUndefined();
      });

      it('does NOT trigger when only drywall is present (no paint)', () => {
        const items = itemsFromDescriptions(['Drywall installation']);
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'paint-primer')).toBeUndefined();
      });

      it('applies to kitchen, bathroom, and basement project types', () => {
        const items = itemsFromDescriptions(['Painting', 'New drywall patches']);

        for (const projectType of ['kitchen', 'bathroom', 'basement']) {
          const gaps = detectScopeGaps(items, projectType);
          expect(findGap(gaps, 'paint-primer')).toBeDefined();
        }
      });
    });
  });

  // ─── Supply Lines ────────────────────────────────────────────

  describe('plumbing supply lines', () => {
    describe('supply-lines', () => {
      it('triggers when fixtures present but no supply lines', () => {
        const items = itemsFromDescriptions(['New faucet installation']);
        const gaps = detectScopeGaps(items, 'bathroom');
        const gap = findGap(gaps, 'supply-lines');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('info');
        expect(gap!.estimatedCostLow).toBe(150);
        expect(gap!.estimatedCostHigh).toBe(500);
      });

      it('triggers for toilet fixture', () => {
        const items = itemsFromDescriptions(['Toilet replacement']);
        const gaps = detectScopeGaps(items, 'bathroom');
        expect(findGap(gaps, 'supply-lines')).toBeDefined();
      });

      it('does NOT trigger when shut-off valves are included', () => {
        const items = itemsFromDescriptions([
          'Faucet installation',
          'Shut-off valve replacement',
        ]);
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'supply-lines')).toBeUndefined();
      });

      it('applies to kitchen and bathroom only', () => {
        const items = itemsFromDescriptions(['Sink installation']);

        const kitchenGaps = detectScopeGaps(items, 'kitchen');
        const bathroomGaps = detectScopeGaps(items, 'bathroom');
        const basementGaps = detectScopeGaps(items, 'basement');

        expect(findGap(kitchenGaps, 'supply-lines')).toBeDefined();
        expect(findGap(bathroomGaps, 'supply-lines')).toBeDefined();
        expect(findGap(basementGaps, 'supply-lines')).toBeUndefined();
      });
    });
  });

  // ─── Heated Floor ────────────────────────────────────────────

  describe('heated floor', () => {
    describe('heated-floor', () => {
      it('triggers for premium bathroom with tile and total > $10k', () => {
        const items = [
          makeItem({ description: 'Porcelain tile installation', total: 4000 }),
          makeItem({ description: 'Vanity and countertop', total: 3500 }),
          makeItem({ description: 'Shower glass enclosure', total: 2000 }),
          makeItem({ description: 'Faucet and fixtures', total: 1500 }),
        ];
        const gaps = detectScopeGaps(items, 'bathroom');
        const gap = findGap(gaps, 'heated-floor');

        expect(gap).toBeDefined();
        expect(gap!.severity).toBe('info');
        expect(gap!.estimatedCostLow).toBe(500);
        expect(gap!.estimatedCostHigh).toBe(1500);
      });

      it('does NOT trigger when total is under $10k', () => {
        const items = [
          makeItem({ description: 'Ceramic tile floor', total: 2000 }),
          makeItem({ description: 'Vanity', total: 1500 }),
        ];
        const gaps = detectScopeGaps(items, 'bathroom');
        expect(findGap(gaps, 'heated-floor')).toBeUndefined();
      });

      it('does NOT trigger when radiant heating is already included', () => {
        const items = [
          makeItem({ description: 'Tile flooring', total: 5000 }),
          makeItem({ description: 'In-floor radiant heating system', total: 3000 }),
          makeItem({ description: 'Vanity and fixtures', total: 4000 }),
        ];
        const gaps = detectScopeGaps(items, 'bathroom');
        expect(findGap(gaps, 'heated-floor')).toBeUndefined();
      });

      it('does NOT trigger for kitchen project type', () => {
        const items = [
          makeItem({ description: 'Porcelain tile floor', total: 6000 }),
          makeItem({ description: 'Cabinet installation', total: 8000 }),
        ];
        const gaps = detectScopeGaps(items, 'kitchen');
        expect(findGap(gaps, 'heated-floor')).toBeUndefined();
      });

      it('does NOT trigger when no tile is present', () => {
        const items = [
          makeItem({ description: 'Luxury vinyl plank flooring', total: 6000 }),
          makeItem({ description: 'Vanity and countertop', total: 5000 }),
        ];
        const gaps = detectScopeGaps(items, 'bathroom');
        expect(findGap(gaps, 'heated-floor')).toBeUndefined();
      });
    });
  });

  // ─── Project Type Filtering ──────────────────────────────────

  describe('project type filtering', () => {
    it('kitchen rules do not fire for bathroom projects', () => {
      const items = itemsFromDescriptions([
        'Backsplash tile',
        'New sink installation',
        'Cabinet install',
        'Countertop granite',
        'Flooring laminate',
      ]);
      const gaps = detectScopeGaps(items, 'bathroom');
      const kitchenRules = ['kitchen-backsplash-prep', 'kitchen-plumbing-rough', 'kitchen-electrical', 'kitchen-demolition'];
      for (const ruleId of kitchenRules) {
        expect(findGap(gaps, ruleId)).toBeUndefined();
      }
    });

    it('bathroom rules do not fire for kitchen projects', () => {
      const items = itemsFromDescriptions([
        'Tile backsplash installation',
        'Vanity stuff',
      ]);
      const gaps = detectScopeGaps(items, 'kitchen');
      const bathroomRules = ['bath-waterproofing', 'bath-exhaust-fan', 'bath-subfloor'];
      for (const ruleId of bathroomRules) {
        expect(findGap(gaps, ruleId)).toBeUndefined();
      }
    });

    it('basement rules do not fire for flooring projects', () => {
      const items = itemsFromDescriptions(['Drywall installation', 'Framing']);
      const context: ScopeGapContext = { includesBedroom: true };
      const gaps = detectScopeGaps(items, 'flooring', context);
      const basementRules = ['basement-egress', 'basement-moisture', 'basement-fire-sep'];
      for (const ruleId of basementRules) {
        expect(findGap(gaps, ruleId)).toBeUndefined();
      }
    });

    it('universal rules fire for any project type', () => {
      const items = itemsFromDescriptions([
        'Demolition of old structure',
        'Structural beam install',
        'Item C',
        'Item D',
      ]);
      for (const projectType of ['kitchen', 'bathroom', 'basement', 'flooring', 'painting', 'custom']) {
        const gaps = detectScopeGaps(items, projectType);
        expect(findGap(gaps, 'permit-missing')).toBeDefined();
        expect(findGap(gaps, 'dumpster-disposal')).toBeDefined();
        expect(findGap(gaps, 'protection-cleanup')).toBeDefined();
      }
    });
  });

  // ─── Manual / AI-agnostic ────────────────────────────────────

  describe('manual-only items still trigger rules', () => {
    it('detects gaps regardless of isFromAI flag', () => {
      const items = [
        makeItem({ description: 'Tile shower surround', isFromAI: false }),
        makeItem({ description: 'Vanity cabinet', isFromAI: true }),
      ];
      const gaps = detectScopeGaps(items, 'bathroom');
      // Should still detect waterproofing gap from the tile item
      expect(findGap(gaps, 'bath-waterproofing')).toBeDefined();
    });

    it('detects gaps when all items are manually entered', () => {
      const items = [
        makeItem({ description: 'Cabinet installation', isFromAI: false, isModified: true }),
        makeItem({ description: 'Countertop replacement', isFromAI: false }),
      ];
      const gaps = detectScopeGaps(items, 'kitchen');
      expect(findGap(gaps, 'kitchen-demolition')).toBeDefined();
    });
  });

  // ─── ScopeGap Shape Validation ───────────────────────────────

  describe('output shape', () => {
    it('each gap has all required fields', () => {
      const items = itemsFromDescriptions(['Tile shower', 'Cabinet install', 'Drywall', 'Painting']);
      const gaps = detectScopeGaps(items, 'bathroom');

      for (const gap of gaps) {
        expect(gap.ruleId).toEqual(expect.any(String));
        expect(gap.message).toEqual(expect.any(String));
        expect(gap.message.length).toBeGreaterThan(10);
        expect(['warning', 'info']).toContain(gap.severity);
        expect(gap.estimatedCostLow).toEqual(expect.any(Number));
        expect(gap.estimatedCostHigh).toEqual(expect.any(Number));
        expect(gap.estimatedCostLow).toBeLessThanOrEqual(gap.estimatedCostHigh);
        expect(gap.suggestedItem).toBeDefined();
        expect(gap.suggestedItem.description).toEqual(expect.any(String));
        expect(gap.suggestedItem.category).toEqual(expect.any(String));
        expect(gap.suggestedItem.estimatedTotal).toEqual(expect.any(Number));
      }
    });

    it('suggested item estimated total falls within the cost range', () => {
      const items = itemsFromDescriptions([
        'Demolition of kitchen',
        'Structural beam replacement',
        'New sink installation',
        'Countertop granite',
      ]);
      const gaps = detectScopeGaps(items, 'kitchen');

      for (const gap of gaps) {
        expect(gap.suggestedItem.estimatedTotal).toBeGreaterThanOrEqual(gap.estimatedCostLow);
        expect(gap.suggestedItem.estimatedTotal).toBeLessThanOrEqual(gap.estimatedCostHigh);
      }
    });
  });

  // ─── Case Insensitivity ──────────────────────────────────────

  describe('case insensitivity', () => {
    it('detects keywords regardless of casing in line item descriptions', () => {
      const items = itemsFromDescriptions(['TILE SHOWER INSTALLATION', 'VANITY']);
      const gaps = detectScopeGaps(items, 'bathroom');
      expect(findGap(gaps, 'bath-waterproofing')).toBeDefined();
    });

    it('detects mixed-case prevention keywords', () => {
      const items = itemsFromDescriptions([
        'Tile Shower Installation',
        'Schluter KERDI Waterproofing System',
      ]);
      const gaps = detectScopeGaps(items, 'bathroom');
      expect(findGap(gaps, 'bath-waterproofing')).toBeUndefined();
    });
  });

  // ─── Complex Scenario ────────────────────────────────────────

  describe('complex scenarios', () => {
    it('detects multiple gaps in a large bathroom renovation', () => {
      const items = [
        makeItem({ description: 'Tile shower surround', total: 3000 }),
        makeItem({ description: 'Floor tile ceramic installation', total: 2000 }),
        makeItem({ description: 'New faucet and showerhead', total: 800 }),
        makeItem({ description: 'Vanity and countertop', total: 2500 }),
        makeItem({ description: 'Toilet replacement', total: 600 }),
        makeItem({ description: 'Painting walls 2 coats', total: 1200 }),
        makeItem({ description: 'New drywall patches', total: 500 }),
      ];
      const gaps = detectScopeGaps(items, 'bathroom');

      // Should detect: waterproofing (tile, no membrane), exhaust fan, subfloor,
      // supply-lines (fixtures, no valves), protection-cleanup (7 items), paint-primer
      expect(findGap(gaps, 'bath-waterproofing')).toBeDefined();
      expect(findGap(gaps, 'bath-exhaust-fan')).toBeDefined();
      expect(findGap(gaps, 'bath-subfloor')).toBeDefined();
      expect(findGap(gaps, 'supply-lines')).toBeDefined();
      expect(findGap(gaps, 'protection-cleanup')).toBeDefined();
      expect(findGap(gaps, 'paint-primer')).toBeDefined();

      // Warnings should come before info
      const firstInfoIndex = gaps.findIndex((g) => g.severity === 'info');
      const lastWarningIndex = gaps.map((g) => g.severity).lastIndexOf('warning');
      if (firstInfoIndex !== -1 && lastWarningIndex !== -1) {
        expect(lastWarningIndex).toBeLessThan(firstInfoIndex);
      }
    });

    it('full kitchen reno with pre-1980 home triggers multiple rules', () => {
      const items = itemsFromDescriptions([
        'Cabinet installation',
        'Countertop granite',
        'Backsplash tile',
        'New sink installation',
        'Demolition of existing kitchen',
        'Electrical panel upgrade',
      ]);
      const context: ScopeGapContext = { homeBuiltYear: 1975 };
      const gaps = detectScopeGaps(items, 'kitchen', context);

      // backsplash-prep (backsplash, no wall prep)
      expect(findGap(gaps, 'kitchen-backsplash-prep')).toBeDefined();
      // plumbing-rough (new sink, no rough-in)
      expect(findGap(gaps, 'kitchen-plumbing-rough')).toBeDefined();
      // asbestos (demo + pre-1980)
      expect(findGap(gaps, 'asbestos-testing')).toBeDefined();
      // permit (electrical present)
      expect(findGap(gaps, 'permit-missing')).toBeDefined();

      // kitchen-demolition should NOT trigger (demolition is present)
      expect(findGap(gaps, 'kitchen-demolition')).toBeUndefined();
      // kitchen-electrical should NOT trigger (electrical is present)
      expect(findGap(gaps, 'kitchen-electrical')).toBeUndefined();
    });
  });
});
