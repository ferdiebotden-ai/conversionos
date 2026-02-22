/**
 * AI Quote Generation Service
 * Uses Vercel AI SDK to generate renovation quote line items
 * [DEV-072]
 */

import { generateObject } from 'ai';
import { openai } from './providers';
import {
  AIGeneratedQuoteSchema,
  QuoteGenerationInputSchema,
  LINE_ITEM_TEMPLATES,
  type AIGeneratedQuote,
  type QuoteGenerationInput,
} from '../schemas/ai-quote';
import {
  PRICING_GUIDELINES,
  BUSINESS_CONSTANTS,
  DEFAULT_SIZES,
  MATERIAL_SPLIT,
} from '../pricing/constants';

/**
 * System prompt for quote generation
 */
const QUOTE_GENERATION_SYSTEM_PROMPT = `You are an expert renovation cost estimator for a professional home renovation company.

Your task is to generate specific, project-appropriate line items for renovation quotes based on the customer's conversation and project details.

## Pricing Guidelines (per square foot)

### Kitchen Renovations
- Economy: $150-200/sqft
- Standard: $200-275/sqft
- Premium: $275-400/sqft

### Bathroom Renovations
- Economy: $200-300/sqft
- Standard: $300-450/sqft
- Premium: $450-600/sqft

### Basement Finishing
- Economy: $40-55/sqft
- Standard: $55-70/sqft
- Premium: $70-100/sqft

### Flooring
- Economy: $8-12/sqft
- Standard: $12-18/sqft
- Premium: $18-30/sqft

## Business Constants
- Internal labour rate: $85/hour
- Contract labour markup: 15%
- Material split varies by project (45-60% materials, remainder labour)

## Line Item Principles
1. Be SPECIFIC to the project - don't use generic descriptions
2. Reference actual materials mentioned in the conversation
3. Include all necessary components for a complete job
4. Group related items appropriately
5. Labour should reflect actual work required
6. Contract labour is for specialized trades (electrical, plumbing, HVAC)

## Category Definitions
- materials: Physical products (lumber, drywall, fixtures, tile, etc.)
- labor: In-house labour
- contract: Subcontracted specialized trades
- permit: Building permits and inspections
- other: Miscellaneous items

## Output Requirements
- Each line item must have a clear, descriptive name
- Totals must be realistic for the Ontario market
- Include aiReasoning explaining why this item is needed and how it's priced
- Confidence scores should reflect certainty (lower if info is missing)
- Assumptions should note anything you've assumed
- Exclusions should note what's NOT included

Be conservative with estimates - it's better to be slightly high than to under-quote.`;

/**
 * Build user prompt from input data
 */
