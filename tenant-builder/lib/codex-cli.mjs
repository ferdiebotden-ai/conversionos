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
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
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
  model,
} = {}) {
  // Try Codex first with a short timeout, then fall back to Claude CLI
  const codexTimeout = Math.min(timeoutMs, 30000); // Cap Codex at 30s — if it hasn't started in 30s, it's hanging
  logger.debug(`Codex exec [timeout=${codexTimeout}ms, prompt=${prompt.length} chars, images=${images.length}, ephemeral=${ephemeral}]`);

  const codexArgs = ['exec', '--full-auto'];

  if (ephemeral) codexArgs.push('--ephemeral');
  for (const dir of addDirs) codexArgs.push('--add-dir', dir);
  if (outputSchema) codexArgs.push('--output-schema', outputSchema);
  if (outputFile) codexArgs.push('-o', outputFile);
  if (json) codexArgs.push('--json');
  for (const img of images) codexArgs.push('--image', img);
  codexArgs.push(prompt);

  try {
    const { stdout, stderr } = await execFileAsync('codex', codexArgs, {
      cwd,
      timeout: codexTimeout,
      maxBuffer: 50 * 1024 * 1024,
      env: { ...process.env, CODEX_QUIET_MODE: '1' },
    });
    return { stdout, stderr };
  } catch (codexErr) {
    // Codex failed or timed out — fall back to Claude CLI
    logger.info(`Codex failed (${codexErr.killed ? 'timeout' : 'error'}), falling back to Claude CLI`);
    return claudeCodeGen(prompt, { cwd, timeoutMs, outputFile, model: options?.model });
  }
}

/**
 * Claude CLI fallback for code generation.
 * Uses `claude -p` to generate code, extracts it from the output, and writes to file.
 *
 * @param {string} prompt - The code generation prompt
 * @param {object} [options]
 * @param {string} [options.cwd] - Working directory
 * @param {number} [options.timeoutMs=300000] - Timeout
 * @param {string} [options.outputFile] - File path to write output
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
export async function claudeCodeGen(prompt, { cwd, timeoutMs = 300000, outputFile, model } = {}) {
  // Adapt the prompt for Claude CLI — ask it to output ONLY the code
  const codePrompt = prompt + '\n\nIMPORTANT: Output ONLY the complete file content. No markdown fences, no explanations, no commentary. Just the raw TypeScript/React code.';

  logger.debug(`Claude CLI codegen [timeout=${timeoutMs}ms, prompt=${prompt.length} chars, model=${model || 'default'}]`);

  const claudeArgs = ['-p', codePrompt, '--output-format', 'text',
    '--max-turns', '10',              // Prevent runaway loops
    '--no-session-persistence',       // Clean batch runs — no session file accumulation
  ];
  if (model) claudeArgs.push('--model', model);

  const { stdout, stderr } = await execFileAsync('claude', claudeArgs, {
    cwd,
    timeout: timeoutMs,
    maxBuffer: 50 * 1024 * 1024,
    env: { ...process.env, CLAUDECODE: '' },  // Strip to prevent nested sessions
  });

  let code = stdout.trim();

  // Strip markdown code fences if present
  const fenceMatch = code.match(/^```(?:tsx?|jsx?|typescript|javascript|react)?\s*\n([\s\S]*?)\n```$/m);
  if (fenceMatch) {
    code = fenceMatch[1].trim();
  } else {
    // Try to extract the largest code block if multiple fences exist
    const allFences = [...code.matchAll(/```(?:tsx?|jsx?|typescript|javascript|react)?\s*\n([\s\S]*?)\n```/gm)];
    if (allFences.length > 0) {
      code = allFences.reduce((a, b) => a[1].length > b[1].length ? a : b)[1].trim();
    }
  }

  // If the prompt mentions a specific file path, try to write the code there
  const filePathMatch = prompt.match(/Create file:\s*(.+\.tsx?)\b/i);
  if (filePathMatch && cwd) {
    const targetPath = filePathMatch[1].trim();
    const fullPath = targetPath.startsWith('/') ? targetPath : `${cwd}/${targetPath}`;
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, code);
    logger.info(`Claude CLI wrote ${code.length} chars to ${targetPath}`);
  }

  if (outputFile) {
    mkdirSync(dirname(outputFile), { recursive: true });
    writeFileSync(outputFile, code);
  }

  return { stdout: code, stderr: stderr || '' };
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
