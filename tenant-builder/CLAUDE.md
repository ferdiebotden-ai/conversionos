# ConversionOS Tenant Builder

Autonomous pipeline that discovers Ontario renovation contractors, scrapes their websites, provisions branded ConversionOS demo tenants, runs 9-module QA, and creates outreach email drafts. Two build modes: **template** (pick from 50 standard sections) and **bespoke** (Opus architect + Codex-generated custom React sections matching the original site's visual DNA).

**At session start:** Read `docs/learned-patterns.md` — 30+ accumulated patterns covering scraping, provisioning, QA, and bespoke builds.

## Critical: Deploy Repo Location

The NorBot-Systems monorepo gitignores `products/*/`. The **actual Vercel-connected git repo** is:

```
~/norbot-ops/products/demo/     # GitHub: ferdiebotden-ai/conversionos.git
```

NOT `~/Norbot-Systems/products/conversionos/`. Push to `main` in the deploy repo triggers Vercel auto-build. When running `orchestrate.mjs` with `--skip-git`, you must manually sync files to the deploy repo and push.

## Quick Start

```bash
cd ~/norbot-ops/products/demo

# Template build (standard sections)
node tenant-builder/orchestrate.mjs --url https://example.com --site-id example --tier accelerate

# Bespoke build (custom sections matching original site)
node tenant-builder/orchestrate.mjs --url https://example.com --site-id example --tier accelerate --bespoke

# Single target from Turso CRM
node tenant-builder/orchestrate.mjs --target-id 42

# Batch from pipeline DB
node tenant-builder/orchestrate.mjs --batch --limit 10 --concurrency 4

# Discover + build new targets
node tenant-builder/orchestrate.mjs --discover --cities "London,Kitchener" --limit 5

# Audit-only (QA on existing tenant, no scrape/provision)
node tenant-builder/orchestrate.mjs --audit-only --site-id example --url https://example.norbotsystems.com --skip-git

# Nightly (batch with config defaults)
node tenant-builder/orchestrate.mjs --nightly
```

**Flags:** `--concurrency N` (default 4), `--dry-run`, `--skip-qa`, `--skip-git`, `--skip-outreach`, `--skip-sample-data`, `--skip-polish`, `--timeout-multiplier N`, `--bespoke`

## Pipeline Flow (18 Steps)

1. Select targets — Turso DB, direct URL, or Firecrawl discovery
2. ICP score — 6-criterion model (100 pts), threshold 50/70
3. Scrape — branding v2 + 7-stage scrape + 4-level logo extraction + social links + Playwright screenshots (ALL builds)
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

### Architecture (Vision-First, March 11 2026)
```
Target URL
  → scrape-enhanced.mjs (screenshots for ALL builds + HTML + CSS tokens for bespoke)
  → bespoke-architect.mjs:
      Strategy 1: GPT 5.4 vision (lib/gpt54-architect.mjs + --image + --output-schema)
      Strategy 2: Opus 4.6 text-only (lib/opus-cli.mjs, same as pre-overhaul)
      Strategy 3: Static fallback blueprint
  → build-custom-sections.mjs:
      Try: parallel multi-agent (lib/codex-multi-agent.mjs, 6 concurrent workers)
      Fallback: sequential (one Codex call per section, with --image)
      Gate: Codex review (lib/codex-review.mjs, 6 static checks + auto-fix)
  → provision-tenant.mjs --bespoke (enriched theme from CSS tokens)
  → QA with visual_similarity dimension
  → Visual diff (qa/visual-diff-codex.mjs, compare→fix→re-compare, 2 iterations)
```

### Key Files
| File | Purpose |
|------|---------|
| `bespoke-architect.mjs` | Three-strategy architect: GPT 5.4 vision → Opus text-only → static fallback |
| `build-custom-sections.mjs` | Parallel/sequential Codex build + review gate + animation mapping |
| `lib/gpt54-architect.mjs` | GPT 5.4 vision architect with --image and --output-schema |
| `lib/codex-cli.mjs` | Codex 0.114.0 wrapper (--ephemeral, --add-dir, --image, --output-schema, -o, --json) |
| `lib/codex-multi-agent.mjs` | CSV-batched parallel section generation (6 concurrent workers) |
| `lib/codex-review.mjs` | Static analysis quality gate (6 checks) + Codex auto-fix |
| `scrape/screenshot-capture.mjs` | Playwright full-page screenshots (desktop+mobile, 12 page paths) |
| `qa/visual-diff-codex.mjs` | Original vs generated screenshot comparison with auto-fix loop |
| `scrape/css-extract.mjs` | Playwright extracts computed CSS tokens from live site |
| `templates/integration-spec.md` | Cheat sheet (~85 lines) injected into Codex prompts |
| `schemas/site-blueprint-v2.zod.mjs` | Zod schema for SiteBlueprint v2 |
| `schemas/site-blueprint-v2-jsonschema.json` | JSON Schema for Codex --output-schema |

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

| Agent | Model | Role | Cost/Build |
|-------|-------|------|------------|
| **Opus** (you) | Opus 4.6 | Orchestrator — delegates, handles escalations | ~$0.15 |
| **build-worker** | Sonnet 4.6 | Autonomous builder — runs pipeline, QA, fixes | ~$0.80 |
| **qa-validator** | Haiku 4.5 | Data validation — 15 anti-pattern checks via Supabase curl | ~$0.01 |
| **pipeline-scout** | Haiku 4.5 | Pre-screening, ICP scoring, discovery | ~$0.05 |
| **qa-monitor** | Haiku 4.5 | Heartbeat for batch Agent Teams | ~$0.02 |
| **image-polisher** | Sonnet 4.6 | Hero image quality audit + Gemini generation | ~$0.04 |

**Skills:** `tenant-qa-knowledge` (fix playbook), `build-tenant` (orchestrator), `maintain-pipeline` (pipeline depth)

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

| Topic | File |
|-------|------|
| Pipeline module structure | `docs/pipeline-architecture.md` |
| All 9 QA modules | `docs/qa-modules.md` |
| ICP scoring dimensions | `docs/icp-scoring.md` |
| Sample lead fixtures | `docs/sample-data.md` |
| Outreach integration | `docs/outreach-integration.md` |
| Data shape interfaces | `SHARED_INTERFACES.md` |
| Accumulated build learnings | `docs/learned-patterns.md` |
| Bespoke pipeline handoff | `docs/bespoke-handoff.md` |
| Session handoff (Mar 11) | `docs/session-handoff-2026-03-11.md` |
| Outreach rules (CASL, template) | `../scripts/outreach/README.md` |
| Post-QA polish queue | `../codex-polish/README.md` |

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

- **DO NOT use Agent Teams for batch builds.** Builds are long-running single processes — workers go idle. Use `orchestrate.mjs --concurrency 4` instead.
- **Delegate to Haiku subagents** for: pipeline status checks, reading QA result files, Supabase data validation, pre-screening targets.
- **Opus for code changes only.** Modifying pipeline .mjs files, novel issues, architecture decisions.
- **Codex --image causes timeouts.** Even with 0.114.0, the --image flag with multi-section prompts takes 10+ min. All builds use text-only Codex prompts. CSS tokens + integration spec provide sufficient context.
- **Vision architect: limit to 2 screenshots.** Homepage desktop + mobile only. Inner page screenshots cause 300s timeouts. Falls back to Opus text-only (360s timeout) then static blueprint.
- **Static fallback blueprint is data-aware.** Checks scraped data for testimonials (2+), process_steps, why_choose_us and adds corresponding sections. Generates 5-8 sections vs the basic 5.
- **Codex explores CLAUDE.md before writing.** Prepend `"IMPORTANT: Create the file IMMEDIATELY. Do NOT read other project files."` to the prompt.
- **Multi-agent parallel build requires `~/.codex/config.toml` with `multi_agent = true`.** Falls back to sequential if multi-agent fails.
- **Codex review quality gate catches 6 issue types:** hardcoded data, snake_case without dual-lookup, missing animations, missing image fallbacks, missing 'use client', bad imports. Auto-fixes via Codex, max 2 cycles.
- **Never set `layout_flags.custom_footer`.** Custom footer sections only render on homepage via SectionRenderer. Setting the flag hides the standard footer on inner pages, leaving them footerless. Always let the standard footer render on all pages.
- **OKLCH in inline styles is invalid.** CSS vars store full `oklch()` values. Never use `oklch(var(--primary) / 0.9)` in style attrs — it double-nests. Use Tailwind: `bg-primary/90`, `from-primary/80`.

## Self-Improving Documentation

After any tenant-builder change:
1. Update this CLAUDE.md
2. Update topic files in `docs/` if affected
3. Update `SHARED_INTERFACES.md` if data shapes changed
4. Update `~/.claude/projects/-Users-norbot-Norbot-Systems/memory/MEMORY.md`

## Current Deployed Bespoke Tenants (Mar 11, 2026)

| Site ID | Sections | Status | Known Issues |
|---------|----------|--------|-------------|
| md-construction | 5 custom | NOT READY | Built with static fallback (architect timeout). Double footer on homepage. 0 testimonials scraped. |
| westmount-craftsmen | 13 custom | REVIEW | Double nav, about-split section not rendering, gallery/testimonial empty data |

### Live Build Test Results (Session 9 — Mar 11, 2026)
MD Construction rebuilt from scratch with the vision-first pipeline. See `results/2026-03-11/md-construction-improvement-log.md` for comprehensive analysis including:
- 14 prioritized issues (P0-P3)
- Full build timeline (28 min total, 16 min wasted on architect timeouts)
- Section quality review (7.5/10)
- QA module results (7/8 live audit pass, 60% match score)
- 6 fixes applied during monitoring (refinement loop crash, footer rendering, OKLCH CSS, integration spec, architect timeouts, fallback enrichment)
