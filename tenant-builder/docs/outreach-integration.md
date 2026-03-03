# Outreach Integration (Step 6)

After QA (Steps 8-16), `orchestrate.mjs` automatically runs the outreach pipeline for deployed targets.

## Flow

1. Selects targets where QA passed from the current batch
2. Runs `scripts/outreach/outreach-pipeline.mjs --target-ids {ids}`
3. Each target: email template filled → quality gate → Gmail draft created → Turso updated

**Skip with:** `--skip-outreach` flag on orchestrate.mjs

## What It Does NOT Do

Send emails. Drafts only. Ferdie reviews and clicks Send.

## Dependencies

| Credential | Location | Purpose |
|-----------|----------|---------|
| GMAIL_CLIENT_ID | ~/pipeline/scripts/.env | OAuth2 client |
| GMAIL_CLIENT_SECRET | ~/pipeline/scripts/.env | OAuth2 secret |
| GMAIL_REFRESH_TOKEN | ~/pipeline/scripts/.env | Token refresh |

OAuth2 via Google Cloud project "NorBot Outreach" under ferdie@norbotsystems.com.

Without these credentials, the outreach step errors but the build itself still succeeds.

## Turso Status Flow

```
demo_built → draft_ready → email_1_sent
```

## Email Template

Ferdie's exact words (March 2026 version). AI fills variables — never rewrites the copy.

- Subject: `Estimate Request — {city}` with rotation for same-city batches
- 6 hard stops: company_name, city, demo_url, call_day, call_time, call_phone
- 8 banned terms: AI, ConversionOS, platform, free, limited time, exclusive, guaranteed, no obligation
- CASL footer with PO Box 23030 Stratford

## Full Docs

- `scripts/outreach/README.md` — Complete pipeline docs
- `.claude/rules/outreach.md` — CASL, template integrity, call slots, sentinel names
- `scripts/outreach/tests/test-email-template.mjs` — 56 tests
