/**
 * Tiered Quote Schema Unit Tests
 * Tests for AI-generated Good/Better/Best quote Zod schemas
 */

import { describe, it, expect } from 'vitest';
import {
  AITierSchema,
  AITieredQuoteSchema,
  AIQuoteLineItemSchema,
} from '@/lib/schemas/ai-quote';
import type { TransparencyBreakdown } from '@/lib/schemas/transparency';
import type { AIQuoteLineItem, AITier } from '@/lib/schemas/ai-quote';

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

function makeTransparencyBreakdown(
  overrides: Partial<TransparencyBreakdown> = {},
): TransparencyBreakdown {
  return {
    roomAnalysis: 'Standard room with drywall walls',
    materialSelection: 'Mid-grade materials selected for durability',
    costBreakdown: [
      {
        label: 'Subway tile',
        quantity: 45,
        unit: 'sqft',
        unitCost: 8.5,
        total: 382.5,
        source: 'ontario_db',
      },
    ],
    markupApplied: {
      percent: 20,
      amount: 76.5,
      label: 'Labour markup',
    },
    dataSource: 'Ontario pricing database',
    totalBeforeMarkup: 382.5,
    totalAfterMarkup: 459,
    ...overrides,
  };
}

function makeLineItem(
  overrides: Partial<AIQuoteLineItem> = {},
): AIQuoteLineItem {
  return {
    description: 'R24 Insulation for exterior walls',
    category: 'materials',
    total: 1250,
    aiReasoning: 'Standard insulation for Ontario climate zone',
    confidenceScore: 0.85,
    transparencyData: makeTransparencyBreakdown(),
    ...overrides,
  };
}

function makeTier(overrides: Partial<AITier> = {}): AITier {
  return {
    label: 'Standard Finish',
    description: 'Mid-range materials and finishes suitable for most homeowners',
    finishLevel: 'standard',
    lineItems: [makeLineItem()],
    ...overrides,
  };
}

function makeTieredQuote(overrides: Record<string, unknown> = {}) {
  return {
    tiers: {
      good: makeTier({ label: 'Economy Finish', finishLevel: 'economy' }),
      better: makeTier({ label: 'Standard Finish', finishLevel: 'standard' }),
      best: makeTier({ label: 'Premium Finish', finishLevel: 'premium' }),
    },
    assumptions: ['Assumes existing plumbing is in good condition'],
    exclusions: ['Appliances not included'],
    professionalNotes: 'Recommend upgrading electrical panel before starting.',
    overallConfidence: 0.78,
    calculationSummary: 'Based on 800 sqft basement, standard Ontario rates.',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AITieredQuoteSchema', () => {
  it('accepts a valid tiered quote with good/better/best tiers', () => {
    const data = makeTieredQuote();
    const result = AITieredQuoteSchema.safeParse(data);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tiers.good.finishLevel).toBe('economy');
      expect(result.data.tiers.better.finishLevel).toBe('standard');
      expect(result.data.tiers.best.finishLevel).toBe('premium');
      expect(result.data.assumptions).toHaveLength(1);
      expect(result.data.exclusions).toHaveLength(1);
    }
  });

  it('rejects a quote missing the good tier', () => {
    const data = makeTieredQuote();
    delete (data.tiers as Record<string, unknown>).good;

    const result = AITieredQuoteSchema.safeParse(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths.some((p) => p.includes('good'))).toBe(true);
    }
  });

  it('rejects a quote missing the better tier', () => {
    const data = makeTieredQuote();
    delete (data.tiers as Record<string, unknown>).better;

    const result = AITieredQuoteSchema.safeParse(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths.some((p) => p.includes('better'))).toBe(true);
    }
  });

  it('rejects a quote missing the best tier', () => {
    const data = makeTieredQuote();
    delete (data.tiers as Record<string, unknown>).best;

    const result = AITieredQuoteSchema.safeParse(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths.some((p) => p.includes('best'))).toBe(true);
    }
  });

  it('rejects overallConfidence below 0', () => {
    const data = makeTieredQuote({ overallConfidence: -0.1 });

    const result = AITieredQuoteSchema.safeParse(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('overallConfidence');
    }
  });

  it('rejects overallConfidence above 1', () => {
    const data = makeTieredQuote({ overallConfidence: 1.5 });

    const result = AITieredQuoteSchema.safeParse(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('overallConfidence');
    }
  });

  it('accepts overallConfidence at boundary values 0 and 1', () => {
    const atZero = AITieredQuoteSchema.safeParse(
      makeTieredQuote({ overallConfidence: 0 }),
    );
    const atOne = AITieredQuoteSchema.safeParse(
      makeTieredQuote({ overallConfidence: 1 }),
    );

    expect(atZero.success).toBe(true);
    expect(atOne.success).toBe(true);
  });
});

describe('AITierSchema', () => {
  it('accepts a valid tier', () => {
    const result = AITierSchema.safeParse(makeTier());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.label).toBe('Standard Finish');
      expect(result.data.lineItems).toHaveLength(1);
    }
  });

  it('rejects a tier with empty lineItems array', () => {
    const result = AITierSchema.safeParse(makeTier({ lineItems: [] }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe('too_small');
    }
  });

  it('rejects a tier with more than 25 line items', () => {
    const items = Array.from({ length: 26 }, (_, i) =>
      makeLineItem({ description: `Line item number ${i + 1} for testing` }),
    );

    const result = AITierSchema.safeParse(makeTier({ lineItems: items }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe('too_big');
    }
  });

  it('rejects an invalid finishLevel', () => {
    const data = { ...makeTier(), finishLevel: 'luxury' };

    const result = AITierSchema.safeParse(data);

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('finishLevel');
    }
  });

  it('rejects an empty label', () => {
    const result = AITierSchema.safeParse(makeTier({ label: '' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('label');
    }
  });

  it('rejects an empty description', () => {
    const result = AITierSchema.safeParse(makeTier({ description: '' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('description');
    }
  });
});

describe('AIQuoteLineItemSchema', () => {
  it('accepts a valid line item', () => {
    const result = AIQuoteLineItemSchema.safeParse(makeLineItem());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe('materials');
      expect(result.data.total).toBe(1250);
    }
  });

  it('rejects a description shorter than 5 characters', () => {
    const result = AIQuoteLineItemSchema.safeParse(
      makeLineItem({ description: 'Tile' }),
    );

    expect(result.success).toBe(false);
  });

  it('rejects a non-positive total', () => {
    const zero = AIQuoteLineItemSchema.safeParse(makeLineItem({ total: 0 }));
    const negative = AIQuoteLineItemSchema.safeParse(
      makeLineItem({ total: -100 }),
    );

    expect(zero.success).toBe(false);
    expect(negative.success).toBe(false);
  });

  it('rejects confidenceScore outside 0-1 range', () => {
    const above = AIQuoteLineItemSchema.safeParse(
      makeLineItem({ confidenceScore: 1.01 }),
    );
    const below = AIQuoteLineItemSchema.safeParse(
      makeLineItem({ confidenceScore: -0.01 }),
    );

    expect(above.success).toBe(false);
    expect(below.success).toBe(false);
  });
});
