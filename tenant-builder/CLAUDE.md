# ConversionOS Tenant Builder

Autonomous pipeline that discovers Ontario renovation contractors, scores them for demo fitness, scrapes their websites, provisions branded ConversionOS demo tenants, runs 9-module visual QA, and creates outreach email drafts.

**Model preference:** Use Sonnet 4.6 for routine builds. Opus 4.6 only for deep code modifications or debugging.

**At session start:** Read `docs/learned-patterns.md` to apply accumulated build learnings.

## Multi-Model Agent Organisation (March 2026)

The tenant builder uses a tiered agent architecture for cost efficiency (~$1.12/build vs ~$5 with all-Opus):

| Agent | Model | Role | Cost/Build |
|-------|-------|------|------------|
| **Opus** (you) | Opus 4.6 | Orchestrator — delegates, handles escalations, 2-3 turns max | ~$0.15 |
| **build-worker** | Sonnet 4.6 | Autonomous builder — runs pipeline, QA, fixes, returns verdict | ~$0.80 |
| **qa-validator** | Haiku 4.5 | Data validation — 15 anti-pattern checks via Supabase curl | ~$0.01 |
| **pipeline-scout** | Haiku 4.5 | Pre-screening, ICP scoring, discovery, pipeline maintenance | ~$0.05 |
| **qa-monitor** | Haiku 4.5 | Heartbeat for batch Agent Teams — progress monitoring | ~$0.02 |
| **image-polisher** | Sonnet 4.6 | Hero image quality audit + Gemini generation | ~$0.04 |

**Skills:** `tenant-qa-knowledge` (fix playbook), `build-tenant` (orchestrator), `maintain-pipeline` (pipeline depth), `daily-ai-brief` (ecosystem alerts)

**Usage:** `/build-tenant {site-id} {url}` for single builds, `/build-tenant --batch --limit N` for batch. Wrap in Ralph Loop for iterative quality: `/ralph-loop "build-tenant ..." --completion-promise "TENANT READY" --max-iterations 3`

## Quick Start

```bash
cd ~/norbot-ops/products/demo

# Single target by ID (from Turso pipeline DB)
node tenant-builder/orchestrate.mjs --target-id 42

# Single target by URL (bypass pipeline DB)
node tenant-builder/orchestrate.mjs --url https://example.com --site-id example --tier accelerate

# Batch from pipeline DB
node tenant-builder/orchestrate.mjs --batch --limit 10

# Discover + build new targets
node tenant-builder/orchestrate.mjs --discover --cities "London,Kitchener" --limit 5

# Audit-only (QA on existing tenant, no scrape/provision)
node tenant-builder/orchestrate.mjs --audit-only --site-id example --url https://example.norbotsystems.com --skip-git

# Nightly (batch with config defaults: 10 targets, concurrency 4)
node tenant-builder/orchestrate.mjs --nightly
```

**Flags:** `--concurrency N` (default 4), `--dry-run`, `--skip-qa`, `--skip-git`, `--skip-outreach`, `--skip-sample-data`, `--timeout-multiplier N`

## Getting Next Targets

```bash
# Top 10 pipeline targets — sorted by ICP score, built targets auto-drop
node tenant-builder/discover.mjs --pipeline --limit 10

# Re-score all unscored targets
node tenant-builder/icp-score.mjs --all --limit 50

# Score a specific target
node tenant-builder/icp-score.mjs --target-id 42
```

ICP scoring prioritises: small towns near Stratford (15 pts geography), owner-operators (15 pts company size), basic websites (20 pts sophistication gap), complete contact data (15 pts email/phone/name). See `docs/icp-scoring.md` for full breakdown. Targets auto-drop from the pipeline after a demo is built (`status = 'bespoke_ready'`).

## Pipeline Flow (16 Steps)

1. Select targets — Turso DB, direct URL, or Firecrawl discovery
2. ICP score — 6-criterion model (100 pts), threshold 50/70
3. Scrape — branding v2 + 7-stage scrape + 4-level logo extraction + social links
4. Quality gates — testimonials (min 2), portfolio (images), services (name+desc), hero (reject generic)
5. Provision — upload images, seed Supabase (5 keys), write proxy fragment, seed sample leads
6. Merge proxy — combine fragments into proxy.ts
7. Git + deploy — commit, push, wait for Vercel. Domain routing via wildcard DNS
8. QA: Page completeness — 6 pages + footer data verification
9. QA: Data-gap resolution — auto-fix gaps (socials, N/A hours, favicon). Up to 2 attempts
10. QA: Content integrity — 12 checks + auto-fix (demo leakage, broken images, fabrication, placeholders)
11. QA: Visual QA — Claude Vision 6-dimension rubric + refinement loop (plateau/regression detection)
12. QA: Live site audit — 8 Playwright checks (branding, nav, responsive, WCAG, SEO, images, footer, admin)
13. QA: Original vs demo — 7-field comparison (name, phone, email, services, testimonials, colour, logo)
14. QA: PDF branding — Supabase completeness for PDF generation
15. QA: Email branding — admin_settings + template source scan
16. Go-live readiness report — 7-section markdown + JSON verdict (READY / REVIEW / NOT READY)
17. Outreach — Gmail drafts for deployed targets (skip with `--skip-outreach`)

