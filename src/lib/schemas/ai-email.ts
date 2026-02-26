/**
 * AI Email Generation Schemas
 * Zod schemas for AI-generated email content
 * [DEV-072]
 */

import { z } from 'zod';

/**
 * AI-generated email content
 */
export const AIEmailSchema = z.object({
  /** Email subject line */
  subject: z.string().min(10).max(100),

  /** Personalized greeting */
  greeting: z.string().max(100),

  /** Body paragraphs */
  bodyParagraphs: z.array(z.string().max(500)).min(1).max(5),

  /** Call to action */
  callToAction: z.string().max(200),

  /** Professional closing */
  closing: z.string().max(100),
});

export type AIEmail = z.infer<typeof AIEmailSchema>;

/**
 * Input context for email generation
 */
export const EmailGenerationInputSchema = z.object({
  /** Customer's first name */
  customerName: z.string(),

  /** Project type */
  projectType: z.string(),

  /** Quote total */
  quoteTotal: z.number(),

  /** Deposit required */
  depositRequired: z.number(),

  /** Number of line items */
  lineItemCount: z.number(),

  /** Optional special notes from the quote */
  specialNotes: z.string().optional(),

  /** Whether this is a resend */
  isResend: z.boolean().optional(),

  /** Goals/scope from customer conversation */
  goalsText: z.string().optional(),

  /** Whether this lead was created by the contractor (not a customer self-serve) */
  isContractorIntake: z.boolean().optional(),
});

export type EmailGenerationInput = z.infer<typeof EmailGenerationInputSchema>;

/**
 * Complete email content ready for sending
 */
export interface FormattedEmail {
  subject: string;
  htmlBody: string;
  textBody: string;
}
