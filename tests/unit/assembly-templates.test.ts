import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { DEFAULT_ASSEMBLY_TEMPLATES } from '@/lib/data/default-templates';
import type { AssemblyTemplateItem } from '@/types/database';

// Replicate Zod schemas from the API routes
const TemplateItemSchema = z.object({
  description: z.string().min(1).max(500),
  category: z.enum(['materials', 'labor', 'contract', 'permit', 'equipment', 'allowances', 'other']),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(20),
  unit_price: z.number().nonnegative(),
});

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(['kitchen', 'bathroom', 'basement', 'flooring', 'painting', 'exterior', 'general', 'other']),
  description: z.string().max(1000).optional().nullable(),
  items: z.array(TemplateItemSchema).min(1),
  is_default: z.boolean().optional(),
});

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(['kitchen', 'bathroom', 'basement', 'flooring', 'painting', 'exterior', 'general', 'other']).optional(),
  description: z.string().max(1000).optional().nullable(),
  items: z.array(TemplateItemSchema).min(1).optional(),
});

describe('Template Validation (Create)', () => {
  it('validates a complete template', () => {
    const result = CreateTemplateSchema.safeParse({
      name: 'Kitchen Demo',
      category: 'kitchen',
      description: 'Full kitchen demolition',
      items: [
        { description: 'Cabinet removal', category: 'labor', quantity: 1, unit: 'lot', unit_price: 1200 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = CreateTemplateSchema.safeParse({
      name: '',
      category: 'kitchen',
      items: [{ description: 'Test', category: 'labor', quantity: 1, unit: 'ea', unit_price: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty items array', () => {
    const result = CreateTemplateSchema.safeParse({
      name: 'Empty Template',
      category: 'kitchen',
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category', () => {
    const result = CreateTemplateSchema.safeParse({
      name: 'Test',
      category: 'invalid',
      items: [{ description: 'Test', category: 'labor', quantity: 1, unit: 'ea', unit_price: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts null description', () => {
    const result = CreateTemplateSchema.safeParse({
      name: 'Test',
      category: 'general',
      description: null,
      items: [{ description: 'Test', category: 'labor', quantity: 1, unit: 'ea', unit_price: 100 }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects item with zero quantity', () => {
    const result = CreateTemplateSchema.safeParse({
      name: 'Test',
      category: 'general',
      items: [{ description: 'Test', category: 'labor', quantity: 0, unit: 'ea', unit_price: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects item with negative unit_price', () => {
    const result = CreateTemplateSchema.safeParse({
      name: 'Test',
      category: 'general',
      items: [{ description: 'Test', category: 'labor', quantity: 1, unit: 'ea', unit_price: -50 }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts zero unit_price (e.g., included items)', () => {
    const result = CreateTemplateSchema.safeParse({
      name: 'Test',
      category: 'general',
      items: [{ description: 'Free consultation', category: 'labor', quantity: 1, unit: 'ea', unit_price: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it('validates all template categories', () => {
    const categories = ['kitchen', 'bathroom', 'basement', 'flooring', 'painting', 'exterior', 'general', 'other'] as const;
    for (const cat of categories) {
      const result = CreateTemplateSchema.safeParse({
        name: `Test ${cat}`,
        category: cat,
        items: [{ description: 'Test', category: 'materials', quantity: 1, unit: 'ea', unit_price: 10 }],
      });
      expect(result.success).toBe(true);
    }
  });

  it('validates all item categories', () => {
    const categories = ['materials', 'labor', 'contract', 'permit', 'equipment', 'allowances', 'other'] as const;
    for (const cat of categories) {
      const result = TemplateItemSchema.safeParse({
        description: `Test ${cat}`,
        category: cat,
        quantity: 1,
        unit: 'ea',
        unit_price: 10,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('Template Validation (Update)', () => {
  it('validates partial update with name only', () => {
    const result = UpdateTemplateSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('validates partial update with items only', () => {
    const result = UpdateTemplateSchema.safeParse({
      items: [{ description: 'Updated item', category: 'materials', quantity: 2, unit: 'ea', unit_price: 50 }],
    });
    expect(result.success).toBe(true);
  });

  it('validates empty update (all optional)', () => {
    const result = UpdateTemplateSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('Default Templates', () => {
  it('has 10 default templates', () => {
    expect(DEFAULT_ASSEMBLY_TEMPLATES).toHaveLength(10);
  });

  it('all templates have required fields', () => {
    for (const tmpl of DEFAULT_ASSEMBLY_TEMPLATES) {
      expect(tmpl.name).toBeTruthy();
      expect(tmpl.category).toBeTruthy();
      expect(tmpl.description).toBeTruthy();
      expect(tmpl.items.length).toBeGreaterThan(0);
    }
  });

  it('all templates pass validation', () => {
    for (const tmpl of DEFAULT_ASSEMBLY_TEMPLATES) {
      const result = CreateTemplateSchema.safeParse({ ...tmpl, is_default: true });
      expect(result.success).toBe(true);
    }
  });

  it('all items have positive unit_price', () => {
    for (const tmpl of DEFAULT_ASSEMBLY_TEMPLATES) {
      for (const item of tmpl.items) {
        expect(item.unit_price).toBeGreaterThan(0);
      }
    }
  });

  it('all items have valid categories', () => {
    const validCategories = new Set(['materials', 'labor', 'contract', 'permit', 'equipment', 'allowances', 'other']);
    for (const tmpl of DEFAULT_ASSEMBLY_TEMPLATES) {
      for (const item of tmpl.items) {
        expect(validCategories.has(item.category)).toBe(true);
      }
    }
  });

  it('covers the expected project categories', () => {
    const categories = new Set(DEFAULT_ASSEMBLY_TEMPLATES.map(t => t.category));
    expect(categories.has('kitchen')).toBe(true);
    expect(categories.has('bathroom')).toBe(true);
    expect(categories.has('basement')).toBe(true);
    expect(categories.has('flooring')).toBe(true);
    expect(categories.has('exterior')).toBe(true);
    expect(categories.has('general')).toBe(true);
  });

  it('templates have reasonable totals', () => {
    for (const tmpl of DEFAULT_ASSEMBLY_TEMPLATES) {
      const total = tmpl.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThan(100000); // No single template should exceed $100K
    }
  });
});

describe('Template Insertion into Quote', () => {
  function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  function templateToLineItems(items: AssemblyTemplateItem[], templateName: string) {
    return items.map((item) => ({
      id: generateId(),
      description: item.description,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
      isFromAI: false,
      isFromTemplate: true,
      templateName,
    }));
  }

  it('creates line items with unique IDs', () => {
    const template = DEFAULT_ASSEMBLY_TEMPLATES[0]; // Kitchen Demo
    const items = templateToLineItems(template.items, template.name);
    const ids = items.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length); // All IDs unique
  });

  it('calculates correct totals', () => {
    const template = DEFAULT_ASSEMBLY_TEMPLATES[0]; // Kitchen Demo
    const items = templateToLineItems(template.items, template.name);
    for (const item of items) {
      expect(item.total).toBe(item.quantity * item.unit_price);
    }
  });

  it('marks items as from template, not AI', () => {
    const template = DEFAULT_ASSEMBLY_TEMPLATES[0];
    const items = templateToLineItems(template.items, template.name);
    for (const item of items) {
      expect(item.isFromAI).toBe(false);
      expect(item.isFromTemplate).toBe(true);
      expect(item.templateName).toBe(template.name);
    }
  });

  it('preserves all item properties from template', () => {
    const template = DEFAULT_ASSEMBLY_TEMPLATES[3]; // Bathroom Tile
    const items = templateToLineItems(template.items, template.name);

    expect(items[0].description).toBe(template.items[0].description);
    expect(items[0].category).toBe(template.items[0].category);
    expect(items[0].quantity).toBe(template.items[0].quantity);
    expect(items[0].unit).toBe(template.items[0].unit);
    expect(items[0].unit_price).toBe(template.items[0].unit_price);
  });

  it('handles inserting same template twice with new IDs', () => {
    const template = DEFAULT_ASSEMBLY_TEMPLATES[0];
    const items1 = templateToLineItems(template.items, template.name);
    const items2 = templateToLineItems(template.items, template.name);

    const allIds = [...items1.map(i => i.id), ...items2.map(i => i.id)];
    expect(new Set(allIds).size).toBe(allIds.length); // All IDs unique across both inserts
  });
});
