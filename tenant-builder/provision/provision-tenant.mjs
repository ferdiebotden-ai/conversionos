#!/usr/bin/env node
/**
 * Per-target provisioning sequence.
 *
 * 1. Read merged scrape data from results/{date}/{site-id}/scraped.json
 * 2. upload-images.mjs → download remote images, upload to Supabase Storage
 * 3. provision.mjs → upsert admin_settings + tenants + update proxy.ts
 * 4. Write proxy fragment (parallel-safe)
 * 5. Update Turso bespoke_status
 * 6. If Dominate tier → create voice agent
 *
 * Usage:
 *   node provision/provision-tenant.mjs --site-id example --data ./results/2026-02-25/example/scraped.json --domain example.norbotsystems.com --tier accelerate
 *   node provision/provision-tenant.mjs --site-id example --data ./scraped.json --domain example.norbotsystems.com --tier accelerate --dry-run
 */

import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { loadEnv, requireEnv } from '../lib/env-loader.mjs';
import { execute } from '../lib/turso-client.mjs';
import * as logger from '../lib/logger.mjs';
import { writeProxyFragment } from './proxy-fragment.mjs';
import { createVoiceAgent } from './voice-agent.mjs';

loadEnv();
requireEnv(['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']);

const { values: args } = parseArgs({
  options: {
    'site-id': { type: 'string' },
    data: { type: 'string' },
    domain: { type: 'string' },
    tier: { type: 'string', default: 'accelerate' },
    'target-id': { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help || !args['site-id'] || !args.data) {
  console.log(`Usage:
  node provision/provision-tenant.mjs --site-id example --data ./scraped.json --domain example.norbotsystems.com --tier accelerate
  node provision/provision-tenant.mjs --site-id example --data ./scraped.json --domain example.norbotsystems.com --target-id 42 --dry-run`);
  process.exit(args.help ? 0 : 1);
}

const siteId = args['site-id'];
const dataPath = resolve(args.data);
const tier = args.tier;
const domain = args.domain || `${siteId}.norbotsystems.com`;
const targetId = args['target-id'] ? parseInt(args['target-id'], 10) : null;
const dryRun = args['dry-run'];

const demoRoot = resolve(import.meta.dirname, '../../');
const outputDir = dirname(dataPath);

if (!existsSync(dataPath)) {
  logger.error(`Data file not found: ${dataPath}`);
  process.exit(1);
}

logger.progress({ stage: 'provision', target_id: targetId, site_id: siteId, status: 'start', detail: domain });

// Update Turso bespoke_status to 'generating'
if (targetId && !dryRun) {
  try {
    await execute(
      "UPDATE targets SET bespoke_status = 'generating' WHERE id = ?",
      [targetId]
    );
  } catch (e) {
    logger.warn(`Could not update bespoke_status: ${e.message}`);
  }
}

// ──────────────────────────────────────────────────────────
// Step 1: Upload images to Supabase Storage
// ──────────────────────────────────────────────────────────

const provisionedPath = resolve(outputDir, 'provisioned.json');
const uploadScript = resolve(demoRoot, 'scripts/onboarding/upload-images.mjs');

if (dryRun) {
  logger.info('[DRY RUN] Would run upload-images.mjs');
} else {
  logger.info('Step 1: Uploading images to Supabase Storage');
  try {
    execFileSync('node', [
      uploadScript,
      '--site-id', siteId,
      '--data', dataPath,
      '--output', provisionedPath,
    ], {
      cwd: demoRoot,
      env: process.env,
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    logger.info(`Images uploaded, provisioned data: ${provisionedPath}`);
  } catch (e) {
    logger.warn(`Image upload had issues: ${e.message?.slice(0, 100)}`);
    // If output wasn't created, copy the original data
    if (!existsSync(provisionedPath)) {
      writeFileSync(provisionedPath, readFileSync(dataPath, 'utf-8'));
    }
  }
}

// ──────────────────────────────────────────────────────────
// Step 2: Provision DB rows + proxy.ts
// ──────────────────────────────────────────────────────────

const provisionScript = resolve(demoRoot, 'scripts/onboarding/provision.mjs');
const provisionDataPath = existsSync(provisionedPath) ? provisionedPath : dataPath;

if (dryRun) {
  logger.info('[DRY RUN] Would run provision.mjs');
} else {
  logger.info('Step 2: Provisioning DB rows');
  try {
    execFileSync('node', [
      provisionScript,
      '--site-id', siteId,
      '--data', provisionDataPath,
      '--domain', domain,
      '--tier', tier,
    ], {
      cwd: demoRoot,
      env: process.env,
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    logger.info('Provisioning complete');
  } catch (e) {
    logger.error(`Provisioning failed: ${e.message?.slice(0, 200)}`);
    // Update Turso status to failed
    if (targetId) {
      await execute("UPDATE targets SET bespoke_status = 'failed' WHERE id = ?", [targetId]);
    }
    logger.progress({ stage: 'provision', target_id: targetId, site_id: siteId, status: 'error', detail: 'provision.mjs failed' });
    process.exit(1);
  }
}

// ──────────────────────────────────────────────────────────
// Step 3: Write proxy fragment (parallel-safe)
// ──────────────────────────────────────────────────────────

if (!dryRun) {
  logger.info('Step 3: Writing proxy fragment');
  writeProxyFragment(siteId, domain);
} else {
  logger.info('[DRY RUN] Would write proxy fragment');
}

// ──────────────────────────────────────────────────────────
// Step 4: Update Turso bespoke_status to 'complete'
// ──────────────────────────────────────────────────────────

if (targetId && !dryRun) {
  try {
    await execute(
      "UPDATE targets SET bespoke_status = 'complete' WHERE id = ?",
      [targetId]
    );
    logger.info('Turso bespoke_status updated to complete');
  } catch (e) {
    logger.warn(`Could not update bespoke_status: ${e.message}`);
  }
}

// ──────────────────────────────────────────────────────────
// Step 5: Voice agent (Dominate tier only)
// ──────────────────────────────────────────────────────────

if (tier === 'dominate') {
  const data = JSON.parse(readFileSync(provisionDataPath, 'utf-8'));
  await createVoiceAgent(siteId, data);
}

logger.progress({
  stage: 'provision',
  target_id: targetId,
  site_id: siteId,
  status: 'complete',
  detail: `domain=${domain}, tier=${tier}`,
});

logger.info(`Tenant ${siteId} provisioned at ${domain}`);
