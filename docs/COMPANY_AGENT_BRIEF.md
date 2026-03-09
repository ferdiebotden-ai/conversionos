# NorBot Systems Inc. — Complete Agent Brief

**Prepared for:** AI business agent (product development & workflow automation)
**Date:** March 2026
**Scope:** Company identity, products, ideal customer, autonomous pipeline, tenant system, Mission Control, and automation opportunities

---

## Who We Are

**NorBot Systems Inc.** is a Canada-first, privacy-first AI-native product studio based in Stratford, Ontario.

**Founder/CEO:** Ferdie Botden, CPA — former TD Bank District Manager overseeing a $1 billion agricultural loan portfolio. Deep operational and financial background. One-person enterprise, running a full product studio using an AI agent mesh.

**Operating model:** Ferdie runs the entire organisation via AI agents accessed through Telegram and a local Mission Control dashboard. There is no development team — Claude Code (Opus 4.6) handles all software development; specialised OpenClaw agents handle orchestration, research, outreach, and operations.

**Headquarters:** Stratford, Ontario, Canada (rural, small-city roots — this shapes the ICP)

**Legal:** Canadian entity. CASL-compliant email outreach. PIPEDA privacy policy. All prices in CAD. Canadian spelling throughout (colour, favourite, centre, analyse).

---

## Our Product: ConversionOS

### What It Is

ConversionOS is a **white-label AI renovation platform** sold to Ontario renovation contractors. A homeowner visits a contractor's branded website, uploads a photo of their kitchen, bathroom, or basement, and within 30 seconds sees four photorealistic AI-generated concepts of what their renovation could look like — all branded to the contractor.

They then chat with Emma (an AI design advisor), refine the concept, and submit a lead request. The contractor receives the lead with full context: original photo, generated concepts, the homeowner's starred favourites, the full chat transcript, and an AI-generated quote draft.

**The core insight:** Showing a homeowner their *actual space* transformed — not someone else's kitchen — changes "maybe someday" into "let's do this." This emotional connection is the conversion driver.

### Business Model

B2B SaaS. NorBot sells to contractors; contractors use the platform to convert homeowners.

**Three pricing tiers:**

| Tier | Setup | Monthly | Positioning |
|------|-------|---------|-------------|
| **Elevate** | $4,500 | $299/mo | Modern branded website + AI visualizer — entry point |
| **Accelerate** | $12,000 | $699/mo | Full AI quoting platform for mid-size contractors |
| **Dominate** | $20,000 | $1,799/mo | Exclusive territory + full platform + founder-led growth |
| **Black Label** | $40,000 | $4,999/mo | White-glove, fully custom, dedicated support |

**City exclusivity:** Only Dominate gets geographic exclusivity — one contractor per city. Elevate and Accelerate can have multiple contractors in the same city.

### What Each Tier Gets

**All tiers (Elevate, Accelerate, Dominate):**
- Fully branded website (name, colours, logo, services, testimonials, gallery)
- AI Design Studio — 4 photorealistic concepts per photo upload via Gemini 3.1 Flash Image
- Portfolio gallery with full-screen lightbox, room-type filtering, before/after slider
- Emma AI text chat — design guidance, context-aware, knows the homeowner's concepts
- Concept starring, suggestion chips, quick action toolbar
- Lead capture with email notification to contractor
- Mobile camera capture (homeowner takes photo on phone, gets concepts instantly)

**Accelerate adds:**
- Admin dashboard (leads, quotes, invoicing, drawings, settings)
- AI Quote Engine with Ontario pricing database (14 trade rates, 50+ material costs, 9 regional multipliers)
- PDF quotes with e-signature acceptance
- Cost range indicator, live design refinement (up to 3 re-renders)
- Assembly templates, CSV price upload, category markups, scope gap detection

**Dominate adds:**
- Territory exclusivity (one contractor per Ontario city)
- Analytics dashboard (daily trends, room types, conversion metrics via Recharts)
- Phone/Twilio voice agent (Emma answers inbound calls — infrastructure built, not yet deployed)
- Custom integrations, founder-led onboarding

