/**
 * ElevenLabs Voice Configuration
 * Connection config, shared types, and utilities for ElevenLabs Conversational AI
 */

import type { PageContext, PersonaKey } from '@/lib/ai/personas/types';

// Single ElevenLabs agent env var — all page contexts use Emma
export const ELEVENLABS_AGENT_ENV_KEY = 'ELEVENLABS_AGENT_EMMA';

/**
 * Resolve the ElevenLabs agent env var key.
 * Always returns the single Emma agent key regardless of context or legacy persona.
 */
export function getAgentEnvKey(_context: PageContext | PersonaKey): string {
  return ELEVENLABS_AGENT_ENV_KEY;
}

// Voice connection statuses
export type VoiceConnectionStatus = 'disconnected' | 'connecting' | 'connected';

// Voice mode (speaking vs listening)
export type VoiceMode = 'speaking' | 'listening' | 'idle';

// Transcript entry from voice conversation
export interface VoiceTranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  source: 'voice';
}

// Voice error types
export type VoiceErrorCode =
  | 'PERMISSION_DENIED'
  | 'NOT_SUPPORTED'
  | 'CONNECTION_FAILED'
  | 'API_NOT_CONFIGURED'
  | 'UNKNOWN';

export const VOICE_ERROR_MESSAGES: Record<VoiceErrorCode, string> = {
  PERMISSION_DENIED: 'Please allow microphone access in your browser settings.',
  NOT_SUPPORTED: 'Voice mode requires a modern browser with WebRTC support.',
  CONNECTION_FAILED: 'Could not connect to voice service. Please try again.',
  API_NOT_CONFIGURED: 'Voice mode is not available right now. Please use text chat instead.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
};

/**
 * Check if the browser supports voice (WebRTC + AudioContext)
 */
export function isVoiceSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof window.RTCPeerConnection === 'function' &&
    typeof window.AudioContext === 'function'
  );
}

/**
 * Query microphone permission state.
 * Returns 'granted' | 'prompt' | 'denied' | 'unknown' (if Permissions API unsupported)
 */
export async function getMicrophonePermission(): Promise<
  'granted' | 'prompt' | 'denied' | 'unknown'
> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      return 'unknown';
    }
    const result = await navigator.permissions.query({
      name: 'microphone' as PermissionName,
    });
    return result.state as 'granted' | 'prompt' | 'denied';
  } catch {
    // Firefox and some browsers don't support microphone permission query
    return 'unknown';
  }
}

/**
 * Format duration in milliseconds to "M:SS"
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
