/**
 * Claude CLI wrapper for AI generation and review.
 * Calls `claude -p` with --output-format json and optional --json-schema.
 * Strips CLAUDECODE env var to avoid nested session issues.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as logger from './logger.mjs';

/**
 * Find the claude CLI binary path.
 * @returns {string}
 */
function findClaude() {
  // Common locations
  const candidates = [
    process.env.HOME + '/.local/bin/claude',
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
  ];
  for (const p of candidates) {
    try {
      execFileSync(p, ['--version'], { stdio: 'pipe' });
      return p;
    } catch { /* not found */ }
  }
  // Fall back to PATH
  return 'claude';
}

const CLAUDE_BIN = findClaude();

/**
 * Call claude -p with a prompt and return the parsed result.
 *
 * @param {string} prompt - The prompt text
 * @param {object} [options]
 * @param {string} [options.model='sonnet'] - Model to use (opus, sonnet, haiku)
 * @param {string} [options.schemaPath] - Path to a JSON schema file for structured output
 * @param {number} [options.maxTurns=3] - Max conversation turns
 * @param {number} [options.timeoutMs=120000] - Timeout in milliseconds
 * @returns {any} Parsed structured_output (with schema) or result (plain text)
 */
export function callClaude(prompt, options = {}) {
  const {
    model = 'sonnet',
    schemaPath,
    maxTurns = 3,
    timeoutMs = 120000,
  } = options;

  const args = [
    '-p', prompt,
    '--output-format', 'json',
    '--max-turns', String(maxTurns),
    '--model', model,
  ];

  if (schemaPath) {
    const schemaContent = readFileSync(resolve(schemaPath), 'utf-8');
    args.push('--json-schema', schemaContent);
  }

  // Strip CLAUDECODE to avoid nested session issues
  const env = { ...process.env };
  delete env.CLAUDECODE;

  logger.debug(`claude -p [model=${model}, schema=${schemaPath ? 'yes' : 'no'}]`);

  const stdout = execFileSync(CLAUDE_BIN, args, {
    env,
    timeout: timeoutMs,
    maxBuffer: 10 * 1024 * 1024, // 10MB
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const envelope = JSON.parse(stdout);

  // --json-schema puts result in structured_output; plain text in result
  if (schemaPath && envelope.structured_output !== undefined) {
    return envelope.structured_output;
  }
  return envelope.result;
}
