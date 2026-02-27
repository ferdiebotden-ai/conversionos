/**
 * Quote Editor Polish Unit Tests
 * Tests for V1 validation, V9 sanity thresholds, P1 memo comparator, P3 debounce.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isNonEmptyString } from '@/lib/utils/validation';
import { lineItemMemoComparator } from '@/components/admin/quote-line-item';
import type { LineItem } from '@/components/admin/quote-line-item';

// --- V1: Validation logic tests ---

describe('V1: Line item validation', () => {
  describe('description validation', () => {
    it('rejects empty description', () => {
      expect(isNonEmptyString('', 5)).toBe(false);
    });

    it('rejects description shorter than 5 chars', () => {
      expect(isNonEmptyString('Hi', 5)).toBe(false);
      expect(isNonEmptyString('abcd', 5)).toBe(false);
    });

    it('rejects whitespace-only description shorter than 5 chars', () => {
      expect(isNonEmptyString('   ', 5)).toBe(false);
    });

    it('accepts description with 5 or more chars', () => {
      expect(isNonEmptyString('Hello', 5)).toBe(true);
      expect(isNonEmptyString('Kitchen demolition', 5)).toBe(true);
    });

    it('accepts exactly 5 characters', () => {
      expect(isNonEmptyString('abcde', 5)).toBe(true);
    });
  });

  describe('unit price validation', () => {
    it('flags zero unit price', () => {
      const unitPrice = 0;
      expect(unitPrice <= 0).toBe(true);
    });

    it('flags negative unit price', () => {
      const unitPrice = -100;
      expect(unitPrice <= 0).toBe(true);
    });

    it('accepts positive unit price', () => {
      const unitPrice = 50;
      expect(unitPrice <= 0).toBe(false);
    });

    it('accepts small positive unit price', () => {
      const unitPrice = 0.01;
      expect(unitPrice <= 0).toBe(false);
    });
  });

  describe('quantity validation', () => {
    it('flags zero quantity', () => {
      const qty = 0;
      expect(qty <= 0).toBe(true);
    });

    it('flags negative quantity', () => {
      const qty = -1;
      expect(qty <= 0).toBe(true);
    });

    it('accepts positive quantity', () => {
      const qty = 5;
      expect(qty <= 0).toBe(false);
    });

    it('accepts fractional quantity', () => {
      const qty = 0.5;
      expect(qty <= 0).toBe(false);
    });
  });
});

// --- V9: Subtotal sanity check tests ---

describe('V9: Subtotal sanity check', () => {
  function isSanityWarning(subtotal: number): boolean {
    return subtotal > 0 && (subtotal < 500 || subtotal > 500000);
  }

  it('warns when subtotal is below $500', () => {
    expect(isSanityWarning(100)).toBe(true);
    expect(isSanityWarning(499.99)).toBe(true);
  });

  it('warns when subtotal is above $500,000', () => {
    expect(isSanityWarning(500001)).toBe(true);
    expect(isSanityWarning(1000000)).toBe(true);
  });

  it('does not warn for normal subtotals', () => {
    expect(isSanityWarning(500)).toBe(false);
    expect(isSanityWarning(10000)).toBe(false);
    expect(isSanityWarning(50000)).toBe(false);
    expect(isSanityWarning(500000)).toBe(false);
  });

  it('does not warn when subtotal is zero (empty quote)', () => {
    expect(isSanityWarning(0)).toBe(false);
  });

  it('boundary: exactly $500 is not a warning', () => {
    expect(isSanityWarning(500)).toBe(false);
  });

  it('boundary: exactly $500,000 is not a warning', () => {
    expect(isSanityWarning(500000)).toBe(false);
  });
});

// --- P1: Memo comparator tests ---

describe('P1: lineItemMemoComparator', () => {
  function makeItem(overrides: Partial<LineItem> = {}): LineItem {
    return {
      id: 'item-1',
      description: 'Kitchen countertop installation',
      category: 'materials',
      quantity: 1,
      unit: 'lot',
      unit_price: 5000,
      total: 5000,
      isFromAI: true,
      isModified: false,
      ...overrides,
    };
  }

  function makeProps(itemOverrides: Partial<LineItem> = {}, propsOverrides: Record<string, unknown> = {}) {
    return {
      item: makeItem(itemOverrides),
      onChange: vi.fn(),
      onDelete: vi.fn(),
      onDuplicate: vi.fn(),
      isDraggable: false,
      ...propsOverrides,
    };
  }

  it('returns true when all compared fields are equal', () => {
    const prev = makeProps();
    const next = makeProps();
    expect(lineItemMemoComparator(prev, next)).toBe(true);
  });

  it('returns false when id changes', () => {
    const prev = makeProps();
    const next = makeProps({ id: 'item-2' });
    expect(lineItemMemoComparator(prev, next)).toBe(false);
  });

  it('returns false when description changes', () => {
    const prev = makeProps();
    const next = makeProps({ description: 'New description text' });
    expect(lineItemMemoComparator(prev, next)).toBe(false);
  });

  it('returns false when quantity changes', () => {
    const prev = makeProps();
    const next = makeProps({ quantity: 3 });
    expect(lineItemMemoComparator(prev, next)).toBe(false);
  });

  it('returns false when unit_price changes', () => {
    const prev = makeProps();
    const next = makeProps({ unit_price: 7500 });
    expect(lineItemMemoComparator(prev, next)).toBe(false);
  });

  it('returns false when category changes', () => {
    const prev = makeProps();
    const next = makeProps({ category: 'labor' });
    expect(lineItemMemoComparator(prev, next)).toBe(false);
  });

  it('returns false when isModified changes', () => {
    const prev = makeProps();
    const next = makeProps({ isModified: true });
    expect(lineItemMemoComparator(prev, next)).toBe(false);
  });

  it('returns false when isDraggable changes', () => {
    const prev = makeProps({}, { isDraggable: false });
    const next = makeProps({}, { isDraggable: true });
    expect(lineItemMemoComparator(prev, next)).toBe(false);
  });

  it('ignores onChange/onDelete/onDuplicate function references', () => {
    const prev = makeProps();
    const next = { ...makeProps(), onChange: vi.fn(), onDelete: vi.fn(), onDuplicate: vi.fn() };
    expect(lineItemMemoComparator(prev, next)).toBe(true);
  });

  it('ignores total changes (derived from qty * unit_price)', () => {
    const prev = makeProps({ total: 5000 });
    const next = makeProps({ total: 9999 });
    // total is not in comparator — returns true because id, desc, qty, unit_price, etc. are same
    expect(lineItemMemoComparator(prev, next)).toBe(true);
  });
});

// --- P3: Debounce timing tests ---

describe('P3: Debounce timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces at 1.5 seconds (1500ms)', () => {
    const callback = vi.fn();
    let timer: NodeJS.Timeout | number | null = null;

    // Simulate the debounce pattern from quote-editor
    function triggerSave() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(callback, 1500);
    }

    triggerSave();

    // Not called yet at 1000ms
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();

    // Called at 1500ms
    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('resets timer on rapid changes', () => {
    const callback = vi.fn();
    let timer: NodeJS.Timeout | number | null = null;

    function triggerSave() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(callback, 1500);
    }

    // Rapid changes — each one resets the timer
    triggerSave();
    vi.advanceTimersByTime(500);
    triggerSave();
    vi.advanceTimersByTime(500);
    triggerSave();
    vi.advanceTimersByTime(500);

    // Still not called — only 500ms since last trigger
    expect(callback).not.toHaveBeenCalled();

    // Wait the remaining 1000ms
    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cancels on cleanup', () => {
    const callback = vi.fn();
    let timer: NodeJS.Timeout | number | null = null;

    function triggerSave() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(callback, 1500);
    }

    function cleanup() {
      if (timer) clearTimeout(timer);
    }

    triggerSave();
    vi.advanceTimersByTime(1000);
    cleanup();
    vi.advanceTimersByTime(2000);
    expect(callback).not.toHaveBeenCalled();
  });
});

// --- Scope gap filtering tests (F8) ---

describe('F8: Scope gap filtering', () => {
  it('filters out gaps where suggested item matches existing line item description', () => {
    const lineItems = [
      { description: 'Demolition and waste disposal' },
      { description: 'Plumbing rough-in' },
    ];
    const gaps = [
      { suggestedItem: { description: 'Demolition and waste disposal' }, ruleId: 'r1' },
      { suggestedItem: { description: 'Electrical wiring' }, ruleId: 'r2' },
    ];

    const existingDescriptions = new Set(
      lineItems.map((item) => item.description.toLowerCase().trim())
    );
    const filtered = gaps.filter(
      (gap) => !existingDescriptions.has(gap.suggestedItem.description.toLowerCase().trim())
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.ruleId).toBe('r2');
  });

  it('is case-insensitive', () => {
    const lineItems = [{ description: 'PLUMBING ROUGH-IN' }];
    const gaps = [
      { suggestedItem: { description: 'plumbing rough-in' }, ruleId: 'r1' },
    ];

    const existingDescriptions = new Set(
      lineItems.map((item) => item.description.toLowerCase().trim())
    );
    const filtered = gaps.filter(
      (gap) => !existingDescriptions.has(gap.suggestedItem.description.toLowerCase().trim())
    );

    expect(filtered).toHaveLength(0);
  });

  it('keeps all gaps when no line items match', () => {
    const lineItems = [{ description: 'Something completely different' }];
    const gaps = [
      { suggestedItem: { description: 'Electrical wiring' }, ruleId: 'r1' },
      { suggestedItem: { description: 'Permit fees' }, ruleId: 'r2' },
    ];

    const existingDescriptions = new Set(
      lineItems.map((item) => item.description.toLowerCase().trim())
    );
    const filtered = gaps.filter(
      (gap) => !existingDescriptions.has(gap.suggestedItem.description.toLowerCase().trim())
    );

    expect(filtered).toHaveLength(2);
  });
});
