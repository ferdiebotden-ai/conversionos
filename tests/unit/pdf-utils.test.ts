/**
 * PDF Utility Function Tests
 * Tests for shared PDF helper functions.
 * [QEv2-Phase3A]
 */

import { describe, it, expect } from 'vitest';
import {
  CATEGORY_LABELS,
  PROJECT_TYPE_LABELS,
  groupLineItemsByCategory,
  formatQuoteNumber,
  formatCurrency,
  getCategoryLabel,
  formatDate,
  resolveImageUrl,
  getProjectTypeLabel,
} from '@/lib/pdf/pdf-utils';
import type { QuoteLineItem } from '@/types/database';

// ── Test helpers ──────────────────────────────────────────

function makeItem(overrides: Partial<QuoteLineItem> = {}): QuoteLineItem {
  return {
    description: 'Test item',
    category: 'labour',
    quantity: 1,
    unit: 'ea',
    unit_price: 100,
    total: 100,
    ...overrides,
  };
}

// ── groupLineItemsByCategory ──────────────────────────────

describe('groupLineItemsByCategory', () => {
  it('groups items by their category field', () => {
    const items = [
      makeItem({ category: 'plumbing', description: 'Sink install' }),
      makeItem({ category: 'electrical', description: 'Outlet' }),
      makeItem({ category: 'plumbing', description: 'Faucet' }),
    ];
    const grouped = groupLineItemsByCategory(items);

    expect(Object.keys(grouped)).toEqual(['plumbing', 'electrical']);
    expect(grouped['plumbing']).toHaveLength(2);
    expect(grouped['electrical']).toHaveLength(1);
  });

  it('defaults missing category to "other"', () => {
    const items = [makeItem({ category: '' })];
    const grouped = groupLineItemsByCategory(items);

    expect(grouped['other']).toHaveLength(1);
  });

  it('returns empty object for empty input', () => {
    expect(groupLineItemsByCategory([])).toEqual({});
  });

  it('maintains insertion order of categories', () => {
    const items = [
      makeItem({ category: 'materials' }),
      makeItem({ category: 'demolition' }),
      makeItem({ category: 'materials' }),
    ];
    const keys = Object.keys(groupLineItemsByCategory(items));
    expect(keys).toEqual(['materials', 'demolition']);
  });
});

// ── formatQuoteNumber ─────────────────────────────────────

describe('formatQuoteNumber', () => {
  it('formats as DEMO-YYYY-LEADID8', () => {
    const result = formatQuoteNumber('2026-02-26T12:00:00Z', 'abcd1234-5678');
    expect(result).toBe('DEMO-2026-ABCD1234');
  });

  it('uppercases the lead ID segment', () => {
    const result = formatQuoteNumber('2025-06-15T12:00:00Z', 'deadbeef-cafe');
    expect(result).toBe('DEMO-2025-DEADBEEF');
  });

  it('handles short lead IDs', () => {
    const result = formatQuoteNumber('2026-06-15T00:00:00Z', 'abc');
    expect(result).toBe('DEMO-2026-ABC');
  });
});

// ── formatCurrency ────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats with two decimal places', () => {
    expect(formatCurrency(1234.5)).toBe('1,234.50');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0.00');
  });

  it('formats large numbers with comma separators', () => {
    expect(formatCurrency(1000000)).toBe('1,000,000.00');
  });

  it('rounds to two decimal places', () => {
    expect(formatCurrency(99.999)).toBe('100.00');
  });
});

// ── getCategoryLabel ──────────────────────────────────────

describe('getCategoryLabel', () => {
  it('returns mapped label for known categories', () => {
    expect(getCategoryLabel('demolition')).toBe('Demolition & Removal');
    expect(getCategoryLabel('plumbing')).toBe('Plumbing');
    expect(getCategoryLabel('materials')).toBe('Materials & Finishes');
  });

  it('title-cases unknown categories', () => {
    expect(getCategoryLabel('flooring')).toBe('Flooring');
    expect(getCategoryLabel('custom')).toBe('Custom');
  });

  it('all CATEGORY_LABELS keys resolve to their mapped value', () => {
    for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
      expect(getCategoryLabel(key)).toBe(label);
    }
  });
});

// ── formatDate ────────────────────────────────────────────

describe('formatDate', () => {
  it('formats Date object as YYYY-MM-DD', () => {
    expect(formatDate(new Date('2026-02-26T15:30:00Z'))).toBe('2026-02-26');
  });

  it('formats ISO string', () => {
    expect(formatDate('2026-01-15T00:00:00Z')).toBe('2026-01-15');
  });
});

// ── resolveImageUrl ───────────────────────────────────────

describe('resolveImageUrl', () => {
  it('returns null for null/undefined/empty input', () => {
    expect(resolveImageUrl(null)).toBeNull();
    expect(resolveImageUrl(undefined)).toBeNull();
    expect(resolveImageUrl('')).toBeNull();
  });

  it('returns absolute HTTP URLs unchanged', () => {
    const url = 'https://example.com/photo.jpg';
    expect(resolveImageUrl(url)).toBe(url);
  });

  it('returns data URIs unchanged', () => {
    const url = 'data:image/png;base64,abc123';
    expect(resolveImageUrl(url)).toBe(url);
  });

  it('prefixes relative URLs with app URL', () => {
    // With no NEXT_PUBLIC_APP_URL set, just prepends /
    expect(resolveImageUrl('/images/photo.jpg')).toBe('/images/photo.jpg');
    expect(resolveImageUrl('images/photo.jpg')).toBe('/images/photo.jpg');
  });
});

// ── getProjectTypeLabel ───────────────────────────────────

describe('getProjectTypeLabel', () => {
  it('returns mapped label for known project types', () => {
    expect(getProjectTypeLabel('kitchen')).toBe('Kitchen Renovation');
    expect(getProjectTypeLabel('basement')).toBe('Basement Work');
  });

  it('returns default for null', () => {
    expect(getProjectTypeLabel(null)).toBe('Renovation Work');
  });

  it('returns default for unknown type', () => {
    expect(getProjectTypeLabel('garage')).toBe('Renovation Work');
  });

  it('all PROJECT_TYPE_LABELS keys resolve correctly', () => {
    for (const [key, label] of Object.entries(PROJECT_TYPE_LABELS)) {
      expect(getProjectTypeLabel(key)).toBe(label);
    }
  });
});
