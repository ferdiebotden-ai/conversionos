# ConversionOS — Premium Website Rebuild Platform

NorBot Systems rebuilds contractor websites with AI underneath. Same brand, same feel — but now it captures leads, qualifies them, and generates estimates automatically. Single codebase, four pricing tiers, domain-driven multi-tenancy.

**Architecture reference:** `brain/ARCHITECTURE.md` — build categories, deploy paths, agent roles, memory layers.

**Business model (March 2026 pivot):** "We rebuild your website" — not "adopt our platform." The autonomous build pipeline IS the delivery mechanism. Each demo is a production-grade website ready for DNS cutover. Post-sale onboarding (DNS cutover, custom domains, Black Label) is handled manually by Ferdie.

**Strategy documents:** Master Brief, Pricing Architecture, Delivery Playbook, Founder Notes, SOW Template, Investor Memo (in ~/Norbot-Systems/docs/ — titles stable, paths may move).

## Living Product Reference — IMPORTANT
After ANY session where you implement features, fix bugs, modify AI prompts, change database schema, update API routes, or alter handoff mechanisms: update `docs/PRODUCT_REFERENCE.md` to reflect the current state of the product. This is not optional. Use the `/update-product-reference` skill for detailed instructions.

## Stack
Next.js 16.1.6 (App Router) | React 19 | TypeScript 5 (strict) | Supabase (PostgreSQL) | Vercel AI SDK v6 | Tailwind v4 | shadcn/ui | Vitest | Playwright

## AI Stack
- **Chat/Vision:** OpenAI GPT-5.4
- **Image generation:** Google Gemini 3.1 Flash Image (Nano Banana 2) — `src/lib/ai/gemini.ts`
- **Build-time AI:** Gemini CLI (`tenant-builder/lib/gemini-cli.mjs`) for image classification, content audit ($0 marginal via subscription)
- **Quote/Email generation:** GPT-4o-mini (cost-efficient structured output)
- **Voice agent:** ElevenLabs (single Emma persona, context-aware) — web on all tiers, phone as $499/mo add-on
- **Model routing:** `tenant-builder/lib/model-router.mjs` — routes tasks to optimal model (CLI subscriptions for build-time, API for runtime)
- **Validation:** Zod schemas on all AI outputs

## Commands
```bash
npm run dev          # localhost:3000
npm run build        # typecheck + build (run before commits)
npm run lint         # eslint
npm run test         # vitest unit tests
npm run test:e2e     # playwright E2E tests
```

---

## Autonomous Build Pipeline (Core Business)

The tenant builder autonomously discovers contractors, builds production-grade demos, runs QA, and creates outreach emails. This is the primary revenue-generating workflow.

### Quick Start
```bash
# Build a single target by Turso ID
node tenant-builder/orchestrate.mjs --target-id 42

# Build from a URL (bypass Turso)
node tenant-builder/orchestrate.mjs --url https://example.com --site-id example --tier accelerate

# Batch build (top ICP-scored targets)
node tenant-builder/orchestrate.mjs --batch --limit 10 --concurrency 4

# Discover new targets in cities
node tenant-builder/orchestrate.mjs --discover --cities "London,Kitchener" --limit 5

# QA audit only (existing tenant)
node tenant-builder/orchestrate.mjs --audit-only --site-id example --url https://example.norbotsystems.com

# Nightly batch (default: 10 targets, concurrency 4)
node tenant-builder/orchestrate.mjs --nightly
```

**Flags:** `--dry-run`, `--skip-qa`, `--skip-git`, `--skip-outreach`, `--skip-polish`, `--concurrency N`, `--timeout-multiplier N`

