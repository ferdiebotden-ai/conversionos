/**
 * AI Visualization API Route
 * Generates AI design visualizations using Gemini
 * Enhanced with photo analysis and conversation context
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/db/server';
import { getSiteId, withSiteId } from '@/lib/db/site';
import {
  visualizationRequestSchema,
  type VisualizationResponse,
  type VisualizationError,
  type GeneratedConcept,
  type RoomType,
  type DesignStyle,
} from '@/lib/schemas/visualization';
import {
  generateVisualizationConcept,
  type VisualizationConfig,
} from '@/lib/ai/visualization';
import { VISUALIZATION_CONFIG, type GeneratedImage, type ReferenceImage } from '@/lib/ai/gemini';
import { estimateDepth } from '@/lib/ai/depth-estimation';
import { extractEdges } from '@/lib/ai/edge-detection';
import { AI_CONFIG } from '@/lib/ai/config';
import {
  analyzeRoomPhotoForVisualization,
  type RoomAnalysis,
} from '@/lib/ai/photo-analyzer';
import {
  generateConceptDescriptions,
  analyzeConceptForPricing,
} from '@/lib/ai/concept-pricing';
import type { DesignIntent } from '@/lib/schemas/visualizer-extraction';

// Extended request schema with optional photo analysis and design intent
const enhancedVisualizationRequestSchema = visualizationRequestSchema
  .omit({ roomType: true, style: true })
  .extend({
    /** Room type — accepts standard types or 'other' for custom */
    roomType: z.union([
      z.enum(['kitchen', 'bathroom', 'living_room', 'bedroom', 'basement', 'dining_room', 'exterior']),
      z.literal('other'),
    ]),
    /** Custom room type description (when roomType === 'other') */
    customRoomType: z.string().max(100).optional(),
    /** Design style — accepts standard styles or 'other' for custom */
    style: z.union([
      z.enum(['modern', 'traditional', 'farmhouse', 'industrial', 'minimalist', 'contemporary']),
      z.literal('other'),
    ]),
    /** Custom style description (when style === 'other') */
    customStyle: z.string().max(100).optional(),
    /** Skip photo analysis (for quick mode) */
    skipAnalysis: z.boolean().optional().default(false),
    /** Pre-analyzed photo data (from conversation mode) */
    photoAnalysis: z.record(z.string(), z.unknown()).optional(),
    /** Design intent from conversation */
    designIntent: z.object({
      desiredChanges: z.array(z.string()),
      constraintsToPreserve: z.array(z.string()),
      materialPreferences: z.array(z.string()).optional(),
    }).optional(),
    /** Voice transcript from Mia consultation */
    voiceTranscript: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      timestamp: z.coerce.date(),
    })).optional(),
    /** AI-generated summary of voice preferences */
    voicePreferencesSummary: z.string().optional(),
    /** Conversation context for storage */
    conversationContext: z.record(z.string(), z.unknown()).optional(),
    /** Mode indicator */
    mode: z.enum(['quick', 'conversation', 'streamlined']).optional().default('quick'),
  });

// Maximum execution time for Vercel (120s for Gemini image gen headroom)
export const maxDuration = 120;

