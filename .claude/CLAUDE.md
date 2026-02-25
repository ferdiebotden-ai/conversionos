# ConversionOS Demo — Multi-Tenant Platform

## Living Product Reference — IMPORTANT
After ANY session where you implement features, fix bugs, modify AI prompts, change database schema, update API routes, or alter handoff mechanisms: update `docs/PRODUCT_REFERENCE.md` to reflect the current state of the product. This is not optional. The document must always match what's actually in the codebase. Use the `/update-product-reference` skill for detailed instructions. Do not treat this as a changelog — rewrite the affected sections to describe the product as it exists now.

## What This Is
ConversionOS is an AI-powered renovation platform sold to Ontario contractors.
Single codebase, three pricing tiers, environment + domain-driven tenancy.

Business: NorBot Systems Inc. | Three tiers: Elevate ($1,500 setup + $249/mo), Accelerate ($4,500 + $699/mo), Dominate ($15,000 + $2,500/mo)
Product: https://dashboard-rho-ten-70.vercel.app (internal pipeline dashboard)
This repo: The platform. One `main` branch serves ALL tenants. Feature gating via entitlements system.

## Architecture
- **Single codebase, single branch** (`main`). NO branches per tenant.
- **Entitlements:** `canAccess(tier, feature)` gates features by plan tier (Elevate/Accelerate/Dominate)
- **Tenant identity:** proxy resolves from hostname → `x-site-id` header, falls back to `NEXT_PUBLIC_SITE_ID` env var
- **Branding:** `admin_settings` table stores per-tenant config (name, colors, contact, pricing, plan tier)
- **UI:** `BrandingProvider` + `TierProvider` contexts feed branding and entitlements to client components
- **Server:** `getBranding()` for SSR, `getTier()` for entitlement checks
- **Deploy:** Single Vercel project with proxy routing (or legacy per-tenant projects)

## Adding a New Tenant

### From Mission Control (primary — Feb 2026)
Click **"Build Demo"** on any candidate card in the Pipeline page. This spawns the onboarding pipeline via Claude Code Bridge WebSocket with real-time streaming output in the BuildProgressPanel.

### From CLI / Telegram (alternative)
Use the `/onboard-tenant` skill or run the pipeline directly:
```bash
/onboard-tenant {site-id} {url} {tier}
# or
node scripts/onboarding/onboard.mjs --url {url} --site-id {site-id} --domain {site-id}.norbotsystems.com --tier {tier}
```
Pipeline: score → scrape → upload images → provision DB → verify. Checkpoints in `/tmp/onboarding/{site-id}/`. See `ONBOARDING_HANDOFF.md` for full details and prerequisites.

### Manual (fallback)
1. Seed `admin_settings` rows: `business_info`, `branding`, `company_profile`, `plan`, pricing keys
2. Add domain → site_id mapping to `DOMAIN_TO_SITE` in `src/proxy.ts`
3. Add domain to Vercel project (or create new project with `NEXT_PUBLIC_SITE_ID`)
4. Insert into `tenants` table with domain and plan tier
5. Optionally duplicate ElevenLabs voice agents for Dominate-tier tenants
6. Push to `main` → deploy

