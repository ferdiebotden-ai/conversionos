/**
 * ElevenLabs Conversational AI agent creation (Dominate tier only).
 * STUB — logs intention for now. Full implementation when Dominate tier demand exists.
 */

import * as logger from '../lib/logger.mjs';

/**
 * Create an ElevenLabs voice agent for a Dominate tier tenant.
 * @param {string} siteId - tenant site ID
 * @param {object} data - provisioned tenant data (business info, branding)
 * @returns {Promise<{ created: boolean, agentId?: string }>}
 */
export async function createVoiceAgent(siteId, data) {
  const businessName = data.business_name || siteId;

  logger.info(`[VOICE_AGENT] Would create ElevenLabs agent for ${siteId} (Dominate tier)`);
  logger.info(`[VOICE_AGENT] Business: ${businessName}`);
  logger.info(`[VOICE_AGENT] This is a stub — full implementation pending Dominate tier demand`);

  return { created: false, agentId: null };
}
