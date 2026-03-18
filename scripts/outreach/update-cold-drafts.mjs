#!/usr/bin/env node
/**
 * One-off script to update existing cold outreach Gmail drafts with v3 template.
 * Lists all Gmail drafts, identifies cold outreach by subject pattern,
 * matches to Turso targets by email address, regenerates with v3 template,
 * and updates the draft via PUT /users/me/drafts/{id}.
 *
 * Usage:
 *   node scripts/outreach/update-cold-drafts.mjs --dry-run    # Preview only
 *   node scripts/outreach/update-cold-drafts.mjs              # Update drafts
 *   node scripts/outreach/update-cold-drafts.mjs --verbose    # With details
 */

import { parseArgs } from 'node:util';
import { resolve } from 'node:path';

// Load env before any other imports
const DEMO_ROOT = resolve(import.meta.dirname, '../../');
const { loadEnv, requireEnv } = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/env-loader.mjs'));
loadEnv();

const { query } = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/turso-client.mjs'));
import { generateEmail, validateEmail } from './generate-email.mjs';
import { listGmailDrafts, getGmailDraft, updateGmailDraft } from './create-draft.mjs';

requireEnv(['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']);

const GMAIL_CREDS = {
  clientId: process.env.GMAIL_CLIENT_ID,
  clientSecret: process.env.GMAIL_CLIENT_SECRET,
  refreshToken: process.env.GMAIL_REFRESH_TOKEN,
};

if (!GMAIL_CREDS.clientId || !GMAIL_CREDS.clientSecret || !GMAIL_CREDS.refreshToken) {
  console.error('Missing Gmail API credentials (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN)');
  process.exit(1);
}

const { values: args } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    'verbose': { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help) {
  console.log(`Update Cold Drafts — Replace existing cold outreach Gmail drafts with v3 template

Usage:
  node scripts/outreach/update-cold-drafts.mjs --dry-run    # Preview only
  node scripts/outreach/update-cold-drafts.mjs              # Update drafts
  node scripts/outreach/update-cold-drafts.mjs --verbose    # With details`);
  process.exit(0);
}

const DRY_RUN = args['dry-run'];
const VERBOSE = args['verbose'];

// ──────────────────────────────────────────────────────────
// Draft classification
// ──────────────────────────────────────────────────────────

function isWarmLead(subject, to) {
  if (!subject) return false;
  if (to === 'ferdie@norbotsystems.com') return true;
  if (subject.includes('AI-Enhanced Website Demo')) return true;
  if (subject.includes('[NEEDS EMAIL]')) return true;
  return false;
}

function isColdOutreach(subject) {
  if (!subject) return false;
  if (subject.startsWith('Estimate Request')) return true;
  if (subject.includes('Custom Estimate Portal')) return true;
  if (subject.includes('Renovation Website Demo')) return true;
  return false;
}

function extractHeader(headers, name) {
  if (!headers) return null;
  // Gmail metadata format: array of { name, value }
  if (Array.isArray(headers)) {
    const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return h ? h.value : null;
  }
  // Simple object format
  return headers[name] || null;
}

// ──────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Update Cold Outreach Drafts to v3 Template\n`);

  // 1. Load all Turso targets indexed by email
  console.log('Loading targets from Turso...');
  const rows = await query('SELECT * FROM targets WHERE email IS NOT NULL AND email != ""');
  const targetsByEmail = new Map();
  for (const row of rows) {
    if (row.email) targetsByEmail.set(row.email.toLowerCase().trim(), row);
  }
  console.log(`  ${targetsByEmail.size} targets with email addresses loaded\n`);

  // 2. List all Gmail drafts
  console.log('Listing Gmail drafts...');
  const allDrafts = await listGmailDrafts(GMAIL_CREDS);
  console.log(`  ${allDrafts.length} drafts found\n`);

  // 3. Classify and process each draft
  const stats = { updated: 0, skippedWarm: 0, skippedOther: 0, skippedNoMatch: 0, failed: 0, validated: 0 };

  for (let i = 0; i < allDrafts.length; i++) {
    const draft = allDrafts[i];
    const draftId = draft.id;

    // Get full metadata for this draft
    let metadata;
    try {
      metadata = await getGmailDraft(draftId, GMAIL_CREDS);
    } catch (e) {
      console.log(`  [${i + 1}/${allDrafts.length}] FAIL reading draft ${draftId}: ${e.message}`);
      stats.failed++;
      continue;
    }

    const headers = metadata?.message?.payload?.headers || [];
    const subject = extractHeader(headers, 'Subject') || '';
    const to = extractHeader(headers, 'To') || '';
    const toEmail = to.replace(/.*</, '').replace(/>.*/, '').trim().toLowerCase();

    // Classify
    if (isWarmLead(subject, toEmail)) {
      if (VERBOSE) console.log(`  [${i + 1}/${allDrafts.length}] SKIP (warm lead): ${subject}`);
      stats.skippedWarm++;
      await sleep(100);
      continue;
    }

    if (!isColdOutreach(subject)) {
      if (VERBOSE) console.log(`  [${i + 1}/${allDrafts.length}] SKIP (not cold outreach): ${subject}`);
      stats.skippedOther++;
      await sleep(100);
      continue;
    }

    // Match to Turso target
    const target = targetsByEmail.get(toEmail);
    if (!target) {
      console.log(`  [${i + 1}/${allDrafts.length}] SKIP (no Turso match): ${toEmail} — ${subject}`);
      stats.skippedNoMatch++;
      await sleep(100);
      continue;
    }

    // Generate new email with v3 template
    const email = generateEmail(target);
    if (email.skipped) {
      console.log(`  [${i + 1}/${allDrafts.length}] SKIP (hard stop): ${email.skipReason} — ${toEmail}`);
      stats.skippedOther++;
      await sleep(100);
      continue;
    }

    // Validate
    const { valid, issues } = validateEmail(email);
    if (!valid) {
      console.log(`  [${i + 1}/${allDrafts.length}] FAIL (validation): ${issues.join(', ')} — ${toEmail}`);
      stats.failed++;
      await sleep(100);
      continue;
    }
    stats.validated++;

    if (DRY_RUN) {
      console.log(`  [${i + 1}/${allDrafts.length}] WOULD UPDATE: ${email.to} — ${subject}`);
      if (VERBOSE) {
        console.log(`    Company: ${target.company_name}`);
        console.log(`    City: ${target.city}`);
        console.log(`    Demo: ${email.demoUrl}`);
      }
      stats.updated++;
      await sleep(100);
      continue;
    }

    // Update the draft
    const result = await updateGmailDraft(draftId, email, GMAIL_CREDS);
    if (result.success) {
      console.log(`  [${i + 1}/${allDrafts.length}] UPDATED: ${email.to} — ${subject}`);
      stats.updated++;
    } else {
      console.log(`  [${i + 1}/${allDrafts.length}] FAIL: ${result.error} — ${toEmail}`);
      stats.failed++;
    }

    // Rate limiting
    await sleep(250);
  }

  // Summary
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Summary:`);
  console.log(`  Updated:          ${stats.updated}`);
  console.log(`  Skipped (warm):   ${stats.skippedWarm}`);
  console.log(`  Skipped (other):  ${stats.skippedOther}`);
  console.log(`  Skipped (no match): ${stats.skippedNoMatch}`);
  console.log(`  Failed:           ${stats.failed}`);
  console.log(`  Validated:        ${stats.validated}`);
  console.log(`${'─'.repeat(60)}\n`);

  if (stats.failed > 0) process.exit(1);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
