#!/usr/bin/env node
/**
 * Outreach pipeline orchestrator.
 * For targets with built demos: fill email template → create Gmail draft.
 * Also handles follow-up email sequences (emails 2-5) for targets that
 * already received their initial outreach.
 *
 * Usage:
 *   node scripts/outreach/outreach-pipeline.mjs                      # All built targets ready for outreach
 *   node scripts/outreach/outreach-pipeline.mjs --target-id 42       # Single target
 *   node scripts/outreach/outreach-pipeline.mjs --target-ids 42,43   # Multiple targets
 *   node scripts/outreach/outreach-pipeline.mjs --dry-run             # Preview email only
 *   node scripts/outreach/outreach-pipeline.mjs --follow-ups          # Process follow-up emails only
 *   node scripts/outreach/outreach-pipeline.mjs --follow-ups --dry-run # Preview follow-ups
 */

import { parseArgs } from 'node:util';
import { resolve } from 'node:path';

// Load env before any other imports that need env vars
const DEMO_ROOT = resolve(import.meta.dirname, '../../');
const { loadEnv, requireEnv } = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/env-loader.mjs'));
loadEnv();

const { query, execute } = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/turso-client.mjs'));
const logger = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/logger.mjs'));
const { hasActivePolishQueue } = await import(resolve(DEMO_ROOT, 'scripts/polish/queue-utils.mjs'));
import { generateEmail, validateEmail, generateFollowUpEmail, FOLLOWUP_SCHEDULE, CALL_SLOTS, isPlaceholderEmail } from './generate-email.mjs';
import { createGmailDraft } from './create-draft.mjs';
import { findNextSlot, formatSlotForEmail } from './calendar.mjs';

requireEnv(['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']);

// Gmail API credentials (OAuth2) — required for draft creation
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

