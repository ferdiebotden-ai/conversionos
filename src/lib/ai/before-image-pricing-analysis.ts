/**
 * Before-Image Pricing Analysis
 * Pure interpretation of existing RoomAnalysis data — ZERO additional API calls.
 * Extracts demolition items, structural constraints, condition assessment,
 * estimated square footage, and trade requirements from prior photo analysis.
 */

import type { RoomAnalysis } from './photo-analyzer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BeforeScope {
  /** Items that need to be removed or demolished before renovation */
  demolitionItems: { item: string; category: string; condition: string }[];
  /** Structural elements that constrain the renovation (load-bearing walls, etc.) */
  structuralConstraints: string[];
  /** Overall condition assessment of the existing space */
  existingCondition: 'excellent' | 'good' | 'dated' | 'needs_renovation';
  /** Estimated room area in square feet */
  estimatedSqft: number;
  /** Trades required based on existing room features */
  tradeRequirements: { trade: string; reason: string }[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Keywords in furniture items that indicate a specific trade is needed */
const TRADE_INDICATORS: Record<string, { keywords: string[]; trade: string }[]> = {
  plumbing: [
    { keywords: ['sink', 'faucet', 'toilet', 'shower', 'tub', 'bathtub', 'drain', 'pipe'], trade: 'Plumber' },
  ],
  electrical: [
    { keywords: ['light', 'fixture', 'outlet', 'switch', 'panel', 'pot light', 'chandelier', 'pendant', 'sconce', 'wiring'], trade: 'Electrician' },
  ],
  hvac: [
    { keywords: ['vent', 'duct', 'furnace', 'hvac', 'register', 'radiator', 'baseboard heater'], trade: 'HVAC Technician' },
  ],
  carpentry: [
    { keywords: ['cabinet', 'shelving', 'built-in', 'moulding', 'trim', 'wainscoting', 'island'], trade: 'Carpenter (Finish)' },
  ],
  tile: [
    { keywords: ['tile', 'backsplash', 'mosaic', 'grout'], trade: 'Tile Setter' },
  ],
  flooring: [
    { keywords: ['hardwood', 'laminate', 'vinyl', 'carpet', 'flooring', 'lvp', 'engineered'], trade: 'Flooring Installer' },
  ],
  drywall: [
    { keywords: ['drywall', 'plaster', 'wall repair', 'patch'], trade: 'Drywall Installer' },
  ],
  painting: [
    { keywords: ['paint', 'wallpaper', 'stain', 'finish'], trade: 'Painter' },
  ],
};

// ---------------------------------------------------------------------------
// Main Function
// ---------------------------------------------------------------------------

/**
 * Derive a BeforeScope from existing RoomAnalysis data.
 * Pure function — no API calls, no async.
 */
export function deriveBeforeScopeFromAnalysis(analysis: RoomAnalysis): BeforeScope {
  return {
    demolitionItems: extractDemolitionItems(analysis),
    structuralConstraints: extractStructuralConstraints(analysis),
    existingCondition: analysis.currentCondition,
    estimatedSqft: parseEstimatedSqft(analysis.estimatedDimensions),
    tradeRequirements: inferTradeRequirements(analysis),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract items that need demolition/removal from furniture inventory.
 * Items with suitability 'replace' or condition 'damaged' are candidates.
 */
function extractDemolitionItems(
  analysis: RoomAnalysis,
): BeforeScope['demolitionItems'] {
  const inventory = analysis.furnitureInventory;
  if (!inventory) return [];

  return inventory
    .filter(
      (item) =>
        item.suitability === 'replace' ||
        item.suitability === 'remove' ||
        item.condition === 'damaged',
    )
    .map((item) => ({
      item: item.item,
      category: item.isBuiltIn ? 'built-in' : 'moveable',
      condition: item.condition,
    }));
}

/**
 * Extract structural constraints from preservation constraints
 * and structural elements.
 */
function extractStructuralConstraints(analysis: RoomAnalysis): string[] {
  const constraints: string[] = [];

  // Preservation constraints are explicit structural limitations
  if (analysis.preservationConstraints.length > 0) {
    constraints.push(...analysis.preservationConstraints);
  }

  // Structural elements that must remain (load-bearing walls, etc.)
  for (const element of analysis.structuralElements) {
    const lower = element.toLowerCase();
    if (
      lower.includes('load-bearing') ||
      lower.includes('structural') ||
      lower.includes('support') ||
      lower.includes('beam') ||
      lower.includes('column')
    ) {
      if (!constraints.includes(element)) {
        constraints.push(element);
      }
    }
  }

  return constraints;
}

/**
 * Parse square footage from the estimatedDimensions string.
 * Handles formats like "12x15 feet", "~180 sqft", "approximately 200 square feet".
 * Falls back to 150 sqft (default kitchen size) when unparseable.
 */
function parseEstimatedSqft(dimensions: string | null): number {
  if (!dimensions) return 150;

  const normalized = dimensions.toLowerCase();

  // Try direct sqft: "~180 sqft" or "200 square feet"
  const sqftMatch = normalized.match(/~?(\d+(?:\.\d+)?)\s*(?:sq\s*ft|square\s*feet|sqft)/);
  if (sqftMatch?.[1]) {
    return Math.round(parseFloat(sqftMatch[1]));
  }

  // Try WxL format: "12x15 feet" or "12 x 15 ft" or "12' x 15'"
  const dimMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*[''′]?\s*[x×by]\s*(\d+(?:\.\d+)?)\s*(?:feet|ft|[''′])?/,
  );
  if (dimMatch?.[1] && dimMatch[2]) {
    return Math.round(parseFloat(dimMatch[1]) * parseFloat(dimMatch[2]));
  }

  // Try "W feet by L feet"
  const feetByMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:feet|ft)\s*(?:by|x)\s*(\d+(?:\.\d+)?)\s*(?:feet|ft)?/,
  );
  if (feetByMatch?.[1] && feetByMatch[2]) {
    return Math.round(parseFloat(feetByMatch[1]) * parseFloat(feetByMatch[2]));
  }

  return 150; // Default fallback
}

