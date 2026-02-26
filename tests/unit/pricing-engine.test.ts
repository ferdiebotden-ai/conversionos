/**
 * Pricing Engine Unit Tests
 * Tests for renovation estimate calculations
 */

import { describe, it, expect } from 'vitest';
import {
  calculateEstimate,
  formatEstimateRange,
  generateEstimateSummary,
  validateBudgetForScope,
  type EstimateInput,
} from '@/lib/pricing/engine';
import { BUSINESS_CONSTANTS, PRICING_GUIDELINES } from '@/lib/pricing/constants';

describe('calculateEstimate', () => {
  describe('kitchen estimates', () => {
    it('calculates kitchen estimate with default size when area not provided', () => {
      const input: EstimateInput = {
        projectType: 'kitchen',
        finishLevel: 'standard',
      };

      const result = calculateEstimate(input);

      // Default kitchen size is 150 sqft
      // Standard kitchen: $200-275/sqft
      // Base: 150 * 200 = 30000 low, 150 * 275 = 41250 high
      // With ±15% variance
      expect(result.low).toBeLessThan(result.midpoint);
      expect(result.high).toBeGreaterThan(result.midpoint);
      expect(result.notes).toContain('Using estimated size of 150 sqft');
      expect(result.confidence).toBe(0.5); // No area provided
    });

    it('calculates kitchen estimate with provided area', () => {
      const input: EstimateInput = {
        projectType: 'kitchen',
        areaSqft: 200,
        finishLevel: 'standard',
      };

      const result = calculateEstimate(input);

      // 200 sqft * $200-275/sqft = $40,000 - $55,000 base
      const baseLow = 200 * PRICING_GUIDELINES.kitchen.standard.min;
      const baseHigh = 200 * PRICING_GUIDELINES.kitchen.standard.max;

      expect(result.low).toBe(Math.round(baseLow * 0.85));
      expect(result.high).toBe(Math.round(baseHigh * 1.15));
      expect(result.notes).toHaveLength(0);
      expect(result.confidence).toBe(0.7); // Area provided
    });

    it('calculates premium kitchen at higher rates', () => {
      const standard = calculateEstimate({
        projectType: 'kitchen',
        areaSqft: 150,
        finishLevel: 'standard',
      });

      const premium = calculateEstimate({
        projectType: 'kitchen',
        areaSqft: 150,
        finishLevel: 'premium',
      });

      expect(premium.midpoint).toBeGreaterThan(standard.midpoint);
      expect(premium.confidence).toBeCloseTo(0.8, 5); // Area + non-standard finish
    });

    it('calculates economy kitchen at lower rates', () => {
      const economy = calculateEstimate({
        projectType: 'kitchen',
        areaSqft: 150,
        finishLevel: 'economy',
      });

      const standard = calculateEstimate({
        projectType: 'kitchen',
        areaSqft: 150,
        finishLevel: 'standard',
      });

      expect(economy.midpoint).toBeLessThan(standard.midpoint);
    });
  });

  describe('bathroom estimates', () => {
    it('calculates bathroom estimate with default size', () => {
      const result = calculateEstimate({
        projectType: 'bathroom',
      });

      // Default bathroom size is 50 sqft
      expect(result.notes).toContain('Using estimated size of 50 sqft');
    });

    it('calculates bathroom estimate with provided area', () => {
      const result = calculateEstimate({
        projectType: 'bathroom',
        areaSqft: 75,
        finishLevel: 'standard',
      });

      // 75 sqft * $300-450/sqft = $22,500 - $33,750 base
      const baseLow = 75 * PRICING_GUIDELINES.bathroom.standard.min;
      const baseHigh = 75 * PRICING_GUIDELINES.bathroom.standard.max;

      expect(result.low).toBe(Math.round(baseLow * 0.85));
      expect(result.high).toBe(Math.round(baseHigh * 1.15));
    });
  });

  describe('basement estimates', () => {
    it('calculates basement estimate with default size', () => {
      const result = calculateEstimate({
        projectType: 'basement',
      });

      // Default basement size is 800 sqft
      expect(result.notes).toContain('Using estimated size of 800 sqft');
    });
  });

  describe('flooring estimates', () => {
    it('calculates flooring estimate', () => {
      const result = calculateEstimate({
        projectType: 'flooring',
        areaSqft: 500,
        finishLevel: 'standard',
      });

      // 500 sqft * $12-18/sqft = $6,000 - $9,000 base
      expect(result.midpoint).toBeGreaterThan(0);
      expect(result.perSqft.low).toBe(12);
      expect(result.perSqft.high).toBe(18);
    });
  });

  describe('estimate breakdown', () => {
    it('includes correct breakdown components', () => {
      const result = calculateEstimate({
        projectType: 'kitchen',
        areaSqft: 150,
        finishLevel: 'standard',
      });

      expect(result.breakdown).toHaveProperty('materials');
      expect(result.breakdown).toHaveProperty('labor');
      expect(result.breakdown).toHaveProperty('subtotal');
      expect(result.breakdown).toHaveProperty('contingency');
      expect(result.breakdown).toHaveProperty('hst');
      expect(result.breakdown).toHaveProperty('total');

      // Verify math
      expect(result.breakdown.subtotal).toBe(
        result.breakdown.materials + result.breakdown.labor
      );
      expect(result.breakdown.contingency).toBe(
        Math.round(result.breakdown.subtotal * BUSINESS_CONSTANTS.contingencyRate)
      );
      expect(result.breakdown.hst).toBe(
        Math.round(
          (result.breakdown.subtotal + result.breakdown.contingency) *
            BUSINESS_CONSTANTS.hstRate
        )
      );
    });

    it('calculates deposit correctly', () => {
      const result = calculateEstimate({
        projectType: 'kitchen',
        areaSqft: 150,
        finishLevel: 'standard',
      });

      expect(result.depositRequired).toBe(
        Math.round(result.breakdown.total * BUSINESS_CONSTANTS.depositRate)
      );
    });
  });

  describe('error handling', () => {
    it('throws error for unknown project type', () => {
      expect(() =>
        calculateEstimate({
          projectType: 'unknown' as any,
        })
      ).toThrow('Unknown project type: unknown');
    });
  });
});

