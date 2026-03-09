/**
 * Photo Analyzer for AI Visualizations
 * GPT Vision analysis specialized for renovation visualization prompts
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { openai } from './providers';
import { AI_CONFIG } from './config';
import type { RoomType } from '@/lib/schemas/visualization';

/**
 * Extended room analysis schema for visualization
 * More detailed than basic room analysis - optimized for prompt building
 */
export const VisualizationRoomAnalysisSchema = z.object({
  roomType: z.enum([
    'kitchen',
    'bathroom',
    'living_room',
    'bedroom',
    'basement',
    'dining_room',
    'exterior',
  ]),
  currentCondition: z.enum(['excellent', 'good', 'dated', 'needs_renovation']),
  /**
   * Structural elements that MUST be preserved
   * e.g., "load-bearing wall on left", "window on north wall"
   */
  structuralElements: z.array(z.string()),
  /**
   * Identified fixtures and features
   * e.g., "island with seating", "corner sink", "bay window"
   */
  identifiedFixtures: z.array(z.string()),
  /**
   * Layout type description
   * e.g., "galley", "L-shaped", "open concept", "ensuite"
   */
  layoutType: z.string(),
  /**
   * Lighting conditions analysis
   * e.g., "natural light from left, afternoon sun", "overhead fluorescent"
   */
  lightingConditions: z.string(),
  /**
   * Camera perspective notes
   * e.g., "shot from doorway, wide angle", "elevated corner view"
   */
  perspectiveNotes: z.string(),
  /**
   * Elements that cannot/should not change
   * e.g., "plumbing locations", "window positions", "ceiling height constraint"
   */
  preservationConstraints: z.array(z.string()),
  /**
   * Analysis confidence (0-1)
   */
  confidenceScore: z.number().min(0).max(1),
  /**
   * Existing style assessment (nullable for OpenAI JSON schema compatibility)
   */
  currentStyle: z.string().nullable(),
  /**
   * Approximate dimensions if determinable (nullable for OpenAI JSON schema compatibility)
   */
  estimatedDimensions: z.string().nullable(),
  /**
   * Notable elements that could be design focal points (nullable for OpenAI JSON schema compatibility)
   */
  potentialFocalPoints: z.array(z.string()).nullable(),
  /**
   * Number of visible walls (0-6)
   */
  wallCount: z.number().int().min(0).max(6).nullable(),
  /**
   * Dimensions and features of each visible wall
   */
  wallDimensions: z.array(z.object({
    wall: z.string(),
    estimatedLength: z.string(),
    hasWindow: z.boolean(),
    hasDoor: z.boolean(),
  })).nullable(),
  /**
   * Estimated ceiling height
   */
  estimatedCeilingHeight: z.string().nullable(),
  /**
   * Identified spatial zones within the room
   */
  spatialZones: z.array(z.object({
    name: z.string(),
    description: z.string(),
    approximateLocation: z.string(),
  })).nullable(),
  /**
   * Doors, windows, archways with positions and sizes
   */
  openings: z.array(z.object({
    type: z.enum(['window', 'door', 'archway']),
    wall: z.string(),
    approximateSize: z.string(),
    approximatePosition: z.string(),
  })).nullable(),
  /**
   * Dominant architectural lines and perspective geometry
   */
  architecturalLines: z.object({
    dominantDirection: z.string(),
    vanishingPointDescription: z.string(),
    symmetryAxis: z.string().nullable(),
  }).nullable(),
  /**
   * How furnished the room is
   */
  furnishingLevel: z.enum(['empty', 'sparse', 'moderate', 'cluttered']).nullable(),
  /**
   * Inventory of visible furniture and moveable items
   */
  furnitureInventory: z.array(z.object({
    /** Specific item description (e.g., "brown fabric 3-seat sofa") */
    item: z.string(),
    /** Location in the room (e.g., "against back wall") */
    location: z.string(),
    /** Condition assessment */
    condition: z.enum(['new', 'good', 'worn', 'dated', 'damaged']),
    /** Whether this is a built-in element (kitchen island, built-in shelving, vanity) */
    isBuiltIn: z.boolean(),
    /** Whether to keep, replace, or remove for visualization */
    suitability: z.enum(['keep', 'replace', 'remove']),
    /** Brief reason for the suitability rating */
    reason: z.string(),
  })).nullable(),
});

