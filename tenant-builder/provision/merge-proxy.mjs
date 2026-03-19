#!/usr/bin/env node
/**
 * Merge proxy fragments into proxy.ts.
 * Runs ONCE after all parallel workers complete.
 *
 * Reads all results/{date}/proxy-fragments/*.json and inserts new domain mappings
 * into ~/norbot-ops/products/demo/src/proxy.ts DOMAIN_TO_SITE object.
 *
 * Usage:
 *   node provision/merge-proxy.mjs --date 2026-02-25
 *   node provision/merge-proxy.mjs                     # defaults to today
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv } from '../lib/env-loader.mjs';
import * as logger from '../lib/logger.mjs';

loadEnv();

// ─── Edge Config API ────────────────────────────────────────────────────────

/**
 * Upsert a domain → siteId mapping into Vercel Edge Config.
 * Runs alongside file-edit (Edge Config is primary, file is backup).
 * Requires VERCEL_EDGE_CONFIG_ID and VERCEL_TOKEN env vars.
 */
async function updateEdgeConfig(domain, siteId) {
  const edgeConfigId = process.env.VERCEL_EDGE_CONFIG_ID;
  const token = process.env.VERCEL_TOKEN;

  if (!edgeConfigId || !token) {
    logger.info('VERCEL_EDGE_CONFIG_ID or VERCEL_TOKEN not set — skipping Edge Config update');
    return;
  }

  try {
    const teamId = process.env.VERCEL_TEAM_ID;
    const url = `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items${teamId ? `?teamId=${teamId}` : ''}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          { operation: 'upsert', key: `domain:${domain}`, value: siteId },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      logger.warn(`Edge Config update failed (${response.status}): ${err}`);
    } else {
      logger.info(`Edge Config updated: domain:${domain} → ${siteId}`);
    }
  } catch (e) {
    logger.warn(`Edge Config update error: ${e.message}`);
  }
}

const PROXY_TS_PATH = resolve(import.meta.dirname, '../../src/proxy.ts');

const { values: args } = parseArgs({
  options: {
    date: { type: 'string', default: new Date().toISOString().slice(0, 10) },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help) {
  console.log(`Usage:
  node provision/merge-proxy.mjs --date 2026-02-25
  node provision/merge-proxy.mjs --dry-run`);
  process.exit(0);
}

const fragmentDir = resolve(import.meta.dirname, `../results/${args.date}/proxy-fragments`);

if (!existsSync(fragmentDir)) {
  logger.info(`No proxy fragments found for ${args.date}`);
  process.exit(0);
}

// Read all fragments
const fragmentFiles = readdirSync(fragmentDir).filter(f => f.endsWith('.json'));
if (fragmentFiles.length === 0) {
  logger.info('No proxy fragments to merge');
  process.exit(0);
}

const fragments = fragmentFiles.map(f => {
  const data = JSON.parse(readFileSync(resolve(fragmentDir, f), 'utf-8'));
  return data;
});

logger.info(`Found ${fragments.length} proxy fragment(s) to merge`);

// Read current proxy.ts
const proxyContent = readFileSync(PROXY_TS_PATH, 'utf-8');
const lines = proxyContent.split('\n');

// Find DOMAIN_TO_SITE_FALLBACK closing brace
let insertIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('DOMAIN_TO_SITE_FALLBACK')) {
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].includes('};')) {
        insertIndex = j;
        break;
      }
    }
    break;
  }
}

if (insertIndex < 0) {
  logger.error('Could not find DOMAIN_TO_SITE_FALLBACK closing brace in proxy.ts');
  process.exit(1);
}

// Safety: count existing entries before modification
const existingEntryCount = (proxyContent.match(/\.norbotsystems\.com'/g) || []).length;
logger.info(`proxy.ts has ${existingEntryCount} existing domain entries`);

// Insert new domains (skip duplicates)
let added = 0;
for (const { domain, siteId } of fragments) {
  if (proxyContent.includes(`'${domain}'`)) {
    logger.info(`Skipping ${domain} — already in proxy.ts`);
    continue;
  }

  const newLine = `  '${domain}': '${siteId}',`;
  if (args['dry-run']) {
    logger.info(`[DRY RUN] Would add: ${newLine}`);
  } else {
    lines.splice(insertIndex, 0, newLine);
    insertIndex++; // Adjust for inserted line
    added++;
    logger.info(`Added: ${domain} -> ${siteId}`);
  }
}

if (!args['dry-run'] && added > 0) {
  // Safety check: verify we're not losing entries
  const newContent = lines.join('\n');
  const newEntryCount = (newContent.match(/\.norbotsystems\.com'/g) || []).length;
  if (newEntryCount < existingEntryCount) {
    logger.error(`SAFETY ABORT: merge would reduce entries from ${existingEntryCount} to ${newEntryCount}. This should never happen.`);
    process.exit(1);
  }
  writeFileSync(PROXY_TS_PATH, newContent);
  logger.info(`proxy.ts updated with ${added} new domain(s) (${newEntryCount} total)`);
} else if (added === 0) {
  logger.info('No new domains to add');
}

// Also update Edge Config for each fragment (primary path — file edit is backup)
if (!args['dry-run']) {
  for (const { domain, siteId } of fragments) {
    await updateEdgeConfig(domain, siteId);
  }
}
