#!/usr/bin/env node
/**
 * Re-score ALL non-disqualified targets with the ICP scoring system.
 * Clears existing scores and runs icp-score.mjs in batches.
 *
 * Usage:
 *   node scripts/outreach/rescore-all.mjs              # Score all, batches of 20
 *   node scripts/outreach/rescore-all.mjs --limit 50   # Score 50 at a time
 *   node scripts/outreach/rescore-all.mjs --dry-run    # Score without DB writes
 *   node scripts/outreach/rescore-all.mjs --report     # Just show current top 30
 */

import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const DEMO_ROOT = resolve(import.meta.dirname, '../../');
const { loadEnv, requireEnv } = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/env-loader.mjs'));
loadEnv();

const { query, execute } = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/turso-client.mjs'));
const logger = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/logger.mjs'));

requireEnv(['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']);

const { values: args } = parseArgs({
  options: {
    limit: { type: 'string', default: '20' },
    'dry-run': { type: 'boolean', default: false },
    report: { type: 'boolean', default: false },
    'clear-scores': { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help) {
  console.log(`Re-score all targets with ICP scoring

Usage:
  node scripts/outreach/rescore-all.mjs              # Score all unscored, batches of 20
  node scripts/outreach/rescore-all.mjs --limit 50   # Larger batches
  node scripts/outreach/rescore-all.mjs --dry-run    # Preview only
  node scripts/outreach/rescore-all.mjs --clear-scores  # Clear all existing ICP scores first
  node scripts/outreach/rescore-all.mjs --report     # Show current top 30`);
  process.exit(0);
}

// ──────────────────────────────────────────────────────────
// Report mode: just show current rankings
// ──────────────────────────────────────────────────────────

if (args.report) {
  const top = await query(
    `SELECT id, company_name, city, icp_score, email, phone, website, slug, status
     FROM targets
     WHERE icp_score IS NOT NULL
     ORDER BY icp_score DESC
     LIMIT 30`
  );

  if (top.length === 0) {
    console.log('No targets have ICP scores yet. Run without --report to score them.');
    process.exit(0);
  }

  console.log(`\nTop ${top.length} targets by ICP score:\n`);
  console.log('Rank | Score | Company | City | Email | Phone | Status');
  console.log('-----|-------|---------|------|-------|-------|-------');
  top.forEach((t, i) => {
    const email = t.email ? '✓' : '✗';
    const phone = t.phone ? '✓' : '✗';
    console.log(`${String(i + 1).padStart(4)} | ${String(t.icp_score).padStart(5)} | ${t.company_name.substring(0, 30).padEnd(30)} | ${(t.city || '').padEnd(15)} | ${email.padEnd(5)} | ${phone.padEnd(5)} | ${t.status}`);
  });

  const withEmail = top.filter(t => t.email).length;
  const withPhone = top.filter(t => t.phone).length;
  console.log(`\n${withEmail} of ${top.length} have email, ${withPhone} have phone\n`);
  process.exit(0);
}

// ──────────────────────────────────────────────────────────
// Clear existing scores if requested
// ──────────────────────────────────────────────────────────

if (args['clear-scores']) {
  const { rowsAffected } = await execute(
    'UPDATE targets SET icp_score = NULL, icp_breakdown = NULL WHERE icp_score IS NOT NULL'
  );
  logger.info(`Cleared ${rowsAffected} existing ICP scores`);
}

// ──────────────────────────────────────────────────────────
// Count targets needing scoring
// ──────────────────────────────────────────────────────────

const unscoredCount = await query(
  `SELECT COUNT(*) as cnt FROM targets
   WHERE icp_score IS NULL
     AND status != 'disqualified'
     AND website IS NOT NULL AND website != ''`
);

const total = unscoredCount[0].cnt;
if (total === 0) {
  logger.info('All targets are already scored. Use --clear-scores to re-score.');
  process.exit(0);
}

logger.info(`${total} target(s) need scoring. Running in batches of ${args.limit}...`);

// ──────────────────────────────────────────────────────────
// Run icp-score.mjs in batches
// ──────────────────────────────────────────────────────────

const batchSize = parseInt(args.limit, 10);
let totalScored = 0;
let batchNum = 0;

while (true) {
  batchNum++;

  // Check how many remain
  const remaining = await query(
    `SELECT COUNT(*) as cnt FROM targets
     WHERE icp_score IS NULL
       AND status != 'disqualified'
       AND website IS NOT NULL AND website != ''`
  );

  if (remaining[0].cnt === 0) break;

  logger.info(`Batch ${batchNum}: scoring up to ${batchSize} targets (${remaining[0].cnt} remaining)`);

  try {
    const icpArgs = [
      resolve(DEMO_ROOT, 'tenant-builder/icp-score.mjs'),
      '--all',
      '--limit', String(batchSize),
    ];

    if (args['dry-run']) icpArgs.push('--dry-run');

    execFileSync('node', icpArgs, {
      cwd: DEMO_ROOT,
      env: process.env,
      timeout: 600000, // 10 min per batch
      stdio: 'inherit',
    });

    totalScored += batchSize;
  } catch (e) {
    logger.error(`Batch ${batchNum} failed: ${e.message}`);
    // Continue with next batch
  }
}

logger.info(`Scoring complete. Run with --report to see rankings.`);
logger.summary({ total, succeeded: totalScored, failed: 0, skipped: 0 });
