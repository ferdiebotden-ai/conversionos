# /outreach-pipeline — Create Gmail Drafts for Built Demos

Run the outreach pipeline to create personalised Gmail drafts for targets with built ConversionOS demos.

## Parse Arguments

- `--target-id {id}` → Single target
- `--target-ids {id1,id2}` → Multiple targets
- `--dry-run` → Preview email only (no Gmail, no DB writes)
- `--status` → Show pipeline status (scored targets, pending drafts, sent emails)
- `--report` → Show top 30 targets by ICP score
- (no args) → All targets with `demo_url IS NOT NULL` and no existing draft

---

## Phase 1 — Prerequisites

Check environment:

```bash
# Verify env vars are loadable
node -e "
  const { resolve } = require('node:path');
  const DEMO_ROOT = '$(pwd)';
  // env-loader will throw if critical vars missing
  console.log('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL ? 'SET' : 'MISSING');
  console.log('GMAIL_USER:', process.env.GMAIL_USER ? 'SET' : 'MISSING');
  console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'SET' : 'MISSING');
"
```

Required env vars (from `~/pipeline/scripts/.env`):
- `TURSO_DATABASE_URL` — CRM database
- `TURSO_AUTH_TOKEN` — CRM auth
- `GMAIL_USER` — Gmail account (ferdie@norbotsystems.com)
- `GMAIL_APP_PASSWORD` — App-specific password (not login password)

---

## Phase 2 — Status Check (if `--status`)

```bash
node -e "
  // Quick status from Turso
" <<'QUERY'
SELECT status, COUNT(*) as cnt FROM targets
WHERE demo_url IS NOT NULL
GROUP BY status
ORDER BY cnt DESC
QUERY
```

Show: how many demo_built, draft_ready, email_1_sent targets exist.

---

## Phase 3 — Execute Pipeline

### Dry Run (preview only)

```bash
node scripts/outreach/outreach-pipeline.mjs --target-id {id} --dry-run
```

Shows: To, Subject, Call day/time, full email body. No Gmail connection, no DB writes.

**Review the output** — verify personalisation looks right before creating the real draft.

### Create Draft

```bash
node scripts/outreach/outreach-pipeline.mjs --target-id {id}
```

This will:
1. Load target from Turso
2. Check hard stops (phone, company_name, city, demo_url — skip if missing)
3. Fill Ferdie's email template with target data (subject rotation for same-city batches)
4. Run quality gates (CASL, banned terms, no unfilled vars, subject checks)
5. Build MIME multipart/alternative message (text + HTML)
6. Create Gmail draft via REST API (OAuth2)
7. Store Message-ID + draft ID in Turso (`email_message_id`, `email_draft_id`)
8. Update status to `draft_ready`

### Batch (all ready targets)

```bash
node scripts/outreach/outreach-pipeline.mjs
```

Processes all targets where `demo_url IS NOT NULL` and `email_message_id IS NULL`.

---

## Phase 4 — Verify

After creating drafts:
1. Check Gmail Drafts folder — draft should be there with Ferdie's signature
2. Click the demo URL in the email — verify the demo site loads
3. Verify Turso status: `SELECT id, company_name, status, email_message_id FROM targets WHERE status = 'draft_ready'`

---

## Phase 5 — Report Results

Output:
- Number of drafts created
- Any targets that failed quality gates (and why)
- Any Gmail connection errors
- Next steps: "Review drafts in Gmail, click Send when ready"

---

## Rules

- **Never auto-send.** Drafts only. Ferdie reviews and clicks Send.
- **CASL compliance** is mandatory — every email includes: sender name, business name, PO Box address, "Reply STOP" unsubscribe.
- **Template is sacred** — the words are Ferdie's (March 2026), not AI-generated. Only variables get filled.
- **Hard stops** — phone, company_name, city, demo_url are all mandatory. Missing any = target skipped.
- **Banned terms** — "AI", "ConversionOS", "platform", "free", "limited time", "exclusive", "guaranteed", "no obligation" must never appear.
- **Subject rotation** — 3+ targets in same city get varied subject lines to avoid inbox clustering.
- **Sentinel names** — "Not specified", "N/A", "Unknown" etc. become "there" ("Hi there,").
- **Quality gates block** — if validation fails, the target is skipped (not force-sent).
- **Send window** — Ferdie sends drafts 7–8am ET, Mon–Fri (workflow convention).

## Related

- Full docs: `scripts/outreach/README.md`
- Tests: `node scripts/outreach/tests/test-email-template.mjs` (~40 tests)
- Send monitor: runs automatically via LaunchAgent every 15 min
- ICP re-scoring: `node scripts/outreach/rescore-all.mjs`
