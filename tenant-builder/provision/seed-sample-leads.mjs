#!/usr/bin/env node
/**
 * Seed Sample Leads from Fixtures
 *
 * Reads tenant-builder/fixtures/sample-leads.json, generates fresh UUIDs,
 * replaces __SITE_ID__ with the target tenant's site_id, converts relative
 * day offsets to real ISO timestamps, and inserts rows in FK order.
 *
 * Idempotent: skips if leads already exist for the given site_id.
 *
 * Usage as module:
 *   import { seedSampleLeads } from './seed-sample-leads.mjs';
 *   const result = await seedSampleLeads('my-tenant');
 *
 * Usage as CLI:
 *   node provision/seed-sample-leads.mjs --site-id my-tenant [--dry-run]
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_PATH = resolve(__dirname, '../fixtures/sample-leads.json');

/**
 * Seed sample leads for a tenant from the fixtures file.
 *
 * @param {string} siteId - Target tenant site_id
 * @param {object} [options]
 * @param {boolean} [options.dryRun=false] - Parse and validate without DB writes
 * @param {object} [options.supabase] - Supabase client (optional, uses default if not provided)
 * @returns {Promise<{ seeded: boolean, reason?: string, counts?: Record<string, number> }>}
 */
export async function seedSampleLeads(siteId, { dryRun = false, supabase: sbOverride } = {}) {
  // Load fixture
  const fixture = JSON.parse(readFileSync(FIXTURES_PATH, 'utf-8'));

  if (fixture.version !== 1) {
    return { seeded: false, reason: `Unsupported fixture version: ${fixture.version}` };
  }

  // Get Supabase client
  let sb;
  if (sbOverride) {
    sb = sbOverride;
  } else {
    const { getSupabase } = await import('../lib/supabase-client.mjs');
    sb = getSupabase();
  }

  // Check if leads already exist (idempotent)
  const { data: existing } = await sb
    .from('leads')
    .select('id')
    .eq('site_id', siteId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { seeded: false, reason: 'leads already exist for this site_id' };
  }

  // Build UUID mapping: placeholder → fresh UUID
  const uuidMap = new Map();
  for (const placeholder of fixture.uuid_placeholders) {
    uuidMap.set(placeholder, randomUUID());
  }

  const now = new Date();

  /**
   * Generate a random alphanumeric token (for share_token unique constraint).
   */
  function generateToken(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      result += chars[byte % chars.length];
    }
    return result;
  }

  /**
   * Process a single row: replace placeholders, UUIDs, timestamps, site_id.
   */
  function processRow(row) {
    const result = {};

    for (const [key, value] of Object.entries(row)) {
      // Convert offset days to real timestamp
      if (key === '_created_at_offset_days') {
        const date = new Date(now);
        date.setDate(date.getDate() + value);
        result.created_at = date.toISOString();
        continue;
      }
      if (key === '_updated_at_offset_days') {
        const date = new Date(now);
        date.setDate(date.getDate() + value);
        result.updated_at = date.toISOString();
        continue;
      }

      // Regenerate unique share_token
      if (key === 'share_token' && value) {
        result[key] = generateToken(12);
        continue;
      }

      // Replace __SITE_ID__
      if (value === '__SITE_ID__') {
        result[key] = siteId;
        continue;
      }

      // Replace UUID placeholders in string values
      if (typeof value === 'string' && uuidMap.has(value)) {
        result[key] = uuidMap.get(value);
        continue;
      }

      // Deep-replace in objects/arrays (for JSONB fields like generated_concepts, new_values)
      if (value !== null && typeof value === 'object') {
        result[key] = deepReplace(value);
        continue;
      }

      result[key] = value;
    }

    return result;
  }

  /**
   * Recursively replace UUID placeholders and __SITE_ID__ in nested objects/arrays.
   */
  function deepReplace(obj) {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      if (obj === '__SITE_ID__') return siteId;
      if (uuidMap.has(obj)) return uuidMap.get(obj);
      // Check if string contains any placeholder
      let result = obj;
      for (const [placeholder, uuid] of uuidMap.entries()) {
        if (result.includes(placeholder)) {
          result = result.replaceAll(placeholder, uuid);
        }
      }
      return result;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => deepReplace(item));
    }

    if (typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = deepReplace(value);
      }
      return result;
    }

    return obj;
  }

  // Process all tables
  const tables = fixture.tables;
  const processed = {};
  for (const [tableName, rows] of Object.entries(tables)) {
    processed[tableName] = rows.map(row => processRow(row));
  }

  if (dryRun) {
    const counts = {};
    for (const [tableName, rows] of Object.entries(processed)) {
      counts[tableName] = rows.length;
    }
    return { seeded: false, reason: 'dry run', counts, uuidMap: Object.fromEntries(uuidMap) };
  }

  // Insert in FK order: parents first
  const insertOrder = [
    'leads',
    'visualizations',
    'lead_visualizations',
    'visualization_metrics',
    'audit_log',
    'quotes',
    'quote_items',
  ];

  const counts = {};

  for (const tableName of insertOrder) {
    const rows = processed[tableName];
    if (!rows || rows.length === 0) {
      counts[tableName] = 0;
      continue;
    }

    const { error } = await sb.from(tableName).insert(rows);
    if (error) {
      // Roll back what we can — delete inserted leads (cascading)
      await sb.from('leads').delete().eq('site_id', siteId);
      throw new Error(`Failed to insert ${tableName}: ${error.message}`);
    }

    counts[tableName] = rows.length;
  }

  return { seeded: true, counts };
}

// ── CLI entrypoint ──────────────────────────────────────────────────────────

const isMain = process.argv[1] && fileURLToPath(import.meta.url).endsWith(process.argv[1].replace(/^.*[\\/]/, ''));

if (isMain) {
  const { parseArgs } = await import('node:util');

  const { values: args } = parseArgs({
    options: {
      'site-id': { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean' },
    },
  });

  if (args.help || !args['site-id']) {
    console.log(`Usage:
  node provision/seed-sample-leads.mjs --site-id my-tenant [--dry-run]

Reads tenant-builder/fixtures/sample-leads.json and seeds sample leads
for the given site_id. Skips if leads already exist (idempotent).`);
    process.exit(args.help ? 0 : 1);
  }

  // Load env vars
  const { loadEnv } = await import('../lib/env-loader.mjs');
  loadEnv();

  try {
    const result = await seedSampleLeads(args['site-id'], { dryRun: args['dry-run'] });
    if (result.seeded) {
      console.log(`Seeded sample leads for ${args['site-id']}:`);
      console.log(JSON.stringify(result.counts, null, 2));
    } else {
      console.log(`Skipped: ${result.reason}`);
      if (result.counts) {
        console.log(`Would insert:`, JSON.stringify(result.counts, null, 2));
      }
    }
  } catch (err) {
    console.error(`Seeding failed: ${err.message}`);
    process.exit(1);
  }
}
