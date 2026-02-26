/**
 * Scope Gap Detection Rules Engine
 * Pure function, zero API calls — detects commonly missing items in renovation quotes.
 * [DEV-072 Phase 2]
 */

import type { LineItem } from '@/components/admin/quote-line-item';

export type ScopeGapSeverity = 'warning' | 'info';

export interface ScopeGap {
  /** Unique rule ID */
  ruleId: string;
  /** Human-readable message */
  message: string;
  /** Severity: warning = likely needed, info = nice to have */
  severity: ScopeGapSeverity;
  /** Estimated cost range */
  estimatedCostLow: number;
  estimatedCostHigh: number;
  /** Suggested line item to add */
  suggestedItem: {
    description: string;
    category: LineItem['category'];
    estimatedTotal: number;
  };
}

export interface ScopeGapContext {
  /** Year the home was built (for asbestos/lead paint rules) */
  homeBuiltYear?: number | undefined;
  /** Whether the project involves a bedroom (for egress/fire sep rules) */
  includesBedroom?: boolean | undefined;
}

// Helper: check if any line item description matches keywords
function hasItemMatching(items: LineItem[], keywords: string[]): boolean {
  return items.some((item) => {
    const desc = item.description.toLowerCase();
    return keywords.some((kw) => desc.includes(kw));
  });
}

// Helper: check if any line item is in a category
function hasCategoryItem(items: LineItem[], category: LineItem['category']): boolean {
  return items.some((item) => item.category === category);
}

// ─── Rule Definitions ───────────────────────────────────────────

interface Rule {
  id: string;
  projectTypes: string[]; // which project types this rule applies to ('*' = all)
  check: (items: LineItem[], projectType: string, context?: ScopeGapContext) => ScopeGap | null;
}

