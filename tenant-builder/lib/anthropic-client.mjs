/**
 * Anthropic SDK client for direct API calls.
 * Replaces the nested `claude -p` subprocess that fails in active Claude Code sessions
 * due to CLAUDECODE env var conflicts.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';

let _client = null;

function getClient() {
  if (!_client) {
    // Load API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/**
 * Send a prompt to Claude with optional image inputs.
 * @param {string} prompt - Text prompt
 * @param {object} [options]
 * @param {string} [options.model='claude-sonnet-4-6-20250514'] - Model to use
 * @param {number} [options.maxTokens=4096] - Max output tokens
 * @param {Array<{path?: string, base64?: string, mediaType?: string}>} [options.images] - Image inputs
 * @param {string} [options.systemPrompt] - System prompt
 * @returns {Promise<string>} - Response text
 */
export async function callClaude(prompt, { model = 'claude-sonnet-4-6-20250514', maxTokens = 4096, images = [], systemPrompt } = {}) {
  const client = getClient();

  const content = [];

  // Add images first
  for (const img of images) {
    let base64Data, mediaType;
    if (img.path) {
      const buf = readFileSync(img.path);
      base64Data = buf.toString('base64');
      mediaType = img.path.endsWith('.png') ? 'image/png' : 'image/jpeg';
    } else if (img.base64) {
      base64Data = img.base64;
      mediaType = img.mediaType || 'image/png';
    }
    if (base64Data) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64Data },
      });
    }
  }

  // Add text prompt
  content.push({ type: 'text', text: prompt });

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: [{ role: 'user', content }],
  });

  return response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');
}

/**
 * Parse a JSON response from Claude, handling markdown code fences.
 */
export function parseJsonResponse(text) {
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();
  return JSON.parse(cleaned);
}
