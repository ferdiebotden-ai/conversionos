# ConversionOS — Multi-Tenant AI Renovation Platform

White-label AI quoting platform for Ontario renovation contractors. Single codebase, three pricing tiers, environment + domain-driven multi-tenancy.

## Living Product Reference — IMPORTANT
After ANY session where you implement features, fix bugs, modify AI prompts, change database schema, update API routes, or alter handoff mechanisms: update `docs/PRODUCT_REFERENCE.md` to reflect the current state of the product. This is not optional. The document must always match what's actually in the codebase. Use the `/update-product-reference` skill for detailed instructions. Do not treat this as a changelog — rewrite the affected sections to describe the product as it exists now.

## Stack
Next.js 16.1.6 (App Router) • React 19 • TypeScript 5 (strict) • Supabase (PostgreSQL) • Vercel AI SDK v6 • Tailwind v4 • shadcn/ui • Vitest • Playwright

## AI Stack
- **Chat/Vision:** OpenAI GPT-5.2
- **Image generation:** Google Gemini 3.1 Flash Image (Nano Banana 2)
- **Voice agent:** ElevenLabs (single Emma persona, context-aware) — web on all tiers, phone Dominate only
- **Validation:** Zod schemas on all AI outputs

## Commands
```bash
npm run dev          # localhost:3000
npm run build        # typecheck + build (run before commits)
npm run lint         # eslint
npm run test         # vitest unit tests
npm run test:e2e     # playwright E2E tests
```

## Pricing Tiers & Feature Map

| Feature | Elevate ($249/mo) | Accelerate ($699/mo) | Dominate ($2,500/mo) |
|---------|:-:|:-:|:-:|
| Branded website (all public pages) | Yes | Yes | Yes |
| AI Visualizer | Yes | Yes | Yes |
| Lead capture + email notify | Yes | Yes | Yes |
| Emma text chat widget | Yes | Yes | Yes |
| Admin Dashboard | — | Yes | Yes |
| AI Quote Engine | — | Yes | Yes |
| PDF quotes + email sending | — | Yes | Yes |
| Invoicing + payment tracking | — | Yes | Yes |
| Drawings management | — | Yes | Yes |
| Voice agents (web) | Yes | Yes | Yes |
| Voice agents (phone/Twilio) | — | — | Yes |
| Custom integrations | — | — | Yes |
| Location exclusivity | — | — | Yes |

## Entitlements System
- **`src/lib/entitlements.ts`** — `canAccess(tier, feature)` pure function, `PlanTier` and `Feature` types
- **`src/lib/entitlements.server.ts`** — `getTier()` reads `plan` key from `admin_settings` (defaults to `'accelerate'`)
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

## Key Directories
```
src/app/              — 50+ routes (public pages, admin dashboard, 30+ API endpoints)
  app/admin/          — Admin dashboard (gated: Accelerate+)
  app/admin/analytics/ — Analytics dashboard (Dominate only, Recharts)
  app/api/            — API routes (ai/, admin/, quotes, contact, export, voice)
  app/api/ai/visualize/stream/ — SSE streaming visualization endpoint
  app/visualizer/     — AI Design Studio (unified homeowner journey)
  app/estimate/       — Redirects to /visualizer (legacy)
src/components/       — React components
  components/admin/   — Admin UI (dashboard, leads, settings, analytics)
  components/chat/    — AI chat widget
  components/visualizer/ — Design Studio UI (form, results, chat, lead capture)
  components/voice/   — Voice agent UI (Dominate only)
  components/ui/      — shadcn/ui primitives + chart wrapper
src/hooks/            — Custom React hooks
  hooks/use-visualization-stream.ts — SSE streaming hook
src/lib/              — Shared utilities
  lib/entitlements.ts — Feature gating by tier
  lib/db/site.ts      — Tenant resolution (getSiteId sync, getSiteIdAsync for API routes)
  lib/image-validation.ts — Image upload validation (MIME + size) for AI endpoints
  lib/rate-limit.ts   — Rate limiting (Upstash Redis / in-memory, 15 endpoints)
  lib/ai/             — AI integrations (personas, knowledge base, config)
  lib/branding.ts     — Server-side branding from admin_settings
src/proxy.ts          — Domain → tenant routing (Next.js 16 proxy)
```

## Deployment
- **Single Vercel project** (`conversionos`) with proxy-based domain routing — all tenants
- **DNS:** Domain registered on Namecheap, nameservers pointed to Cloudflare. Wildcard CNAME `*.norbotsystems.com → cname.vercel-dns.com` (DNS only, grey cloud). No per-tenant DNS needed.
- **SSL:** `add-domain.mjs` registers subdomain with Vercel + issues SSL cert. Requires `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` in `~/pipeline/scripts/.env`.
- Push to `main` → single build → all tenants updated
- New tenant = seed DB + add to `DOMAIN_TO_SITE` in proxy.ts + run `add-domain.mjs` + push
- Never create per-tenant branches or separate Vercel projects

