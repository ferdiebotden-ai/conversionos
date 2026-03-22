# ConversionOS — Premium Website Rebuild Platform

NorBot Systems rebuilds contractor websites with AI underneath. Same brand, same feel — but now it captures leads, qualifies them, and generates estimates automatically. Single codebase, four pricing tiers, domain-driven multi-tenancy.

**Architecture reference:** `brain/ARCHITECTURE.md` — build categories, deploy paths, agent roles, memory layers.

**Business model (March 2026 pivot):** "We rebuild your website" — not "adopt our platform." The autonomous build pipeline IS the delivery mechanism. Each demo is a production-grade website ready for DNS cutover.

**Strategy documents:** Master Brief, Pricing Architecture, Delivery Playbook, Founder Notes, SOW Template, Investor Memo (in ~/Norbot-Systems/docs/).

## Living Product Reference — IMPORTANT
After ANY session where you implement features, fix bugs, modify AI prompts, change database schema, update API routes, or alter handoff mechanisms: update `docs/PRODUCT_REFERENCE.md`. Use the `/update-product-reference` skill.

## Stack
Next.js 16.1.6 (App Router) | React 19 | TypeScript 5 (strict) | Supabase (PostgreSQL) | Vercel AI SDK v6 | Tailwind v4 | shadcn/ui | Vitest | Playwright

## AI Stack
- **Chat/Vision:** GPT-5.4 | **Image gen:** Gemini 3.1 Flash Image (`src/lib/ai/gemini.ts`) | **Build-time:** Gemini CLI (`tenant-builder/lib/gemini-cli.mjs`, $0 marginal)
- **Quote/Email:** GPT-4o-mini | **Voice:** ElevenLabs Emma (web all tiers, phone $499/mo add-on) | **Model routing:** `tenant-builder/lib/model-router.mjs`
- **Validation:** Zod schemas on all AI outputs

## Commands
```bash
npm run dev          # localhost:3000
npm run build        # typecheck + build (run before commits)
npm run lint         # eslint
npm run test         # vitest unit tests
npm run test:e2e     # playwright E2E tests
```

## Autonomous Build Pipeline (Core Business)

The tenant builder discovers contractors, builds production-grade demos, runs QA, and creates outreach emails. Primary revenue-generating workflow. Full 18-step breakdown in `tenant-builder/CLAUDE.md`.

### Quick Start
```bash
node tenant-builder/orchestrate.mjs --target-id 42                              # Single target
node tenant-builder/orchestrate.mjs --url https://example.com --site-id ex      # From URL
node tenant-builder/orchestrate.mjs --batch --limit 10 --concurrency 4          # Batch build
node tenant-builder/orchestrate.mjs --discover --cities "London,Kitchener"      # Discover
node tenant-builder/orchestrate.mjs --audit-only --site-id ex --url https://ex.norbotsystems.com  # QA only
node tenant-builder/orchestrate.mjs --nightly                                   # Nightly batch
```
**Flags:** `--dry-run`, `--skip-qa`, `--skip-git`, `--skip-outreach`, `--skip-polish`, `--concurrency N`, `--timeout-multiplier N`, `--bespoke`

### QA Verdict Flow
- Score >=4.0 → **READY** → outreach fires automatically
- Score 3.5-4.0 → **REVIEW** → queued for polish, outreach held
- Score <3.5 → **NOT READY** → queued for manual review, outreach held

### Key Pipeline Files
| File | Purpose |
|------|---------|
| `tenant-builder/orchestrate.mjs` | Master orchestrator (18 steps) |
| `tenant-builder/CLAUDE.md` | Builder agent instructions |
| `tenant-builder/docs/learned-patterns.md` | 30+ accumulated patterns and edge cases |
| `tenant-builder/docs/improvement-log.md` | Systemic issues from manual fixes |
| `tenant-builder/lib/quality-gates.mjs` | Pre-provision data validation (6 gates) |
| `tenant-builder/provision/provision-tenant.mjs` | Image upload + DB provisioning |
| `tenant-builder/qa/audit-report.mjs` | Go-live readiness report generator |