---

## Ideal Customer Profile (ICP)

### The Contractor (B2B Buyer)

ConversionOS targets **small-to-mid Ontario residential renovation contractors** who rely on word-of-mouth and referrals, have a basic website, and are losing bids because they can't show homeowners what the final result will look like.

| Attribute | Profile |
|-----------|---------|
| **Company size** | 5-50 employees |
| **Annual revenue** | $1M-$15M |
| **Services** | Kitchen, bathroom, basement renovations (full-service or specialty) |
| **Current quoting** | Manual — pen-and-paper, spreadsheets, or basic software (days, not minutes) |
| **Online presence** | Basic website (Wix/WordPress), few web leads, relies on referrals and yard signs |
| **Pain points** | Slow quoting, losing bids to faster competitors, can't "show" the homeowner the finished result |
| **Decision maker** | Owner/operator or VP of Sales |
| **Geography** | Ontario — priority: small towns near Stratford (Woodstock, Ingersoll, Tillsonburg, Cambridge, etc.) |

**Geography scoring (ICP model):**
- Small towns near Stratford (Woodstock, Ingersoll, Tillsonburg, Listowel, Mitchell, Elmira, Paris): **15 pts** — ideal
- Mid-size cities (London, Kitchener, Waterloo, Cambridge, Guelph, Brantford): **12 pts**
- Hamilton, Oakville, Burlington: **9 pts**
- Unknown Ontario: **5 pts**

**Why small towns?** Ferdie's network, geographic proximity to Stratford, and lower digital sophistication of incumbents = more competitive opportunity.

### The Homeowner (End User, Not Buyer)

The homeowner interacts with the platform through the contractor's branded website — they never know they're on "ConversionOS."

| Attribute | Profile |
|-----------|---------|
| **Age** | 30-65 |
| **Household income** | $100K+ |
| **Budget** | $15K-$150K renovation project |
| **Stage** | Researching/planning — not yet committed to a contractor |
| **Behaviour** | Browses online, wants to "see it before committing," compares 2-3 contractors |
| **Motivation** | Tired of Pinterest boards — wants to see *their actual space* transformed |

---

## ICP Scoring System (6-Dimension, 100 pts)

Every pipeline target is scored before demo build. Threshold 50/100 to proceed, 70/100 for auto-build.

| Dimension | Points | Logic |
|-----------|--------|-------|
| Template fit | 0-20 | Keyword scan: services, testimonials, portfolio, about sections present |
| Sophistication gap | 0-20 | INVERTED — basic Wix site = 20 pts, stunning custom site = 3 pts |
| Contact completeness | 0-15 | Has email + phone + owner name = 15; 2 of 3 = 10; 1 = 5; none = 0 |
| Google reviews | 0-15 | Rating + count combined |
| Geography | 0-15 | Small towns near Stratford = 15 (see table above) |
| Company size | 0-15 | INVERTED — solo operator = 15; large firm = 4 |

Scoring stored in Turso CRM as `icp_score` (integer) + `icp_breakdown` (JSON). Built tenants auto-drop from the queue (`status = 'bespoke_ready'`).

---

## Tech Stack (ConversionOS Platform)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 (strict mode) |
| Styling | Tailwind v4, shadcn/ui, Framer Motion |
| Database | Supabase (PostgreSQL, ca-central-1, RLS enforced) |
| AI Chat + Vision | OpenAI GPT-5.2 |
| Image Generation | Google Gemini 3.1 Flash Image (Nano Banana 2) |
| Voice Agent (infra) | ElevenLabs Conversational AI (web infra built, phone not deployed) |
| AI SDK | Vercel AI SDK v6 |
| CRM | Turso (libsql) |
| Rate Limiting | Upstash Redis (in-memory fallback) |
| Monitoring | Sentry |
| CI/CD | GitHub Actions + Husky pre-commit hooks |
| Deployment | Vercel — single project, proxy routing for all tenants |
| DNS | Cloudflare (wildcard CNAME `*.norbotsystems.com → cname.vercel-dns.com`) |
| Tests | Vitest (889 unit tests) + Playwright (9 E2E suites) |

