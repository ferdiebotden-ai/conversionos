# ConversionOS Tenant Builder

Automated pipeline for discovering Ontario renovation contractors, scoring them for demo fitness, scraping their websites, provisioning ConversionOS demo tenants, and running visual QA.

## Quick Start

```bash
cd ~/norbot-ops/products/demo

# Single target from pipeline
node tenant-builder/orchestrate.mjs --target-id 42

# Batch from pipeline DB
node tenant-builder/orchestrate.mjs --batch --limit 10

# Discover + build new targets
node tenant-builder/orchestrate.mjs --discover --cities "London,Kitchener" --limit 5

# Dry run (score + scrape only)
node tenant-builder/orchestrate.mjs --batch --limit 5 --dry-run

# Nightly (same as --batch --limit 10)
node tenant-builder/orchestrate.mjs --nightly
```

## Module Structure

```
tenant-builder/
  orchestrate.mjs        # Master entry point (all modes)
  discover.mjs           # Pipeline/discovery target selection
  icp-score.mjs          # 6-criterion ICP scoring (100 pts)
  config.yaml            # All configuration (weights, thresholds, cities)
  package.json           # Dependencies (@libsql/client, firecrawl, playwright, etc.)
  CLAUDE.md              # This file
  lib/
    env-loader.mjs       # Load .env.local + ~/pipeline/scripts/.env
    logger.mjs           # Structured logging with [PROGRESS] lines
    turso-client.mjs     # Turso (libsql) wrapper
    supabase-client.mjs  # Demo Supabase wrapper
    claude-cli.mjs       # Claude -p CLI wrapper
    firecrawl-client.mjs # Firecrawl SDK wrapper with credit tracking
    concurrency.mjs      # Promise pool (configurable limit)
  scrape/
    scrape-enhanced.mjs  # 3-phase scraper orchestrator
    branding-v2.mjs      # Firecrawl branding extraction + AI enrichment
    logo-extract.mjs     # 4-level logo extraction fallback
    logo-vision.mjs      # Claude Vision logo identification
  provision/
    provision-tenant.mjs # Per-target provisioning sequence
    proxy-fragment.mjs   # Write proxy.ts fragment (parallel-safe)
    merge-proxy.mjs      # Merge all proxy fragments into proxy.ts
    voice-agent.mjs      # ElevenLabs agent creation (Dominate tier stub)
  qa/
    screenshot.mjs       # Desktop + mobile screenshots via Playwright
    structural-qa.mjs    # Wraps existing verify.mjs (8-check suite)
    visual-qa.mjs        # Claude Vision 5-dimension rubric
    refinement-loop.mjs  # Fix-and-recheck cycle (plateau/regression detection, snapshot/rollback)
    content-integrity.mjs # 9-check suite + autoFixViolations() for DB cleanup
    audit-report.mjs     # Human-readable markdown audit report generator
  schemas/
    icp-score.json       # ICP scoring structured output
    branding-v2.json     # Branding extraction structured output
    logo-vision.json     # Logo identification structured output
    visual-qa.json       # Visual QA rubric structured output
  tests/
    setup.mjs              # Env loading, test constants, requireIntegrationEnv()
    cleanup.mjs            # Remove all test artifacts (DB, Storage, proxy, local)
    helpers/
      assertions.mjs       # Reusable validators (ICP, scrape, provision, QA)
      fixtures.mjs         # Mock data for unit tests
    unit/                  # 35 tests, ~300ms, no API calls
      logger.test.mjs
      env-loader.test.mjs
      concurrency.test.mjs
      proxy-fragment.test.mjs
      merge-proxy.test.mjs
    integration/           # 18 tests, ~4 min, real APIs (~$0.50/run)
      icp-score.test.mjs
      scrape.test.mjs
      provision.test.mjs
      qa-pipeline.test.mjs
      orchestrator-flags.test.mjs
  vitest.config.mjs        # Vitest config (120s timeout, sequential)
  launchd/
    com.norbot.tenant-builder.plist  # macOS LaunchAgent (00:15 daily)
  results/               # Per-run output (gitignored)
    {date}/{site-id}/
      scraped.json       # Merged scrape data
      provisioned.json   # Post-image-upload data
      branding-v2.json   # Branding extraction result
      screenshots/       # QA screenshots
      visual-qa.json     # Visual QA scores
    {date}/proxy-fragments/  # Proxy.ts fragments for merging
    {date}/batch-summary.json  # Batch run summary
```

## Environment Variables

Loaded from `~/norbot-ops/products/demo/.env.local` and `~/pipeline/scripts/.env`:

