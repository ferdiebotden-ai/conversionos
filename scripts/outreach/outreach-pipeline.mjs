#!/usr/bin/env node
/**
 * Outreach pipeline orchestrator.
 * For targets with built demos: fill email template → create Gmail draft.
 *
 * Usage:
 *   node scripts/outreach/outreach-pipeline.mjs                      # All demo_built targets
 *   node scripts/outreach/outreach-pipeline.mjs --target-id 42       # Single target
 *   node scripts/outreach/outreach-pipeline.mjs --target-ids 42,43   # Multiple targets
 *   node scripts/outreach/outreach-pipeline.mjs --dry-run             # Preview email only
 */

import { parseArgs } from 'node:util';
import { resolve } from 'node:path';

// Load env before any other imports that need env vars
const DEMO_ROOT = resolve(import.meta.dirname, '../../');
const { loadEnv, requireEnv } = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/env-loader.mjs'));
loadEnv();

const { query, execute } = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/turso-client.mjs'));
const logger = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/logger.mjs'));
import { generateEmail, validateEmail, CALL_SLOTS } from './generate-email.mjs';
import { createGmailDraft } from './create-draft.mjs';
import { findNextSlot, formatSlotForEmail } from './calendar.mjs';

requireEnv(['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']);

const { values: args } = parseArgs({
  options: {
    'target-id': { type: 'string' },
    'target-ids': { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help) {
  console.log(`Outreach Pipeline — Create Gmail drafts for built demos

Usage:
  node scripts/outreach/outreach-pipeline.mjs                      # All demo_built targets
  node scripts/outreach/outreach-pipeline.mjs --target-id 42       # Single target
  node scripts/outreach/outreach-pipeline.mjs --target-ids 42,43   # Multiple targets
  node scripts/outreach/outreach-pipeline.mjs --dry-run             # Preview only`);
  process.exit(0);
}

// ──────────────────────────────────────────────────────────
// Select targets
// ──────────────────────────────────────────────────────────

let targets;
if (args['target-id']) {
  targets = await query('SELECT * FROM targets WHERE id = ?', [parseInt(args['target-id'], 10)]);
} else if (args['target-ids']) {
  const ids = args['target-ids'].split(',').map(id => parseInt(id.trim(), 10));
  const placeholders = ids.map(() => '?').join(',');
  targets = await query(`SELECT * FROM targets WHERE id IN (${placeholders})`, ids);
} else {
  // All targets with built demos that haven't had drafts created yet
  targets = await query(
    `SELECT * FROM targets
     WHERE demo_url IS NOT NULL
       AND email IS NOT NULL AND email != ''
       AND (status = 'demo_built' OR (demo_built_at IS NOT NULL AND email_message_id IS NULL))
     ORDER BY icp_score DESC`
  );
}

if (targets.length === 0) {
  logger.info('No targets found for outreach');
  process.exit(0);
}

logger.info(`Processing ${targets.length} target(s) for outreach${args['dry-run'] ? ' (dry run)' : ''}`);

// ──────────────────────────────────────────────────────────
// Get Gmail credentials
// ──────────────────────────────────────────────────────────

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

if (!args['dry-run'] && (!GMAIL_USER || !GMAIL_APP_PASSWORD)) {
  logger.error('Missing GMAIL_USER or GMAIL_APP_PASSWORD — cannot create drafts');
  process.exit(1);
}

// ──────────────────────────────────────────────────────────
// Process each target
// ──────────────────────────────────────────────────────────

let succeeded = 0;
let failed = 0;
let skipped = 0;

// Find a preview slot for the email (where the call will likely be booked)
let previewSlot;
try {
  const slot = findNextSlot();
  previewSlot = slot ? formatSlotForEmail(slot) : '10:30am';
} catch {
  previewSlot = '10:30am';
}

for (const target of targets) {
  const name = target.company_name;

  try {
    logger.progress({
      stage: 'outreach',
      target_id: target.id,
      site_id: target.slug,
      status: 'start',
      detail: `Generating email for ${name}`,
    });

    // Generate email from template
    const email = generateEmail(target, { previewSlot });

    // Validate
    const validation = validateEmail(email);
    if (!validation.valid) {
      logger.warn(`Validation failed for ${name}: ${validation.issues.join('; ')}`);
      skipped++;
      logger.progress({
        stage: 'outreach',
        target_id: target.id,
        site_id: target.slug,
        status: 'error',
        detail: `Validation: ${validation.issues[0]}`,
      });
      continue;
    }

    if (args['dry-run']) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`To: ${email.to}`);
      console.log(`Subject: ${email.subject}`);
      console.log(`Call: ${email.callDay} at ${email.callTime}`);
      console.log(`${'─'.repeat(60)}`);
      console.log(email.textBody);
      console.log(`${'─'.repeat(60)}\n`);
      succeeded++;
      continue;
    }

    // Create Gmail draft
    const result = await createGmailDraft(email, {
      user: GMAIL_USER,
      password: GMAIL_APP_PASSWORD,
    });

    if (!result.success) {
      logger.error(`Gmail draft failed for ${name}: ${result.error}`);
      failed++;
      logger.progress({
        stage: 'outreach',
        target_id: target.id,
        site_id: target.slug,
        status: 'error',
        detail: `Gmail: ${result.error}`,
      });
      continue;
    }

    // Update Turso
    await execute(
      `UPDATE targets
       SET status = 'draft_ready',
           email_message_id = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [result.messageId, target.id]
    );

    logger.info(`Draft created for ${name} → ${email.to} (Message-ID: ${result.messageId})`);
    succeeded++;

    logger.progress({
      stage: 'outreach',
      target_id: target.id,
      site_id: target.slug,
      status: 'complete',
      detail: `Draft created → ${email.to}`,
    });

  } catch (e) {
    logger.error(`Failed for ${name}: ${e.message}`);
    failed++;
    logger.progress({
      stage: 'outreach',
      target_id: target.id,
      site_id: target.slug,
      status: 'error',
      detail: e.message,
    });
  }
}

logger.summary({ total: targets.length, succeeded, failed, skipped });
process.exit(failed > 0 && succeeded === 0 ? 1 : 0);
