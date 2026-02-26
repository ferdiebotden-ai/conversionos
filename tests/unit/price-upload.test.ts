import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Replicate the CSV row validation schema from the API route
const VALID_CATEGORIES = [
  'materials', 'labor', 'contract', 'permit', 'equipment', 'allowances', 'other',
] as const;

const CsvRowSchema = z.object({
  item_name: z.string().min(1, 'Item name is required').max(200),
  category: z.enum(VALID_CATEGORIES, { message: 'Invalid category' }),
  unit: z.string().min(1).max(20).default('ea'),
  unit_price: z.coerce.number().positive('Unit price must be positive'),
  supplier: z.string().max(200).optional().nullable(),
});

describe('CSV Row Validation', () => {
  it('validates a complete valid row', () => {
    const result = CsvRowSchema.safeParse({
      item_name: 'Stock cabinets',
      category: 'materials',
      unit: 'lin ft',
      unit_price: '220',
      supplier: 'Home Hardware',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unit_price).toBe(220);
      expect(result.data.supplier).toBe('Home Hardware');
    }
  });

  it('validates a row with minimal fields', () => {
    const result = CsvRowSchema.safeParse({
      item_name: 'Plumber',
      category: 'labor',
      unit_price: '95',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unit).toBe('ea'); // default
      expect(result.data.supplier).toBeUndefined();
    }
  });

  it('rejects missing item_name', () => {
    const result = CsvRowSchema.safeParse({
      category: 'materials',
      unit_price: '100',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty item_name', () => {
    const result = CsvRowSchema.safeParse({
      item_name: '',
      category: 'materials',
      unit_price: '100',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category', () => {
    const result = CsvRowSchema.safeParse({
      item_name: 'Widget',
      category: 'invalid_category',
      unit_price: '100',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative unit_price', () => {
    const result = CsvRowSchema.safeParse({
      item_name: 'Cabinets',
      category: 'materials',
      unit_price: '-50',
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero unit_price', () => {
    const result = CsvRowSchema.safeParse({
      item_name: 'Cabinets',
      category: 'materials',
      unit_price: '0',
    });
    expect(result.success).toBe(false);
  });

  it('coerces string unit_price to number', () => {
    const result = CsvRowSchema.safeParse({
      item_name: 'Tile',
      category: 'materials',
      unit_price: '12.50',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unit_price).toBe(12.5);
    }
  });

  it('accepts null supplier', () => {
    const result = CsvRowSchema.safeParse({
      item_name: 'Drywall',
      category: 'materials',
      unit_price: '18',
      supplier: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts all valid categories', () => {
    for (const cat of VALID_CATEGORIES) {
      const result = CsvRowSchema.safeParse({
        item_name: `Test ${cat}`,
        category: cat,
        unit_price: '100',
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects item_name exceeding 200 characters', () => {
    const result = CsvRowSchema.safeParse({
      item_name: 'A'.repeat(201),
      category: 'materials',
      unit_price: '100',
    });
    expect(result.success).toBe(false);
  });
});

describe('CSV Bulk Validation', () => {
  function validateCsvRows(rows: Record<string, string>[]) {
    const valid: z.infer<typeof CsvRowSchema>[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const result = CsvRowSchema.safeParse(rows[i]);
      if (result.success) {
        valid.push(result.data);
      } else {
        const messages = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
        errors.push({ row: i + 2, message: messages.join('; ') });
      }
    }

    return { valid, errors };
  }

  it('handles mixed valid/invalid rows', () => {
    const rows = [
      { item_name: 'Cabinets', category: 'materials', unit_price: '220' },
      { item_name: '', category: 'materials', unit_price: '100' }, // invalid
      { item_name: 'Tile', category: 'materials', unit_price: '12' },
      { item_name: 'Widget', category: 'bogus', unit_price: '50' }, // invalid
    ];

    const { valid, errors } = validateCsvRows(rows);
    expect(valid).toHaveLength(2);
    expect(errors).toHaveLength(2);
    expect(errors[0].row).toBe(3); // row 3 (header is row 1, data starts at 2)
    expect(errors[1].row).toBe(5);
  });

  it('handles all valid rows', () => {
    const rows = [
      { item_name: 'A', category: 'materials', unit_price: '10' },
      { item_name: 'B', category: 'labor', unit_price: '20' },
    ];
    const { valid, errors } = validateCsvRows(rows);
    expect(valid).toHaveLength(2);
    expect(errors).toHaveLength(0);
  });

  it('handles all invalid rows', () => {
    const rows = [
      { item_name: '', category: 'materials', unit_price: '10' },
      { item_name: 'B', category: 'invalid', unit_price: '-5' },
    ];
    const { valid, errors } = validateCsvRows(rows);
    expect(valid).toHaveLength(0);
    expect(errors).toHaveLength(2);
  });

  it('handles empty array', () => {
    const { valid, errors } = validateCsvRows([]);
    expect(valid).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });
});

describe('Price Indicator Count', () => {
  // Import countPriceMatches from fuzzy-match
  it('correctly counts matches for indicator badge', async () => {
    const { countPriceMatches } = await import('@/lib/pricing/fuzzy-match');

    const contractorPrices = [
      { item_name: 'Stock cabinets', unit_price: 220, unit: 'lin ft' },
      { item_name: 'Quartz countertop', unit_price: 85, unit: 'sqft' },
      { item_name: 'LVP flooring', unit_price: 7.5, unit: 'sqft' },
    ];

    const lineItems = [
      'Stock cabinets (12 lin ft)', // won't match — too different
      'Quartz countertop', // exact match
      'Custom tile backsplash', // no match
      'LVP flooring', // exact match
    ];

    const count = countPriceMatches(lineItems, contractorPrices);
    expect(count).toBe(2); // countertop + flooring
  });
});
