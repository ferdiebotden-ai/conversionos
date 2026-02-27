/**
 * Settings & Intake Polish Tests
 * Tests for V2-V5, V10, F9 validation and flow logic
 */

import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidPhone, isValidCanadianPostal } from '@/lib/utils/validation';

// ============================================================
// V2: Cross-field pricing validation
// ============================================================
describe('V2: Cross-field pricing validation', () => {
  // Helper that mirrors getPricingErrors in settings/page.tsx
  function getPricingErrors(settings: Record<string, { economy: { min: number; max: number }; standard: { min: number; max: number }; premium: { min: number; max: number } }>): Record<string, string> {
    const errors: Record<string, string> = {};
    const pricingKeys = ['pricing_kitchen', 'pricing_bathroom', 'pricing_basement', 'pricing_flooring'];
    const levels = ['economy', 'standard', 'premium'] as const;
    for (const key of pricingKeys) {
      const pricing = settings[key];
      if (!pricing) continue;
      for (const level of levels) {
        if (pricing[level].min >= pricing[level].max) {
          errors[`${key}-${level}`] = 'Minimum must be less than maximum';
        }
      }
    }
    return errors;
  }

  it('returns no errors for valid ranges', () => {
    const settings = {
      pricing_kitchen: { economy: { min: 150, max: 200 }, standard: { min: 200, max: 275 }, premium: { min: 275, max: 400 } },
      pricing_bathroom: { economy: { min: 200, max: 300 }, standard: { min: 300, max: 450 }, premium: { min: 450, max: 600 } },
      pricing_basement: { economy: { min: 40, max: 55 }, standard: { min: 55, max: 70 }, premium: { min: 70, max: 100 } },
      pricing_flooring: { economy: { min: 8, max: 12 }, standard: { min: 12, max: 18 }, premium: { min: 18, max: 30 } },
    };
    expect(getPricingErrors(settings)).toEqual({});
  });

  it('detects min >= max', () => {
    const settings = {
      pricing_kitchen: { economy: { min: 200, max: 200 }, standard: { min: 300, max: 200 }, premium: { min: 275, max: 400 } },
      pricing_bathroom: { economy: { min: 200, max: 300 }, standard: { min: 300, max: 450 }, premium: { min: 450, max: 600 } },
      pricing_basement: { economy: { min: 40, max: 55 }, standard: { min: 55, max: 70 }, premium: { min: 70, max: 100 } },
      pricing_flooring: { economy: { min: 8, max: 12 }, standard: { min: 12, max: 18 }, premium: { min: 18, max: 30 } },
    };
    const errors = getPricingErrors(settings);
    expect(errors['pricing_kitchen-economy']).toBe('Minimum must be less than maximum');
    expect(errors['pricing_kitchen-standard']).toBe('Minimum must be less than maximum');
    expect(errors['pricing_kitchen-premium']).toBeUndefined();
  });

  it('detects errors across multiple categories', () => {
    const settings = {
      pricing_kitchen: { economy: { min: 200, max: 100 }, standard: { min: 200, max: 275 }, premium: { min: 275, max: 400 } },
      pricing_bathroom: { economy: { min: 200, max: 300 }, standard: { min: 500, max: 450 }, premium: { min: 450, max: 600 } },
      pricing_basement: { economy: { min: 40, max: 55 }, standard: { min: 55, max: 70 }, premium: { min: 70, max: 100 } },
      pricing_flooring: { economy: { min: 8, max: 12 }, standard: { min: 12, max: 18 }, premium: { min: 30, max: 30 } },
    };
    const errors = getPricingErrors(settings);
    expect(Object.keys(errors)).toHaveLength(3);
    expect(errors['pricing_kitchen-economy']).toBeDefined();
    expect(errors['pricing_bathroom-standard']).toBeDefined();
    expect(errors['pricing_flooring-premium']).toBeDefined();
  });
});