### Pipeline Steps (18)
1. **Select targets** — Turso DB (ICP-scored), direct URL, or Firecrawl discovery
2. **ICP scoring** — 6-criterion model (geography, company size, web sophistication, contact completeness)
3. **Scrape** — Firecrawl SDK 4.16.0: branding v2 + `map()` (site URL discovery) + deep image scrape (markdown + scroll actions + `onlyMainContent: false`) + CSS hero extraction (Playwright `background-image`) + logo extraction + social links + screenshots
4. **Quality gates** — Pre-provision validation (testimonials, about copy, portfolio titles, brand detection)
5. **Upload images** — Supabase Storage, generate fallback hero/about/OG via Gemini if scrape failed. `generateServiceImages()` removed — real photos or text-only cards only
6. **Provision DB** — `admin_settings` (5 keys), `tenants`, `assembly_templates`, proxy.ts fragment
7. **Seed sample data** — Margaret Wilson sample lead with AI visualization
8. **Register domain** — Vercel API + SSL cert for `{slug}.norbotsystems.com`
9. **Deploy** — Git commit + push + wait for Vercel build
10. **Page completeness** — 6 pages + footer checked (hero, nav, services, testimonials, portfolio)
11. **Data gap resolution** — Auto-fix broken URLs, normalize hours, add favicon (up to 2 attempts)
12. **Content integrity** — 12 checks (demo leakage, broken images, placeholder text, fabrication)
13. **Screenshots** — Desktop + mobile + original website
14. **Live site audit** — 8 Playwright checks (branding, nav, responsive, WCAG, SEO, images, footer)
15. **Original vs demo** — 7-field comparison (name, phone, email, services, testimonials, colour, logo)
16. **Visual QA** — Claude Vision 6-dimension rubric, auto-refine up to 3x if score <3.5
17. **Audit report** — Go-live readiness: READY / REVIEW / NOT READY verdict
18. **Outreach** — Generate email, create Gmail draft (auto-gated behind QA + polish queue)

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
| `tenant-builder/lib/quality-gates.mjs` | Pre-provision data validation (6 gates) |
| `tenant-builder/provision/provision-tenant.mjs` | Image upload + DB provisioning |
| `tenant-builder/qa/audit-report.mjs` | Go-live readiness report generator |
| `tenant-builder/scripts/fix-tenant-images.mjs` | Batch re-scrape + replace AI images with real photos |
| `tenant-builder/lib/gemini-cli.mjs` | Gemini CLI wrapper for build-time AI tasks ($0 marginal) |
| `tenant-builder/lib/model-router.mjs` | Multi-model task routing (CLI vs API) |

---

## Outreach Pipeline

Automated last-mile outreach after demos pass QA. Fills Ferdie's exact email template, creates Gmail drafts, monitors for sends, books follow-up calls.

```bash
# Preview email (dry run)
node scripts/outreach/outreach-pipeline.mjs --target-id 42 --dry-run

# Create Gmail draft
node scripts/outreach/outreach-pipeline.mjs --target-id 42

# All ready targets
node scripts/outreach/outreach-pipeline.mjs

# ICP re-scoring report
node scripts/outreach/rescore-all.mjs --report
```

- **Scripts:** `scripts/outreach/` — 8 scripts + tests
- **Rules:** `.claude/rules/outreach.md` — CASL compliance, template integrity, call slots, banned terms
- **Tests:** `node scripts/outreach/tests/test-email-template.mjs` (56 tests)
- **Send monitor:** LaunchAgent `com.norbot.send-monitor` (every 15 min, 6am-9pm weekdays)
- **Status flow:** `demo_built` → `draft_ready` → `email_1_sent`
- **Integration:** `orchestrate.mjs` Step 18 auto-runs outreach after QA. Use `--skip-outreach` to skip.

---

## Pricing Tiers & Feature Map

| Feature | Elevate ($299/mo) | Accelerate ($699/mo) | Dominate ($1,799/mo) | Black Label ($4,999/mo) |
|---------|:-:|:-:|:-:|:-:|
| Branded website (all public pages) | Yes | Yes | Yes | Yes |
| AI Visualizer | Yes | Yes | Yes | Yes |
| Lead capture + email notify | Yes | Yes | Yes | Yes |
| Emma text chat widget | Yes | Yes | Yes | Yes |
| Admin Dashboard | -- | Yes | Yes | Yes |
| AI Quote Engine | -- | Yes | Yes | Yes |
| PDF quotes + email sending | -- | Yes | Yes | Yes |
| Invoicing + payment tracking | -- | Yes | Yes | Yes |
| Drawings management | -- | Yes | Yes | Yes |
| Voice agents (web) | Yes | Yes | Yes | Yes |
| Voice agents (phone) | Add-on | Add-on | Yes | Yes |
| Custom integrations | -- | -- | Yes | Yes |
| Location exclusivity | -- | -- | Yes | Yes |
| Custom workflows | -- | -- | -- | Yes |
| Bespoke automation | -- | -- | -- | Yes |

