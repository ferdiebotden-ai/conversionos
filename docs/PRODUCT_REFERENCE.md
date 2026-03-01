# ConversionOS — Product Reference

**Last updated:** March 1, 2026

---

## Platform Overview

White-label AI renovation platform for Ontario contractors. Single codebase, three pricing tiers, environment + domain-driven multi-tenancy. Core loop: **visualize → capture context → quote with context → contractor sees what homeowner visualized.**

**Company:** NorBot Systems Inc. (Stratford, Ontario) | **CEO:** Ferdie Botden
**Target:** Ontario residential renovation contractors | **Model:** SaaS with territory exclusivity at top tier

---

## Pricing Tiers

| | Elevate | Accelerate | Dominate |
|---|---|---|---|
| **Setup** | $1,500 | $4,500 | $20,000 |
| **Monthly** | $249/mo | $699/mo | $2,500/mo |
| **Positioning** | Entry-level branded website with AI visualizer | Full AI quoting platform (default outreach tier) | Exclusive territory ownership + founder-led growth |
| **Target buyer** | Smaller contractors wanting a modern web presence | Mid-size contractors ready for AI-powered quoting | Premium contractors who want market dominance |

### Feature Map

| Feature | Elevate | Accelerate | Dominate |
|---------|:---:|:---:|:---:|
| Branded website (all public pages) | Yes | Yes | Yes |
| AI Visualizer (4 concepts, SSE streaming) | Yes | Yes | Yes |
| Concept starring + email favourites | Yes | Yes | Yes |
| Lead capture + email notification | Yes | Yes | Yes |
| Emma text chat widget | Yes | Yes | Yes |
| Photo pre-analysis (GPT Vision at upload) | Yes | Yes | Yes |
| Mobile camera capture | Yes | Yes | Yes |
| Admin Dashboard | — | Yes | Yes |
| AI Quote Engine | — | Yes | Yes |
| PDF quotes (multi-page: cover, photos, items, tiers, terms+signature) | — | Yes | Yes |
| E-signature (public acceptance page, token-gated) | — | Yes | Yes |
| Quote versioning (snapshot on send, version history) | — | Yes | Yes |
| Contractor lead intake (voice dictation, text, form) | — | Yes | Yes |
| Invoicing + payment tracking (Create Invoice from quote) | — | Yes | Yes |
| Architecture drawings management | — | Yes | Yes |
| Live design refinement (chat re-renders starred concept) | — | Yes | Yes |
| Cost range indicator (visualizer) | — | Yes | Yes |
| Quote assistance (admin-configurable) | — | Yes | Yes |
| CSV price upload (contractor's own pricing) | — | Yes | Yes |
| Assembly templates (reusable line item bundles) | — | Yes | Yes |
| Voice agent (Emma via ElevenLabs, web) | Yes | Yes | Yes |
| Voice agent (phone/Twilio) | — | — | Yes |
| Analytics dashboard (Recharts) | — | — | Yes |
| Concept pricing analysis (GPT Vision + Ontario DB) | — | — | Yes |
| Custom integrations | — | — | Yes |
| Location exclusivity (1 contractor/territory) | — | — | Yes |

Feature gating: `canAccess(tier, feature)` in `src/lib/entitlements.ts`. Server: `getTier()`. Client: `useTier()` hook.

---

## Tech Stack

**Framework:** Next.js 16.1.6 (App Router, Turbopack dev, `proxy.ts` tenant routing) • React 19 • TypeScript 5 (strict) • Tailwind v4 (OKLCH) • shadcn/ui • Zustand 5 • Framer Motion
**AI:** OpenAI GPT-5.2 (chat, vision, quotes, extraction) • Gemini 3.1 Flash Image / Nano Banana 2 (4 concepts/gen) • ElevenLabs (voice, all tiers web) • Vercel AI SDK v6 • Zod validation on all AI outputs
**Data:** Supabase PostgreSQL (ca-central-1, RLS) • Supabase Storage • Resend (email) • Upstash Redis (rate limiting)
**Quality:** Sentry (`norbot-systems-inc/javascript-nextjs`) • Vitest (859 unit tests) • Playwright (8 E2E suites) • Husky + lint-staged
**PDF:** @react-pdf/renderer (multi-page quotes) + jspdf (invoices) • Sharp (image processing) • heic2any (iOS)

---

## Multi-Tenancy Architecture

ConversionOS is a single codebase serving unlimited contractors. Every contractor gets their own branded experience — company name, colours, logo, services, testimonials, contact information — all driven by database configuration. No per-tenant code branches exist.

### How Tenant Identity Works

1. **Domain routing:** `src/proxy.ts` maps hostnames to `site_id` values. When a request arrives for `mccarty.norbotsystems.com`, the proxy sets an `x-site-id: mccarty-squared` header.
2. **Environment fallback:** If no proxy mapping matches, `NEXT_PUBLIC_SITE_ID` env var provides the default (used in per-tenant Vercel deployments).
3. **Dev override:** `?__site_id=demo` query parameter in development mode.

### Data Isolation

Every database table includes a `site_id` column. Every query filters by it. Row-Level Security (RLS) policies enforce this at the database level. There is no way for Tenant A to see Tenant B's leads, quotes, or visualizations.

### Branding

The `admin_settings` table stores per-tenant JSONB configuration under keys like `business_info`, `branding`, `company_profile`, and `plan`. Server-side rendering reads this via `getBranding()`. Client components receive it through `BrandingProvider` + `useBranding()` context. CSS variables (including the primary colour in OKLCH) are injected in the root layout. Tenants with a `logoUrl` in their branding config render an SVG logo in the header and footer; tenants without fall back to styled text.

### Current Tenants

| Site ID | Domain | Tier | Contractor |
|---------|--------|------|------------|
| `demo` | conversionos-demo.norbotsystems.com | Accelerate | ConversionOS Demo (NorBot Systems base template) |
| `mccarty-squared` | mccarty.norbotsystems.com | Dominate | McCarty Squared (real client demo) |
| `redwhitereno` | redwhite.norbotsystems.com | Accelerate | Red White Reno (first paying customer) |

---

## User Journeys

### Homeowner Journey (Unified Design Studio)

The entire homeowner journey now happens on a single page (`/visualizer`) — no navigation between separate estimate/visualizer pages. The `/estimate` route redirects to `/visualizer`.

1. **Homepage** (`/`) — DB-driven branded page: Hero → Social Proof Bar → Visualizer Teaser (before/after slider) → Services → How It Works → Why Us → Testimonials → CTA. Sticky mobile CTA bar < 768px. All CTAs adapt via copy system (tier + quote mode) and route to `/visualizer` (quotes on) or `/contact` (quotes off).
2. **Capture** (`/visualizer`) — Upload photo (drag-drop desktop, camera/gallery mobile). GPT Vision pre-analysis fires at upload (room type, dimensions, fixtures, condition). 8 room types × 6 styles. Optional voice input via Emma. Transition message ("Thank you for sharing your vision — let me bring it to life.") before generation.
3. **Create** — SSE streaming, 4 Gemini concepts in parallel (~41s). Progressive reveal with skeleton cards.
4. **Refine** — Before/after slider (max 480px height on desktop), AI-enriched descriptions, cost range (Accelerate+). **Concept starring:** gold star toggle on each thumbnail. **Design Studio Chat** (inline Emma chat below results) with quick action pill buttons: "Refine My Design", "Keep Discussing", "Get My Estimate" (Accelerate+) / "Email My Designs" (Elevate). Refinements replace starred concept in-place with crossfade. Max 3 refinements — "Refine" button silently disappears after 3rd (no counter, no warning). Emma's prompt is purpose-built for the Design Studio context via `buildDesignStudioPrompt()`.
5. **Connect** — Inline lead capture form (not modal, not new page) slides in below chat: name, email, phone, timeline. Tier-aware: Accelerate+ captures for AI quote generation, Elevate captures for callback. Success state with contractor-specific messaging. Sticky CTA bar hidden after submission.

### Contractor (Admin) Journey

1. **Dashboard** (`/admin`) — Leads overview, visualization metrics, pipeline health
2. **Leads** (`/admin/leads`) — Table with feasibility badges, source badges (Intake/Website), "+ New Lead" intake dialog (voice dictation/text/form, Accelerate+)
3. **Quotes** (`/admin/quotes`) — Full AI quote engine (see Quote Engine V2 section). "Create Invoice" button appears when quote is sent — creates invoice directly from quote items via `POST /api/invoices` and navigates to invoice detail.
4. **Invoices** (`/admin/invoices`) — Create from quotes (via "Create Invoice" button on Quote tab), payment tracking, PDF, 4-step send wizard (review → preview PDF → compose email → confirm), Sage 50 CSV export
5. **Drawings** (`/admin/drawings`) — CAD-style drawing management
6. **Settings** (`/admin/settings`) — Business info, branding, pricing, quote assistance mode, category markups, price list (CSV), templates, live preview
7. **Analytics** (`/admin/analytics`, Dominate only) — Recharts: daily trends, room types, generation times, conversions

---

## AI Agent — Emma

### Single Persona, Page-Context Architecture

ConversionOS uses a single AI persona — **Emma** — across all pages. Emma adapts her expertise based on which page the homeowner is browsing. A `PageContext` value (`'general'` | `'estimate'` | `'visualizer'`) determines which knowledge layers are injected into her system prompt.

**Powered by:** GPT-5.2 via Vercel AI SDK streaming (text). ElevenLabs Conversational AI (voice, all tiers).

**Personality:** Warm, concise (2-3 sentences max), conversational. Uses contractions and casual language. Never info-dumps. On the estimate page, she is more structured and confident about pricing. On the visualizer page, she is more creative and enthusiastic about design.

**Available to:** All tiers (text + voice). Elevate tier has pricing deflection — Emma never discusses dollar amounts and routes pricing questions to `/contact` for a callback. Phone/Twilio voice is Dominate only (future feature).

### Page-Context Knowledge

| PageContext | Pages | Emma's Role | Knowledge |
|-------------|-------|-------------|-----------|
| `general` | Homepage, About, Services, Contact | Receptionist | Company profile, services, Ontario knowledge. Elevate: routes to `/contact` |
| `estimate` | `/visualizer` (Design Studio chat) | Quote specialist | Full Ontario pricing DB (14 trades, 50+ materials, 9 regions), handoff context |
| `visualizer` | `/visualizer` (pre-generation) | Design consultant | Style descriptions, materials, renovation trends |

### Context Pipeline

Design Studio chat receives all context in-memory (same page): photo analysis (GPT Vision), design preferences, cost signals (Ontario DB), quote assistance mode, starred concepts, concept pricing. Emma skips discovery and goes straight to refinement. The `buildDesignStudioPrompt()` function in `src/lib/ai/personas/emma.ts` assembles the full system prompt with room analysis, design preferences, starred concepts, pricing data, and tier-specific pricing rules. Context also available via DB-backed `buildHandoffFromVisualization()` for the estimate resume flow.

### Voice (All Tiers — Web)

Single ElevenLabs agent per tenant, dynamic prompts via session overrides based on PageContext. Elevate tier has mandatory pricing deflection. Phone/Twilio is Dominate only (future, `voice_phone` entitlement).

### Prompt Layers

1. Persona identity → 2. Company knowledge (from DB) → 3. Page-context knowledge → 4. Sales training → 5. Dynamic keyword injection → 6. Elevate pricing deflection → 7. Handoff context. CTA markers `[CTA:Label:/path]` render as clickable buttons.

---

## AI Visualization Pipeline

### Photo Analysis (GPT-5.2 Vision)

Fires at upload time. Detects room type, layout, dimensions, ceiling height, fixtures, structural elements, condition. Cached by FNV-1a hash (10-min TTL). Auto-fills room type selector and reused by generation.

### Image Generation (Nano Banana 2 — Gemini 3.1 Flash Image)

`gemini-3.1-flash-image-preview` → 4 concepts at 2048x2048. Pro-level quality at 2-3x faster generation, ~25% cheaper. Structure preservation: 0.90, style application: 0.40. Pipeline: compressed photo → 6-part prompt → 4 parallel Gemini calls → Supabase Storage → SSE events → GPT-5.2 description enrichment → concept pricing analysis (fire-and-forget). Timeouts: 75s/concept, 110s server total, 150s client abort.

### SSE Streaming

`POST /api/ai/visualize/stream` — events: `status`, `concept`, `complete`, `error`. Heartbeat `:\n\n` every 15s. Client: `useVisualizationStream()` via `ReadableStream.getReader()`. Headers: `X-Accel-Buffering: no`, `Content-Encoding: none`.

The non-streaming endpoint (`POST /api/ai/visualize`) remains available for backward compatibility.

### Concept Starring + Email Favourites (All Tiers)

Customers can star/favourite individual concepts on the visualizer results page and email starred concepts to themselves.

**UI components:**
- **Star toggle:** `src/components/visualizer/concept-thumbnails.tsx` — gold star overlay (top-right) on each concept thumbnail. Hollow star (unstarred) → filled gold star (starred). `favouritedIndices: Set<number>` tracked in parent.
- **Email button:** `src/components/visualizer/result-display.tsx` — "Email My Designs" + "Try Another Style" side by side in action row.
- **Email capture:** `src/components/visualizer/email-capture-modal.tsx` — simplified to email-only: title "Email Your Designs", subtitle, email field, "Send to My Email" button, consent footer. No download button, marketing checkbox, or skip.
- **Admin indicator:** `src/components/admin/lead-visualization-panel.tsx` — gold star badge on concept thumbnails the customer favourited (reads `client_favourited_concepts` from visualization record).
- **Share API:** `POST /api/visualizations/[id]/share` — emails selected concepts to the customer.
- **Handoff:** `clientFavouritedConcepts: number[]` in `HandoffContext` (`src/lib/chat/handoff.ts`). Serialized from visualizer form, reconstructed from DB via `buildHandoffFromVisualization()`. Emma's prompt includes "The customer favourited: Concept 1, Concept 3".

### Design Studio Chat (Inline Refinement)

After concepts generate, an inline Emma chat appears below the results with quick action pill buttons. This replaces the previous separate `/estimate` page — the entire flow happens on `/visualizer`.

**Component:** `src/components/visualizer/design-studio-chat.tsx` (~280 lines). Purpose-built inline chat, NOT a reuse of `ChatInterface`. Uses `useChat()` from Vercel AI SDK v6 with `DefaultChatTransport`.

**Quick action buttons:** Rendered as pill buttons below Emma's messages. They guide without pressuring — no counters, no "2 refinements remaining" anxiety.

| After | Buttons |
|-------|---------|
| Concepts generate | "Refine My Design" + "Keep Discussing" + "Get My Estimate" (or "Email My Designs" for Elevate) |
| A refinement | "Refine Again" + "Keep Discussing" + CTA |
| 3rd refinement | CTA only + "I Have More Questions" (Refine button silently disappears) |

**When clicked:**
- **Refine My Design:** Triggers `/api/ai/visualize/refine` with starred concept + accumulated design signals. Crossfade updates the concept image in-place.
- **Keep Discussing:** Focuses the chat input.
- **Get My Estimate:** Scrolls to inline lead capture form (see Lead Capture Form section).
- **Email My Designs:** Opens simplified email capture modal.

**Design Studio prompt:** `buildDesignStudioPrompt()` in `src/lib/ai/personas/emma.ts` — assembles: base Emma persona, room analysis, design preferences, starred concepts, concept pricing, tier-specific pricing rules. Passed as `systemPromptOverride` through the chat API route.

**Signal detection:** `src/lib/ai/rendering-gate.ts` — keyword-based scoring across six categories: material (25pts), structural (25pts), finish (15pts), budget (15pts), dimensions (10pts), scope (10pts). Signals accumulated from conversation, used when user clicks "Refine My Design".

**Refinement API:** `POST /api/ai/visualize/refine` — re-generates the starred concept using Gemini multi-image reference (original photo for geometry, starred concept for aesthetic direction). Zod-validated. Max 3 refinements per session.

**Cost:** ~$0.10 per refinement (Gemini image generation), max $0.30/session (3 refinements). ~$0.03 for Emma chat (~5 exchanges).

### Inline Lead Capture Form

**Component:** `src/components/visualizer/lead-capture-form.tsx` (~200 lines). Slides into view below the chat when user clicks "Get My Estimate" — NOT a modal. Concepts and chat remain visible above.

**Fields:** Name (required), Email (required), Phone (optional), Timeline (select: "Within 3 months" / "3-6 months" / "6-12 months" / "Just exploring").

**On submit:** POST to `/api/leads` with project type from photo analysis, area estimate, timeline, and visualization ID. Success state: checkmark animation, tier-aware messaging ("Your estimate is on its way!" for Accelerate+, "[Contractor] will be in touch shortly!" for Elevate). Trust signal: "Your details are shared only with [Contractor Name]."

**Sticky CTA bar:** Hidden after successful lead submission.

### Legacy Rendering Panel

The previous rendering panel (`src/components/chat/rendering-panel.tsx`) and separate `/estimate` chat (`src/components/chat/chat-interface.tsx`) still exist for the `/estimate/resume` flow but the primary path is now the inline Design Studio Chat.

---

## Ontario Pricing Database

`src/lib/ai/knowledge/pricing-data.ts` — typed, client-safe. 14 trade rates, 50+ material costs, 9 regional multipliers, 8 room type estimates. Pure functions: `calculateCostEstimate()`, `snapToRangeBand()`, `formatCAD()`, `getMaterialsForRoom()`. Auto-generated `PRICING_FULL`/`PRICING_SUMMARY` constants injected into Emma's prompt.

---

## Quote Assistance System

Per-tenant `quote_assistance` key in `admin_settings`: `{ mode: 'none' | 'range' | 'estimate', rangeBand?: number }`. Elevate always `none`. Default: `{ mode: 'range', rangeBand: 10000 }`. Admin UI: Settings → Quoting tab. Mode read fresh on every chat message — mid-conversation changes take immediate effect.

### Adaptive Website Copy

All CTAs and copy adapt to **tier + quote mode** via a centralised copy registry (`src/lib/copy/site-copy.ts` — 20 pure functions). Core logic: `hasQuotes(ctx)` = has `ai_quote_engine` AND `quoteMode !== 'none'`. When false, all estimate/quote copy becomes "Contact Us" / `/contact`. Affects 19 components across all pages. Client: `useCopyContext()`. Server: `getCopyContext()`. Cache invalidation: `revalidatePath('/', 'layout')` after admin settings save. DB content uses mode-neutral language; copy registry handles dynamic adaptation.

---

## Quote Engine V2

The AI quote engine generates structured, transparent quotes with full cost breakdowns. Six integrated subsystems work together: transparency cards, per-category markups, Good/Better/Best tiers, scope gap detection, contractor price upload (CSV), and assembly templates.

### Transparency Cards ("Show the Math")

Every AI-generated line item includes a `transparencyData` object validated by `TransparencyBreakdownSchema` (`src/lib/schemas/transparency.ts`). Fields:

| Field | Type | Description |
|-------|------|-------------|
| `roomAnalysis` | string | What room features informed this item ("L-shaped kitchen, ~120 sqft") |
| `materialSelection` | string | Quality level and reasoning ("Mid-range Shaker maple cabinets") |
| `costBreakdown` | CostLine[] | Itemised math: label, quantity, unit, unitCost, total, source |
| `markupApplied` | MarkupApplied | Category markup: percent, amount, label |
| `dataSource` | string | "Ontario Renovation Pricing Database" |
| `totalBeforeMarkup` | number | Sum of cost breakdown |
| `totalAfterMarkup` | number | After markup applied |

**Cost sources:** `ontario_db` (Ontario pricing database), `contractor_uploaded` (tenant-specific rates), `ai_estimate` (AI-derived when no DB match).

**UI component:** `TransparencyCard` (`src/components/admin/transparency-card.tsx`) — animated expand/collapse card below line item row. Sections: room analysis, material selection, cost breakdown table, markup badge, data source badge, total. Toggle via Info icon button on each AI line item. Mobile: full width with horizontal scroll on cost table.

**AI prompt enrichment:** The system prompt in `quote-generation.ts` injects the full Ontario pricing database (`PRICING_FULL` from `src/lib/ai/knowledge/pricing.ts`) and material references filtered by project type via `getMaterialsForRoom()`. When the contractor has uploaded their own price list (CSV), `buildContractorPricesSection()` injects up to 100 contractor prices grouped by category, instructing the AI to prioritise them over Ontario DB defaults. The AI references actual Ontario DB or contractor rates in every cost breakdown line. `maxOutputTokens` increased to 4096 for transparency data.

### Per-Category Markup Controls

Seven configurable markup categories replace the single contract markup field. Module: `src/lib/pricing/category-markups.ts`.

| Category | Default Markup | Computed Margin |
|----------|---------------|-----------------|
| Materials | 15% | 13.0% |
| Labour | 30% | 23.1% |
| Contract Labour | 15% | 13.0% |
| Equipment | 10% | 9.1% |
| Permits | 0% | 0.0% |
| Allowances | 0% | 0.0% |
| Other | 10% | 9.1% |

**Pure functions:** `markupToMargin(percent)` converts markup to margin. `applyMarkup(cost, percent)` applies markup. `getMarkupForCategory(category, config)` resolves category to markup percent.

**Admin UI:** `CategoryMarkupSettings` component (`src/components/admin/category-markup-settings.tsx`) renders in the Rates & Defaults tab of Settings. Number inputs (0-100) per category with real-time margin calculation. Info tooltip explains markup vs margin.

**Settings storage:** `category_markups` key in `admin_settings` table (JSONB). Loaded by `getTier()` flow and injected into AI prompt so the AI applies correct markups per category.

**Line item enrichment:** Each `LineItem` now carries optional `costBeforeMarkup` and `markupPercent` fields, populated by the AI and shown in transparency cards.

### Good/Better/Best Tiers

Single AI call generates three pricing tiers with different materials, descriptions, and price points. Schema: `AITieredQuoteSchema` in `src/lib/schemas/ai-quote.ts`.

**Tier definitions:**
- **Good** — Economy finish, stock materials, builder-grade fixtures
- **Better** — Standard mid-range (RECOMMENDED). 20-30% above Good.
- **Best** — Premium, designer-grade, custom finishes. 40-60% above Good.

Each tier includes: label, description, finishLevel, and full `AIQuoteLineItemSchema[]` with transparency data. Shared fields (assumptions, exclusions, professionalNotes, overallConfidence, calculationSummary) are at the top level.

**AI generation:** `generateTieredAIQuote()` and `regenerateTieredAIQuote()` in `src/lib/ai/quote-generation.ts`. `maxOutputTokens: 6144` for three tiers with transparency data. API route: `POST /api/quotes/[leadId]/regenerate` with `tiered: true`.

**Quote editor state:** `tierMode` (`'single' | 'tiered'`), `activeTier` (`'good' | 'better' | 'best'`), `tieredLineItems` (backing store for all three tiers). Toggle button group above the AI info banner. `lineItems` always reflects the currently active tier. Switching tiers saves current items before loading the new tier.

**TierComparison component:** `src/components/admin/tier-comparison.tsx` — 3-column clickable bar showing each tier's label, item count, total, and percentage above Good. Better column has primary border and "Recommended" badge. Clicking a tier switches the active view.

**Save logic:** When tiered, `tier_good`, `tier_better`, `tier_best` (JSONB) are saved to the `quote_drafts` table. `tier_mode` is NOT stored in the database — it is inferred on read from whether `tier_good`/`tier_better`/`tier_best` arrays are present. `line_items` always holds Better tier items for backward compatibility with PDF/email flows.

**Send wizard:** When tiered, the Review step shows all three tier totals (with HST) instead of a single total. Better marked as "Recommended".

**PDF template:** When tiered, a "Pricing Options" comparison page is inserted after the categorised line items page showing all three tiers with labels, totals (including HST), item summaries, and "RECOMMENDED" label on Better.

### Scope Gap Detection

`src/lib/ai/scope-gap-rules.ts` — 20+ pure rules by project type (bathroom, kitchen, basement, general). Zero API cost. Detects missing items like waterproofing membranes, exhaust fans, demolition, permits, subfloor prep, egress windows. Each rule: severity (warning/info), estimated cost range, suggested line item. UI: `ScopeGapRecommendations` with "Add" buttons. Runs via `useMemo` whenever line items change.

### Multi-Page PDF

`@react-pdf/renderer`. Pages: cover (logo, company info, quote ref, customer info) → before/after photos (conditional) → categorised line items (grouped, no unit prices, subtotals) → tier comparison (conditional) → terms + signature block. "Page X of Y" footer. Shared utils in `src/lib/pdf/`. Note: react-pdf `Image` doesn't support SVG — logo falls back to text.

### E-Signature Acceptance

Public `/quote/accept/[token]` page — 24-char token generated on quote send. States: loading, pending (approval form), accepted, expired, not_found. On acceptance: lead status → `'won'`, logged to audit. DB columns on `quote_drafts`: `acceptance_token`, `acceptance_status`, `accepted_at`, `accepted_by_name`, `accepted_by_ip`. Migration: `20260227000000_e_signature.sql`.

### Quote Versioning

On send: current row frozen (`sent_at`), new draft created at `version + 1`. `QuoteVersionHistory` chip bar — old versions read-only, latest draft editable. API: `GET /api/quotes/[leadId]/versions`.

### Contractor Lead Intake

"+ New Lead" on leads page (Accelerate+). 3-tab dialog: Dictate (MediaRecorder → Whisper `gpt-4o-mini-transcribe`), Type/Paste, Form. GPT-4o-mini extracts structured fields from raw notes. Leads tagged: `created_by: 'contractor'`, `intake_method`, `source: 'contractor_intake'`. Source-aware email generation. Migration: `20260227100000_contractor_intake.sql`.

### CSV Price Upload

Settings → "Price List" tab. Drag-drop CSV, preview, full-replace semantics. Format: `item_name`, `category`, `unit`, `unit_price`, `supplier`. AI prioritises contractor prices via `buildContractorPricesSection()`. Fuzzy matching (Levenshtein, threshold 3) for "Using your prices" badge. Migration: `20260228000000_contractor_prices.sql`.

### Assembly Templates

Settings → "Templates" tab. Reusable line item bundles with CRUD interface. 10 default Ontario templates (Kitchen Demo, Cabinetry, Bathroom Rough-In, Tile, Basement Framing, Drywall, Hardwood, Electrical, Exterior Paint, Permits). "Insert Template" in quote editor. Items tagged `isFromTemplate: true`. Migration: `20260228100000_assembly_templates.sql`.

### Undo/Redo

Zustand store (`src/stores/quote-editor-store.ts`) with history-manager pattern (50-entry cap, JSON snapshots). Undoable: line items, tiers, assumptions, exclusions, contingency. `Cmd+Z`/`Shift+Cmd+Z`. 1s debounce for text, immediate push for structural changes.

### Mobile Card Layout

Below 768px, line items render as cards instead of table. `useMediaQuery` hook (`useSyncExternalStore`, SSR-safe). Cards: collapsed (category badge, total, description, qty×price) → tap to expand (2-column edit grid, "Done" button). 40px min touch targets.

### Settings Live Preview

Eye toggle in settings header opens iframe side panel (`/?__preview=1`). `postMessage` with 500ms debounce sends branding changes. `BrandingProvider` listens when inside iframe. Viewport selector: Desktop/Tablet/Mobile.

---

## Database Schema

**Supabase project:** ktpfyangnmpwufghgasx (ca-central-1). All tables have `site_id` + RLS.

**14 tables:** `admin_settings` (per-tenant JSONB config), `leads` (CRM with contractor intake fields), `quote_drafts` (versioned, tiered, e-signature), `contractor_prices` (CSV upload), `assembly_templates` (reusable bundles), `visualizations` (concepts + metrics), `lead_visualizations` (junction), `invoices`, `payments`, `drawings`, `chat_sessions` (7-day expiry), `audit_log`, `visualization_metrics`, `invoice_sequences`.

**Key notes:** Tier mode inferred from presence of `tier_good`/`tier_better`/`tier_best` arrays (not stored as column). `acceptance_token` is unique 24-char for e-signature. Invoice auto-numbering via `next_invoice_number()` function.

---

## API Routes (49 endpoints)

| Group | Count | Key Routes |
|-------|-------|------------|
| **AI** | 8 | `/api/ai/chat` (streaming), `/api/ai/visualize/stream` (SSE), `/api/ai/visualize/refine` (live design refinement), `/api/ai/analyze-photo` (GPT Vision), `/api/ai/receptionist`, `/api/ai/summarize-voice`, `/api/ai/visualizer-chat` |
| **Leads** | 6 | CRUD + `/api/leads/intake` (contractor intake), `/api/transcribe` (Whisper) |
| **Quotes** | 8 | CRUD + `/api/quotes/[leadId]/pdf`, `/regenerate`, `/send`, `/versions`, `/api/quotes/accept/[token]` (public e-signature) |
| **Invoices** | 6 | CRUD + PDF, payments, send, Sage 50 CSV export |
| **Admin** | 13 | Settings CRUD, prices (CSV), templates CRUD, visualizations (review, metrics, trends), quote-assistance |
| **Other** | 9 | Visualizations CRUD, `/api/visualizations/[id]/share` (email concepts), drawings CRUD, voice (signed-url, check), sessions (save/resume) |

---

## Page Routes (22 pages)

**Public (11):** `/` (homepage), `/about`, `/services`, `/services/[slug]`, `/visualizer`, `/visualizer/share/[token]`, `/estimate` (redirects to `/visualizer`), `/estimate/resume`, `/contact`, `/projects`, `/quote/accept/[token]` (e-signature), `/privacy`, `/terms`, `/data-deletion`

**Admin (11, Accelerate+ unless noted):** `/admin/login`, `/admin` (dashboard), `/admin/leads`, `/admin/leads/[id]`, `/admin/quotes`, `/admin/invoices`, `/admin/invoices/[id]`, `/admin/drawings`, `/admin/drawings/[id]`, `/admin/settings`, `/admin/analytics` (Dominate only)

---

## External Integrations

OpenAI GPT-5.2 (chat, vision, quotes), GPT-4o-mini (intake extraction, Whisper transcription), Gemini 3.1 Flash Image / Nano Banana 2 (concept generation), ElevenLabs (voice), Supabase (DB + storage + RLS), Resend (email), Sentry (monitoring), Upstash Redis (rate limiting), Vercel (hosting), Firecrawl (onboarding scraper, devDep).

---

## Automated Tenant Onboarding

~5 minutes, ~$0.07/tenant. Pipeline: score (Firecrawl, threshold 70) → scrape (hallucination filter) → upload images (Supabase Storage) → provision (admin_settings + tenants + proxy.ts) → verify (Playwright QA, 7/8 pass). Invoke: Mission Control "Build Demo" button, CLI (`scripts/onboarding/onboard.mjs`), or Telegram (`/onboard-tenant`).

---

## White-Label Configuration

All tenant branding via `admin_settings` JSONB: business info, logo (SVG/PNG URL), primary colour (OKLCH), hero, services, testimonials, trust badges, team members, about image, quote assistance mode, notification emails. Domain routing via `src/proxy.ts`. "Powered by ConversionOS" footer: Elevate 60% opacity, Accelerate 40%, Dominate hidden. Legal pages (`/privacy`, `/terms`) branded per tenant.

---

## Known Constraints

| Item | Location |
|------|----------|
| Depth estimation disabled (`REPLICATE_API_TOKEN` not configured; Sharp fallback works) | `src/lib/ai/config.ts` |
| Stripe not integrated — payments recorded manually | Invoice flow |
| Style History Gallery, Session linking, Quick Style Preview not built | Visualizer |
| `getSiteId()` is synchronous (80+ call sites — do NOT make async) | `src/lib/db/site.ts` |
| Deposit % hardcoded to 15 in API; DB may store stale 50% | `src/app/api/quotes/[leadId]/route.ts` |
| E-signature acceptance page untested in QA (timed out during Playwright) | `/quote/accept/[token]` |
| `tier_mode` inferred from array presence, not stored | `quote_drafts` table |

---

## Build & Test Status

| Check | Status |
|-------|--------|
| `npm run build` | Passing (TypeScript strict + Next.js) |
| `npm run test` | 856 passing, 3 pre-existing failures in pdf-utils (31 test files) |
| `npm run lint` | Passing |
| E2E suites | 8 (quote-editor-core, transparency, tiers, CSV, templates, public, enterprise, live-design-refinement) |

---

## QE V2 Polish (40 improvements)

**Validation:** Line item min/max guards, settings cross-field validation, intake duplicate detection, CSV per-row validation, template item validation, chat 2000-char limit, subtotal sanity check ($500-$500K).

**UX:** Confidence tooltips, read-only version banner, scope gaps above line items, CSV replace confirmation dialog, template search/filter, HST lock tooltip, homepage ISR (1hr revalidation).

**Confirmation dialogs:** Tier mode toggle, reset-to-AI, quote mode → none, load defaults, intake submit. Shared `ConfirmDialog` component.

**Mobile:** Touch-visible action buttons (`hover: none`), 44px slider thumb (WCAG), responsive e-signature/template/send wizard, `dvh` units for chat.

**Accessibility (WCAG 2.1 AA):** Keyboard slider (arrows ±5%, Home/End), full ARIA on slider, severity text labels, `aria-live` on chat, `SRAnnounce` component, `aria-describedby`/`aria-invalid` on forms, global `focus-visible` ring.

**Performance:** `React.memo()` on line items, PDF preview prefetch, 1.5s save debounce, ISR.

**Error recovery:** Retry/dismiss on save failure, "Try Again" on e-signature/settings/CSV/AI extraction failures. AI extraction (`src/lib/ai/intake-extraction.ts`) has try-catch fallback — on failure returns `{ goalsText: rawInput }` instead of throwing, with user-friendly error message and manual entry option.

**Shared components:** `src/lib/utils/validation.ts`, `src/components/ui/confirm-dialog.tsx`, `src/components/ui/sr-announce.tsx`.

---

## Enterprise Hardening

**Auth:** Supabase auth in `src/proxy.ts` — single pass for tenant resolution + auth gating. Protected: `/api/admin/*`, `/api/leads` GET, `/api/quotes/*` (except accept), `/api/invoices/*`, `/api/drawings/*`, `/admin/*` (except login). Public: `/api/ai/*`, `/api/voice/*`, `POST /api/leads`, `/api/quotes/accept/*`.

**Rate limiting:** `src/lib/rate-limit.ts` — Upstash Redis with in-memory fallback. Visualize: 5/min, chat: 20/min, analyze/summarize: 10/min, transcribe: 5/min, contact/leads: 5/min.

**Security headers:** HSTS, Permissions-Policy, CSP (in `next.config.ts`).

**Input validation:** OKLCH regex, PostgREST escape, audio size/MIME, query param clamping.

**Error handling:** Generic client messages, details in console.error only.

**Monitoring:** Sentry (client/server/edge configs, PII scrubbing, source maps).

**Compliance:** `/privacy` (PIPEDA), `/terms` (Ontario law), `/data-deletion` (30-day processing). CASL consent on email capture. Deny-by-default tier = `'elevate'`.

**CI/CD:** `.github/workflows/ci.yml` — lint → typecheck → test → build. Husky + lint-staged pre-commit.

---

## Demo Mode

ConversionOS supports a demo mode for prospect previews. Demo instances let potential clients explore the full platform — including the admin dashboard — without authentication.

**Auth bypass:** Authentication is bypassed in `src/proxy.ts`. The proxy resolves tenants from hostname and sets `x-site-id`, but does not enforce Supabase auth or role checks. All admin routes are publicly accessible on demo instances. When landing the first production client, re-enable auth in `proxy.ts` and move admin to an `app.*` subdomain. See git history for the full auth implementation (Supabase SSR session refresh + admin role check).

**Admin button:** The public header (`src/components/header.tsx`) includes an "Admin" link gated by `canAccess('admin_dashboard')` — renders only for Accelerate and Dominate tiers. Desktop: positioned in the main `<nav>` after the About link with a red border (`border-red-500`) so it stands out from regular navigation. Mobile: in hamburger menu with separator from customer navigation.

**Demo interstitial:** On first admin visit per browser session, a full-screen overlay encourages exploration. Implementation in `src/app/admin/admin-layout-client.tsx`. Shows tenant logo, `Sparkles` icon with gradient ring, "Your AI Command Centre is Ready" heading, subtitle inviting test-driving of AI quotes and invoicing, three feature highlight pills (AI-Powered Quotes, Smart Invoicing, 24/7 Lead Capture), and a "Start Exploring" CTA with arrow. Footer: "Demo data for illustration — your real account starts fresh". Uses `sessionStorage` key `conversionos-demo-splash-seen` — does not re-show on same-session navigation. Animated with framer-motion staggered reveal (container + per-element `fadeUp` variants).

**Demo data:** Created via **real Playwright-driven workflows** through the live platform (not programmatic seed inserts). Every lead was generated by actually using the AI visualizer (Gemini), Emma chat (GPT-5.2), admin intake, quote engine, and invoice flow — producing authentic AI-generated content indistinguishable from a real contractor using the platform. Cleanup script: `scripts/clean-demo-data.mjs` (deletes all `site_id='demo'` data in FK dependency order across 10 tables).

Three leads with classic Ontario names:
1. **Sarah Mitchell** — Bathroom (85 sqft, accessible), `new` status, source: `ai_chat`. Website visitor → AI visualizer (4 modern bathroom concepts, starred 2) → Emma chat (9 messages about accessible bathroom for mother-in-law with walker) → lead captured. Contact: 42 Maple Drive, Mississauga. AI auto-generated quote draft present (Accelerate+ behaviour — status manually reset to `new` for demo).
2. **Dave Miller** — Kitchen (165 sqft, standard), `sent` status, source: `contractor_intake`. Contractor phone call → admin "+ New Lead" intake → AI-generated 8-item quote ($51,604) → quote sent. Contact: 88 Queen Street, Stratford. No visualizations (contractor intake path).
3. **Jim & Karen Crawford** — Basement (900 sqft, premium), `won` status, source: `ai_chat`. Full lifecycle: AI visualizer (4 contemporary concepts, starred 1) → Emma chat (12 messages about home theatre + wet bar) → lead captured → AI quote (8 items) → contractor added 2 items (Fire Safety Package, Building Permit Fees) → quote sent ($68,539.02) → invoice created (INV-2026-001) → deposit paid ($10,280.85 E-Transfer, Partially Paid) → 2 drawings (Basement Floor Plan, Egress Window Detail). Quote math verified: $55,140 subtotal → $5,514 contingency (10%) → $7,885.02 HST (13%) → $68,539.02 total → $10,280.85 deposit (15%).

QA findings documented in `docs/QA_NOTES.md`. All admin pages verified with zero console errors. `npm run build` clean.

**UX polish:** Leads table rows are fully clickable (cursor + onClick navigates to detail). "New Lead" button has contextual hint text ("Phone calls, walk-ins & referrals"). Global `cursor-pointer` fix applied for Tailwind v4 regression (button.tsx CVA + globals.css base layer).

---

## Business Constants

| Constant | Value | Location |
|----------|-------|----------|
| HST (Ontario) | 13% | `src/lib/pricing/constants.ts` → `hstRate: 0.13` |
| Deposit | 15% | `src/lib/pricing/constants.ts` → `depositRate: 0.15`, also hardcoded as `DEPOSIT_PERCENT = 15` in `src/app/api/quotes/[leadId]/route.ts`. Note: `admin_settings` DB may store a stale 50% value — the API constant takes precedence. Settings UI displays the DB value (cosmetic only). |
| Estimate variance | +/-15% | `src/lib/pricing/constants.ts` → `varianceRate: 0.15` |
| Quote validity | 30 days | Quote PDF terms page |
| Contingency (default) | 10% | `src/lib/pricing/constants.ts` → `contingencyRate: 0.10` |

---

*This document describes the product as it exists in the codebase. It is not a roadmap. Items listed under Known Constraints are acknowledged gaps, not planned features. Update this document after any session that changes features, AI models, database schema, API routes, or handoff mechanisms.*