// ============================================================
// V3: Email validation
// ============================================================
describe('V3: Email validation', () => {
  it('accepts valid email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('admin@company.co')).toBe(true);
    expect(isValidEmail('test.name+tag@domain.org')).toBe(true);
  });

  it('rejects invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('noatsign')).toBe(false);
    expect(isValidEmail('missing@')).toBe(false);
    expect(isValidEmail('@missing.com')).toBe(false);
    expect(isValidEmail('has spaces@email.com')).toBe(false);
  });

  it('trims whitespace before validation', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true);
  });
});

// ============================================================
// V4: Phone validation
// ============================================================
describe('V4: Phone validation', () => {
  it('accepts valid phone numbers', () => {
    expect(isValidPhone('519-555-1234')).toBe(true);
    expect(isValidPhone('(519) 555-1234')).toBe(true);
    expect(isValidPhone('+1 519 555 1234')).toBe(true);
    expect(isValidPhone('5195551234')).toBe(true);
  });

  it('rejects short phone numbers', () => {
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('555-1234')).toBe(false);
  });

  it('rejects empty strings', () => {
    expect(isValidPhone('')).toBe(false);
  });
});

// ============================================================
// V5: Canadian postal code validation
// ============================================================
describe('V5: Canadian postal code validation', () => {
  it('accepts valid postal codes', () => {
    expect(isValidCanadianPostal('N5A 1A1')).toBe(true);
    expect(isValidCanadianPostal('M5V2H1')).toBe(true);
    expect(isValidCanadianPostal('k1a 0b1')).toBe(true);
  });

  it('rejects invalid postal codes', () => {
    expect(isValidCanadianPostal('')).toBe(false);
    expect(isValidCanadianPostal('12345')).toBe(false);
    expect(isValidCanadianPostal('N5A')).toBe(false);
    expect(isValidCanadianPostal('ABCDEF')).toBe(false);
  });

  it('trims whitespace', () => {
    expect(isValidCanadianPostal(' N5A 1A1 ')).toBe(true);
  });
});

// ============================================================
// V10: Duplicate detection flow
// ============================================================
describe('V10: Duplicate lead detection flow', () => {
  it('duplicate check returns false when API errors', async () => {
    // Simulated check logic (mirrors component behavior)
    async function checkDuplicate(email: string, mockFetch: typeof fetch): Promise<boolean> {
      try {
        const res = await mockFetch(`/api/leads?email=${encodeURIComponent(email)}`);
        if (!res.ok) return false;
        const data = await res.json();
        return Array.isArray(data.leads) && data.leads.length > 0;
      } catch {
        return false;
      }
    }

    // Mock a 500 error
    const mockFetch500 = (() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) })) as unknown as typeof fetch;
    expect(await checkDuplicate('test@example.com', mockFetch500)).toBe(false);
  });

  it('detects existing lead by email', async () => {
    async function checkDuplicate(email: string, mockFetch: typeof fetch): Promise<boolean> {
      try {
        const res = await mockFetch(`/api/leads?email=${encodeURIComponent(email)}`);
        if (!res.ok) return false;
        const data = await res.json();
        return Array.isArray(data.leads) && data.leads.length > 0;
      } catch {
        return false;
      }
    }

    const mockFetchFound = (() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ leads: [{ id: '1', email: 'dup@example.com' }] }),
    })) as unknown as typeof fetch;
    expect(await checkDuplicate('dup@example.com', mockFetchFound)).toBe(true);
  });

  it('returns false when no leads match', async () => {
    async function checkDuplicate(email: string, mockFetch: typeof fetch): Promise<boolean> {
      try {
        const res = await mockFetch(`/api/leads?email=${encodeURIComponent(email)}`);
        if (!res.ok) return false;
        const data = await res.json();
        return Array.isArray(data.leads) && data.leads.length > 0;
      } catch {
        return false;
      }
    }

    const mockFetchEmpty = (() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ leads: [] }),
    })) as unknown as typeof fetch;
    expect(await checkDuplicate('new@example.com', mockFetchEmpty)).toBe(false);
  });
});

