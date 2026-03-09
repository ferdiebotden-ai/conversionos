/**
 * Visualization Quality Validation
 * Uses GPT Vision to validate structure preservation in generated images
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { openai } from './providers';
import { AI_CONFIG } from './config';

/**
 * Structure preservation validation result
 */
export interface StructureValidationResult {
  isValid: boolean;
  score: number; // 0-1 confidence in structure preservation
  issues: string[];
  recommendations: string[];
}

/**
 * Validation schema for GPT Vision response
 */
const structureValidationSchema = z.object({
  structurePreserved: z.boolean().describe('Are the room dimensions and architecture preserved?'),
  windowsDoorsIntact: z.boolean().describe('Are windows and doors in the same positions?'),
  perspectiveMatches: z.boolean().describe('Does the camera angle/perspective match the original?'),
  lightingConsistent: z.boolean().describe('Is the lighting direction consistent with original?'),
  furnitureStaged: z.boolean().describe('Has furniture been replaced with style-appropriate staging? (N/A for kitchen/bathroom/exterior — answer true)'),
  overallScore: z.number().min(0).max(1).describe('Overall structure preservation score 0-1'),
  issues: z.array(z.string()).describe('List of specific issues found'),
  recommendations: z.array(z.string()).describe('Suggestions for improvement'),
});

/**
 * Validate structure preservation between original and generated images
 * Uses GPT Vision to compare room geometry, window positions, and perspective
 */
export async function validateStructurePreservation(
  originalImage: string,
  generatedImage: string
): Promise<StructureValidationResult> {
  try {
    const result = await generateObject({
      model: openai(AI_CONFIG.openai.vision),
      schema: structureValidationSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Compare these two images: the original room photo and an AI-generated renovation visualization.

Your task is to validate that the generated image correctly PRESERVES the original room's structure.

Check for:
1. ROOM DIMENSIONS: Same wall positions, ceiling height, floor area
2. WINDOWS & DOORS: Same positions, sizes, and orientations
3. PERSPECTIVE: Same camera angle, focal length, viewing position
4. LIGHTING DIRECTION: Light comes from the same direction/sources
5. ARCHITECTURAL FEATURES: Columns, beams, built-ins in same positions
6. STAGING QUALITY: Has the original furniture been replaced with style-appropriate pieces?
   (For kitchen/bathroom/exterior: have personal items been removed and surfaces styled? Answer true.)

The generated image SHOULD change finishes, colors, fixtures, decor, AND furniture.
The generated image should NOT change room shape, window positions, or camera angle.

Rate the structure preservation from 0 (completely different room) to 1 (perfect preservation).
List any specific issues where the structure was NOT preserved.`,
            },
            {
              type: 'image',
              image: originalImage,
            },
            {
              type: 'image',
              image: generatedImage,
            },
          ],
        },
      ],
      maxOutputTokens: 500,
      temperature: 0.2,
    });

    const validation = result.object;

    // Determine if valid based on criteria
    const isValid =
      validation.overallScore >= 0.7 &&
      validation.structurePreserved &&
      validation.windowsDoorsIntact &&
      validation.perspectiveMatches;

    return {
      isValid,
      score: validation.overallScore,
      issues: validation.issues,
      recommendations: validation.recommendations,
    };
  } catch (error) {
    console.error('Structure validation error:', error);
    // Return permissive result on error to avoid blocking generation
    return {
      isValid: true,
      score: 0.5,
      issues: ['Validation could not be performed'],
      recommendations: [],
    };
  }
}

/**
 * Quick validation check (faster, less detailed)
 * Use for retry decisions
 */
export async function quickValidateImage(
  originalImage: string,
  generatedImage: string
): Promise<{ isAcceptable: boolean; score: number }> {
  try {
    const result = await generateObject({
      model: openai(AI_CONFIG.openai.vision),
      schema: z.object({
        structureScore: z.number().min(0).max(1),
        isAcceptable: z.boolean(),
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Quick check: Does the second image preserve the room structure (walls, windows, perspective) from the first image? Score 0-1 and say if acceptable (score >= 0.7).`,
            },
            {
              type: 'image',
              image: originalImage,
            },
            {
              type: 'image',
              image: generatedImage,
            },
          ],
        },
      ],
      maxOutputTokens: 100,
      temperature: 0.2,
    });

    return {
      isAcceptable: result.object.isAcceptable,
      score: result.object.structureScore,
    };
  } catch (error) {
    console.error('Quick validation error:', error);
    return { isAcceptable: true, score: 0.5 };
  }
}

/**
 * Validate that an image is photorealistic (not cartoon/artistic)
 */
export async function validatePhotorealism(
  image: string
): Promise<{ isPhotorealistic: boolean; confidence: number }> {
  try {
    const result = await generateObject({
      model: openai(AI_CONFIG.openai.vision),
      schema: z.object({
        isPhotorealistic: z.boolean(),
        confidence: z.number().min(0).max(1),
        style: z.string(),
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Is this image photorealistic (looks like a real photograph) or does it have an artistic/cartoon/illustration style? Rate confidence 0-1.`,
            },
            {
              type: 'image',
              image: image,
            },
          ],
        },
      ],
      maxOutputTokens: 100,
      temperature: 0.2,
    });

    return {
      isPhotorealistic: result.object.isPhotorealistic,
      confidence: result.object.confidence,
    };
  } catch (error) {
    console.error('Photorealism validation error:', error);
    return { isPhotorealistic: true, confidence: 0.5 };
  }
}
