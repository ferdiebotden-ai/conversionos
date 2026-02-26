/**
 * Transcription API Route
 * Accepts audio via multipart/form-data, forwards to OpenAI Whisper for transcription.
 * Gated behind contractor_lead_intake entitlement.
 */

import { NextResponse } from 'next/server';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';

const OPENAI_API_KEY = process.env['OPENAI_API_KEY'];

/** Renovation-specific vocabulary prompt for better transcription accuracy. */
const RENOVATION_PROMPT =
  'Ontario renovation contractor job description. Terms: quartz countertops, egress window, rough-in plumbing, waterproofing membrane, soffit, fascia, R-2000, Schluter, Kerdi, Ditra, subway tile, shaker cabinets, soft-close, undermount sink.';

export async function POST(request: Request) {
  // Entitlement check
  const tier = await getTier();
  if (!canAccess(tier, 'contractor_lead_intake')) {
    return NextResponse.json(
      { error: 'Contractor lead intake is not available on your plan.' },
      { status: 403 },
    );
  }

  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Transcription service is not configured.' },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const audio = formData.get('audio');

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json(
        { error: 'Missing or invalid audio file.' },
        { status: 400 },
      );
    }

    // Forward to OpenAI Whisper API
    const whisperForm = new FormData();
    whisperForm.append('file', audio, 'recording.webm');
    whisperForm.append('model', 'gpt-4o-mini-transcribe');
    whisperForm.append('prompt', RENOVATION_PROMPT);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: whisperForm,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Whisper API error:', response.status, errorBody);
      return NextResponse.json(
        { error: 'Transcription failed. Please try again.' },
        { status: 502 },
      );
    }

    const result = await response.json() as { text: string };

    return NextResponse.json({ text: result.text });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during transcription.' },
      { status: 500 },
    );
  }
}
