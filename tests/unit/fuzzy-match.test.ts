import { describe, it, expect } from 'vitest';
import { levenshtein, findMatchingPrice, countPriceMatches } from '@/lib/pricing/fuzzy-match';

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('cabinet', 'cabinet')).toBe(0);
  });

  it('returns 0 for identical strings ignoring case', () => {
    expect(levenshtein('Cabinet', 'cabinet')).toBe(0);
  });

  it('returns correct distance for single character difference', () => {
    expect(levenshtein('cat', 'car')).toBe(1);
  });

  it('returns correct distance for insertion', () => {
    expect(levenshtein('cat', 'cats')).toBe(1);
  });

  it('returns correct distance for deletion', () => {
    expect(levenshtein('cats', 'cat')).toBe(1);
  });

  it('returns length for empty vs non-empty', () => {
    expect(levenshtein('', 'hello')).toBe(5);
    expect(levenshtein('hello', '')).toBe(5);
  });

  it('returns 0 for two empty strings', () => {
    expect(levenshtein('', '')).toBe(0);
  });

  it('handles multi-char differences', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });

  it('trims whitespace before comparing', () => {
    expect(levenshtein('  hello  ', 'hello')).toBe(0);
  });
});

describe('findMatchingPrice', () => {
  const prices = [
    { item_name: 'Stock cabinets', unit_price: 220, unit: 'lin ft' },
    { item_name: 'Quartz countertop', unit_price: 85, unit: 'sqft' },
    { item_name: 'LVP flooring', unit_price: 7.5, unit: 'sqft' },
    { item_name: 'Plumber (licensed)', unit_price: 95, unit: 'hr' },
  ];

  it('finds exact match', () => {
    const match = findMatchingPrice('Stock cabinets', prices);
    expect(match).not.toBeNull();
    expect(match!.item_name).toBe('Stock cabinets');
    expect(match!.unit_price).toBe(220);
  });

  it('finds match with minor typo (distance 1)', () => {
    const match = findMatchingPrice('Stock cabinet', prices);
    expect(match).not.toBeNull();
    expect(match!.item_name).toBe('Stock cabinets');
  });

  it('finds match case-insensitively', () => {
    const match = findMatchingPrice('stock cabinets', prices);
    expect(match).not.toBeNull();
    expect(match!.item_name).toBe('Stock cabinets');
  });

  it('returns null when no match within threshold', () => {
    const match = findMatchingPrice('Marble flooring tiles premium', prices);
    expect(match).toBeNull();
  });

  it('returns null for empty item name', () => {
    const match = findMatchingPrice('', prices);
    expect(match).toBeNull();
  });

  it('returns null for empty price list', () => {
    const match = findMatchingPrice('Stock cabinets', []);
    expect(match).toBeNull();
  });

  it('returns best (closest) match when multiple candidates close', () => {
    const similar = [
      { item_name: 'LVP flooring', unit_price: 7, unit: 'sqft' },
      { item_name: 'LVP flooring premium', unit_price: 12, unit: 'sqft' },
    ];
    const match = findMatchingPrice('LVP flooring', similar);
    expect(match).not.toBeNull();
    expect(match!.unit_price).toBe(7); // exact match
  });

  it('respects custom threshold', () => {
    // 'Stock cabinet' is distance 1 from 'Stock cabinets'
    const match1 = findMatchingPrice('Stock cabinet', prices, 1);
    expect(match1).toBeNull(); // threshold 1 means < 1 required
    const match2 = findMatchingPrice('Stock cabinet', prices, 2);
    expect(match2).not.toBeNull(); // threshold 2 means distance 1 is OK
  });
});

describe('countPriceMatches', () => {
  const prices = [
    { item_name: 'Stock cabinets', unit_price: 220, unit: 'lin ft' },
    { item_name: 'Quartz countertop', unit_price: 85, unit: 'sqft' },
  ];

  it('counts matching items', () => {
    const descriptions = ['Stock cabinets', 'Quartz countertop', 'Custom tile work'];
    expect(countPriceMatches(descriptions, prices)).toBe(2);
  });

  it('returns 0 for no matches', () => {
    const descriptions = ['Structural steel beams', 'Foundation repair'];
    expect(countPriceMatches(descriptions, prices)).toBe(0);
  });

  it('returns 0 for empty price list', () => {
    expect(countPriceMatches(['Stock cabinets'], [])).toBe(0);
  });

  it('returns 0 for empty descriptions', () => {
    expect(countPriceMatches([], prices)).toBe(0);
  });
});
