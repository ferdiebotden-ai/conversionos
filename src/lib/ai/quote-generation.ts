/**
 * AI Quote Generation Service
 * Uses Vercel AI SDK to generate renovation quote line items
 * [DEV-072, Phase 2]
 */

import { generateObject } from 'ai';
import { openai } from './providers';
import {
  AIGeneratedQuoteSchema,
  AITieredQuoteSchema,
  QuoteGenerationInputSchema,
  LINE_ITEM_TEMPLATES,
  type AIGeneratedQuote,
  type AITieredQuote,
  type QuoteGenerationInput,
} from '../schemas/ai-quote';
import {
  PRICING_GUIDELINES,
  BUSINESS_CONSTANTS,
  DEFAULT_SIZES,
  MATERIAL_SPLIT,
} from '../pricing/constants';
import { PRICING_FULL } from './knowledge/pricing';
import { getMaterialsForRoom, type RoomCategory, type FinishLevel } from './knowledge/pricing-data';
import type { CategoryMarkupsConfig } from '../pricing/category-markups';
import type { ContractorPrice } from '@/types/database';

/**
 * System prompt for quote generation — enriched with full Ontario pricing DB
 */
const QUOTE_GENERATION_SYSTEM_PROMPT = `You are an expert renovation cost estimator for a professional home renovation company in Ontario, Canada.

Your task is to generate specific, project-appropriate line items for renovation quotes based on the customer's conversation and project details.

${PRICING_FULL}

## Category Definitions
- materials: Physical products (lumber, drywall, fixtures, tile, etc.)
- labor: In-house labour
- contract: Subcontracted specialized trades (electrical, plumbing, HVAC)
- permit: Building permits and inspections
- equipment: Rental equipment (dumpsters, scaffolding, etc.)
- allowances: Customer selection allowances
- other: Miscellaneous items

## Line Item Principles
1. Be SPECIFIC to the project — don't use generic descriptions
2. Reference actual materials mentioned in the conversation
3. Include all necessary components for a complete job
4. Group related items appropriately
5. Labour should reflect actual work required
6. Contract labour is for specialized trades (electrical, plumbing, HVAC)

## Transparency Requirements
For EVERY line item, provide transparencyData showing:
1. roomAnalysis — what room features and dimensions informed this item
2. materialSelection — specific material/quality level chosen and why (reference finish level)
3. costBreakdown — quantity × unitCost = total for each component, using Ontario DB rates where available
4. markupApplied — category markup applied (label, percent, dollar amount). Use 0 if no markup.
5. dataSource — "Ontario Renovation Pricing Database" when using DB rates, "AI Estimate" otherwise
6. totalBeforeMarkup and totalAfterMarkup — the math must add up

## Cost Breakdown Rules
- Each costBreakdown line must have source: "ontario_db" if the unit cost comes from the Ontario pricing database, "ai_estimate" if estimated
- The sum of costBreakdown totals should equal totalBeforeMarkup
- totalAfterMarkup = totalBeforeMarkup + markupApplied.amount
- The line item total should match totalAfterMarkup

## Output Requirements
- Each line item must have a clear, descriptive name
- Totals must be realistic for the Ontario market
- Include aiReasoning explaining why this item is needed and how it's priced
- Confidence scores should reflect certainty (lower if info is missing)
- Assumptions should note anything you've assumed
- Exclusions should note what's NOT included

Be conservative with estimates — it's better to be slightly high than to under-quote.`;

/**
 * Build category markup instructions for the AI
 */
function buildMarkupInstructions(markups?: CategoryMarkupsConfig): string {
  if (!markups) {
    return `\n## Markup Policy
Apply the following markups by category:
- Materials: 15%
- Labour: 30%
- Contract Labour: 15%
- Equipment: 10%
- Permits: 0%
- Allowances: 0%
- Other: 10%`;
  }

  return `\n## Markup Policy (Contractor-Configured)
Apply these exact markups by category:
- Materials: ${markups.materials}%
- Labour: ${markups.labor}%
- Contract Labour: ${markups.contract}%
- Equipment: ${markups.equipment}%
- Permits: ${markups.permit}%
- Allowances: ${markups.allowances}%
- Other: ${markups.other}%`;
}

/**
 * Build contractor prices section for AI prompt.
 * Caps at 100 items to control prompt size.
 */
function buildContractorPricesSection(prices: ContractorPrice[]): string {
  if (prices.length === 0) return '';

  const capped = prices.slice(0, 100);
  const parts: string[] = [];

  parts.push(`\n## Contractor's Own Price List (PRIORITISE THESE)`);
  parts.push(`The contractor has uploaded their own pricing. Use these prices FIRST.`);
  parts.push(`Only fall back to Ontario DB prices for items NOT in this list.`);

  // Group by category
  const byCategory = new Map<string, ContractorPrice[]>();
  for (const p of capped) {
    const existing = byCategory.get(p.category) ?? [];
    existing.push(p);
    byCategory.set(p.category, existing);
  }

  for (const [cat, items] of byCategory) {
    parts.push(`\n**${cat}:**`);
    for (const item of items) {
      parts.push(`- ${item.item_name}: $${item.unit_price} / ${item.unit}${item.supplier ? ` (${item.supplier})` : ''}`);
    }
  }

  parts.push(`\nWhen using contractor prices, set transparencyData.dataSource to "Contractor Price List".`);

  return parts.join('\n');
}

/**
 * Build user prompt from input data
 */
