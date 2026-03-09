/**
 * Concept Pricing Analysis
 * Analyses AI-generated visualization images to identify visible materials,
 * finishes, and fixtures — then prices them from the Ontario pricing database.
 *
 * Also generates rich concept descriptions from the generated images.
 *
 * This is a unique differentiator — no competitor does post-generation
 * material identification + pricing from the rendered output.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { openai } from './providers';
import { AI_CONFIG } from './config';
import {
  MATERIAL_COSTS,
  calculateCostEstimate,
  type FinishLevel,
  type RoomCategory,
} from '../ai/knowledge/pricing-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IdentifiedMaterial {
  /** What was identified in the image */
  name: string;
  /** Material category from our pricing DB */
  category: string;
  /** Estimated quantity (e.g., "~40 sqft", "2 units") */
  estimatedQuantity: string;
  /** Price range from Ontario DB */
  priceRange: { low: number; high: number };
  /** Unit for the price */
  unit: string;
  /** Confidence in identification (0-1) */
  confidence: number;
}

export interface ConceptPricingAnalysis {
  /** Materials identified in the generated image */
  identifiedMaterials: IdentifiedMaterial[];
  /** Inferred finish level based on visible materials */
  inferredFinishLevel: FinishLevel;
  /** Total estimated material cost range */
  materialCostRange: { low: number; high: number };
  /** Total estimated labour cost range */
  labourCostRange: { low: number; high: number };
  /** Overall project cost estimate */
  totalEstimate: { low: number; high: number };
  /** Key changes visible in the design */
  visibleChanges: string[];
  /** Confidence in the overall analysis */
  overallConfidence: number;
}

