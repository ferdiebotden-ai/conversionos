/**
 * Voice Transcript Summary API
 * Called when a voice consultation with Emma ends.
 * Extracts structured design preferences from the conversation transcript.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@/lib/ai/providers';
import { z } from 'zod';

// Schema defined inline — this endpoint is unused (voice features removed)
const voiceSummaryResponseSchema = z.object({
  summary: z.string(),
  extractedPreferences: z.object({
    desiredChanges: z.array(z.string()),
    materialPreferences: z.array(z.string()),
    styleIndicators: z.array(z.string()),
    preservationNotes: z.array(z.string()),
  }),
});
import { applyRateLimit } from '@/lib/rate-limit';

export const maxDuration = 30;

const requestSchema = z.object({
  transcript: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.coerce.date(),
  })).min(1),
});

const SYSTEM_PROMPT = `You are an AI assistant that analyzes voice consultation transcripts between a homeowner and a renovation assistant (Emma) at a renovation company. Extract the homeowner's design preferences, desired changes, material preferences, and any elements they want to preserve.

Instructions:
- "summary" should be a concise 2-4 sentence paragraph summarizing what the homeowner discussed and wants.
- "desiredChanges" should list specific renovation changes the homeowner mentioned wanting (e.g., "open concept layout", "new countertops").
- "materialPreferences" should list any materials, finishes, or brands mentioned (e.g., "quartz", "brass hardware", "white oak flooring").
- "styleIndicators" should list aesthetic or style descriptors (e.g., "modern", "farmhouse", "bright and airy").
- "preservationNotes" should list anything the homeowner explicitly wants to keep or not change (e.g., "keep cabinet layout", "preserve original hardwood").

If a category has no relevant mentions in the transcript, return an empty array for that field.`;

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req);
  if (limited) return limited;

  try {
    const body = await req.json();

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { transcript } = parsed.data;

    // Format transcript as a readable conversation string
    const conversationText = transcript
      .map((entry) => `${entry.role === 'user' ? 'User' : 'Emma'}: ${entry.content}`)
      .join('\n');

    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: voiceSummaryResponseSchema,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Analyze this voice consultation transcript and extract the homeowner's design preferences:\n\n${conversationText}`,
        },
      ],
      maxOutputTokens: 1024,
      temperature: 0.3,
    });

    return NextResponse.json(result.object);
  } catch (error) {
    console.error('Voice summary API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
