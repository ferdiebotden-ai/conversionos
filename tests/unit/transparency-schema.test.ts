/**
 * Transparency Breakdown Schema Unit Tests
 * Tests for Zod schemas validating "show the math" line item data
 */

import { describe, it, expect } from 'vitest';
import {
  CostSourceSchema,
  CostLineSchema,
  MarkupAppliedSchema,
  TransparencyBreakdownSchema,
  type CostLine,
  type MarkupApplied,
  type TransparencyBreakdown,
} from '@/lib/schemas/transparency';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function validCostLine(overrides: Partial<CostLine> = {}): CostLine {
  return {
    label: 'Subway tile',
    quantity: 45,
    unit: 'sqft',
    unitCost: 8.5,
    total: 382.5,
    source: 'ontario_db',
    ...overrides,
  };
}

function validMarkup(overrides: Partial<MarkupApplied> = {}): MarkupApplied {
  return {
    percent: 30,
    amount: 114.75,
    label: 'Labour markup',
    ...overrides,
  };
}

function validBreakdown(
  overrides: Partial<TransparencyBreakdown> = {}
): TransparencyBreakdown {
  return {
    roomAnalysis: 'L-shaped kitchen with island, approx 150 sqft',
    materialSelection: 'Standard mid-range finishes suitable for rental property',
    costBreakdown: [validCostLine()],
    markupApplied: validMarkup(),
    dataSource: 'Ontario Contractor Pricing Database 2026',
    totalBeforeMarkup: 382.5,
    totalAfterMarkup: 497.25,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// CostSourceSchema
// ---------------------------------------------------------------------------

describe('CostSourceSchema', () => {
  it('accepts all valid source values', () => {
    expect(CostSourceSchema.parse('ontario_db')).toBe('ontario_db');
    expect(CostSourceSchema.parse('contractor_uploaded')).toBe(
      'contractor_uploaded'
    );
    expect(CostSourceSchema.parse('ai_estimate')).toBe('ai_estimate');
  });

  it('rejects invalid source values', () => {
    expect(() => CostSourceSchema.parse('manual_entry')).toThrow();
    expect(() => CostSourceSchema.parse('')).toThrow();
    expect(() => CostSourceSchema.parse(123)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// CostLineSchema
// ---------------------------------------------------------------------------

describe('CostLineSchema', () => {
  it('accepts a valid cost line', () => {
    const line = validCostLine();
    const result = CostLineSchema.parse(line);

    expect(result.label).toBe('Subway tile');
    expect(result.quantity).toBe(45);
    expect(result.unit).toBe('sqft');
    expect(result.unitCost).toBe(8.5);
    expect(result.total).toBe(382.5);
    expect(result.source).toBe('ontario_db');
  });

  it('rejects empty label (min length 1)', () => {
    expect(() => CostLineSchema.parse(validCostLine({ label: '' }))).toThrow();
  });

  it('rejects label exceeding max length (100)', () => {
    const longLabel = 'x'.repeat(101);
    expect(() =>
      CostLineSchema.parse(validCostLine({ label: longLabel }))
    ).toThrow();
  });

  it('accepts label at exactly max length (100)', () => {
    const maxLabel = 'x'.repeat(100);
    const result = CostLineSchema.parse(validCostLine({ label: maxLabel }));
    expect(result.label).toBe(maxLabel);
  });

  it('rejects negative quantity', () => {
    expect(() =>
      CostLineSchema.parse(validCostLine({ quantity: -1 }))
    ).toThrow();
  });

  it('accepts zero quantity (nonnegative)', () => {
    const result = CostLineSchema.parse(validCostLine({ quantity: 0 }));
    expect(result.quantity).toBe(0);
  });

  it('rejects negative unitCost', () => {
    expect(() =>
      CostLineSchema.parse(validCostLine({ unitCost: -5 }))
    ).toThrow();
  });

  it('rejects negative total', () => {
    expect(() =>
      CostLineSchema.parse(validCostLine({ total: -100 }))
    ).toThrow();
  });

  it('rejects empty unit string (min length 1)', () => {
    expect(() => CostLineSchema.parse(validCostLine({ unit: '' }))).toThrow();
  });

  it('rejects unit exceeding max length (20)', () => {
    expect(() =>
      CostLineSchema.parse(validCostLine({ unit: 'x'.repeat(21) }))
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => CostLineSchema.parse({})).toThrow();
    expect(() =>
      CostLineSchema.parse({ label: 'Tile', quantity: 10 })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// MarkupAppliedSchema
// ---------------------------------------------------------------------------

describe('MarkupAppliedSchema', () => {
  it('accepts valid markup data', () => {
    const result = MarkupAppliedSchema.parse(validMarkup());

    expect(result.percent).toBe(30);
    expect(result.amount).toBe(114.75);
    expect(result.label).toBe('Labour markup');
  });

  it('accepts zero percent markup', () => {
    const result = MarkupAppliedSchema.parse(validMarkup({ percent: 0 }));
    expect(result.percent).toBe(0);
  });

  it('accepts 100 percent markup', () => {
    const result = MarkupAppliedSchema.parse(validMarkup({ percent: 100 }));
    expect(result.percent).toBe(100);
  });

  it('rejects percent above 100', () => {
    expect(() =>
      MarkupAppliedSchema.parse(validMarkup({ percent: 101 }))
    ).toThrow();
  });

  it('rejects negative percent', () => {
    expect(() =>
      MarkupAppliedSchema.parse(validMarkup({ percent: -1 }))
    ).toThrow();
  });

  it('rejects negative amount', () => {
    expect(() =>
      MarkupAppliedSchema.parse(validMarkup({ amount: -50 }))
    ).toThrow();
  });

  it('rejects label exceeding max length (100)', () => {
    expect(() =>
      MarkupAppliedSchema.parse(validMarkup({ label: 'x'.repeat(101) }))
    ).toThrow();
  });

  it('accepts empty label (no min constraint)', () => {
    const result = MarkupAppliedSchema.parse(validMarkup({ label: '' }));
    expect(result.label).toBe('');
  });
});

// ---------------------------------------------------------------------------
// TransparencyBreakdownSchema
// ---------------------------------------------------------------------------

describe('TransparencyBreakdownSchema', () => {
  it('accepts a fully valid transparency breakdown', () => {
    const data = validBreakdown();
    const result = TransparencyBreakdownSchema.parse(data);

    expect(result.roomAnalysis).toBe(data.roomAnalysis);
    expect(result.materialSelection).toBe(data.materialSelection);
    expect(result.costBreakdown).toHaveLength(1);
    expect(result.markupApplied.percent).toBe(30);
    expect(result.dataSource).toBe(data.dataSource);
    expect(result.totalBeforeMarkup).toBe(382.5);
    expect(result.totalAfterMarkup).toBe(497.25);
  });

  it('rejects empty roomAnalysis (min length 1)', () => {
    expect(() =>
      TransparencyBreakdownSchema.parse(validBreakdown({ roomAnalysis: '' }))
    ).toThrow();
  });

  it('rejects roomAnalysis exceeding max length (500)', () => {
    expect(() =>
      TransparencyBreakdownSchema.parse(
        validBreakdown({ roomAnalysis: 'x'.repeat(501) })
      )
    ).toThrow();
  });

  it('rejects empty materialSelection (min length 1)', () => {
    expect(() =>
      TransparencyBreakdownSchema.parse(
        validBreakdown({ materialSelection: '' })
      )
    ).toThrow();
  });

  it('rejects materialSelection exceeding max length (500)', () => {
    expect(() =>
      TransparencyBreakdownSchema.parse(
        validBreakdown({ materialSelection: 'x'.repeat(501) })
      )
    ).toThrow();
  });

  it('rejects empty costBreakdown array (min 1 item)', () => {
    expect(() =>
      TransparencyBreakdownSchema.parse(validBreakdown({ costBreakdown: [] }))
    ).toThrow();
  });

  it('accepts costBreakdown with exactly 10 items (max)', () => {
    const tenLines = Array.from({ length: 10 }, (_, i) =>
      validCostLine({ label: `Item ${i + 1}` })
    );
    const result = TransparencyBreakdownSchema.parse(
      validBreakdown({ costBreakdown: tenLines })
    );
    expect(result.costBreakdown).toHaveLength(10);
  });

  it('rejects costBreakdown with more than 10 items', () => {
    const elevenLines = Array.from({ length: 11 }, (_, i) =>
      validCostLine({ label: `Item ${i + 1}` })
    );
    expect(() =>
      TransparencyBreakdownSchema.parse(
        validBreakdown({ costBreakdown: elevenLines })
      )
    ).toThrow();
  });

  it('rejects empty dataSource (min length 1)', () => {
    expect(() =>
      TransparencyBreakdownSchema.parse(validBreakdown({ dataSource: '' }))
    ).toThrow();
  });

  it('rejects dataSource exceeding max length (100)', () => {
    expect(() =>
      TransparencyBreakdownSchema.parse(
        validBreakdown({ dataSource: 'x'.repeat(101) })
      )
    ).toThrow();
  });

  it('rejects negative totalBeforeMarkup', () => {
    expect(() =>
      TransparencyBreakdownSchema.parse(
        validBreakdown({ totalBeforeMarkup: -1 })
      )
    ).toThrow();
  });

  it('rejects negative totalAfterMarkup', () => {
    expect(() =>
      TransparencyBreakdownSchema.parse(
        validBreakdown({ totalAfterMarkup: -1 })
      )
    ).toThrow();
  });

  it('rejects when required top-level fields are missing', () => {
    expect(() => TransparencyBreakdownSchema.parse({})).toThrow();
    expect(() =>
      TransparencyBreakdownSchema.parse({
        roomAnalysis: 'some analysis',
      })
    ).toThrow();
  });

  it('propagates nested CostLine validation errors', () => {
    const badLine = { ...validCostLine(), source: 'invalid_source' };
    expect(() =>
      TransparencyBreakdownSchema.parse(
        validBreakdown({ costBreakdown: [badLine as unknown as ReturnType<typeof validCostLine>] })
      )
    ).toThrow();
  });
});
