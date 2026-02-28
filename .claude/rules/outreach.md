# Outreach Pipeline Rules

## CASL Compliance (Non-Negotiable)

Every outreach email MUST include:
- Sender name: "Ferdie Botden, CPA"
- Business name: "NorBot Systems Inc."
- Mailing address: "PO Box 23030 Stratford PO Main, ON N5A 7V8"
- Unsubscribe: "Reply STOP to be removed."

`validateEmail()` in `generate-email.mjs` enforces this. Never bypass.

## Template Integrity

The email template in `generate-email.mjs` is **Ferdie's exact words**. AI fills variables — it does not rewrite, rephrase, or "improve" the copy. The subject line, body structure, sign-off, and signature are fixed.

If you need to change the template wording, get Ferdie's explicit approval first.

## Never Auto-Send

All emails go to Gmail Drafts via IMAP APPEND. Ferdie reviews each one and clicks Send manually. This is a CASL requirement and a business decision.

The `send-monitor.mjs` detects sends by checking `[Gmail]/Sent Mail` for the stored Message-ID — it never triggers sends.

## Sentinel Name Handling

`getFirstName()` filters these values to "there" (producing "Hey there,"):
- `null`, empty string, whitespace-only
- "Not specified", "Not applicable", "Not provided"
- "N/A", "NA", "Unknown", "None", "Owner"
- Single-character names

When adding new sentinel values, add them to `SENTINEL_NAMES` in `generate-email.mjs` AND add a test in `tests/test-email-template.mjs`.

## Call Slots

- **Hours:** 9:30am to 3:00pm, Monday through Friday
- **Duration:** 30 minutes each
- **Interval:** 30 minutes
- **Skip noon:** No slots between 12:00-12:59
- **No double-booking:** `calendar.mjs` checks "Work" calendar for conflicts before booking
- **Look-ahead:** 10 business days

## City Exclusivity

City exclusivity is **Dominate tier only** ($2,500/mo). For Elevate and Accelerate outreach, multiple contractors in the same city is fine — there is no territory restriction at those tiers. Only enforce one-per-city when selling Dominate.

## Phone Clause

- If `target.phone` exists: email says "I'll call you {callDay} at {callTime} at {phone}"
- If `target.phone` is null/empty: email says "I'll call you {callDay} at {callTime}" (no awkward "at null")

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
| `scripts/outreach/generate-email.mjs` | Template filler + quality gates |
| `scripts/outreach/create-draft.mjs` | Raw IMAP APPEND to Gmail Drafts |
| `scripts/outreach/outreach-pipeline.mjs` | Orchestrator (select, generate, validate, draft) |
| `scripts/outreach/send-monitor.mjs` | Cron: detect send, book calendar, call script |
| `scripts/outreach/calendar.mjs` | Apple Calendar AppleScript integration |
| `scripts/outreach/rescore-all.mjs` | Batch ICP re-scoring |
| `scripts/outreach/tests/test-email-template.mjs` | 35 mock data tests |