| Variable | Source | Required For |
|----------|--------|-------------|
| TURSO_DATABASE_URL | pipeline .env | All (CRM database) |
| TURSO_AUTH_TOKEN | pipeline .env | All (CRM database) |
| FIRECRAWL_API_KEY | pipeline .env | Discovery, scraping |
| NEXT_PUBLIC_SUPABASE_URL | demo .env.local | Provisioning, screenshots |
| SUPABASE_SERVICE_ROLE_KEY | demo .env.local | Provisioning, screenshots |

## Pipeline Flow

1. **Select targets** — from Turso DB (pipeline mode) or Firecrawl search (discovery mode)
2. **ICP score** — 6-criterion model (100 pts), threshold 50 for manual review, 70 for auto-proceed
3. **Scrape** — branding v2 + existing 7-stage scrape.mjs + 4-level logo extraction + OKLCH recomputation + trust metrics from Turso
4. **Quality gates** — filter testimonials (min 2 valid), portfolio (require images), services (require name+description), hero (reject generic), verifiable badge filter (15 keywords), logo URL keyword filter (27 non-logo terms)
5. **Provision** — upload images (incl. service images + local file paths), create Supabase rows (5 keys incl. quote_assistance), write proxy fragment. Provenance tracking via `_provenance` field.
6. **Merge proxy** — combine all fragments into proxy.ts
7. **Git + deploy** — commit, push, wait for Vercel (poll skipped with `--skip-git`)
8. **QA Phase A** — content integrity (9 checks: demo leakage, broken images, demo images, colour, sections, fabrication, placeholders, business name, copyright) → auto-fix critical issues
9. **QA Phase B** — visual QA + refinement loop (plateau/regression detection, snapshot/rollback)
10. **Audit report** — human-readable markdown (content integrity + visual QA + auto-fixes + human review checklist)

## ICP Scoring (6 Dimensions, 100 pts)

| Dimension | Points | Logic |
|-----------|--------|-------|
| Template fit | 0-20 | Keyword scan for services, testimonials, portfolio, about |
| Sophistication gap | 0-20 | INVERTED: basic Wix = 20, stunning custom = 3 |
| Years in business | 0-15 | INVERTED: 1-3 yrs = 15, 15+ yrs = 5 |
| Google reviews | 0-15 | Rating + count combined |
| Geography | 0-15 | Phase 1 cities = 15, Phase 3+ = 9 |
| Company size | 0-15 | INVERTED: solo = 15, large = 4 |

## Turso DB Changes

Added columns on `targets` table:
- `icp_score INTEGER` — 0-100 ICP score
- `icp_breakdown TEXT` — JSON string of ICPBreakdown shape

Existing columns used: `bespoke_status`, `bespoke_score`, `brand_assets`

## Quality Gates (in provision.mjs)

| Gate | Logic | Result When Failed |
|------|-------|--------------------|
| Hero quality | Rejects < 10 chars, > 100 chars, generic ("Welcome", "Home"), business-name-only | Template defaults: "See Your Renovation Before It Begins" |
| Testimonial authenticity | Requires author > 2 chars, quote > 20 chars, min 2 valid | Template hides testimonials section |
| Portfolio reality | Requires valid image URL + non-empty title | Template shows "portfolio being updated" message |
| Service completeness | Requires name > 3 chars, description > 10 chars, no placeholders | Template hides services section |

## Content Integrity QA (qa/content-integrity.mjs)

Post-provisioning Playwright check for 9 categories + auto-fix:
1. **Demo leakage** — scans for NorBot phone/email/address/demo image paths on tenant pages
2. **Broken images** — HEAD requests on all `<img>` sources + naturalWidth check
3. **Demo images** — regex scan for `/images/demo/` in HTML source
4. **Colour consistency** — verifies `--primary` CSS variable matches expected colour
5. **Section integrity** — flags sections with headings but < 20 chars body text
6. **Fabrication detection** — reads `_provenance` from scraped.json, flags AI-generated high-risk fields
7. **Placeholder text** — scans for generic phrases (lorem ipsum, your business, coming soon, etc.)
8. **Business name presence** — verifies contractor name in page title and body
9. **Copyright format** — checks for double periods in footer

**Auto-fix:** `autoFixViolations(siteId, violations)` — clears fabricated trustBadges/processSteps/values/trust_metrics in Supabase.

```bash
node qa/content-integrity.mjs --url https://example.norbotsystems.com --site-id example [--expected-color "#D60000"] [--scraped-data ./scraped.json] [--business-name "Company Name"]
```

