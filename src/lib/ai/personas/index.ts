/**
 * Personas Index
 * Re-exports all persona modules
 */

export type { PageContext, PersonaKey, AgentPersona } from './types';
export { PERSONA_TO_CONTEXT } from './types';
export { EMMA_PERSONA } from './emma';
export {
  buildAgentSystemPrompt,
  buildVoiceSystemPrompt,
  buildDynamicSystemPrompt,
  detectKnowledgeDomain,
  getPersona,
} from './prompt-assembler';
