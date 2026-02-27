/**
 * Pricing Constants
 * Pricing guidelines for renovation estimates
 */

export const PRICING_GUIDELINES = {
  /**
   * Per-square-foot pricing by project type and finish level
   * Ranges represent min-max for the finish level
   */
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
} as const;

/**
 * Default square footage estimates when not provided
 */
export const DEFAULT_SIZES = {
  kitchen: 150,
  bathroom: 50,
  basement: 800,
  flooring: 200,
} as const;

/**
 * Business constants
 */
export const BUSINESS_CONSTANTS = {
  /** Internal labor rate per hour */
  laborRate: 85,

  /** Markup for contracted labor (15%) */
  contractMarkup: 1.15,

  /** Ontario HST rate (13%) */
  hstRate: 0.13,

  /** Default deposit percentage (15%). Use getDepositPercent() for tenant-specific values. */
  depositRate: 0.15,

  /** Contingency rate (10%) */
  contingencyRate: 0.1,

  /** Estimate variance (±15%) */
  varianceRate: 0.15,

  /** Quote validity in days */
  quoteValidityDays: 30,
} as const;

/**
 * Material/Labor split by project type (percentage that goes to materials)
 */
export const MATERIAL_SPLIT = {
  kitchen: 0.55,
  bathroom: 0.50,
  basement: 0.45,
  flooring: 0.60,
  painting: 0.30,
  exterior: 0.50,
  other: 0.50,
} as const;

export type ProjectType = keyof typeof PRICING_GUIDELINES;
export type FinishLevel = 'economy' | 'standard' | 'premium';

/** Default deposit percentage when admin_settings has no override */
export const DEFAULT_DEPOSIT_PERCENT = 15;
