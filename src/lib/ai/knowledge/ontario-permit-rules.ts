/**
 * Ontario Permit Rules Engine
 * Deterministic rules for detecting permit requirements based on scope of work.
 * Based on the Ontario Building Code (OBC) and municipal permit guidelines.
 *
 * NO AI calls — pure logic from scope-of-work data.
 * All costs in CAD.
 */

import type { ScopeOfWork } from '../scope-of-work-analysis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PermitRequirement {
  /** Permit type */
  type: 'building' | 'electrical' | 'plumbing' | 'hvac';
  /** Human-readable reason this permit is required */
  reason: string;
  /** Estimated permit fee range in CAD */
  estimatedCost: { low: number; high: number };
  /** Number of inspections typically required */
  inspectionsRequired: number;
  /** Typical wait time in business days for permit approval */
  typicalWaitDays: number;
}

// ---------------------------------------------------------------------------
// Keyword patterns for permit detection
// ---------------------------------------------------------------------------

/** Structural keywords that trigger a building permit */
const BUILDING_PERMIT_KEYWORDS = [
  'wall removal',
  'remove wall',
  'load-bearing',
  'load bearing',
  'structural',
  'support beam',
  'header',
  'foundation',
  'bearing wall',
  'open concept',
  'new opening',
  'enlarge opening',
  'egress',
  'basement bedroom',
  'window well',
  'underpinning',
  'extension',
  'addition',
  'new window',
  'new door',
  'relocate wall',
];

/** Electrical keywords that trigger an electrical permit */
const ELECTRICAL_PERMIT_KEYWORDS = [
  'new circuit',
  'panel upgrade',
  'electrical panel',
  'rewire',
  'rewiring',
  'sub-panel',
  'subpanel',
  'new outlet',
  'additional outlet',
  'new wiring',
  '200 amp',
  'service upgrade',
  'knob and tube',
  'aluminum wiring',
];

/** Plumbing keywords that trigger a plumbing permit */
const PLUMBING_PERMIT_KEYWORDS = [
  'plumbing relocation',
  'relocate plumbing',
  'new rough-in',
  'rough-in',
  'new drain',
  'move drain',
  'move sink',
  'relocate sink',
  'relocate toilet',
  'new water line',
  'water supply',
  'stack',
  'vent stack',
  'backflow',
  'sewer line',
  'new bathroom',
  'add bathroom',
];

/** HVAC keywords that trigger an HVAC permit */
const HVAC_PERMIT_KEYWORDS = [
  'ductwork',
  'new duct',
  'relocate vent',
  'hvac relocation',
  'furnace',
  'air handler',
  'heat pump',
  'new hvac',
  'gas line',
  'gas fitting',
  'fireplace insert',
  'new vent',
  'exhaust',
];

/** Items that are cosmetic-only and explicitly do NOT require permits */
const COSMETIC_KEYWORDS = [
  'paint',
  'hardware',
  'handle',
  'knob',
  'backsplash tile',
  'accent tile',
  'wallpaper',
  'light fixture swap',
  'faucet swap',
  'toilet replacement',
  'vanity swap',
  'countertop replacement',
  'flooring',
  'trim',
  'baseboard',
  'moulding',
  'shelf',
  'closet organizer',
];

// ---------------------------------------------------------------------------
// Main Function
// ---------------------------------------------------------------------------

/**
 * Detect permit requirements from a scope of work.
 * Returns an array of required permits with cost estimates and timelines.
 *
 * Rules are based on:
 * - Ontario Building Code (OBC)
 * - Typical municipal permit fee schedules (2024-2026)
 * - Standard inspection requirements for residential renovations
 */
