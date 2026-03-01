# Outreach Pipeline

Automated last-mile outreach for ConversionOS demos. After the tenant builder provisions a bespoke demo site, this pipeline fills Ferdie's exact email template with target data, creates a Gmail draft via the Gmail REST API (OAuth2), and monitors for sends — auto-booking follow-up calls in Apple Calendar.

## Flow

```
Target with built demo (Turso: demo_url IS NOT NULL)
  |
  v
generate-email.mjs — Fill Ferdie's template with target data
  |
  v
create-draft.mjs — Gmail REST API draft creation (OAuth2)
  |
  v
Ferdie reviews + clicks Send (manual, CASL golden rule)
  |
  v
send-monitor.mjs (every 15 min, 6am-9pm daily)
  |-- IMAP SEARCH [Gmail]/Sent Mail by Message-ID
  |-- calendar.mjs — Book 30-min slot in "Work" calendar (AppleScript)
  |-- Claude CLI — Generate 5-bullet call script
  \-- Turso: status -> email_1_sent, follow_up_slot, call_script
```

## File Inventory

| File | Lines | Purpose |
|------|-------|---------|
| `generate-email.mjs` | 278 | Fill email template with target data (Ferdie's exact words) |
| `create-draft.mjs` | 145 | Gmail REST API draft creation (OAuth2, no npm deps) |
| `gmail-auth-setup.mjs` | 130 | One-time OAuth2 setup (consent flow → refresh token) |
| `outreach-pipeline.mjs` | 203 | Orchestrator: select targets, generate, validate, create drafts |
| `send-monitor.mjs` | 284 | Cron: detect sends, book calendar, generate call scripts |
| `calendar.mjs` | 205 | Apple Calendar via AppleScript (query events, book slots) |
| `rescore-all.mjs` | 159 | ICP re-scoring in batches (calls tenant-builder/icp-score.mjs) |
| `schemas/email-output.json` | — | Template variable schema |
| `tests/test-email-template.mjs` | ~350 | ~40 mock data tests (no real APIs) |
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

## Email Template (March 2026)

Ferdie's exact words — AI fills variables, never rewrites:

**Subject (primary):** `Estimate Request — {city}`
**Subject (rotation B):** `{company_name} — Custom Estimate Portal`
**Subject (rotation C):** `{city} Renovation Website Demo`

Subject rotation applies when 3+ targets are in the same city in one batch.

```
Hi {firstName},

I'm Ferdie out of Stratford — I built a custom website for {company_name}
that captures and qualifies leads for you while you're on a job site.

It's live for 48 hours — take a look and you'll see your brand, your
services, and a working estimate tool under your name (please keep it
private):
{demoUrl}

I'll give you a call on {callDay} at {callTime} at {callPhone} to walk you
through it — if there's a better time or number, just let me know.

Talk soon,
Ferdie

—
Ferdie Botden, CPA
Founder, NorBot Systems Inc.
226-444-3478 | norbotsystems.com

NorBot Systems Inc. | PO Box 23030 Stratford PO Main, ON N5A 7V8
Reply STOP to be removed.
```

**Variables:**

| Variable | Source | Fallback | Required |
|----------|--------|----------|----------|
| `{firstName}` | `owner_name` (first word) | "there" | No |
| `{company_name}` | Turso | HARD STOP | Yes |
| `{city}` | Turso | HARD STOP | Yes |
| `{demoUrl}` | Turso `demo_url` or `https://{slug}.norbotsystems.com` | HARD STOP | Yes |
| `{callDay}` | Calendar integration | HARD STOP | Yes |
| `{callTime}` | Calendar slot finder | HARD STOP | Yes |
| `{callPhone}` | Turso `phone` | HARD STOP | Yes |

**Hard stops:** If any required variable is missing, the target is skipped entirely (no draft created). `generateEmail()` returns `{ skipped: true, skipReason }`.

## Quality Gates

`validateEmail()` checks before any draft is created:

1. Not a hard-stop skip (`email.skipped !== true`)
2. Valid email address (contains `@`)
3. Subject must not contain "Ferdie" or "NorBot"
4. No unfilled `{variables}` in subject or body
5. No banned terms in body: "AI", "ConversionOS", "platform", "free", "limited time", "exclusive", "guaranteed", "no obligation"
6. CASL footer present ("STOP", "NorBot Systems", "PO Box 23030")

**Send window:** Ferdie sends drafts 7–8am ET, Mon–Fri (workflow convention, not code-enforced).

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

Runs every 900 seconds (15 min). Time guard in script: exits silently outside 6am-9pm daily.
Use `--force` to bypass the time guard for testing.

## Environment Variables

From `~/pipeline/scripts/.env` (loaded by env-loader.mjs):

| Variable | Required For |
|----------|-------------|
| `TURSO_DATABASE_URL` | All scripts |
| `TURSO_AUTH_TOKEN` | All scripts |
| `GMAIL_CLIENT_ID` | create-draft (Gmail API OAuth2) |
| `GMAIL_CLIENT_SECRET` | create-draft (Gmail API OAuth2) |
| `GMAIL_REFRESH_TOKEN` | create-draft (Gmail API OAuth2) |
| `GMAIL_USER` | send-monitor (IMAP sent detection) |
| `GMAIL_APP_PASSWORD` | send-monitor (IMAP sent detection) |

### Gmail API Setup (One-Time)

```bash
# 1. Create OAuth2 credentials at https://console.cloud.google.com/apis/credentials
#    → Enable Gmail API → Create "Desktop app" OAuth2 client
# 2. Add client ID and secret to ~/pipeline/scripts/.env:
#      GMAIL_CLIENT_ID=<your-client-id>
#      GMAIL_CLIENT_SECRET=<your-client-secret>
# 3. Run the setup script to get a refresh token:
node scripts/outreach/gmail-auth-setup.mjs
# 4. Add the printed refresh token to ~/pipeline/scripts/.env:
#      GMAIL_REFRESH_TOKEN=<your-refresh-token>
```

## Dependencies

**Zero npm dependencies.** Gmail API uses built-in `fetch`. IMAP operations (send-monitor) use built-in `tls` module. Calendar uses macOS `osascript`. MIME building uses built-in `crypto` for UUIDs.

## Integration with Tenant Builder

`tenant-builder/orchestrate.mjs` Step 6 automatically runs the outreach pipeline after QA passes:

```bash
# Build + outreach (default)
node tenant-builder/orchestrate.mjs --target-id 42

# Build only, skip outreach
node tenant-builder/orchestrate.mjs --target-id 42 --skip-outreach
```

## Troubleshooting

**Gmail API draft creation fails:**
- Verify `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` in `~/pipeline/scripts/.env`
- If token expired, re-run: `node scripts/outreach/gmail-auth-setup.mjs`
- Ensure Gmail API is enabled: https://console.cloud.google.com/apis/library/gmail.googleapis.com

**IMAP auth fails (send-monitor):**
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