---

## Multi-Tenancy Architecture

### The Core Principle

**One codebase. One branch (`main`). One Vercel project. Unlimited contractors.**

Every contractor gets a fully branded experience driven entirely by database configuration. There is no per-tenant code, no per-tenant branches, no per-tenant deployments.

### How Tenant Identity Works

1. A homeowner visits `red-white-reno.norbotsystems.com`
2. Cloudflare wildcard DNS resolves `*.norbotsystems.com → cname.vercel-dns.com`
3. Vercel routes to the single `conversionos` project
4. `src/proxy.ts` reads the hostname, maps it to a `site_id` via `DOMAIN_TO_SITE` (e.g., `red-white-reno`)
5. Proxy sets the `x-site-id` header on every request
6. All 33 API routes call `getSiteIdAsync()` which reads this header
7. All database queries filter by `site_id` — tenant data is fully isolated

```
Homeowner → Cloudflare DNS → Vercel → proxy.ts → x-site-id header → getSiteIdAsync() → tenant-filtered DB query
```

### Branding & Entitlements

- **Branding:** `admin_settings` table stores per-tenant configuration: company name, colours (OKLCH), logo URL, contact info, services, testimonials, pricing config, plan tier
- **Feature gating:** `canAccess(tier, feature)` — a pure function in `src/lib/entitlements.ts`. All features gated through this single function. Never hardcode `tier === 'dominate'` checks.
- **Server:** `getTier()` reads the `plan` key from `admin_settings`. `getBranding()` reads branding config.
- **Client:** `useTier()` hook and `BrandingProvider` context feed both into React components.
- **Default tier:** `elevate` (deny-by-default security model)

### Current Tenants

| Site ID | Domain | Tier | Notes |
|---------|--------|------|-------|
| `conversionos` | `conversionos.norbotsystems.com` | Accelerate | NorBot-branded base platform |
| `demo` | `conversionos-demo.norbotsystems.com` | Accelerate | Ferdie's testing sandbox |
| `red-white-reno` | `red-white-reno.norbotsystems.com` | Accelerate | First bespoke — 23 portfolio images |
| `bl-renovations` | `bl-renovations.norbotsystems.com` | Accelerate | Owen Sound bathroom specialist — 12 images |
| `ccr-renovations` | `ccr-renovations.norbotsystems.com` | Accelerate | Whitby full-service — 20 images |
| `mccarty-squared-inc` | `mccarty-squared-inc.norbotsystems.com` | Accelerate | London/Strathroy — 22 images |
| `brouwer-home-renovations` | `brouwer-home-renovations.norbotsystems.com` | Accelerate | Cambridge — 18 images, 7 services |
| `go-hard-corporation` | `go-hard-corporation.norbotsystems.com` | Accelerate | Cambridge KW — 20 images, 4 services |

### Adding a New Tenant

1. Seed `admin_settings` rows in Supabase (5 keys: `business_info`, `branding`, `company_profile`, `plan`, `quote_assistance`)
2. Add hostname → site_id mapping to `DOMAIN_TO_SITE` in `src/proxy.ts`
3. Insert row into `tenants` table with domain + plan tier
4. Run `node scripts/onboarding/add-domain.mjs` — registers domain with Vercel + issues SSL cert
5. Push to `main` — one build, all tenants updated, wildcard DNS handles the subdomain automatically

In practice, all of this is fully automated by the **Tenant Builder pipeline** (see below).

---

## Tenant Builder — Autonomous Onboarding Pipeline

The tenant builder is the operational engine that converts a CRM pipeline target into a live, branded ConversionOS demo — autonomously.

**Location:** `~/norbot-ops/products/demo/tenant-builder/`

### The 17-Step Pipeline

