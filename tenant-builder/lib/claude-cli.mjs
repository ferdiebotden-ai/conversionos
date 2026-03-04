/**
 * AI generation wrapper using OpenAI API (GPT Business plan).
 *
 * Replaces the previous Claude CLI (`claude -p`) approach to avoid
 * nested session issues and Claude Code token consumption.
 * JSON schemas are directly compatible with OpenAI structured outputs.
 *
 * Exports both `callClaude` (backward-compatible name) and `callAI`.
 */

import OpenAI from 'openai';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as logger from './logger.mjs';

let _client;
function getClient() {
  if (!_client) _client = new OpenAI(); // Uses OPENAI_API_KEY from env (set by loadEnv())
  return _client;
}

/**
 * Call OpenAI API with a prompt and return the parsed result.
 *
 * @param {string} prompt - The prompt text
 * @param {object} [options]
 * @param {string} [options.model='gpt-4o'] - OpenAI model to use
 * @param {string} [options.schemaPath] - Path to a JSON schema file for structured output
 * @param {number} [options.maxTurns] - Unused (kept for backward compatibility)
 * @param {number} [options.timeoutMs=120000] - Timeout in milliseconds
 * @returns {Promise<any>} Parsed structured output (with schema) or text content
 */
export async function callAI(prompt, options = {}) {
  const {
    model = 'gpt-4o',
    schemaPath,
    timeoutMs = 120000,
  } = options;

  let responseFormat;
  if (schemaPath) {
    const schema = JSON.parse(readFileSync(resolve(schemaPath), 'utf-8'));
    responseFormat = {
      type: 'json_schema',
      json_schema: { name: 'result', strict: true, schema },
    };
  }

  logger.debug(`OpenAI API [model=${model}, schema=${schemaPath ? 'yes' : 'no'}]`);

  const response = await getClient().chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    ...(responseFormat ? { response_format: responseFormat } : {}),
  }, { timeout: timeoutMs });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`OpenAI returned no content (finish_reason: ${response.choices[0]?.finish_reason})`);
  }

  // With structured output, parse JSON; otherwise return text
  if (schemaPath) {
    return JSON.parse(content);
  }
  return content;
}

// Backward-compatible export — callers can use either name
export const callClaude = callAI;