describe('formatEstimateRange', () => {
  it('formats estimate range in CAD currency', () => {
    const estimate = calculateEstimate({
      projectType: 'kitchen',
      areaSqft: 150,
      finishLevel: 'standard',
    });

    const formatted = formatEstimateRange(estimate);

    expect(formatted).toMatch(/^\$[\d,]+ – \$[\d,]+$/);
    expect(formatted).toContain('$');
  });
});

describe('generateEstimateSummary', () => {
  it('generates summary with all required sections', () => {
    const estimate = calculateEstimate({
      projectType: 'kitchen',
      areaSqft: 150,
      finishLevel: 'standard',
    });

    const summary = generateEstimateSummary(estimate, 'kitchen');

    expect(summary).toContain('Estimated Range:');
    expect(summary).toContain('Breakdown:');
    expect(summary).toContain('Materials:');
    expect(summary).toContain('Labor:');
    expect(summary).toContain('Contingency (10%):');
    expect(summary).toContain('HST (13%):');
    expect(summary).toContain('Deposit required:');
    expect(summary).toContain('(15%)');
    expect(summary).toContain('preliminary AI-generated estimate');
  });

  it('includes notes when area is not provided', () => {
    const estimate = calculateEstimate({
      projectType: 'kitchen',
    });

    const summary = generateEstimateSummary(estimate, 'kitchen');

    expect(summary).toContain('Notes:');
    expect(summary).toContain('Using estimated size');
  });
});

describe('validateBudgetForScope', () => {
  it('returns realistic for matching budget', () => {
    // Kitchen 100 sqft at standard = ~$20,000-$27,500
    const result = validateBudgetForScope('kitchen', 100, '25k_40k');

    expect(result.isRealistic).toBe(true);
  });

  it('returns not realistic for insufficient budget', () => {
    // Kitchen 200 sqft at standard = ~$40,000-$55,000
    const result = validateBudgetForScope('kitchen', 200, 'under_15k');

    expect(result.isRealistic).toBe(false);
    expect(result.message).toContain('typical costs range');
  });

  it('returns positive message when budget exceeds estimate', () => {
    // Flooring 100 sqft at standard = ~$1,200-$1,800
    const result = validateBudgetForScope('flooring', 100, '15k_25k');

    expect(result.isRealistic).toBe(true);
    expect(result.message).toContain('under your budget');
  });

  it('handles not_sure budget band', () => {
    const result = validateBudgetForScope('kitchen', 150, 'not_sure');

    expect(result.isRealistic).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it('handles 60k_plus budget band', () => {
    // Large kitchen should fit in 60k+ budget
    const result = validateBudgetForScope('kitchen', 250, '60k_plus');

    expect(result.isRealistic).toBe(true);
  });
});
