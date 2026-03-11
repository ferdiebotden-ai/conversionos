/**
 * Codex CLI wrapper — calls `codex exec --full-auto` as a subprocess.
 *
 * Updated for Codex 0.114.0 capabilities:
 * - --ephemeral: Clean runs without session persistence
 * - --add-dir: Additional writable directories (e.g., screenshots)
 * - --output-schema: Structured JSON output validated against schema
 * - -o: Capture last message output to file
 * - --json: JSONL streaming progress events
 * - --image: Full-resolution screenshot input (GPT 5.4 xhigh)
 *
 * Used by the custom section builder, vision architect, and code reviewer.
 * Runs on the Codex subscription (~$0 marginal cost per call).
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, existsSync } from 'node:fs';
import * as logger from './logger.mjs';

const execFileAsync = promisify(execFile);

/**
 * Run a Codex task in full-auto mode.
 *
 * @param {string} prompt - The task description for Codex
 * @param {object} [options]
 * @param {string} [options.cwd] - Working directory for Codex
 * @param {number} [options.timeoutMs=180000] - Timeout in milliseconds
 * @param {string[]} [options.images=[]] - Image file paths to pass via --image
 * @param {boolean} [options.ephemeral=false] - Clean run without session persistence
 * @param {string[]} [options.addDirs=[]] - Additional writable directories
 * @param {string} [options.outputSchema] - JSON Schema file path for structured output
 * @param {string} [options.outputFile] - File path to write last message output (-o)
 * @param {boolean} [options.json=false] - Enable JSONL streaming output
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
export async function codexExec(prompt, {
  cwd,
  timeoutMs = 180000,
  images = [],
  ephemeral = false,
  addDirs = [],
  outputSchema,
  outputFile,
  json = false,
} = {}) {
  logger.debug(`Codex exec [timeout=${timeoutMs}ms, prompt=${prompt.length} chars, images=${images.length}, ephemeral=${ephemeral}]`);

  const codexArgs = ['exec', '--full-auto'];

  if (ephemeral) codexArgs.push('--ephemeral');
  for (const dir of addDirs) codexArgs.push('--add-dir', dir);
  if (outputSchema) codexArgs.push('--output-schema', outputSchema);
  if (outputFile) codexArgs.push('-o', outputFile);
  if (json) codexArgs.push('--json');
  for (const img of images) codexArgs.push('--image', img);
  codexArgs.push(prompt);

  const { stdout, stderr } = await execFileAsync('codex', codexArgs, {
    cwd,
    timeout: timeoutMs,
    maxBuffer: 50 * 1024 * 1024,
    env: { ...process.env, CODEX_QUIET_MODE: '1' },
  });

  return { stdout, stderr };
}

/**
 * Run a Codex review (non-interactive code review quality gate).
 * Uses `codex exec review` introduced in 0.114.0.
 *
 * @param {string} reviewPrompt - Review instructions
 * @param {object} [options]
 * @param {string} [options.cwd] - Working directory
 * @param {number} [options.timeoutMs=120000] - Timeout
 * @param {boolean} [options.uncommitted=true] - Review uncommitted changes
 * @returns {Promise<{ stdout: string, stderr: string, issues: string[] }>}
 */
export async function codexReview(reviewPrompt, { cwd, timeoutMs = 120000, uncommitted = true } = {}) {
  logger.debug(`Codex review [timeout=${timeoutMs}ms]`);

  const codexArgs = ['exec', 'review'];
  if (uncommitted) codexArgs.push('--uncommitted');
  codexArgs.push(reviewPrompt);

  const { stdout, stderr } = await execFileAsync('codex', codexArgs, {
    cwd,
    timeout: timeoutMs,
    maxBuffer: 50 * 1024 * 1024,
    env: { ...process.env, CODEX_QUIET_MODE: '1' },
  });

  // Parse issues from review output
  const issues = stdout
    .split('\n')
    .filter(line => line.includes('Issue:') || line.includes('Error:') || line.includes('Warning:'))
    .map(line => line.trim());

  return { stdout, stderr, issues };
}

/**
 * Run a Codex task with structured JSON output.
 * Uses --output-schema for validated output + -o for file capture.
 *
 * @param {string} prompt
 * @param {string} schemaPath - Path to JSON Schema file
 * @param {string} outputPath - Path to write structured output
 * @param {object} [options]
 * @returns {Promise<object>} Parsed JSON output
 */
export async function codexStructured(prompt, schemaPath, outputPath, {
  cwd,
  timeoutMs = 300000,
  images = [],
  ephemeral = true,
} = {}) {
  await codexExec(prompt, {
    cwd,
    timeoutMs,
    images,
    ephemeral,
    outputSchema: schemaPath,
    outputFile: outputPath,
  });

  if (!existsSync(outputPath)) {
    throw new Error(`Codex structured output file not produced: ${outputPath}`);
  }
  return JSON.parse(readFileSync(outputPath, 'utf-8'));
}