```
1.  Select targets     — Turso DB, direct URL, or Firecrawl discovery
2.  ICP score          — 6-criterion model (100 pts), threshold 50/70
3.  Scrape             — Firecrawl branding v2 + 7-stage enhanced scrape + 4-level logo extraction + social links
4.  Quality gates      — testimonials (≥2), portfolio (images), services (name+desc≥10 chars), hero (reject generic)
5.  Provision          — Upload images, seed Supabase (5 rows), write proxy fragment, seed sample lead
6.  Merge proxy        — Combine all tenant proxy fragments into src/proxy.ts
7.  Git + deploy       — Commit, push to main, wait for Vercel deployment (wildcard DNS handles subdomain)
8.  QA: Page completeness    — 6 pages + footer data verification (uses data-slot="card" selectors)
9.  QA: Data-gap resolution  — Auto-fix gaps (missing socials, N/A hours, favicon). Up to 2 auto-fix attempts.
10. QA: Content integrity    — 12 checks + auto-fix (demo leakage, broken images, fabrication, placeholders)
11. QA: Visual QA            — Claude Vision 6-dimension rubric + refinement loop (plateau/regression detection)
12. QA: Live site audit      — 8 Playwright checks (branding, nav, responsive, WCAG, SEO, images, footer, admin)
13. QA: Original vs demo     — 7-field comparison (name, phone, email, services, testimonials, colour, logo)
14. QA: PDF branding         — Supabase completeness for PDF quote generation
15. QA: Email branding       — admin_settings + template source scan
16. Readiness report         — 7-section markdown + JSON verdict: READY / REVIEW / NOT READY
17. Outreach                 — Gmail draft creation for READY tenants (Ferdie reviews before sending)
```

### Scraping (3-Phase)

**Phase 1:** Firecrawl Branding v2 — structured extraction of colours, fonts, logo URL, personality keywords
**Phase 2:** 7-stage enhanced scrape — business info, content, images, testimonials, portfolio, social links (9 platforms)
**Phase 3:** 4-level logo extraction fallback — branding v2 → Playwright DOM → Claude Vision → favicon

Branding v2 colours override hex-counted colours. Logo extraction overrides scraped logo_url.

### QA Modules in Detail

| Module | What It Checks |
|--------|---------------|
| Page completeness | 6 pages (home, about, services, projects, contact, admin) — data rendered correctly |
| Data-gap resolution | Social links, N/A business hours, favicon — auto-fills with AI or standard fallbacks |
| Content integrity | 12 checks: no "demo" leakage, no broken images, no fabricated testimonials, no placeholders |
| Visual QA | Claude Vision 6-dimension rubric — scored 1.0-5.0 per dimension, aggregate threshold ≥3.5 |
| Live site audit | 8 Playwright checks — loads, branding matches, responsive, WCAG AA contrast, SEO meta |
| Original vs demo | Verifies company name, phone, email, services count, testimonials, primary colour, logo |
| PDF branding | Confirms all Supabase fields needed for PDF quote generation are populated |
| Email branding | Confirms data fields and source references for outreach email |

### Running the Pipeline

```bash
# Single target by Turso ID
node tenant-builder/orchestrate.mjs --target-id 42

# Single target by URL (skip CRM lookup)
node tenant-builder/orchestrate.mjs --url https://example.com --site-id example --tier accelerate

# Batch (top 10 by ICP score)
node tenant-builder/orchestrate.mjs --batch --limit 10

# Nightly mode (config defaults: 10 targets, concurrency 4)
node tenant-builder/orchestrate.mjs --nightly

# Audit only (no scrape/provision — QA existing tenant)
node tenant-builder/orchestrate.mjs --audit-only --site-id example --url https://example.norbotsystems.com

# Flags: --dry-run, --skip-qa, --skip-outreach, --skip-sample-data, --concurrency N
```

### Key Files

