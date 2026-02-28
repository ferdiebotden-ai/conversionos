import { describe, it, expect } from 'vitest';
import {
  parseOklch, parseHex, hexToOklch,
  deltaE_oklch, relativeLuminance, contrastRatio, levenshtein,
} from '../../lib/colour-utils.mjs';

describe('colour-utils', () => {
  describe('parseOklch', () => {
    it('parses valid OKLCH string', () => {
      const result = parseOklch('0.588 0.108 180');
      expect(result).toBeDefined();
      expect(result.L).toBeCloseTo(0.588, 2);
      expect(result.C).toBeCloseTo(0.108, 2);
      expect(result.H).toBeCloseTo(180, 0);
    });

    it('returns null for invalid input', () => {
      expect(parseOklch('')).toBeNull();
      expect(parseOklch('not-a-colour')).toBeNull();
    });

    it('parses OKLCH with varying decimal places', () => {
      const result = parseOklch('0.5 0.1 90');
      expect(result).toBeDefined();
      expect(result.L).toBeCloseTo(0.5, 1);
      expect(result.C).toBeCloseTo(0.1, 1);
      expect(result.H).toBeCloseTo(90, 0);
    });
  });

  describe('parseHex', () => {
    it('parses red', () => {
      const { r, g, b } = parseHex('#FF0000');
      expect(r).toBe(255);
      expect(g).toBe(0);
      expect(b).toBe(0);
    });

    it('parses white', () => {
      const { r, g, b } = parseHex('#FFFFFF');
      expect(r).toBe(255);
      expect(g).toBe(255);
      expect(b).toBe(255);
    });

    it('parses black', () => {
      const { r, g, b } = parseHex('#000000');
      expect(r).toBe(0);
      expect(g).toBe(0);
      expect(b).toBe(0);
    });

    it('handles lowercase hex', () => {
      const { r, g, b } = parseHex('#2563eb');
      expect(r).toBe(37);
      expect(g).toBe(99);
      expect(b).toBe(235);
    });
  });

  describe('hexToOklch', () => {
    it('converts white to high lightness', () => {
      const result = hexToOklch('#FFFFFF');
      expect(result).toBeDefined();
      expect(result.L).toBeGreaterThan(0.95);
      expect(result.C).toBeLessThan(0.01);
    });

    it('converts black to low lightness', () => {
      const result = hexToOklch('#000000');
      expect(result).toBeDefined();
      expect(result.L).toBeLessThan(0.05);
    });

    it('converts a colour with chromatic content', () => {
      const result = hexToOklch('#2563eb');
      expect(result).toBeDefined();
      expect(result.L).toBeGreaterThan(0.3);
      expect(result.L).toBeLessThan(0.8);
      expect(result.C).toBeGreaterThan(0.05);
    });
  });

  describe('deltaE_oklch', () => {
    it('returns 0 for identical colours', () => {
      const c = { L: 0.588, C: 0.108, H: 180 };
      expect(deltaE_oklch(c, c)).toBe(0);
    });

    it('returns >0 for different colours', () => {
      const a = { L: 0.588, C: 0.108, H: 180 };
      const b = { L: 0.7, C: 0.15, H: 200 };
      expect(deltaE_oklch(a, b)).toBeGreaterThan(0);
    });

    it('produces larger delta for more different colours', () => {
      const base = { L: 0.5, C: 0.1, H: 180 };
      const similar = { L: 0.52, C: 0.11, H: 182 };
      const different = { L: 0.8, C: 0.2, H: 90 };
      expect(deltaE_oklch(base, similar)).toBeLessThan(deltaE_oklch(base, different));
    });
  });

  describe('relativeLuminance', () => {
    it('white has luminance 1.0', () => {
      expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1.0, 2);
    });

    it('black has luminance 0.0', () => {
      expect(relativeLuminance('#000000')).toBeCloseTo(0.0, 2);
    });

    it('grey has intermediate luminance', () => {
      const lum = relativeLuminance('#808080');
      expect(lum).toBeGreaterThan(0.15);
      expect(lum).toBeLessThan(0.25);
    });
  });

  describe('contrastRatio', () => {
    it('black/white = 21:1', () => {
      expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21.0, 0);
    });

    it('white/black = 21:1 (symmetric)', () => {
      expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21.0, 0);
    });

    it('same colour = 1:1', () => {
      expect(contrastRatio('#2563eb', '#2563eb')).toBeCloseTo(1.0, 1);
    });

    it('mid-grey on white has moderate contrast', () => {
      const ratio = contrastRatio('#808080', '#FFFFFF');
      expect(ratio).toBeGreaterThan(3);
      expect(ratio).toBeLessThan(6);
    });
  });

  describe('levenshtein', () => {
    it('identical strings return 0', () => {
      expect(levenshtein('hello', 'hello')).toBe(0);
    });

    it('empty vs non-empty returns length', () => {
      expect(levenshtein('', 'abc')).toBe(3);
      expect(levenshtein('xyz', '')).toBe(3);
    });

    it('both empty returns 0', () => {
      expect(levenshtein('', '')).toBe(0);
    });

    it('kitten/sitting = 3', () => {
      expect(levenshtein('kitten', 'sitting')).toBe(3);
    });

    it('single char difference = 1', () => {
      expect(levenshtein('cat', 'bat')).toBe(1);
    });

    it('handles case sensitivity', () => {
      expect(levenshtein('Hello', 'hello')).toBe(1);
    });
  });
});
