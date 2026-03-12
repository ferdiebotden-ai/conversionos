/**
 * AI Visualization SSE Streaming API Route
 * Generates AI design visualizations using Gemini with real-time progress events.
 * Mirrors the logic from the non-streaming route but wraps it in an SSE stream
 * so the client sees concepts as they are generated.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync, withSiteId } from '@/lib/db/site';
import { applyRateLimit } from '@/lib/rate-limit';
import { validateImageUpload } from '@/lib/image-validation';
import {
  type VisualizationResponse,
  type GeneratedConcept,
  type RoomType,
  type DesignStyle,
} from '@/lib/schemas/visualization';
import {
  visualizationRequestSchema,
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

// Extended request schema (same as non-streaming route)
const enhancedVisualizationRequestSchema = visualizationRequestSchema
  .omit({ roomType: true, style: true })
  .extend({
    roomType: z.union([
      z.enum(['kitchen', 'bathroom', 'living_room', 'bedroom', 'basement', 'dining_room', 'exterior']),
      z.literal('other'),
    ]),
    customRoomType: z.string().max(100).optional(),
    style: z.union([
      z.enum(['modern', 'traditional', 'farmhouse', 'industrial', 'minimalist', 'contemporary', 'transitional', 'scandinavian', 'coastal', 'mid_century_modern']),
      z.literal('other'),
    ]),
    customStyle: z.string().max(100).optional(),
    skipAnalysis: z.boolean().optional().default(false),
    photoAnalysis: z.record(z.string(), z.unknown()).optional(),
    designIntent: z.object({
      desiredChanges: z.array(z.string()),
      constraintsToPreserve: z.array(z.string()),
      materialPreferences: z.array(z.string()).optional(),
    }).optional(),
    voiceTranscript: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      timestamp: z.coerce.date(),
    })).optional(),
    voicePreferencesSummary: z.string().optional(),
    conversationContext: z.record(z.string(), z.unknown()).optional(),
    mode: z.enum(['quick', 'conversation', 'streamlined']).optional().default('quick'),
  });

export const maxDuration = 120;

// ── Photo analysis cache (same as non-streaming route) ──────────────────────
const photoAnalysisCache = new Map<string, { analysis: RoomAnalysis; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function hashImagePrefix(imageBase64: string): string {
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
  if (photoAnalysisCache.size > 50) {
    const oldest = [...photoAnalysisCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) photoAnalysisCache.delete(oldest[0]);
  }
}

// ── Storage helpers (same as non-streaming route) ──────────────────────────
async function uploadOriginalImage(
  supabase: ReturnType<typeof createServiceClient>,
  imageBase64: string
): Promise<string | null> {
  try {
    const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return null;
    const mimeType = matches[1];
    const base64Data = matches[2];
    const extension = mimeType?.split('/')[1] || 'jpg';
    const buffer = Buffer.from(base64Data ?? '', 'base64');
    const filename = `original/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const { data, error } = await supabase.storage
      .from('visualizations')
      .upload(filename, buffer, { contentType: mimeType || 'image/jpeg', upsert: false });
    if (error) {
      console.warn('Storage upload failed, using data URL as fallback');
      return imageBase64;
    }
    const { data: urlData } = supabase.storage.from('visualizations').getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch {
    console.warn('Storage exception occurred, using data URL as fallback');
    return imageBase64;
  }
}

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
      .upload(filename, buffer, { contentType: image.mimeType, upsert: false });
    if (error) {
      console.warn('Storage upload failed, using data URL as fallback');
      return `data:${image.mimeType};base64,${image.base64}`;
    }
    const { data: urlData } = supabase.storage.from('visualizations').getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch {
    console.warn('Storage exception occurred, using data URL as fallback');
    return `data:${image.mimeType};base64,${image.base64}`;
  }
}

async function generateWithRetry(
  imageBase64: string,
  config: VisualizationConfig,
  conceptIndex: number,
  maxRetries: number = 2
): Promise<GeneratedImage | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateVisualizationConcept(
        imageBase64, config, undefined, undefined, conceptIndex
      );
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isRateLimit = msg.includes('429') || msg.includes('quota') || msg.includes('rate');
      const isTimeout = msg.includes('timed out') || msg.includes('timeout');
      if (attempt < maxRetries && (isRateLimit || isTimeout)) {
        const delay = (attempt + 1) * 5000;
        console.warn(`Concept ${conceptIndex} attempt ${attempt + 1} failed, retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  return null;
}

function buildConceptDescription(config: VisualizationConfig, index: number): string {
  const { roomType, style, designIntent } = config;
  const styleName = style.charAt(0).toUpperCase() + style.slice(1);
  const roomName = roomType.replace('_', ' ');
  let description = `${styleName} ${roomName} design - Concept ${index + 1}`;
  if (designIntent?.desiredChanges && designIntent.desiredChanges.length > 0) {
    const highlights = designIntent.desiredChanges.slice(0, 2);
    description += ` featuring ${highlights.join(' and ')}`;
  }
  return description;
}

function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function getDeviceType(request: NextRequest): string {
  const ua = request.headers.get('user-agent') || '';
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet/i.test(ua)) return 'tablet';
  return 'desktop';
}

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
  metrics: MetricsInput,
  siteId: string
): Promise<void> {
  const analysisCost = metrics.photoAnalyzed ? 0.015 : 0;
  const depthCost = 0.002;
  const generationCost = metrics.conceptsGenerated * 0.10;
  const validationCost = metrics.validationScore !== undefined ? 0.01 : 0;
  const totalCost = analysisCost + depthCost + generationCost + validationCost;
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
  }, siteId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from as any)('visualization_metrics').insert(metricsData);
  if (error) {
    console.error('Failed to record visualization metrics:', error);
  }
}

// ── SSE helpers ─────────────────────────────────────────────────────────────
function sendEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: string,
  data: unknown,
  aborted: () => boolean
) {
  if (aborted()) return;
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

// ── POST handler ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request);
  if (limited) return limited;

  // Parse + validate body before opening the stream
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const parseResult = enhancedVisualizationRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return new Response(
      JSON.stringify({
        error: 'Invalid request',
        code: 'INVALID_IMAGE',
        details: parseResult.error.issues[0]?.message,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!process.env['GOOGLE_GENERATIVE_AI_API_KEY']) {
    return new Response(
      JSON.stringify({
        error: 'Image generation service unavailable',
        code: 'GENERATION_FAILED',
        details: 'The visualization service is temporarily unavailable. Please try again later.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const validated = parseResult.data;
  const siteId = await getSiteIdAsync();
  const encoder = new TextEncoder();
  const isAborted = () => request.signal.aborted;

  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();
      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        if (isAborted()) { clearInterval(heartbeat); return; }
        controller.enqueue(encoder.encode(':\n\n'));
      }, 15000);

      // Safety timeout — at 110s emit whatever we have and close
      const safetyTimeout = setTimeout(() => {
        sendEvent(controller, encoder, 'error', {
          type: 'error',
          message: 'Generation is taking longer than expected. Returning partial results.',
        }, isAborted);
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* already closed */ }
      }, 110000);

      try {
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
        } = validated;

        // Validate image MIME type and size before processing
        const imageCheck = validateImageUpload(image);
        if (!imageCheck.valid) {
          sendEvent(controller, encoder, 'error', {
            type: 'error', message: imageCheck.error,
          }, isAborted);
          clearInterval(heartbeat);
          clearTimeout(safetyTimeout);
          controller.close();
          return;
        }

        const supabase = createServiceClient();

        // ── 1. Upload original image ────────────────────────────────────
        sendEvent(controller, encoder, 'status', {
          type: 'status', stage: 'Uploading photo...', progress: 5,
        }, isAborted);

        const originalImageUrl = await uploadOriginalImage(supabase, image);
        if (!originalImageUrl) {
          sendEvent(controller, encoder, 'error', {
            type: 'error', message: 'Failed to store original image',
          }, isAborted);
          clearInterval(heartbeat);
          clearTimeout(safetyTimeout);
          controller.close();
          return;
        }

        // ── 2. Photo analysis ───────────────────────────────────────────
        sendEvent(controller, encoder, 'status', {
          type: 'status', stage: 'Analysing room structure...', progress: 10,
        }, isAborted);

        let photoAnalysis: RoomAnalysis | undefined;
        if (providedAnalysis) {
          photoAnalysis = providedAnalysis as RoomAnalysis;
        } else if (!skipAnalysis && process.env['OPENAI_API_KEY']) {
          const cached = getCachedAnalysis(image);
          if (cached) {
            photoAnalysis = cached;
          } else {
            try {
              photoAnalysis = await analyzeRoomPhotoForVisualization(image, roomType as RoomType);
              if (photoAnalysis) setCachedAnalysis(image, photoAnalysis);
            } catch (analysisError) {
              console.warn('Photo analysis failed, proceeding without:', analysisError);
            }
          }
        }

        // ── 3. Structural conditioning ──────────────────────────────────
        sendEvent(controller, encoder, 'status', {
          type: 'status', stage: 'Preparing design concepts...', progress: 15,
        }, isAborted);

        const referenceImages: ReferenceImage[] = [];
        let hasDepthMap = false;
        let hasEdgeMap = false;
        let depthRange: { min: number; max: number } | undefined;

        const sourceMimeType = image.match(/^data:([^;]+);/)?.[1] || 'image/jpeg';
        referenceImages.push({ base64: image, mimeType: sourceMimeType, role: 'source' });

        if (AI_CONFIG.pipeline.enableDepthEstimation || AI_CONFIG.pipeline.enableEdgeDetection) {
          const pipelinePromises: Promise<unknown>[] = [];
          if (AI_CONFIG.pipeline.enableDepthEstimation) {
            pipelinePromises.push(
              estimateDepth(image).then(result => {
                if (result) {
                  referenceImages.push({ base64: result.depthMapBase64, mimeType: result.mimeType, role: 'depth' });
                  hasDepthMap = true;
                  depthRange = { min: result.minDepth, max: result.maxDepth };
                }
              }).catch(err => console.warn('Depth estimation failed:', err))
            );
          }
          if (AI_CONFIG.pipeline.enableEdgeDetection) {
            pipelinePromises.push(
              extractEdges(image).then(result => {
                if (result) {
                  referenceImages.push({ base64: result.edgeMapBase64, mimeType: result.mimeType, role: 'edges' });
                  hasEdgeMap = true;
                }
              }).catch(err => console.warn('Edge detection failed:', err))
            );
          }
          await Promise.allSettled(pipelinePromises);
        }

        // ── 4. Build config ─────────────────────────────────────────────
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
          ...(roomType === 'other' && customRoomType && { customRoomType }),
          ...(style === 'other' && customStyle && { customStyle }),
          ...(voicePreferencesSummary && { voicePreferencesSummary }),
          useEnhancedPrompts: true,
          referenceImages: referenceImages.length > 1 ? referenceImages : undefined,
          hasDepthMap,
          hasEdgeMap,
          ...(depthRange && { depthRange }),
        };

        // ── 5. Parallel concept generation ──────────────────────────────
        sendEvent(controller, encoder, 'status', {
          type: 'status', stage: 'Generating renovation concepts...', progress: 20,
        }, isAborted);

        const concepts: GeneratedConcept[] = [];
        const progressPerConcept = [40, 55, 70, 85];

        // Fire ALL concepts in parallel
        const conceptPromises = Array.from({ length: count }, (_, i) =>
          (async () => {
            try {
              const result = await generateWithRetry(image, visualizationConfig, i);
              if (result) {
                const imageUrl = await uploadGeneratedImage(supabase, result, i);
                if (imageUrl) {
                  const concept: GeneratedConcept = {
                    id: `concept-${i + 1}-${Date.now()}`,
                    imageUrl,
                    description: buildConceptDescription(visualizationConfig, i),
                    generatedAt: new Date().toISOString(),
                  };
                  concepts.push(concept);

                  sendEvent(controller, encoder, 'concept', {
                    type: 'concept',
                    index: i,
                    imageUrl: concept.imageUrl,
                    description: concept.description,
                    total: count,
                  }, isAborted);

                  // Progress based on how many are done
                  const doneCount = concepts.length;
                  const progress = progressPerConcept[Math.min(doneCount - 1, progressPerConcept.length - 1)] ?? 85;
                  sendEvent(controller, encoder, 'status', {
                    type: 'status',
                    stage: `Generated ${doneCount} of ${count} concepts...`,
                    progress,
                  }, isAborted);
                }
              }
            } catch (error) {
              console.error(`Failed to generate concept ${i + 1}:`, error);
            }
          })()
        );

        await Promise.allSettled(conceptPromises);

        if (concepts.length === 0) {
          sendEvent(controller, encoder, 'error', {
            type: 'error',
            message: 'No visualization concepts could be generated. Please try again.',
          }, isAborted);
          clearInterval(heartbeat);
          clearTimeout(safetyTimeout);
          controller.close();
          return;
        }

        // ── 6. Description enrichment ───────────────────────────────────
        sendEvent(controller, encoder, 'status', {
          type: 'status', stage: 'Adding finishing touches...', progress: 90,
        }, isAborted);

        if (process.env['OPENAI_API_KEY']) {
          try {
            const conceptUrls = concepts.map(c => c.imageUrl);
            const descriptions = await generateConceptDescriptions(
              conceptUrls,
              effectiveRoomType,
              effectiveStyle,
            );
            for (let i = 0; i < Math.min(concepts.length, descriptions.length); i++) {
              const desc = descriptions[i];
              if (desc) {
                concepts[i] = { ...concepts[i]!, description: desc.shortDescription };
                // Emit updated concept with enriched description
                sendEvent(controller, encoder, 'concept', {
                  type: 'concept',
                  index: concepts.indexOf(concepts[i]!),
                  imageUrl: concepts[i]!.imageUrl,
                  description: desc.shortDescription,
                  total: count,
                }, isAborted);
              }
            }
          } catch (descError) {
            console.warn('Concept description enrichment failed:', descError);
          }
        }

        // ── 7. Database write ───────────────────────────────────────────
        const generationTimeMs = Date.now() - startTime;
        const shareToken = generateShareToken();

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
        const hasConversationData = designIntent || voicePreferencesSummary || (voiceTranscript && voiceTranscript.length > 0);

        const dbRoomType = roomType;
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
            ...(photoAnalysis && { photo_analysis: photoAnalysis }),
            ...(hasConversationData && { conversation_context: fullConversationContext }),
          }, siteId))
          .select()
          .single();

        if (dbError) {
          console.error('Database error (non-fatal):', dbError);
        }

        // Fire-and-forget: concept pricing + metrics
        if (!dbError && visualization && concepts.length > 0 && process.env['OPENAI_API_KEY']) {
          analyzeConceptForPricing(concepts[0]!.imageUrl, effectiveRoomType, effectiveStyle)
            .then(async (pricingAnalysis) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase.from('visualizations') as any)
                .update({ concept_pricing: pricingAnalysis })
                .eq('id', visualization.id)
                .eq('site_id', siteId);
            })
            .catch((err) => console.warn('Concept pricing analysis failed:', err));
        }

        if (!dbError && visualization) {
          recordVisualizationMetrics(supabase, {
            visualizationId: visualization.id,
            generationTimeMs,
            conceptsRequested: count,
            conceptsGenerated: concepts.length,
            mode: (mode === 'streamlined' ? 'quick' : mode) || 'quick',
            photoAnalyzed: !!photoAnalysis,
            conversationTurns: (conversationContext as Record<string, unknown>)?.['turnCount'] as number || 0,
          }, siteId).catch((err) => console.error('Failed to record metrics:', err));
        }

        // ── 8. Complete event ───────────────────────────────────────────
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

        sendEvent(controller, encoder, 'complete', {
          type: 'complete',
          visualizationId: response.id,
          concepts: response.concepts,
          visualization: response,
        }, isAborted);

      } catch (error) {
        console.error('Streaming visualization error:', error);
        sendEvent(controller, encoder, 'error', {
          type: 'error',
          message: 'An unexpected error occurred. Please try again.',
        }, isAborted);
      } finally {
        clearInterval(heartbeat);
        clearTimeout(safetyTimeout);
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Content-Encoding': 'none',
    },
  });
}
