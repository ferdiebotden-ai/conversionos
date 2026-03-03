# Pipeline Architecture

## Module Structure

```
tenant-builder/
  orchestrate.mjs        # Master entry point (all modes)
  discover.mjs           # Pipeline/discovery target selection
  icp-score.mjs          # 6-criterion ICP scoring (100 pts)
  config.yaml            # All configuration (weights, thresholds, cities)
  lib/
    env-loader.mjs       # Load .env.local + ~/pipeline/scripts/.env
    logger.mjs           # Structured logging with [PROGRESS] lines
    turso-client.mjs     # Turso (libsql) wrapper
    supabase-client.mjs  # Demo Supabase wrapper
    claude-cli.mjs       # Claude -p CLI wrapper
    firecrawl-client.mjs # Firecrawl SDK wrapper with credit tracking
    concurrency.mjs      # Promise pool (configurable limit)
    colour-utils.mjs     # OKLCH/sRGB colour conversion, Delta-E, WCAG contrast, Levenshtein
  scrape/
    scrape-enhanced.mjs  # 3-phase scraper orchestrator
    branding-v2.mjs      # Firecrawl branding extraction + AI enrichment
    logo-extract.mjs     # 4-level logo extraction fallback
    logo-vision.mjs      # Claude Vision logo identification
  fixtures/
    sample-leads.json    # 1 sample lead (Playwright-captured, UUID placeholders)
  provision/
    provision-tenant.mjs # Per-target provisioning sequence
    seed-sample-leads.mjs # Fixture seeder (reads sample-leads.json, inserts per tenant)
    proxy-fragment.mjs   # Write proxy.ts fragment (parallel-safe)
    merge-proxy.mjs      # Merge all proxy fragments into proxy.ts
    voice-agent.mjs      # ElevenLabs agent creation (Dominate tier stub)
  qa/                    # See docs/qa-modules.md
  schemas/               # JSON schemas for structured Claude CLI output
  tests/                 # See Testing section in CLAUDE.md
  results/               # Per-run output (gitignored)
```

## Scraping Pipeline (3-Phase)

**Phase 1: Branding v2** — Firecrawl structured extraction (colours, fonts, logos, personality)
**Phase 2: 7-stage scrape** — `scripts/onboarding/scrape.mjs` subprocess (business info, content, images, testimonials, portfolio)
**Phase 3: Logo extraction** — 4-level fallback (branding v2 → Playwright DOM → Claude Vision → favicon)
**Phase 4: Social links** — Playwright 9-platform detection (Facebook, Instagram, X, LinkedIn, YouTube, TikTok, Houzz, Pinterest, Google Maps)

Merge: Branding v2 colours override hex-counted colours. Logo extraction overrides scraped logo_url. Output: `scraped.json`.

## Provisioning Sequence

1. **Image upload** — Download + upload to Supabase Storage `tenant-assets/{site-id}/`
2. **Fallback generation** — Gemini `gemini-3.1-flash-image-preview` for missing hero/about/OG images
3. **DB seeding** — `admin_settings` (business_info, branding, company_profile, plan, quote_assistance) + `tenants` table
4. **Proxy fragment** — Parallel-safe file to `results/{date}/proxy-fragments/{site-id}.json`
5. **Sample leads** — Fixture seeder inserts 1 sample lead (Margaret Wilson, bathroom). Idempotent.
6. **Voice agent** — ElevenLabs duplication stub (Dominate tier only)
7. **Turso update** — `bespoke_status` → 'generating'/'complete'/'failed', `bespoke_score` from QA

## Quality Gates (Pre-Provision)

| Gate | Logic | Fallback |
|------|-------|----------|
| Hero | ≥10 chars, <100 chars, not generic ("Welcome", "Home"), not business-name-only | "See Your Renovation Before It Begins" |
| Testimonials | Author >2 chars, quote >20 chars, min 2 valid | Hide testimonials section |
| Portfolio | Valid image URL + non-empty title | "Portfolio being updated" message |
| Services | Name >3 chars, description >10 chars, no placeholders | Hide services section |

Additional filters: verifiable badge filter (15 keywords), logo URL keyword filter (27 non-logo terms), N/A sanitization.

## Output Structure

```
results/{date}/{site-id}/
  scraped.json              # Merged scrape data
  provisioned.json          # Post-image-upload state
  branding-v2.json          # Firecrawl branding extraction
  page-completeness.json    # Per-page data verification
  data-gap-resolution.json  # Auto-fix attempts
  content-integrity.json    # 12-check suite results
  live-site-audit.json      # 8 Playwright check results
  original-vs-demo.json     # 7-field comparison
  visual-qa.json            # Claude Vision scores
  pdf-branding-check.json   # PDF branding data
  email-branding-check.json # Email branding data + source scan
  audit-report.md           # Human-readable summary
  go-live-readiness.json    # Structured verdict (READY/REVIEW/NOT READY)
  auto-fixes.json           # Applied auto-fixes
  screenshots/              # Desktop + mobile per page
results/{date}/proxy-fragments/   # Parallel-safe proxy.ts fragments
results/{date}/batch-summary.json # Batch run summary
```
