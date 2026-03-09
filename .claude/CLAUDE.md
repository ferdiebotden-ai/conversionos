# ConversionOS — Premium Website Rebuild Platform

## What This Is
NorBot Systems rebuilds contractor websites with AI underneath — same brand, same feel, but now it captures leads, qualifies them, and generates estimates automatically. Single codebase, four pricing tiers, domain-driven multi-tenancy.

**Business:** NorBot Systems Inc. | **Positioning:** "We rebuild your website" (not "adopt our platform")
**Pricing:** Elevate ($4,500 + $299/mo) | Accelerate ($12,000 + $699/mo) | Dominate ($20,000 + $1,799/mo) | Black Label ($40,000 + $4,999/mo)
**Voice add-on:** $499/mo on any tier. **Guarantee:** 75% setup refund within 14 days.
**Pipeline dashboard:** https://dashboard-rho-ten-70.vercel.app

This repo is the platform. One `main` branch serves ALL tenants. Feature gating via entitlements system. The autonomous build pipeline (`tenant-builder/`) is the primary delivery mechanism.

## Living Product Reference — IMPORTANT
After ANY session where you implement features, fix bugs, modify AI prompts, change database schema, update API routes, or alter handoff mechanisms: update `docs/PRODUCT_REFERENCE.md` to reflect the current state of the product. This is not optional. Use the `/update-product-reference` skill.

---

## Pipeline Operations (Core Business)

The autonomous build pipeline discovers contractors, builds production-grade demos, runs QA, and creates outreach emails. This is the highest-value workflow.

### Build a Tenant
```bash
# Single target from Turso CRM
node tenant-builder/orchestrate.mjs --target-id 42

# From URL (bypass CRM)
node tenant-builder/orchestrate.mjs --url https://example.com --site-id example --tier accelerate

# Batch (top ICP-scored targets)
node tenant-builder/orchestrate.mjs --batch --limit 10 --concurrency 4

# Discover + build new targets
node tenant-builder/orchestrate.mjs --discover --cities "London,Kitchener" --limit 5

# Nightly automated batch
node tenant-builder/orchestrate.mjs --nightly
```

### Run QA Only
```bash
node tenant-builder/orchestrate.mjs --audit-only --site-id example --url https://example.norbotsystems.com
```

### Run Outreach
```bash
# Preview email (no Gmail API call)
node scripts/outreach/outreach-pipeline.mjs --target-id 42 --dry-run

# Create Gmail draft
node scripts/outreach/outreach-pipeline.mjs --target-id 42

# All ready targets
node scripts/outreach/outreach-pipeline.mjs

# ICP re-scoring
node scripts/outreach/rescore-all.mjs --report
```

### Pipeline Flow
Scrape → quality gates → upload images → provision DB → register domain → deploy → 9 QA modules → audit report → outreach email. Full 18-step breakdown in `CLAUDE.md` (repo root).

### QA Verdicts
- **READY** (score >=4.0) → outreach fires automatically
- **REVIEW** (3.5-4.0) → queued for polish, outreach held
- **NOT READY** (<3.5) → manual review, outreach held

### What's Manual (Ferdie Handles)
- DNS cutover to client's real domain (after sale closes)
- Black Label instances (built as Dominate + personal review)
- Post-sale onboarding, billing, contracts
- Custom domain SSL and Vercel registration for client domains

---

## Architecture
- **Single codebase, single branch** (`main`). NO branches per tenant.
- **Entitlements:** `canAccess(tier, feature)` gates features by plan tier (Elevate/Accelerate/Dominate/Black Label)
- **Tenant identity:** proxy resolves from hostname → `x-site-id` header, falls back to `NEXT_PUBLIC_SITE_ID` env var
- **Branding:** `admin_settings` table stores per-tenant config (name, colours, contact, pricing, plan tier)
- **UI:** `BrandingProvider` + `TierProvider` contexts feed branding and entitlements to client components
- **Server:** `getBranding()` for SSR, `getTier()` for entitlement checks
- **Deploy:** Single Vercel project (`conversionos`) with proxy routing + wildcard DNS
- **Section registry:** 47 components, `SectionRenderer` renders homepage dynamically via `getPageLayout()`

## Adding a New Tenant

### Autonomous (primary)
The tenant builder handles everything: `node tenant-builder/orchestrate.mjs --target-id 42`

