/**
 * Trade-Specific Labour Estimator
 * Maps scope-of-work items to Ontario trade rates and calculates
 * labour costs broken down by trade.
 *
 * Pure function — no API calls, no async.
 */

import { TRADE_RATES } from './knowledge/pricing-data';
import type { ScopeOfWork } from './scope-of-work-analysis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TradeLabourEstimate {
  /** Trade name (matches TRADE_RATES) */
  trade: string;
  /** Aggregated hours for this trade */
  hours: { low: number; high: number };
  /** Hourly rate range from TRADE_RATES */
  rate: { low: number; high: number };
  /** Total cost range (hours x rate) */
  cost: { low: number; high: number };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Hour estimate variance (±20%) to generate low/high range from point estimates */
const HOUR_VARIANCE = 0.20;

/** Project management overhead percentage */
const PM_OVERHEAD_RATE = 0.10;

/**
 * Mapping from common trade name variations (as returned by GPT) to
 * canonical TRADE_RATES trade names.
 */
const TRADE_ALIASES: Record<string, string> = {
  'demolition': 'Demolition',
  'demo': 'Demolition',
  'general labourer': 'General Labourer',
  'general labour': 'General Labourer',
  'labourer': 'General Labourer',
  'labour': 'General Labourer',
  'carpenter': 'Carpenter (Finish)',
  'carpenter (finish)': 'Carpenter (Finish)',
  'finish carpenter': 'Carpenter (Finish)',
  'carpenter (rough)': 'Carpenter (Rough)',
  'rough carpenter': 'Carpenter (Rough)',
  'framer': 'Carpenter (Rough)',
  'electrician': 'Electrician',
  'electrical': 'Electrician',
  'plumber': 'Plumber',
  'plumbing': 'Plumber',
  'hvac': 'HVAC Technician',
  'hvac technician': 'HVAC Technician',
  'tile setter': 'Tile Setter',
  'tile installer': 'Tile Setter',
  'tiler': 'Tile Setter',
  'tile': 'Tile Setter',
  'painter': 'Painter',
  'paint': 'Painter',
  'drywall': 'Drywall Installer',
  'drywall installer': 'Drywall Installer',
  'drywaller': 'Drywall Installer',
  'flooring': 'Flooring Installer',
  'flooring installer': 'Flooring Installer',
  'floor installer': 'Flooring Installer',
  'mason': 'Mason/Bricklayer',
  'bricklayer': 'Mason/Bricklayer',
  'mason/bricklayer': 'Mason/Bricklayer',
  'roofer': 'Roofer',
  'roofing': 'Roofer',
  'project manager': 'Project Manager',
};

// ---------------------------------------------------------------------------
// Main Function
// ---------------------------------------------------------------------------

/**
 * Estimate labour costs by trade from a scope of work.
 *
 * @param scope - Detailed scope of work from before/after analysis
 * @returns Labour estimates broken down by trade, plus PM overhead
 */
export function estimateLabourByTrade(scope: ScopeOfWork): TradeLabourEstimate[] {
  // Aggregate hours per trade
  const hoursPerTrade = new Map<string, number>();

  // Process demolition items
  for (const item of scope.demolition) {
    const trade = normalizeTrade(item.trade);
    hoursPerTrade.set(trade, (hoursPerTrade.get(trade) ?? 0) + item.estimatedHours);
  }

  // Process new installations
  for (const item of scope.newInstallation) {
    const trade = normalizeTrade(item.trade);
    hoursPerTrade.set(trade, (hoursPerTrade.get(trade) ?? 0) + item.estimatedHours);
  }

  // Process relocations
  for (const item of scope.relocation) {
    const trade = normalizeTrade(item.trade);
    hoursPerTrade.set(trade, (hoursPerTrade.get(trade) ?? 0) + item.estimatedHours);
  }

  // Build estimates for each trade
  const estimates: TradeLabourEstimate[] = [];

  for (const [trade, pointHours] of hoursPerTrade) {
    const rate = findTradeRate(trade);

    const hoursLow = Math.max(1, Math.round(pointHours * (1 - HOUR_VARIANCE) * 10) / 10);
    const hoursHigh = Math.round(pointHours * (1 + HOUR_VARIANCE) * 10) / 10;

    estimates.push({
      trade,
      hours: { low: hoursLow, high: hoursHigh },
      rate: { low: rate.low, high: rate.high },
      cost: {
        low: Math.round(hoursLow * rate.low),
        high: Math.round(hoursHigh * rate.high),
      },
    });
  }

  // Add 10% project management overhead
  const totalLabourHoursLow = estimates.reduce((sum, e) => sum + e.hours.low, 0);
  const totalLabourHoursHigh = estimates.reduce((sum, e) => sum + e.hours.high, 0);

  const pmRate = findTradeRate('Project Manager');
  const pmHoursLow = Math.max(1, Math.round(totalLabourHoursLow * PM_OVERHEAD_RATE * 10) / 10);
  const pmHoursHigh = Math.round(totalLabourHoursHigh * PM_OVERHEAD_RATE * 10) / 10;

  estimates.push({
    trade: 'Project Manager',
    hours: { low: pmHoursLow, high: pmHoursHigh },
    rate: { low: pmRate.low, high: pmRate.high },
    cost: {
      low: Math.round(pmHoursLow * pmRate.low),
      high: Math.round(pmHoursHigh * pmRate.high),
    },
  });

  // Sort by cost (highest first) for display
  estimates.sort((a, b) => b.cost.high - a.cost.high);

  return estimates;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a trade name from GPT output to a canonical TRADE_RATES name.
 */
function normalizeTrade(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return TRADE_ALIASES[lower] ?? raw;
}

/**
 * Find the rate range for a trade. Falls back to General Labourer rates
 * if the trade is not found in TRADE_RATES.
 */
function findTradeRate(trade: string): { low: number; high: number } {
  const match = TRADE_RATES.find(
    (t) => t.trade.toLowerCase() === trade.toLowerCase(),
  );

  if (match) {
    return { low: match.rateRange.low, high: match.rateRange.high };
  }

  // Fallback: General Labourer
  const fallback = TRADE_RATES.find((t) => t.trade === 'General Labourer');
  return fallback
    ? { low: fallback.rateRange.low, high: fallback.rateRange.high }
    : { low: 35, high: 55 };
}
