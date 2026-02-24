/**
 * Pricing Confidence Gate
 * Determines when enough context has been gathered to share pricing ranges
 *
 * Scoring model:
 * | Signal                        | Points |
 * |-------------------------------|--------|
 * | Project type identified       | +25    |
 * | Room size / dimensions known  | +20    |
 * | Finish level indicated        | +20    |
 * | Scope clarity (full/partial)  | +15    |
 * | Photo uploaded                | +10    |
 * | Timeline discussed            | +10    |
 *
 * Threshold: 60 points — requires project type + at least one of (size, finish, scope)
 */

export interface EstimateContext {
  projectType?: string;
  areaSqft?: number;
  finishLevel?: string;
  scope?: string;
  hasPhoto?: boolean;
  timeline?: string;
  goals?: string;
}

interface PricingConfidenceResult {
  score: number;
  isReady: boolean;
  missing: string[];
}

/**
 * Calculate pricing confidence score (0-100)
 */
export function calculatePricingConfidence(data: EstimateContext): number {
  let score = 0;

  if (data.projectType) score += 25;
  if (data.areaSqft && data.areaSqft > 0) score += 20;
  if (data.finishLevel) score += 20;
  if (data.scope || data.goals) score += 15;
  if (data.hasPhoto) score += 10;
  if (data.timeline) score += 10;

  return Math.min(score, 100);
}

/**
 * Check if enough context exists to share pricing
 */
export function isPricingReady(data: EstimateContext): boolean {
  return calculatePricingConfidence(data) >= 60;
}

/**
 * Get list of missing info needed for pricing confidence
 */
export function getMissingPricingInfo(data: EstimateContext): string[] {
  const missing: string[] = [];

  if (!data.projectType) missing.push('project type (kitchen, bathroom, basement, etc.)');
  if (!data.areaSqft || data.areaSqft <= 0) missing.push('approximate room size');
  if (!data.finishLevel) missing.push('finish level preference (economy, standard, or premium)');
  if (!data.scope && !data.goals) missing.push('renovation scope (full remodel or specific updates)');
  if (!data.timeline) missing.push('timeline expectations');

  return missing;
}

/**
 * Full pricing confidence assessment
 */
export function assessPricingConfidence(data: EstimateContext): PricingConfidenceResult {
  return {
    score: calculatePricingConfidence(data),
    isReady: isPricingReady(data),
    missing: getMissingPricingInfo(data),
  };
}

/**
 * Build a system prompt instruction based on pricing readiness
 * Returns text to inject into Emma's estimate context prompt
 */
export function buildPricingGateInstruction(data: EstimateContext): string {
  const { isReady, missing } = assessPricingConfidence(data);

  if (isReady) {
    return `## Pricing Guidance
You have enough context to provide preliminary pricing ranges. Include standard disclaimers:
- Present as a RANGE with ±15% variance
- Note that an in-person assessment is needed for a firm quote
- Mention that material choices significantly impact final costs`;
  }

  const missingList = missing.slice(0, 3).join(', ');

  return `## Pricing Guidance
You don't have enough information to provide a pricing range yet.
Missing: ${missingList}.

Before discussing specific costs, gather more details. Ask about the missing items one at a time.
If the homeowner presses for a number, say: "I want to give you an accurate range, not a guess — let me ask a couple quick questions first so I can be helpful."`;
}