**Setup fees:** Elevate $4,500 | Accelerate $12,000 | Dominate $20,000 | Black Label $40,000
**Voice add-on:** $499/mo on any tier. **Guarantee:** 75% of setup fee refunded within 14 days.

## Entitlements System
- **`src/lib/entitlements.ts`** — `canAccess(tier, feature)` pure function, `PlanTier` and `Feature` types
- **`src/lib/entitlements.server.ts`** — `getTier()` reads `plan` key from `admin_settings` (defaults to `'elevate'`)
- **`src/components/tier-provider.tsx`** — `TierProvider` context + `useTier()` hook for client components
- Entitlements gated at: admin layout, sidebar nav, API routes (voice, quotes, invoices, drawings), receptionist widget

## Multi-Tenancy
**Single Vercel project + proxy routing** — `src/proxy.ts` resolves tenant from hostname → sets `x-site-id` header

- **All 33 API route files use `getSiteIdAsync()`** — reads proxy `x-site-id` header at runtime (not build-time env var)
- `getSiteId()` (synchronous, env var only) — retained for non-API contexts (scripts, build-time code)
- `withSiteId(data, siteId?)` helper injects `site_id` into data objects — pass explicit `siteId` in API routes
- All DB queries MUST filter by `site_id` — no exceptions
- `admin_settings` table stores per-tenant: branding, pricing, plan tier
- Never hardcode tenant branding — always read from `admin_settings`
- Proxy env var fallback is **dev-only** — production unknown hosts get 404
- Dev: `?__site_id=` query param override (dev mode only)

## Section Registry (52 components)
- **`src/sections/register.ts`** — 52 section components across 11 categories (hero, services, about, gallery, testimonials, CTA, trust, contact, footer, navigation, misc)
- **`src/components/section-renderer.tsx`** — `SectionRenderer` client component renders sections by ID
- **`src/lib/page-layout.ts`** — `getPageLayout('homepage')` reads from `admin_settings`, falls back to `DEFAULT_HOMEPAGE_LAYOUT`
- **Default homepage flow:** Hero → Services → Projects → How It Works → About → Testimonials → Trust → Contact → CTA
- Homepage renders dynamically via SectionRenderer. Inner pages (about, contact, services, projects) are still hardcoded components.
- **`hero:visualizer-teardown`** — supports `heroImageUrl` as background image (real contractor photo behind the frame scrubber animation)
- **Scroll-spy navigation** — IntersectionObserver on homepage sections, smooth scroll + active nav highlight (`src/components/header.tsx`)

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
- **Single Vercel project** (`conversionos`) with proxy-based domain routing — all tenants
- **DNS:** Namecheap → Cloudflare nameservers. Wildcard CNAME `*.norbotsystems.com → cname.vercel-dns.com`. No per-tenant DNS needed.
- **SSL:** `add-domain.mjs` registers subdomain with Vercel + issues SSL cert
- Push to `main` → single build → all tenants updated
- Never create per-tenant branches or separate Vercel projects

## Supabase
- **Demo project:** `ktpfyangnmpwufghgasx` — shared by all demo tenants, isolated by `site_id`
- **Production clients** get their own Supabase project (separate data, separate billing)
- Key tables: `admin_settings`, `leads`, `quotes`, `quote_items`, `invoices`, `drawings`, `tenants`

## Current Tenants (36+)
All tenants live on `{slug}.norbotsystems.com`. See `src/proxy.ts` DOMAIN_TO_SITE for full list. Key tenants:
- `conversionos` — NorBot-branded base platform (fixture source)
- `demo` — Ferdie's testing sandbox
- `red-white-reno` — First bespoke tenant
- 9+ additional bespoke tenants built by the autonomous pipeline

## Sample Data
Every new tenant is seeded with 1 sample lead from `tenant-builder/fixtures/sample-leads.json`:
- **Margaret Wilson** — bathroom, `new` status, AI visualizer flow (4 concepts + photo analysis)