export type RoomAnalysis = z.infer<typeof VisualizationRoomAnalysisSchema>;

/**
 * Analyze a room photo for visualization purposes
 * Returns detailed structural, lighting, and perspective information
 * to improve prompt construction for image generation
 */
export async function analyzeRoomPhotoForVisualization(
  imageBase64: string,
  hintedRoomType?: RoomType
): Promise<RoomAnalysis> {
  const roomTypeHint = hintedRoomType
    ? `The user has indicated this is a ${hintedRoomType.replace('_', ' ')}.`
    : '';

  try {
    const result = await generateObject({
      model: openai(AI_CONFIG.openai.vision),
      schema: VisualizationRoomAnalysisSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are analyzing a room photo for an AI renovation visualization system. Your analysis will be used to construct prompts for image generation, so accuracy is critical.

${roomTypeHint}

Analyze this room photo and provide:

1. **Room Type**: Identify the room type precisely.

2. **Current Condition**: Rate as excellent/good/dated/needs_renovation.

3. **Structural Elements**: List all architectural elements that MUST be preserved:
   - Walls and their positions (note any that appear load-bearing)
   - Windows (positions, sizes, types)
   - Doors (positions, swing direction if visible)
   - Ceiling features (height, beams, soffits)
   - Any columns or structural supports

4. **Identified Fixtures**: List major fixtures and features:
   - Counters, islands, vanities
   - Built-in appliances
   - Sinks, tubs, showers
   - Fireplaces, built-in shelving
   - Flooring type visible

5. **Layout Type**: Describe the layout pattern:
   - For kitchens: galley, L-shaped, U-shaped, open concept, island layout
   - For bathrooms: full, 3/4, half, ensuite, jack-and-jill
   - For living spaces: open plan, defined, loft, etc.

6. **Lighting Conditions**: Analyze carefully:
   - Natural light direction (where are windows casting light from?)
   - Time of day estimation (morning/afternoon/evening based on shadows)
   - Artificial light sources visible
   - Shadow patterns that should be maintained

7. **Perspective Notes**: Describe the camera position:
   - Where is the photo taken from? (doorway, corner, center)
   - Approximate height (standing, elevated, low angle)
   - Focal length estimation (wide angle, normal, telephoto)
   - What's in foreground vs background

8. **Preservation Constraints**: What CANNOT change:
   - Plumbing fixture rough-in locations
   - Electrical panel locations
   - Window/door positions
   - Any visible structural constraints
   - Ceiling height limitations

9. **Confidence Score**: How confident are you in this analysis (0-1)?

10. **Current Style** (optional): What design style is currently present?

11. **Estimated Dimensions** (optional): Approximate room size if determinable.

12. **Potential Focal Points** (optional): Elements that could be highlighted in renovation.

13. **Wall Count**: How many walls are visible in the photo? (0-6)

14. **Wall Dimensions**: For each visible wall, estimate:
   - Which wall (e.g., "left wall", "back wall", "right wall")
   - Estimated length relative to other walls (e.g., "~12 feet", "~8 feet")
   - Whether it has a window
   - Whether it has a door

15. **Estimated Ceiling Height**: Approximate ceiling height (e.g., "~8 feet standard", "~9 feet", "~10 feet vaulted")

16. **Spatial Zones**: Identify distinct functional zones:
   - Zone name (e.g., "cooking zone", "prep area", "dining nook")
   - Brief description
   - Approximate location (e.g., "left third of room", "center", "near window")

17. **Openings**: Catalog all doors, windows, and archways:
   - Type: window, door, or archway
   - Which wall it's on
   - Approximate size (e.g., "36x48 inches", "standard 32-inch door")
   - Position on the wall (e.g., "centered", "left third", "right corner")

18. **Architectural Lines**: Describe the dominant geometry:
   - Dominant line direction (e.g., "strong horizontal lines from countertops and cabinets")
   - Vanishing point description (e.g., "single vanishing point centered, moderate depth")
   - Symmetry axis if any (e.g., "near-symmetric around center island", null if asymmetric)

19. **Furniture Inventory**: Catalogue every piece of furniture and moveable decor:
   - Specific item description ("brown fabric 3-seat sofa", not just "sofa")
   - Location in the room
   - Condition (new/good/worn/dated/damaged)
   - Is it built-in? (kitchen island, built-in shelving, vanity = yes)
   - Suitability for renovation visualization: keep (built-in or fits new style),
     replace (swap with style-appropriate piece), remove (clutter/personal items)
   - Brief reason for the suitability rating

20. **Furnishing Level**: How furnished is the room? (empty/sparse/moderate/cluttered)

Be specific and technical. This analysis directly impacts visualization quality.`,
            },
            {
              type: 'image',
              image: imageBase64,
            },
          ],
        },
      ],
      maxOutputTokens: 3000,
      temperature: 0.3, // Low temperature for more consistent, accurate analysis
    });

    return result.object;
  } catch (error) {
    console.error('Failed to analyze room photo for visualization:', error);
    throw new Error(
      `Photo analysis failed: ${error instanceof Error ? error.message : 'Unable to analyze photo. Please try again.'}`
    );
  }
}

/**
 * Quick analysis for validation/room type detection
 * Faster than full analysis, used for early validation
 */
export async function quickPhotoAnalysis(imageBase64: string): Promise<{
  roomType: RoomType | 'exterior' | 'other';
  isValid: boolean;
  issues?: string[];
  confidence: number;
}> {
  try {
    const result = await generateObject({
      model: openai(AI_CONFIG.openai.vision),
      schema: z.object({
        roomType: z.enum([
          'kitchen',
          'bathroom',
          'living_room',
          'bedroom',
          'basement',
          'dining_room',
          'exterior',
          'other',
        ]),
        isValid: z.boolean(),
        issues: z.array(z.string()).nullable(),
        confidence: z.number().min(0).max(1),
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Quickly analyze this image for renovation visualization:

1. What room type is this?
2. Is this a valid room photo for visualization? (not a screenshot, not blurry, shows actual room interior)
3. Any issues? (poor lighting, too much clutter, partial view only)
4. Your confidence level (0-1)`,
            },
            {
              type: 'image',
              image: imageBase64,
            },
          ],
        },
      ],
      maxOutputTokens: 200,
      temperature: 0.2,
    });

    return result.object as {
      roomType: RoomType | 'exterior' | 'other';
      isValid: boolean;
      issues?: string[];
      confidence: number;
    };
  } catch (error) {
    console.error('Failed quick photo analysis:', error);
    return {
      roomType: 'other' as RoomType,
      isValid: false,
      issues: ['Unable to analyze photo. Please try uploading again.'],
      confidence: 0,
    };
  }
}