## Gallery Upgrade (Existing Tenants)

```bash
# Upgrade a tenant's portfolio with new images
node tenant-builder/upgrade-tenant-gallery.mjs --site-id example --images gallery-data/example.json

# Dry run (no uploads, no DB changes)
node tenant-builder/upgrade-tenant-gallery.mjs --site-id example --images data.json --dry-run
```

Image data files (JSON arrays of `{url, roomType, title}`) stored in `tenant-builder/gallery-data/`. Script downloads images, uploads to Supabase Storage, appends to `company_profile.portfolio[]`.

## Post-Build Review

After `orchestrate.mjs` completes, always review the results:

1. **Read batch summary** — `results/{date}/batch-summary.json` → success/fail counts
2. **Classify each tenant** — Read `go-live-readiness.json` → READY / REVIEW / NOT READY
3. **Review failures** — For REVIEW/NOT READY: read `audit-report.md` + `visual-qa.json`, identify specific failures
4. **Visual check** — Read screenshots (`results/{date}/{site-id}/screenshots/`) to verify logos, colours, layout
5. **Review email drafts** — Search Gmail for drafts matching the company name. Verify: no banned terms, CASL footer, correct city/company/URL, call day/time filled
6. **Present summary** — Structured report with action items for Ferdie
7. **Update learned patterns** — If you made manual corrections, ask Ferdie if the pattern should be recorded in `docs/learned-patterns.md`

## Deep Reference

| Topic | File |
|-------|------|
| Module structure, scrape/provision details | `docs/pipeline-architecture.md` |
| All 9 QA modules with checks and thresholds | `docs/qa-modules.md` |
| ICP scoring dimensions and logic | `docs/icp-scoring.md` |
| Sample lead fixtures and regeneration | `docs/sample-data.md` |
| Outreach integration (Step 6) | `docs/outreach-integration.md` |
| Data shape interfaces | `SHARED_INTERFACES.md` |
| Accumulated build learnings | `docs/learned-patterns.md` |
| Outreach rules (CASL, template, slots) | `../scripts/outreach/README.md` |

## Environment Variables

Loaded from `~/norbot-ops/products/demo/.env.local` and `~/pipeline/scripts/.env`:

| Variable | Source | Required For |
|----------|--------|-------------|
| TURSO_DATABASE_URL | pipeline .env | All (CRM database) |
| TURSO_AUTH_TOKEN | pipeline .env | All (CRM database) |
| FIRECRAWL_API_KEY | pipeline .env | Discovery, scraping |
| NEXT_PUBLIC_SUPABASE_URL | demo .env.local | Provisioning, QA |
| SUPABASE_SERVICE_ROLE_KEY | demo .env.local | Provisioning, QA |
| VERCEL_TOKEN + VERCEL_PROJECT_ID + VERCEL_TEAM_ID | pipeline .env | Domain registration + SSL (optional) |

## Testing

```bash
cd ~/norbot-ops/products/demo/tenant-builder
npm run test:unit          # 223 tests, ~400ms, no API calls
npm run test:integration   # 26 tests, ~4 min, real APIs (~$0.50/run)
npm test                   # All tests
npm run cleanup            # Remove test artifacts
```

Test constants: site_id `redwhitereno-test`, target_id 22, URL `https://www.redwhitereno.com`

## Key Patterns

- All files are ES modules (.mjs)
- Existing onboarding scripts called as subprocesses (`execFileSync` — not `execSync`)
- Proxy fragments enable parallel-safe proxy.ts updates
- `[PROGRESS]` and `[SUMMARY]` JSON lines for Mission Control parsing
- Claude CLI calls strip `CLAUDECODE` env var to avoid nested sessions
- CRLF fix for new .mjs files: `perl -pi -e 's/\r\n/\n/g'`
- `(supabase as any).from('table')` for tables not in generated types
- Provenance tracking: `_provenance` field on scraped data marks AI-generated content

## Self-Improving Documentation

After any tenant-builder change:
1. Update this CLAUDE.md
2. Update topic files in `docs/` if affected
3. Update `SHARED_INTERFACES.md` if data shapes changed
4. Update `~/.claude/projects/-Users-norbot-norbot-ops-products-demo/memory/MEMORY.md`