## Onboarding Pipeline
- **Scripts:** `scripts/onboarding/` — 9 scripts (score, scrape, schema, convert-color, upload-images, provision, onboard, verify, README)
- **Skill:** `.claude/skills/onboard-tenant/SKILL.md` — invokable as `/onboard-tenant`
- **Dependencies:** `@mendable/firecrawl-js`, `culori` (devDeps)
- **Env vars needed:** `FIRECRAWL_API_KEY`, `OPENAI_API_KEY` (in `~/pipeline/scripts/.env`), `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (in `.env.local`)
- **Cost:** ~$0.07/tenant
- **Handoff report:** `ONBOARDING_HANDOFF.md` (prerequisites, test plan, file inventory)

## ElevenLabs Voice Agent
- **Single persona: Emma** — one ElevenLabs agent per tenant, context-aware via PageContext
- **Voice (web) on ALL tiers** — voice toggle visible on Elevate/Accelerate/Dominate. Elevate has mandatory pricing deflection.
- **Voice (phone/Twilio) Dominate only** — `voice_phone` entitlement
- Dynamic prompts: `buildVoiceSystemPrompt(context)` server-side, passed as session override via ElevenLabs SDK
- Each tenant can have duplicated agents via `POST /v1/convai/agents/{id}/duplicate`
- Single env var: `ELEVENLABS_AGENT_EMMA` per Vercel project

## Gemini Image Generation
- Model: `gemini-3-pro-image-preview` (configured in `src/lib/ai/gemini.ts`)
- Script: `scripts/generate-image.mjs` — reusable, takes prompt + output path
- Every image must be stunning. These demos replace real contractor websites.

## Quality Standard
Each demo must feel hand-built for the target. NOT cookie-cutter.
- Match the target's brand aesthetic (colors, tone, visual style)
- Use exact quotes from their testimonials (never paraphrase)
- Reflect their actual services, certifications, and unique selling points
- AI persona prompts must reference real staff names, real services, real location

## Quote Assistance System (New — Session 1)
- **Per-tenant setting** stored as `quote_assistance` key in `admin_settings`
- **Three modes:** `none` (no pricing shown), `range` (cost ranges), `estimate` (point estimate)
- **Elevate:** Always `none` (hardcoded — no admin dashboard)
- **Accelerate/Dominate default:** `{ mode: 'range', rangeBand: 10000 }`
- **Helper:** `getQuoteAssistanceConfig(tier?)` in `src/lib/quote-assistance.ts`
- **Admin UI:** "Quoting" tab in Settings page (mode dropdown + range band selector)
- **Emma awareness:** Handoff context includes `quoteAssistanceMode` — Emma adapts pricing discussion accordingly

## Context Pipeline (New — Session 1)
- `HandoffContext` now includes `photoAnalysis`, `costSignals`, `quoteAssistanceMode`, `voiceExtractedPreferences`
- `buildHandoffPromptPrefix()` injects structural data, voice preferences, cost signals, and pricing mode into Emma's estimate context prompt
- `visualizer-form.tsx` serialises full photo analysis + voice extracted preferences in handoff
- `visualize/route.ts` writes `conversation_context` JSONB with designIntent + voice data for ALL tiers (silent capture)
- Photo analysis cached by image hash (FNV-1a, 10min TTL)

## Ontario Pricing Database (New — Session 2)
- **Typed data:** `src/lib/ai/knowledge/pricing-data.ts` — 14 trade rates, 50+ material costs, 9 regional multipliers, 8 room types
- **Pure functions:** `calculateCostEstimate()`, `snapToRangeBand()`, `formatCAD()`, `getMaterialsForRoom()` — all client-safe, no DB calls
- **AI prompts:** `PRICING_FULL` and `PRICING_SUMMARY` in `pricing.ts` are auto-generated from typed data (backward compatible)
- **Cost range indicator:** `src/components/visualizer/cost-range-indicator.tsx` — tier + mode gated, fetches config from `/api/admin/quote-assistance`

## Concept Pricing & Descriptions (New — Session 2)
- **Module:** `src/lib/ai/concept-pricing.ts`
- **`generateConceptDescriptions()`** — batched GPT-5.2 call, runs before response, enriches concept descriptions
- **`analyzeConceptForPricing()`** — GPT-5.2 vision identifies materials in generated images, prices from Ontario DB
- Pricing analysis runs fire-and-forget, stored as `concept_pricing` JSONB on visualization record (all tiers)
- Uses `(supabase.from() as any)` pattern since `concept_pricing` column may not be in generated types

## Tier-Aware Visualizer CTAs (New — Session 3)
- **Elevate:** "Request a Callback from [Contractor Name]" → `/contact?from=visualizer` (no estimate handoff)
- **Accelerate+:** "Get a Personalised Estimate" → estimate page handoff with full context
- Gated by `canAccess('ai_quote_engine')` — Elevate doesn't have this entitlement
- Sticky CTA bar also adapts per tier
- "Try Another Style" button keeps photo + room type, resets style/preferences

## Photo Pre-Analysis (New — Session 3)
- **Endpoint:** `/api/ai/analyze-photo` — runs GPT Vision on upload before room type selection
- Fires in `runPhotoAnalysis()` callback immediately after photo upload
- Pre-fills room type selector from analysis result
- `PhotoSummaryBar` shows "Analysing photo..." indicator during analysis
- Analysis result cached and reused by the generation endpoint (avoids duplicate analysis)

## Homepage Enhancements (New — Session 3)
- **Project selector:** `src/components/home/project-selector.tsx` — "What are you planning?" intent widget between hero and AI Features
- **Visualizer teaser:** `src/components/home/visualizer-teaser.tsx` — interactive before/after slider with sample transformations
- **Hero CTA:** Changed "Get a Free Quote" to "Get Your Estimate in Minutes" — communicates AI speed advantage

## SSE Streaming Visualization (New — Session 4)
- **Streaming endpoint:** `/api/ai/visualize/stream` — SSE events (status, concept, complete, error)
- **Non-streaming endpoint:** `/api/ai/visualize` — untouched for backward compatibility
- **Hook:** `useVisualizationStream()` in `src/hooks/use-visualization-stream.ts`
- **Progressive reveal:** `GenerationLoading` shows 4 skeleton slots → cross-fades to real images
- **Parallel generation:** All 4 concepts via `Promise.allSettled()` (not batched)
- **Protocol:** `event: <type>\ndata: <json>\n\n` — heartbeat `:\n\n` every 15s
- **Timeouts:** 110s server-side (emit what's ready), 150s client-side abort

## Mobile Camera Capture (New — Session 4)
- **Detection:** `useEffect` + `useState(false)` — avoids hydration mismatch
- **Mobile UI:** "Take a Photo" (`capture="environment"`) + "Choose from Gallery" buttons
- **Desktop:** Existing drag-and-drop unchanged
- **Quality check:** Min 640x640px after compression
- **Mobile tip:** Single line replacing desktop tips list

## Analytics Dashboard (New — Session 4)
- **Dominate only** — gated by `analytics_dashboard` entitlement
- **Charts:** Recharts + shadcn/ui wrapper (`src/components/ui/chart.tsx`, CSS vars `--chart-1` to `--chart-5`)
- **API:** `/api/admin/visualizations/trends?days=30`
- **Page:** `src/app/admin/analytics/` — server component (tier check) + client component (Recharts)
- **Sidebar:** `BarChart3` icon, auto-hidden for non-Dominate

## Admin Enhancements (New — Session 4)
- **Concept pricing panel:** Collapsible "AI Cost Analysis" in lead visualization — finish level, materials table, cost summary
- **Feasibility distribution:** Mini bar chart (scores 1-5) in metrics widget
- **Feasibility badges:** Colour-coded dots on leads table (green 4-5, yellow 3, red 1-2, grey unscored)

## Implementation Tracking
- **Status doc:** `docs/IMPLEMENTATION_STATUS.md` — tracks all 6 phases
- **Multi-session:** Each session reads this file first to pick up where the last left off
- **Current:** ALL 6 PHASES COMPLETE (Sessions 1-4)

## Gotchas
- Write tool creates CRLF on macOS — fix shell scripts: `perl -pi -e 's/\r\n/\n/g'`
- Vercel env vars: use API (curl), NOT `echo | vercel env add` (adds newline)
- Primary color uses OKLCH: `--primary: oklch(...)` in `globals.css`
- Admin header: uses User icon, not initials
- `getSiteId()` is synchronous (env var only) — do NOT make async (80+ call sites)
- `getSiteIdAsync()` exists for new code that needs proxy header support
