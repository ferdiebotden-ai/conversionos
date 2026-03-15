/**
 * Ontario Renovation Pricing Database — Typed Structures
 * Comprehensive pricing data for AI cost estimation and client-facing ranges.
 * All prices in CAD. Data sourced from Ontario contractor averages (2024-2026).
 *
 * Used by:
 * - AI prompt injection (PRICING_FULL / PRICING_SUMMARY)
 * - Client-side cost range calculation (CostRangeIndicator)
 * - Concept pricing analysis (analyzeConceptForPricing)
 */

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface TradeRate {
  trade: string;
  rateRange: { low: number; high: number };
  unit: string;
}

export interface MaterialCost {
  item: string;
  category: MaterialCategory;
  costRange: { low: number; mid: number; high: number };
  unit: string;
  /** Room types where this material is commonly used */
  applicableRooms: RoomCategory[];
  /** Data source citation (e.g., "Ontario contractor averages 2024-2026") */
  source?: string;
  /** Last updated date (e.g., "2026-03") */
  lastUpdated?: string;
}

export type MaterialCategory =
  | 'cabinetry'
  | 'countertops'
  | 'flooring'
  | 'tile'
  | 'fixtures'
  | 'appliances'
  | 'plumbing'
  | 'electrical'
  | 'drywall'
  | 'paint'
  | 'millwork'
  | 'insulation'
  | 'waterproofing'
  | 'hardware';

export type RoomCategory =
  | 'kitchen'
  | 'bathroom'
  | 'basement'
  | 'living_room'
  | 'bedroom'
  | 'dining_room'
  | 'exterior'
  | 'flooring';

export interface RegionalMultiplier {
  region: string;
  multiplier: number;
  description: string;
}

export interface PerSqftRange {
  economy: { min: number; max: number };
  standard: { min: number; max: number };
  premium: { min: number; max: number };
}

export type FinishLevel = 'economy' | 'standard' | 'premium';

// ---------------------------------------------------------------------------
// Trade Rates (Ontario averages, $/hour)
// ---------------------------------------------------------------------------

export const TRADE_RATES: TradeRate[] = [
  { trade: 'General Labourer', rateRange: { low: 25, high: 40 }, unit: '$/hr' },
  { trade: 'Carpenter (Rough)', rateRange: { low: 45, high: 65 }, unit: '$/hr' },
  { trade: 'Carpenter (Finish)', rateRange: { low: 55, high: 85 }, unit: '$/hr' },
  { trade: 'Electrician', rateRange: { low: 80, high: 130 }, unit: '$/hr' },
  { trade: 'Plumber', rateRange: { low: 85, high: 140 }, unit: '$/hr' },
  { trade: 'HVAC Technician', rateRange: { low: 85, high: 135 }, unit: '$/hr' },
  { trade: 'Tile Setter', rateRange: { low: 50, high: 80 }, unit: '$/hr' },
  { trade: 'Painter', rateRange: { low: 35, high: 55 }, unit: '$/hr' },
  { trade: 'Drywall Installer', rateRange: { low: 40, high: 60 }, unit: '$/hr' },
  { trade: 'Flooring Installer', rateRange: { low: 45, high: 70 }, unit: '$/hr' },
  { trade: 'Mason/Bricklayer', rateRange: { low: 55, high: 85 }, unit: '$/hr' },
  { trade: 'Roofer', rateRange: { low: 45, high: 75 }, unit: '$/hr' },
  { trade: 'Demolition', rateRange: { low: 30, high: 50 }, unit: '$/hr' },
  { trade: 'Project Manager', rateRange: { low: 65, high: 100 }, unit: '$/hr' },
];

// ---------------------------------------------------------------------------
// Material Costs (Ontario retail/contractor pricing)
// ---------------------------------------------------------------------------