## Audit Report (qa/audit-report.mjs)

Generates human-readable markdown summary from QA results:
- Content integrity results (✅/⚠️ per check)
- Visual QA scores per dimension
- Auto-fixes applied
- Human review checklist (logo quality, copy tone, hero image, brand feel, service accuracy)
- Overall verdict: `complete` (all passed) or `review` (needs human glance)

```bash
node qa/audit-report.mjs --site-id example --results-dir ./results/2026-02-26/example/
```

## Testing

```bash
cd ~/norbot-ops/products/demo/tenant-builder

# All tests (unit + integration)
npm test

# Unit tests only (~300ms, no API calls)
npm run test:unit

# Integration tests only (~4 min, real APIs, ~$0.50/run)
npm run test:integration

# Cleanup test artifacts
npm run cleanup
```

### Test Constants

- **Test site_id:** `redwhitereno-test` (avoids clobbering production `redwhitereno`)
- **Test target_id:** 22 (Red White Reno in Turso)
- **Test URL:** `https://www.redwhitereno.com`
- **Test tier:** `accelerate`

### Unit Tests (35 tests, mocked)

| File | Tests | What It Covers |
|------|-------|----------------|
| `logger.test.mjs` | 12 | Log levels, data logging, PROGRESS/SUMMARY JSON format |
| `env-loader.test.mjs` | 7 | KEY=VALUE parsing, export prefix, quoted values, comments |
| `concurrency.test.mjs` | 7 | Pool limits, result ordering, mixed success/failure |
| `proxy-fragment.test.mjs` | 4 | File creation, directory creation, overwrite |
| `merge-proxy.test.mjs` | 5 | Domain insertion, duplicate skipping, idempotency |

### Integration Tests (18 tests, real APIs)

| File | Tests | What It Covers |
|------|-------|----------------|
| `orchestrator-flags.test.mjs` | 4 | --help, no-mode error, bad target ID, missing --site-id |
| `icp-score.test.mjs` | 3 | Score range, dry-run DB protection, PROGRESS/SUMMARY lines |
| `scrape.test.mjs` | 4 | Valid output, branding-v2, known data, logo confidence |
| `provision.test.mjs` | 4 | DB provisioning, valid state, idempotency, dry-run |
| `qa-pipeline.test.mjs` | 3 | Screenshot creation, visual QA scoring, result file |

Integration tests require all 5 env vars to be set. They skip gracefully via `requireIntegrationEnv()` if env vars are missing.

### Reusable Assertion Helpers (`tests/helpers/assertions.mjs`)

- `assertValidIcpScore(score, breakdown)` — range 0-100, 6 dimensions, sum check
- `assertValidScrapedData(data, expectedName)` — all fields, anti-hallucination checks
- `assertValidProvision(siteId, supabase)` — 4 admin_settings rows, 1 tenants row
- `assertValidQaResult(result)` — 5 dimensions 1-5, average calculation, pass logic

## Key Patterns

- All files are ES modules (.mjs)
- Existing onboarding scripts called as subprocesses (execFileSync)
- Proxy fragments enable parallel-safe proxy.ts updates
- [PROGRESS] and [SUMMARY] JSON lines for Mission Control parsing
- Claude CLI calls strip CLAUDECODE env var to avoid nested sessions
- env-loader handles both `KEY=VALUE` and `export KEY=VALUE` formats

## Step 6: Outreach Pipeline Hook

After QA passes (Step 5), `orchestrate.mjs` automatically runs the outreach pipeline:

1. Selects targets where QA passed from the current batch
2. Runs `scripts/outreach/outreach-pipeline.mjs --target-ids {ids}`
3. Each target gets: email template filled -> quality gate -> Gmail draft created -> Turso updated

**Skip with:** `--skip-outreach` flag on orchestrate.mjs

**What it does NOT do:** Send emails. Drafts only. Ferdie reviews and clicks Send.

**Dependencies:** `GMAIL_USER` + `GMAIL_APP_PASSWORD` in `~/pipeline/scripts/.env`. Without these, the outreach step errors but the build itself still succeeds.

**Full outreach docs:** `scripts/outreach/README.md`

## Self-Improving Documentation

After any feature, schema, config, or workflow change in tenant-builder:
1. Update this CLAUDE.md (module structure, env vars, flow, scoring)
2. Update `SHARED_INTERFACES.md` if data shapes changed
3. Update `~/.claude/projects/-Users-norbot-norbot-ops-products-demo/memory/MEMORY.md` (tenant builder section)
4. Describe current state only — no changelogs