function buildUserPrompt(input: QuoteGenerationInput): string {
  const parts: string[] = [];

  // Project overview
  parts.push(`## Project Overview`);
  parts.push(`- Project Type: ${input.projectType}`);

  if (input.areaSqft) {
    parts.push(`- Area: ${input.areaSqft} square feet`);
  } else {
    const defaultSize = DEFAULT_SIZES[input.projectType as keyof typeof DEFAULT_SIZES];
    if (defaultSize) {
      parts.push(`- Area: Unknown (typical is ${defaultSize} sqft for ${input.projectType})`);
    }
  }

  if (input.finishLevel) {
    parts.push(`- Finish Level: ${input.finishLevel}`);
  } else {
    parts.push(`- Finish Level: standard (assumed)`);
  }

  if (input.city && input.province) {
    parts.push(`- Location: ${input.city}, ${input.province}`);
  }

  // Customer goals
  if (input.goalsText) {
    parts.push(`\n## Customer Goals`);
    parts.push(input.goalsText);
  }

  // Chat transcript
  if (input.chatTranscript && input.chatTranscript.length > 0) {
    parts.push(`\n## Conversation Transcript`);
    for (const msg of input.chatTranscript) {
      if (msg.role !== 'system') {
        parts.push(`${msg.role === 'user' ? 'Customer' : 'AI'}: ${msg.content}`);
      }
    }
  }

  // Reference templates
  const templates = LINE_ITEM_TEMPLATES[input.projectType as keyof typeof LINE_ITEM_TEMPLATES];
  if (templates) {
    parts.push(`\n## Example Line Items for ${input.projectType} (use as reference)`);
    for (const t of templates) {
      parts.push(`- ${t.description} (${t.category})`);
    }
  }

  // Calculate expected range
  const pricing = PRICING_GUIDELINES[input.projectType as keyof typeof PRICING_GUIDELINES];
  const finishLevel = input.finishLevel || 'standard';
  const area = input.areaSqft || DEFAULT_SIZES[input.projectType as keyof typeof DEFAULT_SIZES] || 100;

  if (pricing) {
    const priceRange = pricing[finishLevel as keyof typeof pricing];
    if (priceRange) {
      const low = priceRange.min * area;
      const high = priceRange.max * area;
      parts.push(`\n## Expected Range`);
      parts.push(`Based on ${area} sqft at ${finishLevel} finish: $${low.toLocaleString()} - $${high.toLocaleString()}`);
      parts.push(`Your line items should sum to approximately $${Math.round((low + high) / 2).toLocaleString()} (midpoint)`);
    }
  }

  parts.push(`\n## Instructions`);
  parts.push(`Generate specific line items for this ${input.projectType} renovation project.`);
  parts.push(`Make sure totals align with the expected range.`);
  parts.push(`Include all necessary materials, labour, and contract work.`);

  return parts.join('\n');
}

/**
 * Generate an AI quote for a renovation project
 */
export async function generateAIQuote(
  input: QuoteGenerationInput
): Promise<AIGeneratedQuote> {
  // Validate input
  const validatedInput = QuoteGenerationInputSchema.parse(input);

  // Generate the quote
  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: AIGeneratedQuoteSchema,
    system: QUOTE_GENERATION_SYSTEM_PROMPT,
    prompt: buildUserPrompt(validatedInput),
    temperature: 0.3, // Lower temperature for more consistent pricing
    maxOutputTokens: 2048,
  });

  return object;
}

/**
 * Regenerate quote with admin guidance
 */
export async function regenerateAIQuote(
  input: QuoteGenerationInput,
  adminGuidance: string
): Promise<AIGeneratedQuote> {
  // Validate input
  const validatedInput = QuoteGenerationInputSchema.parse(input);

  const userPrompt = buildUserPrompt(validatedInput) + `

## Admin Guidance
The admin has requested the following adjustments to the quote:
${adminGuidance}

Please regenerate the quote incorporating this feedback.`;

  // Generate the quote
  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: AIGeneratedQuoteSchema,
    system: QUOTE_GENERATION_SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.3,
    maxOutputTokens: 2048,
  });

  return object;
}

/**
 * Convert AI quote line items to database format
 */
export function convertAIQuoteToLineItems(
  aiQuote: AIGeneratedQuote
): Array<{
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}> {
  return aiQuote.lineItems.map((item) => ({
    description: item.description,
    category: item.category,
    quantity: 1,
    unit: 'lot',
    unit_price: item.total,
    total: item.total,
  }));
}

/**
 * Calculate quote totals from AI line items
 */
export function calculateAIQuoteTotals(aiQuote: AIGeneratedQuote): {
  subtotal: number;
  contingency: number;
  hst: number;
  total: number;
  depositRequired: number;
} {
  const subtotal = aiQuote.lineItems.reduce((sum, item) => sum + item.total, 0);
  const contingency = subtotal * BUSINESS_CONSTANTS.contingencyRate;
  const subtotalWithContingency = subtotal + contingency;
  const hst = subtotalWithContingency * BUSINESS_CONSTANTS.hstRate;
  const total = subtotalWithContingency + hst;
  const depositRequired = total * BUSINESS_CONSTANTS.depositRate;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    contingency: Math.round(contingency * 100) / 100,
    hst: Math.round(hst * 100) / 100,
    total: Math.round(total * 100) / 100,
    depositRequired: Math.round(depositRequired * 100) / 100,
  };
}