export const MATERIAL_COSTS: MaterialCost[] = [
  // Cabinetry
  { item: 'Stock cabinets', category: 'cabinetry', costRange: { low: 100, mid: 175, high: 250 }, unit: '$/linear ft', applicableRooms: ['kitchen', 'bathroom'] },
  { item: 'Semi-custom cabinets', category: 'cabinetry', costRange: { low: 250, mid: 400, high: 600 }, unit: '$/linear ft', applicableRooms: ['kitchen', 'bathroom'] },
  { item: 'Custom cabinets', category: 'cabinetry', costRange: { low: 600, mid: 900, high: 1500 }, unit: '$/linear ft', applicableRooms: ['kitchen', 'bathroom'] },
  { item: 'Vanity (single)', category: 'cabinetry', costRange: { low: 200, mid: 600, high: 1500 }, unit: '$/unit', applicableRooms: ['bathroom'] },
  { item: 'Vanity (double)', category: 'cabinetry', costRange: { low: 500, mid: 1200, high: 3000 }, unit: '$/unit', applicableRooms: ['bathroom'] },

  // Countertops
  { item: 'Laminate countertop', category: 'countertops', costRange: { low: 25, mid: 40, high: 60 }, unit: '$/sqft', applicableRooms: ['kitchen', 'bathroom'] },
  { item: 'Quartz countertop', category: 'countertops', costRange: { low: 65, mid: 90, high: 130 }, unit: '$/sqft', applicableRooms: ['kitchen', 'bathroom'] },
  { item: 'Granite countertop', category: 'countertops', costRange: { low: 60, mid: 85, high: 120 }, unit: '$/sqft', applicableRooms: ['kitchen', 'bathroom'] },
  { item: 'Marble countertop', category: 'countertops', costRange: { low: 80, mid: 120, high: 200 }, unit: '$/sqft', applicableRooms: ['kitchen', 'bathroom'] },
  { item: 'Butcher block', category: 'countertops', costRange: { low: 40, mid: 65, high: 100 }, unit: '$/sqft', applicableRooms: ['kitchen'] },

  // Flooring
  { item: 'Laminate flooring', category: 'flooring', costRange: { low: 3, mid: 5, high: 8 }, unit: '$/sqft', applicableRooms: ['kitchen', 'bathroom', 'basement', 'living_room', 'bedroom', 'dining_room', 'flooring'] },
  { item: 'Luxury vinyl plank (LVP)', category: 'flooring', costRange: { low: 4, mid: 7, high: 12 }, unit: '$/sqft', applicableRooms: ['kitchen', 'bathroom', 'basement', 'living_room', 'bedroom', 'dining_room', 'flooring'] },
  { item: 'Engineered hardwood', category: 'flooring', costRange: { low: 8, mid: 12, high: 18 }, unit: '$/sqft', applicableRooms: ['kitchen', 'living_room', 'bedroom', 'dining_room', 'flooring'] },
  { item: 'Solid hardwood', category: 'flooring', costRange: { low: 10, mid: 15, high: 25 }, unit: '$/sqft', applicableRooms: ['living_room', 'bedroom', 'dining_room', 'flooring'] },
  { item: 'Large-format porcelain tile', category: 'flooring', costRange: { low: 6, mid: 10, high: 18 }, unit: '$/sqft', applicableRooms: ['kitchen', 'bathroom', 'living_room', 'flooring'] },
  { item: 'Heated floor underlayment', category: 'flooring', costRange: { low: 8, mid: 12, high: 18 }, unit: '$/sqft', applicableRooms: ['bathroom', 'kitchen', 'flooring'] },
  { item: 'Carpet', category: 'flooring', costRange: { low: 3, mid: 6, high: 12 }, unit: '$/sqft', applicableRooms: ['basement', 'bedroom', 'living_room', 'flooring'] },

  // Tile
  { item: 'Ceramic tile', category: 'tile', costRange: { low: 3, mid: 6, high: 10 }, unit: '$/sqft', applicableRooms: ['kitchen', 'bathroom'] },
  { item: 'Porcelain tile', category: 'tile', costRange: { low: 5, mid: 10, high: 20 }, unit: '$/sqft', applicableRooms: ['kitchen', 'bathroom'] },
  { item: 'Subway tile', category: 'tile', costRange: { low: 4, mid: 8, high: 15 }, unit: '$/sqft', applicableRooms: ['kitchen', 'bathroom'] },
  { item: 'Mosaic tile', category: 'tile', costRange: { low: 10, mid: 20, high: 40 }, unit: '$/sqft', applicableRooms: ['kitchen', 'bathroom'] },
  { item: 'Natural stone tile', category: 'tile', costRange: { low: 12, mid: 25, high: 50 }, unit: '$/sqft', applicableRooms: ['kitchen', 'bathroom'] },

  // Fixtures (plumbing)
  { item: 'Kitchen faucet', category: 'fixtures', costRange: { low: 100, mid: 300, high: 800 }, unit: '$/unit', applicableRooms: ['kitchen'] },
  { item: 'Bathroom faucet', category: 'fixtures', costRange: { low: 80, mid: 250, high: 600 }, unit: '$/unit', applicableRooms: ['bathroom'] },
  { item: 'Toilet', category: 'fixtures', costRange: { low: 200, mid: 450, high: 1200 }, unit: '$/unit', applicableRooms: ['bathroom', 'basement'] },
  { item: 'Bathtub (alcove)', category: 'fixtures', costRange: { low: 300, mid: 700, high: 2000 }, unit: '$/unit', applicableRooms: ['bathroom'] },
  { item: 'Freestanding tub', category: 'fixtures', costRange: { low: 800, mid: 2000, high: 5000 }, unit: '$/unit', applicableRooms: ['bathroom'] },
  { item: 'Shower enclosure (glass)', category: 'fixtures', costRange: { low: 800, mid: 1500, high: 3500 }, unit: '$/unit', applicableRooms: ['bathroom'] },
  { item: 'Kitchen sink (stainless)', category: 'fixtures', costRange: { low: 150, mid: 400, high: 1000 }, unit: '$/unit', applicableRooms: ['kitchen'] },
  { item: 'Kitchen sink (undermount composite)', category: 'fixtures', costRange: { low: 300, mid: 600, high: 1200 }, unit: '$/unit', applicableRooms: ['kitchen'] },

  // Appliances
  { item: 'Refrigerator', category: 'appliances', costRange: { low: 800, mid: 1800, high: 4500 }, unit: '$/unit', applicableRooms: ['kitchen'] },
  { item: 'Range/Oven', category: 'appliances', costRange: { low: 600, mid: 1500, high: 5000 }, unit: '$/unit', applicableRooms: ['kitchen'] },
  { item: 'Dishwasher', category: 'appliances', costRange: { low: 400, mid: 800, high: 1800 }, unit: '$/unit', applicableRooms: ['kitchen'] },
  { item: 'Range hood', category: 'appliances', costRange: { low: 150, mid: 500, high: 1500 }, unit: '$/unit', applicableRooms: ['kitchen'] },
  { item: 'Microwave (built-in)', category: 'appliances', costRange: { low: 200, mid: 500, high: 1200 }, unit: '$/unit', applicableRooms: ['kitchen'] },

  // Electrical
  { item: 'Pot lights (LED)', category: 'electrical', costRange: { low: 75, mid: 120, high: 200 }, unit: '$/unit installed', applicableRooms: ['kitchen', 'bathroom', 'basement', 'living_room', 'bedroom'] },
  { item: 'Under-cabinet lighting', category: 'electrical', costRange: { low: 200, mid: 500, high: 1200 }, unit: '$/zone', applicableRooms: ['kitchen'] },
  { item: 'Electrical panel upgrade', category: 'electrical', costRange: { low: 1500, mid: 2500, high: 4000 }, unit: '$/job', applicableRooms: ['basement', 'kitchen'] },
  { item: 'Pendant light fixture', category: 'electrical', costRange: { low: 80, mid: 250, high: 800 }, unit: '$/unit', applicableRooms: ['kitchen', 'dining_room'] },

  // Drywall & Paint
  { item: 'Drywall (supply + install)', category: 'drywall', costRange: { low: 3, mid: 5, high: 8 }, unit: '$/sqft', applicableRooms: ['basement', 'kitchen', 'bathroom', 'living_room', 'bedroom'] },
  { item: 'Interior paint (walls)', category: 'paint', costRange: { low: 2, mid: 4, high: 7 }, unit: '$/sqft', applicableRooms: ['kitchen', 'bathroom', 'basement', 'living_room', 'bedroom', 'dining_room'] },
  { item: 'Exterior paint', category: 'paint', costRange: { low: 3, mid: 5, high: 9 }, unit: '$/sqft', applicableRooms: ['exterior'] },

  // Millwork
  { item: 'Crown moulding', category: 'millwork', costRange: { low: 5, mid: 10, high: 20 }, unit: '$/linear ft', applicableRooms: ['kitchen', 'living_room', 'bedroom', 'dining_room'] },
  { item: 'Baseboard', category: 'millwork', costRange: { low: 3, mid: 6, high: 12 }, unit: '$/linear ft', applicableRooms: ['kitchen', 'bathroom', 'basement', 'living_room', 'bedroom', 'dining_room'] },
  { item: 'Wainscoting', category: 'millwork', costRange: { low: 10, mid: 20, high: 40 }, unit: '$/sqft', applicableRooms: ['bathroom', 'dining_room', 'living_room'] },
  { item: 'Built-in shelving', category: 'millwork', costRange: { low: 500, mid: 1500, high: 4000 }, unit: '$/unit', applicableRooms: ['living_room', 'bedroom', 'basement'] },

  // Insulation (basement)
  { item: 'Batt insulation (R20)', category: 'insulation', costRange: { low: 1, mid: 2, high: 3 }, unit: '$/sqft', applicableRooms: ['basement'] },
  { item: 'Spray foam insulation', category: 'insulation', costRange: { low: 3, mid: 5, high: 8 }, unit: '$/sqft', applicableRooms: ['basement'] },

  // Waterproofing (basement/bathroom)
  { item: 'Interior waterproofing', category: 'waterproofing', costRange: { low: 8, mid: 15, high: 25 }, unit: '$/linear ft', applicableRooms: ['basement'] },
  { item: 'Shower waterproofing membrane', category: 'waterproofing', costRange: { low: 3, mid: 5, high: 8 }, unit: '$/sqft', applicableRooms: ['bathroom'] },

  // Hardware
  { item: 'Cabinet hardware (handles)', category: 'hardware', costRange: { low: 3, mid: 8, high: 25 }, unit: '$/unit', applicableRooms: ['kitchen', 'bathroom'] },
  { item: 'Door hardware (interior)', category: 'hardware', costRange: { low: 20, mid: 50, high: 150 }, unit: '$/unit', applicableRooms: ['basement', 'living_room', 'bedroom'] },
];