// Simple in-memory cache for photo analysis (survives within same serverless instance)
const photoAnalysisCache = new Map<string, { analysis: RoomAnalysis; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Hash the first 2KB of image data for fast cache lookup */
function hashImagePrefix(imageBase64: string): string {
  // Use a simple FNV-1a hash on the first 2048 chars of the base64 data
  const data = imageBase64.slice(0, 2048);
  let hash = 2166136261;
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function getCachedAnalysis(imageBase64: string): RoomAnalysis | undefined {
  const key = hashImagePrefix(imageBase64);
  const entry = photoAnalysisCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.analysis;
  }
  if (entry) photoAnalysisCache.delete(key);
  return undefined;
}

function setCachedAnalysis(imageBase64: string, analysis: RoomAnalysis): void {
  const key = hashImagePrefix(imageBase64);
  photoAnalysisCache.set(key, { analysis, timestamp: Date.now() });
  // Evict old entries if cache grows too large
  if (photoAnalysisCache.size > 50) {
    const oldest = [...photoAnalysisCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) photoAnalysisCache.delete(oldest[0]);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();

    // Validate request with enhanced schema
    const parseResult = enhancedVisualizationRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const error: VisualizationError = {
        error: 'Invalid request',
        code: 'INVALID_IMAGE',
        details: parseResult.error.issues[0]?.message,
      };
      return NextResponse.json(error, { status: 400 });
    }

    const {
      image,
      roomType,
      style,
      customRoomType,
      customStyle,
      constraints,
      count,
      skipAnalysis,
      photoAnalysis: providedAnalysis,
      designIntent,
      voiceTranscript,
      voicePreferencesSummary,
      conversationContext,
      mode,
    } = parseResult.data;

    // Initialize Supabase service client
    const supabase = createServiceClient();

    // Upload original image to Supabase Storage
    const originalImageUrl = await uploadOriginalImage(supabase, image);
    if (!originalImageUrl) {
      const error: VisualizationError = {
        error: 'Failed to store original image',
        code: 'STORAGE_ERROR',
      };
      return NextResponse.json(error, { status: 500 });
    }

    // Photo analysis - use provided, cached, or perform new analysis
    let photoAnalysis: RoomAnalysis | undefined;

    if (providedAnalysis) {
      // Use pre-analyzed data from conversation mode
      photoAnalysis = providedAnalysis as RoomAnalysis;
    } else if (!skipAnalysis && process.env['OPENAI_API_KEY']) {
      // Check cache first (saves ~$0.02 and ~3-5s per re-generation)
      const cached = getCachedAnalysis(image);
      if (cached) {
        console.log('Using cached photo analysis');
        photoAnalysis = cached;
      } else {
        // Perform photo analysis for enhanced prompts
        try {
          console.log('Analyzing photo for enhanced visualization...');
          const analysisStartTime = Date.now();
          photoAnalysis = await analyzeRoomPhotoForVisualization(image, roomType as RoomType);
          console.log(`Photo analysis completed in ${Date.now() - analysisStartTime}ms`);
          // Cache for subsequent re-generations with same photo
          if (photoAnalysis) {
            setCachedAnalysis(image, photoAnalysis);
          }
        } catch (analysisError) {
          // Log but don't fail - we can generate without analysis
          console.warn('Photo analysis failed, proceeding without:', analysisError);
        }
      }
    }

    // Phase 2: Structural conditioning — run depth + edge extraction in parallel
    const referenceImages: ReferenceImage[] = [];
    let hasDepthMap = false;
    let hasEdgeMap = false;
    let depthRange: { min: number; max: number } | undefined;

    // Always include source image as first reference
    const sourceMimeType = image.match(/^data:([^;]+);/)?.[1] || 'image/jpeg';
    referenceImages.push({ base64: image, mimeType: sourceMimeType, role: 'source' });

    if (AI_CONFIG.pipeline.enableDepthEstimation || AI_CONFIG.pipeline.enableEdgeDetection) {
      const pipelineStartTime = Date.now();
      const pipelinePromises: Promise<unknown>[] = [];

      if (AI_CONFIG.pipeline.enableDepthEstimation) {
        pipelinePromises.push(
          estimateDepth(image).then(result => {
            if (result) {
              referenceImages.push({ base64: result.depthMapBase64, mimeType: result.mimeType, role: 'depth' });
              hasDepthMap = true;
              depthRange = { min: result.minDepth, max: result.maxDepth };
              console.log(`Depth estimation completed: ${result.minDepth.toFixed(1)}m - ${result.maxDepth.toFixed(1)}m`);
            }
          }).catch(err => console.warn('Depth estimation failed, continuing without:', err))
        );
      }

      if (AI_CONFIG.pipeline.enableEdgeDetection) {
        pipelinePromises.push(
          extractEdges(image).then(result => {
            if (result) {
              referenceImages.push({ base64: result.edgeMapBase64, mimeType: result.mimeType, role: 'edges' });
              hasEdgeMap = true;
              console.log('Edge detection completed');
            }
          }).catch(err => console.warn('Edge detection failed, continuing without:', err))
        );
      }

      await Promise.allSettled(pipelinePromises);
      console.log(`Structural conditioning pipeline completed in ${Date.now() - pipelineStartTime}ms`);
    }

    // Generate visualization concepts
    let concepts: GeneratedConcept[];

    if (!process.env['GOOGLE_GENERATIVE_AI_API_KEY']) {
      // No API key - return clear error instead of silent placeholder fallback
      const error: VisualizationError = {
        error: 'Image generation service unavailable',
        code: 'GENERATION_FAILED',
        details: 'The visualization service is temporarily unavailable. Please try again later.',
      };
      return NextResponse.json(error, { status: 503 });
    }

    // Build visualization config with enhanced data
    // For custom room/style types, fall back to a reasonable default for type compatibility
    const effectiveRoomType: RoomType = roomType === 'other' ? 'living_room' : roomType as RoomType;
    const effectiveStyle: DesignStyle = style === 'other' ? 'contemporary' : style as DesignStyle;

    const visualizationConfig: VisualizationConfig = {
      roomType: effectiveRoomType,
      style: effectiveStyle,
      ...(constraints && { constraints }),
      ...(photoAnalysis && { photoAnalysis }),
      ...(designIntent && {
        designIntent: {
          desiredChanges: designIntent.desiredChanges,
          constraintsToPreserve: designIntent.constraintsToPreserve,
          ...(designIntent.materialPreferences && { materialPreferences: designIntent.materialPreferences }),
        },
      }),
      // Pass custom types and voice data for prompt builder
      ...(roomType === 'other' && customRoomType && { customRoomType }),
      ...(style === 'other' && customStyle && { customStyle }),
      ...(voicePreferencesSummary && { voicePreferencesSummary }),
      useEnhancedPrompts: true,
      referenceImages: referenceImages.length > 1 ? referenceImages : undefined,
      hasDepthMap,
      hasEdgeMap,
      ...(depthRange && { depthRange }),
    };

    // Use real Gemini 3 Pro image generation with enhanced config
    concepts = await generateConceptsWithGeminiEnhanced(
      supabase,
      image,
      visualizationConfig,
      count,
      startTime
    );

    // Upload generated concepts to Supabase Storage (for real generated images)
    // For placeholders, we use external URLs directly

    // Enrich concepts with AI-generated descriptions (batched, ~$0.01 total)
    // This runs BEFORE response — descriptions are shown to the user immediately
    if (concepts.length > 0 && process.env['OPENAI_API_KEY']) {
      try {
        const conceptUrls = concepts.map(c => c.imageUrl);
        const descriptions = await generateConceptDescriptions(
          conceptUrls,
          effectiveRoomType,
          effectiveStyle,
        );
        // Merge descriptions into concepts
        for (let i = 0; i < Math.min(concepts.length, descriptions.length); i++) {
          const desc = descriptions[i];
          if (desc) {
            concepts[i] = {
              ...concepts[i]!,
              description: desc.shortDescription,
            };
          }
        }
      } catch (descError) {
        // Non-fatal — concepts already have basic descriptions from buildConceptDescription
        console.warn('Concept description enrichment failed:', descError);
      }
    }

    const generationTimeMs = Date.now() - startTime;

    // Generate share token
    const shareToken = generateShareToken();

    // Build conversation_context JSONB from all captured data (all tiers — silent capture for Elevate upsell)
    const fullConversationContext = {
      ...(conversationContext as Record<string, unknown> || {}),
      ...(designIntent && { designIntent }),
      ...(voicePreferencesSummary && { voicePreferencesSummary }),
      ...(voiceTranscript && voiceTranscript.length > 0 && {
        voiceTranscript: voiceTranscript.map(t => ({
          role: t.role,
          content: t.content,
          timestamp: t.timestamp.toISOString(),
        })),
      }),
      mode,
      customRoomType: customRoomType || undefined,
      customStyle: customStyle || undefined,
    };
    // Only include if there's actual data beyond just the mode
    const hasConversationData = designIntent || voicePreferencesSummary || (voiceTranscript && voiceTranscript.length > 0);

    // Save visualization to database with enhanced fields
    const dbRoomType = roomType;
    // Map 'other' style to 'contemporary' for DB compatibility
    const dbStyle = style === 'other' ? 'contemporary' : style;
    const { data: visualization, error: dbError } = await supabase
      .from('visualizations')
      .insert(withSiteId({
        original_photo_url: originalImageUrl,
        room_type: dbRoomType as 'kitchen' | 'bathroom' | 'living_room' | 'bedroom' | 'basement' | 'dining_room',
        style: dbStyle,
        constraints: constraints || null,
        generated_concepts: concepts,
        generation_time_ms: generationTimeMs,
        share_token: shareToken,
        source: mode === 'conversation' ? 'visualizer_conversation' : 'visualizer',
        device_type: getDeviceType(request),
        user_agent: request.headers.get('user-agent') || null,
        // Enhanced fields — always write when available (all tiers, silent capture for Elevate)
        ...(photoAnalysis && { photo_analysis: photoAnalysis }),
        ...(hasConversationData && { conversation_context: fullConversationContext }),
      }))
      .select()
      .single();

    if (dbError) {
      // DB save failed — log but still return the generated concepts
      // The visualization was expensive to generate; don't throw it away
      console.error('Database error (non-fatal, returning concepts anyway):', dbError);
    }

    // Concept pricing analysis — fire and forget, stored in DB for all tiers (silent capture)
    // Analyses the first generated concept for visible materials and prices them
    if (!dbError && visualization && concepts.length > 0 && process.env['OPENAI_API_KEY']) {
      const firstConceptUrl = concepts[0]!.imageUrl;
      analyzeConceptForPricing(firstConceptUrl, effectiveRoomType, effectiveStyle)
        .then(async (pricingAnalysis) => {
          // Store pricing analysis on the visualization record
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('visualizations') as any)
            .update({
              concept_pricing: pricingAnalysis,
            })
            .eq('id', visualization.id)
            .eq('site_id', getSiteId());
          console.log('Concept pricing analysis stored');
        })
        .catch((err) => console.warn('Concept pricing analysis failed (non-fatal):', err));
    }

    // Record metrics (fire and forget - don't block response)
    if (!dbError && visualization) {
      recordVisualizationMetrics(supabase, {
        visualizationId: visualization.id,
        generationTimeMs,
        conceptsRequested: count,
        conceptsGenerated: concepts.length,
        mode: (mode === 'streamlined' ? 'quick' : mode) || 'quick',
        photoAnalyzed: !!photoAnalysis,
        conversationTurns: (conversationContext as Record<string, unknown>)?.['turnCount'] as number || 0,
      }).catch((err) => console.error('Failed to record metrics:', err));
    }

    // Build response — use effective types for schema compliance
    const response: VisualizationResponse = {
      id: visualization?.id ?? `local-${Date.now()}`,
      originalImageUrl,
      roomType: effectiveRoomType,
      style: effectiveStyle,
      constraints: constraints || undefined,
      concepts,
      generationTimeMs,
      createdAt: visualization?.created_at ?? new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Visualization error:', error);

    // Check for timeout
    const elapsed = Date.now() - startTime;
    if (elapsed >= VISUALIZATION_CONFIG.timeout) {
      const errorResponse: VisualizationError = {
        error: 'Generation timed out',
        code: 'TIMEOUT',
        details: 'The AI took too long to generate visualizations. Please try again.',
      };
      return NextResponse.json(errorResponse, { status: 504 });
    }

    const errorResponse: VisualizationError = {
      error: 'Failed to generate visualization',
      code: 'UNKNOWN',
      details: 'An unexpected error occurred. Please try again.',
    };
    // Log the real error server-side only
    console.error('Visualization error details:', error instanceof Error ? error.message : error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Upload original image to Supabase Storage
async function uploadOriginalImage(
  supabase: ReturnType<typeof createServiceClient>,
  imageBase64: string
): Promise<string | null> {
  try {
    // Extract base64 data and mime type
    const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      console.error('Invalid base64 image format');
      return null;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const extension = mimeType?.split('/')[1] || 'jpg';

    // Decode base64 to buffer
    const buffer = Buffer.from(base64Data ?? '', 'base64');

    // Generate unique filename
    const filename = `original/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('visualizations')
      .upload(filename, buffer, {
        contentType: mimeType || 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      // Fall back to data URL if storage fails for any reason
      console.warn('Storage upload failed, using data URL as fallback');
      return imageBase64;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('visualizations')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Failed to upload image:', error);
    // Fall back to data URL if any exception occurs (e.g., invalid API key)
    console.warn('Storage exception occurred, using data URL as fallback');
    return imageBase64;
  }
}

// Upload generated image to Supabase Storage
async function uploadGeneratedImage(
  supabase: ReturnType<typeof createServiceClient>,
  image: GeneratedImage,
  index: number
): Promise<string | null> {
  try {
    const extension = image.mimeType.split('/')[1] || 'png';
    const filename = `generated/${Date.now()}-${index}-${Math.random().toString(36).slice(2)}.${extension}`;
    const buffer = Buffer.from(image.base64, 'base64');

    const { data, error } = await supabase.storage
      .from('visualizations')
      .upload(filename, buffer, {
        contentType: image.mimeType,
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      // Fall back to data URL for any storage error
      console.warn('Storage upload failed, using data URL as fallback');
      return `data:${image.mimeType};base64,${image.base64}`;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('visualizations')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Failed to upload generated image:', error);
    // Fall back to data URL if any exception occurs
    console.warn('Storage exception occurred, using data URL as fallback');
    return `data:${image.mimeType};base64,${image.base64}`;
  }
}

/**
 * Retry a single Gemini generation with exponential backoff for rate limits
 */
async function generateWithRetry(
  imageBase64: string,
  config: VisualizationConfig,
  conceptIndex: number,
  maxRetries: number = 2
): Promise<GeneratedImage | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateVisualizationConcept(
        imageBase64,
        config,
        undefined,
        undefined,
        conceptIndex
      );
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isRateLimit = msg.includes('429') || msg.includes('quota') || msg.includes('rate');
      const isTimeout = msg.includes('timed out') || msg.includes('timeout');

      if (attempt < maxRetries && (isRateLimit || isTimeout)) {
        const delay = (attempt + 1) * 5000; // 5s, 10s backoff
        console.warn(`Concept ${conceptIndex} attempt ${attempt + 1} failed (${isRateLimit ? 'rate limit' : 'timeout'}), retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  return null;
}

// Generate concepts using enhanced config — sequential with retry for reliability
async function generateConceptsWithGeminiEnhanced(
  supabase: ReturnType<typeof createServiceClient>,
  imageBase64: string,
  config: VisualizationConfig,
  count: number,
  functionStartTime: number
): Promise<GeneratedConcept[]> {
  const concepts: GeneratedConcept[] = [];
  const errors: Error[] = [];

  // Generate concepts in batches of 2 to stay within Gemini rate limits
  // Batch 1: concepts 0 + 1 in parallel
  // Batch 2: concepts 2 + 3 in parallel (if requested)
  const batchSize = 2;
  const batches: number[][] = [];
  for (let i = 0; i < count; i += batchSize) {
    batches.push(Array.from({ length: Math.min(batchSize, count - i) }, (_, j) => i + j));
  }

  for (const batch of batches) {
    const batchStartTime = Date.now();
    console.log(`Generating concept batch [${batch.join(', ')}]...`);

    const promises = batch.map(async (i) => {
      try {
        const result = await generateWithRetry(imageBase64, config, i);

        if (result) {
          // Upload to Supabase Storage and get URL
          const imageUrl = await uploadGeneratedImage(supabase, result, i);
          if (imageUrl) {
            return {
              id: `concept-${i + 1}-${Date.now()}`,
              imageUrl,
              description: buildConceptDescription(config, i),
              generatedAt: new Date().toISOString(),
            };
          }
        }
        return null;
      } catch (error) {
        console.error(`Failed to generate concept ${i + 1}:`, error);
        if (error instanceof Error) {
          errors.push(error);
        }
        return null;
      }
    });

    const results = await Promise.allSettled(promises);
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        concepts.push(result.value);
      }
    }

    console.log(`Batch completed in ${Date.now() - batchStartTime}ms (${concepts.length} concepts so far)`);

    // If we already have at least 2 concepts, we can return early if running low on time
    // This ensures we return something useful even if later batches would timeout
    if (concepts.length >= 2 && batches.indexOf(batch) < batches.length - 1) {
      // Check if we're running low on time (>80s elapsed since function start)
      // The function will be killed at maxDuration, so leave headroom for upload + DB
      const elapsedSinceStart = Date.now() - functionStartTime;
      if (elapsedSinceStart > 80000) {
        console.warn(`Time budget running low (${(elapsedSinceStart / 1000).toFixed(1)}s elapsed), returning ${concepts.length} concepts`);
        break;
      }
    }
  }

  // If no concepts were generated, throw an error with details
  if (concepts.length === 0) {
    const firstError = errors[0];
    const errorMessage = firstError
      ? `Image generation failed: ${firstError.message}`
      : 'No visualization concepts could be generated. Please try again.';
    throw new Error(errorMessage);
  }

  // Log if we got fewer than requested
  if (concepts.length < count) {
    console.warn(`Only generated ${concepts.length}/${count} concepts`);
  }

  return concepts;
}

// Build a more descriptive concept description
function buildConceptDescription(config: VisualizationConfig, index: number): string {
  const { roomType, style, designIntent } = config;
  const styleName = style.charAt(0).toUpperCase() + style.slice(1);
  const roomName = roomType.replace('_', ' ');

  let description = `${styleName} ${roomName} design - Concept ${index + 1}`;

  // Add personalized details if design intent is available
  if (designIntent?.desiredChanges && designIntent.desiredChanges.length > 0) {
    const highlights = designIntent.desiredChanges.slice(0, 2);
    description += ` featuring ${highlights.join(' and ')}`;
  }

  return description;
}

// Legacy function for backwards compatibility
async function generateConceptsWithGemini(
  supabase: ReturnType<typeof createServiceClient>,
  imageBase64: string,
  roomType: RoomType,
  style: DesignStyle,
  constraints: string | undefined,
  count: number
): Promise<GeneratedConcept[]> {
  // Delegate to enhanced version with minimal config
  return generateConceptsWithGeminiEnhanced(
    supabase,
    imageBase64,
    {
      roomType,
      style,
      ...(constraints && { constraints }),
      useEnhancedPrompts: true,
    },
    count,
    Date.now()
  );
}

// Generate a unique share token
function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Detect device type from user agent
function getDeviceType(request: NextRequest): string {
  const ua = request.headers.get('user-agent') || '';
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet/i.test(ua)) return 'tablet';
  return 'desktop';
}

// Record visualization metrics
interface MetricsInput {
  visualizationId: string;
  generationTimeMs: number;
  conceptsRequested: number;
  conceptsGenerated: number;
  retryCount?: number;
  validationScore?: number;
  mode: 'quick' | 'conversation';
  photoAnalyzed: boolean;
  conversationTurns: number;
  errorOccurred?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

async function recordVisualizationMetrics(
  supabase: ReturnType<typeof createServiceClient>,
  metrics: MetricsInput
): Promise<void> {
  // Estimate cost based on operations
  // Photo analysis: ~$0.015, depth estimation: ~$0.002, edge detection: $0, 4 concepts: ~$0.40, validation: ~$0.01
  const analysisCost = metrics.photoAnalyzed ? 0.015 : 0;
  const depthCost = 0.002; // Replicate per-prediction cost
  const generationCost = metrics.conceptsGenerated * 0.10; // ~$0.10 per concept (with conditioning)
  const validationCost = metrics.validationScore !== undefined ? 0.01 : 0;
  const totalCost = analysisCost + depthCost + generationCost + validationCost;

  // Insert metrics record (table may not exist until migration applied)
  // Using type assertion since visualization_metrics table is created by migration
  const metricsData = withSiteId({
    visualization_id: metrics.visualizationId,
    generation_time_ms: metrics.generationTimeMs,
    retry_count: metrics.retryCount || 0,
    concepts_requested: metrics.conceptsRequested,
    concepts_generated: metrics.conceptsGenerated,
    structure_validation_score: metrics.validationScore,
    validation_passed: metrics.validationScore ? metrics.validationScore >= 0.7 : null,
    mode: metrics.mode,
    photo_analyzed: metrics.photoAnalyzed,
    conversation_turns: metrics.conversationTurns,
    estimated_cost_usd: totalCost,
    analysis_cost_usd: analysisCost,
    generation_cost_usd: generationCost,
    validation_cost_usd: validationCost,
    error_occurred: metrics.errorOccurred || false,
    error_code: metrics.errorCode,
    error_message: metrics.errorMessage,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from as any)('visualization_metrics').insert(metricsData);

  if (error) {
    // Log but don't throw - metrics recording shouldn't block the response
    console.error('Failed to record visualization metrics:', error);
  }
}
