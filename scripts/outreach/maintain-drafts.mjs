#!/usr/bin/env node
/**
 * Draft monitor — maintains 5 ready-to-send Gmail drafts at all times.
 *
 * Checks Turso for targets with status = 'draft_ready'.
 * If count < 5, creates drafts from the next built tenants that are not held for polish.
 *
 * Runs every 30 minutes via LaunchAgent (7am-9pm weekdays).
 *
 * Usage:
 *   node scripts/outreach/maintain-drafts.mjs          # Normal run
 *   node scripts/outreach/maintain-drafts.mjs --report  # Status report only (no draft creation)
 *   node scripts/outreach/maintain-drafts.mjs --force   # Skip time-of-day check
 */

import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const DEMO_ROOT = resolve(import.meta.dirname, '../../');
const { loadEnv, requireEnv } = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/env-loader.mjs'));
loadEnv();

const { query } = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/turso-client.mjs'));
const logger = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/logger.mjs'));
const { hasActivePolishQueue } = await import(resolve(DEMO_ROOT, 'scripts/polish/queue-utils.mjs'));

requireEnv(['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']);

const TARGET_DRAFTS = 5;

const { values: args } = parseArgs({
  options: {
    force: { type: 'boolean', default: false },
    report: { type: 'boolean', default: false },
  },
});

// ──────────────────────────────────────────────────────────
// Time guard: only run 7am–9pm weekdays (ET)
// ──────────────────────────────────────────────────────────

const now = new Date();
const hour = now.getHours();
const day = now.getDay(); // 0=Sun, 6=Sat

if (!args.force) {
  if (hour < 7 || hour >= 21) {
    logger.debug('Outside 7am-9pm — skipping draft monitor');
    process.exit(0);
  }
  if (day === 0 || day === 6) {
    logger.debug('Weekend — skipping draft monitor');
    process.exit(0);
  }
}

// ──────────────────────────────────────────────────────────
// Count current drafts
// ──────────────────────────────────────────────────────────

const draftRows = await query(
  "SELECT COUNT(*) as count FROM targets WHERE status = 'draft_ready' AND email_message_id IS NOT NULL"
);
const draftCount = draftRows[0]?.count ?? 0;

const builtRows = await query(
  "SELECT id, slug FROM targets WHERE status = 'bespoke_ready' AND demo_url IS NOT NULL AND email_message_id IS NULL"
);
const builtTargets = builtRows.filter(t => !hasActivePolishQueue(t.slug));
const heldTargets = builtRows.filter(t => hasActivePolishQueue(t.slug));
const builtCount = builtTargets.length;

const qualifiedRows = await query(
  "SELECT COUNT(*) as count FROM targets WHERE icp_score >= 55 AND status NOT IN ('bespoke_ready', 'draft_ready', 'email_1_sent', 'rejected', 'dead')"
);
const qualifiedCount = qualifiedRows[0]?.count ?? 0;

logger.info(`Draft monitor: ${draftCount}/${TARGET_DRAFTS} drafts ready, ${builtCount} built (no draft), ${heldTargets.length} held for polish, ${qualifiedCount} qualified (not yet built)`);

// ──────────────────────────────────────────────────────────
// Report mode — just print status and exit
// ──────────────────────────────────────────────────────────

if (args.report) {
  if (draftCount >= TARGET_DRAFTS) {
    logger.info(`Pipeline healthy: ${draftCount} drafts ready (target: ${TARGET_DRAFTS})`);
  } else {
    const needed = TARGET_DRAFTS - draftCount;
    logger.info(`Need ${needed} more draft(s). Built targets available: ${builtCount}. Held for polish: ${heldTargets.length}. Qualified targets available: ${qualifiedCount}.`);
  }
  process.exit(0);
}

// ──────────────────────────────────────────────────────────
// Replenish drafts if below target
// ──────────────────────────────────────────────────────────

if (draftCount >= TARGET_DRAFTS) {
  logger.info(`Draft count OK (${draftCount}/${TARGET_DRAFTS}) — no action needed`);
  process.exit(0);
}

const needed = TARGET_DRAFTS - draftCount;

if (builtCount === 0) {
  if (heldTargets.length > 0) {
    logger.warn(`Need ${needed} more draft(s) but ${heldTargets.length} built tenant(s) are still held for polish/manual review.`);
  } else {
    logger.warn(`Need ${needed} more draft(s) but no built tenants are available. Run /maintain-pipeline or /build-tenant --batch to build more.`);
  }
  process.exit(0);
}

// Get the next built targets (highest ICP score first)
const candidates = await query(
  `SELECT id, company_name, slug, icp_score FROM targets
   WHERE status = 'bespoke_ready' AND demo_url IS NOT NULL AND email_message_id IS NULL
   ORDER BY icp_score DESC
   LIMIT ?`,
  [needed + 10]
);

const targets = candidates
  .filter(t => !hasActivePolishQueue(t.slug))
  .slice(0, needed);

if (targets.length === 0) {
  logger.warn('No eligible targets found for draft creation');
  process.exit(0);
}

const targetIds = targets.map(t => t.id).join(',');
logger.info(`Creating drafts for ${targets.length} target(s): ${targets.map(t => `${t.company_name} (ID ${t.id}, ICP ${t.icp_score})`).join(', ')}`);

// Run outreach pipeline as subprocess
try {
  execFileSync('node', [
    resolve(DEMO_ROOT, 'scripts/outreach/outreach-pipeline.mjs'),
    '--target-ids', targetIds,
  ], {
    cwd: DEMO_ROOT,
    env: process.env,
    timeout: 300000,
    stdio: 'inherit',
  });
  logger.info(`Draft creation complete for ${targets.length} target(s)`);
} catch (e) {
  logger.error(`Draft creation failed: ${e.message?.slice(0, 200)}`);
  process.exit(1);
}