| File | Role |
|------|------|
| `orchestrate.mjs` | Master entry point — all modes, 17-step pipeline |
| `discover.mjs` | Target selection from Turso, sorted by ICP score |
| `icp-score.mjs` | 6-criterion scoring, writes to Turso |
| `config.yaml` | All configurable weights, thresholds, city lists |
| `scrape/branding-v2.mjs` | Firecrawl structured extraction |
| `scrape/scrape-enhanced.mjs` | 3-phase orchestrator |
| `provision/provision-tenant.mjs` | Per-target provisioning sequence |
| `provision/merge-proxy.mjs` | Parallel-safe proxy.ts assembly |
| `provision/seed-sample-leads.mjs` | Idempotent sample lead seeder |
| `qa/visual-qa.mjs` | Claude Vision scoring |
| `qa/live-site-audit.mjs` | Playwright 8-check suite |
| `qa/audit-report.mjs` | Go-live readiness report (READY/REVIEW/NOT READY) |
| `docs/learned-patterns.md` | Accumulated build learnings — read at every session start |

### Sample Data

Every new tenant gets seeded with one sample lead: **Margaret Wilson** (bathroom renovation, `new` status) — a complete AI visualizer journey with 4 generated concepts, room metrics, and audit log. Fixtures in `tenant-builder/fixtures/sample-leads.json`. Idempotent (skips if lead exists). Integrated as Step 2c in provision-tenant.mjs.

### Cost Per Build

~$0.07/tenant in API costs (Firecrawl + Gemini image generation for missing hero/about images + Claude Vision for QA). The pipeline runs in parallel with configurable concurrency (default 4).

---

## Outreach Pipeline

After a tenant passes QA and is marked READY, an outreach email draft is automatically created in Gmail for Ferdie to review and send manually.

**Rules (non-negotiable):**
- Ferdie's exact template words — AI fills variables, does NOT rewrite copy
- Every email includes: sender name (Ferdie Botden, CPA), business name (NorBot Systems Inc.), mailing address (PO Box 23030 Stratford PO Main, ON N5A 7V8), unsubscribe instruction
- 6 hard stops: if company_name, city, demo_url, call_day, call_time, or call_phone is missing — skip the target entirely
- 8 banned terms: AI, ConversionOS, platform, free, limited time, exclusive, guaranteed, no obligation
- Never auto-send — all emails go to Gmail Drafts, Ferdie clicks Send
- CASL compliance mandatory

**Subject rotation:** When 3+ targets in the same city are batched, subjects rotate to avoid duplicate inbox clustering.

**Status flow:** `demo_built` → `draft_ready` → `email_1_sent`

**Send monitor:** LaunchAgent (`com.norbot.send-monitor`) runs every 15 minutes (6am-9pm weekdays), detects sends via IMAP, books follow-up call in Apple Calendar, generates call script, updates Turso.

---

## Mission Control — The Operational Cockpit

Mission Control is a local-first Next.js 16 PWA that serves as Ferdie's visual command centre. Telegram remains the primary interaction channel for agents; Mission Control provides the bird's-eye view.

**Location:** `~/norbot-ops/products/mission-control/codebase/mission-control/`

### Navigation Structure

```
── PLAN ──
Home | Tracks | Projects | Ideas | Canvas | Milestones | Rituals | Vision

── COMMAND ──
Agents | Brain | Pipeline
```

### Data Sources (Hybrid Architecture)

```
Mission Control OS (Next.js 16)
├── Dexie/IndexedDB (local)        ← Personal planning data (kanban, rituals, vision board)
├── Supabase Client (read-only)    ← Brain memories, Mem0 memories, decisions, learnings
├── OpenClaw WebSocket (read-only) ← Agent status, activity feed, cron job status
└── CRM REST API (read-only)       ← Pipeline summary from ConversionOS CRM API
```

### Agent Dashboard (`/agents`)

- 8-card grid showing each OpenClaw agent: name, emoji, model, status, last active, current task
- Real-time activity feed (last 50 events) via WebSocket
- Cron job status panel (5 scheduled jobs with next-run and last-run)
- Agent detail modal with SOUL.md summary
- WebSocket connection to OpenClaw Gateway (`ws://localhost:18789`) with Bearer token auth and reconnection backoff

### Brain Explorer (`/brain`)

5-tab exploration interface over the organisational brain:
- **Memories** — semantic memories with type, importance, agent attribution
- **Mem0** — auto-captured facts from Telegram conversations (cross-agent shared)
- **Decisions** — logged decisions with rationale and status
- **Interactions** — conversation summaries with action items
- **Learnings** — cross-agent knowledge base with verification status

