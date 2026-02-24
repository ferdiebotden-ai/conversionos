# ConversionOS — Multi-Tenant AI Renovation Platform

White-label AI quoting platform for Ontario renovation contractors. Single codebase, three pricing tiers, environment + domain-driven multi-tenancy.

## Living Product Reference — IMPORTANT
After ANY session where you implement features, fix bugs, modify AI prompts, change database schema, update API routes, or alter handoff mechanisms: update `docs/PRODUCT_REFERENCE.md` to reflect the current state of the product. This is not optional. The document must always match what's actually in the codebase. Use the `/update-product-reference` skill for detailed instructions. Do not treat this as a changelog — rewrite the affected sections to describe the product as it exists now.

## Stack
Next.js 16.1.6 (App Router) • React 19 • TypeScript 5 (strict) • Supabase (PostgreSQL) • Vercel AI SDK v6 • Tailwind v4 • shadcn/ui • Vitest • Playwright

## AI Stack
- **Chat/Vision:** OpenAI GPT-5.2
- **Image generation:** Google Gemini 3 Pro Image
- **Voice agents:** ElevenLabs (Emma, Marcus, Mia personas) — Dominate tier only
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
| Voice agents (web + phone) | — | — | Yes |
| Custom integrations | — | — | Yes |
| Location exclusivity | — | — | Yes |

## Entitlements System
- **`src/lib/entitlements.ts`** — `canAccess(tier, feature)` pure function, `PlanTier` and `Feature` types
- **`src/lib/entitlements.server.ts`** — `getTier()` reads `plan` key from `admin_settings` (defaults to `'accelerate'`)
- **`src/components/tier-provider.tsx`** — `TierProvider` context + `useTier()` hook for client components
- Entitlements gated at: admin layout, sidebar nav, API routes (voice, quotes, invoices, drawings), receptionist widget

## Multi-Tenancy
**Two deployment patterns coexist:**
1. **Per-tenant Vercel projects** (current) — `NEXT_PUBLIC_SITE_ID` env var per project
2. **Single Vercel project + proxy routing** (new) — `src/proxy.ts` resolves tenant from hostname

- `getSiteId()` reads env var (synchronous, 80+ call sites)
- `getSiteIdAsync()` also checks proxy-set `x-site-id` header (for single-project pattern)
- `withSiteId()` helper injects `site_id` into data objects
- All DB queries MUST filter by `site_id` — no exceptions
- `admin_settings` table stores per-tenant: branding, pricing, plan tier
- Never hardcode tenant branding — always read from `admin_settings`
- Dev: `?__site_id=` query param override (dev mode only)

## Key Directories
```
src/app/              — 50+ routes (public pages, admin dashboard, 30+ API endpoints)
  app/admin/          — Admin dashboard (gated: Accelerate+)
  app/admin/analytics/ — Analytics dashboard (Dominate only, Recharts)
  app/api/            — API routes (ai/, admin/, quotes, contact, export, voice)
  app/api/ai/visualize/stream/ — SSE streaming visualization endpoint
  app/visualizer/     — AI renovation visualizer
  app/estimate/       — Estimate request flow
src/components/       — React components
  components/admin/   — Admin UI (dashboard, leads, settings, analytics)
  components/chat/    — AI chat widget
  components/visualizer/ — Renovation visualizer UI
  components/voice/   — Voice agent UI (Dominate only)
  components/ui/      — shadcn/ui primitives + chart wrapper
src/hooks/            — Custom React hooks
  hooks/use-visualization-stream.ts — SSE streaming hook
src/lib/              — Shared utilities
  lib/entitlements.ts — Feature gating by tier
  lib/db/site.ts      — Tenant resolution (env var + proxy header)
  lib/ai/             — AI integrations (personas, knowledge base, config)
  lib/branding.ts     — Server-side branding from admin_settings
src/proxy.ts          — Domain → tenant routing (Next.js 16 proxy)
```

## Deployment
- **Primary pattern:** Single Vercel project with proxy-based domain routing (unlimited tenants)
- **Legacy pattern:** Per-tenant Vercel projects with `NEXT_PUBLIC_SITE_ID` env var (still supported)
- Push to `main` → all tenant projects auto-deploy
- Never create per-tenant branches

## Supabase
- **Demo project:** `ktpfyangnmpwufghgasx` — shared by all demo tenants, isolated by `site_id`
- **Production clients** get their own Supabase project (separate data, separate billing)
- Key tables: `admin_settings`, `leads`, `quotes`, `quote_items`, `invoices`, `drawings`, `tenants`

## Current Tenants
| Site ID | Domain | Tier | Purpose |
|---------|--------|------|---------|
| `demo` | `conversionos-demo.norbotsystems.com` | Accelerate | NorBot base template |
| `mccarty-squared` | `mccarty.norbotsystems.com` | Dominate | McCarty Squared demo |
| `redwhitereno` | `redwhite.norbotsystems.com` | Accelerate | Red White Reno demo |

## Adding a New Tenant

### From Mission Control (primary)
Click **"Build Demo"** on a candidate card in the Pipeline page. Spawns `onboard.mjs` via Claude Code Bridge with real-time output streaming.

### Manual Steps
1. Seed `admin_settings` rows in Supabase: `business_info`, `branding`, `company_profile`, `plan`, pricing keys
2. Add domain → site_id mapping to `DOMAIN_TO_SITE` in `src/proxy.ts`
3. Add domain to Vercel project (or create new Vercel project with `NEXT_PUBLIC_SITE_ID`)
4. Insert into `tenants` table with domain and plan tier
5. Push to `main` → deploy

## Rules
- All DB queries must use `getSiteId()` for tenant isolation
- All new features must be gated with `canAccess(tier, feature)` — never expose to all tiers by default
- Use `useTier()` in client components, `getTier()` in server components/API routes
- Never check `tier === 'dominate'` directly — always use `canAccess()`
- Never hardcode tenant-specific values
- Never create per-tenant branches
- Validate all AI outputs with Zod before rendering or storing

## SSE Streaming Visualization (Session 4)
- **Streaming endpoint:** `/api/ai/visualize/stream` — returns SSE events (status, concept, complete, error)
- **Non-streaming endpoint:** `/api/ai/visualize` — left untouched for backward compatibility
- **Hook:** `useVisualizationStream()` in `src/hooks/use-visualization-stream.ts` — parses SSE via `ReadableStream.getReader()`
- **Progressive reveal:** `GenerationLoading` shows 4 skeleton slots, cross-fades to real images as concepts arrive
- **Parallel generation:** All 4 concepts fire via `Promise.allSettled()` (not batched 2+2)
- **Heartbeat:** `:\n\n` every 15s to keep connection alive
- **Timeout:** 110s server-side emits whatever is ready; 150s client-side abort

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

## Business Constants
HST: 13% • Deposit: 50%
