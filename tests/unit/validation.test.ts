import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidPhone,
  isValidCanadianPostal,
  clampNumber,
  isNonEmptyString,
  EMAIL_REGEX,
  PHONE_REGEX,
  POSTAL_REGEX,
  MAX_CHAT_LENGTH,
} from '@/lib/utils/validation';

describe('validation utilities', () => {
  describe('isValidEmail', () => {
    it('accepts valid emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('name.last@company.co.uk')).toBe(true);
      expect(isValidEmail('a+tag@gmail.com')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('@missing-local.com')).toBe(false);
      expect(isValidEmail('missing-domain@')).toBe(false);
      expect(isValidEmail('spaces in@email.com')).toBe(false);
    });

    it('trims whitespace before validation', () => {
      expect(isValidEmail('  user@example.com  ')).toBe(true);
    });
  });

  describe('isValidPhone', () => {
    it('accepts valid phone numbers', () => {
      expect(isValidPhone('5195551234')).toBe(true);
      expect(isValidPhone('+1 (519) 555-1234')).toBe(true);
      expect(isValidPhone('519-555-1234')).toBe(true);
      expect(isValidPhone('1.519.555.1234')).toBe(true);
    });

    it('rejects invalid phone numbers', () => {
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('abc')).toBe(false);
    });

    it('trims whitespace', () => {
      expect(isValidPhone('  5195551234  ')).toBe(true);
    });
  });

  describe('isValidCanadianPostal', () => {
    it('accepts valid Canadian postal codes', () => {
      expect(isValidCanadianPostal('N5A 1A1')).toBe(true);
      expect(isValidCanadianPostal('M5V2T6')).toBe(true);
      expect(isValidCanadianPostal('K1A 0B1')).toBe(true);
    });

    it('rejects invalid postal codes', () => {
      expect(isValidCanadianPostal('')).toBe(false);
      expect(isValidCanadianPostal('12345')).toBe(false);
      expect(isValidCanadianPostal('ABCDEF')).toBe(false);
      expect(isValidCanadianPostal('N5A1A')).toBe(false); // too short
    });

    it('is case insensitive', () => {
      expect(isValidCanadianPostal('n5a 1a1')).toBe(true);
    });
  });

  describe('clampNumber', () => {
    it('clamps below minimum', () => {
      expect(clampNumber(-5, 0, 100)).toBe(0);
    });

    it('clamps above maximum', () => {
      expect(clampNumber(150, 0, 100)).toBe(100);
    });

    it('returns value when within range', () => {
      expect(clampNumber(50, 0, 100)).toBe(50);
    });

    it('returns boundary values', () => {
      expect(clampNumber(0, 0, 100)).toBe(0);
      expect(clampNumber(100, 0, 100)).toBe(100);
    });
  });

  describe('isNonEmptyString', () => {
    it('rejects empty strings', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
    });

    it('accepts non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
    });

    it('respects minLength parameter', () => {
      expect(isNonEmptyString('hi', 5)).toBe(false);
      expect(isNonEmptyString('hello', 5)).toBe(true);
    });
  });

  describe('constants', () => {
    it('exports expected regex patterns', () => {
      expect(EMAIL_REGEX).toBeInstanceOf(RegExp);
      expect(PHONE_REGEX).toBeInstanceOf(RegExp);
      expect(POSTAL_REGEX).toBeInstanceOf(RegExp);
    });

    it('MAX_CHAT_LENGTH is 2000', () => {
      expect(MAX_CHAT_LENGTH).toBe(2000);
    });
  });
});
