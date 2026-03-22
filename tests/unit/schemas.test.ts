/**
 * Schema Validation Tests
 * Tests for Zod schemas used throughout the application
 */

import { describe, it, expect } from 'vitest';
import { contactFormSchema } from '@/lib/schemas/contact';
import {
  ProjectTypeSchema,
  FinishLevelSchema,
  TimelineSchema,
  BudgetBandSchema,
  LeadExtractionSchema,
} from '@/lib/schemas/lead-extraction';
import { RoomTypeSchema, ConditionSchema, RoomAnalysisSchema } from '@/lib/schemas/room-analysis';

describe('contactFormSchema', () => {
  it('validates valid contact form data', () => {
    const validData = {
      name: 'John Smith',
      email: 'john@example.com',
      phone: '519-555-1234',
      projectType: 'kitchen',
      message: 'I want to renovate my kitchen with new cabinets and countertops.',
    };

    const result = contactFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('validates without optional phone', () => {
    const validData = {
      name: 'John Smith',
      email: 'john@example.com',
      projectType: 'bathroom',
      message: 'Need a bathroom renovation quote please.',
    };

    const result = contactFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects name too short', () => {
    const invalidData = {
      name: 'J',
      email: 'john@example.com',
      projectType: 'kitchen',
      message: 'I want to renovate my kitchen.',
    };

    const result = contactFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('at least 2 characters');
    }
  });

  it('rejects invalid email', () => {
    const invalidData = {
      name: 'John Smith',
      email: 'not-an-email',
      projectType: 'kitchen',
      message: 'I want to renovate my kitchen.',
    };

    const result = contactFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('valid email');
    }
  });

  it('rejects invalid phone number', () => {
    const invalidData = {
      name: 'John Smith',
      email: 'john@example.com',
      phone: '123',
      projectType: 'kitchen',
      message: 'I want to renovate my kitchen.',
    };

    const result = contactFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('rejects message too short', () => {
    const invalidData = {
      name: 'John Smith',
      email: 'john@example.com',
      projectType: 'kitchen',
      message: 'Too short',
    };

    const result = contactFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('at least 10 characters');
    }
  });

  it('rejects invalid project type', () => {
    const invalidData = {
      name: 'John Smith',
      email: 'john@example.com',
      projectType: 'invalid_type',
      message: 'I want to renovate my kitchen.',
    };

    const result = contactFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('accepts all valid project types including room types from visualizer', () => {
    const projectTypes = ['kitchen', 'bathroom', 'basement', 'flooring', 'other', 'living_room', 'bedroom', 'dining_room', 'painting', 'exterior'];

    projectTypes.forEach((projectType) => {
      const data = {
        name: 'John Smith',
        email: 'john@example.com',
        projectType,
        message: 'I want to discuss a renovation project.',
      };

      const result = contactFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});

describe('Lead Extraction Schemas', () => {
  describe('ProjectTypeSchema', () => {
    it('accepts all valid project types including visualizer room types', () => {
      const validTypes = ['kitchen', 'bathroom', 'basement', 'flooring', 'painting', 'exterior', 'other', 'living_room', 'bedroom', 'dining_room'];

      validTypes.forEach((type) => {
        const result = ProjectTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid project type', () => {
      const result = ProjectTypeSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('FinishLevelSchema', () => {
    it('accepts valid finish levels', () => {
      const validLevels = ['economy', 'standard', 'premium'];

      validLevels.forEach((level) => {
        const result = FinishLevelSchema.safeParse(level);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid finish level', () => {
      const result = FinishLevelSchema.safeParse('luxury');
      expect(result.success).toBe(false);
    });
  });

  describe('TimelineSchema', () => {
    it('accepts valid timelines', () => {
      const validTimelines = ['asap', '1_3_months', '3_6_months', '6_plus_months', 'just_exploring'];

      validTimelines.forEach((timeline) => {
        const result = TimelineSchema.safeParse(timeline);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('BudgetBandSchema', () => {
    it('accepts valid budget bands', () => {
      const validBands = ['under_15k', '15k_25k', '25k_40k', '40k_60k', '60k_plus', 'not_sure'];

      validBands.forEach((band) => {
        const result = BudgetBandSchema.safeParse(band);
        expect(result.success).toBe(true);
      });
    });
  });
});

describe('Room Analysis Schemas', () => {
  describe('RoomTypeSchema', () => {
    it('accepts valid room types', () => {
      const validTypes = ['kitchen', 'bathroom', 'bedroom', 'living_room', 'basement', 'exterior', 'other'];

      validTypes.forEach((type) => {
        const result = RoomTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('ConditionSchema', () => {
    it('accepts valid condition values', () => {
      const validConditions = ['good', 'fair', 'needs_work', 'major_renovation_needed'];

      validConditions.forEach((condition) => {
        const result = ConditionSchema.safeParse(condition);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('RoomAnalysisSchema', () => {
    it('validates complete room analysis', () => {
      const validAnalysis = {
        roomType: 'kitchen',
        confidence: 0.95,
        currentCondition: 'fair',
        identifiedFeatures: ['cabinets', 'countertops', 'sink'],
        estimatedSize: '150 sqft',
        suggestedImprovements: ['Update cabinets', 'Replace countertops'],
        potentialChallenges: ['Limited electrical outlets'],
      };

      const result = RoomAnalysisSchema.safeParse(validAnalysis);
      expect(result.success).toBe(true);
    });

    it('validates minimal room analysis', () => {
      const minimalAnalysis = {
        roomType: 'bathroom',
        confidence: 0.8,
        currentCondition: 'good',
        identifiedFeatures: ['vanity', 'toilet'],
        estimatedSize: null,
      };

      const result = RoomAnalysisSchema.safeParse(minimalAnalysis);
      expect(result.success).toBe(true);
    });

    it('rejects confidence outside 0-1 range', () => {
      const invalidAnalysis = {
        roomType: 'kitchen',
        confidence: 1.5,
        currentCondition: 'good',
        identifiedFeatures: [],
        estimatedSize: null,
      };

      const result = RoomAnalysisSchema.safeParse(invalidAnalysis);
      expect(result.success).toBe(false);
    });
  });
});

describe('LeadExtractionSchema', () => {
  it('validates complete lead extraction', () => {
    const validLead = {
      projectType: 'kitchen',
      scopeDescription: 'Complete kitchen renovation including new cabinets, countertops, and appliances.',
      areaSqft: 150,
      finishLevel: 'standard',
      timeline: '1_3_months',
      budgetBand: '25k_40k',
      specialRequirements: ['Keep existing layout', 'Need dishwasher'],
      concernsOrQuestions: ['How long will it take?'],
      estimatedCostRange: {
        low: 25000,
        high: 40000,
        confidence: 0.7,
        breakdown: {
          materials: 15000,
          labor: 12000,
          hst: 3510,
        },
      },
      uncertainties: ['Final material selections'],
      contact: {
        name: 'John Smith',
        email: 'john@example.com',
        phone: '519-555-1234',
        address: '123 Main St, Stratford',
        postalCode: 'N5A 1A1',
      },
    };

    const result = LeadExtractionSchema.safeParse(validLead);
    expect(result.success).toBe(true);
  });

  it('validates lead with null optional fields', () => {
    const minimalLead = {
      projectType: 'bathroom',
      scopeDescription: 'Bathroom refresh - new vanity and fixtures.',
      areaSqft: null,
      finishLevel: null,
      timeline: null,
      budgetBand: null,
      specialRequirements: [],
      concernsOrQuestions: [],
      estimatedCostRange: null,
      uncertainties: [],
      contact: {
        name: null,
        email: null,
        phone: null,
        address: null,
        postalCode: null,
      },
    };

    const result = LeadExtractionSchema.safeParse(minimalLead);
    expect(result.success).toBe(true);
  });

  it('rejects scope description too short', () => {
    const invalidLead = {
      projectType: 'kitchen',
      scopeDescription: 'Short',
      areaSqft: null,
      finishLevel: null,
      timeline: null,
      budgetBand: null,
      specialRequirements: [],
      concernsOrQuestions: [],
      estimatedCostRange: null,
      uncertainties: [],
      contact: {
        name: null,
        email: null,
        phone: null,
        address: null,
        postalCode: null,
      },
    };

    const result = LeadExtractionSchema.safeParse(invalidLead);
    expect(result.success).toBe(false);
  });

  it('rejects negative area', () => {
    const invalidLead = {
      projectType: 'kitchen',
      scopeDescription: 'Complete kitchen renovation with new cabinets.',
      areaSqft: -100,
      finishLevel: null,
      timeline: null,
      budgetBand: null,
      specialRequirements: [],
      concernsOrQuestions: [],
      estimatedCostRange: null,
      uncertainties: [],
      contact: {
        name: null,
        email: null,
        phone: null,
        address: null,
        postalCode: null,
      },
    };

    const result = LeadExtractionSchema.safeParse(invalidLead);
    expect(result.success).toBe(false);
  });

  it('rejects invalid email in contact', () => {
    const invalidLead = {
      projectType: 'kitchen',
      scopeDescription: 'Complete kitchen renovation with new cabinets.',
      areaSqft: 150,
      finishLevel: null,
      timeline: null,
      budgetBand: null,
      specialRequirements: [],
      concernsOrQuestions: [],
      estimatedCostRange: null,
      uncertainties: [],
      contact: {
        name: 'John Smith',
        email: 'not-valid-email',
        phone: null,
        address: null,
        postalCode: null,
      },
    };

    const result = LeadExtractionSchema.safeParse(invalidLead);
    expect(result.success).toBe(false);
  });
});
