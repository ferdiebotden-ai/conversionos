# ConversionOS Tenant Builder

Autonomous pipeline that discovers Ontario renovation contractors, scrapes their websites, provisions branded ConversionOS demo tenants, runs 9-module QA, and creates outreach email drafts. Two build modes: **template** (pick from 50 standard sections) and **bespoke** (Opus architect + Codex-generated custom React sections matching the original site's visual DNA).

**At session start:** Read `docs/learned-patterns.md` (30+ accumulated patterns) AND `docs/improvement-log.md` (systemic issues from manual fixes — the pipeline's feedback loop).

## Operating Modes

This directory supports two Claude Code modes depending on the user's intent:

### Builder Mode (Default)
When the user says "build", "run the pipeline", "batch", etc. — you ARE the builder.
Run `orchestrate.mjs`, handle scraping, provisioning, QA, and outreach. Follow the 18-step pipeline below.

### Mission Director Mode
When the user says "monitor", "check status", "review builds", "QA check", etc. — you are the DIRECTOR.
- Check build status: read `results/{date}/batch-summary.json` and per-site `go-live-readiness.json`
- Review QA scores: read `visual-qa.json`, `audit-report.md` for each site
- Use Haiku subagents as heartbeats to poll running builds (avoid blocking your context)
- Escalate failures: if >50% of builds fail, stop the batch and report
- After QA: route to `../../warm-leads-polish/` for final polish (use `--auto-polish` flag or run manually)
- Present structured summaries to Ferdie with scores, verdicts, and recommendations

### Tenant Fix Mode
When the user says "fix", "update", "improve" a specific tenant — you fix the issue AND think systemically.

**After every fix, ask yourself:**
1. **Is this a one-off or systemic?** If the same issue could affect other tenants, log it.
2. **Where in the pipeline did this break?** Trace the root cause to a specific scraping, provisioning, or QA step.
3. **What would have prevented this?** Think about what check or improvement in the pipeline would have caught it.

**Then log it:** Append to `docs/improvement-log.md` following the format there (symptom, root cause, impact, suggested fix, risk). Do NOT implement pipeline fixes during a fix session — only document them.

**Improvement log:** `docs/improvement-log.md` — read this at session start alongside `docs/learned-patterns.md`. The log captures systemic patterns found during manual fixes. Ferdie periodically reviews it and triggers implementation of the highest-impact, lowest-risk items.

### Polish Loop Integration
After Step 17 (QA → queue handoff), builds flow to the polish loop:
- **Automatic:** `orchestrate.mjs --auto-polish` runs the polish orchestrator after queue handoff
- **Manual:** `node ../../warm-leads-polish/polish-orchestrator.mjs --site-id {id}`
- **Verdicts:** SHIP (outreach proceeds) | POLISH (needs more work) | REJECT (manual review)

## Critical: Deploy Repo Location

The NorBot-Systems monorepo gitignores `products/*/`. The **actual Vercel-connected git repo** is:

```
~/norbot-ops/products/demo/     # GitHub: ferdiebotden-ai/conversionos.git
```

NOT `~/Norbot-Systems/products/conversionos/`. Push to `main` in the deploy repo triggers Vercel auto-build. When running `orchestrate.mjs` with `--skip-git`, you must manually sync files to the deploy repo and push.

## Quick Start

```bash
cd ~/norbot-ops/products/demo
node tenant-builder/orchestrate.mjs --target-id 42                    # Single target (Turso CRM)
node tenant-builder/orchestrate.mjs --url https://ex.com --site-id ex # From URL
node tenant-builder/orchestrate.mjs --url https://ex.com --site-id ex --bespoke  # Bespoke build
node tenant-builder/orchestrate.mjs --batch --limit 10 --concurrency 4           # Batch
node tenant-builder/orchestrate.mjs --discover --cities "London,Kitchener"       # Discover
node tenant-builder/orchestrate.mjs --audit-only --site-id ex --url https://ex.norbotsystems.com --skip-git  # QA only
node tenant-builder/orchestrate.mjs --nightly                                    # Nightly batch
```
**Flags:** `--concurrency N`, `--dry-run`, `--skip-qa`, `--skip-git`, `--skip-outreach`, `--skip-sample-data`, `--skip-polish`, `--timeout-multiplier N`, `--bespoke`

## Pipeline Flow (18 Steps)

1. Select targets — Turso DB, direct URL, or Firecrawl discovery
2. ICP score — 6-criterion model (100 pts), threshold 50/70
3. Scrape — branding v2 + site map + 7-stage scrape + deep image scrape + CSS hero extraction + logo extraction + social links + screenshots (ALL builds)
   - 1.5. **All builds:** `map()` — Firecrawl discovers ALL site URLs (gallery, portfolio, services, about pages)
   - 2.3. **All builds:** Deep image scrape — Firecrawl markdown + scroll actions + `onlyMainContent: false` on discovered pages → extracts all `<img>` tag URLs
   - 2.4. **All builds:** CSS hero extraction — Playwright extracts `background-image` from hero sections
   - 3a. **All builds:** `scrape/screenshot-capture.mjs` — Playwright full-page screenshots (desktop+mobile, 12 page paths)
   - 3b. **Bespoke only:** `bespoke-architect.mjs` — GPT 5.4 vision architect (primary) → Opus 4.6 text-only (fallback) → static blueprint (fallback) → SiteBlueprint v2 JSON
   - 3c. **Bespoke only:** `build-custom-sections.mjs` — Codex GPT 5.4 generates per-tenant React sections (parallel or sequential) → `src/sections/custom/{siteId}/` → Codex review quality gate
4. Quality gates — testimonials (min 2), portfolio (images), services (name+desc), hero (reject generic)
5. Provision — upload images, seed Supabase (5 keys), write proxy fragment, seed sample leads
6. Merge proxy — combine fragments into proxy.ts
7. Git + deploy — commit, push, wait for Vercel. Domain routing via wildcard DNS
8. QA: Page completeness — 6 pages + footer data verification
9. QA: Data-gap resolution — auto-fix gaps (socials, N/A hours, favicon). Up to 2 attempts
10. QA: Content integrity — 12 checks + auto-fix (demo leakage, broken images, fabrication, placeholders)
11. QA: Visual QA — Claude Vision 6-dimension rubric + refinement loop (7th dimension "visual similarity" for bespoke)
12. QA: Live site audit — 8 Playwright checks (branding, nav, responsive, WCAG, SEO, images, footer, admin)
13. QA: Original vs demo — 7-field comparison (name, phone, email, services, testimonials, colour, logo)
14. QA: PDF branding — Supabase completeness for PDF generation
15. QA: Email branding — admin_settings + template source scan
16. Go-live readiness report — 7-section markdown + JSON verdict (READY / REVIEW / NOT READY)
17. Polish queue handoff — write `codex-polish/queue/pending/{site-id}.json`
18. Outreach — Gmail drafts only after polish queue item is cleared

## Bespoke Pipeline (Phase 1-3)

The bespoke pipeline generates custom React sections that visually match the original contractor's website, instead of picking from generic templates.

### Architecture (Vision-First)
Scrape (screenshots + HTML + CSS tokens) → `bespoke-architect.mjs` (3 strategies: GPT 5.4 vision → Opus text-only → static fallback → SiteBlueprint v2) → `build-custom-sections.mjs` (parallel multi-agent or sequential Codex → review gate → `src/sections/custom/{siteId}/`) → provision with enriched CSS theme → QA with `visual_similarity` dimension → visual diff (compare→fix→re-compare, 2 iterations)

### Key Bespoke Files
`bespoke-architect.mjs` (3-strategy architect) | `build-custom-sections.mjs` (Codex build + review gate) | `lib/gpt54-architect.mjs` (vision architect) | `lib/codex-cli.mjs` (Codex wrapper) | `lib/codex-multi-agent.mjs` (parallel workers) | `lib/codex-review.mjs` (6-check quality gate) | `scrape/screenshot-capture.mjs` (Playwright screenshots) | `qa/visual-diff-codex.mjs` (visual diff + auto-fix) | `scrape/css-extract.mjs` (CSS token extraction) | `templates/integration-spec.md` (Codex prompt cheat sheet) | `schemas/site-blueprint-v2.*` (Zod + JSON Schema) | `lib/gemini-cli.mjs` + `lib/model-router.mjs` (multi-model routing)

### Custom Section System
- Generated sections live in `src/sections/custom/{siteId}/` (e.g., `custom/md-construction/`)
- Each tenant gets an `index.ts` with `registerSection()` calls
- `src/sections/custom/registry.ts` auto-generated by `build-custom-sections.mjs` — imports all tenant index files
- `src/sections/register.ts` has `import './custom/registry'` at the bottom
- Section IDs follow `custom:{siteId}-{name}` pattern (e.g., `custom:md-construction-hero`)

### Known Bespoke Issue: camelCase Config Mismatch
The provisioner stores company_profile fields in **camelCase** (`heroHeadline`, `heroImageUrl`, `aboutCopy`). Codex-generated sections read **snake_case** (`hero_headline`, `hero_image_url`, `about_copy`). Custom sections must read both formats:
```tsx
const headline = str(c['hero_headline']) ?? str(c['heroHeadline']);
```
This is a systemic Codex prompt issue — the integration-spec.md should document the camelCase field names.

## Multi-Model Agent Organisation
Opus 4.6 (orchestrator) | Sonnet 4.6 (build-worker ~$0.80, image-polisher ~$0.04) | Haiku 4.5 (qa-validator ~$0.01, pipeline-scout ~$0.05, qa-monitor ~$0.02) | Gemini 3.1 Flash (image classification, $0 via CLI subscription). Model router: `lib/model-router.mjs`. Skills: `tenant-qa-knowledge`, `build-tenant`, `maintain-pipeline`.

## Getting Next Targets

```bash
node tenant-builder/discover.mjs --pipeline --limit 10
node tenant-builder/icp-score.mjs --all --limit 50
node tenant-builder/icp-score.mjs --target-id 42
```

ICP scoring: geography (15 pts), company size (15 pts), web sophistication gap (20 pts), contact completeness (15 pts). See `docs/icp-scoring.md`.

## Post-Build Review

1. Read `results/{date}/batch-summary.json` → success/fail counts
2. Read `go-live-readiness.json` → READY / REVIEW / NOT READY
3. Check `codex-polish/queue/pending/{site-id}.json` for post-QA handoff
4. Review `audit-report.md` + `visual-qa.json` for failures
5. Read screenshots to verify logos, colours, layout
6. Review email drafts after polish queue clears
7. Present structured summary to Ferdie
8. Update `docs/learned-patterns.md` if new patterns found

## Deep Reference
`docs/` — pipeline-architecture.md, qa-modules.md, icp-scoring.md, sample-data.md, outreach-integration.md, learned-patterns.md, improvement-log.md, bespoke-handoff.md | `SHARED_INTERFACES.md` — data shape interfaces | `../scripts/outreach/README.md` — outreach rules (CASL) | `../codex-polish/README.md` — post-QA polish queue

## Environment Variables

Loaded from `~/norbot-ops/products/demo/.env.local` and `~/norbot-ops/products/demo/pipeline/scripts/.env`:

| Variable | Source | Required For |
|----------|--------|-------------|
| TURSO_DATABASE_URL | pipeline .env | All (CRM database) |
| TURSO_AUTH_TOKEN | pipeline .env | All (CRM database) |
| FIRECRAWL_API_KEY | pipeline .env | Discovery, scraping |
| NEXT_PUBLIC_SUPABASE_URL | demo .env.local | Provisioning, QA |
| SUPABASE_SERVICE_ROLE_KEY | demo .env.local | Provisioning, QA |
| VERCEL_TOKEN + VERCEL_PROJECT_ID + VERCEL_TEAM_ID | pipeline .env | Domain registration + SSL |

## Testing

```bash
cd ~/norbot-ops/products/demo/tenant-builder
npm run test:unit          # 223 tests, ~400ms, no API calls
npm run test:integration   # 26 tests, ~4 min, real APIs (~$0.50/run)
npm test                   # All tests
npm run cleanup            # Remove test artifacts
```

## Key Patterns

- All files are ES modules (.mjs)
- Existing onboarding scripts called as subprocesses (`execFileSync` — not `execSync`)
- Proxy fragments enable parallel-safe proxy.ts updates
- `[PROGRESS]` and `[SUMMARY]` JSON lines for Mission Control parsing
- Claude CLI calls strip `CLAUDECODE` env var to avoid nested sessions
- CRLF fix for new .mjs files: `perl -pi -e 's/\r\n/\n/g'`
- Provenance tracking: `_provenance` field on scraped data marks AI-generated content
- Guard `parseArgs()` inside `if (import.meta.url === ...)` CLI entry block — crashes when dynamically imported otherwise

## Operational Learnings

Comprehensive operational patterns are in `docs/learned-patterns.md` — read at session start. Key rules:
- **DO NOT use Agent Teams for batch builds.** Use `orchestrate.mjs --concurrency 4` instead.
- **Delegate to Haiku subagents** for: status checks, QA results, Supabase validation, pre-screening.
- **Opus for code changes only.** Pipeline .mjs files, novel issues, architecture decisions.
- **Never set `layout_flags.custom_footer`** — hides standard footer on inner pages.
- **OKLCH in inline styles is invalid.** Use Tailwind (`bg-primary/90`) not `oklch(var(--primary) / 0.9)`.
- **Firecrawl SDK 4.16.0:** `images` format NOT valid (422), `executeJavascript` does NOT exist. Use `markdown` + `actions: [{ type: 'scroll' }]`.
- **`generateServiceImages()` removed.** Real photos or text-only. processSteps always ConversionOS standard.

## Self-Improving Documentation

After any tenant-builder change:
1. Update this CLAUDE.md
2. Update topic files in `docs/` if affected
3. Update `SHARED_INTERFACES.md` if data shapes changed