export function detectPermitRequirements(scope: ScopeOfWork): PermitRequirement[] {
  const permits: PermitRequirement[] = [];
  const addedTypes = new Set<string>();

  // Check structural items (most reliable — GPT already flagged permitRequired)
  for (const item of scope.structural) {
    if (item.permitRequired && !addedTypes.has('building')) {
      permits.push({
        type: 'building',
        reason: item.reason || `Structural modification: ${item.item}`,
        estimatedCost: { low: 200, high: 800 },
        inspectionsRequired: 2,
        typicalWaitDays: 10,
      });
      addedTypes.add('building');
    }
  }

  // Build a searchable text corpus from all scope items
  const allItems = collectAllItemDescriptions(scope);
  const corpus = allItems.join(' ').toLowerCase();

  // Building permit — check for structural keywords in all items
  if (!addedTypes.has('building') && matchesAny(corpus, BUILDING_PERMIT_KEYWORDS)) {
    permits.push({
      type: 'building',
      reason: 'Structural changes detected (wall modification, new opening, or load-bearing work)',
      estimatedCost: { low: 200, high: 800 },
      inspectionsRequired: 2,
      typicalWaitDays: 10,
    });
    addedTypes.add('building');
  }

  // Electrical permit — check for new circuits, panel work, rewiring
  if (!addedTypes.has('electrical') && matchesAny(corpus, ELECTRICAL_PERMIT_KEYWORDS)) {
    permits.push({
      type: 'electrical',
      reason: 'New electrical circuits, panel upgrade, or rewiring detected',
      estimatedCost: { low: 100, high: 400 },
      inspectionsRequired: 1,
      typicalWaitDays: 5,
    });
    addedTypes.add('electrical');
  }

  // Also check newInstallation for electrical items that imply new circuits
  if (!addedTypes.has('electrical')) {
    const electricalInstalls = scope.newInstallation.filter(
      (i) => i.category === 'electrical' && !isCosmeticElectrical(i.item),
    );
    if (electricalInstalls.length >= 3) {
      // 3+ new electrical items likely means new circuits
      permits.push({
        type: 'electrical',
        reason: `Multiple new electrical installations (${electricalInstalls.length} items) — likely requires new circuits`,
        estimatedCost: { low: 100, high: 400 },
        inspectionsRequired: 1,
        typicalWaitDays: 5,
      });
      addedTypes.add('electrical');
    }
  }

  // Plumbing permit — check relocations and new rough-ins
  if (!addedTypes.has('plumbing') && matchesAny(corpus, PLUMBING_PERMIT_KEYWORDS)) {
    permits.push({
      type: 'plumbing',
      reason: 'Plumbing relocation or new rough-in detected',
      estimatedCost: { low: 100, high: 350 },
      inspectionsRequired: 1,
      typicalWaitDays: 5,
    });
    addedTypes.add('plumbing');
  }

  // Also check relocations for plumbing trades
  if (!addedTypes.has('plumbing')) {
    const plumbingRelocations = scope.relocation.filter(
      (r) => r.trade.toLowerCase().includes('plumb'),
    );
    if (plumbingRelocations.length > 0) {
      permits.push({
        type: 'plumbing',
        reason: `Plumbing fixture relocation: ${plumbingRelocations.map((r) => r.item).join(', ')}`,
        estimatedCost: { low: 100, high: 350 },
        inspectionsRequired: 1,
        typicalWaitDays: 5,
      });
      addedTypes.add('plumbing');
    }
  }

  // HVAC permit — check for ductwork, new vents, gas work
  if (!addedTypes.has('hvac') && matchesAny(corpus, HVAC_PERMIT_KEYWORDS)) {
    permits.push({
      type: 'hvac',
      reason: 'HVAC ductwork modification, vent relocation, or gas fitting detected',
      estimatedCost: { low: 75, high: 250 },
      inspectionsRequired: 1,
      typicalWaitDays: 5,
    });
    addedTypes.add('hvac');
  }

  // Check relocations for HVAC trades
  if (!addedTypes.has('hvac')) {
    const hvacRelocations = scope.relocation.filter(
      (r) => r.trade.toLowerCase().includes('hvac'),
    );
    if (hvacRelocations.length > 0) {
      permits.push({
        type: 'hvac',
        reason: `HVAC relocation: ${hvacRelocations.map((r) => r.item).join(', ')}`,
        estimatedCost: { low: 75, high: 250 },
        inspectionsRequired: 1,
        typicalWaitDays: 5,
      });
      addedTypes.add('hvac');
    }
  }

  return permits;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect all item description strings from every scope category */
function collectAllItemDescriptions(scope: ScopeOfWork): string[] {
  const items: string[] = [];

  for (const d of scope.demolition) items.push(d.item);
  for (const n of scope.newInstallation) items.push(n.item, n.material);
  for (const r of scope.retained) items.push(r.item);
  for (const s of scope.structural) items.push(s.item, s.reason);
  for (const l of scope.relocation) items.push(l.item);

  return items;
}

/** Check if a text corpus matches any keyword from a list */
function matchesAny(corpus: string, keywords: string[]): boolean {
  return keywords.some((kw) => corpus.includes(kw));
}

/**
 * Check if an electrical item is purely cosmetic (1:1 fixture swap).
 * Cosmetic swaps (e.g., replacing one light fixture with another) don't
 * require permits in Ontario.
 */
function isCosmeticElectrical(item: string): boolean {
  const lower = item.toLowerCase();
  return COSMETIC_KEYWORDS.some((kw) => lower.includes(kw));
}
