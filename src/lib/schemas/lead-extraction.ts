/**
 * Lead Extraction Schema
 * Zod schema for extracting lead data from conversations
 */

import { z } from 'zod';

/**
 * Project type enum
 */
export const ProjectTypeSchema = z.enum([
  'kitchen',
  'bathroom',
  'basement',
  'flooring',
  'painting',
  'exterior',
  'other',
  'living_room',
  'bedroom',
  'dining_room',
]);

/**
 * Finish level enum
 */
export const FinishLevelSchema = z.enum(['economy', 'standard', 'premium']);

/**
 * Timeline enum
 */
export const TimelineSchema = z.enum([
  'asap',
  '1_3_months',
  '3_6_months',
  '6_plus_months',
  'just_exploring',
]);

/**
 * Budget band enum
 */
export const BudgetBandSchema = z.enum([
  'under_15k',
  '15k_25k',
  '25k_40k',
  '40k_60k',
  '60k_plus',
  'not_sure',
]);

/**
 * Estimate breakdown schema
 */
export const EstimateBreakdownSchema = z.object({
  materials: z.number().nonnegative(),
  labor: z.number().nonnegative(),
  hst: z.number().nonnegative(),
});

/**
 * Estimated cost range schema
 */
export const EstimatedCostRangeSchema = z.object({
  low: z.number().positive(),
  high: z.number().positive(),
  confidence: z.number().min(0).max(1),
  breakdown: EstimateBreakdownSchema,
});

/**
 * Property type enum for Ontario-specific fields
 */
export const PropertyTypeSchema = z.enum([
  'detached',
  'semi',
  'townhouse',
  'condo',
  'other',
]);

/**
 * Property age enum
 */
export const PropertyAgeSchema = z.enum([
  'new',
  '0-10',
  '10-25',
  '25-50',
  '50+',
]);

/**
 * Contact schema
 */
export const ExtractedContactSchema = z.object({
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  postalCode: z.string().nullable(),
});

/**
 * Ontario-specific property fields
 */
export const OntarioPropertyFieldsSchema = z.object({
  propertyType: PropertyTypeSchema.optional(),
  propertyAge: PropertyAgeSchema.optional(),
  isOwner: z.boolean().optional(),
  hasHOA: z.boolean().optional(),
  hoaRestrictions: z.string().optional(),
  permitAware: z.boolean().optional(),
  preferredStartDate: z.string().optional(),
  accessNotes: z.string().optional(),
});

/**
 * Full lead extraction schema
 */
export const LeadExtractionSchema = z.object({
  projectType: ProjectTypeSchema,
  scopeDescription: z.string().min(10).max(2000),
  areaSqft: z.number().positive().nullable(),
  finishLevel: FinishLevelSchema.nullable(),
  timeline: TimelineSchema.nullable(),
  budgetBand: BudgetBandSchema.nullable(),
  specialRequirements: z.array(z.string()),
  concernsOrQuestions: z.array(z.string()),
  estimatedCostRange: EstimatedCostRangeSchema.nullable(),
  uncertainties: z.array(z.string()),
  contact: ExtractedContactSchema,
  // Ontario-specific fields
  property: OntarioPropertyFieldsSchema.optional(),
});

export type LeadExtraction = z.infer<typeof LeadExtractionSchema>;
export type OntarioPropertyFields = z.infer<typeof OntarioPropertyFieldsSchema>;

/**
 * Partial lead extraction for incomplete conversations
 */
export const PartialLeadExtractionSchema = LeadExtractionSchema.partial();

export type PartialLeadExtraction = z.infer<typeof PartialLeadExtractionSchema>;