// ---------------------------------------------------------------------------
// Per-Square-Foot Ranges (all-in, by room type and finish level)
// ---------------------------------------------------------------------------

export const PER_SQFT_RANGES: Record<string, PerSqftRange> = {
  kitchen: {
    economy: { min: 150, max: 200 },
    standard: { min: 200, max: 275 },
    premium: { min: 275, max: 400 },
  },
  bathroom: {
    economy: { min: 200, max: 300 },
    standard: { min: 300, max: 450 },
    premium: { min: 450, max: 600 },
  },
  basement: {
    economy: { min: 40, max: 55 },
    standard: { min: 55, max: 70 },
    premium: { min: 70, max: 100 },
  },
  flooring: {
    economy: { min: 8, max: 12 },
    standard: { min: 12, max: 18 },
    premium: { min: 18, max: 30 },
  },
  living_room: {
    economy: { min: 30, max: 50 },
    standard: { min: 50, max: 80 },
    premium: { min: 80, max: 130 },
  },
  bedroom: {
    economy: { min: 25, max: 40 },
    standard: { min: 40, max: 65 },
    premium: { min: 65, max: 100 },
  },
  dining_room: {
    economy: { min: 30, max: 50 },
    standard: { min: 50, max: 80 },
    premium: { min: 80, max: 130 },
  },
  exterior: {
    economy: { min: 15, max: 30 },
    standard: { min: 30, max: 55 },
    premium: { min: 55, max: 100 },
  },
};

