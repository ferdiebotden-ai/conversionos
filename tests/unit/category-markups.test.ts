/**
 * Category Markups Unit Tests
 * Tests for per-category markup configuration and calculations
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CATEGORY_MARKUPS,
  CATEGORY_LABELS,
  markupToMargin,
  applyMarkup,
  getMarkupForCategory,
  type CategoryMarkupsConfig,
} from '@/lib/pricing/category-markups';

describe('DEFAULT_CATEGORY_MARKUPS', () => {
  it('has all 7 categories defined', () => {
    const expectedKeys: (keyof CategoryMarkupsConfig)[] = [
      'materials',
      'labor',
      'contract',
      'equipment',
      'permit',
      'allowances',
      'other',
    ];

    for (const key of expectedKeys) {
      expect(DEFAULT_CATEGORY_MARKUPS).toHaveProperty(key);
      expect(typeof DEFAULT_CATEGORY_MARKUPS[key]).toBe('number');
    }

    expect(Object.keys(DEFAULT_CATEGORY_MARKUPS)).toHaveLength(7);
  });

  it('has expected default values', () => {
    expect(DEFAULT_CATEGORY_MARKUPS.materials).toBe(15);
    expect(DEFAULT_CATEGORY_MARKUPS.labor).toBe(30);
    expect(DEFAULT_CATEGORY_MARKUPS.contract).toBe(15);
    expect(DEFAULT_CATEGORY_MARKUPS.equipment).toBe(10);
    expect(DEFAULT_CATEGORY_MARKUPS.permit).toBe(0);
    expect(DEFAULT_CATEGORY_MARKUPS.allowances).toBe(0);
    expect(DEFAULT_CATEGORY_MARKUPS.other).toBe(10);
  });
});

describe('CATEGORY_LABELS', () => {
  it('has Canadian spelling for labour', () => {
    expect(CATEGORY_LABELS.labor).toBe('Labour');
    expect(CATEGORY_LABELS.contract).toBe('Contract Labour');
  });

  it('has labels for all categories', () => {
    const keys = Object.keys(DEFAULT_CATEGORY_MARKUPS) as (keyof CategoryMarkupsConfig)[];
    for (const key of keys) {
      expect(CATEGORY_LABELS[key]).toBeDefined();
      expect(typeof CATEGORY_LABELS[key]).toBe('string');
    }
  });
});

describe('markupToMargin', () => {
  it('returns 0 for 0% markup', () => {
    expect(markupToMargin(0)).toBe(0);
  });

  it('converts 25% markup to 20% margin', () => {
    expect(markupToMargin(25)).toBe(20);
  });

  it('converts 100% markup to 50% margin', () => {
    expect(markupToMargin(100)).toBe(50);
  });

  it('converts 15% markup to approximately 13.04% margin', () => {
    expect(markupToMargin(15)).toBeCloseTo(13.04, 1);
  });

  it('returns 0 for negative markup', () => {
    expect(markupToMargin(-10)).toBe(0);
  });
});

describe('applyMarkup', () => {
  it('applies 25% markup to $100 cost', () => {
    expect(applyMarkup(100, 25)).toBe(125);
  });

  it('returns original cost when markup is 0%', () => {
    expect(applyMarkup(100, 0)).toBe(100);
  });

  it('returns 0 when cost is 0 regardless of markup', () => {
    expect(applyMarkup(0, 25)).toBe(0);
  });

  it('applies 100% markup correctly', () => {
    expect(applyMarkup(500, 100)).toBe(1000);
  });
});

describe('getMarkupForCategory', () => {
  it('returns correct markup for known category', () => {
    expect(getMarkupForCategory('materials', DEFAULT_CATEGORY_MARKUPS)).toBe(15);
    expect(getMarkupForCategory('labor', DEFAULT_CATEGORY_MARKUPS)).toBe(30);
    expect(getMarkupForCategory('permit', DEFAULT_CATEGORY_MARKUPS)).toBe(0);
  });

  it('falls back to other markup for unknown category', () => {
    expect(getMarkupForCategory('unknown', DEFAULT_CATEGORY_MARKUPS)).toBe(10);
  });

  it('uses DEFAULT_CATEGORY_MARKUPS when no config provided', () => {
    expect(getMarkupForCategory('materials')).toBe(15);
    expect(getMarkupForCategory('unknown_category')).toBe(10);
  });
});