### From Mission Control
Click **"Build Demo"** on a candidate card in the Pipeline page. Spawns via Claude Code Bridge WebSocket.

### From CLI / Telegram
```bash
/onboard-tenant {site-id} {url} {tier}
# or
node scripts/onboarding/onboard.mjs --url {url} --site-id {site-id} --domain {site-id}.norbotsystems.com --tier {tier}
```

### Manual (fallback)
1. Seed `admin_settings` rows: `business_info`, `branding`, `company_profile`, `plan`, pricing keys
2. Add domain → site_id mapping to `DOMAIN_TO_SITE` in `src/proxy.ts`
3. Insert into `tenants` table with domain and plan tier
4. Run `node scripts/onboarding/add-domain.mjs --domain {site-id}.norbotsystems.com --site-id {site-id}`
5. Push to `main` → deploy

## Onboarding Pipeline (Legacy)
- **Scripts:** `scripts/onboarding/` — 9 scripts (score, scrape, schema, convert-colour, upload-images, provision, onboard, verify)
- **Skill:** `.claude/skills/onboard-tenant/SKILL.md` — invokable as `/onboard-tenant`
- **Dependencies:** `@mendable/firecrawl-js`, `culori` (devDeps)
- **Cost:** ~$0.07/tenant

## ElevenLabs Voice Agent
- **Single persona: Emma** — one ElevenLabs agent per tenant, context-aware via PageContext
- **Voice (web) on ALL tiers** — `voice_web` entitlement. Elevate has mandatory pricing deflection.
- **Voice (phone)** — $499/mo add-on on any tier, bundled with Dominate/Black Label
- Dynamic prompts: `buildVoiceSystemPrompt(context)` server-side, passed as session override
- Single env var: `ELEVENLABS_AGENT_EMMA` per Vercel project

## Gemini Image Generation
- Model: `gemini-3.1-flash-image-preview` (Nano Banana 2 — configured in `src/lib/ai/gemini.ts`)
- Every image must be stunning. These demos replace real contractor websites.

## Quality Standard
Each demo must feel hand-built for the target. NOT cookie-cutter.
- Match the target's brand aesthetic (colours, tone, visual style)
- Use exact quotes from their testimonials (never paraphrase)
- Reflect their actual services, certifications, and unique selling points
- AI persona prompts must reference real staff names, real services, real location

## Quote Assistance System
- **Per-tenant setting** stored as `quote_assistance` key in `admin_settings`
- **Three modes:** `none` (no pricing shown), `range` (cost ranges), `estimate` (point estimate)
- **Elevate:** Always `none` (hardcoded — no admin dashboard)
- **Accelerate/Dominate default:** `{ mode: 'range', rangeBand: 10000 }`

## Design Studio (Unified Flow)
Single-page journey at `/visualizer`: upload → AI analysis → style → generate 4 concepts (SSE) → Design Studio Chat → refine → lead capture.

## Outreach Pipeline
- **Scripts:** `scripts/outreach/` — 6 scripts + tests
- **Rules:** `.claude/rules/outreach.md` — CASL, template integrity, call slots, banned terms
- **Tests:** `node scripts/outreach/tests/test-email-template.mjs` (56 tests)
- **Status flow:** `demo_built` → `draft_ready` → `email_1_sent`
- **Integration:** `orchestrate.mjs` Step 18 auto-runs outreach after QA

## Gotchas
- Write tool creates CRLF on macOS — fix shell scripts: `perl -pi -e 's/\r\n/\n/g'`
- Vercel env vars: use API (curl), NOT `echo | vercel env add` (adds newline)
- Primary colour uses OKLCH: `--primary: oklch(...)` in `globals.css`
- `getSiteId()` is synchronous (env var only) — only for non-API contexts
- `getSiteIdAsync()` is the standard for all API routes
- `withSiteId(data, siteId)` — always pass explicit `siteId` in API routes
- Proxy env var fallback is dev-only — production unknown hosts return 404
- `(supabase as any).from('new_table')` for tables not in generated types
- Next.js 16 dynamic route params: bracket notation `params?.['token']`
- Vercel AI SDK v6: `maxOutputTokens` not `maxTokens` in `generateObject()`
- CAD rendering colours (#1565C0) are intentional — do NOT change to primary
- Image generation model source of truth: `src/lib/ai/gemini.ts` line 19
- Vision/analysis model: `gpt-5.4` — source of truth: `src/lib/ai/config.ts`
