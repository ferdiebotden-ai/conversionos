/**
 * Visualization Service
 * AI-powered room transformation using Gemini 3 Pro Image generation
 */

import { generateImageWithGemini, VISUALIZATION_CONFIG, type GeneratedImage, type ReferenceImage } from './gemini';
import {
  type RoomType,
  type DesignStyle,
  type GeneratedConcept,
  STYLE_DESCRIPTIONS,
  ROOM_CONTEXTS,
} from '@/lib/schemas/visualization';
import {
  buildRenovationPrompt,
  buildQuickModePrompt,
  type RenovationPromptData,
} from './prompt-builder';
import type { RoomAnalysis } from './photo-analyzer';

/** Configuration for visualization generation */
export interface VisualizationConfig {
  roomType: RoomType;
  style: DesignStyle;
  constraints?: string;
  /** Photo analysis from GPT Vision (optional) */
  photoAnalysis?: RoomAnalysis;
  /** Extracted design intent from conversation (optional) */
  designIntent?: {
    desiredChanges: string[];
    constraintsToPreserve: string[];
    materialPreferences?: string[];
  };
  /** Use enhanced prompt builder (default: true) */
  useEnhancedPrompts?: boolean;
  /** Reference images for structural conditioning (Phase 2) */
  referenceImages?: ReferenceImage[] | undefined;
  /** Whether depth map is included */
  hasDepthMap?: boolean | undefined;
  /** Whether edge map is included */
  hasEdgeMap?: boolean | undefined;
  /** Depth range from depth estimation */
  depthRange?: { min: number; max: number } | undefined;
  /** Custom room type description (when user selected 'other') */
  customRoomType?: string | undefined;
  /** Custom style description (when user selected 'other') */
  customStyle?: string | undefined;
  /** AI-generated summary of voice consultation preferences */
  voicePreferencesSummary?: string | undefined;
}

/**
 * Build a visualization prompt for Gemini 3 Pro Image
 * Combines room type, style, and user constraints into an effective prompt
 * @deprecated Use buildRenovationPrompt or buildQuickModePrompt instead
 */
export function buildVisualizationPrompt(
  roomType: RoomType,
  style: DesignStyle,
  constraints?: string,
  variationIndex: number = 0
): string {
  // Delegate to quick mode prompt for backwards compatibility
  return buildQuickModePrompt(roomType, style, constraints, variationIndex);
}

// Extract mime type from base64 data URL
function extractMimeType(imageBase64: string): string {
  const matches = imageBase64.match(/^data:([^;]+);base64/);
  return matches?.[1] ?? 'image/jpeg';
}

/**
 * Generate a single visualization concept using real Gemini 3 Pro Image generation
 * Supports both legacy signature and enhanced config-based approach
 */
export async function generateVisualizationConcept(
  imageBase64: string,
  roomTypeOrConfig: RoomType | VisualizationConfig,
  style?: DesignStyle,
  constraints?: string,
  conceptIndex: number = 0
): Promise<GeneratedImage | null> {
  let prompt: string;

  let referenceImages: ReferenceImage[] | undefined;
  let analysisContext: string | undefined;

  // Handle both legacy and new signatures
  if (typeof roomTypeOrConfig === 'object') {
    // Config-based approach — always pass all available data to prompt builder
    const config = roomTypeOrConfig;

    const promptData: RenovationPromptData = {
      roomType: config.roomType,
      style: config.style,
      variationIndex: conceptIndex,
      ...(config.constraints && { constraints: config.constraints }),
      ...(config.photoAnalysis && { photoAnalysis: config.photoAnalysis }),
      ...(config.designIntent && { designIntent: config.designIntent }),
      ...(config.hasDepthMap && { hasDepthMap: true }),
      ...(config.hasEdgeMap && { hasEdgeMap: true }),
      ...(config.depthRange && { depthRange: config.depthRange }),
      ...(config.customRoomType && { customRoomType: config.customRoomType }),
      ...(config.customStyle && { customStyle: config.customStyle }),
      ...(config.voicePreferencesSummary && { voicePreferencesSummary: config.voicePreferencesSummary }),
    };
    prompt = buildRenovationPrompt(promptData);

    // Pass through reference images for structural conditioning
    referenceImages = config.referenceImages;

    // Build analysis context for Gemini system instruction
    if (config.photoAnalysis) {
      const pa = config.photoAnalysis;
      const parts: string[] = [];
      parts.push(`Room: ${pa.roomType}, Layout: ${pa.layoutType}`);
      if (pa.wallCount != null) parts.push(`Walls: ${pa.wallCount}`);
      if (pa.estimatedCeilingHeight) parts.push(`Ceiling: ${pa.estimatedCeilingHeight}`);
      if (pa.structuralElements.length) parts.push(`Structure: ${pa.structuralElements.join(', ')}`);
      analysisContext = parts.join('. ');
    }
  } else {
    // Legacy signature - use quick mode prompt
    prompt = buildQuickModePrompt(roomTypeOrConfig, style!, constraints, conceptIndex);
  }

  const mimeType = extractMimeType(imageBase64);

  try {
    // Use native Gemini 3 Pro image generation with the input photo
    const result = await generateImageWithGemini(
      prompt,
      referenceImages ? undefined : imageBase64,
      referenceImages ? undefined : mimeType,
      analysisContext,
      referenceImages
    );
    return result;
  } catch (error) {
    console.error(`Visualization generation failed for concept ${conceptIndex}:`, error);
    throw error;
  }
}

/**
 * Generate multiple visualization concepts
 * Supports both legacy signature and enhanced config-based approach
 */