function buildUserPrompt(
  input: QuoteGenerationInput,
  markups?: CategoryMarkupsConfig,
  contractorPrices?: ContractorPrice[],
): string {
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

  // Markup instructions
  parts.push(buildMarkupInstructions(markups));

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

  // Material reference filtered by project type
  const roomType = input.projectType as RoomCategory;
  const finishLevel = (input.finishLevel || 'standard') as FinishLevel;
  const materials = getMaterialsForRoom(roomType, finishLevel);
  if (materials.length > 0) {
    parts.push(`\n## Material Reference for ${input.projectType} (${finishLevel} finish)`);
    for (const m of materials) {
      const costKey = finishLevel === 'economy' ? 'low' : finishLevel === 'premium' ? 'high' : 'mid';
      parts.push(`- ${m.item}: $${m.costRange[costKey]} ${m.unit} (range: $${m.costRange.low}-$${m.costRange.high})`);
    }
  }

  // Calculate expected range
  const pricing = PRICING_GUIDELINES[input.projectType as keyof typeof PRICING_GUIDELINES];
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

  // Contractor's own prices (override Ontario DB defaults)
  if (contractorPrices && contractorPrices.length > 0) {
    parts.push(buildContractorPricesSection(contractorPrices));
  }

  parts.push(`\n## Instructions`);
  parts.push(`Generate specific line items for this ${input.projectType} renovation project.`);
  parts.push(`Make sure totals align with the expected range.`);
  parts.push(`Include all necessary materials, labour, and contract work.`);
  parts.push(`IMPORTANT: Every line item MUST include transparencyData with detailed cost breakdown.`);

  return parts.join('\n');
}

/**
 * Generate an AI quote for a renovation project
 */
export async function generateAIQuote(
  input: QuoteGenerationInput,
  markups?: CategoryMarkupsConfig,
  contractorPrices?: ContractorPrice[],
): Promise<AIGeneratedQuote> {
  // Validate input
  const validatedInput = QuoteGenerationInputSchema.parse(input);

  // Generate the quote
  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: AIGeneratedQuoteSchema,
    system: QUOTE_GENERATION_SYSTEM_PROMPT,
    prompt: buildUserPrompt(validatedInput, markups, contractorPrices),
    temperature: 0.3,
    maxOutputTokens: 4096,
  });

  return object;
}

/**
 * Regenerate quote with admin guidance
 */
export async function regenerateAIQuote(
  input: QuoteGenerationInput,
  adminGuidance: string,
  markups?: CategoryMarkupsConfig,
  contractorPrices?: ContractorPrice[],
): Promise<AIGeneratedQuote> {
  // Validate input
  const validatedInput = QuoteGenerationInputSchema.parse(input);

  const userPrompt = buildUserPrompt(validatedInput, markups, contractorPrices) + `

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
    maxOutputTokens: 4096,
  });

  return object;
}

/**
 * Generate a tiered (Good/Better/Best) AI quote
 */
export async function generateTieredAIQuote(
  input: QuoteGenerationInput,
  markups?: CategoryMarkupsConfig,
  contractorPrices?: ContractorPrice[],
): Promise<AITieredQuote> {
  const validatedInput = QuoteGenerationInputSchema.parse(input);

  const tieredSystemPrompt = QUOTE_GENERATION_SYSTEM_PROMPT + `

## Good/Better/Best Tier Definitions
Generate THREE tiers of pricing for this project:

### Good (Economy)
- Stock/builder-grade materials
- Basic fixtures and finishes
- Standard installation methods
- Functional but minimal design

### Better (Standard) — RECOMMENDED
- Mid-range, quality materials
- Upgraded fixtures and finishes
- Professional installation with attention to detail
- Good design with some custom elements

### Best (Premium)
- Designer-grade or custom materials
- High-end fixtures, premium finishes
- Expert installation with custom detailing
- Full design integration, luxury feel

## Tier Pricing Rules
- Better should be 20-30% above Good
- Best should be 40-60% above Good
- Descriptions must genuinely differ per tier (not just higher numbers)
- Each tier must be a complete, self-contained quote
- All three tiers must include transparency data for every item`;

  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: AITieredQuoteSchema,
    system: tieredSystemPrompt,
    prompt: buildUserPrompt(validatedInput, markups, contractorPrices),
    temperature: 0.3,
    maxOutputTokens: 6144,
  });

  return object;
}

/**
 * Regenerate a tiered quote with admin guidance
 */
export async function regenerateTieredAIQuote(
  input: QuoteGenerationInput,
  adminGuidance: string,
  markups?: CategoryMarkupsConfig,
  contractorPrices?: ContractorPrice[],
): Promise<AITieredQuote> {
  const validatedInput = QuoteGenerationInputSchema.parse(input);

  const tieredSystemPrompt = QUOTE_GENERATION_SYSTEM_PROMPT + `

## Good/Better/Best Tier Definitions
Generate THREE tiers: Good (economy), Better (standard, recommended), Best (premium).
Better 20-30% above Good, Best 40-60% above Good. Descriptions must differ per tier.`;

  const userPrompt = buildUserPrompt(validatedInput, markups, contractorPrices) + `

## Admin Guidance
${adminGuidance}

Please regenerate all three tiers incorporating this feedback.`;

  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: AITieredQuoteSchema,
    system: tieredSystemPrompt,
    prompt: userPrompt,
    temperature: 0.3,
    maxOutputTokens: 6144,
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