Stats bar shows live row counts for all 5 tables + last captured timestamp.

### Pipeline Summary (`/pipeline`)

- 16 pipeline stages grouped into 4 phases (Qualification, Active Cadence, Advanced, Terminal)
- Today's priorities: email/text/call/expiring counts with highlight rings
- Active leads with urgency scoring and cadence tracking
- Recent touches with signal types (email_sent, call_logged, etc.)
- Data from ConversionOS CRM REST API via Bearer auth

### Build Demo Trigger

The Pipeline page in Mission Control has a **"Build Demo"** button on each CRM candidate card. Clicking it:
1. Sends a `chat.send` message to the Claude Code Bridge agent via OpenClaw WebSocket
2. Claude Code Bridge spawns a `claude -p` CLI session in the demo workspace
3. Runs `onboard.mjs` with the target's URL and site-id
4. Streams `[PROGRESS]` JSON lines back through the WebSocket
5. `BuildProgressPanel` displays real-time build output in the Mission Control UI

This is the primary workflow for building new tenant demos without touching a terminal.

### OpenClaw WebSocket Integration

Mission Control connects to the OpenClaw Gateway via WebSocket Protocol v3:

1. Client opens `ws://localhost:18789`
2. Gateway sends `connect.challenge`
3. Client sends `connect` request with `auth.token` + `scopes` array
4. Required scopes: `operator.read`, `operator.write`, `operator.approvals`, `operator.admin` (the last is required for `ccb.status` polling — easy to miss)

**Env vars:** `NEXT_PUBLIC_OPENCLAW_WS_URL` + `NEXT_PUBLIC_OPENCLAW_TOKEN`

**Gateway config required:** `controlUi.dangerouslyDisableDeviceAuth: true` for browser clients; `allowedOrigins` must include localhost:3000 and the Vercel URL.

---

## Agent Mesh (8 OpenClaw Agents)

NorBot operates through 8 specialised AI agents on OpenClaw (v2026.2.17), running on a local Mac Mini with LaunchAgent always-on management.

| Agent | Model | Role |
|-------|-------|------|
| **Knox** | Sonnet 4.6 | Chief of Staff — Telegram catch-all, morning briefing, Gmail monitor, idea capture, Midnight Roundtable |
| **PRD Architect** | Sonnet 4.6 | Product specs, Gherkin acceptance criteria |
| **Marketing Writer** | Sonnet 4.6 | Copy, landing pages, email content |
| **SOW Generator** | Sonnet 4.6 | Contracts, proposals |
| **Claude Code Bridge** | Opus 4.6 | Code relay via `/cc` from Telegram + Mission Control WebSocket |
| **Ops Engineer** | Sonnet 4.6 | Workflow optimisation, internal builds, Codex coordination |
| **Research Scout** | Sonnet 4.6 | AI ecosystem monitoring (weekly brief Sundays 8pm) |
| **Outreach Pipeline** | Sonnet 4.6 | Sales pipeline automation (nightly 11pm cron) |

All agents share memory via Mem0 plugin (`userId: "norbot-org"`) and read shared context files:
- `~/norbot-ops/shared/BUSINESS_CONTEXT.md`
- `~/norbot-ops/shared/ACTIVE_PROJECTS.md`
- `~/norbot-ops/shared/LEARNINGS.md`
- `~/norbot-ops/shared/CLIENT_PROFILES.md`

### Scheduled Automations

| Automation | Schedule | Agent |
|-----------|----------|-------|
| Knox Morning Briefing | Daily 7am | Knox |
| Gmail Monitor | Every 15 min, 8am-8pm weekdays | Knox |
| Nightly Roundtable | Midnight daily | Knox |
| Outreach Pipeline Nightly | 11pm daily | Outreach Pipeline |
| Research Weekly Brief | Sundays 8pm | Research Scout |
| System Health Check | Every 30 min | LaunchAgent (shell script) |
| Ecosystem Monitor | Daily 1am | LaunchAgent (shell script) |
| Send Monitor | Every 15 min, 6am-9pm weekdays | LaunchAgent (shell script) |
| Tenant Builder Nightly | Daily 00:15 | LaunchAgent (shell script) |

