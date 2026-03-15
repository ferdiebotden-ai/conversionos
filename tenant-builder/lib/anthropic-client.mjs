/**
 * Claude CLI wrapper — uses `claude -p` subprocess via Max subscription.
 * No API key needed. Strips CLAUDECODE env var to avoid nested session issues.
 *
 * This replaces the previous @anthropic-ai/sdk approach that required ANTHROPIC_API_KEY.
 * The claude CLI authenticates via the Max subscription automatically.
 */

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * Send a prompt to Claude via `claude -p` subprocess.
 * Uses the Max subscription — no API key needed.
 *
 * @param {string} prompt - Text prompt
 * @param {object} [options]
 * @param {string} [options.model] - Model hint (ignored — claude -p uses account default)
 * @param {number} [options.maxTokens=4096] - Max output tokens (advisory)
 * @param {Array<{path?: string, base64?: string, mediaType?: string}>} [options.images] - Not supported via CLI (ignored with warning)
 * @param {string} [options.systemPrompt] - Prepended to prompt as context
 * @returns {Promise<string>} - Response text
 */
export async function callClaude(prompt, { model, maxTokens = 4096, images = [], systemPrompt } = {}) {
  // Build the full prompt with optional system context
  let fullPrompt = prompt;
  if (systemPrompt) {
    fullPrompt = `${systemPrompt}\n\n---\n\n${prompt}`;
  }

  if (images.length > 0) {
    // claude -p doesn't support inline images — note in prompt
    fullPrompt += '\n\n(Note: image inputs were requested but are not supported in this mode.)';
  }

  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.CLAUDECODE; // Avoid nested session issues

    const child = spawn('claude', ['-p', '--output-format', 'text'], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000, // 2 minute timeout
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`claude -p exited with code ${code}: ${stderr || stdout}`));
      } else {
        resolve(stdout.trim());
      }
    });

    child.on('error', (err) => {
      reject(new Error(`claude -p spawn error: ${err.message}`));
    });

    // Write prompt to stdin
    child.stdin.write(fullPrompt);
    child.stdin.end();
  });
}

/**
 * Parse a JSON response from Claude, handling markdown code fences.
 */
export function parseJsonResponse(text) {
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();
  return JSON.parse(cleaned);
}