/** Default estimated sqft when not provided */
export const DEFAULT_SQFT: Record<string, number> = {
  kitchen: 150,
  bathroom: 50,
  basement: 800,
  flooring: 200,
  living_room: 250,
  bedroom: 180,
  dining_room: 150,
  exterior: 500,
};

// ---------------------------------------------------------------------------
// Regional Multipliers (Ontario)
// ---------------------------------------------------------------------------

export const REGIONAL_MULTIPLIERS: RegionalMultiplier[] = [
  { region: 'Greater Toronto Area (GTA)', multiplier: 1.15, description: 'High demand, higher labour costs' },
  { region: 'Ottawa-Gatineau', multiplier: 1.10, description: 'Government town, above-average pricing' },
  { region: 'Hamilton-Burlington', multiplier: 1.05, description: 'Growing market, moderate premium' },
  { region: 'Kitchener-Waterloo', multiplier: 1.03, description: 'Tech hub growth pressure' },
  { region: 'London', multiplier: 1.00, description: 'Benchmark / average Ontario pricing' },
  { region: 'Southwestern Ontario', multiplier: 0.95, description: 'Rural areas, slightly lower' },
  { region: 'Northern Ontario', multiplier: 1.08, description: 'Supply chain costs, limited contractors' },
  { region: 'Niagara Region', multiplier: 1.00, description: 'Average Ontario pricing' },
  { region: 'Barrie-Simcoe', multiplier: 1.05, description: 'Cottage country influence' },
];