const { values: args } = parseArgs({
  options: {
    'target-id': { type: 'string' },
    'target-ids': { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    'follow-ups': { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help) {
  console.log(`Outreach Pipeline — Create Gmail drafts for built demos

Usage:
  node scripts/outreach/outreach-pipeline.mjs                      # All built targets ready for outreach
  node scripts/outreach/outreach-pipeline.mjs --target-id 42       # Single target
  node scripts/outreach/outreach-pipeline.mjs --target-ids 42,43   # Multiple targets
  node scripts/outreach/outreach-pipeline.mjs --dry-run             # Preview only
  node scripts/outreach/outreach-pipeline.mjs --follow-ups          # Process follow-up emails only
  node scripts/outreach/outreach-pipeline.mjs --follow-ups --dry-run # Preview follow-ups`);
  process.exit(0);
}

// ──────────────────────────────────────────────────────────
// Follow-up day guard: Mon-Thu only (0=Sun, 5=Fri, 6=Sat)
// Contractors don't check email Fri-Sun.
// ──────────────────────────────────────────────────────────

const todayDow = new Date().getDay();
const isFollowUpDay = todayDow >= 1 && todayDow <= 4; // Mon=1 .. Thu=4

// ──────────────────────────────────────────────────────────
// Get Gmail credentials
// ──────────────────────────────────────────────────────────

if (!args['dry-run'] && (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN)) {
  logger.error('Missing Gmail API credentials (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN)');
  logger.error('Run: node scripts/outreach/gmail-auth-setup.mjs');
  process.exit(1);
}

const gmailCredentials = {
  clientId: GMAIL_CLIENT_ID,
  clientSecret: GMAIL_CLIENT_SECRET,
  refreshToken: GMAIL_REFRESH_TOKEN,
};

// ──────────────────────────────────────────────────────────
// URL liveness check (A1.1)
// ──────────────────────────────────────────────────────────

/**
 * Check if a demo URL is live (HTTP 200). 10s timeout, 2 retries.
 * @param {string} url
 * @returns {Promise<{ live: boolean, status: number|null, error?: string }>}
 */
export async function checkDemoUrl(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);
      if (res.status === 200) {
        return { live: true, status: res.status };
      }
      // Non-200 — retry
      if (attempt < 2) continue;
      return { live: false, status: res.status, error: `HTTP ${res.status}` };
    } catch (e) {
      if (attempt < 2) continue;
      return { live: false, status: null, error: e.message };
    }
  }
  return { live: false, status: null, error: 'exhausted retries' };
}

let succeeded = 0;
let failed = 0;
let skipped = 0;

// ──────────────────────────────────────────────────────────
// FOLLOW-UP MODE: process follow-up emails (emails 2-5)
// ──────────────────────────────────────────────────────────

if (args['follow-ups']) {
  if (!isFollowUpDay && !args['dry-run']) {
    logger.info('Follow-ups only run Mon–Thu. Today is ' + ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][todayDow] + '. Exiting.');
    process.exit(0);
  }

  logger.info(`Processing follow-up emails${args['dry-run'] ? ' (dry run)' : ''}...`);

  // Map email status → next email number
  const STATUS_TO_NEXT_EMAIL = {
    'email_1_sent': 2,
    'email_2_sent': 3,
    'email_3_sent': 4,
    'email_4_sent': 5,
  };

  // Query targets due for follow-up based on FOLLOWUP_SCHEDULE timing
  // Each status has a minimum days-since-last-touch before the next follow-up fires
  const followUpTargets = await query(
    `SELECT t.*, MAX(tc.created_at) as last_touch_at
     FROM targets t
     LEFT JOIN touches tc ON tc.target_id = t.id
       AND tc.type IN ('email_initial', 'email_followup', 'email_breakup')
     WHERE t.status IN ('email_1_sent', 'email_2_sent', 'email_3_sent', 'email_4_sent')
       AND t.email IS NOT NULL AND t.email != ''
       AND t.demo_url IS NOT NULL
       -- Exclude targets that replied or showed interest
       AND t.id NOT IN (
         SELECT target_id FROM touches
         WHERE outcome = 'reply' OR outcome = 'interested'
           OR notes LIKE '%replied%'
       )
       -- Exclude targets that unsubscribed (STOP)
       AND t.id NOT IN (
         SELECT target_id FROM touches
         WHERE outcome = 'unsubscribe' OR notes LIKE '%STOP%' OR notes LIKE '%unsubscribe%'
       )
     GROUP BY t.id
     ORDER BY t.icp_score DESC`
  );

  // Filter by timing: only include targets where enough days have passed
  const now = Date.now();
  const dueDrafts = followUpTargets.filter(t => {
    const nextEmailNum = STATUS_TO_NEXT_EMAIL[t.status];
    if (!nextEmailNum) return false;

    const requiredDays = FOLLOWUP_SCHEDULE[nextEmailNum];
    if (!requiredDays) return false;

    // Use last touch date or updated_at as fallback
    const lastDate = t.last_touch_at || t.contacted_at || t.updated_at;
    if (!lastDate) return false;

    const daysSince = Math.floor((now - new Date(lastDate).getTime()) / 86_400_000);
    return daysSince >= requiredDays;
  });

  if (dueDrafts.length === 0) {
    logger.info('No follow-up emails due today.');
  } else {
    logger.info(`Found ${dueDrafts.length} target(s) due for follow-up emails.`);
  }

  for (const target of dueDrafts) {
    const name = target.company_name;
    const nextEmailNum = STATUS_TO_NEXT_EMAIL[target.status];
    const nextStatus = `email_${nextEmailNum}_sent`;

    try {
      logger.progress({
        stage: 'follow-up',
        target_id: target.id,
        site_id: target.slug,
        status: 'start',
        detail: `Generating follow-up email ${nextEmailNum} for ${name}`,
      });

      // Generate follow-up email
      const email = generateFollowUpEmail(target, nextEmailNum);

      if (email.skipped) {
        logger.warn(`Skipped follow-up for ${name}: ${email.skipReason}`);
        skipped++;
        logger.progress({
          stage: 'follow-up',
          target_id: target.id,
          site_id: target.slug,
          status: 'skipped',
          detail: email.skipReason,
        });
        continue;
      }

      if (args['dry-run']) {
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`[FOLLOW-UP ${nextEmailNum}] ${name}`);
        console.log(`To: ${email.to}`);
        console.log(`Subject: ${email.subject}`);
        console.log(`${'─'.repeat(60)}`);
        console.log(email.textBody);
        console.log(`${'─'.repeat(60)}\n`);
        succeeded++;
        continue;
      }

      // Create Gmail draft (NEVER auto-send — CASL compliance)
      const result = await createGmailDraft(email, gmailCredentials);

      if (!result.success) {
        logger.error(`Gmail follow-up draft failed for ${name}: ${result.error}`);
        failed++;
        logger.progress({
          stage: 'follow-up',
          target_id: target.id,
          site_id: target.slug,
          status: 'error',
          detail: `Gmail: ${result.error}`,
        });
        continue;
      }

      // Update target status to next email stage (draft_ready pattern —
      // status stays at email_N_sent since Ferdie must send it manually.
      // We use draft_ready to signal it's pending Ferdie's review.)
      await execute(
        `UPDATE targets
         SET email_draft_id = ?,
             updated_at = datetime('now')
         WHERE id = ?`,
        [result.draftId || null, target.id]
      );

      // Log the follow-up touch in touches table
      await execute(
        `INSERT INTO touches (target_id, type, outcome, notes, created_at)
         VALUES (?, ?, 'pending', ?, datetime('now'))`,
        [
          target.id,
          nextEmailNum === 5 ? 'email_breakup' : 'email_followup',
          `Follow-up email ${nextEmailNum} draft created (Message-ID: ${result.messageId})`,
        ]
      );

      logger.info(`Follow-up ${nextEmailNum} draft created for ${name} → ${email.to}`);
      succeeded++;

      logger.progress({
        stage: 'follow-up',
        target_id: target.id,
        site_id: target.slug,
        status: 'complete',
        detail: `Follow-up ${nextEmailNum} draft → ${email.to}`,
      });

    } catch (e) {
      logger.error(`Follow-up failed for ${name}: ${e.message}`);
      failed++;
      logger.progress({
        stage: 'follow-up',
        target_id: target.id,
        site_id: target.slug,
        status: 'error',
        detail: e.message,
      });
    }
  }

  logger.summary({ total: dueDrafts.length, succeeded, failed, skipped, mode: 'follow-ups' });
  process.exit(failed > 0 && succeeded === 0 ? 1 : 0);
}