export interface ConceptDescription {
  /** Short description (1-2 sentences) */
  shortDescription: string;
  /** Key design changes from the original */
  keyChanges: string[];
  /** Notable materials/finishes visible */
  notableMaterials: string[];
  /** Overall style mood */
  styleMood: string;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const ConceptAnalysisSchema = z.object({
  identifiedMaterials: z.array(z.object({
    name: z.string().describe('Material name as identified in the image (e.g., "quartz countertop", "subway tile backsplash")'),
    category: z.string().describe('Category: cabinetry, countertops, flooring, tile, fixtures, appliances, electrical, paint, millwork, hardware'),
    estimatedQuantity: z.string().describe('Rough quantity estimate (e.g., "~25 sqft", "1 unit", "~12 linear ft")'),
    confidence: z.number().min(0).max(1).describe('How confident you are this material is in the image'),
  })),
  inferredFinishLevel: z.enum(['economy', 'standard', 'premium']).describe('Overall finish level based on visible materials'),
  visibleChanges: z.array(z.string()).describe('Key changes visible compared to a typical unrenovated room of this type'),
  overallConfidence: z.number().min(0).max(1),
});

const ConceptDescriptionSchema = z.object({
  descriptions: z.array(z.object({
    shortDescription: z.string().describe('1-2 sentence description of this concept'),
    keyChanges: z.array(z.string()).describe('3-5 key design changes from a typical unrenovated room'),
    notableMaterials: z.array(z.string()).describe('2-4 notable materials/finishes visible'),
    styleMood: z.string().describe('One phrase describing the overall feel (e.g., "warm and inviting", "sleek and modern")'),
  })),
});

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Analyse a generated visualization concept for materials and pricing.
 * Uses GPT Vision to identify materials in the AI-generated image,
 * then prices them from the Ontario pricing database.
 *
 * Cost: ~$0.02-0.03 per concept
 */
export async function analyzeConceptForPricing(
  conceptImageUrl: string,
  roomType: string,
  style: string,
): Promise<ConceptPricingAnalysis> {
  // Build a compact material reference for the prompt
  const roomCategory = roomType as RoomCategory;
  const relevantMaterials = MATERIAL_COSTS
    .filter(m => m.applicableRooms.includes(roomCategory))
    .map(m => `${m.item} (${m.category}): $${m.costRange.low}-${m.costRange.high} ${m.unit}`)
    .join('\n');

  const { object } = await generateObject({
    model: openai(AI_CONFIG.openai.vision),
    schema: ConceptAnalysisSchema,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are a renovation cost analyst. Analyse this AI-generated ${roomType} renovation concept (${style} style).

Identify all visible materials, fixtures, and finishes in the image. For each, estimate the quantity needed.

Reference these Ontario material costs:
${relevantMaterials}

Be conservative with quantity estimates. Only identify materials you can clearly see.`,
          },
          {
            type: 'image',
            image: conceptImageUrl,
          },
        ],
      },
    ],
    maxOutputTokens: 1000,
  });

  // Match identified materials to our pricing database and calculate costs
  const identifiedMaterials: IdentifiedMaterial[] = object.identifiedMaterials.map(m => {
    const dbMatch = MATERIAL_COSTS.find(
      db => db.category === m.category && db.item.toLowerCase().includes(m.name.toLowerCase().split(' ')[0] ?? '')
    ) || MATERIAL_COSTS.find(
      db => db.category === m.category
    );

    return {
      name: m.name,
      category: m.category,
      estimatedQuantity: m.estimatedQuantity,
      priceRange: dbMatch
        ? { low: dbMatch.costRange.low, high: dbMatch.costRange.high }
        : { low: 0, high: 0 },
      unit: dbMatch?.unit || '$/unit',
      confidence: m.confidence,
    };
  });

  // Calculate cost ranges from the overall per-sqft database
  const estimate = calculateCostEstimate(roomType, object.inferredFinishLevel);

  // Calculate material cost totals from identified items
  let materialLow = 0;
  let materialHigh = 0;
  for (const m of identifiedMaterials) {
    if (m.confidence >= 0.5) {
      // Parse quantity to get a multiplier
      const qty = parseQuantity(m.estimatedQuantity);
      materialLow += m.priceRange.low * qty;
      materialHigh += m.priceRange.high * qty;
    }
  }

  // If material identification didn't produce useful numbers, fall back to per-sqft
  if (materialLow === 0 && estimate) {
    materialLow = estimate.baseLow * 0.55; // ~55% materials
    materialHigh = estimate.baseHigh * 0.55;
  }

  // Labour estimate based on typical material/labour split
  const labourLow = estimate ? estimate.baseLow * 0.45 : materialLow * 0.8;
  const labourHigh = estimate ? estimate.baseHigh * 0.45 : materialHigh * 0.8;

  return {
    identifiedMaterials,
    inferredFinishLevel: object.inferredFinishLevel,
    materialCostRange: { low: Math.round(materialLow), high: Math.round(materialHigh) },
    labourCostRange: { low: Math.round(labourLow), high: Math.round(labourHigh) },
    totalEstimate: estimate
      ? { low: estimate.totalLow, high: estimate.totalHigh }
      : { low: Math.round((materialLow + labourLow) * 1.243), high: Math.round((materialHigh + labourHigh) * 1.243) }, // 1.243 = 1.10 contingency × 1.13 HST
    visibleChanges: object.visibleChanges,
    overallConfidence: object.overallConfidence,
  };
}

/**
 * Generate rich descriptions for multiple visualization concepts in a single call.
 * Cost: ~$0.01 for all concepts combined.
 */
export async function generateConceptDescriptions(
  conceptImageUrls: string[],
  roomType: string,
  style: string,
): Promise<ConceptDescription[]> {
  if (conceptImageUrls.length === 0) return [];

  const imageContent = conceptImageUrls.map((url, i) => ([
    {
      type: 'text' as const,
      text: `Concept ${i + 1}:`,
    },
    {
      type: 'image' as const,
      image: url,
    },
  ])).flat();

  const { object } = await generateObject({
    model: openai(AI_CONFIG.openai.vision),
    schema: ConceptDescriptionSchema,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Describe each of these ${conceptImageUrls.length} ${roomType} renovation concepts (${style} style).
For each concept, provide:
- A vivid 1-2 sentence description
- 3-5 key design changes
- 2-4 notable materials/finishes you can see
- The overall style mood in one phrase

Be specific about what you see. These descriptions will be shown to homeowners.`,
          },
          ...imageContent,
        ],
      },
    ],
    maxOutputTokens: 1500,
  });

  return object.descriptions.map(d => ({
    shortDescription: d.shortDescription,
    keyChanges: d.keyChanges,
    notableMaterials: d.notableMaterials,
    styleMood: d.styleMood,
  }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a quantity string like "~25 sqft" or "2 units" to a number */
function parseQuantity(qty: string): number {
  const match = qty.match(/~?(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1] ?? '1') : 1;
}