/** Default multiplier when region is unknown */
export const DEFAULT_REGIONAL_MULTIPLIER = 1.0;

/** Map Ontario cities/towns to their regional multiplier region */
const CITY_TO_REGION: Record<string, string> = {
  'toronto': 'Greater Toronto Area (GTA)',
  'mississauga': 'Greater Toronto Area (GTA)',
  'brampton': 'Greater Toronto Area (GTA)',
  'markham': 'Greater Toronto Area (GTA)',
  'vaughan': 'Greater Toronto Area (GTA)',
  'richmond hill': 'Greater Toronto Area (GTA)',
  'scarborough': 'Greater Toronto Area (GTA)',
  'etobicoke': 'Greater Toronto Area (GTA)',
  'north york': 'Greater Toronto Area (GTA)',
  'ottawa': 'Ottawa-Gatineau',
  'gatineau': 'Ottawa-Gatineau',
  'hamilton': 'Hamilton-Burlington',
  'burlington': 'Hamilton-Burlington',
  'kitchener': 'Kitchener-Waterloo',
  'waterloo': 'Kitchener-Waterloo',
  'cambridge': 'Kitchener-Waterloo',
  'london': 'London',
  'guelph': 'London',
  'stratford': 'Southwestern Ontario',
  'woodstock': 'Southwestern Ontario',
  'ingersoll': 'Southwestern Ontario',
  'brantford': 'Southwestern Ontario',
  'chatham': 'Southwestern Ontario',
  'windsor': 'Southwestern Ontario',
  'sarnia': 'Southwestern Ontario',
  'sudbury': 'Northern Ontario',
  'thunder bay': 'Northern Ontario',
  'sault ste. marie': 'Northern Ontario',
  'north bay': 'Northern Ontario',
  'niagara falls': 'Niagara Region',
  'st. catharines': 'Niagara Region',
  'welland': 'Niagara Region',
  'barrie': 'Barrie-Simcoe',
  'orillia': 'Barrie-Simcoe',
  'collingwood': 'Barrie-Simcoe',
  'midland': 'Barrie-Simcoe',
};

/**
 * Look up the regional cost multiplier for an Ontario city.
 * Returns DEFAULT_REGIONAL_MULTIPLIER (1.0) if the city is not recognized.
 */
export function matchRegionalMultiplier(city: string): number {
  const normalized = city.toLowerCase().trim();
  const region = CITY_TO_REGION[normalized];
  if (!region) return DEFAULT_REGIONAL_MULTIPLIER;
  const entry = REGIONAL_MULTIPLIERS.find(r => r.region === region);
  return entry?.multiplier ?? DEFAULT_REGIONAL_MULTIPLIER;
}

// ---------------------------------------------------------------------------
// Business Constants
// ---------------------------------------------------------------------------

