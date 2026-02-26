/**
 * Intake Extraction Tests
 * Tests for contractor intake schemas and AI extraction logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  IntakeExtractionSchema,
  IntakeRequestSchema,
} from '@/lib/schemas/intake';

// ────────────────────────────────────────────────────────────────
// IntakeExtractionSchema Tests
// ────────────────────────────────────────────────────────────────

describe('IntakeExtractionSchema', () => {
  it('validates a full extraction with all fields', () => {
    const data = {
      name: 'John Smith',
      email: 'john@example.com',
      phone: '519-555-1234',
      address: '123 Main St',
      city: 'Stratford',
      projectType: 'kitchen',
      areaSqft: 200,
      finishLevel: 'premium',
      timeline: '1_3_months',
      budgetBand: '40k_60k',
      goalsText: 'Full kitchen renovation with quartz countertops and shaker cabinets.',
      specificMaterials: ['quartz countertops', 'shaker cabinets'],
      structuralNotes: ['load-bearing wall may need header'],
    };
    const result = IntakeExtractionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('validates minimal extraction with only goalsText', () => {
    const data = {
      goalsText: 'Customer wants a bathroom renovation.',
    };
    const result = IntakeExtractionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('requires goalsText', () => {
    const data = {
      name: 'John Smith',
      email: 'john@example.com',
    };
    const result = IntakeExtractionSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('validates all project types', () => {
    const types = ['kitchen', 'bathroom', 'basement', 'flooring', 'painting', 'exterior', 'other'];
    for (const type of types) {
      const result = IntakeExtractionSchema.safeParse({
        goalsText: 'Some work.',
        projectType: type,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid project type', () => {
    const result = IntakeExtractionSchema.safeParse({
      goalsText: 'Some work.',
      projectType: 'garage',
    });
    expect(result.success).toBe(false);
  });

  it('validates all finish levels', () => {
    for (const level of ['economy', 'standard', 'premium']) {
      const result = IntakeExtractionSchema.safeParse({
        goalsText: 'Renovation.',
        finishLevel: level,
      });
      expect(result.success).toBe(true);
    }
  });

  it('validates all timeline options', () => {
    for (const t of ['asap', '1_3_months', '3_6_months', '6_plus_months', 'just_exploring']) {
      const result = IntakeExtractionSchema.safeParse({
        goalsText: 'Renovation.',
        timeline: t,
      });
      expect(result.success).toBe(true);
    }
  });

  it('validates all budget bands', () => {
    for (const b of ['under_15k', '15k_25k', '25k_40k', '40k_60k', '60k_plus', 'not_sure']) {
      const result = IntakeExtractionSchema.safeParse({
        goalsText: 'Renovation.',
        budgetBand: b,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects negative areaSqft', () => {
    const result = IntakeExtractionSchema.safeParse({
      goalsText: 'Renovation.',
      areaSqft: -100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero areaSqft', () => {
    const result = IntakeExtractionSchema.safeParse({
      goalsText: 'Renovation.',
      areaSqft: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = IntakeExtractionSchema.safeParse({
      goalsText: 'Renovation.',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('allows empty specificMaterials array', () => {
    const result = IntakeExtractionSchema.safeParse({
      goalsText: 'Renovation.',
      specificMaterials: [],
    });
    expect(result.success).toBe(true);
  });

  it('allows empty structuralNotes array', () => {
    const result = IntakeExtractionSchema.safeParse({
      goalsText: 'Renovation.',
      structuralNotes: [],
    });
    expect(result.success).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────
// IntakeRequestSchema Tests
// ────────────────────────────────────────────────────────────────

describe('IntakeRequestSchema', () => {
  it('validates a full intake request', () => {
    const data = {
      name: 'John Smith',
      email: 'john@example.com',
      phone: '519-555-1234',
      address: '123 Main St',
      city: 'Stratford',
      projectType: 'kitchen',
      areaSqft: 200,
      finishLevel: 'standard',
      timeline: 'asap',
      budgetBand: '25k_40k',
      goalsText: 'Kitchen reno, quartz tops.',
      rawInput: 'Got a call from John, wants kitchen done.',
      intakeMethod: 'voice_dictation',
    };
    const result = IntakeRequestSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('validates minimal request (name + email + method)', () => {
    const data = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      intakeMethod: 'form',
    };
    const result = IntakeRequestSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const data = {
      email: 'jane@example.com',
      intakeMethod: 'form',
    };
    const result = IntakeRequestSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects name too short', () => {
    const data = {
      name: 'J',
      email: 'jane@example.com',
      intakeMethod: 'form',
    };
    const result = IntakeRequestSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const data = {
      name: 'Jane Doe',
      intakeMethod: 'form',
    };
    const result = IntakeRequestSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const data = {
      name: 'Jane Doe',
      email: 'not-valid',
      intakeMethod: 'form',
    };
    const result = IntakeRequestSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing intakeMethod', () => {
    const data = {
      name: 'Jane Doe',
      email: 'jane@example.com',
    };
    const result = IntakeRequestSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('validates all intake methods', () => {
    for (const method of ['voice_dictation', 'text_input', 'form']) {
      const result = IntakeRequestSchema.safeParse({
        name: 'Test User',
        email: 'test@example.com',
        intakeMethod: method,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid intake method', () => {
    const result = IntakeRequestSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      intakeMethod: 'phone_call',
    });
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────
// extractIntakeFields Tests (mocked)
// ────────────────────────────────────────────────────────────────

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

vi.mock('@/lib/ai/providers', () => ({
  openai: vi.fn(() => 'gpt-4o-mini'),
}));

describe('extractIntakeFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts fields from phone call notes', async () => {
    const { generateObject } = await import('ai');
    const mockResult = {
      name: 'Mike Johnson',
      email: 'mike@gmail.com',
      phone: '519-555-9876',
      projectType: 'bathroom',
      areaSqft: 80,
      finishLevel: 'standard',
      goalsText: 'Full bathroom renovation, replace tub with walk-in shower, new tile, vanity.',
      specificMaterials: ['subway tile', 'undermount sink'],
    };

    vi.mocked(generateObject).mockResolvedValueOnce({
      object: mockResult,
      finishReason: 'stop',
      usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      toJsonResponse: vi.fn(),
      warnings: [],
      request: {} as unknown as Parameters<typeof generateObject>[0],
      response: { id: 'test', timestamp: new Date(), modelId: 'gpt-4o-mini', headers: {} },
      experimental_providerMetadata: undefined,
      providerMetadata: undefined,
      rawResponse: undefined,
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    const { extractIntakeFields } = await import('@/lib/ai/intake-extraction');
    const result = await extractIntakeFields(
      'Got a call from Mike Johnson, mike@gmail.com, 519-555-9876. Wants a bathroom reno, about 80 sqft. Standard finish. Replace tub with walk-in shower, subway tile, undermount sink.'
    );

    expect(result.name).toBe('Mike Johnson');
    expect(result.projectType).toBe('bathroom');
    expect(result.goalsText).toContain('bathroom');
    expect(generateObject).toHaveBeenCalledTimes(1);
  });

  it('extracts from pasted email', async () => {
    const { generateObject } = await import('ai');
    const mockResult = {
      name: 'Sarah Wilson',
      email: 'sarah@company.ca',
      projectType: 'kitchen',
      goalsText: 'Kitchen remodel, quartz countertops, soft-close shaker cabinets.',
      specificMaterials: ['quartz countertops', 'shaker cabinets'],
      budgetBand: '40k_60k',
    };

    vi.mocked(generateObject).mockResolvedValueOnce({
      object: mockResult,
      finishReason: 'stop',
      usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      toJsonResponse: vi.fn(),
      warnings: [],
      request: {} as unknown as Parameters<typeof generateObject>[0],
      response: { id: 'test', timestamp: new Date(), modelId: 'gpt-4o-mini', headers: {} },
      experimental_providerMetadata: undefined,
      providerMetadata: undefined,
      rawResponse: undefined,
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    const { extractIntakeFields } = await import('@/lib/ai/intake-extraction');
    const result = await extractIntakeFields(
      'Email from Sarah Wilson sarah@company.ca: I would like to remodel my kitchen. Looking for quartz countertops and soft-close shaker cabinets. Budget around $50K.'
    );

    expect(result.name).toBe('Sarah Wilson');
    expect(result.email).toBe('sarah@company.ca');
    expect(result.projectType).toBe('kitchen');
    expect(result.budgetBand).toBe('40k_60k');
  });

  it('handles minimal input with just goals', async () => {
    const { generateObject } = await import('ai');
    const mockResult = {
      goalsText: 'Basement finishing, drywall and flooring.',
      projectType: 'basement',
    };

    vi.mocked(generateObject).mockResolvedValueOnce({
      object: mockResult,
      finishReason: 'stop',
      usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
      toJsonResponse: vi.fn(),
      warnings: [],
      request: {} as unknown as Parameters<typeof generateObject>[0],
      response: { id: 'test', timestamp: new Date(), modelId: 'gpt-4o-mini', headers: {} },
      experimental_providerMetadata: undefined,
      providerMetadata: undefined,
      rawResponse: undefined,
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    const { extractIntakeFields } = await import('@/lib/ai/intake-extraction');
    const result = await extractIntakeFields('Basement needs finishing, drywall and flooring.');

    expect(result.goalsText).toBeTruthy();
    expect(result.projectType).toBe('basement');
    expect(result.name).toBeUndefined();
    expect(result.email).toBeUndefined();
  });

  it('passes system prompt and low temperature', async () => {
    const { generateObject } = await import('ai');
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { goalsText: 'Test.' },
      finishReason: 'stop',
      usage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
      toJsonResponse: vi.fn(),
      warnings: [],
      request: {} as unknown as Parameters<typeof generateObject>[0],
      response: { id: 'test', timestamp: new Date(), modelId: 'gpt-4o-mini', headers: {} },
      experimental_providerMetadata: undefined,
      providerMetadata: undefined,
      rawResponse: undefined,
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    const { extractIntakeFields } = await import('@/lib/ai/intake-extraction');
    await extractIntakeFields('Some notes.');

    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.1,
        maxOutputTokens: 1024,
        system: expect.stringContaining('Ontario renovation context'),
      })
    );
  });
});
