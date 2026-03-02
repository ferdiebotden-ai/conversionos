/**
 * Single-Concept Refinement API Route
 * Re-generates the starred concept using original photo (geometry) + starred
 * concept (aesthetic) as Gemini reference images, enhanced with design signals
 * gathered during the estimate conversation.
 *
 * POST /api/ai/visualize/refine
 * Not SSE — single image response (~15-30s).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/db/server';
import { getSiteIdAsync } from '@/lib/db/site';
import { applyRateLimit } from '@/lib/rate-limit';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';
import { generateImageWithGemini, type ReferenceImage } from '@/lib/ai/gemini';
import { buildRenovationPrompt, type RenovationPromptData } from '@/lib/ai/prompt-builder';
import type { DesignSignal } from '@/lib/ai/rendering-gate';
import type { RoomType, DesignStyle } from '@/lib/schemas/visualization';

export const maxDuration = 60;

// ── Request schema ──────────────────────────────────────────────────────────

const designSignalSchema = z.object({
  category: z.enum(['material', 'structural', 'finish', 'budget', 'dimensions', 'scope']),
  detail: z.string(),
  points: z.number(),
});

const refineRequestSchema = z.object({
  visualizationId: z.string().min(1),
  starredConceptIndex: z.number().int().min(0),
  designSignals: z.array(designSignalSchema).default([]),
  conversationMessages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).default([]),
  estimateData: z.object({
    projectType: z.string().optional(),
    areaSqft: z.number().optional(),
    finishLevel: z.string().optional(),
    timeline: z.string().optional(),
    goals: z.array(z.string()).optional(),
  }).optional(),
  refinementNumber: z.number().int().min(1).max(5),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      base64: buffer.toString('base64'),
      mimeType: contentType.split(';')[0] || 'image/jpeg',
    };
  } catch {
    return null;
  }
}

function buildRefinementSummary(signals: DesignSignal[]): string {
  return signals.map(s => s.detail).join(', ');
}

/**
 * Build a conversational refinement section appended to the base prompt.
 * This tells Gemini to start from the style reference and apply specific changes.
 */
function buildRefinementAddendum(
  signals: DesignSignal[],
  conversationMessages: { role: string; content: string }[],
  estimateData?: z.infer<typeof refineRequestSchema>['estimateData'],
): string {
  const sections: string[] = [];

  sections.push(`=== CONVERSATIONAL REFINEMENT ===
Use the STYLE reference image as your starting aesthetic. Apply the following refinements
while preserving room structure from the SOURCE reference image.`);

  // Include conversation context so Gemini understands what the homeowner wants
  if (conversationMessages.length > 0) {
    const recentMessages = conversationMessages.slice(-10);
    sections.push(`Recent conversation between the homeowner and design assistant:
${recentMessages.map(m => `${m.role === 'user' ? 'Homeowner' : 'Assistant'}: ${m.content}`).join('\n')}`);
    sections.push(`Pay close attention to the homeowner's requests above. Apply any design preferences, material choices, or changes they mentioned.`);
  }

  const materials = signals.filter(s => s.category === 'material');
  if (materials.length > 0) {
    sections.push(`Material Preferences (from homeowner conversation):
${materials.map(m => `- ${m.detail}`).join('\n')}`);
  }

  const structural = signals.filter(s => s.category === 'structural');
  if (structural.length > 0) {
    sections.push(`Structural Changes Requested:
${structural.map(s => `- ${s.detail}`).join('\n')}`);
  }

  const finishes = signals.filter(s => s.category === 'finish');
  if (finishes.length > 0) {
    sections.push(`Finish & Colour Preferences:
${finishes.map(f => `- ${f.detail}`).join('\n')}`);
  }

  const budget = signals.filter(s => s.category === 'budget');
  if (budget.length > 0) {
    sections.push(`Budget Context: ${budget.map(b => b.detail).join(', ')}`);
  }

  const dimensions = signals.filter(s => s.category === 'dimensions');
  if (dimensions.length > 0) {
    sections.push(`Room Dimensions: confirmed by homeowner`);
  }

  const scope = signals.filter(s => s.category === 'scope');
  if (scope.length > 0) {
    sections.push(`Project Scope: ${scope.map(s => s.detail).join(', ')}`);
  }

  if (estimateData) {
    const contextParts: string[] = [];
    if (estimateData.finishLevel) contextParts.push(`Finish level: ${estimateData.finishLevel}`);
    if (estimateData.areaSqft) contextParts.push(`Area: ~${estimateData.areaSqft} sq ft`);
    if (estimateData.timeline) contextParts.push(`Timeline: ${estimateData.timeline}`);
    if (contextParts.length > 0) {
      sections.push(`Estimate Context:\n${contextParts.map(p => `- ${p}`).join('\n')}`);
    }
  }

  sections.push(`IMPORTANT: This is a refinement of an existing concept. Maintain the overall aesthetic
from the style reference while incorporating the specific changes listed above. The result
should feel like a natural evolution, not a completely different design.`);

  return sections.join('\n\n');
}

