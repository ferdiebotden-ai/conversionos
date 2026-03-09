/**
 * Google AI Provider Configuration
 * Gemini provider setup for text and image generation
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Create Google AI provider instance for Vercel AI SDK (text generation)
// API key is read from GOOGLE_GENERATIVE_AI_API_KEY env variable automatically
export const google = createGoogleGenerativeAI({});

// Create native Google Generative AI client for image generation
// This is required because Vercel AI SDK doesn't support image output yet
const apiKey = process.env['GOOGLE_GENERATIVE_AI_API_KEY'];
export const googleNativeAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Image generation model (Nano Banana 2 — Pro quality at Flash speed, ~25% cheaper, 2-3x faster)
export const imageModel = 'gemini-3.1-flash-image-preview';

// Configuration for visualization generation
export const VISUALIZATION_CONFIG = {
  // Model to use for image generation
  model: imageModel,
  // How much to preserve the original room structure (0.0-1.0)
  // Higher = more faithful to original layout
  // Increased from 0.85 to 0.90 for better structure preservation
  structureReferenceStrength: 0.90,
  // How strongly to apply the style (0.0-1.0)
  // Moderate to avoid overwhelming the original image
  styleStrength: 0.4,
  // Number of variations to generate
  outputCount: 4,
  // Output resolution - increased to 2048x2048 for higher quality
  resolution: '2048x2048' as const,
  // Maximum generation time per concept (ms) — keep under maxDuration/2 for headroom
  timeout: 75000,
  // Preserve original room lighting
  preserveLighting: true,
  // Preserve shadows for realism
  preserveShadows: true,
} as const;

// Type for image generation result
export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

/** Reference image with role label for multi-image conditioning */
export interface ReferenceImage {
  base64: string;
  mimeType: string;
  role: 'source' | 'depth' | 'edges' | 'style';
}

/** Role-specific labels that Gemini receives as text prefixes */
const REFERENCE_IMAGE_LABELS: Record<ReferenceImage['role'], string> = {
  source: 'Original room photo to transform — preserve this room\'s exact structure and layout:',
  depth: 'Depth map showing spatial relationships (lighter = closer, darker = farther) — preserve this depth layout:',
  edges: 'Architectural edge map showing structural lines — preserve these edges in their exact positions:',
  style: 'Style reference image — apply this aesthetic to the room:',
};

/**
 * Timeout wrapper for async operations
 */
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage = 'Request timed out'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(timeoutMessage)), ms)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Generate an image using Gemini's native image generation capability
 * Uses gemini-3.1-flash-image-preview (Nano Banana 2) with responseModalities: ["Text", "Image"]
 * @throws Error if API key not configured or generation fails
 */
export async function generateImageWithGemini(
  prompt: string,
  inputImageBase64?: string,
  inputMimeType?: string,
  analysisContext?: string,
  referenceImages?: ReferenceImage[]
): Promise<GeneratedImage | null> {
  if (!googleNativeAI) {
    throw new Error('Image generation is not available. Please try again later.');
  }

  try {
    const model = googleNativeAI.getGenerativeModel({
      model: imageModel,
      generationConfig: {
        // Enable image output - this is the key configuration
        // @ts-expect-error - responseModalities is valid but not in older type definitions
        responseModalities: ['Text', 'Image'],
      },
      // System instruction for renovation visualization
      systemInstruction: `You are a professional interior design visualization AI for a renovation company.
Your job is to show how a room WILL LOOK after a complete professional renovation.

CRITICAL REQUIREMENTS:
- Preserve the EXACT room geometry, camera angle, and structural elements
- REPLACE existing furniture with style-appropriate pieces as specified in the prompt
- Remove personal items, clutter, and dated accessories
- Keep built-in elements (cabinetry, islands, vanities, built-in shelving) — transform their finishes
- For kitchens/bathrooms: focus on surfaces, fixtures, and countertop styling rather than furniture
- Stage the room as a professional interior designer would for a magazine photoshoot
- Maintain realistic lighting consistent with the original photo
- Keep windows, doors, and architectural features in their exact positions
- Generate photorealistic images suitable for client presentation
- The room must remain recognizable — same space, transformed and beautifully staged

COMMON PITFALLS TO AVOID:
- Do NOT keep the homeowner's existing furniture unless specifically instructed
- Do NOT change room dimensions, ceiling height, window/door positions
- Do NOT change the camera perspective or viewing angle
- Do NOT introduce new architectural features (arches, beams) not in the original
- Do NOT remove structural elements (columns, load-bearing walls)
- Do NOT dramatically alter natural lighting direction
- Do NOT overcrowd the room — leave appropriate negative space
- Do NOT use generic placeholder furniture — every piece must be specific to the style
${analysisContext ? `\nROOM ANALYSIS CONTEXT:\n${analysisContext}\nUse this analysis to ensure accurate structural preservation in the output.` : ''}
OUTPUT: A single high-resolution photorealistic renovation visualization at 2048x2048 resolution.`,
    });

    // Build the content parts
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    if (referenceImages && referenceImages.length > 0) {
      // Multi-image mode: add each reference image with a labeled text prefix
      for (const refImg of referenceImages) {
        const label = REFERENCE_IMAGE_LABELS[refImg.role];
        parts.push({ text: label });

        const base64Data = refImg.base64.includes('base64,')
          ? refImg.base64.split('base64,')[1]
          : refImg.base64;

        parts.push({
          inlineData: {
            mimeType: refImg.mimeType,
            data: base64Data ?? '',
          },
        });
      }
    } else if (inputImageBase64 && inputMimeType) {
      // Legacy single-image mode
      const base64Data = inputImageBase64.includes('base64,')
        ? inputImageBase64.split('base64,')[1]
        : inputImageBase64;

      parts.push({
        inlineData: {
          mimeType: inputMimeType,
          data: base64Data ?? '',
        },
      });
    }

    // Add the text prompt
    parts.push({ text: prompt });

    // Apply timeout to prevent hanging
    const response = await withTimeout(
      model.generateContent(parts),
      VISUALIZATION_CONFIG.timeout,
      'Image generation timed out. Please try again.'
    );
    const result = response.response;

    // Extract the generated image from the response
    const candidates = result.candidates;
    if (!candidates || candidates.length === 0) {
      console.error('No candidates in Gemini response');
      return null;
    }

    const content = candidates[0]?.content;
    if (!content?.parts) {
      console.error('No content parts in Gemini response');
      return null;
    }

    // Find the image part in the response
    for (const part of content.parts) {
      // Check if this part contains image data
      const partWithData = part as { inlineData?: { mimeType: string; data: string } };
      if (partWithData.inlineData?.data) {
        return {
          base64: partWithData.inlineData.data,
          mimeType: partWithData.inlineData.mimeType || 'image/png',
        };
      }
    }

    console.error('No image found in Gemini response');
    return null;
  } catch (error) {
    console.error('Gemini image generation error:', error);
    // Re-throw to allow caller to handle the error
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate image. Please try again.');
  }
}
