#!/usr/bin/env node
/**
 * Send monitor — detects when Ferdie sends a draft, then:
 * 1. Books a 30-min call slot in "Work" calendar
 * 2. Generates a call script via Claude CLI
 * 3. Updates Turso with status, slot, and script
 *
 * Runs every 15 minutes via LaunchAgent (6am-9pm daily).
 *
 * Usage:
 *   node scripts/outreach/send-monitor.mjs          # Normal run
 *   node scripts/outreach/send-monitor.mjs --force   # Skip time-of-day check
 */

import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import * as tls from 'node:tls';

const DEMO_ROOT = resolve(import.meta.dirname, '../../');
const { loadEnv, requireEnv } = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/env-loader.mjs'));
loadEnv();

const { query, execute } = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/turso-client.mjs'));
const { callClaude } = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/claude-cli.mjs'));
const logger = await import(resolve(DEMO_ROOT, 'tenant-builder/lib/logger.mjs'));
import { findNextSlot, createCalendarEvent } from './calendar.mjs';

requireEnv(['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'GMAIL_USER', 'GMAIL_APP_PASSWORD']);

const { values: args } = parseArgs({
  options: {
    force: { type: 'boolean', default: false },
  },
});

// ──────────────────────────────────────────────────────────
// Time guard: only run 6am–9pm daily (ET)
// ──────────────────────────────────────────────────────────

const now = new Date();
const hour = now.getHours();

if (!args.force) {
  if (hour < 6 || hour >= 21) {
    logger.debug('Outside 6am-9pm — skipping send monitor');
    process.exit(0);
  }
}

// ──────────────────────────────────────────────────────────
// Find targets with pending drafts
// ──────────────────────────────────────────────────────────

const pending = await query(
  `SELECT * FROM targets
   WHERE status = 'draft_ready'
     AND email_message_id IS NOT NULL
   ORDER BY updated_at ASC`
);

if (pending.length === 0) {
  logger.debug('No pending drafts to monitor');
  process.exit(0);
}

logger.info(`Checking ${pending.length} draft(s) in Gmail Sent folder`);

// ──────────────────────────────────────────────────────────
// IMAP: check Sent folder for Message-IDs
// ──────────────────────────────────────────────────────────

async function checkSentForMessageId(messageId) {
  return new Promise((resolve) => {
    const socket = tls.connect(993, 'imap.gmail.com', { rejectUnauthorized: false }, () => {
      let tag = 0;
      let buffer = '';
      let state = 'greeting';
      let found = false;

      function send(cmd) {
        tag++;
        socket.write(`A${tag} ${cmd}\r\n`);
        return `A${tag}`;
      }

      socket.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\r\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (state === 'greeting' && line.startsWith('* OK')) {
            state = 'login';
            const u = process.env.GMAIL_USER.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            const p = process.env.GMAIL_APP_PASSWORD.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            send(`LOGIN "${u}" "${p}"`);
          } else if (state === 'login' && line.startsWith(`A${tag}`)) {
            if (line.includes('OK')) {
              state = 'select';
              send('SELECT "[Gmail]/Sent Mail"');
            } else {
              socket.destroy();
              resolve({ found: false, error: 'Login failed' });
            }
          } else if (state === 'select' && line.startsWith(`A${tag}`)) {
            if (line.includes('OK')) {
              state = 'search';
              // Search by Message-ID header
              send(`SEARCH HEADER Message-ID "${messageId}"`);
            } else {
              socket.destroy();
              resolve({ found: false, error: 'SELECT failed' });
            }
          } else if (state === 'search') {
            if (line.startsWith('* SEARCH')) {
              // * SEARCH 123 456 — numbers are UIDs of matching messages
              const parts = line.split(' ').slice(2);
              found = parts.length > 0 && parts[0] !== '';
            }
            if (line.startsWith(`A${tag}`)) {
              state = 'logout';
              send('LOGOUT');
            }
          } else if (state === 'logout') {
            if (line.startsWith(`A${tag}`) || line.startsWith('* BYE')) {
              socket.destroy();
              resolve({ found });
            }
          }
        }
      });

      socket.on('error', (err) => {
        resolve({ found: false, error: err.message });
      });

      setTimeout(() => {
        socket.destroy();
        resolve({ found: false, error: 'IMAP timeout' });
      }, 20000);
    });
  });
}

// ──────────────────────────────────────────────────────────
// Generate call script via Claude CLI
// ──────────────────────────────────────────────────────────

