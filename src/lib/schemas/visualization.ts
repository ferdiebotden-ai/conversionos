/**
 * Visualization Schemas
 * Zod schemas for AI design visualization requests and responses
 */

import { z } from 'zod';

// Room types supported by the visualizer
export const roomTypeSchema = z.enum([
  'kitchen',
  'bathroom',
  'living_room',
  'bedroom',
  'basement',
  'dining_room',
  'exterior',
]);

export type RoomType = z.infer<typeof roomTypeSchema>;

// Design styles available for transformation
export const designStyleSchema = z.enum([
  'modern',
  'traditional',
  'farmhouse',
  'industrial',
  'minimalist',
  'contemporary',
  'transitional',
  'scandinavian',
  'coastal',
  'mid_century_modern',
]);

export type DesignStyle = z.infer<typeof designStyleSchema>;

// Visualization request schema (from client)
export const visualizationRequestSchema = z.object({
  // Base64-encoded image or URL
  image: z.string().min(1, 'Image is required'),
  // Room type for context
  roomType: roomTypeSchema,
  // Target design style
  style: designStyleSchema,
  // Optional user constraints/preferences
  constraints: z.string().max(500).optional(),
  // Number of variations to generate (default 4)
  count: z.number().int().min(1).max(4).default(4),
});

export type VisualizationRequest = z.infer<typeof visualizationRequestSchema>;

// Single generated concept
export const generatedConceptSchema = z.object({
  // Unique ID for this concept
  id: z.string(),
  // URL to the generated image (Supabase Storage)
  imageUrl: z.string().url(),
  // AI-generated description of changes
  description: z.string().optional(),
  // Generation timestamp
  generatedAt: z.string().datetime(),
  // Style label for multi-style generation (e.g., "Modern", "Farmhouse")
  styleLabel: z.string().optional(),
  // Machine-readable style ID for multi-style generation
  styleId: designStyleSchema.optional(),
});

export type GeneratedConcept = z.infer<typeof generatedConceptSchema>;

// Visualization response schema (to client)
export const visualizationResponseSchema = z.object({
  // Unique visualization session ID
  id: z.string().uuid(),
  // Original photo URL (stored in Supabase)
  originalImageUrl: z.string().url(),
  // Room type
  roomType: roomTypeSchema,
  // Primary design style (backward compat — first selected style)
  style: designStyleSchema,
  // All selected styles (multi-style generation)
  styles: z.array(designStyleSchema).optional(),
  // User constraints
  constraints: z.string().optional(),
  // Generated concept images
  concepts: z.array(generatedConceptSchema).min(1).max(4),
  // Total generation time in milliseconds
  generationTimeMs: z.number().int().positive(),
  // Creation timestamp
  createdAt: z.string().datetime(),
});

export type VisualizationResponse = z.infer<typeof visualizationResponseSchema>;

// Visualization status for progress tracking
export const visualizationStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
]);

export type VisualizationStatus = z.infer<typeof visualizationStatusSchema>;

// API error response
export const visualizationErrorSchema = z.object({
  error: z.string(),
  code: z.enum([
    'INVALID_IMAGE',
    'GENERATION_FAILED',
    'TIMEOUT',
    'RATE_LIMITED',
    'STORAGE_ERROR',
    'UNKNOWN',
  ]),
  details: z.string().optional(),
});

export type VisualizationError = z.infer<typeof visualizationErrorSchema>;

// Style descriptions for prompt construction
export const STYLE_DESCRIPTIONS: Record<DesignStyle, string> = {
  modern: 'Clean lines, neutral colors, open spaces, minimal ornamentation, sleek finishes like stainless steel and glass',
  traditional: 'Classic design elements, rich wood tones, elegant moldings, warm colors, timeless furniture styles',
  farmhouse: 'Rustic charm, shiplap walls, barn doors, natural wood, white and cream palette, vintage accents',
  industrial: 'Exposed brick and ductwork, metal accents, concrete floors, Edison bulbs, raw materials',
  minimalist: 'Ultra-clean aesthetic, monochromatic palette, hidden storage, functional simplicity, no clutter',
  contemporary: 'Current design trends, bold accent colors, mixed materials, geometric patterns, statement pieces',
  transitional: 'Traditional warmth meets contemporary restraint, neutral palette, refined profiles, timeless yet current',
  scandinavian: 'Nordic minimalism, bright whites, light wood, functional beauty, cosy textures, hygge warmth',
  coastal: 'Seaside calm, light and airy, whitewashed wood, natural fibres, ocean-inspired blues and sandy neutrals',
  mid_century_modern: '1950s–60s elegance, organic curves, warm wood tones, bold colour pops, clean geometric forms',
};

// Room-specific context for prompts
export const ROOM_CONTEXTS: Record<RoomType, string> = {
  kitchen: 'Focus on cabinetry, countertops, backsplash, appliances, lighting fixtures, and island if present',
  bathroom: 'Focus on vanity, tile work, fixtures, shower/tub area, lighting, and storage',
  living_room: 'Focus on seating arrangement, entertainment center, coffee table, rugs, and accent decor',
  bedroom: 'Focus on bed frame, nightstands, dresser, lighting, window treatments, and accent wall',
  basement: 'Focus on flooring, lighting, ceiling treatment, entertainment/recreation areas, and overall ambiance',
  dining_room: 'Focus on dining table, chairs, lighting fixture, buffet/sideboard, and wall decor',
  exterior: 'Focus on siding, facade, front door, windows, roofing, landscaping, deck/patio, and outdoor lighting',
};