## Rules
- All API route DB queries must use `getSiteIdAsync()` for tenant isolation (NOT `getSiteId()`)
- All new features must be gated with `canAccess(tier, feature)` — never expose to all tiers by default
- Use `useTier()` in client components, `getTier()` in server components/API routes
- Never check `tier === 'dominate'` directly — always use `canAccess()`
- Never hardcode tenant-specific values
- Never create per-tenant branches
- Validate all AI outputs with Zod before rendering or storing

## Design Studio (Unified Flow)
- **Single-page journey:** `/visualizer` — upload → generate → refine → lead capture. `/estimate` redirects here.
- **Design Studio Chat:** `src/components/visualizer/design-studio-chat.tsx` — inline Emma chat with quick action buttons
- **Lead capture form:** `src/components/visualizer/lead-capture-form.tsx` — inline form, slides in below chat
- **Design Studio prompt:** `buildDesignStudioPrompt()` in `src/lib/ai/personas/emma.ts`

## SSE Streaming Visualization
- **Streaming endpoint:** `/api/ai/visualize/stream` — SSE events (status, concept, complete, error)
- **Hook:** `useVisualizationStream()` in `src/hooks/use-visualization-stream.ts`
- **Progressive reveal:** 4 skeleton slots, cross-fades to real images as concepts arrive
- **Heartbeat:** `:\n\n` every 15s. Timeout: 110s server, 150s client abort

## Quality Standard
Each demo must feel hand-built for the target. NOT cookie-cutter.
- Match the target's brand aesthetic (colours, tone, visual style)
- Use exact quotes from their testimonials (never paraphrase)
- Reflect their actual services, certifications, and unique selling points
- AI persona prompts must reference real staff names, real services, real location

## Business Constants
HST: 13% | Deposit: 15% | Contingency: 10% | Estimate Variance: +/-15%

## Gotchas
- Write tool creates CRLF on macOS — fix shell scripts: `perl -pi -e 's/\r\n/\n/g'`
- Vercel env vars: use API (curl), NOT `echo | vercel env add` (adds newline)
- Primary colour uses OKLCH: `--primary: oklch(...)` in `globals.css`
- `getSiteId()` is synchronous (env var only) — only for non-API contexts
- `getSiteIdAsync()` is the standard for all API routes
- Proxy env var fallback is dev-only — production unknown hosts return 404
- Firecrawl SDK 4.16.0: `images` format is NOT valid (causes 422 error). Use `markdown` format + parse `<img>` tags. `executeJavascript` param does NOT exist — use `actions: [{ type: 'scroll' }]` for lazy-loaded content
- `generateServiceImages()` has been removed — service cards use real scraped photos or render as text-only. Never generate AI service images
- processSteps are always the ConversionOS standard (Upload Photo → Explore Designs → Request Quote) — never scraped from the original site

---

## Feature Development & Warm-Lead Updates

### Mobile Responsiveness (Mandatory)
ALL sections and pages must be mobile-responsive. Test at 3 breakpoints:
- **375px** — iPhone SE (minimum)
- **768px** — iPad
- **1024px** — Small laptop

Use `/mobile-audit {site-name}` to audit and fix responsiveness.

### Propagating Platform Changes to Warm-Leads
Changes to this codebase or the shared packages affect ALL 54+ tenants:
1. Make the change in `src/` or `../../packages/`
2. Test locally: `npm run dev` → verify at all breakpoints
3. Build: `npm run build` → must pass clean
4. Deploy platform: `scripts/sync-deploy.sh`
5. Deploy warm-leads: `/fix-warm-lead {name}` or `/fix-warm-lead all`

### Warm-Lead Locations
Individual warm-lead builds live at `../../products/warm-leads/{client-name}/`.
Each is a standalone Next.js app with the same 3 shared packages.
Use `/fix-warm-lead` skill for the deploy workflow.

### Testing Checklist
Before deploying any platform change:
- [ ] `npm run build` passes clean
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Mobile responsive at 375/768/1024px
- [ ] Multi-tenant: test with at least 2 different `?__site_id=` values
- [ ] Entitlements: verify feature gating at Elevate vs Accelerate vs Dominate