const RULES: Rule[] = [
  // ── Bathroom Rules ──
  {
    id: 'bath-waterproofing',
    projectTypes: ['bathroom'],
    check: (items) => {
      const hasTileOrShower = hasItemMatching(items, ['tile', 'shower', 'tub', 'bathtub']);
      const hasWaterproofing = hasItemMatching(items, ['waterproof', 'membrane', 'schluter', 'kerdi']);
      if (hasTileOrShower && !hasWaterproofing) {
        return {
          ruleId: 'bath-waterproofing',
          message: 'Tile/shower work detected but no waterproofing membrane included. Required by Ontario Building Code for wet areas.',
          severity: 'warning',
          estimatedCostLow: 200,
          estimatedCostHigh: 600,
          suggestedItem: {
            description: 'Waterproofing Membrane (shower/tub area)',
            category: 'materials',
            estimatedTotal: 400,
          },
        };
      }
      return null;
    },
  },
  {
    id: 'bath-exhaust-fan',
    projectTypes: ['bathroom'],
    check: (items) => {
      const hasExhaust = hasItemMatching(items, ['exhaust', 'ventilation fan', 'bath fan', 'vent fan']);
      if (!hasExhaust) {
        return {
          ruleId: 'bath-exhaust-fan',
          message: 'No exhaust fan included. Required by code for all bathrooms to prevent moisture damage.',
          severity: 'info',
          estimatedCostLow: 150,
          estimatedCostHigh: 400,
          suggestedItem: {
            description: 'Bathroom Exhaust Fan (supply and install)',
            category: 'materials',
            estimatedTotal: 275,
          },
        };
      }
      return null;
    },
  },
  {
    id: 'bath-subfloor',
    projectTypes: ['bathroom'],
    check: (items) => {
      const hasTileFloor = hasItemMatching(items, ['floor tile', 'tile floor', 'ceramic floor', 'porcelain floor']);
      const hasSubfloor = hasItemMatching(items, ['subfloor', 'backer board', 'cement board', 'ditra']);
      if (hasTileFloor && !hasSubfloor) {
        return {
          ruleId: 'bath-subfloor',
          message: 'Tile flooring planned but no subfloor preparation or backer board included.',
          severity: 'info',
          estimatedCostLow: 200,
          estimatedCostHigh: 500,
          suggestedItem: {
            description: 'Subfloor Preparation & Backer Board',
            category: 'materials',
            estimatedTotal: 350,
          },
        };
      }
      return null;
    },
  },

  // ── Kitchen Rules ──
  {
    id: 'kitchen-backsplash-prep',
    projectTypes: ['kitchen'],
    check: (items) => {
      const hasBacksplash = hasItemMatching(items, ['backsplash']);
      const hasWallPrep = hasItemMatching(items, ['wall prep', 'drywall repair', 'wall repair', 'skim coat']);
      if (hasBacksplash && !hasWallPrep) {
        return {
          ruleId: 'kitchen-backsplash-prep',
          message: 'Backsplash installation planned but no wall preparation included.',
          severity: 'info',
          estimatedCostLow: 200,
          estimatedCostHigh: 400,
          suggestedItem: {
            description: 'Wall Preparation for Backsplash',
            category: 'labor',
            estimatedTotal: 300,
          },
        };
      }
      return null;
    },
  },
  {
    id: 'kitchen-plumbing-rough',
    projectTypes: ['kitchen'],
    check: (items) => {
      const hasNewSink = hasItemMatching(items, ['new sink', 'sink install', 'plumbing fixture']);
      const hasRoughIn = hasItemMatching(items, ['rough-in', 'rough in', 'plumbing rough', 'supply line']);
      if (hasNewSink && !hasRoughIn) {
        return {
          ruleId: 'kitchen-plumbing-rough',
          message: 'New sink installation planned but no plumbing rough-in or supply line work included.',
          severity: 'warning',
          estimatedCostLow: 500,
          estimatedCostHigh: 1200,
          suggestedItem: {
            description: 'Plumbing Rough-in & Supply Lines',
            category: 'contract',
            estimatedTotal: 850,
          },
        };
      }
      return null;
    },
  },
  {
    id: 'kitchen-electrical',
    projectTypes: ['kitchen'],
    check: (items) => {
      const isMajorReno = items.length >= 5;
      const hasElectrical = hasItemMatching(items, ['electrical', 'panel', 'circuit', 'wiring', 'outlet']);
      if (isMajorReno && !hasElectrical) {
        return {
          ruleId: 'kitchen-electrical',
          message: 'Major kitchen renovation but no electrical work included. Modern kitchens often need dedicated circuits.',
          severity: 'info',
          estimatedCostLow: 1500,
          estimatedCostHigh: 4000,
          suggestedItem: {
            description: 'Electrical Upgrades (dedicated circuits, outlets)',
            category: 'contract',
            estimatedTotal: 2500,
          },
        };
      }
      return null;
    },
  },
  {
    id: 'kitchen-demolition',
    projectTypes: ['kitchen'],
    check: (items) => {
      const isReno = hasItemMatching(items, ['cabinet', 'countertop', 'flooring']);
      const hasDemo = hasItemMatching(items, ['demolition', 'demo', 'removal', 'tear out', 'tear-out']);
      if (isReno && !hasDemo) {
        return {
          ruleId: 'kitchen-demolition',
          message: 'Kitchen renovation items present but no demolition/removal of existing materials included.',
          severity: 'warning',
          estimatedCostLow: 500,
          estimatedCostHigh: 2000,
          suggestedItem: {
            description: 'Demolition & Removal of Existing Kitchen',
            category: 'labor',
            estimatedTotal: 1200,
          },
        };
      }
      return null;
    },
  },

  // ── Basement Rules ──
  {
    id: 'basement-egress',
    projectTypes: ['basement'],
    check: (items, _pt, context) => {
      const hasBedroom = context?.includesBedroom || hasItemMatching(items, ['bedroom', 'sleeping']);
      const hasEgress = hasItemMatching(items, ['egress', 'escape window', 'egress window']);
      if (hasBedroom && !hasEgress) {
        return {
          ruleId: 'basement-egress',
          message: 'Basement bedroom planned but no egress window included. Required by Ontario Building Code for sleeping areas.',
          severity: 'warning',
          estimatedCostLow: 3000,
          estimatedCostHigh: 6000,
          suggestedItem: {
            description: 'Egress Window (supply and install)',
            category: 'contract',
            estimatedTotal: 4500,
          },
        };
      }
      return null;
    },
  },
  {
    id: 'basement-moisture',
    projectTypes: ['basement'],
    check: (items) => {
      const isFinishing = hasItemMatching(items, ['drywall', 'framing', 'insulation', 'flooring']);
      const hasMoisture = hasItemMatching(items, ['moisture', 'vapour barrier', 'vapor barrier', 'waterproof', 'sealant', 'dimple board']);
      if (isFinishing && !hasMoisture) {
        return {
          ruleId: 'basement-moisture',
          message: 'Basement finishing planned but no moisture barrier or waterproofing included.',
          severity: 'warning',
          estimatedCostLow: 500,
          estimatedCostHigh: 1500,
          suggestedItem: {
            description: 'Moisture Barrier & Waterproofing',
            category: 'materials',
            estimatedTotal: 900,
          },
        };
      }
      return null;
    },
  },
  {
    id: 'basement-fire-sep',
    projectTypes: ['basement'],
    check: (items, _pt, context) => {
      const hasBedroom = context?.includesBedroom || hasItemMatching(items, ['bedroom', 'sleeping']);
      const hasFireSep = hasItemMatching(items, ['fire separation', 'fire-rated', 'fire rated', 'fire stop', 'smoke alarm', 'smoke detector']);
      if (hasBedroom && !hasFireSep) {
        return {
          ruleId: 'basement-fire-sep',
          message: 'Basement bedroom planned but no fire separation or smoke detection included.',
          severity: 'warning',
          estimatedCostLow: 500,
          estimatedCostHigh: 1200,
          suggestedItem: {
            description: 'Fire Separation & Smoke Detection',
            category: 'materials',
            estimatedTotal: 800,
          },
        };
      }
      return null;
    },
  },

  // ── Universal Rules (all project types) ──
  {
    id: 'permit-missing',
    projectTypes: ['*'],
    check: (items) => {
      const hasStructuralOrTrade = hasItemMatching(items, [
        'structural', 'load-bearing', 'load bearing', 'electrical', 'plumbing', 'hvac',
        'framing', 'foundation', 'rough-in', 'egress',
      ]);
      const hasPermit = hasItemMatching(items, ['permit']) || hasCategoryItem(items, 'permit');
      if (hasStructuralOrTrade && !hasPermit) {
        return {
          ruleId: 'permit-missing',
          message: 'Structural, electrical, or plumbing work detected but no building permit included.',
          severity: 'warning',
          estimatedCostLow: 200,
          estimatedCostHigh: 800,
          suggestedItem: {
            description: 'Building Permit (municipal application)',
            category: 'permit',
            estimatedTotal: 500,
          },
        };
      }
      return null;
    },
  },
  {
    id: 'dumpster-disposal',
    projectTypes: ['*'],
    check: (items) => {
      const hasDemo = hasItemMatching(items, ['demolition', 'demo', 'removal', 'tear out', 'tear-out']);
      const hasDisposal = hasItemMatching(items, ['dumpster', 'disposal', 'bin rental', 'waste removal', 'haul away']);
      if (hasDemo && !hasDisposal) {
        return {
          ruleId: 'dumpster-disposal',
          message: 'Demolition work planned but no waste disposal or dumpster rental included.',
          severity: 'info',
          estimatedCostLow: 400,
          estimatedCostHigh: 1000,
          suggestedItem: {
            description: 'Dumpster Rental & Waste Disposal',
            category: 'equipment',
            estimatedTotal: 650,
          },
        };
      }
      return null;
    },
  },
  {
    id: 'protection-cleanup',
    projectTypes: ['*'],
    check: (items) => {
      const isSubstantialReno = items.length >= 4;
      const hasProtection = hasItemMatching(items, ['protection', 'cleanup', 'clean-up', 'clean up', 'dust barrier', 'floor protection']);
      if (isSubstantialReno && !hasProtection) {
        return {
          ruleId: 'protection-cleanup',
          message: 'Substantial renovation but no site protection or final cleanup included.',
          severity: 'info',
          estimatedCostLow: 300,
          estimatedCostHigh: 800,
          suggestedItem: {
            description: 'Site Protection & Final Cleanup',
            category: 'allowances',
            estimatedTotal: 500,
          },
        };
      }
      return null;
    },
  },
  {
    id: 'asbestos-testing',
    projectTypes: ['*'],
    check: (items, _pt, context) => {
      const hasDemo = hasItemMatching(items, ['demolition', 'demo', 'removal', 'tear out', 'tear-out']);
      const isPreAsbestos = context?.homeBuiltYear !== undefined && context.homeBuiltYear < 1980;
      const hasAsbestos = hasItemMatching(items, ['asbestos', 'hazmat', 'hazardous material', 'abatement']);
      if (hasDemo && isPreAsbestos && !hasAsbestos) {
        return {
          ruleId: 'asbestos-testing',
          message: 'Pre-1980 home with demolition planned — asbestos testing recommended before work begins.',
          severity: 'warning',
          estimatedCostLow: 300,
          estimatedCostHigh: 600,
          suggestedItem: {
            description: 'Asbestos Testing (pre-demolition)',
            category: 'allowances',
            estimatedTotal: 450,
          },
        };
      }
      return null;
    },
  },

  // ── Flooring Rules ──
  {
    id: 'underlayment',
    projectTypes: ['flooring', 'kitchen', 'basement'],
    check: (items) => {
      const hasFlooring = hasItemMatching(items, ['flooring', 'laminate', 'vinyl plank', 'hardwood', 'engineered']);
      const hasUnderlayment = hasItemMatching(items, ['underlayment', 'underlay', 'subfloor']);
      if (hasFlooring && !hasUnderlayment) {
        return {
          ruleId: 'underlayment',
          message: 'Flooring installation planned but no underlayment included.',
          severity: 'info',
          estimatedCostLow: 100,
          estimatedCostHigh: 400,
          suggestedItem: {
            description: 'Underlayment (moisture barrier + sound)',
            category: 'materials',
            estimatedTotal: 250,
          },
        };
      }
      return null;
    },
  },
  {
    id: 'flooring-transitions',
    projectTypes: ['flooring', 'kitchen', 'bathroom', 'basement'],
    check: (items) => {
      const hasFlooring = hasItemMatching(items, ['flooring', 'laminate', 'vinyl', 'hardwood', 'tile', 'carpet']);
      const hasTransitions = hasItemMatching(items, ['transition', 'trim', 'threshold', 'reducer', 'nosing']);
      if (hasFlooring && !hasTransitions) {
        return {
          ruleId: 'flooring-transitions',
          message: 'New flooring planned but no transition strips or trim included.',
          severity: 'info',
          estimatedCostLow: 100,
          estimatedCostHigh: 350,
          suggestedItem: {
            description: 'Flooring Transitions & Trim',
            category: 'materials',
            estimatedTotal: 200,
          },
        };
      }
      return null;
    },
  },

  // ── Painting Rules ──
  {
    id: 'paint-primer',
    projectTypes: ['painting', 'kitchen', 'bathroom', 'basement'],
    check: (items) => {
      const hasPaint = hasItemMatching(items, ['paint', 'painting']);
      const hasPrimer = hasItemMatching(items, ['primer', 'prep coat', 'base coat']);
      const hasDrywall = hasItemMatching(items, ['drywall', 'new wall']);
      if (hasPaint && hasDrywall && !hasPrimer) {
        return {
          ruleId: 'paint-primer',
          message: 'Painting on new drywall but no primer/base coat included.',
          severity: 'info',
          estimatedCostLow: 100,
          estimatedCostHigh: 300,
          suggestedItem: {
            description: 'Primer / Base Coat (new drywall)',
            category: 'materials',
            estimatedTotal: 200,
          },
        };
      }
      return null;
    },
  },

  // ── Plumbing Supply Lines ──
  {
    id: 'supply-lines',
    projectTypes: ['kitchen', 'bathroom'],
    check: (items) => {
      const hasFixtures = hasItemMatching(items, ['faucet', 'toilet', 'sink', 'tub', 'shower']);
      const hasSupplyLines = hasItemMatching(items, ['supply line', 'shut-off', 'shut off', 'valve', 'water line']);
      if (hasFixtures && !hasSupplyLines) {
        return {
          ruleId: 'supply-lines',
          message: 'New plumbing fixtures but no supply line replacement or shut-off valves included.',
          severity: 'info',
          estimatedCostLow: 150,
          estimatedCostHigh: 500,
          suggestedItem: {
            description: 'Supply Lines & Shut-off Valves',
            category: 'materials',
            estimatedTotal: 300,
          },
        };
      }
      return null;
    },
  },

  // ── Heated Floor ──
  {
    id: 'heated-floor',
    projectTypes: ['bathroom'],
    check: (items) => {
      const hasTileFloor = hasItemMatching(items, ['tile', 'porcelain', 'ceramic', 'stone floor']);
      const hasHeatedFloor = hasItemMatching(items, ['heated floor', 'radiant', 'in-floor heat', 'floor heat']);
      // Only suggest if the project is premium (many items, higher total)
      const totalCost = items.reduce((sum, i) => sum + i.total, 0);
      if (hasTileFloor && !hasHeatedFloor && totalCost > 10000) {
        return {
          ruleId: 'heated-floor',
          message: 'Premium bathroom with tile flooring — consider in-floor radiant heating for comfort.',
          severity: 'info',
          estimatedCostLow: 500,
          estimatedCostHigh: 1500,
          suggestedItem: {
            description: 'In-Floor Radiant Heating (bathroom)',
            category: 'materials',
            estimatedTotal: 900,
          },
        };
      }
      return null;
    },
  },
];

/**
 * Detect scope gaps in a quote.
 * Pure function — zero API calls, zero latency, zero cost.
 */
export function detectScopeGaps(
  lineItems: LineItem[],
  projectType: string,
  context?: ScopeGapContext
): ScopeGap[] {
  if (lineItems.length === 0) return [];

  const gaps: ScopeGap[] = [];
  const seenRuleIds = new Set<string>();

  for (const rule of RULES) {
    // Filter by project type
    if (!rule.projectTypes.includes('*') && !rule.projectTypes.includes(projectType)) {
      continue;
    }

    const gap = rule.check(lineItems, projectType, context);
    if (gap && !seenRuleIds.has(gap.ruleId)) {
      gaps.push(gap);
      seenRuleIds.add(gap.ruleId);
    }
  }

  // Sort: warnings first, then info
  gaps.sort((a, b) => {
    if (a.severity === b.severity) return 0;
    return a.severity === 'warning' ? -1 : 1;
  });

  return gaps;
}