function generateCallScript(target) {
  const prompt = `Generate a brief call script (5 bullet points) for Ferdie Botden calling ${target.company_name} (${target.owner_name || 'the owner'}) in ${target.city}.

Context:
- We built them a custom demo website at https://${target.slug}.norbotsystems.com
- They're a renovation contractor${target.services ? ` offering: ${target.services}` : ''}
- ${target.google_rating ? `Google rating: ${target.google_rating}/5 (${target.google_review_count} reviews)` : 'No Google reviews data'}
- ${target.years_in_business ? `${target.years_in_business} years in business` : 'Years unknown'}

Ferdie's style: casual, direct, CPA-turned-tech-founder. He's from Stratford, Ontario.

Format as 5 bullet points:
1. Opening (warm, reference the demo we sent)
2. Why we chose them specifically
3. What ConversionOS does for their business (AI quoting, visualisation, lead capture)
4. Pricing mention (ranges, not hard sell)
5. Next step / close (set up a full walkthrough)

Keep each bullet under 25 words. No fluff.`;

  try {
    const result = callClaude(prompt, {
      model: 'sonnet',
      maxTurns: 1,
      timeoutMs: 60000,
    });
    return typeof result === 'string' ? result : JSON.stringify(result);
  } catch (e) {
    logger.warn(`Call script generation failed: ${e.message}`);
    return `1. Open: "Hey ${target.owner_name || 'there'}, it's Ferdie from NorBot — did you get a chance to check out the site we built?"\n2. Why them: Great reputation in ${target.city}, perfect fit for our platform\n3. Value: AI-powered quoting, renovation visualiser, automated lead capture\n4. Pricing: Starts at $249/mo, we handle everything\n5. Close: "Want me to walk you through it properly? 15 minutes, I'll show you everything"`;
  }
}

// ──────────────────────────────────────────────────────────
// Main loop
// ──────────────────────────────────────────────────────────

let processed = 0;
let booked = 0;

for (const target of pending) {
  const name = target.company_name;
  const messageId = target.email_message_id;

  logger.debug(`Checking sent status for ${name} (${messageId})`);

  const result = await checkSentForMessageId(messageId);

  if (result.error) {
    logger.warn(`IMAP error for ${name}: ${result.error}`);
    continue;
  }

  if (!result.found) {
    logger.debug(`${name}: not yet sent`);
    continue;
  }

  // Email was sent! Book a call.
  logger.info(`${name}: EMAIL SENT — booking call`);
  processed++;

  // 1. Find next available slot
  const slot = findNextSlot();
  if (!slot) {
    logger.warn(`No available call slots found for ${name} — skipping calendar`);
    await execute(
      `UPDATE targets SET status = 'email_1_sent', updated_at = datetime('now') WHERE id = ?`,
      [target.id]
    );
    continue;
  }

  // 2. Create calendar event
  const demoUrl = target.demo_url || `https://${target.slug}.norbotsystems.com`;
  const calResult = createCalendarEvent({
    summary: `Call: ${name} — ${target.owner_name || 'Owner'}`,
    startDate: slot.slotStart,
    phone: target.phone || '',
    notes: `Demo: ${demoUrl}\n${target.website || ''}\nPhone: ${target.phone || 'N/A'}\nCity: ${target.city}\nEmail: ${target.email}`,
  });

  if (calResult.success) {
    logger.info(`Calendar booked: ${slot.date.toLocaleDateString('en-CA')} at ${slot.timeLabel}`);
    booked++;
  } else {
    logger.warn(`Calendar booking failed: ${calResult.error}`);
  }

  // 3. Generate call script
  logger.info(`Generating call script for ${name}...`);
  const callScript = generateCallScript(target);

  // 4. Update Turso
  const slotStr = `${slot.date.toISOString().split('T')[0]} ${slot.timeLabel}`;
  await execute(
    `UPDATE targets
     SET status = 'email_1_sent',
         follow_up_slot = ?,
         call_script = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [slotStr, callScript, target.id]
  );

  // 5. Log the touch
  try {
    await execute(
      `INSERT INTO touches (target_id, type, channel, content, created_at)
       VALUES (?, 'email_sent', 'gmail', ?, datetime('now'))`,
      [target.id, `Outreach email sent. Call booked: ${slotStr}`]
    );
  } catch {
    // touches table might not exist — non-critical
  }

  logger.progress({
    stage: 'send-monitor',
    target_id: target.id,
    site_id: target.slug,
    status: 'complete',
    detail: `Sent → call booked ${slotStr}`,
  });
}

if (processed > 0) {
  logger.info(`Send monitor: ${processed} email(s) detected sent, ${booked} call(s) booked`);
}

logger.summary({ total: pending.length, succeeded: processed, failed: 0, skipped: pending.length - processed });