## Supabase
- **Demo project:** `ktpfyangnmpwufghgasx` — shared by all demo tenants, isolated by `site_id`
- **Production clients** get their own Supabase project (separate data, separate billing)
- Key tables: `admin_settings`, `leads`, `quotes`, `quote_items`, `invoices`, `drawings`, `tenants`

## Current Tenants
| Site ID | Domain | Tier | Purpose |
|---------|--------|------|---------|
| `demo` | `conversionos-demo.norbotsystems.com` | Accelerate | NorBot base platform |
| `red-white-reno` | `red-white-reno.norbotsystems.com` | Accelerate | First bespoke tenant |

## Adding a New Tenant

### From Mission Control (primary)
Click **"Build Demo"** on a candidate card in the Pipeline page. Spawns `onboard.mjs` via Claude Code Bridge with real-time output streaming.

### Manual Steps
1. Seed `admin_settings` rows in Supabase: `business_info`, `branding`, `company_profile`, `plan`, pricing keys
2. Add domain → site_id mapping to `DOMAIN_TO_SITE` in `src/proxy.ts`
3. Push to `main` (wildcard DNS handles the subdomain automatically)
4. Insert into `tenants` table with domain and plan tier
5. Push to `main` → deploy

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
- **Design Studio Chat:** `src/components/visualizer/design-studio-chat.tsx` — inline Emma chat with quick action buttons (Refine/Discuss/Estimate). Purpose-built, NOT reusing ChatInterface.
- **Lead capture form:** `src/components/visualizer/lead-capture-form.tsx` — inline form (not modal), slides in below chat.
- **Quick actions:** Contextual pill buttons staged by conversation depth. 0 exchanges = no buttons. 1+ = "Refine My Design". 2+ = "Get My Estimate" (Accelerate+) / "Email My Designs" (Elevate). Refine silently disappears after 3 uses.
- **Suggestion chips:** Emma ends responses with `[Suggestions: A | B | C]` — parsed and rendered as clickable pills. Clicking sends the text as a user message.
- **Design Studio prompt:** `buildDesignStudioPrompt()` in `src/lib/ai/personas/emma.ts` — assembles room analysis, preferences, starred concepts, tier-specific pricing rules.

## SSE Streaming Visualization
- **Streaming endpoint:** `/api/ai/visualize/stream` — SSE events (status, concept, complete, error)
- **Hook:** `useVisualizationStream()` in `src/hooks/use-visualization-stream.ts`
- **Progressive reveal:** 4 skeleton slots, cross-fades to real images as concepts arrive
- **Parallel generation:** All 4 concepts via `Promise.allSettled()` (not batched)
- **Heartbeat:** `:\n\n` every 15s. Timeout: 110s server, 150s client abort

## Analytics Dashboard (Session 4)
- **Dominate tier only** — gated by `analytics_dashboard` entitlement
- **Charts:** Recharts with shadcn/ui wrapper (`src/components/ui/chart.tsx`)
- **API:** `/api/admin/visualizations/trends?days=30` — aggregates daily metrics, room types, modes
- **Page:** `src/app/admin/analytics/` — server component (tier check) + client component (charts)
- **Sidebar:** Auto-hidden for non-Dominate via existing `visibleNavItems` filter

## Mobile Camera Capture (Session 4)
- **Detection:** `useEffect` + `useState(false)` to avoid hydration mismatch
- **Mobile UI:** "Take a Photo" (capture=environment) + "Choose from Gallery" buttons
- **Desktop UI:** Existing drag-and-drop zone unchanged
- **Quality check:** Min 640x640 pixels after compression

## Outreach Pipeline
Automated last-mile outreach after demo builds. Fills Ferdie's exact email template with target data, creates Gmail drafts via Gmail REST API (OAuth2), monitors for sends, and auto-books follow-up calls in Apple Calendar.

- **Scripts:** `scripts/outreach/` — 6 scripts + tests
- **Skill:** `/outreach-pipeline` — create drafts from CLI
- **Rules:** `.claude/rules/outreach.md` — CASL, template integrity, call slots
- **Full docs:** `scripts/outreach/README.md`
- **Tests:** `node scripts/outreach/tests/test-email-template.mjs` (35 tests)
- **Send monitor:** LaunchAgent `com.norbot.send-monitor` (every 15 min, 6am-9pm weekdays)
- **Turso columns:** `demo_url`, `demo_built_at`, `email_draft_id`, `email_message_id`, `follow_up_slot`, `call_script`
- **Status flow:** `demo_built` -> `draft_ready` -> `email_1_sent`

```bash
# Preview email (dry run)
node scripts/outreach/outreach-pipeline.mjs --target-id 42 --dry-run

# Create Gmail draft
node scripts/outreach/outreach-pipeline.mjs --target-id 42

# All ready targets
node scripts/outreach/outreach-pipeline.mjs

# Top 30 by ICP score
node scripts/outreach/rescore-all.mjs --report
```

## Business Constants
HST: 13% • Deposit: 15% • Contingency: 10% • Estimate Variance: ±15%
