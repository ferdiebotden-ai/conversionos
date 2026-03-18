/**
 * Agent Persona Types
 * Shared type definitions for AI agent personas
 */

/**
 * Page context determines which knowledge layers Emma receives.
 * Replaces the old multi-persona model (Emma/Marcus/Mia).
 */
export type PageContext = 'general' | 'estimate' | 'visualizer' | 'visualizer-discovery';

/**
 * @deprecated Use PageContext instead. Kept for backward compatibility during migration.
 */
export type PersonaKey = 'receptionist' | 'quote-specialist' | 'design-consultant';

/** Maps old PersonaKey values to new PageContext values */
export const PERSONA_TO_CONTEXT: Record<PersonaKey, PageContext> = {
  receptionist: 'general',
  'quote-specialist': 'estimate',
  'design-consultant': 'visualizer',
};

export interface AgentPersona {
  /** Agent's display name */
  name: string;
  /** Agent's role title */
  role: string;
  /** Short tagline shown in UI */
  tagline: string;
  /** Opening greeting message */
  greeting: string;
  /** Personality traits that shape responses */
  personalityTraits: string[];
  /** What this agent can help with */
  capabilities: string[];
  /** What this agent should NOT do */
  boundaries: string[];
  /** Lucide icon name for avatar */
  avatarIcon: string;
  /** Tailwind color class for avatar */
  avatarColor: string;
  /** ElevenLabs agent env var key */
  elevenlabsAgentEnvKey: string;
}
