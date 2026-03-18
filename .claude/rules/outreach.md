# Outreach Pipeline Rules

## CASL Compliance (Non-Negotiable)

Every outreach email MUST include:
- Sender name: "Ferdie Botden, CPA"
- Business name: "NorBot Systems Inc."
- Mailing address: "PO Box 23030 Stratford PO Main, ON N5A 7V8"
- Unsubscribe: "Reply STOP to be removed."

`validateEmail()` in `generate-email.mjs` enforces this. Never bypass.

## Template Integrity

The email template in `generate-email.mjs` is **Ferdie's exact words** (March 18, 2026 v3 — reputation-first opener, 48h urgency, reply/text CTA). AI fills variables — it does not rewrite, rephrase, or "improve" the copy. The subject line, body structure, sign-off, and signature are fixed.

If you need to change the template wording, get Ferdie's explicit approval first.

## Never Auto-Send

All emails go to Gmail Drafts via Gmail REST API (OAuth2). Ferdie reviews each one and clicks Send manually. This is a CASL requirement and a business decision.

The `send-monitor.mjs` detects sends by checking `[Gmail]/Sent Mail` for the stored Message-ID — it never triggers sends.

## Hard Stops

If ANY of these 6 fields are missing, the target is **skipped entirely** — no draft is created. `generateEmail()` returns `{ skipped: true, skipReason }`.

| Field | Source | Why Required |
|-------|--------|-------------|
| `company_name` | Turso | Opening line + CTA must be specific |
| `city` | Turso | Subject line + body opener use city |
| `email` | Turso | Must contain @ — draft recipient |

## Banned Terms

These words/phrases must NEVER appear in the email body or subject:
- "AI", "ConversionOS", "platform", "free", "limited time"
- "exclusive", "guaranteed", "no obligation"

`validateEmail()` enforces this with word-boundary regex matching. If a banned term is found, the email fails validation and the draft is not created.

## Subject Rotation

Default subject: `Estimate Request — {city}`

When a batch contains 3+ targets in the same city, subjects rotate to avoid duplicate subject lines in the same inbox cluster:
- 1st target: `Estimate Request — {city}` (default)
- 2nd target: `{company_name} — Custom Estimate Portal`
- 3rd target: `{city} Renovation Website Demo`
- 4th+: wraps back to Option B

Rotation is tracked by `outreach-pipeline.mjs` which passes `cityIndex` and `cityCount` to `generateEmail()`.

## Sentinel Name Handling

`getFirstName()` filters these values to "there" (producing "Hi there,"):
- `null`, empty string, whitespace-only
- "Not specified", "Not applicable", "Not provided"
- "N/A", "NA", "Unknown", "None", "Owner"
- Single-character names

When adding new sentinel values, add them to `SENTINEL_NAMES` in `generate-email.mjs` AND add a test in `tests/test-email-template.mjs`.

## Send Window

Drafts should be sent between **7:00–8:00 AM ET, Monday–Friday only**. This is a Ferdie workflow note, not code-enforced — drafts are created at pipeline runtime (any time), Ferdie sends in the morning window.

## Call Slots

- **Hours:** 9:30am to 3:00pm, Monday through Friday
- **Duration:** 30 minutes each
- **Interval:** 30 minutes
- **Skip noon:** No slots between 12:00-12:59
- **No double-booking:** `calendar.mjs` checks "Work" calendar for conflicts before booking
- **Look-ahead:** 10 business days

## City Exclusivity

City exclusivity is **Dominate tier only** ($1,799/mo). For Elevate and Accelerate outreach, multiple contractors in the same city is fine — there is no territory restriction at those tiers. Only enforce one-per-city when selling Dominate.

## Status Flow

```
demo_built -> draft_ready -> email_1_sent
```

- `demo_built`: tenant builder finished, demo live
- `draft_ready`: Gmail draft created, Message-ID stored in Turso
- `email_1_sent`: Ferdie sent the email, call booked in calendar

## Key Files

| File | What It Does |
|------|-------------|
| `scripts/outreach/generate-email.mjs` | Template filler + quality gates + banned terms |
| `scripts/outreach/create-draft.mjs` | Gmail REST API (OAuth2) draft creation |
| `scripts/outreach/outreach-pipeline.mjs` | Orchestrator (select, generate, validate, draft, city rotation) |
| `scripts/outreach/send-monitor.mjs` | Cron: detect send, book calendar, call script |
| `scripts/outreach/calendar.mjs` | Apple Calendar AppleScript integration |
| `scripts/outreach/rescore-all.mjs` | Batch ICP re-scoring |
| `scripts/outreach/tests/test-email-template.mjs` | ~40 mock data tests |
