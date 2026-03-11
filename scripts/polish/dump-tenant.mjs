#!/usr/bin/env node
/**
 * Dump one tenant's admin_settings to codex-polish/current-tenant.json for Codex to read.
 * Usage: node scripts/polish/dump-tenant.mjs --site-id <id> [--output path]
 * Run from repo root. Loads .env.local and optionally ~/pipeline/scripts/.env.
 */

import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { loadEnv, requireEnv } from '../../tenant-builder/lib/env-loader.mjs';

const DEMO_ROOT = resolve(import.meta.dirname, '../..');

loadEnv();
requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const { values } = parseArgs({
  options: {
    'site-id': { type: 'string' },
    output: { type: 'string' },
  },
});

const siteId = values['site-id'];
if (!siteId) {
  console.error('Usage: node scripts/polish/dump-tenant.mjs --site-id <id> [--output path]');
  process.exit(1);
}

const outputPath =
  values.output || resolve(DEMO_ROOT, 'codex-polish/current-tenant.json');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

const { data, error } = await supabase
  .from('admin_settings')
  .select('key, value')
  .eq('site_id', siteId);

if (error) {
  console.error('Supabase error:', error.message);
  process.exit(1);
}

const byKey = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
const out = { site_id: siteId, admin_settings: byKey };

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(out, null, 2), 'utf-8');
console.log('Wrote', outputPath);