// ── POST handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request);
  if (limited) return limited;

  const startTime = Date.now();

  // 1. Verify tier (estimate page = Accelerate+)
  const tier = await getTier();
  if (!canAccess(tier, 'ai_quote_engine')) {
    return NextResponse.json(
      { error: 'This feature requires the Accelerate plan or higher.' },
      { status: 403 },
    );
  }

  // 2. Parse + validate
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parseResult = refineRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parseResult.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const { visualizationId, starredConceptIndex, designSignals, conversationMessages, estimateData, refinementNumber } = parseResult.data;
  const siteId = await getSiteIdAsync();

  // 3. Fetch visualization record
  // photo_analysis may not be in generated types — use `as any` pattern
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: visualization, error: dbError } = await (supabase.from('visualizations') as any)
    .select('id, original_photo_url, generated_concepts, room_type, style, photo_analysis')
    .eq('id', visualizationId)
    .eq('site_id', siteId)
    .single();

  if (dbError || !visualization) {
    return NextResponse.json({ error: 'Visualization not found' }, { status: 404 });
  }

  // 4. Validate starred concept index
  const concepts = visualization.generated_concepts as { id: string; imageUrl: string; description?: string; refinedImageUrl?: string; refinedAt?: string }[] | null;
  if (!concepts || starredConceptIndex >= concepts.length) {
    return NextResponse.json(
      { error: 'Invalid concept index' },
      { status: 400 },
    );
  }

  const starredConcept = concepts[starredConceptIndex];
  if (!starredConcept?.imageUrl) {
    return NextResponse.json(
      { error: 'Starred concept has no image' },
      { status: 400 },
    );
  }

  // 5. Download both images as base64
  const [originalImage, starredImage] = await Promise.all([
    fetchImageAsBase64(visualization.original_photo_url),
    fetchImageAsBase64(starredConcept.imageUrl),
  ]);

  if (!originalImage) {
    return NextResponse.json(
      { error: 'Could not fetch original photo' },
      { status: 500 },
    );
  }

  if (!starredImage) {
    return NextResponse.json(
      { error: 'Could not fetch starred concept image' },
      { status: 500 },
    );
  }

  // 6. Build reference images: source (geometry) + style (aesthetic)
  const referenceImages: ReferenceImage[] = [
    { base64: originalImage.base64, mimeType: originalImage.mimeType, role: 'source' },
    { base64: starredImage.base64, mimeType: starredImage.mimeType, role: 'style' },
  ];

  // 7. Build enhanced prompt
  const roomType = visualization.room_type as RoomType;
  const style = visualization.style as DesignStyle;

  const materialPreferences = designSignals
    .filter(s => s.category === 'material')
    .map(s => s.detail);

  const desiredChanges = designSignals
    .filter(s => s.category === 'structural' || s.category === 'finish')
    .map(s => s.detail);

  const photoAnalysis = visualization.photo_analysis as RenovationPromptData['photoAnalysis'];
  const promptData: RenovationPromptData = {
    roomType,
    style,
    ...(photoAnalysis && { photoAnalysis }),
    designIntent: {
      desiredChanges,
      constraintsToPreserve: ['existing room structure', 'camera angle and perspective'],
      ...(materialPreferences.length > 0 && { materialPreferences }),
    },
  };

  const basePrompt = buildRenovationPrompt(promptData);
  const refinementAddendum = buildRefinementAddendum(designSignals, conversationMessages, estimateData);
  const fullPrompt = `${basePrompt}\n\n${refinementAddendum}`;

  // 8. Generate with Gemini
  const analysisContext = visualization.photo_analysis
    ? JSON.stringify(visualization.photo_analysis)
    : undefined;

  let generatedImage;
  try {
    generatedImage = await generateImageWithGemini(
      fullPrompt,
      undefined,
      undefined,
      analysisContext,
      referenceImages,
    );
  } catch (error) {
    console.error('Refinement generation failed:', error);
    return NextResponse.json(
      { error: 'Rendering could not be completed. Please try again.' },
      { status: 500 },
    );
  }

  if (!generatedImage) {
    return NextResponse.json(
      { error: 'No image was generated. Please try again.' },
      { status: 500 },
    );
  }

  // 9. Upload to Supabase Storage
  let imageUrl: string;
  try {
    const extension = generatedImage.mimeType.split('/')[1] || 'png';
    const filename = `refined/${visualizationId}-${refinementNumber}-${Date.now()}.${extension}`;
    const buffer = Buffer.from(generatedImage.base64, 'base64');

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('visualizations')
      .upload(filename, buffer, { contentType: generatedImage.mimeType, upsert: false });

    if (uploadError) {
      console.warn('Storage upload failed, using data URL fallback');
      imageUrl = `data:${generatedImage.mimeType};base64,${generatedImage.base64}`;
    } else {
      const { data: urlData } = supabase.storage
        .from('visualizations')
        .getPublicUrl(uploadData.path);
      imageUrl = urlData.publicUrl;
    }
  } catch {
    imageUrl = `data:${generatedImage.mimeType};base64,${generatedImage.base64}`;
  }

  // 10. Persist refined image URL in generated_concepts JSONB
  try {
    const updatedConcepts = concepts.map((c, i) => {
      if (i !== starredConceptIndex) return c;
      return { ...c, refinedImageUrl: imageUrl, refinedAt: new Date().toISOString() };
    }) as Record<string, unknown>[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('visualizations') as any)
      .update({ generated_concepts: updatedConcepts })
      .eq('id', visualizationId)
      .eq('site_id', siteId);
  } catch (err) {
    // Non-fatal — the image was already uploaded successfully
    console.warn('Failed to persist refined image in generated_concepts:', err);
  }

  // 11. Return result
  const generationTimeMs = Date.now() - startTime;

  return NextResponse.json({
    imageUrl,
    description: buildRefinementSummary(designSignals),
    refinementNumber,
    generationTimeMs,
  });
}