---

## Infrastructure

| Service | Location | Purpose |
|---------|----------|---------|
| OpenClaw Gateway | `localhost:18789` | Agent mesh, Telegram routing, cron jobs |
| Knox Voice Server | `localhost:8013` | Real-time voice via ElevenLabs (active on phone calls) |
| Cloudflare Tunnel | `gateway.norbotsystems.com` | OpenClaw Gateway remote access |
| Cloudflare Tunnel | `knox-voice.norbotsystems.com` | ElevenLabs traffic to Knox Voice Server |
| Supabase — Brain | `tebaswjwlrkzugbiuulg.supabase.co` | 7 manual tables + Mem0 auto-memory |
| Supabase — Demo | `ktpfyangnmpwufghgasx.supabase.co` | All ConversionOS demo tenants (isolated by site_id) |
| Supabase — Website | `nlxpgchnkmqxmfmvhgek.supabase.co` | NorBot public website auth, billing, microsites |
| Turso | libsql (cloud) | ConversionOS pipeline CRM (targets, territories) |
| Vercel | `conversionos` project | Single project, all tenants via proxy routing |
| GitHub | `ferdiebotden-ai/conversionos` | Private repo — platform codebase |
| GitHub | `norbot-ops` | Operations repo — agents, configs, scripts |

---

## Automation Opportunities (March 2026 Context)

This section outlines the current automation gaps and where new integrations would have the highest leverage. These are live conversations as of March 2026.

### 1. OpenClaw Integration for Tenant Builder Triggering

**Current state:** The tenant builder is triggered via:
- Mission Control "Build Demo" button (via Claude Code Bridge WebSocket)
- CLI (`node orchestrate.mjs --batch`)
- Nightly LaunchAgent (00:15 daily)

**Opportunity:** Knox could accept natural language commands like "build a demo for rwr.com" from Telegram and trigger the pipeline directly — without needing Mission Control or a terminal. Knox already has the `claude_bridge` tool; the bridge could pass orchestration commands to the demo workspace. No new infrastructure needed — this is a workflow configuration change.

### 2. Codex / OpenAI Integration

**Current situation:** The Ops Engineer agent is designated for coordination with GPT 5.3 Codex (vibe coding tasks, dashboards, utilities). This is a planned role, not yet active with a specific Codex integration. OpenClaw currently connects to OpenAI via API key — Codex-specific routing would require a dedicated model provider entry in `openclaw.json` with the Codex-appropriate endpoint.

**What to evaluate (March 2026):** OpenAI's Codex CLI tool and the Codex environment (separate from ChatGPT Codex editor) differ significantly. Research which Codex product is meant here — the CLI agent for autonomous coding tasks, or the model endpoint for code generation. The Ops Engineer agent's SOUL.md describes "GPT 5.3 Codex" which aligns more with the GPT 5.x API series than the Codex CLI product.

**Key question:** Is the goal to use Codex as a coding model in the agent pipeline (API calls), or as a separate autonomous coding environment (like Claude Code)? The architecture should match the answer.

### 3. Mission Control ↔ Pipeline Automation Loop

**Current state:** Mission Control shows pipeline data (read-only) and triggers builds (write via Claude Code Bridge). The "Upcoming Calls" panel is live. Build progress streams in real-time via WebSocket.

**Opportunity:** Close the loop. When a tenant build completes (goes READY), Mission Control could automatically create a Gmail draft and notify Ferdie in-app — eliminating the need to check email separately. The send-monitor already detects sends; surfacing that detection in Mission Control would complete the funnel view.

### 4. Batch Discovery Automation

**Current state:** Discovery uses Firecrawl to find new targets in specified Ontario cities. This runs on demand or via nightly batch.

**Opportunity:** Research Scout could run weekly city sweeps and enqueue new targets directly to the Turso CRM with ICP scores pre-populated, so the nightly tenant-builder always has a healthy queue. Knox's morning briefing could include "N new targets added to queue this week."

