/**
 * Test setup — loads environment variables for all test files.
 * Import this at the top of integration tests that need env vars.
 */

import { loadEnv } from '../lib/env-loader.mjs';

// Load env vars from .env.local and pipeline .env
loadEnv();

/**
 * Assert all required env vars are present for integration tests.
 * Call in beforeAll() of integration tests.
 */
export function requireIntegrationEnv() {
  const required = [
    'TURSO_DATABASE_URL',
    'TURSO_AUTH_TOKEN',
    'FIRECRAWL_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  const missing = required.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing env vars for integration tests: ${missing.join(', ')}`);
  }
}

/** Test site ID used across integration tests — never clobbers production tenants */
export const TEST_SITE_ID = 'redwhitereno-test';
export const TEST_TARGET_ID = 22;
export const TEST_URL = 'https://www.redwhitereno.com';
export const TEST_DOMAIN = 'redwhitereno-test.norbotsystems.com';
export const TEST_TIER = 'accelerate';
