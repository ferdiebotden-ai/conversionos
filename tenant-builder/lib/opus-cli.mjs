/**
 * Opus 4.6 CLI wrapper — calls `claude -p` as a subprocess.
 *
 * Used by the architect module for design analysis. Runs on the
 * Claude Max flat-rate subscription (~$0 marginal cost per call).
 *
 * IMPORTANT: Strips CLAUDECODE env var to avoid nested session issues.
 */

import { spawn } from 'node:child_process';
import * as logger from './logger.mjs';

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
 * Call Opus 4.6 via `claude -p` subprocess and return parsed JSON.
 *
 * Sends the prompt via stdin (not as a CLI argument) to avoid OS
 * argument length limits on long prompts.
 *
 * @param {string} prompt - The prompt text
 * @param {object} [options]
 * @param {number} [options.timeoutMs=120000] - Timeout in milliseconds
 * @returns {Promise<any>} Parsed JSON response
 */
export async function callOpus(prompt, { timeoutMs = 120000 } = {}) {
  const env = { ...process.env };
  delete env.CLAUDECODE; // Avoid nested session issues

  logger.debug(`Opus CLI [timeout=${timeoutMs}ms, prompt=${prompt.length} chars]`);

  const stdout = await new Promise((resolve, reject) => {
    const child = spawn('claude', ['-p', '--output-format', 'json'], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let out = '';
    let err = '';
    child.stdout.on('data', chunk => { out += chunk; });
    child.stderr.on('data', chunk => { err += chunk; });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Opus CLI timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`claude -p exited with code ${code}: ${err || out}`));
      } else {
        resolve(out);
      }
    });

    child.on('error', e => {
      clearTimeout(timer);
      reject(e);
    });

    // Send prompt via stdin and close the stream
    child.stdin.write(prompt);
    child.stdin.end();
  });

  // claude -p --output-format json wraps output in { result, ... }
  const wrapper = JSON.parse(stdout);
  const content = wrapper.result ?? wrapper;

  // The model may return a JSON string inside the result — unwrap it
  if (typeof content === 'string') {
    const cleaned = stripCodeFences(content);
    try {
      return JSON.parse(cleaned);
    } catch {
      return content;
    }
  }
  return content;
}
