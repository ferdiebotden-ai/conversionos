/**
 * Scope-of-Work Analysis
 * Single GPT-5.4 vision call comparing before and after images to identify
 * what changed, what's new, what's kept, and what's relocated.
 *
 * Cost: ~$0.03 per analysis (two images + structured output)
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { openai } from './providers';
import { AI_CONFIG } from './config';
import type { BeforeScope } from './before-image-pricing-analysis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScopeOfWork {
  /** Items that must be demolished/removed */
  demolition: { item: string; estimatedHours: number; trade: string }[];
  /** New items being installed */
  newInstallation: { item: string; material: string; category: string; trade: string; estimatedHours: number }[];
  /** Items retained from the original room */
  retained: { item: string; reason: string }[];
  /** Structural modifications required */
  structural: { item: string; permitRequired: boolean; reason: string }[];
  /** Items being moved to a new location */
  relocation: { item: string; trade: string; estimatedHours: number }[];
}

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const ScopeOfWorkSchema = z.object({
  demolition: z.array(z.object({
    item: z.string().describe('What needs to be removed (e.g., "existing laminate countertop", "old wall tile")'),
    estimatedHours: z.number().describe('Estimated labour hours for removal'),
    trade: z.string().describe('Trade responsible (e.g., "Demolition", "Plumber", "Electrician")'),
  })),
  newInstallation: z.array(z.object({
    item: z.string().describe('What is being installed (e.g., "quartz countertop", "subway tile backsplash")'),
    material: z.string().describe('Material type (e.g., "quartz", "ceramic tile", "engineered hardwood")'),
    category: z.string().describe('Category: cabinetry, countertops, flooring, tile, fixtures, appliances, electrical, plumbing, paint, millwork, hardware, drywall'),
    trade: z.string().describe('Trade responsible for installation'),
    estimatedHours: z.number().describe('Estimated labour hours for installation'),
  })),
  retained: z.array(z.object({
    item: z.string().describe('Item being kept from the original room'),
    reason: z.string().describe('Why it is being kept (e.g., "structural", "good condition", "matches new design")'),
  })),
  structural: z.array(z.object({
    item: z.string().describe('Structural modification (e.g., "remove wall between kitchen and dining", "add support beam")'),
    permitRequired: z.boolean().describe('Whether this requires a building permit in Ontario'),
    reason: z.string().describe('Why this structural work is needed'),
  })),
  relocation: z.array(z.object({
    item: z.string().describe('Item being moved (e.g., "sink relocated to island", "electrical panel moved")'),
    trade: z.string().describe('Trade responsible for relocation'),
    estimatedHours: z.number().describe('Estimated labour hours for relocation'),
  })),
});

// ---------------------------------------------------------------------------
// Main Function
// ---------------------------------------------------------------------------

/**
 * Analyse before and after images to derive a detailed scope of work.
 * Single GPT-5.4 vision call with both images.
 *
 * @param beforeImageUrl - URL or base64 of the original room photo
 * @param afterImageUrl - URL or base64 of the AI-generated renovation concept
 * @param beforeScope - Pre-computed BeforeScope from photo analysis (provides context)
 * @param roomType - Type of room (kitchen, bathroom, etc.)
 * @returns Detailed scope of work broken down by category
 */
export async function analyzeBeforeAfterScope(
  beforeImageUrl: string,
  afterImageUrl: string,
  beforeScope: BeforeScope,
  roomType: string,
): Promise<ScopeOfWork> {
  const contextSummary = buildContextSummary(beforeScope);

  const { object } = await generateObject({
    model: openai(AI_CONFIG.openai.vision),
    schema: ScopeOfWorkSchema,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are an Ontario renovation estimator. Compare these two images of a ${roomType}:
- Image 1 (BEFORE): The current state of the room
- Image 2 (AFTER): The proposed renovation design

Pre-analysis of the before image:
${contextSummary}

For each change between before and after, categorise it as:
1. **Demolition**: What existing items need to be removed
2. **New Installation**: What new materials/fixtures are being added (be specific about materials)
3. **Retained**: What stays the same and why
4. **Structural**: Any structural modifications (wall removal, load-bearing changes, new openings)
5. **Relocation**: Items being moved (e.g., sink to a different wall, outlet relocated)

For labour estimates, use Ontario trade standards:
- Demolition: 2-4 hrs for small items, 4-8 hrs for major items (full cabinet run, all flooring)
- Tile installation: 0.5-1 hr per sqft depending on complexity
- Cabinet installation: 2-4 hrs per linear foot
- Countertop templating + install: 4-8 hrs
- Plumbing fixture swap (1:1): 2-3 hrs
- Plumbing rough-in relocation: 6-12 hrs
- Electrical circuit addition: 3-5 hrs
- Painting: 0.5-1 hr per 100 sqft

Be conservative — identify only what you can clearly see has changed.`,
          },
          {
            type: 'image',
            image: beforeImageUrl,
          },
          {
            type: 'image',
            image: afterImageUrl,
          },
        ],
      },
    ],
    maxOutputTokens: 2000,
  });

  return object;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a text summary of the BeforeScope for the prompt */
function buildContextSummary(scope: BeforeScope): string {
  const lines: string[] = [];

  lines.push(`Condition: ${scope.existingCondition}`);
  lines.push(`Estimated area: ~${scope.estimatedSqft} sqft`);

  if (scope.demolitionItems.length > 0) {
    lines.push(`Items to replace: ${scope.demolitionItems.map((d) => d.item).join(', ')}`);
  }

  if (scope.structuralConstraints.length > 0) {
    lines.push(`Structural constraints: ${scope.structuralConstraints.join(', ')}`);
  }

  if (scope.tradeRequirements.length > 0) {
    lines.push(`Trades identified: ${scope.tradeRequirements.map((t) => t.trade).join(', ')}`);
  }

  return lines.join('\n');
}
