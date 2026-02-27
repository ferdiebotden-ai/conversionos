/**
 * Photo Pre-Analysis API Route
 * Runs GPT Vision photo analysis at upload time — before room type selection.
 * Returns room type, layout, condition, structural elements for the visualizer form.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  analyzeRoomPhotoForVisualization,
  type RoomAnalysis,
} from '@/lib/ai/photo-analyzer';
import { applyRateLimit } from '@/lib/rate-limit';

const requestSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
});

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues[0]?.message },
        { status: 400 },
      );
    }

    if (!process.env['OPENAI_API_KEY']) {
      return NextResponse.json(
        { error: 'Photo analysis unavailable' },
        { status: 503 },
      );
    }

    const { image } = parseResult.data;

    const analysis: RoomAnalysis = await analyzeRoomPhotoForVisualization(image);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Photo analysis error:', error);
    return NextResponse.json(
      { error: 'Photo analysis failed' },
      { status: 500 },
    );
  }
}