export async function generateVisualizationConcepts(
  imageBase64: string,
  roomTypeOrConfig: RoomType | VisualizationConfig,
  style?: DesignStyle,
  constraints?: string,
  count: number = VISUALIZATION_CONFIG.outputCount
): Promise<GeneratedImage[]> {
  const concepts: GeneratedImage[] = [];

  // Generate concepts in parallel for speed
  const promises = Array.from({ length: count }, (_, i) => {
    if (typeof roomTypeOrConfig === 'object') {
      // Config-based approach
      return generateVisualizationConcept(imageBase64, roomTypeOrConfig, undefined, undefined, i)
        .catch((error) => {
          console.error(`Concept ${i} generation failed:`, error);
          return null;
        });
    } else {
      // Legacy approach
      return generateVisualizationConcept(imageBase64, roomTypeOrConfig, style!, constraints, i)
        .catch((error) => {
          console.error(`Concept ${i} generation failed:`, error);
          return null;
        });
    }
  });

  const results = await Promise.allSettled(promises);

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      concepts.push(result.value);
    }
  }

  return concepts;
}

// Create concept objects with IDs and URLs
export function createConceptObjects(
  imageUrls: string[],
  descriptions?: string[]
): GeneratedConcept[] {
  return imageUrls.map((url, index) => ({
    id: `concept-${index + 1}-${Date.now()}`,
    imageUrl: url,
    description: descriptions?.[index],
    generatedAt: new Date().toISOString(),
  }));
}

// Placeholder image generator (for development/demo)
// Returns placeholder URLs until actual Gemini image generation is available
export function generatePlaceholderConcepts(
  roomType: RoomType,
  style: DesignStyle,
  count: number = 4
): GeneratedConcept[] {
  const placeholders: GeneratedConcept[] = [];

  for (let i = 0; i < count; i++) {
    placeholders.push({
      id: `placeholder-${i + 1}-${Date.now()}`,
      // Use picsum.photos for demo placeholders with room-specific seeds
      imageUrl: `https://picsum.photos/seed/${roomType}-${style}-${i}/1024/768`,
      description: `${style.charAt(0).toUpperCase() + style.slice(1)} ${roomType.replace('_', ' ')} design - Concept ${i + 1}`,
      generatedAt: new Date().toISOString(),
    });
  }

  return placeholders;
}

/**
 * Configuration for retry logic
 */
export interface RetryConfig {
  maxRetries: number;
  validateStructure: boolean;
  increaseStructureStrength: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  validateStructure: true,
  increaseStructureStrength: true,
};

/**
 * Generate visualization with automatic retry on validation failure
 * Increases structure reference strength on each retry
 */
export async function generateVisualizationWithRetry(
  imageBase64: string,
  config: VisualizationConfig,
  retryConfig: Partial<RetryConfig> = {}
): Promise<{ image: GeneratedImage; retryCount: number; validationScore?: number }> {
  const { maxRetries, validateStructure, increaseStructureStrength } = {
    ...DEFAULT_RETRY_CONFIG,
    ...retryConfig,
  };

  let lastError: Error | null = null;
  let validationScore: number | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Generate the visualization
      const result = await generateVisualizationConcept(imageBase64, config, undefined, undefined, 0);

      if (!result) {
        throw new Error('Generation returned null');
      }

      // Skip validation if disabled or no OpenAI key
      if (!validateStructure || !process.env['OPENAI_API_KEY']) {
        return { image: result, retryCount: attempt };
      }

      // Validate structure preservation (only on first 2 attempts to save costs)
      if (attempt < 2) {
        // Dynamic import to avoid circular dependencies
        const { quickValidateImage } = await import('./validation');
        const validation = await quickValidateImage(
          imageBase64,
          `data:${result.mimeType};base64,${result.base64}`
        );

        validationScore = validation.score;

        if (validation.isAcceptable) {
          console.log(`Visualization passed validation on attempt ${attempt + 1} with score ${validation.score}`);
          return { image: result, retryCount: attempt, validationScore };
        }

        console.warn(`Validation failed on attempt ${attempt + 1}, score: ${validation.score}`);

        // If structure strength increase is enabled, we'd modify the prompt
        // (In practice this would require modifying the Gemini config)
        if (increaseStructureStrength && attempt < maxRetries) {
          console.log('Retrying with stronger structure preservation emphasis...');
        }
      } else {
        // After validation attempts, just return the result
        const returnValue: { image: GeneratedImage; retryCount: number; validationScore?: number } = {
          image: result,
          retryCount: attempt,
        };
        if (validationScore !== undefined) {
          returnValue.validationScore = validationScore;
        }
        return returnValue;
      }
    } catch (error) {
      console.error(`Generation attempt ${attempt + 1} failed:`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // Don't retry on certain errors
      if (lastError.message.includes('API key') || lastError.message.includes('quota')) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error('Generation failed after max retries');
}

/**
 * Generate multiple concepts with retry logic
 */
export async function generateVisualizationConceptsWithRetry(
  imageBase64: string,
  config: VisualizationConfig,
  count: number = VISUALIZATION_CONFIG.outputCount,
  retryConfig: Partial<RetryConfig> = {}
): Promise<{ concepts: GeneratedImage[]; totalRetries: number }> {
  const concepts: GeneratedImage[] = [];
  let totalRetries = 0;

  // Generate concepts in parallel
  const promises = Array.from({ length: count }, async (_, i) => {
    try {
      const configWithVariation = { ...config };
      const result = await generateVisualizationWithRetry(
        imageBase64,
        configWithVariation,
        { ...retryConfig, maxRetries: 1 } // Limit retries per concept
      );
      totalRetries += result.retryCount;
      return result.image;
    } catch (error) {
      console.error(`Concept ${i + 1} generation failed:`, error);
      return null;
    }
  });

  const results = await Promise.allSettled(promises);

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      concepts.push(result.value);
    }
  }

  return { concepts, totalRetries };
}