export const BUSINESS_CONSTANTS = {
  /** Ontario HST rate */
  hstRate: 0.13,
  /** Required deposit percentage */
  depositRate: 0.15,
  /** Built-in contingency rate */
  contingencyRate: 0.10,
  /** Estimate variance (±15%) */
  varianceRate: 0.15,
  /** Internal labour rate $/hr (for rough calculations) */
  internalLabourRate: 85,
  /** Contract labour markup */
  contractMarkup: 0.15,
  /** Quote validity in days */
  quoteValidityDays: 30,
} as const;

// ---------------------------------------------------------------------------
// Calculation Functions (client-safe — no DB calls, no async)
// ---------------------------------------------------------------------------

export interface CostEstimate {
  /** Pre-tax, pre-contingency low */
  baseLow: number;
  /** Pre-tax, pre-contingency high */
  baseHigh: number;
  /** Midpoint */
  midpoint: number;
  /** After ±15% variance */
  rangeLow: number;
  /** After ±15% variance */
  rangeHigh: number;
  /** Subtotal + contingency + HST */
  totalLow: number;
  /** Subtotal + contingency + HST */
  totalHigh: number;
  /** Finish level used */
  finishLevel: FinishLevel;
  /** Room type */
  roomType: string;
  /** Square footage used */
  sqft: number;
}

/**
 * Calculate a cost estimate for a room renovation.
 * Pure function — safe for client-side use.
 */
export function calculateCostEstimate(
  roomType: string,
  finishLevel: FinishLevel = 'standard',
  sqft?: number,
  regionalMultiplier: number = DEFAULT_REGIONAL_MULTIPLIER,
): CostEstimate | null {
  const range = PER_SQFT_RANGES[roomType];
  if (!range) return null;

  const levelRange = range[finishLevel];
  const effectiveSqft = sqft || DEFAULT_SQFT[roomType] || 150;

  const baseLow = levelRange.min * effectiveSqft * regionalMultiplier;
  const baseHigh = levelRange.max * effectiveSqft * regionalMultiplier;
  const midpoint = (baseLow + baseHigh) / 2;

  const variance = BUSINESS_CONSTANTS.varianceRate;
  const rangeLow = baseLow * (1 - variance);
  const rangeHigh = baseHigh * (1 + variance);

  // Add contingency + HST
  const totalLow = rangeLow * (1 + BUSINESS_CONSTANTS.contingencyRate) * (1 + BUSINESS_CONSTANTS.hstRate);
  const totalHigh = rangeHigh * (1 + BUSINESS_CONSTANTS.contingencyRate) * (1 + BUSINESS_CONSTANTS.hstRate);

  return {
    baseLow: Math.round(baseLow),
    baseHigh: Math.round(baseHigh),
    midpoint: Math.round(midpoint),
    rangeLow: Math.round(rangeLow),
    rangeHigh: Math.round(rangeHigh),
    totalLow: Math.round(totalLow),
    totalHigh: Math.round(totalHigh),
    finishLevel,
    roomType,
    sqft: effectiveSqft,
  };
}

/**
 * Snap a cost estimate to a configurable band width.
 * E.g., rangeBand=10000 → $25,000-$35,000 becomes $20,000-$40,000
 */
export function snapToRangeBand(
  low: number,
  high: number,
  rangeBand: number,
): { low: number; high: number } {
  return {
    low: Math.floor(low / rangeBand) * rangeBand,
    high: Math.ceil(high / rangeBand) * rangeBand,
  };
}

/**
 * Format a dollar amount as CAD currency string.
 */
export function formatCAD(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get materials relevant to a specific room type and finish level.
 * Returns materials sorted by category.
 */
export function getMaterialsForRoom(
  roomType: RoomCategory,
  finishLevel: FinishLevel = 'standard',
): MaterialCost[] {
  const costKey = finishLevel === 'economy' ? 'low' : finishLevel === 'premium' ? 'high' : 'mid';

  return MATERIAL_COSTS
    .filter(m => m.applicableRooms.includes(roomType))
    .sort((a, b) => {
      if (a.category < b.category) return -1;
      if (a.category > b.category) return 1;
      return b.costRange[costKey] - a.costRange[costKey]; // higher cost first within category
    });
}
