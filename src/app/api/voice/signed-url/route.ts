/**
 * ElevenLabs Voice - Signed URL Route
 * Generates signed WebSocket URLs for ElevenLabs Conversational AI.
 * Single Emma agent — page context controls which knowledge layers she receives.
 * Accepts ?context= (preferred) or legacy ?persona= (mapped via PERSONA_TO_CONTEXT).
 */

import { NextResponse } from 'next/server';
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';
import type { PageContext, PersonaKey } from '@/lib/ai/personas/types';
import { PERSONA_TO_CONTEXT } from '@/lib/ai/personas/types';
import { ELEVENLABS_AGENT_ENV_KEY } from '@/lib/voice/config';
import { buildVoiceSystemPrompt } from '@/lib/ai/personas/prompt-assembler';

const ELEVENLABS_API_KEY = process.env['ELEVENLABS_API_KEY']?.trim();

const VALID_CONTEXTS: PageContext[] = ['general', 'estimate', 'visualizer'];
const VALID_PERSONAS: PersonaKey[] = ['receptionist', 'quote-specialist', 'design-consultant'];

/**
 * Resolve page context from query params.
 * Prefers ?context=, falls back to legacy ?persona= (mapped via PERSONA_TO_CONTEXT).
 */
function resolvePageContext(url: URL): PageContext | null {
  const contextParam = url.searchParams.get('context') as PageContext | null;
  if (contextParam && VALID_CONTEXTS.includes(contextParam)) {
    return contextParam;
  }

  // Legacy backward compat: ?persona= mapped to PageContext
  const personaParam = url.searchParams.get('persona') as PersonaKey | null;
  if (personaParam && VALID_PERSONAS.includes(personaParam)) {
    return PERSONA_TO_CONTEXT[personaParam];
  }

  return null;
}

export async function POST(request: Request) {
  // Gate voice behind Dominate tier
  const tier = await getTier();
  if (!canAccess(tier, 'voice_web')) {
    return NextResponse.json(
      { error: 'Voice is not available on your current plan' },
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
    const context = resolvePageContext(url);

    if (!context) {
      return NextResponse.json(
        { error: 'Invalid or missing context parameter. Use ?context=general|estimate|visualizer' },
        { status: 400 }
      );
    }

    const agentId = process.env[ELEVENLABS_AGENT_ENV_KEY]?.trim();

    if (!agentId) {
      return NextResponse.json(
        { error: 'Voice agent not configured' },
        { status: 503 }
      );
    }

    // Build context-aware voice prompt for session override
    const voicePrompt = await buildVoiceSystemPrompt(context);

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

    return NextResponse.json({ signedUrl: data.signed_url, voicePrompt });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json(
      { error: 'Failed to initialize voice service' },
      { status: 500 }
    );
  }
}
