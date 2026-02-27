/**
 * Tests for CSV/Template polish items:
 * V7 — CSV row validation
 * V8 — Template field validation
 * F11 — CSV export generation
 * F14 — Template search/filter logic (pure logic tests)
 * E4 — Upload error categorisation
 */

import { describe, it, expect } from 'vitest';
import { validateCsvRow, generatePricesCsv, categorizeUploadErrors } from '@/components/admin/price-upload';
import { validateTemplateItem } from '@/components/admin/template-manager';
import type { ContractorPrice, AssemblyTemplateItem } from '@/types/database';

// ---------------------------------------------------------------------------
// V7: CSV Row Validation
// ---------------------------------------------------------------------------
describe('V7: validateCsvRow', () => {
  it('returns no warnings for a valid row', () => {
    const warnings = validateCsvRow({
      item_name: 'Quartz countertop',
      category: 'materials',
      unit: 'sqft',
      unit_price: '85',
    });
    expect(warnings).toEqual([]);
  });

  it('warns when item_name is empty', () => {
    const warnings = validateCsvRow({
      item_name: '',
      category: 'materials',
      unit: 'ea',
      unit_price: '10',
    });
    expect(warnings).toContainEqual(expect.stringContaining('Item name is empty'));
  });

  it('warns when item_name is whitespace only', () => {
    const warnings = validateCsvRow({
      item_name: '   ',
      category: 'materials',
      unit: 'ea',
      unit_price: '10',
    });
    expect(warnings).toContainEqual(expect.stringContaining('Item name is empty'));
  });

  it('warns when unit_price is 0', () => {
    const warnings = validateCsvRow({
      item_name: 'Test',
      category: 'materials',
      unit: 'ea',
      unit_price: '0',
    });
    expect(warnings).toContainEqual(expect.stringContaining('Invalid price'));
  });

  it('warns when unit_price is negative', () => {
    const warnings = validateCsvRow({
      item_name: 'Test',
      category: 'materials',
      unit: 'ea',
      unit_price: '-5',
    });
    expect(warnings).toContainEqual(expect.stringContaining('Invalid price'));
  });

  it('warns when unit_price is not numeric', () => {
    const warnings = validateCsvRow({
      item_name: 'Test',
      category: 'materials',
      unit: 'ea',
      unit_price: 'abc',
    });
    expect(warnings).toContainEqual(expect.stringContaining('Invalid price'));
  });

  it('warns when category is invalid', () => {
    const warnings = validateCsvRow({
      item_name: 'Test',
      category: 'widgets',
      unit: 'ea',
      unit_price: '10',
    });
    expect(warnings).toContainEqual(expect.stringContaining("Invalid category 'widgets'"));
  });

  it('accepts all valid categories', () => {
    const validCategories = ['materials', 'labor', 'contract', 'permit', 'equipment', 'allowances', 'other'];
    for (const cat of validCategories) {
      const warnings = validateCsvRow({
        item_name: 'Test',
        category: cat,
        unit: 'ea',
        unit_price: '10',
      });
      expect(warnings).toEqual([]);
    }
  });

  it('returns multiple warnings for multiple issues', () => {
    const warnings = validateCsvRow({
      item_name: '',
      category: 'invalid',
      unit: 'ea',
      unit_price: '-1',
    });
    expect(warnings.length).toBe(3);
  });

  it('accepts row with empty category (no category warning for empty)', () => {
    const warnings = validateCsvRow({
      item_name: 'Test',
      category: '',
      unit: 'ea',
      unit_price: '10',
    });
    // Empty category is allowed (will be assigned by server)
    expect(warnings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// V8: Template Field Validation
// ---------------------------------------------------------------------------
describe('V8: validateTemplateItem', () => {
  const validItem: AssemblyTemplateItem = {
    description: 'Drywall sheet',
    category: 'materials',
    quantity: 5,
    unit: 'ea',
    unit_price: 18,
  };

  it('returns null for a valid item', () => {
    expect(validateTemplateItem(validItem)).toBeNull();
  });

  it('returns error for empty description', () => {
    const result = validateTemplateItem({ ...validItem, description: '' });
    expect(result).not.toBeNull();
    expect(result!.description).toBe('Description is required');
  });

  it('returns error for whitespace-only description', () => {
    const result = validateTemplateItem({ ...validItem, description: '   ' });
    expect(result).not.toBeNull();
    expect(result!.description).toBe('Description is required');
  });

  it('returns error for quantity <= 0', () => {
    const result = validateTemplateItem({ ...validItem, quantity: 0 });
    expect(result).not.toBeNull();
    expect(result!.quantity).toBe('Must be > 0');
  });

  it('returns error for negative quantity', () => {
    const result = validateTemplateItem({ ...validItem, quantity: -3 });
    expect(result).not.toBeNull();
    expect(result!.quantity).toBe('Must be > 0');
  });

  it('returns error for negative unit_price', () => {
    const result = validateTemplateItem({ ...validItem, unit_price: -1 });
    expect(result).not.toBeNull();
    expect(result!.unit_price).toBe('Must be >= 0');
  });

  it('allows unit_price of 0', () => {
    const result = validateTemplateItem({ ...validItem, unit_price: 0 });
    expect(result).toBeNull();
  });

  it('returns multiple errors for multiple issues', () => {
    const result = validateTemplateItem({
      description: '',
      category: 'materials',
      quantity: -1,
      unit: 'ea',
      unit_price: -5,
    });
    expect(result).not.toBeNull();
    expect(result!.description).toBeDefined();
    expect(result!.quantity).toBeDefined();
    expect(result!.unit_price).toBeDefined();
  });

  it('allows fractional quantity > 0', () => {
    const result = validateTemplateItem({ ...validItem, quantity: 0.5 });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// F11: CSV Export Generation
// ---------------------------------------------------------------------------
describe('F11: generatePricesCsv', () => {
  const mockPrices: ContractorPrice[] = [
    {
      id: '1',
      site_id: 'demo',
      item_name: 'Quartz countertop',
      category: 'materials',
      unit: 'sqft',
      unit_price: 85,
      supplier: 'Caesarstone',
      uploaded_at: '2026-02-27',
      created_at: '2026-02-27',
    },
    {
      id: '2',
      site_id: 'demo',
      item_name: 'Plumber (licensed)',
      category: 'labor',
      unit: 'hr',
      unit_price: 95,
      supplier: null,
      uploaded_at: '2026-02-27',
      created_at: '2026-02-27',
    },
  ];

  it('produces correct CSV with header', () => {
    const csv = generatePricesCsv(mockPrices);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('item_name,category,unit,unit_price,supplier');
  });

  it('includes all rows', () => {
    const csv = generatePricesCsv(mockPrices);
    const lines = csv.split('\n');
    expect(lines.length).toBe(3); // header + 2 rows
  });

  it('formats prices with 2 decimal places', () => {
    const csv = generatePricesCsv(mockPrices);
    expect(csv).toContain('85.00');
    expect(csv).toContain('95.00');
  });

  it('handles null supplier as empty string', () => {
    const csv = generatePricesCsv(mockPrices);
    const lines = csv.split('\n');
    // Second data row has null supplier
    expect(lines[2]).toMatch(/,$/); // ends with comma (empty supplier)
  });

  it('quotes item names containing commas', () => {
    const prices: ContractorPrice[] = [{
      id: '3',
      site_id: 'demo',
      item_name: 'Cabinets, standard',
      category: 'materials',
      unit: 'lin ft',
      unit_price: 220,
      supplier: null,
      uploaded_at: '2026-02-27',
      created_at: '2026-02-27',
    }];
    const csv = generatePricesCsv(prices);
    expect(csv).toContain('"Cabinets, standard"');
  });

  it('returns header only for empty array', () => {
    const csv = generatePricesCsv([]);
    expect(csv).toBe('item_name,category,unit,unit_price,supplier');
  });

  it('quotes supplier names containing commas', () => {
    const prices: ContractorPrice[] = [{
      id: '4',
      site_id: 'demo',
      item_name: 'Tile',
      category: 'materials',
      unit: 'sqft',
      unit_price: 12,
      supplier: 'Smith, Jones Inc.',
      uploaded_at: '2026-02-27',
      created_at: '2026-02-27',
    }];
    const csv = generatePricesCsv(prices);
    expect(csv).toContain('"Smith, Jones Inc."');
  });
});

// ---------------------------------------------------------------------------
// F14: Template Search + Category Filter (pure logic)
// ---------------------------------------------------------------------------
describe('F14: template search and filter logic', () => {
  interface MockTemplate {
    name: string;
    description: string | null;
    category: string;
  }

  const templates: MockTemplate[] = [
    { name: 'Standard Kitchen Demolition', description: 'Complete strip-out of existing kitchen', category: 'kitchen' },
    { name: 'Kitchen Cabinetry Package', description: 'Semi-custom cabinets installation', category: 'kitchen' },
    { name: 'Bathroom Rough-In', description: 'Plumbing and electrical rough-in', category: 'bathroom' },
    { name: 'Basement Framing', description: 'Frame exterior walls', category: 'basement' },
    { name: 'Hardwood Flooring', description: 'Engineered hardwood supply and install', category: 'flooring' },
  ];

  function filterTemplates(list: MockTemplate[], search: string, category: string): MockTemplate[] {
    let result = list;
    if (category !== 'all') {
      result = result.filter(t => t.category === category);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }

  it('returns all templates with no filters', () => {
    expect(filterTemplates(templates, '', 'all')).toHaveLength(5);
  });

  it('filters by category only', () => {
    expect(filterTemplates(templates, '', 'kitchen')).toHaveLength(2);
    expect(filterTemplates(templates, '', 'bathroom')).toHaveLength(1);
    expect(filterTemplates(templates, '', 'painting')).toHaveLength(0);
  });

  it('filters by search text (name match)', () => {
    expect(filterTemplates(templates, 'cabinet', 'all')).toHaveLength(1);
  });

  it('filters by search text (description match)', () => {
    expect(filterTemplates(templates, 'plumbing', 'all')).toHaveLength(1);
  });

  it('search is case-insensitive', () => {
    expect(filterTemplates(templates, 'KITCHEN', 'all')).toHaveLength(2);
  });

  it('combines search and category', () => {
    expect(filterTemplates(templates, 'kitchen', 'kitchen')).toHaveLength(2);
    expect(filterTemplates(templates, 'kitchen', 'bathroom')).toHaveLength(0);
  });

  it('trims whitespace from search', () => {
    expect(filterTemplates(templates, '  hardwood  ', 'all')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// E4: Upload Error Categorisation
// ---------------------------------------------------------------------------
describe('E4: categorizeUploadErrors', () => {
  it('groups errors by type', () => {
    const errors = [
      { row: 2, message: 'Invalid unit_price' },
      { row: 4, message: 'Invalid unit_price format' },
      { row: 5, message: 'Missing item_name' },
      { row: 7, message: 'Missing item_name required' },
      { row: 9, message: 'Invalid category value' },
    ];
    const groups = categorizeUploadErrors(errors);
    expect(groups).toHaveLength(3);

    const priceGroup = groups.find(g => g.type === 'Invalid price');
    expect(priceGroup).toBeDefined();
    expect(priceGroup!.count).toBe(2);
    expect(priceGroup!.rows).toEqual([2, 4]);

    const nameGroup = groups.find(g => g.type === 'Missing name');
    expect(nameGroup).toBeDefined();
    expect(nameGroup!.count).toBe(2);
    expect(nameGroup!.rows).toEqual([5, 7]);

    const catGroup = groups.find(g => g.type === 'Invalid category');
    expect(catGroup).toBeDefined();
    expect(catGroup!.count).toBe(1);
  });

  it('returns empty array for no errors', () => {
    expect(categorizeUploadErrors([])).toEqual([]);
  });

  it('handles unknown error types as "Other error"', () => {
    const errors = [
      { row: 1, message: 'Something unexpected happened' },
    ];
    const groups = categorizeUploadErrors(errors);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.type).toBe('Other error');
  });

  it('handles duplicate errors', () => {
    const errors = [
      { row: 1, message: 'Duplicate item found' },
      { row: 3, message: 'Duplicate entry detected' },
    ];
    const groups = categorizeUploadErrors(errors);
    const dupGroup = groups.find(g => g.type === 'Duplicate item');
    expect(dupGroup).toBeDefined();
    expect(dupGroup!.count).toBe(2);
  });
});
