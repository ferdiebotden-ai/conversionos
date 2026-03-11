#!/usr/bin/env node
/**
 * Apply a Codex-generated (or hand-edited) polish patch to Supabase admin_settings for one tenant.
 * Usage: node scripts/polish/apply-polish-patch.mjs --site-id <id> [--patch path]
 * Run from repo root. Loads .env.local and optionally ~/pipeline/scripts/.env.
 * Patch JSON shape: { business_info?: object, branding?: object, company_profile?: object }
 * Each value is merged into the existing row (shallow merge per key).
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { loadEnv, requireEnv } from '../../tenant-builder/lib/env-loader.mjs';
import { archiveQueueItem } from './queue-utils.mjs';

const DEMO_ROOT = resolve(import.meta.dirname, '../..');

loadEnv();
requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const { values } = parseArgs({
  options: {
    'site-id': { type: 'string' },
    patch: { type: 'string' },
  },
});

const siteId = values['site-id'];
if (!siteId) {
  console.error('Usage: node scripts/polish/apply-polish-patch.mjs --site-id <id> [--patch path]');
  process.exit(1);
}

const patchPath = values.patch || resolve(DEMO_ROOT, `codex-polish/patches/${siteId}.json`);
let patch;
try {
  patch = JSON.parse(readFileSync(patchPath, 'utf-8'));
} catch (e) {
  console.error('Failed to read patch:', patchPath, e.message);
  process.exit(1);
}

const allowedKeys = ['business_info', 'branding', 'company_profile'];
const keysToApply = Object.keys(patch).filter((k) => allowedKeys.includes(k));
if (keysToApply.length === 0) {
  console.error('Patch must contain at least one of:', allowedKeys.join(', '));
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function merge(existing, partial) {
  if (Array.isArray(partial)) return partial;
  if (!isPlainObject(existing) || !isPlainObject(partial)) return partial;

  const merged = { ...existing };
  for (const [key, value] of Object.entries(partial)) {
    merged[key] = isPlainObject(value) ? merge(existing[key], value) : value;
  }
  return merged;
}

for (const key of keysToApply) {
  const partial = patch[key];
  if (partial == null || typeof partial !== 'object') continue;

  const { data: rows, error: getErr } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('site_id', siteId)
    .eq('key', key)
    .limit(1);

  if (getErr) {
    console.error(`GET ${key} failed:`, getErr.message);
    process.exit(1);
  }

  const current = rows?.[0]?.value ?? {};
  const merged = merge(current, partial);

  const { error: patchErr } = await supabase
    .from('admin_settings')
    .update({ value: merged })
    .eq('site_id', siteId)
    .eq('key', key);

  if (patchErr) {
    console.error(`PATCH ${key} failed:`, patchErr.message);
    process.exit(1);
  }
  console.log('Updated', key);
}

archiveQueueItem(siteId, {
  resolution: 'patch_applied',
  patch_path: patchPath,
});

console.log('Done. Reload the tenant in the app to see changes.');