/**
 * Infer trade requirements from openings, structural elements, fixtures,
 * and furniture inventory.
 */
function inferTradeRequirements(
  analysis: RoomAnalysis,
): BeforeScope['tradeRequirements'] {
  const tradesNeeded = new Map<string, string>();

  // Always need demolition for rooms that aren't in excellent condition
  if (analysis.currentCondition !== 'excellent') {
    tradesNeeded.set('Demolition', 'Existing finishes need removal');
  }

  // Always need a general labourer
  tradesNeeded.set('General Labourer', 'Site preparation and cleanup');

  // Check identified fixtures for trade indicators
  const allItems = [
    ...analysis.identifiedFixtures,
    ...analysis.structuralElements,
    ...(analysis.furnitureInventory?.map((f) => f.item) ?? []),
  ];

  for (const item of allItems) {
    const lower = item.toLowerCase();
    for (const [, indicators] of Object.entries(TRADE_INDICATORS)) {
      for (const indicator of indicators) {
        if (indicator.keywords.some((kw) => lower.includes(kw))) {
          if (!tradesNeeded.has(indicator.trade)) {
            tradesNeeded.set(indicator.trade, `Existing ${item} requires ${indicator.trade.toLowerCase()} work`);
          }
        }
      }
    }
  }

  // Check openings for potential structural trades
  const openings = analysis.openings;
  if (openings && openings.length > 0) {
    for (const opening of openings) {
      if (opening.type === 'window' || opening.type === 'door') {
        if (!tradesNeeded.has('Carpenter (Rough)')) {
          tradesNeeded.set('Carpenter (Rough)', `${opening.type} framing may need modification`);
        }
      }
    }
  }

  // Paint is almost always needed
  if (!tradesNeeded.has('Painter')) {
    tradesNeeded.set('Painter', 'Wall and trim finishing');
  }

  return Array.from(tradesNeeded.entries()).map(([trade, reason]) => ({
    trade,
    reason,
  }));
}
