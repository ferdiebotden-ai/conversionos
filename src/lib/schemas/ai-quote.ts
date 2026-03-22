/**
 * AI Quote Generation Schemas
 * Zod schemas for AI-generated quote line items and structures
 * [DEV-072]
 */

import { z } from 'zod';
import { TransparencyBreakdownSchema } from './transparency';

/**
 * Categories for quote line items
 */
export const LineItemCategorySchema = z.enum([
  'materials',
  'labor',
  'contract',
  'permit',
  'equipment',
  'allowances',
  'other',
]);

export type LineItemCategory = z.infer<typeof LineItemCategorySchema>;

/**
 * Single AI-generated line item
 */
export const AIQuoteLineItemSchema = z.object({
  /** Human-readable description (e.g., "R24 Insulation for exterior walls") */
  description: z.string().min(5).max(200),

  /** Category for grouping */
  category: LineItemCategorySchema,

  /** Total cost for this line item */
  total: z.number().positive(),

  /** AI's reasoning for including this item and pricing */
  aiReasoning: z.string().max(500),

  /** Confidence score 0-1 for this specific item */
  confidenceScore: z.number().min(0).max(1),

  /** Transparency breakdown — "show the math" for this item */
  transparencyData: TransparencyBreakdownSchema,
});

export type AIQuoteLineItem = z.infer<typeof AIQuoteLineItemSchema>;

/**
 * Complete AI-generated quote structure
 * NOTE: All fields must be required (not optional) for OpenAI structured output compatibility.
 * Use empty strings or empty arrays for "optional" data.
 */
export const AIGeneratedQuoteSchema = z.object({
  /** Individual line items */
  lineItems: z.array(AIQuoteLineItemSchema).min(1).max(25),

  /** Assumptions the quote is based on */
  assumptions: z.array(z.string().max(200)).max(10),

  /** Items explicitly not included */
  exclusions: z.array(z.string().max(200)).max(10),

  /** Professional notes or recommendations (use empty string if none) */
  professionalNotes: z.string().max(500),

  /** Overall confidence in the quote (0-1) */
  overallConfidence: z.number().min(0).max(1),

  /** Summary of how the total was calculated (use empty string if none) */
  calculationSummary: z.string().max(300),
});

export type AIGeneratedQuote = z.infer<typeof AIGeneratedQuoteSchema>;

/**
 * Input context for quote generation
 */
export const QuoteGenerationInputSchema = z.object({
  /** Project type */
  projectType: z.enum(['kitchen', 'bathroom', 'basement', 'flooring', 'painting', 'exterior', 'other', 'living_room', 'bedroom', 'dining_room']),

  /** Square footage if known */
  areaSqft: z.number().positive().optional(),

  /** Finish level */
  finishLevel: z.enum(['economy', 'standard', 'premium']).optional(),

  /** Chat transcript for context */
  chatTranscript: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional(),

  /** Goals/scope text from customer */
  goalsText: z.string().optional(),

  /** Customer location for regional pricing */
  city: z.string().optional(),
  province: z.string().optional(),

  /** AI concept pricing from visualization analysis */
  conceptPricing: z.object({
    identifiedMaterials: z.array(z.object({
      name: z.string(),
      category: z.string(),
      estimatedQuantity: z.string(),
      priceRange: z.object({ low: z.number(), high: z.number() }),
      unit: z.string(),
    })),
    inferredFinishLevel: z.enum(['economy', 'standard', 'premium']),
    materialCostRange: z.object({ low: z.number(), high: z.number() }),
    labourCostRange: z.object({ low: z.number(), high: z.number() }),
    totalEstimate: z.object({ low: z.number(), high: z.number() }),
    visibleChanges: z.array(z.string()),
  }).optional(),
});

export type QuoteGenerationInput = z.infer<typeof QuoteGenerationInputSchema>;

/**
 * Line item template for common renovation tasks
 * Used as examples for the AI
 */
export const LINE_ITEM_TEMPLATES = {
  basement: [
    { description: 'Electrical Supplies', category: 'materials' as const },
    { description: 'R24 Insulation', category: 'materials' as const },
    { description: 'Drywall Supplies', category: 'materials' as const },
    { description: 'Paint Supplies', category: 'materials' as const },
    { description: 'Carpet and Installation', category: 'materials' as const },
    { description: 'Interior Doors and Hardware', category: 'materials' as const },
    { description: 'Door Casings and Baseboards', category: 'materials' as const },
    { description: 'Labour', category: 'labor' as const },
    { description: 'Contract Labour', category: 'contract' as const },
  ],
  kitchen: [
    { description: 'Cabinetry', category: 'materials' as const },
    { description: 'Countertops', category: 'materials' as const },
    { description: 'Backsplash Tile and Installation', category: 'materials' as const },
    { description: 'Plumbing Fixtures', category: 'materials' as const },
    { description: 'Electrical and Lighting', category: 'materials' as const },
    { description: 'Flooring', category: 'materials' as const },
    { description: 'Paint Supplies', category: 'materials' as const },
    { description: 'Appliance Installation', category: 'labor' as const },
    { description: 'Labour', category: 'labor' as const },
    { description: 'Contract Labour', category: 'contract' as const },
  ],
  bathroom: [
    { description: 'Vanity and Countertop', category: 'materials' as const },
    { description: 'Toilet', category: 'materials' as const },
    { description: 'Bathtub/Shower', category: 'materials' as const },
    { description: 'Tile and Installation', category: 'materials' as const },
    { description: 'Plumbing Fixtures', category: 'materials' as const },
    { description: 'Electrical and Lighting', category: 'materials' as const },
    { description: 'Paint Supplies', category: 'materials' as const },
    { description: 'Labour', category: 'labor' as const },
    { description: 'Contract Labour', category: 'contract' as const },
  ],
  flooring: [
    { description: 'Flooring Material', category: 'materials' as const },
    { description: 'Underlayment', category: 'materials' as const },
    { description: 'Transitions and Trim', category: 'materials' as const },
    { description: 'Labour', category: 'labor' as const },
  ],
} as const;

/**
 * Single tier in a Good/Better/Best quote
 */
export const AITierSchema = z.object({
  /** Tier display label (e.g., "Economy Finish") */
  label: z.string().min(1).max(100),

  /** Short description of what this tier includes */
  description: z.string().min(1).max(300),

  /** Finish level for this tier */
  finishLevel: z.enum(['economy', 'standard', 'premium']),

  /** Line items for this tier */
  lineItems: z.array(AIQuoteLineItemSchema).min(1).max(25),
});

export type AITier = z.infer<typeof AITierSchema>;

/**
 * Tiered AI-generated quote — Good/Better/Best
 * Single AI call produces all three tiers.
 */
export const AITieredQuoteSchema = z.object({
  tiers: z.object({
    good: AITierSchema,
    better: AITierSchema,
    best: AITierSchema,
  }),

  /** Assumptions the quote is based on */
  assumptions: z.array(z.string().max(200)).max(10),

  /** Items explicitly not included */
  exclusions: z.array(z.string().max(200)).max(10),

  /** Professional notes or recommendations */
  professionalNotes: z.string().max(500),

  /** Overall confidence in the quote (0-1) */
  overallConfidence: z.number().min(0).max(1),

  /** Summary of how the total was calculated */
  calculationSummary: z.string().max(300),
});

export type AITieredQuote = z.infer<typeof AITieredQuoteSchema>;