## Adding a New Tenant

**Autonomous (primary):** `node tenant-builder/orchestrate.mjs --target-id 42`
**Mission Control:** Click "Build Demo" on a candidate card in the Pipeline page (Claude Code Bridge WebSocket).
**CLI/Telegram:** `/onboard-tenant {site-id} {url} {tier}` or `node scripts/onboarding/onboard.mjs --url {url} --site-id {site-id} --domain {site-id}.norbotsystems.com --tier {tier}`
**Manual fallback:** Seed `admin_settings` (5 keys) + `proxy.ts` mapping + `tenants` table + `add-domain.mjs` + push to `main`.

### What's Manual (Ferdie Handles)
DNS cutover to client's real domain, Black Label instances (built as Dominate + personal review), post-sale onboarding/billing/contracts, custom domain SSL.

## Outreach Pipeline

```bash
node scripts/outreach/outreach-pipeline.mjs --target-id 42 --dry-run   # Preview
node scripts/outreach/outreach-pipeline.mjs --target-id 42             # Create draft
node scripts/outreach/outreach-pipeline.mjs                            # All ready targets
node scripts/outreach/rescore-all.mjs --report                         # ICP re-scoring
```
- **Rules:** `.claude/rules/outreach.md` (CASL, template, banned terms) | **Tests:** 56 tests in `scripts/outreach/tests/`
- **Status flow:** `demo_built` → `draft_ready` → `email_1_sent` | **Send monitor:** LaunchAgent every 15 min (6am-9pm weekdays)

## Pricing
Elevate $4,500+$299/mo | Accelerate $12,000+$699/mo | Dominate $20,000+$1,799/mo | Black Label $40,000+$4,999/mo. Voice add-on: $499/mo. Guarantee: 75% setup refund within 14 days. Full feature matrix in `docs/PRODUCT_REFERENCE.md`.

## Entitlements System
- `src/lib/entitlements.ts` — `canAccess(tier, feature)` pure function, `PlanTier` and `Feature` types
- `src/lib/entitlements.server.ts` — `getTier()` reads `plan` from `admin_settings` (defaults to `'elevate'`)
- `src/components/tier-provider.tsx` — `TierProvider` context + `useTier()` hook for client components
- Gated at: admin layout, sidebar nav, API routes (voice, quotes, invoices, drawings), receptionist widget

## Multi-Tenancy
Single Vercel project + proxy routing — `src/proxy.ts` resolves hostname → `x-site-id` header.
- All 33 API routes use `getSiteIdAsync()` (NOT `getSiteId()` which is env-var-only for non-API contexts)
- `withSiteId(data, siteId?)` injects `site_id` — pass explicit `siteId` in API routes
- `admin_settings` stores per-tenant config. Never hardcode tenant branding. Dev: `?__site_id=` override.

## Section Registry (52 components)
- `src/sections/register.ts` — 52 sections across 11 categories | `src/components/section-renderer.tsx` — renders by ID
- Default homepage: Hero → Services → Projects → How It Works → About → Testimonials → Trust → Contact → CTA
- `hero:visualizer-teardown` supports `heroImageUrl` as background image
- Scroll-spy navigation via IntersectionObserver + smooth scroll (`src/components/header.tsx`)

## Voice Agent (ElevenLabs Emma)
Single persona per tenant, context-aware via PageContext. Web on all tiers (`voice_web` entitlement), phone $499/mo add-on (bundled with Dominate/Black Label). Elevate has mandatory pricing deflection. Dynamic prompts: `buildVoiceSystemPrompt(context)`. Single env var: `ELEVENLABS_AGENT_EMMA`.

## Quote Assistance System
Per-tenant `quote_assistance` key in `admin_settings`. Three modes: `none`, `range`, `estimate`. Elevate: always `none`. Accelerate/Dominate default: `{ mode: 'range', rangeBand: 10000 }`.

