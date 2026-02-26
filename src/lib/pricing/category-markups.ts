/**
 * Per-Category Markup Configuration
 * 7-category markup system with margin calculation
 * Pure functions, zero DB calls, client-safe.
 * [DEV-072 Phase 2]
 */

/**
 * Per-category markup percentages
 */
export interface CategoryMarkupsConfig {
  materials: number;   // default 15%
  labor: number;       // default 30%
  contract: number;    // default 15%
  equipment: number;   // default 10%
  permit: number;      // default 0%
  allowances: number;  // default 0%
  other: number;       // default 10%
}

/**
 * Default markup configuration
 */
export const DEFAULT_CATEGORY_MARKUPS: CategoryMarkupsConfig = {
  materials: 15,
  labor: 30,
  contract: 15,
  equipment: 10,
  permit: 0,
  allowances: 0,
  other: 10,
};

/**
 * Category display labels (Canadian spelling)
 */
export const CATEGORY_LABELS: Record<keyof CategoryMarkupsConfig, string> = {
  materials: 'Materials',
  labor: 'Labour',
  contract: 'Contract Labour',
  equipment: 'Equipment',
  permit: 'Permits',
  allowances: 'Allowances',
  other: 'Other',
};

/**
 * Convert markup percentage to margin percentage.
 * Markup is added to cost. Margin is percentage of selling price.
 *
 * Example: 25% markup = 20% margin
 * Formula: margin = markup / (100 + markup) × 100
 */
export function markupToMargin(markupPercent: number): number {
  if (markupPercent <= 0) return 0;
  return (markupPercent / (100 + markupPercent)) * 100;
}

/**
 * Apply markup to a base cost.
 * Returns the final price after markup.
 */
export function applyMarkup(cost: number, markupPercent: number): number {
  return cost * (1 + markupPercent / 100);
}

/**
 * Get the markup percentage for a given category.
 */
export function getMarkupForCategory(
  category: string,
  markups: CategoryMarkupsConfig = DEFAULT_CATEGORY_MARKUPS,
): number {
  if (category in markups) {
    return markups[category as keyof CategoryMarkupsConfig];
  }
  return markups.other;
}
