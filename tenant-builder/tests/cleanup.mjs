#!/usr/bin/env node
/**
 * Cleanup test artifacts from tenant-builder runs.
 *
 * Usage:
 *   node tests/cleanup.mjs --site-id redwhitereno-test
 *   node tests/cleanup.mjs --site-id redwhitereno-test --reset-turso --target-id 22
 *   node tests/cleanup.mjs --site-id redwhitereno-test --all
 */

import { parseArgs } from 'node:util';
import { rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv, requireEnv } from '../lib/env-loader.mjs';
import { execute } from '../lib/turso-client.mjs';
import { getSupabase } from '../lib/supabase-client.mjs';
import * as logger from '../lib/logger.mjs';

loadEnv();

const { values: args } = parseArgs({
  options: {
    'site-id': { type: 'string' },
    'target-id': { type: 'string' },
    'reset-turso': { type: 'boolean', default: false },
    all: { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help || !args['site-id']) {
  console.log(`Usage:
  node tests/cleanup.mjs --site-id redwhitereno-test
  node tests/cleanup.mjs --site-id redwhitereno-test --reset-turso --target-id 22
  node tests/cleanup.mjs --site-id redwhitereno-test --all

Actions:
  1. DELETE admin_settings rows for site_id
  2. DELETE tenants row for site_id
  3. Remove Supabase Storage files (tenant-assets/{site-id}/**)
  4. Remove proxy.ts entry for {site-id}.norbotsystems.com
  5. Remove local results for {site-id}
  6. If --reset-turso: Reset target icp_score, icp_breakdown, bespoke_status, bespoke_score
  7. --all: includes --reset-turso`);
  process.exit(args.help ? 0 : 1);
}

const siteId = args['site-id'];
const targetId = args['target-id'] ? parseInt(args['target-id'], 10) : null;
const resetTurso = args['reset-turso'] || args.all;
const summary = { cleaned: [], skipped: [], errors: [] };

logger.info(`Cleaning up test artifacts for site: ${siteId}`);

// ──────────────────────────────────────────────────────────
// 1. Delete admin_settings rows
// ──────────────────────────────────────────────────────────

try {
  requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const sb = getSupabase();
  const { error, count } = await sb
    .from('admin_settings')
    .delete()
    .eq('site_id', siteId);

  if (error) {
    summary.errors.push(`admin_settings: ${error.message}`);
  } else {
    summary.cleaned.push(`admin_settings rows for ${siteId}`);
    logger.info(`Deleted admin_settings rows for ${siteId}`);
  }
} catch (e) {
  summary.errors.push(`admin_settings: ${e.message}`);
}

// ──────────────────────────────────────────────────────────
// 2. Delete tenants row
// ──────────────────────────────────────────────────────────

try {
  const sb = getSupabase();
  const { error } = await sb
    .from('tenants')
    .delete()
    .eq('site_id', siteId);

  if (error) {
    summary.errors.push(`tenants: ${error.message}`);
  } else {
    summary.cleaned.push(`tenants row for ${siteId}`);
    logger.info(`Deleted tenants row for ${siteId}`);
  }
} catch (e) {
  summary.errors.push(`tenants: ${e.message}`);
}

// ──────────────────────────────────────────────────────────
// 3. Remove Supabase Storage files
// ──────────────────────────────────────────────────────────

try {
  const sb = getSupabase();
  const { data: files, error: listError } = await sb.storage
    .from('tenant-assets')
    .list(siteId, { limit: 100 });

  if (listError) {
    summary.errors.push(`storage list: ${listError.message}`);
  } else if (files && files.length > 0) {
    const paths = files.map(f => `${siteId}/${f.name}`);
    const { error: removeError } = await sb.storage
      .from('tenant-assets')
      .remove(paths);

    if (removeError) {
      summary.errors.push(`storage remove: ${removeError.message}`);
    } else {
      summary.cleaned.push(`${paths.length} storage file(s) from tenant-assets/${siteId}/`);
      logger.info(`Removed ${paths.length} storage file(s)`);
    }
  } else {
    summary.skipped.push('No storage files found');
  }
} catch (e) {
  summary.errors.push(`storage: ${e.message}`);
}

// ──────────────────────────────────────────────────────────
// 4. Remove proxy.ts entry
// ──────────────────────────────────────────────────────────

const proxyPath = resolve(import.meta.dirname, '../../src/proxy.ts');
try {
  const domain = `${siteId}.norbotsystems.com`;
  const content = readFileSync(proxyPath, 'utf-8');
  if (content.includes(`'${domain}'`)) {
    const lines = content.split('\n');
    const filtered = lines.filter(line => !line.includes(`'${domain}'`));
    writeFileSync(proxyPath, filtered.join('\n'));
    summary.cleaned.push(`proxy.ts entry for ${domain}`);
    logger.info(`Removed proxy.ts entry for ${domain}`);
  } else {
    summary.skipped.push(`No proxy.ts entry for ${domain}`);
  }
} catch (e) {
  summary.errors.push(`proxy.ts: ${e.message}`);
}

// ──────────────────────────────────────────────────────────
// 5. Remove local results
// ──────────────────────────────────────────────────────────

const resultsBase = resolve(import.meta.dirname, '../results');
try {
  // Find and remove all date directories containing this site-id
  if (existsSync(resultsBase)) {
    const { readdirSync } = await import('node:fs');
    const dateDirs = readdirSync(resultsBase);
    let removedCount = 0;

    for (const dateDir of dateDirs) {
      const siteDir = resolve(resultsBase, dateDir, siteId);
      if (existsSync(siteDir)) {
        rmSync(siteDir, { recursive: true, force: true });
        removedCount++;
      }
      // Also remove proxy fragments for this site
      const fragmentPath = resolve(resultsBase, dateDir, 'proxy-fragments', `${siteId}.json`);
      if (existsSync(fragmentPath)) {
        rmSync(fragmentPath);
      }
    }

    if (removedCount > 0) {
      summary.cleaned.push(`${removedCount} local results director(ies) for ${siteId}`);
      logger.info(`Removed ${removedCount} local results director(ies)`);
    } else {
      summary.skipped.push('No local results found');
    }
  }
} catch (e) {
  summary.errors.push(`local results: ${e.message}`);
}

// ──────────────────────────────────────────────────────────
// 6. Reset Turso target
// ──────────────────────────────────────────────────────────

if (resetTurso && targetId) {
  try {
    requireEnv(['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']);
    await execute(
      `UPDATE targets SET
        icp_score = NULL,
        icp_breakdown = NULL,
        bespoke_status = NULL,
        bespoke_score = NULL
      WHERE id = ?`,
      [targetId]
    );
    summary.cleaned.push(`Turso target ${targetId} reset (icp_score, icp_breakdown, bespoke_status, bespoke_score)`);
    logger.info(`Reset Turso target ${targetId}`);
  } catch (e) {
    summary.errors.push(`turso reset: ${e.message}`);
  }
} else if (resetTurso && !targetId) {
  summary.skipped.push('--reset-turso requires --target-id');
}

// ──────────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────────

logger.info('');
logger.info('=== Cleanup Summary ===');
if (summary.cleaned.length > 0) {
  logger.info(`Cleaned (${summary.cleaned.length}):`);
  for (const item of summary.cleaned) logger.info(`  ✓ ${item}`);
}
if (summary.skipped.length > 0) {
  logger.info(`Skipped (${summary.skipped.length}):`);
  for (const item of summary.skipped) logger.info(`  - ${item}`);
}
if (summary.errors.length > 0) {
  logger.warn(`Errors (${summary.errors.length}):`);
  for (const item of summary.errors) logger.warn(`  ✗ ${item}`);
}

process.exit(summary.errors.length > 0 ? 1 : 0);
