/**
 * Contractor Intake AI Extraction
 * Extracts structured renovation lead data from contractor's spoken or typed notes.
 */

import { generateObject } from 'ai';
import { openai } from './providers';
import { IntakeExtractionSchema, type IntakeExtraction } from '../schemas/intake';

const SYSTEM_PROMPT = `You are extracting structured renovation lead data from a contractor's spoken or typed notes. The contractor is a domain expert — trust material specifics, dimensions, and trade terminology. Extract what's explicitly stated; do not infer missing fields. Always generate a goalsText summary of the described work.

Ontario renovation context: HST is 13%, common permit requirements for structural/electrical/plumbing work, WSIB compliance expected.`;

/**
 * Extract structured lead fields from raw contractor notes (voice transcript or typed text).
 */
export async function extractIntakeFields(rawInput: string): Promise<IntakeExtraction> {
  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: IntakeExtractionSchema,
    system: SYSTEM_PROMPT,
    prompt: `Extract structured lead data from these contractor notes:\n\n${rawInput}`,
    temperature: 0.1,
    maxOutputTokens: 1024,
  });
  return object;
}
