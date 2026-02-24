/**
 * Pricing Knowledge Base
 * Generates pricing context strings from typed data for AI prompt injection.
 * Raw data lives in ./pricing-data.ts — this module builds prompt-ready text.
 */

import {
  PER_SQFT_RANGES,
  TRADE_RATES,
  MATERIAL_COSTS,
  BUSINESS_CONSTANTS,
  REGIONAL_MULTIPLIERS,
  type FinishLevel,
} from './pricing-data';

// Re-export the typed data and functions for direct programmatic use
export {
  calculateCostEstimate,
  snapToRangeBand,
  formatCAD,
  getMaterialsForRoom,
  PER_SQFT_RANGES,
  TRADE_RATES,
  MATERIAL_COSTS,
  BUSINESS_CONSTANTS,
  REGIONAL_MULTIPLIERS,
  DEFAULT_SQFT,
  DEFAULT_REGIONAL_MULTIPLIER,
} from './pricing-data';

export type {
  CostEstimate,
  TradeRate,
  MaterialCost,
  MaterialCategory,
  RoomCategory,
  RegionalMultiplier,
  PerSqftRange,
  FinishLevel,
} from './pricing-data';

// ---------------------------------------------------------------------------
// AI Prompt Strings (generated from typed data)
// ---------------------------------------------------------------------------

function buildPerSqftSection(): string {
  const roomLabels: Record<string, string> = {
    kitchen: 'Kitchen Remodel',
    bathroom: 'Bathroom Remodel',
    basement: 'Basement Finishing',
    flooring: 'Flooring Only',
    living_room: 'Living Room Renovation',
    bedroom: 'Bedroom Renovation',
    dining_room: 'Dining Room Renovation',
    exterior: 'Exterior Work',
  };

  const finishDescriptions: Record<string, Record<FinishLevel, string>> = {
    kitchen: {
      economy: 'stock cabinets, laminate counters, basic fixtures',
      standard: 'semi-custom cabinets, quartz counters, mid-range fixtures',
      premium: 'custom cabinets, natural stone, high-end appliances',
    },
    bathroom: {
      economy: 'basic fixtures, ceramic tile, stock vanity',
      standard: 'quality tile, quartz vanity top, glass shower',
      premium: 'designer fixtures, heated floors, custom tile work',
    },
    basement: {
      economy: 'basic drywall, LVP flooring, paint, pot lights',
      standard: 'added bathroom, better finishes, entertainment wiring',
      premium: 'full suite, custom millwork, upgraded everything',
    },
    flooring: {
      economy: 'laminate, basic LVP',
      standard: 'quality LVP, engineered hardwood',
      premium: 'solid hardwood, large-format tile, heated underlayment',
    },
    living_room: {
      economy: 'paint, basic flooring, minimal fixtures',
      standard: 'hardwood floors, built-ins, updated lighting',
      premium: 'custom millwork, premium finishes, smart home',
    },
    bedroom: {
      economy: 'paint, carpet, basic fixtures',
      standard: 'hardwood or quality LVP, updated closet, new lighting',
      premium: 'custom walk-in closet, premium flooring, ensuite upgrades',
    },
    dining_room: {
      economy: 'paint, basic flooring, updated light fixture',
      standard: 'hardwood floors, wainscoting, statement lighting',
      premium: 'custom millwork, premium flooring, built-in buffet',
    },
    exterior: {
      economy: 'paint, minor repairs, basic landscaping',
      standard: 'siding repair, new paint, improved landscaping',
      premium: 'new siding, windows, full landscape redesign',
    },
  };

  let text = '';
  for (const [room, ranges] of Object.entries(PER_SQFT_RANGES)) {
    const label = roomLabels[room] || room;
    const descs = finishDescriptions[room];
    text += `\n### ${label} — Per Square Foot\n`;
    for (const level of ['economy', 'standard', 'premium'] as FinishLevel[]) {
      const r = ranges[level];
      const desc = descs?.[level] || '';
      text += `- ${level.charAt(0).toUpperCase() + level.slice(1)}: $${r.min}–${r.max}/sqft${desc ? ` (${desc})` : ''}\n`;
    }
  }
  return text;
}

function buildTradeRatesSection(): string {
  let text = '\n### Trade Rates (Ontario averages)\n';
  for (const trade of TRADE_RATES) {
    text += `- ${trade.trade}: $${trade.rateRange.low}–${trade.rateRange.high}${trade.unit.replace('$/', '/')}\n`;
  }
  return text;
}

function buildKeyMaterialsSection(): string {
  // Group top materials by category for readability in prompts
  const categories = new Map<string, string[]>();
  for (const m of MATERIAL_COSTS) {
    const cat = m.category;
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(`  - ${m.item}: $${m.costRange.low}–${m.costRange.high} ${m.unit}`);
  }

  let text = '\n### Key Material Costs\n';
  categories.forEach((items, cat) => {
    text += `**${cat.charAt(0).toUpperCase() + cat.slice(1)}:**\n`;
    text += items.join('\n') + '\n';
  });
  return text;
}

function buildRegionalSection(): string {
  let text = '\n### Regional Multipliers (Ontario)\n';
  for (const r of REGIONAL_MULTIPLIERS) {
    const pct = ((r.multiplier - 1) * 100).toFixed(0);
    const sign = r.multiplier >= 1 ? '+' : '';
    text += `- ${r.region}: ${sign}${pct}% (${r.description})\n`;
  }
  return text;
}

function buildBusinessConstants(): string {
  return `\n### Business Constants
- Internal labour rate: $${BUSINESS_CONSTANTS.internalLabourRate}/hour
- Contract labour markup: ${(BUSINESS_CONSTANTS.contractMarkup * 100).toFixed(0)}% management fee
- HST: ${(BUSINESS_CONSTANTS.hstRate * 100).toFixed(0)}% (Ontario)
- Required deposit: ${(BUSINESS_CONSTANTS.depositRate * 100).toFixed(0)}%
- Contingency: ${(BUSINESS_CONSTANTS.contingencyRate * 100).toFixed(0)}% built into estimates
- Variance: ±${(BUSINESS_CONSTANTS.varianceRate * 100).toFixed(0)}% on all preliminary estimates`;
}

/**
 * Full pricing reference for AI agents — comprehensive pricing data.
 * Used by Emma (estimate context) and detailed pricing discussions.
 */
export const PRICING_FULL = `## Ontario Renovation Pricing Database (INTERNAL — Never share raw numbers directly)
${buildPerSqftSection()}
${buildTradeRatesSection()}
${buildKeyMaterialsSection()}
${buildRegionalSection()}
${buildBusinessConstants()}

### Estimate Presentation Rules
- ALWAYS present as a RANGE (e.g., "$25,000–$32,000")
- Apply ±15% variance to calculated values
- Break down into Materials, Labour, and HST
- Mention deposit requirement (50%)
- Include the disclaimer: "This is a preliminary AI-generated estimate. Final pricing requires an in-person assessment."
`;

/**
 * Concise pricing summary for AI agents — used in lightweight prompts.
 * Used by Emma (receptionist) and overview discussions.
 */
export const PRICING_SUMMARY = `Renovation costs vary by scope and finish level. Kitchens typically start around $15,000 for updates and can reach $80,000+ for premium full remodels. Bathrooms range from $8,000 to $40,000+. Basements from $20,000 for basic finishing to $60,000+ for rental suites. Living rooms, bedrooms, and dining rooms range from $5,000 for cosmetic updates to $30,000+ for premium renovations. All estimates include 13% HST, and we require a 50% deposit. Final pricing always requires an in-person assessment.`;
