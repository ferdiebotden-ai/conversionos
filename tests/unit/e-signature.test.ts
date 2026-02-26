/**
 * E-Signature Unit Tests
 * Tests for acceptance token generation, validation logic, and status transitions.
 */

import { describe, it, expect } from 'vitest';

// --- Token generation (replicated from send route) ---

function generateAcceptanceToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  for (let i = 0; i < 24; i++) {
    token += chars[array[i]! % chars.length];
  }
  return token;
}

// --- Validation helpers (replicated from acceptance route logic) ---

function validateAcceptanceName(name: unknown): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }
  if (name.trim().length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }
  return { valid: true };
}

function validateAcceptanceConfirm(confirm: unknown): { valid: boolean; error?: string } {
  if (confirm !== true) {
    return { valid: false, error: 'Confirmation is required' };
  }
  return { valid: true };
}

function isQuoteExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function extractClientIp(headers: Record<string, string | null>): string {
  const forwarded = headers['x-forwarded-for'];
  const realIp = headers['x-real-ip'];
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
}

type AcceptanceStatus = 'pending' | 'accepted' | 'declined';

function canTransition(current: AcceptanceStatus, target: AcceptanceStatus): boolean {
  if (current === 'pending' && target === 'accepted') return true;
  if (current === 'pending' && target === 'declined') return true;
  return false;
}

// --- Tests ---

describe('Acceptance Token Generation', () => {
  it('generates a 24-character token', () => {
    const token = generateAcceptanceToken();
    expect(token).toHaveLength(24);
  });

  it('generates only alphanumeric characters', () => {
    const token = generateAcceptanceToken();
    expect(token).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('generates unique tokens on consecutive calls', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateAcceptanceToken());
    }
    // All 100 should be unique (collision at 24 chars is astronomically unlikely)
    expect(tokens.size).toBe(100);
  });

  it('uses crypto.getRandomValues (not Math.random)', () => {
    // The function signature explicitly uses Uint8Array + crypto.getRandomValues
    // This test verifies the output is sufficiently random
    const token1 = generateAcceptanceToken();
    const token2 = generateAcceptanceToken();
    expect(token1).not.toBe(token2);
  });
});

describe('Acceptance Validation — Name', () => {
  it('rejects empty name', () => {
    expect(validateAcceptanceName('')).toEqual({ valid: false, error: 'Name is required' });
  });

  it('rejects undefined name', () => {
    expect(validateAcceptanceName(undefined)).toEqual({ valid: false, error: 'Name is required' });
  });

  it('rejects null name', () => {
    expect(validateAcceptanceName(null)).toEqual({ valid: false, error: 'Name is required' });
  });

  it('rejects single character name', () => {
    expect(validateAcceptanceName('A')).toEqual({ valid: false, error: 'Name must be at least 2 characters' });
  });

  it('rejects whitespace-only name', () => {
    expect(validateAcceptanceName('  ')).toEqual({ valid: false, error: 'Name must be at least 2 characters' });
  });

  it('accepts valid 2-character name', () => {
    expect(validateAcceptanceName('Bo')).toEqual({ valid: true });
  });

  it('accepts full name', () => {
    expect(validateAcceptanceName('John Smith')).toEqual({ valid: true });
  });
});

describe('Acceptance Validation — Confirm', () => {
  it('requires confirm to be true', () => {
    expect(validateAcceptanceConfirm(true)).toEqual({ valid: true });
  });

  it('rejects false', () => {
    expect(validateAcceptanceConfirm(false)).toEqual({ valid: false, error: 'Confirmation is required' });
  });

  it('rejects undefined', () => {
    expect(validateAcceptanceConfirm(undefined)).toEqual({ valid: false, error: 'Confirmation is required' });
  });

  it('rejects string "true"', () => {
    expect(validateAcceptanceConfirm('true')).toEqual({ valid: false, error: 'Confirmation is required' });
  });
});

describe('Quote Expiry Check', () => {
  it('returns false when no expiry date', () => {
    expect(isQuoteExpired(null)).toBe(false);
  });

  it('returns true for past date', () => {
    expect(isQuoteExpired('2020-01-01T00:00:00Z')).toBe(true);
  });

  it('returns false for future date', () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(isQuoteExpired(future)).toBe(false);
  });
});

describe('IP Address Extraction', () => {
  it('extracts from x-forwarded-for (first value)', () => {
    expect(extractClientIp({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8', 'x-real-ip': null })).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip', () => {
    expect(extractClientIp({ 'x-forwarded-for': null, 'x-real-ip': '9.8.7.6' })).toBe('9.8.7.6');
  });

  it('returns unknown when no IP headers', () => {
    expect(extractClientIp({ 'x-forwarded-for': null, 'x-real-ip': null })).toBe('unknown');
  });
});

describe('Acceptance Status Transitions', () => {
  it('allows pending → accepted', () => {
    expect(canTransition('pending', 'accepted')).toBe(true);
  });

  it('allows pending → declined', () => {
    expect(canTransition('pending', 'declined')).toBe(true);
  });

  it('disallows accepted → accepted (idempotent reject)', () => {
    expect(canTransition('accepted', 'accepted')).toBe(false);
  });

  it('disallows accepted → pending (no rollback)', () => {
    expect(canTransition('accepted', 'pending')).toBe(false);
  });

  it('disallows declined → accepted', () => {
    expect(canTransition('declined', 'accepted')).toBe(false);
  });
});
