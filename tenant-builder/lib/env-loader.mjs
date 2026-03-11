/**
 * Environment variable loader.
 * Loads from demo .env.local first, then ~/pipeline/scripts/.env.
 * First value wins — existing env vars are not overwritten.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEMO_ROOT = resolve(import.meta.dirname, '../../');
// Try multiple known locations for the pipeline .env
const PIPELINE_ENV_CANDIDATES = [
  resolve(process.env.HOME, 'norbot-ops/products/pipeline/scripts/.env'),
  resolve(process.env.HOME, 'Norbot-Systems/products/conversionos/pipeline/scripts/.env'),
  resolve(process.env.HOME, 'pipeline/scripts/.env'),
];

/**
 * Parse a .env file and set variables that are not already defined.
 * Handles KEY=VALUE, KEY="VALUE", KEY='VALUE'. Skips comments and blanks.
 */
function parseEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^(?:export\s+)?([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^["']|["']$/g, '').replace(/\r/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch {
    // File not found — silently skip
  }
}

/**
 * Load environment variables from both env files.
 * Demo .env.local takes priority (Supabase vars), then pipeline .env (API keys, Turso).
 */
export function loadEnv() {
  parseEnvFile(resolve(DEMO_ROOT, '.env.local'));
  for (const candidate of PIPELINE_ENV_CANDIDATES) {
    parseEnvFile(candidate);
  }
}

/**
 * Validate that required env vars are present. Exits with code 1 if missing.
 * @param {string[]} required - list of env var names
 */
export function requireEnv(required) {
  const missing = required.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    console.error('Add to ~/norbot-ops/products/demo/.env.local or ~/pipeline/scripts/.env');
    process.exit(1);
  }
}
