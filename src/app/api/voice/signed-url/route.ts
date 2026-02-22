/**
 * ElevenLabs Voice - Signed URL Route
 * Generates signed WebSocket URLs for ElevenLabs Conversational AI agents
 * Maps persona key → env var → agent ID, then fetches a signed URL
 */

import { NextResponse } from 'next/server';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';
import type { PersonaKey } from '@/lib/ai/personas/types';

const ELEVENLABS_API_KEY = process.env['ELEVENLABS_API_KEY']?.trim();

const VALID_PERSONAS: PersonaKey[] = ['receptionist', 'quote-specialist', 'design-consultant'];

const AGENT_ENV_MAP: Record<PersonaKey, string> = {
  receptionist: 'ELEVENLABS_AGENT_EMMA',
  'quote-specialist': 'ELEVENLABS_AGENT_MARCUS',
  'design-consultant': 'ELEVENLABS_AGENT_MIA',
};

export async function POST(request: Request) {
  // Gate voice behind Dominate tier
  const tier = await getTier();
  if (!canAccess(tier, 'voice_web')) {
    return NextResponse.json(
      { error: 'Voice agents require the Dominate plan' },
      { status: 403 }
    );
  }

  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: 'Voice service not configured' },
      { status: 503 }
    );
  }

  try {
    const url = new URL(request.url);
    const personaParam = url.searchParams.get('persona') as PersonaKey | null;

    if (!personaParam || !VALID_PERSONAS.includes(personaParam)) {
      return NextResponse.json(
        { error: 'Invalid persona parameter' },
        { status: 400 }
      );
    }

    const envKey = AGENT_ENV_MAP[personaParam];
    const agentId = process.env[envKey]?.trim();

    if (!agentId) {
      return NextResponse.json(
        { error: `Agent not configured for ${personaParam}` },
        { status: 503 }
      );
    }

    // Fetch signed URL from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('ElevenLabs signed URL error:', errorData);
      return NextResponse.json(
        { error: 'Failed to generate voice session URL' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json(
      { error: 'Failed to initialize voice service' },
      { status: 500 }
    );
  }
}