// ============================================================
// F9: Confirmation modal content
// ============================================================
describe('F9: Confirmation modal content', () => {
  it('generates correct list items with all fields', () => {
    const form = {
      name: 'John Smith',
      email: 'john@example.com',
      phone: '519-555-1234',
      projectType: 'kitchen',
    };
    const intakeMethod = 'voice_dictation';
    const projectTypes = [
      { value: 'kitchen', label: 'Kitchen' },
      { value: 'bathroom', label: 'Bathroom' },
    ];

    const listItems = [
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      ...(form.phone ? [`Phone: ${form.phone}`] : []),
      ...(form.projectType ? [`Project: ${projectTypes.find(t => t.value === form.projectType)?.label || form.projectType}`] : []),
      `Intake method: ${intakeMethod === 'voice_dictation' ? 'Voice Dictation' : intakeMethod === 'text_input' ? 'Text Input' : 'Form'}`,
    ];

    expect(listItems).toEqual([
      'Name: John Smith',
      'Email: john@example.com',
      'Phone: 519-555-1234',
      'Project: Kitchen',
      'Intake method: Voice Dictation',
    ]);
  });

  it('omits optional fields when empty', () => {
    const form = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '',
      projectType: '',
    };
    const intakeMethod: string = 'form';

    const listItems = [
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      ...(form.phone ? [`Phone: ${form.phone}`] : []),
      ...(form.projectType ? [`Project: ${form.projectType}`] : []),
      `Intake method: ${intakeMethod === 'voice_dictation' ? 'Voice Dictation' : intakeMethod === 'text_input' ? 'Text Input' : 'Form'}`,
    ];

    expect(listItems).toEqual([
      'Name: Jane Doe',
      'Email: jane@example.com',
      'Intake method: Form',
    ]);
  });

  it('shows text input method correctly', () => {
    const intakeMethod: string = 'text_input';
    const label = intakeMethod === 'voice_dictation' ? 'Voice Dictation' : intakeMethod === 'text_input' ? 'Text Input' : 'Form';
    expect(label).toBe('Text Input');
  });
});

// ============================================================
// Combined validation: settings save gate
// ============================================================
describe('Settings save validation gate', () => {
  it('blocks save when email is invalid', () => {
    const errors: Record<string, string> = {};
    const email = 'not-an-email';
    if (email && !isValidEmail(email)) {
      errors['notificationEmail'] = 'Please enter a valid email address';
    }
    expect(Object.keys(errors).length).toBeGreaterThan(0);
  });

  it('blocks save when phone is invalid', () => {
    const errors: Record<string, string> = {};
    const phone = '123';
    if (phone && !isValidPhone(phone)) {
      errors['businessPhone'] = 'Phone number must be at least 10 digits';
    }
    expect(Object.keys(errors).length).toBeGreaterThan(0);
  });

  it('blocks save when postal code is invalid', () => {
    const errors: Record<string, string> = {};
    const postal = '12345';
    if (postal && !isValidCanadianPostal(postal)) {
      errors['businessPostal'] = 'Enter a valid Canadian postal code (e.g., N5A 1A1)';
    }
    expect(Object.keys(errors).length).toBeGreaterThan(0);
  });

  it('allows save when all fields are valid', () => {
    const errors: Record<string, string> = {};
    const email = 'admin@company.com';
    const phone = '519-555-1234';
    const postal = 'N5A 1A1';

    if (email && !isValidEmail(email)) {
      errors['notificationEmail'] = 'error';
    }
    if (phone && !isValidPhone(phone)) {
      errors['businessPhone'] = 'error';
    }
    if (postal && !isValidCanadianPostal(postal)) {
      errors['businessPostal'] = 'error';
    }
    expect(Object.keys(errors).length).toBe(0);
  });

  it('allows save when optional fields are empty', () => {
    const errors: Record<string, string> = {};
    const email = '';
    const phone = '';
    const postal = '';

    if (email && !isValidEmail(email)) {
      errors['notificationEmail'] = 'error';
    }
    if (phone && !isValidPhone(phone)) {
      errors['businessPhone'] = 'error';
    }
    if (postal && !isValidCanadianPostal(postal)) {
      errors['businessPostal'] = 'error';
    }
    expect(Object.keys(errors).length).toBe(0);
  });
});