/**
 * Extract design intent from a natural language description
 * Used when user provides text description of what they want
 */
export async function extractDesignIntent(
  userDescription: string,
  roomType?: RoomType
): Promise<{
  desiredChanges: string[];
  constraintsToPreserve: string[];
  stylePreference?: string;
  materialPreferences: string[];
  budgetIndicators: string[];
  confidence: number;
}> {
  try {
    const result = await generateObject({
      model: openai(AI_CONFIG.openai.chat),
      schema: z.object({
        desiredChanges: z.array(z.string()).describe('Specific changes the user wants'),
        constraintsToPreserve: z.array(z.string()).describe('Elements they want to keep'),
        stylePreference: z.string().nullable().describe('Overall style if mentioned'),
        materialPreferences: z.array(z.string()).describe('Specific materials mentioned'),
        budgetIndicators: z.array(z.string()).describe('Budget-related mentions'),
        confidence: z.number().min(0).max(1),
      }),
      messages: [
        {
          role: 'system',
          content: `You are analyzing a user's renovation description to extract design intent for a ${roomType || 'room'} visualization. Extract specific, actionable design preferences.`,
        },
        {
          role: 'user',
          content: userDescription,
        },
      ],
      maxOutputTokens: 500,
      temperature: 0.3,
    });

    // Handle exactOptionalPropertyTypes by conditionally including optional fields
    const base = {
      desiredChanges: result.object.desiredChanges,
      constraintsToPreserve: result.object.constraintsToPreserve,
      materialPreferences: result.object.materialPreferences,
      budgetIndicators: result.object.budgetIndicators,
      confidence: result.object.confidence,
    };

    return result.object.stylePreference
      ? { ...base, stylePreference: result.object.stylePreference }
      : base;
  } catch (error) {
    console.error('Failed to extract design intent:', error);
    return {
      desiredChanges: [],
      constraintsToPreserve: [],
      materialPreferences: [],
      budgetIndicators: [],
      confidence: 0,
    };
  }
}
