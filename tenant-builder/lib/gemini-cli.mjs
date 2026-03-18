/**
 * Gemini CLI wrapper for build-time AI tasks.
 * Uses Google OAuth subscription (marginal cost $0).
 * Gemini CLI v0.33.0 installed at /opt/homebrew/bin/gemini
 *
 * IMPORTANT: Strips CLAUDECODE env var to avoid nested session issues
 * (same pattern as opus-cli.mjs).
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as logger from './logger.mjs';

const execFileAsync = promisify(execFile);

/**
 * Strip markdown code fences from a string.
 * Handles ```json\n...\n``` and ```\n...\n``` patterns.
 */
function stripCodeFences(str) {
  const trimmed = str.trim();
  const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  return match ? match[1].trim() : trimmed;
}

/**
 * Generate text via Gemini CLI (non-interactive headless mode).
 * @param {string} prompt - The prompt to send
 * @param {object} [options]
 * @param {string} [options.model='gemini-3.1-flash'] - Model to use
 * @param {number} [options.timeout=60000] - Timeout in ms
 * @returns {Promise<string|null>} Generated text, or null on failure
 */
export async function geminiGenerate(prompt, options = {}) {
  const { model = 'gemini-3.1-flash', timeout = 60000 } = options;

  const env = { ...process.env };
  delete env.CLAUDECODE; // Avoid nested session issues

  logger.debug(`Gemini CLI [model=${model}, timeout=${timeout}ms, prompt=${prompt.length} chars]`);

  try {
    const { stdout } = await execFileAsync('/opt/homebrew/bin/gemini', [
      '-p', prompt,
      '-m', model,
    ], { env, timeout, maxBuffer: 10 * 1024 * 1024 });
    return stdout.trim();
  } catch (e) {
    if (e.killed || e.signal === 'SIGTERM') {
      logger.warn(`Gemini CLI timed out after ${timeout}ms`);
    } else {
      logger.warn(`Gemini CLI failed: ${e.message?.slice(0, 200)}`);
    }
    return null;
  }
}

/**
 * Classify an image using Gemini CLI vision.
 * @param {string} imagePath - Local path to image file
 * @param {string} prompt - Classification prompt
 * @param {object} [options]
 * @param {string} [options.model='gemini-3.1-flash'] - Model to use
 * @param {number} [options.timeout=60000] - Timeout in ms
 * @returns {Promise<object|null>} Parsed JSON response or null
 */
export async function geminiClassifyImage(imagePath, prompt, options = {}) {
  const fullPrompt = `Analyze the image at: ${imagePath}\n\n${prompt}\n\nRespond with ONLY valid JSON, no markdown.`;
  const result = await geminiGenerate(fullPrompt, {
    model: 'gemini-3.1-flash',
    ...options,
  });

  if (!result) return null;

  try {
    const cleaned = stripCodeFences(result);
    return JSON.parse(cleaned);
  } catch {
    logger.debug(`Gemini classification response not valid JSON: ${result.slice(0, 200)}`);
    return null;
  }
}

/**
 * Analyze content with a structured prompt and return parsed JSON.
 * @param {string} prompt - Analysis prompt (should request JSON output)
 * @param {object} [options]
 * @param {string} [options.model='gemini-3.1-flash'] - Model to use
 * @param {number} [options.timeout=60000] - Timeout in ms
 * @returns {Promise<object|null>} Parsed JSON response or null
 */
export async function geminiAnalyze(prompt, options = {}) {
  const wrappedPrompt = `${prompt}\n\nRespond with ONLY valid JSON, no markdown.`;
  const result = await geminiGenerate(wrappedPrompt, {
    model: 'gemini-3.1-flash',
    ...options,
  });

  if (!result) return null;

  try {
    const cleaned = stripCodeFences(result);
    return JSON.parse(cleaned);
  } catch {
    logger.debug(`Gemini analyze response not valid JSON: ${result.slice(0, 200)}`);
    return null;
  }
}
