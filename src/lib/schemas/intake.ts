/**
 * Contractor Lead Intake Schemas
 * Zod schemas for voice dictation, text input, and form-based lead intake.
 */

import { z } from 'zod';

/**
 * Schema for AI-extracted fields from contractor's spoken or typed notes.
 * All fields optional except goalsText (always generated).
 */
export const IntakeExtractionSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  projectType: z.enum(['kitchen', 'bathroom', 'basement', 'flooring', 'painting', 'exterior', 'other']).optional(),
  areaSqft: z.number().positive().optional(),
  finishLevel: z.enum(['economy', 'standard', 'premium']).optional(),
  timeline: z.enum(['asap', '1_3_months', '3_6_months', '6_plus_months', 'just_exploring']).optional(),
  budgetBand: z.enum(['under_15k', '15k_25k', '25k_40k', '40k_60k', '60k_plus', 'not_sure']).optional(),
  goalsText: z.string(),
  specificMaterials: z.array(z.string()).optional(),
  structuralNotes: z.array(z.string()).optional(),
});

export type IntakeExtraction = z.infer<typeof IntakeExtractionSchema>;

/**
 * Schema for the intake API request body.
 * At minimum: name + email required. intakeMethod always required.
 */
export const IntakeRequestSchema = z.object({
  // Contact info (at minimum name + email required)
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  // Project info
  projectType: z.enum(['kitchen', 'bathroom', 'basement', 'flooring', 'painting', 'exterior', 'other']).optional(),
  areaSqft: z.number().positive().optional(),
  finishLevel: z.enum(['economy', 'standard', 'premium']).optional(),
  timeline: z.enum(['asap', '1_3_months', '3_6_months', '6_plus_months', 'just_exploring']).optional(),
  budgetBand: z.enum(['under_15k', '15k_25k', '25k_40k', '40k_60k', '60k_plus', 'not_sure']).optional(),
  goalsText: z.string().optional(),
  // Intake metadata
  rawInput: z.string().optional(),
  intakeMethod: z.enum(['voice_dictation', 'text_input', 'form']),
});

export type IntakeRequest = z.infer<typeof IntakeRequestSchema>;