### 5. Post-Outreach Intelligence

**Current state:** Send-monitor detects when Ferdie sends an email, books a follow-up call, and generates a call script. Knox gets a Telegram notification.

**Opportunity:** When a prospect replies to an outreach email (even "not interested"), Knox could classify the response, update the Turso CRM record with a signal, and adapt the follow-up cadence. This requires Gmail watch integration (Knox already monitors Gmail via IMAP cron).

---

## Key Files Reference

### ConversionOS Platform

| Path | Purpose |
|------|---------|
| `src/proxy.ts` | Domain → site_id routing (DOMAIN_TO_SITE map) |
| `src/lib/db/site.ts` | `getSiteId()` (sync) + `getSiteIdAsync()` (async, API routes) |
| `src/lib/entitlements.ts` | `canAccess(tier, feature)` — all feature gating |
| `src/lib/entitlements.server.ts` | `getTier()` — reads plan from admin_settings |
| `src/lib/ai/personas/emma.ts` | Emma's system prompt builders |
| `src/lib/ai/knowledge/pricing-data.ts` | Ontario pricing database (typed, client-safe) |
| `src/lib/branding.ts` | `getBranding()` — server-side branding from admin_settings |
| `src/lib/rate-limit.ts` | Upstash Redis rate limiter |
| `src/lib/image-validation.ts` | MIME + size validation for AI endpoints |
| `src/app/api/ai/visualize/stream/route.ts` | SSE streaming visualization endpoint |
| `src/hooks/use-visualization-stream.ts` | SSE streaming hook |

### Tenant Builder

| Path | Purpose |
|------|---------|
| `tenant-builder/orchestrate.mjs` | Master pipeline (16 steps + outreach) |
| `tenant-builder/config.yaml` | All weights, thresholds, city lists |
| `tenant-builder/docs/learned-patterns.md` | Accumulated build learnings — **read this first** |
| `tenant-builder/docs/icp-scoring.md` | Full ICP dimension breakdown |
| `tenant-builder/docs/pipeline-architecture.md` | Module structure + scraping phases |
| `tenant-builder/docs/qa-modules.md` | All 9 QA modules with thresholds |
| `tenant-builder/SHARED_INTERFACES.md` | Data shape interfaces across pipeline |

### Outreach

| Path | Purpose |
|------|---------|
| `scripts/outreach/generate-email.mjs` | Template filler + quality gates + banned terms |
| `scripts/outreach/create-draft.mjs` | Gmail REST API (OAuth2) draft creation |
| `scripts/outreach/outreach-pipeline.mjs` | Orchestrator (select, generate, validate, draft) |
| `scripts/outreach/send-monitor.mjs` | Detects sends, books calendar, generates call script |
| `scripts/outreach/tests/test-email-template.mjs` | 56 mock data tests |
| `.claude/rules/outreach.md` | CASL rules, template integrity, sentinel names |

---

## Constraints (Non-Negotiable)

1. **Never auto-send email.** All outreach goes to Gmail Drafts. Ferdie reviews and sends manually.
2. **CASL on every email.** Sender name, business name, mailing address, unsubscribe instruction.
3. **Canadian spelling.** colour, favourite, centre, analyse, behaviour.
4. **$150/mo API cap.** Per-decision limit $25 without Ferdie's approval.
5. **City exclusivity is Dominate-only.** Elevate and Accelerate have no city restriction.
6. **All new features gated behind `canAccess(tier, feature)`.** Never expose to all tiers by default.
7. **All API routes use `getSiteIdAsync()`.** Never `getSiteId()` in API routes — it reads the build-time env var, which is always `demo` in production.
8. **Gateway restart required** after any changes to `openclaw.json` or plugin files.
9. **Demo mode.** Production admin auth is bypassed for prospect demos — re-enable before any production client launch.

---

*This document describes NorBot Systems Inc., ConversionOS, the tenant builder pipeline, and the operational infrastructure as of March 2026. It is intended to give an AI business agent sufficient context to reason about workflow automation, product development, and integration decisions without needing to read source code directly.*
