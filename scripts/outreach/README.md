# Outreach Pipeline

Automated last-mile outreach for ConversionOS demos. After the tenant builder provisions a bespoke demo site, this pipeline fills Ferdie's exact email template with target data, creates a Gmail draft via raw IMAP, and monitors for sends — auto-booking follow-up calls in Apple Calendar.

## Flow

```
Target with built demo (Turso: demo_url IS NOT NULL)
  |
  v
generate-email.mjs — Fill Ferdie's template with target data
  |
  v
create-draft.mjs — IMAP APPEND to [Gmail]/Drafts
  |
  v
Ferdie reviews + clicks Send (manual, CASL golden rule)
  |
  v
send-monitor.mjs (every 15 min, 6am-9pm weekdays)
  |-- IMAP SEARCH [Gmail]/Sent Mail by Message-ID
  |-- calendar.mjs — Book 30-min slot in "Work" calendar (AppleScript)
  |-- Claude CLI — Generate 5-bullet call script
  \-- Turso: status -> email_1_sent, follow_up_slot, call_script
```

## File Inventory

| File | Lines | Purpose |
|------|-------|---------|
| `generate-email.mjs` | 278 | Fill email template with target data (Ferdie's exact words) |
| `create-draft.mjs` | 189 | Gmail IMAP APPEND — raw TLS, no external deps |
| `outreach-pipeline.mjs` | 203 | Orchestrator: select targets, generate, validate, create drafts |
| `send-monitor.mjs` | 284 | Cron: detect sends, book calendar, generate call scripts |
| `calendar.mjs` | 205 | Apple Calendar via AppleScript (query events, book slots) |
| `rescore-all.mjs` | 159 | ICP re-scoring in batches (calls tenant-builder/icp-score.mjs) |
| `schemas/email-output.json` | — | Template variable schema |
| `tests/test-email-template.mjs` | 338 | 35 mock data tests (no real APIs) |
| `tests/test-imap.mjs` | — | IMAP connectivity test |

## Usage

```bash
cd ~/norbot-ops/products/demo

# Preview email for a specific target (no Gmail, no DB writes)
node scripts/outreach/outreach-pipeline.mjs --target-id 42 --dry-run

# Create Gmail draft for a specific target
node scripts/outreach/outreach-pipeline.mjs --target-id 42

# Create drafts for all targets with built demos
node scripts/outreach/outreach-pipeline.mjs

# Multiple specific targets
node scripts/outreach/outreach-pipeline.mjs --target-ids 42,43,44

# Run tests
node scripts/outreach/tests/test-email-template.mjs

# Re-score all targets (batches of 20)
node scripts/outreach/rescore-all.mjs

# Show top 30 by ICP score
node scripts/outreach/rescore-all.mjs --report

# Check IMAP connectivity
node scripts/outreach/tests/test-imap.mjs
```

## Email Template

Ferdie's exact words — AI fills variables, never rewrites:

**Subject:** `{firstName} - Estimate Request Intake (Modern & Custom)`

```
Hey {firstName},

I'm Ferdie out of Stratford and built a custom website for you, it's live,
but it's more than just a website — you'll see.

I'll call you {callDay} at {callTime}{phoneClause} to explain who we are
and why we chose to build it for you in {city}.

Here is the link, it's live for 48 hours for you to play around with it
(please keep it private):
{demoUrl}

If you're curious who we are and what the software can do for you, visit us
at www.norbotsystems.com before the call, otherwise I look forward to
speaking with you (if a different time works better, just let me know or
if there's a better number to reach you).

Talk soon.
Ferdie

—
Ferdie Botden, CPA
Founder, NorBot Systems Inc.
226-444-3478

NorBot Systems Inc. | PO Box 23030 Stratford PO Main, ON N5A 7V8
Reply STOP to be removed.
```

**Variables:**
- `{firstName}` — from `owner_name` (first word), "there" if unknown/sentinel
- `{callDay}` — "tomorrow" if next biz day, else weekday name ("Monday")
- `{callTime}` — from calendar slot finder (e.g., "10:30am")
- `{phoneClause}` — ` at 519-555-1234` if phone exists, empty string if not
- `{city}` — from Turso, falls back to "your area"
- `{demoUrl}` — `https://{slug}.norbotsystems.com`

## Quality Gates

`validateEmail()` checks before any draft is created:

1. Valid email address (contains `@`)
2. Subject has no unfilled `{variables}`
3. Body has no unfilled `{variables}`
4. CASL footer present ("STOP" keyword)
5. Business name in footer ("NorBot Systems")
6. Mailing address in footer ("PO Box 23030")
7. Body under 250 words

## Calendar Booking

When send-monitor detects an email was sent:

1. **Find slot** — queries Apple Calendar "Work" calendar for conflicts
2. **Slots:** 9:30am, 10:00am, 10:30am, 11:00am, 11:30am, 1:00pm, 1:30pm, 2:00pm, 2:30pm, 3:00pm
3. **Skip noon** (12:00-12:59)
4. **Look-ahead:** 10 business days
5. **Book 30-min event** via AppleScript:
   - Summary: `Call: {companyName} — {ownerName}`
   - Location: phone number
   - Notes: demo URL, website, phone, city, email
6. **Generate call script** — 5 bullet points via Claude CLI (Sonnet 4.6)

## Turso Schema (6 Columns Added)

```sql
ALTER TABLE targets ADD COLUMN demo_url TEXT;
ALTER TABLE targets ADD COLUMN demo_built_at TEXT;
ALTER TABLE targets ADD COLUMN email_draft_id TEXT;
ALTER TABLE targets ADD COLUMN email_message_id TEXT;
ALTER TABLE targets ADD COLUMN follow_up_slot TEXT;
ALTER TABLE targets ADD COLUMN call_script TEXT;
```

**Status flow:** `demo_built` -> `draft_ready` -> `email_1_sent`

## LaunchAgent (Send Monitor)

```bash
# Load
launchctl load ~/Library/LaunchAgents/com.norbot.send-monitor.plist

# Unload
launchctl unload ~/Library/LaunchAgents/com.norbot.send-monitor.plist

# Check status
launchctl list | grep send-monitor

# Logs
tail -50 /tmp/com.norbot.send-monitor.stdout.log
tail -50 /tmp/com.norbot.send-monitor.stderr.log
```

Runs every 900 seconds (15 min). Time guard in script: exits silently outside 6am-9pm weekdays.
Use `--force` to bypass the time guard for testing.

## Environment Variables

From `~/pipeline/scripts/.env` (loaded by env-loader.mjs):

| Variable | Required For |
|----------|-------------|
| `TURSO_DATABASE_URL` | All scripts |
| `TURSO_AUTH_TOKEN` | All scripts |
| `GMAIL_USER` | create-draft, send-monitor |
| `GMAIL_APP_PASSWORD` | create-draft, send-monitor |

## Dependencies

**Zero npm dependencies.** All IMAP operations use Node.js built-in `tls` module. Calendar uses macOS `osascript`. MIME building uses built-in `crypto` for UUIDs.

## Integration with Tenant Builder

`tenant-builder/orchestrate.mjs` Step 6 automatically runs the outreach pipeline after QA passes:

```bash
# Build + outreach (default)
node tenant-builder/orchestrate.mjs --target-id 42

# Build only, skip outreach
node tenant-builder/orchestrate.mjs --target-id 42 --skip-outreach
```

## Troubleshooting

**IMAP auth fails:**
- Verify `GMAIL_USER` and `GMAIL_APP_PASSWORD` in `~/pipeline/scripts/.env`
- App passwords: https://myaccount.google.com/apppasswords
- Must be an app-specific password, not the Gmail login password

**Calendar permission denied:**
- macOS Settings > Privacy & Security > Automation > Terminal > Calendar must be enabled
- First run may trigger a permission prompt

**Send monitor not detecting sends:**
- Check LaunchAgent is loaded: `launchctl list | grep send-monitor`
- Check logs: `tail -50 /tmp/com.norbot.send-monitor.stdout.log`
- Verify Message-ID was stored: `SELECT email_message_id FROM targets WHERE id = ?`
- Test IMAP search manually: `node scripts/outreach/tests/test-imap.mjs`

**Stale processes:**
- Kill old scoring processes: `pkill -f rescore-all`
- Kill old pipeline processes: `pkill -f outreach-pipeline`