## Design Studio (Unified Flow)
Single-page journey at `/visualizer`: upload → generate → refine → lead capture. Design Studio Chat + inline lead capture form. SSE streaming: `/api/ai/visualize/stream` (heartbeat 15s, timeout 110s server / 150s client).

## Key Directories
```
src/app/              -- 50+ routes (public pages, admin dashboard, 30+ API endpoints)
src/components/       -- React components (admin, chat, visualizer, voice, ui)
src/sections/         -- 52 section components (hero, services, about, gallery, CTA, etc.)
src/lib/              -- Shared utilities (entitlements, branding, AI, DB, copy)
src/proxy.ts          -- Domain -> tenant routing
tenant-builder/       -- Autonomous build pipeline (orchestrator, scrapers, QA, provision)
scripts/outreach/     -- Email generation, Gmail drafts, send monitor, calendar
scripts/onboarding/   -- Legacy onboarding scripts (superseded by tenant-builder for most flows)
```

## Deployment
Single Vercel project (`conversionos`) with proxy routing. Wildcard CNAME `*.norbotsystems.com → cname.vercel-dns.com`. Push to `main` → single build → all tenants updated. Never create per-tenant branches or separate Vercel projects.

## Supabase
Demo project `ktpfyangnmpwufghgasx` — shared by all demo tenants, isolated by `site_id`. Production clients get their own project. Key tables: `admin_settings`, `leads`, `quotes`, `quote_items`, `invoices`, `drawings`, `tenants`.

## Rules
- All API routes: `getSiteIdAsync()` for tenant isolation, `export const dynamic = 'force-dynamic'`
- Features gated with `canAccess(tier, feature)` — never expose to all tiers by default
- Never check `tier === 'dominate'` directly — use `canAccess()`. Never hardcode tenant values. Never create per-tenant branches.
- Validate all AI outputs with Zod. Canadian spelling (colour, favourite, centre). CASL mandatory.

## Quality Standard
Each demo must feel hand-built. Match brand aesthetic (colours, tone, visual style). Use exact testimonial quotes (never paraphrase). Reflect actual services, certifications, unique selling points. AI persona prompts reference real staff names, services, location.

## Gotchas
- Write tool creates CRLF on macOS — fix: `perl -pi -e 's/\r\n/\n/g'`
- Vercel env vars: use API (curl), NOT `echo | vercel env add` (adds newline)
- Primary colour uses OKLCH: `--primary: oklch(...)` in `globals.css`
- Proxy env var fallback is dev-only — production unknown hosts return 404
- Firecrawl SDK 4.16.0: `images` format NOT valid (422 error), use `markdown` + parse `<img>`. `executeJavascript` does NOT exist — use `actions: [{ type: 'scroll' }]`
- `generateServiceImages()` removed — real photos or text-only. processSteps always ConversionOS standard (never scraped)
- `(supabase as any).from('new_table')` for tables not in generated types
- Next.js 16 dynamic route params: bracket notation `params?.['token']`
- Vercel AI SDK v6: `maxOutputTokens` not `maxTokens` in `generateObject()`
- Image gen model source of truth: `src/lib/ai/gemini.ts` line 19 | Vision model: `src/lib/ai/config.ts`

## Mobile & Warm-Lead Propagation
ALL sections must be mobile-responsive. Test at 375px (iPhone SE), 768px (iPad), 1024px (laptop). Use `/mobile-audit {site-name}`.
Platform changes affect all 54+ tenants: change `src/` or `packages/` → `npm run build` → `scripts/sync-deploy.sh` → `/fix-warm-lead {name}`.
Warm-lead builds: `../../products/warm-leads/{client-name}/` (standalone Next.js apps with shared packages).

## Business Constants
HST: 13% | Deposit: 15% | Contingency: 10% | Estimate Variance: +/-15%
