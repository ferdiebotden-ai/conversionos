/**
 * Transparency Breakdown Schemas
 * Zod schemas for "show the math" line item transparency data
 * [DEV-072 Phase 2]
 */

import { z } from 'zod';

/**
 * Data source for a cost line
 */
export const CostSourceSchema = z.enum([
  'ontario_db',
  'contractor_uploaded',
  'ai_estimate',
]);

export type CostSource = z.infer<typeof CostSourceSchema>;

/**
 * Single cost breakdown line (one component of a line item)
 */
export const CostLineSchema = z.object({
  /** What this cost component is (e.g., "Subway tile") */
  label: z.string().min(1).max(100),

  /** Quantity (e.g., 45) */
  quantity: z.number().nonnegative(),

  /** Unit (e.g., "sqft", "hours", "units") */
  unit: z.string().min(1).max(20),

  /** Cost per unit (e.g., 8.50) */
  unitCost: z.number().nonnegative(),

  /** Total for this line (quantity × unitCost) */
  total: z.number().nonnegative(),

  /** Where this price came from */
  source: CostSourceSchema,
});

export type CostLine = z.infer<typeof CostLineSchema>;

/**
 * Markup applied to a line item
 */
export const MarkupAppliedSchema = z.object({
  /** Markup percentage (e.g., 30) */
  percent: z.number().min(0).max(100),

  /** Dollar amount of markup */
  amount: z.number().nonnegative(),

  /** Label (e.g., "Labour markup") */
  label: z.string().max(100),
});

export type MarkupApplied = z.infer<typeof MarkupAppliedSchema>;

/**
 * Full transparency breakdown for a single line item
 * All fields required — OpenAI structured output constraint.
 */
export const TransparencyBreakdownSchema = z.object({
  /** Room analysis — what features informed this item */
  roomAnalysis: z.string().min(1).max(500),

  /** Material selection rationale — quality level and why */
  materialSelection: z.string().min(1).max(500),

  /** Cost breakdown — the actual math */
  costBreakdown: z.array(CostLineSchema).min(1).max(10),

  /** Markup applied to this item */
  markupApplied: MarkupAppliedSchema,

  /** Where the pricing data comes from */
  dataSource: z.string().min(1).max(100),

  /** Total before markup */
  totalBeforeMarkup: z.number().nonnegative(),

  /** Total after markup */
  totalAfterMarkup: z.number().nonnegative(),
});

export type TransparencyBreakdown = z.infer<typeof TransparencyBreakdownSchema>;