// ──────────────────────────────────────────────────────────
// INITIAL OUTREACH MODE: Select targets for first email
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
  // A1.2: tightened — email_message_id IS NULL on all conditions to prevent dedup
  targets = await query(
    `SELECT * FROM targets
     WHERE demo_url IS NOT NULL
       AND email IS NOT NULL AND email != ''
       AND email_message_id IS NULL
       AND (
         status = 'bespoke_ready'
         OR status = 'demo_built'
         OR demo_built_at IS NOT NULL
       )
     ORDER BY icp_score DESC`
  );
}

const blockedTargets = targets.filter(t => hasActivePolishQueue(t.slug));
targets = targets.filter(t => !hasActivePolishQueue(t.slug));

if (blockedTargets.length > 0) {
  logger.info(`Skipping ${blockedTargets.length} target(s) still waiting on polish/manual review: ${blockedTargets.map(t => t.slug).join(', ')}`);
}

if (targets.length === 0) {
  logger.info('No targets found for outreach');
  process.exit(0);
}

logger.info(`Processing ${targets.length} target(s) for outreach${args['dry-run'] ? ' (dry run)' : ''}`);

// ──────────────────────────────────────────────────────────
// Process each target (initial email)
// ──────────────────────────────────────────────────────────

// Find a preview slot for the email (where the call will likely be booked)
let previewSlot;
try {
  const slot = findNextSlot();
  previewSlot = slot ? formatSlotForEmail(slot) : '10:30am';
} catch {
  previewSlot = '10:30am';
}

// Build city counts for subject rotation (3+ targets in same city get varied subjects)
const cityMap = new Map();
for (const t of targets) {
  const city = (t.city || '').trim().toLowerCase();
  if (!city) continue;
  if (!cityMap.has(city)) cityMap.set(city, []);
  cityMap.get(city).push(t.id);
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

    // A1.2: Draft dedup — skip if email_message_id already set (belt-and-suspenders for --target-id mode)
    if (target.email_message_id) {
      logger.warn(`Skipped ${name}: draft already exists (Message-ID: ${target.email_message_id})`);
      skipped++;
      logger.progress({
        stage: 'outreach',
        target_id: target.id,
        site_id: target.slug,
        status: 'skipped',
        detail: 'Draft already exists (dedup)',
      });
      continue;
    }

    // A1.1: URL liveness gate — verify demo is actually accessible
    const demoUrl = target.demo_url || `https://${target.slug}.norbotsystems.com`;
    if (!args['dry-run']) {
      const urlCheck = await checkDemoUrl(demoUrl);
      if (!urlCheck.live) {
        logger.warn(`Skipped ${name}: demo URL not live — ${demoUrl} (${urlCheck.error})`);
        skipped++;
        logger.progress({
          stage: 'outreach',
          target_id: target.id,
          site_id: target.slug,
          status: 'skipped',
          detail: `Demo URL not live: ${urlCheck.error}`,
        });
        continue;
      }
    }

    // Compute city rotation index for subject line variation
    const city = (target.city || '').trim().toLowerCase();
    const cityGroup = cityMap.get(city) || [target.id];
    const cityIndex = cityGroup.indexOf(target.id);
    const cityCount = cityGroup.length;

    // Generate email from template
    const email = generateEmail(target, { previewSlot, cityIndex, cityCount });

    // Handle hard-stop skips (missing phone, company_name, city, etc.)
    if (email.skipped) {
      logger.warn(`Skipped ${name}: ${email.skipReason}`);
      skipped++;
      logger.progress({
        stage: 'outreach',
        target_id: target.id,
        site_id: target.slug,
        status: 'skipped',
        detail: email.skipReason,
      });
      continue;
    }

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
    const result = await createGmailDraft(email, gmailCredentials);

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
           email_draft_id = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [result.messageId, result.draftId || null, target.id]
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
