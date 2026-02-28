#!/usr/bin/env node
/**
 * Reset pipeline CRM data for fresh start.
 *
 * Resets all target statuses to 'discovered', clears outreach columns,
 * deletes activity records (touches, artifacts, etc.), releases territories.
 * Keeps company data intact (name, website, city, services, reviews, ICP scores).
 *
 * Usage:
 *   node scripts/reset-pipeline-data.mjs              # dry run (shows what would change)
 *   node scripts/reset-pipeline-data.mjs --confirm     # actually reset
 */

import { loadEnv, requireEnv } from '../tenant-builder/lib/env-loader.mjs';
import { query, execute, batch } from '../tenant-builder/lib/turso-client.mjs';

loadEnv();
requireEnv(['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']);

const isDryRun = !process.argv.includes('--confirm');

async function main() {
  console.log(isDryRun ? '\n=== DRY RUN (pass --confirm to execute) ===\n' : '\n=== RESETTING PIPELINE DATA ===\n');

  // Show current state
  const statusCounts = await query('SELECT status, COUNT(*) as count FROM targets GROUP BY status ORDER BY count DESC');
  console.log('Current target status distribution:');
  for (const row of statusCounts) {
    console.log(`  ${row.status}: ${row.count}`);
  }

  const totalTargets = await query('SELECT COUNT(*) as count FROM targets');
  const disqualified = await query("SELECT COUNT(*) as count FROM targets WHERE status = 'disqualified'");
  const withIcp = await query('SELECT COUNT(*) as count FROM targets WHERE icp_score IS NOT NULL');
  const touches = await query('SELECT COUNT(*) as count FROM touches');
  const artifacts = await query('SELECT COUNT(*) as count FROM artifacts');

  console.log(`\nTotal targets: ${totalTargets[0].count}`);
  console.log(`Disqualified (will skip): ${disqualified[0].count}`);
  console.log(`With ICP scores (will keep): ${withIcp[0].count}`);
  console.log(`Touches to delete: ${touches[0].count}`);
  console.log(`Artifacts to delete: ${artifacts[0].count}`);

  if (isDryRun) {
    console.log('\nPass --confirm to execute the reset.');
    return;
  }

  console.log('\nExecuting reset...');

  // Reset targets
  await execute(`UPDATE targets SET
    status = 'discovered',
    contacted_at = NULL,
    qualified_at = NULL,
    demo_booked_at = NULL,
    bespoke_status = NULL,
    bespoke_score = NULL,
    email_draft_id = NULL,
    email_message_id = NULL,
    follow_up_slot = NULL,
    call_script = NULL,
    demo_url = NULL,
    demo_built_at = NULL,
    customer_tier = 'standard',
    last_interaction_at = NULL,
    interaction_count = 0,
    updated_at = datetime('now')
  WHERE status != 'disqualified'`);
  console.log('  Targets reset to discovered');

  // Clear activity tables (skip if table doesn't exist)
  const tablesToClear = ['touches', 'artifacts', 'call_reports', 'customer_signals', 'email_threads', 'bookings'];
  for (const table of tablesToClear) {
    try {
      await execute(`DELETE FROM ${table}`);
      console.log(`  Cleared ${table}`);
    } catch {
      console.log(`  Skipped ${table} (table not found)`);
    }
  }

  // Release territories
  await execute(`UPDATE territories SET
    status = 'available',
    reserved_for_target_id = NULL,
    reserved_at = NULL,
    lock_expires_at = NULL`);
  console.log('  Territories released');

  // Verify
  const after = await query('SELECT status, COUNT(*) as count FROM targets GROUP BY status ORDER BY count DESC');
  console.log('\nPost-reset status distribution:');
  for (const row of after) {
    console.log(`  ${row.status}: ${row.count}`);
  }

  const icpAfter = await query('SELECT COUNT(*) as count FROM targets WHERE icp_score IS NOT NULL');
  console.log(`\nICP scores preserved: ${icpAfter[0].count}`);
  console.log('Reset complete.');
}

main().catch((err) => {
  console.error('Reset failed:', err.message);
  process.exit(1);
});
