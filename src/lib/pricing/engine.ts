/**
 * Pricing Engine
 * Calculate renovation estimates based on project parameters
 */

import {
  PRICING_GUIDELINES,
  DEFAULT_SIZES,
  BUSINESS_CONSTANTS,
  MATERIAL_SPLIT,
  type ProjectType,
  type FinishLevel,
} from './constants';

export interface EstimateInput {
  projectType: ProjectType;
  areaSqft?: number | undefined;
  finishLevel?: FinishLevel | undefined;
}

export interface EstimateBreakdown {
  materials: number;
  labor: number;
  subtotal: number;
  contingency: number;
  hst: number;
  total: number;
}

export interface EstimateResult {
  low: number;
  high: number;
  midpoint: number;
  breakdown: EstimateBreakdown;
  perSqft: { low: number; high: number };
  depositRequired: number;
  confidence: number;
  notes: string[];
}

/**
 * Calculate a renovation estimate
 */
export function calculateEstimate(input: EstimateInput): EstimateResult {
  const { projectType, areaSqft, finishLevel = 'standard' } = input;

  // Get pricing range for this project type and finish level
  const pricing = PRICING_GUIDELINES[projectType];
  if (!pricing) {
    throw new Error(`Unknown project type: ${projectType}`);
  }

  const priceRange = pricing[finishLevel];
  const size = areaSqft || DEFAULT_SIZES[projectType] || 100;

  // Calculate base estimate
  const baseLow = priceRange.min * size;
  const baseHigh = priceRange.max * size;
  const baseMid = (baseLow + baseHigh) / 2;

  // Apply variance (±15%)
  const variance = BUSINESS_CONSTANTS.varianceRate;
  const estimateLow = Math.round(baseLow * (1 - variance));
  const estimateHigh = Math.round(baseHigh * (1 + variance));

  // Calculate breakdown using midpoint
  const materialSplit = MATERIAL_SPLIT[projectType] || 0.5;
  const materialsCost = baseMid * materialSplit;
  const laborCost = baseMid * (1 - materialSplit);

  // Add contingency
  const subtotal = materialsCost + laborCost;
  const contingency = subtotal * BUSINESS_CONSTANTS.contingencyRate;
  const subtotalWithContingency = subtotal + contingency;

  // Calculate HST
  const hst = subtotalWithContingency * BUSINESS_CONSTANTS.hstRate;
  const total = subtotalWithContingency + hst;

  // Calculate deposit
  const depositRequired = total * BUSINESS_CONSTANTS.depositRate;

  // Determine confidence based on input completeness
  let confidence = 0.5;
  const notes: string[] = [];

  if (areaSqft) {
    confidence += 0.2;
  } else {
    notes.push(`Using estimated size of ${size} sqft`);
  }

  if (finishLevel !== 'standard') {
    confidence += 0.1;
  }

  return {
    low: estimateLow,
    high: estimateHigh,
    midpoint: Math.round(baseMid),
    breakdown: {
      materials: Math.round(materialsCost),
      labor: Math.round(laborCost),
      subtotal: Math.round(subtotal),
      contingency: Math.round(contingency),
      hst: Math.round(hst),
      total: Math.round(total),
    },
    perSqft: {
      low: priceRange.min,
      high: priceRange.max,
    },
    depositRequired: Math.round(depositRequired),
    confidence,
    notes,
  };
}

/**
 * Format estimate as currency range string
 */
export function formatEstimateRange(estimate: EstimateResult): string {
  const formatter = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return `${formatter.format(estimate.low)} – ${formatter.format(estimate.high)}`;
}

/**
 * Generate estimate summary text for AI response
 */
export function generateEstimateSummary(
  estimate: EstimateResult,
  projectType: string
): string {
  const range = formatEstimateRange(estimate);
  const { breakdown, depositRequired, notes } = estimate;

  const formatter = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  let summary = `Based on what you've shared, here's a preliminary estimate for your ${projectType} project:\n\n`;
  summary += `**Estimated Range: ${range}**\n\n`;
  summary += `Breakdown:\n`;
  summary += `- Materials: ${formatter.format(breakdown.materials)}\n`;
  summary += `- Labor: ${formatter.format(breakdown.labor)}\n`;
  summary += `- Contingency (10%): ${formatter.format(breakdown.contingency)}\n`;
  summary += `- HST (13%): ${formatter.format(breakdown.hst)}\n\n`;
  summary += `Deposit required: ${formatter.format(depositRequired)} (${(BUSINESS_CONSTANTS.depositRate * 100).toFixed(0)}%)\n\n`;

  if (notes.length > 0) {
    summary += `Notes: ${notes.join('. ')}\n\n`;
  }

  summary += `*This is a preliminary AI-generated estimate based on the information you've shared. Final pricing requires an in-person assessment and may vary based on site conditions, material selections, and scope changes. This estimate is valid for 30 days.*`;

  return summary;
}

/**
 * Validate if a budget is realistic for the scope
 */
export function validateBudgetForScope(
  projectType: ProjectType,
  areaSqft: number,
  budgetBand: string
): {
  isRealistic: boolean;
  message?: string;
} {
  const estimate = calculateEstimate({
    projectType,
    areaSqft,
    finishLevel: 'standard',
  });

  // Parse budget band to approximate amount
  const budgetRanges: Record<string, { min: number; max: number }> = {
    under_15k: { min: 0, max: 15000 },
    '15k_25k': { min: 15000, max: 25000 },
    '25k_40k': { min: 25000, max: 40000 },
    '40k_60k': { min: 40000, max: 60000 },
    '60k_plus': { min: 60000, max: Infinity },
    not_sure: { min: 0, max: Infinity },
  };

  const budget = budgetRanges[budgetBand];
  if (!budget || budgetBand === 'not_sure') {
    return { isRealistic: true };
  }

  // Check if estimate overlaps with budget
  if (estimate.high < budget.min) {
    return {
      isRealistic: true,
      message: `Good news! Based on your scope, the estimate might come in under your budget range.`,
    };
  }

  if (estimate.low > budget.max) {
    return {
      isRealistic: false,
      message: `For a ${projectType} of this size, typical costs range from ${formatEstimateRange(estimate)}. We may need to discuss adjusting the scope to fit your budget.`,
    };
  }

  return { isRealistic: true };
}
