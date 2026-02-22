/**
 * T-15: Pricing Calculations
 * Comprehensive unit tests for the pricing engine
 */

import { describe, it, expect } from 'vitest';
import {
  calculateEstimate,
  formatEstimateRange,
  validateBudgetForScope,
  type EstimateInput,
} from '@/lib/pricing/engine';
import {
  PRICING_GUIDELINES,
  DEFAULT_SIZES,
  BUSINESS_CONSTANTS,
  MATERIAL_SPLIT,
  type ProjectType,
  type FinishLevel,
} from '@/lib/pricing/constants';

// ─── 1. All Project Types × Finish Levels (12 tests) ───────────────────────

const projectTypes: ProjectType[] = ['kitchen', 'bathroom', 'basement', 'flooring'];
const finishLevels: FinishLevel[] = ['economy', 'standard', 'premium'];

describe('T-15: Pricing Calculations', () => {
  describe('1. All Project Types × Finish Levels', () => {
    for (const projectType of projectTypes) {
      for (const finishLevel of finishLevels) {
        it(`${projectType} × ${finishLevel}: valid result with low < midpoint < high, correct perSqft`, () => {
          const result = calculateEstimate({
            projectType,
            areaSqft: DEFAULT_SIZES[projectType],
            finishLevel,
          });

          // Returns a valid result
          expect(result).toBeDefined();
          expect(result.low).toBeGreaterThan(0);
          expect(result.high).toBeGreaterThan(0);
          expect(result.midpoint).toBeGreaterThan(0);

          // low < midpoint < high
          expect(result.low).toBeLessThan(result.midpoint);
          expect(result.high).toBeGreaterThan(result.midpoint);

          // perSqft matches constants
          const pricing = PRICING_GUIDELINES[projectType][finishLevel];
          expect(result.perSqft.low).toBe(pricing.min);
          expect(result.perSqft.high).toBe(pricing.max);
        });
      }
    }
  });

  // ─── 2. Default Size Fallbacks (4 tests) ──────────────────────────────────

  describe('2. Default Size Fallbacks', () => {
    it('kitchen defaults to 150 sqft', () => {
      const result = calculateEstimate({ projectType: 'kitchen' });
      expect(result.notes).toContain('Using estimated size of 150 sqft');

      // Verify calculation uses 150 sqft
      const baseLow = PRICING_GUIDELINES.kitchen.standard.min * 150;
      const expected = Math.round(baseLow * (1 - BUSINESS_CONSTANTS.varianceRate));
      expect(result.low).toBe(expected);
    });

    it('bathroom defaults to 50 sqft', () => {
      const result = calculateEstimate({ projectType: 'bathroom' });
      expect(result.notes).toContain('Using estimated size of 50 sqft');

      const baseLow = PRICING_GUIDELINES.bathroom.standard.min * 50;
      const expected = Math.round(baseLow * (1 - BUSINESS_CONSTANTS.varianceRate));
      expect(result.low).toBe(expected);
    });

    it('basement defaults to 800 sqft', () => {
      const result = calculateEstimate({ projectType: 'basement' });
      expect(result.notes).toContain('Using estimated size of 800 sqft');

      const baseLow = PRICING_GUIDELINES.basement.standard.min * 800;
      const expected = Math.round(baseLow * (1 - BUSINESS_CONSTANTS.varianceRate));
      expect(result.low).toBe(expected);
    });

    it('flooring defaults to 200 sqft', () => {
      const result = calculateEstimate({ projectType: 'flooring' });
      expect(result.notes).toContain('Using estimated size of 200 sqft');

      const baseLow = PRICING_GUIDELINES.flooring.standard.min * 200;
      const expected = Math.round(baseLow * (1 - BUSINESS_CONSTANTS.varianceRate));
      expect(result.low).toBe(expected);
    });
  });

  // ─── 3. Breakdown Math (6 tests) ──────────────────────────────────────────

  describe('3. Breakdown Math', () => {
    const breakdownResult = calculateEstimate({
      projectType: 'kitchen',
      areaSqft: 150,
      finishLevel: 'standard',
    });

    it('materials + labor === subtotal', () => {
      expect(breakdownResult.breakdown.subtotal).toBe(
        breakdownResult.breakdown.materials + breakdownResult.breakdown.labor
      );
    });

    it('contingency === subtotal × 0.10', () => {
      expect(breakdownResult.breakdown.contingency).toBe(
        Math.round(breakdownResult.breakdown.subtotal * BUSINESS_CONSTANTS.contingencyRate)
      );
    });

    it('hst === (subtotal + contingency) × 0.13', () => {
      expect(breakdownResult.breakdown.hst).toBe(
        Math.round(
          (breakdownResult.breakdown.subtotal + breakdownResult.breakdown.contingency) *
            BUSINESS_CONSTANTS.hstRate
        )
      );
    });

    it('total === subtotal + contingency + hst', () => {
      expect(breakdownResult.breakdown.total).toBe(
        breakdownResult.breakdown.subtotal +
          breakdownResult.breakdown.contingency +
          breakdownResult.breakdown.hst
      );
    });

    it('depositRequired === total × 0.50', () => {
      expect(breakdownResult.depositRequired).toBe(
        Math.round(breakdownResult.breakdown.total * BUSINESS_CONSTANTS.depositRate)
      );
    });

    it('material split matches per-type constant', () => {
      // For kitchen, material split is 0.55
      // materials / subtotal should equal MATERIAL_SPLIT.kitchen
      const materialRatio =
        breakdownResult.breakdown.materials / breakdownResult.breakdown.subtotal;
      // Allow rounding tolerance (Math.round applied to both)
      expect(materialRatio).toBeCloseTo(MATERIAL_SPLIT.kitchen, 1);
    });
  });

  // ─── 4. Variance (3 tests) ────────────────────────────────────────────────

  describe('4. Variance', () => {
    it('low === baseLow × 0.85 (−15%)', () => {
      const input: EstimateInput = {
        projectType: 'bathroom',
        areaSqft: 75,
        finishLevel: 'standard',
      };
      const result = calculateEstimate(input);

      const baseLow =
        PRICING_GUIDELINES.bathroom.standard.min * 75;
      expect(result.low).toBe(Math.round(baseLow * (1 - BUSINESS_CONSTANTS.varianceRate)));
    });

    it('high === baseHigh × 1.15 (+15%)', () => {
      const input: EstimateInput = {
        projectType: 'bathroom',
        areaSqft: 75,
        finishLevel: 'standard',
      };
      const result = calculateEstimate(input);

      const baseHigh =
        PRICING_GUIDELINES.bathroom.standard.max * 75;
      expect(result.high).toBe(Math.round(baseHigh * (1 + BUSINESS_CONSTANTS.varianceRate)));
    });

    it('variance is symmetric (same rate applied both directions)', () => {
      const input: EstimateInput = {
        projectType: 'basement',
        areaSqft: 500,
        finishLevel: 'premium',
      };
      const result = calculateEstimate(input);

      const baseLow = PRICING_GUIDELINES.basement.premium.min * 500;
      const baseHigh = PRICING_GUIDELINES.basement.premium.max * 500;
      const midBase = (baseLow + baseHigh) / 2;

      // Both low and high deviate by the same variance rate from their respective bases
      const lowDeviation = 1 - result.low / baseLow;
      const highDeviation = result.high / baseHigh - 1;
      expect(lowDeviation).toBeCloseTo(highDeviation, 5);
    });
  });

  // ─── 5. Edge Cases (8 tests) ──────────────────────────────────────────────

  describe('5. Edge Cases', () => {
    it('areaSqft = 0 → uses default size', () => {
      const result = calculateEstimate({
        projectType: 'kitchen',
        areaSqft: 0,
        finishLevel: 'standard',
      });
      // 0 is falsy, so it falls through to default
      expect(result.notes).toContain('Using estimated size of 150 sqft');
    });

    it('areaSqft = 1 → minimal valid estimate', () => {
      const result = calculateEstimate({
        projectType: 'flooring',
        areaSqft: 1,
        finishLevel: 'economy',
      });
      expect(result.low).toBeGreaterThan(0);
      expect(result.high).toBeGreaterThan(0);
      expect(result.midpoint).toBeGreaterThan(0);
    });

    it('areaSqft = 10000 → large but valid', () => {
      const result = calculateEstimate({
        projectType: 'flooring',
        areaSqft: 10000,
        finishLevel: 'standard',
      });
      expect(result.low).toBeGreaterThan(0);
      expect(result.high).toBeGreaterThan(result.low);
      // Should be a large number
      expect(result.midpoint).toBeGreaterThan(100000);
    });

    it('very small area (5 sqft) → result > 0', () => {
      const result = calculateEstimate({
        projectType: 'bathroom',
        areaSqft: 5,
        finishLevel: 'standard',
      });
      expect(result.low).toBeGreaterThan(0);
      expect(result.breakdown.total).toBeGreaterThan(0);
      expect(result.depositRequired).toBeGreaterThan(0);
    });

    it('negative area → treated as provided (engine uses raw value)', () => {
      // The engine does not validate negative values; areaSqft is truthy so it's used
      const result = calculateEstimate({
        projectType: 'kitchen',
        areaSqft: -100,
        finishLevel: 'standard',
      });
      // Negative area produces negative estimates (no guard in engine)
      expect(result.low).toBeLessThan(0);
      expect(result.confidence).toBe(0.7); // area IS provided (truthy)
    });

    it('missing finishLevel → defaults to standard', () => {
      const withDefault = calculateEstimate({
        projectType: 'kitchen',
        areaSqft: 150,
      });
      const withExplicit = calculateEstimate({
        projectType: 'kitchen',
        areaSqft: 150,
        finishLevel: 'standard',
      });

      expect(withDefault.low).toBe(withExplicit.low);
      expect(withDefault.high).toBe(withExplicit.high);
      expect(withDefault.midpoint).toBe(withExplicit.midpoint);
    });

    it('unknown project type → throws error', () => {
      expect(() =>
        calculateEstimate({ projectType: 'swimming_pool' as any })
      ).toThrow('Unknown project type: swimming_pool');
    });

    it('float precision: all monetary values are whole numbers (Math.round)', () => {
      for (const projectType of projectTypes) {
        for (const finishLevel of finishLevels) {
          const result = calculateEstimate({
            projectType,
            areaSqft: 137, // odd number to stress rounding
            finishLevel,
          });

          expect(Number.isInteger(result.low)).toBe(true);
          expect(Number.isInteger(result.high)).toBe(true);
          expect(Number.isInteger(result.midpoint)).toBe(true);
          expect(Number.isInteger(result.breakdown.materials)).toBe(true);
          expect(Number.isInteger(result.breakdown.labor)).toBe(true);
          expect(Number.isInteger(result.breakdown.subtotal)).toBe(true);
          expect(Number.isInteger(result.breakdown.contingency)).toBe(true);
          expect(Number.isInteger(result.breakdown.hst)).toBe(true);
          expect(Number.isInteger(result.breakdown.total)).toBe(true);
          expect(Number.isInteger(result.depositRequired)).toBe(true);
        }
      }
    });
  });

  // ─── 6. Confidence Score (3 tests) ────────────────────────────────────────

  describe('6. Confidence Score', () => {
    it('no area provided → confidence 0.5', () => {
      const result = calculateEstimate({
        projectType: 'kitchen',
        finishLevel: 'standard',
      });
      expect(result.confidence).toBe(0.5);
    });

    it('area provided with standard finish → confidence 0.7', () => {
      const result = calculateEstimate({
        projectType: 'kitchen',
        areaSqft: 150,
        finishLevel: 'standard',
      });
      expect(result.confidence).toBe(0.7);
    });

    it('area + non-standard finish → confidence 0.8', () => {
      const resultPremium = calculateEstimate({
        projectType: 'kitchen',
        areaSqft: 150,
        finishLevel: 'premium',
      });
      expect(resultPremium.confidence).toBeCloseTo(0.8, 10);

      const resultEconomy = calculateEstimate({
        projectType: 'bathroom',
        areaSqft: 50,
        finishLevel: 'economy',
      });
      expect(resultEconomy.confidence).toBeCloseTo(0.8, 10);
    });
  });

  // ─── 7. Budget Validation (4 tests) ───────────────────────────────────────

  describe('7. Budget Validation', () => {
    it('matching budget → isRealistic: true', () => {
      // Kitchen 100 sqft standard ≈ $20k-$28k → 25k_40k should be realistic
      const result = validateBudgetForScope('kitchen', 100, '25k_40k');
      expect(result.isRealistic).toBe(true);
    });

    it('too-low budget → isRealistic: false with message', () => {
      // Kitchen 200 sqft standard ≈ $40k-$55k → under_15k is too low
      const result = validateBudgetForScope('kitchen', 200, 'under_15k');
      expect(result.isRealistic).toBe(false);
      expect(result.message).toBeDefined();
      expect(result.message).toContain('typical costs range');
    });

    it('budget exceeds estimate → positive message', () => {
      // Flooring 100 sqft standard ≈ $1.2k-$1.8k → 15k_25k is way over
      const result = validateBudgetForScope('flooring', 100, '15k_25k');
      expect(result.isRealistic).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message).toContain('under your budget');
    });

    it('"not_sure" → always realistic with no message', () => {
      const result = validateBudgetForScope('kitchen', 150, 'not_sure');
      expect(result.isRealistic).toBe(true);
      expect(result.message).toBeUndefined();
    });
  });

  // ─── 8. formatEstimateRange (bonus) ───────────────────────────────────────

  describe('8. Format Estimate Range', () => {
    it('formats as CAD currency range with en-dash', () => {
      const result = calculateEstimate({
        projectType: 'kitchen',
        areaSqft: 150,
        finishLevel: 'standard',
      });
      const formatted = formatEstimateRange(result);

      expect(formatted).toMatch(/^\$[\d,]+ – \$[\d,]+$/);
    });
  });
});
