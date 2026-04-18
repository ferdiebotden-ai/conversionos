/**
 * Vision Analysis
 * Functions for analyzing room photos using GPT-4o Vision
 */

import { generateObject } from 'ai';
import { openai, OPENAI_HIGH_EFFORT } from './providers';
import { AI_CONFIG } from './config';
import { RoomAnalysisSchema, type RoomAnalysis } from '@/lib/schemas/room-analysis';
import { z } from 'zod';

/**
 * Analyze a room photo to identify room type and features
 */
export async function analyzeRoomPhoto(imageBase64: string): Promise<RoomAnalysis | { error: string }> {
  try {
    const result = await generateObject({
      model: openai(AI_CONFIG.openai.vision),
      providerOptions: OPENAI_HIGH_EFFORT,
      schema: RoomAnalysisSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this room photo to help with a renovation estimate. Identify:

1. The room type (kitchen, bathroom, bedroom, living_room, basement, exterior, or other)
2. Your confidence level (0 to 1) in identifying the room
3. The current condition (good, fair, needs_work, or major_renovation_needed)
4. A list of identifiable features (cabinets, countertops, flooring type, fixtures, etc.)
5. An estimated room size if you can determine it (e.g., "approximately 12x15 feet" or null if unclear)
6. Any suggested improvements based on what you see
7. Any potential challenges for renovation (visible issues, layout constraints)

Be specific about features and realistic about condition assessment.`,
            },
            {
              type: 'image',
              image: imageBase64,
            },
          ],
        },
      ],
      maxOutputTokens: AI_CONFIG.parameters.vision.maxTokens,
      temperature: AI_CONFIG.parameters.vision.temperature,
    });

    return result.object;
  } catch (error) {
    console.error('Failed to analyze room photo:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to analyze the photo. Please try again.',
    };
  }
}

/**
 * Quick room type detection (faster, less detailed)
 */
export async function detectRoomType(imageBase64: string): Promise<{
  roomType: string;
  confidence: number;
} | { error: string }> {
  try {
    const result = await generateObject({
      model: openai(AI_CONFIG.openai.vision),
      providerOptions: OPENAI_HIGH_EFFORT,
      schema: z.object({
        roomType: z.enum(['kitchen', 'bathroom', 'bedroom', 'living_room', 'basement', 'exterior', 'other']),
        confidence: z.number().min(0).max(1),
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What type of room is shown in this photo? Provide the room type and your confidence level (0-1).',
            },
            {
              type: 'image',
              image: imageBase64,
            },
          ],
        },
      ],
      maxOutputTokens: 100,
      temperature: 0.3,
    });

    return result.object;
  } catch (error) {
    console.error('Failed to detect room type:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to detect room type. Please try again.',
    };
  }
}

/**
 * Validate that an image is appropriate for renovation analysis
 */
export async function validateRoomImage(imageBase64: string): Promise<{
  isValid: boolean;
  reason?: string;
}> {
  try {
    const result = await generateObject({
      model: openai(AI_CONFIG.openai.vision),
      providerOptions: OPENAI_HIGH_EFFORT,
      schema: z.object({
        isRoomPhoto: z.boolean(),
        isAppropriate: z.boolean(),
        reason: z.string().optional(),
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Is this image:
1. A photo of a room interior or exterior (for renovation purposes)
2. Appropriate content (not offensive, not a screenshot, not text-only)

If it's not suitable, explain why briefly.`,
            },
            {
              type: 'image',
              image: imageBase64,
            },
          ],
        },
      ],
      maxOutputTokens: 100,
      temperature: 0.2,
    });

    const { isRoomPhoto, isAppropriate, reason } = result.object;

    if (!isRoomPhoto) {
      return {
        isValid: false,
        reason: reason || 'This doesn\'t appear to be a room photo. Please upload a photo of the space you want to renovate.',
      };
    }

    if (!isAppropriate) {
      return {
        isValid: false,
        reason: reason || 'Please upload a clear photo of your room.',
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Failed to validate room image:', error);
    return {
      isValid: false,
      reason: 'Unable to validate the image. Please try uploading again.',
    };
  }
}
