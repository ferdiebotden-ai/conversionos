/**
 * Conversation Schemas
 * Zod schemas for conversation state and data
 */

import { z } from 'zod';

/**
 * Conversation state enum
 */
export const ConversationStateSchema = z.enum([
  'welcome',
  'photo_analysis',
  'project_type',
  'kitchen_questions',
  'bathroom_questions',
  'basement_questions',
  'flooring_questions',
  'other_questions',
  'scope_summary',
  'estimate_display',
  'contact_capture',
  'completion',
]);

export type ConversationState = z.infer<typeof ConversationStateSchema>;

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

export type ProjectType = z.infer<typeof ProjectTypeSchema>;

/**
 * Finish level enum
 */
export const FinishLevelSchema = z.enum(['economy', 'standard', 'premium']);

export type FinishLevel = z.infer<typeof FinishLevelSchema>;

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

export type Timeline = z.infer<typeof TimelineSchema>;

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

export type BudgetBand = z.infer<typeof BudgetBandSchema>;

/**
 * Contact information schema
 */
export const ContactInfoSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/)
    .optional(),
  address: z.string().optional(),
  postalCode: z
    .string()
    .regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/)
    .optional(),
});

export type ContactInfo = z.infer<typeof ContactInfoSchema>;

/**
 * Estimate breakdown schema
 */
export const EstimateBreakdownSchema = z.object({
  materials: z.number().nonnegative(),
  labor: z.number().nonnegative(),
  hst: z.number().nonnegative(),
});

export type EstimateBreakdown = z.infer<typeof EstimateBreakdownSchema>;

/**
 * Estimate range schema
 */
export const EstimateRangeSchema = z.object({
  low: z.number().positive(),
  high: z.number().positive(),
  confidence: z.number().min(0).max(1),
  breakdown: EstimateBreakdownSchema,
});

export type EstimateRange = z.infer<typeof EstimateRangeSchema>;

/**
 * Conversation data schema - all data collected during conversation
 */
export const ConversationDataSchema = z.object({
  projectType: ProjectTypeSchema.optional(),
  scopeDescription: z.string().optional(),
  areaSqft: z.number().positive().optional(),
  finishLevel: FinishLevelSchema.optional(),
  timeline: TimelineSchema.optional(),
  budgetBand: BudgetBandSchema.optional(),
  specialRequirements: z.array(z.string()).optional(),
  concernsOrQuestions: z.array(z.string()).optional(),
  estimatedCostRange: EstimateRangeSchema.optional(),
  uncertainties: z.array(z.string()).optional(),
  contact: ContactInfoSchema.optional(),
  uploadedPhotos: z.array(z.string()).optional(),
  roomAnalysis: z
    .object({
      roomType: z.string(),
      confidence: z.number(),
      currentCondition: z.string(),
      identifiedFeatures: z.array(z.string()),
      estimatedSize: z.string().nullable(),
    })
    .optional(),
});

export type ConversationData = z.infer<typeof ConversationDataSchema>;

/**
 * Full conversation context schema
 */
export const ConversationContextSchema = z.object({
  state: ConversationStateSchema,
  hasPhoto: z.boolean(),
  photoAnalyzed: z.boolean(),
  scopeConfirmed: z.boolean(),
  estimateProvided: z.boolean(),
  contactCollected: z.boolean(),
  data: ConversationDataSchema,
});

export type ConversationContext = z.infer<typeof ConversationContextSchema>;

/**
 * Chat message schema
 */
export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  images: z.array(z.string()).optional(),
  createdAt: z.date().optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
