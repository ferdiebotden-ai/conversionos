# ConversionOS — Product Reference

**Last updated:** February 27, 2026 | **Updated by:** Claude Code (Enterprise Hardening — 20 fixes: auth middleware, rate limiting, CSP headers, Sentry, privacy/terms/data-deletion pages, CI/CD, 571 tests)

---

## Platform Overview

ConversionOS is a white-label AI-powered renovation platform sold to Ontario home renovation contractors. It replaces the contractor's existing website with a branded, intelligent lead-capture system that uses AI to visualize renovation concepts, generate quotes, and convert homeowners into qualified leads.

The core thesis: **visualize, capture context, quote with context, contractor sees what homeowner visualized.** No competitor closes this loop. ConversionOS turns every homeowner interaction into structured, quote-ready intelligence that makes the quoting process faster, more accurate, and more impressive than anything a contractor could do manually.

**Company:** NorBot Systems Inc. (Stratford, Ontario, Canada)
**Founder/CEO:** Ferdie Botden (CPA, former TD Bank District Manager)
**Target market:** Ontario residential renovation contractors (kitchen, bathroom, basement, full home)
**Business model:** SaaS with three pricing tiers and territory exclusivity at the top tier

---

## Why ConversionOS Exists

Ontario renovation contractors lose leads because their websites are static brochures. A homeowner visits, sees a phone number, and bounces. The industry standard is a 2-3% visitor-to-lead conversion rate. Contractors who respond to inquiries take 24-48 hours on average. Quote preparation takes 2-3 hours of manual work.

ConversionOS changes this by putting AI at every step:
- **Emma** (AI assistant) engages visitors instantly on every page — with page-context-aware knowledge that makes her a receptionist on the homepage, a quote specialist on the estimate page, and a design consultant on the visualizer page
- **The AI Visualizer** lets homeowners upload a photo of their room and see it transformed in 4 design styles — in under a minute
- **The Estimate Page** receives the full context from the visualizer — room dimensions, fixtures, materials, preferences — and Emma produces a ballpark estimate without re-asking questions the homeowner already answered
- **The Admin Dashboard** gives contractors a real-time view of leads, quotes, invoices, and analytics

The result: faster response times, higher conversion rates, and a sales tool that no competitor in the renovation space offers.

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
| Invoicing + payment tracking | — | Yes | Yes |
| Architecture drawings management | — | Yes | Yes |
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

Feature gating is enforced by a pure function: `canAccess(tier, feature)` in `src/lib/entitlements.ts`. The tier is read from the `admin_settings` database table per tenant. Server-side checks use `getTier()`. Client-side checks use the `useTier()` React hook.

---

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js (App Router) | 16.1.6 | Turbopack in dev, proxy.ts for tenant routing |
| UI | React | 19.2.3 | Server + client components |
| Language | TypeScript | 5 | Strict mode enabled |
| Styling | Tailwind CSS | 4 | OKLCH colour system, CSS variables for theming |
| Typography | Plus Jakarta Sans, DM Sans, JetBrains Mono | next/font/google | Display, body, code fonts respectively |
| Component library | shadcn/ui + Radix UI | Latest | 10+ primitive libraries |
| Charts | Recharts | 3.7.0 | Dominate-tier analytics only |
| State management | Zustand | 5.0.11 | Client-side state |
| Animation | Framer Motion | Latest | UI transitions |
| Chat/Vision AI | OpenAI GPT-5.2 | via Vercel AI SDK v6 | Chat, photo analysis, quote generation, extraction |
| Image generation | Google Gemini 3 Pro Image | gemini-3-pro-image-preview | 4 renovation concepts per generation |
| Voice agent | ElevenLabs Conversational AI | @elevenlabs/react 0.14.0 | All tiers (web), single agent per tenant with session prompt overrides |
| Content moderation | OpenAI omni-moderation-latest | — | All user inputs |
| Database | Supabase (PostgreSQL) | @supabase/supabase-js 2.93.3 | ca-central-1 region, RLS enabled |
| File storage | Supabase Storage | — | Photos, concepts, PDFs, tenant assets |
| Email | Resend | 6.9.1 | Lead notifications, quote delivery, invoice sending |
| PDF | @react-pdf/renderer + jspdf | — | Multi-page quotes (cover, photos, categorised items, tiers, terms+signature) and invoices |
| Image processing | Sharp | 0.34.5 | Compression, resizing, edge detection |
| Mobile photos | heic2any | — | HEIC/HEIF conversion from iOS |
| AI framework | Vercel AI SDK | 6.0.67 | Streaming, structured outputs, tool calling |
| Validation | Zod | 4.3.6 | All AI outputs validated before render/store |
| Testing | Vitest + Playwright | — | 511 unit tests (15+ test files), 6 E2E test suites, browser automation |

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

### Homeowner Journey

1. **Landing** (`/`) — Branded homepage optimised for conversion. Section order: Hero (outcome headline, primary CTA, phone link, trust badges) → Social Proof Bar (Google rating, years in business, projects completed, licensed status — 2x2 grid on mobile, flex row on desktop) → Visualizer Teaser (real before/after kitchen photos in 3 styles with auto-animation on scroll via IntersectionObserver) → Services → How It Works (3 steps) → Why Choose Us → Testimonials → Final CTA. Sticky mobile CTA bar fixed at bottom on viewports < 768px, hidden on /estimate, /visualizer, /admin routes. All CTAs (header, mobile bar, How It Works subtitle, process step 3, final CTA) adapt dynamically via the copy system based on tier + quote mode. All content driven by database.

2. **Visualizer** (`/visualizer`) — Upload a photo of their room (drag-and-drop on desktop, "Take a Photo" or "Choose from Gallery" on mobile; minimum 320x240 pixels). Photo pre-analysis fires immediately via GPT Vision — detects room type, layout, dimensions, fixtures, condition. Room type selector auto-fills from analysis. Trust indicators below the form: "100% Free to use", "~30 sec Generation time", "No Sign-Up — No account needed". Photo tips shown as a responsive icon grid (Good Lighting, Wide Shot, Clear Clutter, Key Features).

3. **Style selection** — Choose from 8 room types and 6 design styles (Modern, Traditional, Farmhouse, Industrial, Minimalist, Contemporary). Add text preferences. Optionally speak to Emma via voice (all tiers) for richer preference capture — Emma has design knowledge injected on the visualizer page.

4. **Generation** — SSE streaming endpoint generates 4 concepts in parallel via Gemini 3 Pro Image. Progressive reveal: skeleton cards cross-fade to real images as concepts arrive (~15-20s per concept, ~41s total). Real-time progress stages shown during generation.

5. **Results** — Before/after slider comparison. Enriched AI-generated descriptions for each concept (not generic labels). Cost range indicator for Accelerate+ tenants ($30K-$60K + HST format). "Email Me These Designs" email capture button (creates lead with `source: visualizer_email`). "Try Another Style" preserves photo and room type, resets style. Primary CTA adapts by tier + quote mode via `getVisualizerResultCTA()` — "Get a Personalised Estimate" (when quotes enabled) or "Request a Callback from [Contractor]" (when quotes disabled). Sticky CTA bar animates in after 3 seconds.

6. **Quote** (`/estimate`) — Emma receives the full handoff context via DB-backed reconstruction (survives tab switches, page refreshes, and new sessions). When a `visualization` URL parameter is present, the estimate page fetches the full visualization record from the database and reconstructs the `HandoffContext` via `buildHandoffFromVisualization()`. Falls back to sessionStorage if DB fetch fails. On this page, Emma has full pricing knowledge injected: photo analysis (dimensions, layout, fixtures, condition), selected concept, material preferences, voice-extracted preferences, cost signals, and the contractor's quote assistance mode. Emma skips discovery questions and goes straight to refinement. The project summary sidebar auto-populates from the conversation: project type, room size, timeline, finish level are extracted from both user and assistant messages, but **goals are only extracted from user messages** (not Emma's) to avoid capturing AI phrasing as homeowner intent.

7. **Lead capture** — Multi-step submit modal: review project summary (with optional "Anything else we should know?" textarea for additional notes) → contact information → property details (Ontario-specific: property type, age, ownership, HOA, permits, preferred start date, access notes). "Continue Conversation" returns to chat; "Continue to Submit" advances. Additional notes are appended to the goals text in the lead record. Lead created in database with full visualization context, chat transcript, and AI-generated scope. Contractor notified by email.

### Contractor (Admin) Journey

1. **Login** (`/admin/login`) — Authentication via admin credentials.

2. **Dashboard** (`/admin`) — Overview of leads, visualization metrics, pipeline health.

3. **Leads** (`/admin/leads`) — Searchable, filterable table of all leads. Feasibility badges (colour-coded dots: green 4-5, yellow 3, red 1-2). Source badge column distinguishes leads: blue "Intake" badge for contractor-created leads, grey "Website" badge for homeowner-created leads. "+ New Lead" button (gated by `contractor_lead_intake` entitlement) opens a 3-tab intake dialog for voice dictation, typed notes, or manual form entry. Click into lead detail for full context: contact info, visualization panel, chat transcript (shows "Contractor Intake Notes" with raw input when no chat transcript exists), cost analysis.

4. **Quotes** (`/admin/quotes`) — AI-generated quotes with transparency cards ("show the math"), per-category markup controls (7 categories), Good/Better/Best tier comparison, scope gap detection (20+ rules), multi-page PDF generation (cover, before/after photos, categorised items, tier comparison, terms + signature block), email sending with "Review & Approve Your Quote" CTA, e-signature acceptance (public token-gated page), and quote versioning with version history chips. See "Quote Engine V2" section below.

5. **Invoices** (`/admin/invoices`) — Create from quotes, track payments (cash, cheque, e-transfer, credit card), auto-update status (draft → sent → partially paid → paid). PDF generation. Sage 50 CSV export.

6. **Drawings** (`/admin/drawings`) — CAD-style drawing management for technical plans.

7. **Settings** (`/admin/settings`) — Business info, branding, pricing parameters, quote assistance mode (none/range/estimate with configurable range band), per-category markup controls (Materials 15%, Labour 30%, Contract Labour 15%, Equipment 10%, Permits 0%, Allowances 0%, Other 10%).

8. **Analytics** (`/admin/analytics`, Dominate only) — Recharts dashboard: daily visualization trends, room type distribution, generation time tracking, conversion rates. KPI cards with period-over-period deltas.

---

## AI Agent — Emma

### Single Persona, Page-Context Architecture

ConversionOS uses a single AI persona — **Emma** — across all pages. Emma adapts her expertise based on which page the homeowner is browsing. A `PageContext` value (`'general'` | `'estimate'` | `'visualizer'`) determines which knowledge layers are injected into her system prompt.

**Powered by:** GPT-5.2 via Vercel AI SDK streaming (text). ElevenLabs Conversational AI (voice, all tiers).

**Personality:** Warm, concise (2-3 sentences max), conversational. Uses contractions and casual language. Never info-dumps. On the estimate page, she is more structured and confident about pricing. On the visualizer page, she is more creative and enthusiastic about design.

**Available to:** All tiers (text + voice). Elevate tier has pricing deflection — Emma never discusses dollar amounts and routes pricing questions to `/contact` for a callback. Phone/Twilio voice is Dominate only (future feature).

### Page-Context Knowledge Injection

| Page | PageContext | Knowledge Injected | Emma's Role |
|------|------------|-------------------|-------------|
| Homepage, About, Services, Contact | `general` | Company profile, services summary, Ontario general knowledge, pricing summary (Accelerate+; suppressed for Elevate) | Receptionist — answers questions, routes to visualizer or estimate page (Elevate: routes to /contact instead of /estimate) |
| `/estimate` | `estimate` | Full Ontario pricing database (14 trades, 50+ materials, 9 regional multipliers), budget knowledge, handoff context from visualizer | Quote specialist — produces ballpark estimates, skips discovery when context is available |
| `/visualizer` | `visualizer` | Design knowledge, style descriptions, material options, renovation trends | Design consultant — guides style exploration, extracts structured preferences |

### Context Pipeline (the core moat)

When a homeowner navigates from the visualizer to the estimate page, Emma receives:
- **Photo analysis:** Room layout, estimated dimensions, ceiling height, wall count + dimensions, identified fixtures, structural elements, current condition — from GPT Vision
- **Design preferences:** Selected style, text preferences, voice-extracted preferences (desired changes, material preferences, preservation notes)
- **Cost signals:** AI-estimated cost range, material breakdown hints — from Ontario pricing database
- **Quote assistance mode:** Whether the contractor wants no pricing, ranges, or point estimates shown to homeowners

This means Emma can skip the typical 5-7 discovery questions and go straight to refinement: "I can see you have an L-shaped kitchen, roughly 12 by 14 feet. Based on the Modern style you chose with marble counters, here's what I'm estimating..."

Context flows between pages via `sessionStorage`. When a `visualization` URL parameter is present, context is reconstructed from the database via `buildHandoffFromVisualization()`, ensuring it survives tab switches, page refreshes, and new sessions. This is page navigation with context preservation — not a persona handoff.

### Routing Mechanism

CTA markers `[CTA:Label:/path]` are rendered as clickable buttons in the chat widget. Emma routes homeowners between pages naturally: to the visualizer for design exploration, to the estimate page for pricing discussions.

### Voice (All Tiers — Web)

A single ElevenLabs agent per tenant powers voice interactions on all tiers. Dynamic prompts are injected via session overrides at connection time based on the current page context, so the same voice agent adapts its expertise just as the text chat does. Voice-extracted preferences (desired changes, material preferences, preservation notes) are captured via `VoiceExtractedPreferences` and feed into the generation prompt and estimate context.

For Elevate tier, the voice prompt includes a mandatory pricing deflection — Emma will never mention dollar amounts over voice, instead warmly offering to connect the homeowner with the contractor. Phone/Twilio voice integration is Dominate only (future feature, gated by `voice_phone` entitlement).

### Prompt Architecture

Emma uses a layered prompt system:
1. **Persona identity** — Name, role, personality traits, capabilities, boundaries
2. **Company knowledge** — Dynamically loaded from `admin_settings` per tenant
3. **Page-context knowledge** — Domain knowledge injected based on `PageContext` (pricing DB for estimate, design knowledge for visualizer, general knowledge for other pages)
4. **Sales training** — Shared conversion techniques
5. **Dynamic injection** — Cross-domain knowledge added based on keyword detection in the user's message (pricing knowledge suppressed for Elevate)
6. **Elevate pricing deflection** — Mandatory layer for Elevate tier on general and visualizer pages. Instructs Emma to never mention dollar amounts and route pricing questions to `/contact`
7. **Handoff context** — Rich structured data from previous page interactions (visualizer → estimate)

---

## AI Visualization Pipeline

### Photo Analysis (GPT-5.2 Vision)

Fires immediately at photo upload time (not during generation). Detects:
- Room type, layout type (L-shaped, galley, open concept, etc.)
- Estimated dimensions and ceiling height
- Wall count with per-wall estimated length, windows, doors
- Spatial zones (cooking area, dining area, etc.)
- Identified fixtures (cabinets, countertops, appliances)
- Structural elements and preservation constraints
- Current condition rating and style identification

Analysis is cached by FNV-1a hash of the first 2KB of image data (10-minute TTL, max 50 entries). The result auto-fills the room type selector and is reused by the generation endpoint.

### Image Generation (Gemini 3 Pro Image)

**Model:** `gemini-3-pro-image-preview`
**Output:** 4 photorealistic renovation concepts at 2048x2048 resolution
**Structure preservation:** 0.90 strength (room geometry, camera angle, windows, doors untouched)
**Style application:** 0.40 strength (finishes, fixtures, colours, decor transformed)

Generation pipeline:
1. Compressed photo + optional edge map (Sharp-processed)
2. 6-part prompt construction: room analysis context, style-specific materials/colours/finishes, structural preservation rules, photorealism requirements
3. 4 parallel Gemini calls via `Promise.allSettled()`
4. Each concept uploaded to Supabase Storage as it completes
5. SSE events sent to client for progressive reveal
6. Concept descriptions enriched by GPT-5.2 (batched, ~$0.01)
7. Concept pricing analysis by GPT-5.2 Vision (fire-and-forget, identifies materials, prices from Ontario DB)

**Timeouts:** 75s per concept, 110s server-side total (emit whatever is ready), 150s client-side abort.

### SSE Streaming Protocol

**Endpoint:** `POST /api/ai/visualize/stream`
**Events:** `status` (stage + progress%), `concept` (index + imageUrl + description), `complete`, `error`
**Heartbeat:** `:\n\n` every 15 seconds (keeps Vercel from closing the connection)
**Client hook:** `useVisualizationStream()` — parses SSE via `ReadableStream.getReader()`, buffer-splits on `\n\n`
**Headers:** `X-Accel-Buffering: no`, `Content-Encoding: none` (required for Vercel SSE)

The non-streaming endpoint (`POST /api/ai/visualize`) remains available for backward compatibility.

---

## Ontario Pricing Database

A typed, client-safe pricing database in `src/lib/ai/knowledge/pricing-data.ts`:

- **14 trade rates** — Electrician, plumber, HVAC, carpenter, etc. with hourly rate ranges
- **50+ material costs** — Cabinetry, countertops, flooring, tile, fixtures, appliances, etc. with low/mid/high pricing per unit
- **9 regional multipliers** — GTA (1.15x), Ottawa (1.10x), Kitchener-Waterloo (1.02x), rural Ontario (0.85x), etc.
- **8 room type estimates** — Per-square-foot ranges by room category and finish level (economy/standard/premium)

**Pure functions** (no database calls, safe for client-side):
- `calculateCostEstimate(roomType, sqft, finishLevel, region)` — Returns low/high range
- `snapToRangeBand(value, band)` — Rounds to nearest band (e.g., $10K increments)
- `formatCAD(amount)` — Formats as Canadian dollars
- `getMaterialsForRoom(roomType)` — Returns applicable materials

**AI prompt integration:** `PRICING_FULL` and `PRICING_SUMMARY` constants are auto-generated from the typed data, injected into Emma's system prompt when the page context is `estimate` or when keyword detection triggers pricing knowledge on other pages. This ensures AI pricing advice matches the database exactly.

---

## Quote Assistance System

Per-tenant configuration controlling how pricing is displayed to homeowners:

| Mode | Behaviour | Example |
|------|-----------|---------|
| `none` | No pricing shown. Emma tells homeowners the contractor will follow up. | — |
| `range` | Cost ranges displayed. Emma uses "typically runs between $X and $Y." | $30,000 - $60,000 + HST |
| `estimate` | Point estimates with disclaimers. Emma provides specific numbers. | ~$45,000 + HST (subject to site inspection) |

- **Elevate:** Always `none` (no admin dashboard to configure)
- **Accelerate/Dominate default:** `{ mode: 'range', rangeBand: 10000 }`
- **Admin UI:** Settings page → "Quoting" tab → mode dropdown + range band selector + live preview
- **Storage:** `quote_assistance` key in `admin_settings` JSONB

The mode is read fresh from the database on every estimate-page chat message (both text and voice). `buildAgentSystemPrompt('estimate')` calls `getQuoteAssistanceConfig(tier)` which queries `admin_settings` for the current value. This means if the contractor changes the mode mid-conversation, the very next message respects the new setting. The mode also flows through the cost range indicator in the visualizer UI and the page navigation handoff context.

### Adaptive Website Copy

All website copy dynamically adapts based on **tier + quote assistance mode**. The copy system treats feature-gated text like i18n — a centralized registry with typed variants consumed via pure functions. Every page on the platform — homepage, services, contact, about, projects, visualizer results, visualizer share, chat interface, and the receptionist widget — uses this system.

**Core logic:** `hasQuotes(ctx)` = tenant has `ai_quote_engine` AND `quoteMode !== 'none'`. When false, all estimate/quote copy becomes "Contact Us" / `/contact`.

**Architecture:**
- **`src/lib/copy/site-copy.ts`** — Pure copy registry (20 functions including `hasQuotes`). No DB, no React. Importable from both server and client components.
- **`src/lib/copy/use-site-copy.ts`** — Client hook `useCopyContext()` — builds `CopyContext` from `TierProvider`.
- **`src/lib/copy/server.ts`** — Server helper `getCopyContext()` — fetches tier + quoteMode from DB.
- **`src/components/tier-provider.tsx`** — Extended with `quoteMode` prop (default: `'range'`), exposed via `useTier()`.
- **`src/app/layout.tsx`** — Fetches `getQuoteAssistanceConfig()` in parallel, passes resolved `quoteMode` to `TierProvider`.

**Cache invalidation:** The admin settings API (`PUT` and `PATCH` handlers in `/api/admin/settings`) calls `revalidatePath('/', 'layout')` after every save. This purges the Next.js full-route cache so that copy, branding, and tier changes take effect immediately across all pages — no redeploy or manual cache bust required.

**Affected components (19):**
| Component | Copy Function | What Changes |
|-----------|--------------|--------------|
| Header (3 CTAs) | `getHeaderCTA()` | "Get Quote" → "Contact Us", `/estimate` → `/contact` |
| Mobile CTA bar | `getMobileCTA()` | Same as header |
| Receptionist widget teaser | `getHomepageTeaser()` | "Chat with me for a free estimate!" → "I can help you get started!" |
| Chat NLP fallback buttons | `getEstimateCTA()` | Routes pricing keywords to `/contact` |
| Homepage subtitle | `getHowItWorksSubtitle()` | "estimate" → "consultation" |
| Homepage step 3 | `getDefaultProcessStep3()` | "Receive Your Estimate" → "Connect with a Pro" |
| Homepage final CTA | `getHomepageFinalCTA()` | Estimate link → contact link |
| Contact page meta | `getContactMetaDescription()` | Removes "quote" from SEO description |
| Contact page alt CTA | `getContactAlternativeCTA()` | Returns `null` → section hidden |
| Services page CTA | `getServicesCTA()` | Primary: estimate → contact |
| Service detail CTA | `getServiceDetailCTA()` | Same, with service slug |
| Projects page CTA | `getProjectsCTA()` | Primary: estimate → contact |
| About page CTA | `getAboutCTA()` | Primary: estimate → contact |
| 404 page CTA | `getNotFoundCTA()` | "Get a Quote" → "Contact Us" |
| Visualizer results CTA | `getVisualizerResultCTA()` | "Get a Personalised Estimate" → "Request a Callback from [Contractor]" |
| Visualizer share page | `getVisualizerShareCTA()` | Header CTA, heading, description, and primary CTA all adapt |
| Chat welcome (estimate page) | `getChatWelcome()` | "understand what... will cost" → "plan their renovation projects" |
| Chat handoff welcome | `getChatHandoffWelcome()` | "real numbers" + budget question → "reality" + contractor connect |
| Chat skip text | `getChatSkipText()` | "get your quote" → "team member will be in touch" |

**Admin UI feedback:** The Quoting tab description explains: "This setting controls how pricing appears across your entire website — in navigation buttons, chat widget messages, and the AI estimate experience."

**Mode-neutral fallback content:** The `FALLBACK_CONFIG` in `src/lib/ai/knowledge/company.ts` uses mode-neutral copy for all fields that render on public pages. The hero subheadline, process steps, why-choose-us items, testimonials, service descriptions, and about copy all avoid references to "estimates," "quotes," or "pricing" so they work correctly regardless of the tenant's quote assistance mode. Existing tenants with DB-stored `company_profile` content should also use mode-neutral language, since that content is static and does not change dynamically with the quote mode — the copy system handles the dynamic adaptation at the component level.

**Test coverage:** `tests/unit/copy/site-copy.test.ts` — 35 test cases across all tier+mode combinations.

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

Pure rules engine detects commonly missed items in renovation quotes. Module: `src/lib/ai/scope-gap-rules.ts`. Zero API cost, synchronous execution (microseconds).

**20+ rules by project type:**

| Rule ID | Trigger | Severity | Est. Cost |
|---------|---------|----------|-----------|
| `bath-waterproofing` | Tile/shower without membrane | warning | $200-$600 |
| `bath-exhaust-fan` | Bathroom without exhaust fan | info | $150-$400 |
| `bath-subfloor` | Tile floor without subfloor prep | info | $200-$500 |
| `kitchen-backsplash-prep` | Backsplash without wall prep | info | $200-$400 |
| `kitchen-plumbing-rough` | New sink without rough-in | warning | $500-$1,200 |
| `kitchen-electrical` | Major reno without panel check | info | $1,500-$4,000 |
| `kitchen-demolition` | Renovation without demo line | warning | $500-$2,000 |
| `basement-egress` | Bedroom without egress window | warning | $3,000-$6,000 |
| `basement-moisture` | Finishing without moisture barrier | warning | $500-$1,500 |
| `basement-fire-sep` | Bedroom without fire separation | warning | $500-$1,200 |
| `permit-missing` | Structural/elec/plumb without permit | warning | $200-$800 |
| `dumpster-disposal` | Demolition without disposal | info | $400-$1,000 |
| `protection-cleanup` | Renovation without protection allowance | info | $300-$800 |
| `asbestos-testing` | Pre-1980 home + demolition | warning | $300-$600 |
| `underlayment` | Flooring without underlayment | info | $100-$400 |
| `paint-primer` | Painting without primer | info | $100-$300 |
| `supply-lines` | Fixture replacement without supply lines | info | $200-$500 |
| `heated-floor-electrical` | Heated floor without dedicated circuit | info | $400-$800 |
| `transition-strips` | Multi-room flooring without transitions | info | $50-$200 |
| `flooring-removal` | New flooring without old removal | info | $200-$600 |

**UI component:** `ScopeGapRecommendations` (`src/components/admin/scope-gap-recommendations.tsx`) — collapsible section between line items table and totals card. Amber header with Lightbulb icon and count badge. Each gap shows severity icon (AlertTriangle for warnings, Info for informational), message, estimated cost range, and "Add" button. Added items dim and show "Added" state. Warnings sort before info items.

**Integration:** `detectScopeGaps(lineItems, projectType, context?)` called via `useMemo` in the quote editor. Runs whenever line items or project type change. `handleAddScopeGapItem(gap)` creates a new manual line item from the gap's suggested item and estimated cost midpoint.

### Multi-Page Professional PDF

The quote PDF is a multi-page document built with `@react-pdf/renderer`. Layout:

1. **Cover page** — Company logo (falls back to text name when SVG — react-pdf `Image` does not support SVG), company name, address, quote reference number (pattern: `DEMO-{year}-{first 8 chars of lead ID}`), customer contact info, project description, quote date, validity period.
2. **Before/after photo page** (conditional) — Only rendered when the lead has an associated visualization with photos. Shows original room photo and AI-generated concept side by side.
3. **Categorised line items** — Items grouped by category (Demolition & Removal, Structural & Framing, Plumbing, Electrical, Materials & Finishes, Labour, Other) with per-category subtotals. Unit prices are deliberately omitted to prevent line-item negotiation. Totals section: subtotal, contingency (if any), HST (13%), grand total, deposit amount (15%).
4. **Tier comparison page** (conditional) — Only rendered when quote is tiered. Shows Good/Better/Best with totals and item summaries.
5. **Terms + signature block** — Fixed terms text (assumptions, exclusions, payment terms, warranty), followed by signature lines (printed name, signature, date) for both customer and contractor. Quote validity stated.

**Fixed page footer:** Every page carries "Page X of Y" numbering via react-pdf's `render` prop.

**Shared PDF infrastructure:**
- `src/lib/pdf/pdf-utils.ts` — 7 utility functions: `groupLineItemsByCategory()`, `formatQuoteNumber()`, `formatCurrency()`, `getCategoryLabel()`, `formatDate()`, `resolveImageUrl()`, `getProjectTypeLabel()`
- `src/lib/pdf/shared-pdf-styles.ts` — `STATIC_COLORS` constant and `createBaseStyles(primaryColor)` factory shared by quote and invoice templates
- `src/lib/pdf/quote-template.tsx` — `QuotePdfDocument` component with `QuotePdfProps` interface

### E-Signature Acceptance

Customers receive an email with a "Review & Approve Your Quote" CTA button linking to a public acceptance page. No authentication required — access is controlled by a unique 24-character alphanumeric token.

**Public page:** `/quote/accept/[token]` — mobile-first, contractor-branded (reads branding from `admin_settings` via the quote's `site_id`).

**5 page states:**
- `loading` — Initial fetch
- `pending` — Quote summary (project type, total, deposit, line item count, validity) with approval form: typed name input + "I accept the terms" checkbox
- `accepted` — Confirmation with accepted date and name
- `expired` — Quote has passed its validity date; shows contractor contact info
- `not_found` — Invalid or missing token

**Database columns** (added to `quote_drafts` via migration `20260227000000_e_signature.sql`):
- `acceptance_token` (TEXT, UNIQUE, indexed) — 24-char alphanumeric, generated on quote send
- `acceptance_status` (TEXT, CHECK: pending/accepted/declined, default: pending)
- `accepted_at` (TIMESTAMPTZ)
- `accepted_by_name` (TEXT)
- `accepted_by_ip` (TEXT)

**On acceptance:** Lead status updated to `'won'`, action logged to `audit_log`.

**Quote editor integration:** Acceptance status badge displayed — green "Approved" when accepted, muted "Awaiting approval" when pending.

**API:** `GET/POST /api/quotes/accept/[token]` — public route, no site_id filter, no auth required. Token uniqueness enforces access control.

### Quote Versioning

When a quote is sent, the current row is frozen (sets `sent_at`) and a new draft row is created with `version + 1` for future edits. This preserves a complete history of every quote version sent to the customer.

**Version history API:** `GET /api/quotes/[leadId]/versions` — returns all versions ordered by version descending, including sent status and acceptance status.

**Version history component:** `QuoteVersionHistory` (`src/components/admin/quote-version-history.tsx`) — horizontal scrollable chip bar showing version chips. Each chip shows: version number, sent status icon (check for sent, clock for draft, file for current draft), acceptance status. Active chip is highlighted. Clicking a chip loads that version into the quote editor.

**Quote editor integration:**
- `selectedVersion` state tracks which version is being viewed
- Old versions load in **read-only mode** with a read-only banner
- Only the latest draft version is editable
- Lead detail page fetches all versions and passes them to the QuoteEditor

### Contractor Lead Intake

Contractors can create leads directly from the admin dashboard instead of waiting for homeowner submissions. Gated by the `contractor_lead_intake` entitlement (Accelerate + Dominate tiers).

**Entry point:** "+ New Lead" button on the leads page header (`src/components/admin/leads-page-header.tsx`).

**3-tab intake dialog** (`src/components/admin/contractor-intake-dialog.tsx`):

| Tab | Method | How It Works |
|-----|--------|-------------|
| Dictate | Voice dictation | MediaRecorder captures audio (all browsers), optional Web Speech API live preview. 90s max recording. Audio sent to `/api/transcribe` (OpenAI Whisper `gpt-4o-mini-transcribe`, ~$0.003/min). Renovation-specific vocabulary prompt improves accuracy. Transcript fed to AI extraction. |
| Type/Paste | Text input | Contractor types or pastes job notes. Text fed to AI extraction. |
| Form | Manual entry | Traditional form fields — no AI extraction needed. |

**AI field extraction** (`src/lib/ai/intake-extraction.ts`): GPT-4o-mini extracts structured fields from raw contractor notes — name, email, phone, address, city, projectType, areaSqft, finishLevel, timeline, budgetBand, goalsText, specificMaterials, structuralNotes. Schema: `IntakeExtractionSchema` in `src/lib/schemas/intake.ts`. Extraction pre-fills the form; contractor reviews and adjusts before submission.

**Intake API:** `POST /api/leads/intake` — discriminated union with two actions:
- `action: 'extract'` — AI extraction only (returns structured fields)
- `action: 'create'` — Creates lead with source tracking

**Lead record enrichment:**
- `created_by: 'contractor'` (vs default `'customer'`)
- `intake_method: 'voice_dictation' | 'text_input' | 'form'`
- `intake_raw_input` — original dictation/text for audit trail
- `source: 'contractor_intake'`
- AI quote generation attempted automatically when enough project data is present

**Leads table:** Source badge column — blue "Intake" badge for contractor-created leads, grey "Website" for homeowner-created leads.

**Email generation:** Source-aware — contractor-created leads receive different language (no "design session" references since there was no homeowner interaction).

**Chat transcript fallback:** When a lead has no chat transcript (contractor-created via intake), the transcript section shows "Contractor Intake Notes" with the raw dictation/text input.

**Database columns** (added to `leads` via migration `20260227100000_contractor_intake.sql`):
- `created_by` (TEXT, CHECK: customer/contractor, default: customer)
- `intake_raw_input` (TEXT)
- `intake_method` (TEXT, CHECK: website/voice_dictation/text_input/form)

### Files Summary

| File | Purpose |
|------|---------|
| `src/lib/schemas/transparency.ts` | Zod schemas: CostLineSchema, MarkupAppliedSchema, TransparencyBreakdownSchema |
| `src/components/admin/transparency-card.tsx` | Animated expand/collapse transparency card UI |
| `src/lib/pricing/category-markups.ts` | 7-category markup config, markup/margin math, defaults |
| `src/components/admin/category-markup-settings.tsx` | Admin UI for per-category markup editing |
| `src/components/admin/tier-comparison.tsx` | 3-column tier comparison bar |
| `src/lib/ai/scope-gap-rules.ts` | 20+ pure detection rules |
| `src/components/admin/scope-gap-recommendations.tsx` | Collapsible scope gap UI with "Add" actions |
| `src/lib/pdf/pdf-utils.ts` | 7 shared PDF utilities (grouping, formatting, URL resolution) |
| `src/lib/pdf/shared-pdf-styles.ts` | Shared StyleSheet factory and static colours |
| `src/lib/pdf/quote-template.tsx` | Multi-page quote PDF document component |
| `src/app/quote/accept/[token]/page.tsx` | Public e-signature acceptance page |
| `src/app/api/quotes/accept/[token]/route.ts` | E-signature API (GET summary + POST accept) |
| `src/components/admin/quote-version-history.tsx` | Horizontal version chip bar |
| `src/app/api/quotes/[leadId]/versions/route.ts` | Version history API |
| `src/components/admin/contractor-intake-dialog.tsx` | 3-tab intake dialog (dictate, type, form) |
| `src/components/admin/voice-dictation-input.tsx` | MediaRecorder + Whisper voice capture |
| `src/components/admin/leads-page-header.tsx` | Leads page header with "+ New Lead" button |
| `src/lib/ai/intake-extraction.ts` | GPT-4o-mini field extraction from contractor notes |
| `src/lib/schemas/intake.ts` | Zod schemas for intake extraction and request |
| `src/app/api/leads/intake/route.ts` | Intake API (extract + create actions) |
| `src/app/api/transcribe/route.ts` | Whisper transcription endpoint |
| `tests/unit/transparency-schema.test.ts` | 35 tests for transparency schemas |
| `tests/unit/category-markups.test.ts` | 16 tests for markup math |
| `tests/unit/tiered-quote-schema.test.ts` | 17 tests for tiered quote schemas |
| `tests/unit/scope-gap-rules.test.ts` | 95 tests for all 20+ rules |
| `tests/unit/pdf-utils.test.ts` | 24 tests for PDF utility functions |
| `tests/unit/e-signature.test.ts` | 26 tests for e-signature flow |
| `tests/unit/quote-versioning.test.ts` | 15 tests for version snapshot logic |
| `tests/unit/intake-extraction.test.ts` | 26 tests for AI intake extraction |

### CSV Price Upload (Phase 3B)

Contractors upload their own material/labour price lists via CSV. When present, the AI quote engine prioritises these prices over Ontario database defaults, and the quote editor shows a "Using your prices (N items)" badge.

**Upload flow:** Admin Settings → "Price List" tab → drag-drop or click to upload CSV → preview first 10 rows → confirm. Full replace semantics (each upload deletes previous prices). Max 5MB file size.

**CSV format:** `item_name` (required), `category` (materials/labor/contract/permit/equipment/allowances/other), `unit` (default: ea), `unit_price` (required, positive), `supplier` (optional). Headers are normalised (trim, lowercase, underscores).

**AI integration:** `buildContractorPricesSection()` in `quote-generation.ts` injects up to 100 contractor prices into the AI prompt, grouped by category. The AI is instructed to prioritise contractor prices and set `transparencyData.dataSource` to "Contractor Price List" for matched items. All four generation functions (`generateAIQuote`, `regenerateAIQuote`, `generateTieredAIQuote`, `regenerateTieredAIQuote`) accept an optional `contractorPrices` parameter.

**Fuzzy matching:** `src/lib/pricing/fuzzy-match.ts` — Levenshtein distance algorithm matches AI-generated item descriptions to contractor price names (threshold: 3). Used for the "Using your prices" badge indicator in the quote editor, not for price substitution (the AI handles that via prompt).

**Key files:**
| File | Purpose |
|------|---------|
| `src/app/api/admin/prices/route.ts` | POST (CSV upload), GET (list), DELETE (clear) |
| `src/components/admin/price-upload.tsx` | Upload zone, preview, current prices table, sample download |
| `src/lib/pricing/fuzzy-match.ts` | Levenshtein distance + matching functions |
| `supabase/migrations/20260228000000_contractor_prices.sql` | Table with NUMERIC(12,2), category CHECK, RLS |
| `tests/unit/fuzzy-match.test.ts` | 21 tests for distance calculation and matching |
| `tests/unit/price-upload.test.ts` | 16 tests for CSV validation and price indicators |

### Assembly Templates (Phase 3B)

Reusable bundles of line items (e.g., "Standard Kitchen Demolition", "Bathroom Tile Package") that contractors can insert into quotes with one click. Ships with 10 default Ontario renovation templates.

**Template management:** Admin Settings → "Templates" tab → CRUD interface with category-coloured cards, create/edit dialog with inline line items editor, duplicate, delete. "Load Default Templates" seeds 10 built-in Ontario templates on first use.

**Quote editor integration:** "Insert Template" button next to "Add Line Item" opens the template picker modal. Category filter tabs (All/Kitchen/Bathroom/etc.), selectable template cards with expandable item preview showing quantities and totals. Inserts all template items as new line items with `isFromTemplate: true` and `templateName` metadata.

**Default templates (10):** Standard Kitchen Demolition, Kitchen Cabinetry Package, Bathroom Rough-In, Bathroom Tile, Basement Framing & Insulation, Basement Drywall & Paint, Hardwood Flooring Installation, Electrical Rough-In & Lighting, Exterior Paint, Permit & Inspection Package. All priced with realistic Ontario rates.

**Key files:**
| File | Purpose |
|------|---------|
| `src/app/api/admin/templates/route.ts` | GET (list, optional category filter), POST (create) |
| `src/app/api/admin/templates/[id]/route.ts` | GET, PUT, DELETE for single template |
| `src/components/admin/template-manager.tsx` | Full CRUD UI with category cards |
| `src/components/admin/template-picker.tsx` | Quote editor insertion modal |
| `src/lib/data/default-templates.ts` | 10 Ontario renovation assembly templates |
| `supabase/migrations/20260228100000_assembly_templates.sql` | Table with JSONB items, category CHECK, RLS |
| `tests/unit/assembly-templates.test.ts` | 25 tests for validation, defaults, insertion |

---

## Database Schema

**Supabase project:** NorBot-Pipeline (ktpfyangnmpwufghgasx, ca-central-1)

### Core Tables (14)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `admin_settings` | Per-tenant config (branding, pricing, plan) | `site_id`, `key`, `value` (JSONB) |
| `leads` | CRM — homeowner and contractor-created inquiries | Contact info, project details, AI transcripts, Ontario-specific fields, `created_by` (customer/contractor), `intake_method` (website/voice_dictation/text_input/form), `intake_raw_input` |
| `quote_drafts` | AI-generated quotes with versioning | Line items, tiered pricing (`tier_good`/`tier_better`/`tier_best` JSONB — tier mode inferred from array presence, not stored as a column), totals with HST, `version` (int), `sent_at`, `acceptance_token` (unique), `acceptance_status` (pending/accepted/declined), `accepted_at`, `accepted_by_name`, `accepted_by_ip` |
| `contractor_prices` | Contractor's uploaded price list (CSV) | `site_id`, `item_name`, `category` (7 types), `unit`, `unit_price` (NUMERIC 12,2), `supplier`, `uploaded_at` |
| `assembly_templates` | Reusable line item bundles | `site_id`, `name`, `category` (8 room types), `items` (JSONB array), `is_default`, `description` |
| `visualizations` | AI design concepts | Photo analysis, concepts (JSONB), generation metrics, admin review fields. Room type CHECK: kitchen, bathroom, living_room, bedroom, basement, dining_room, exterior, other. Style CHECK: modern, traditional, farmhouse, industrial, minimalist, contemporary, other. |
| `lead_visualizations` | Junction: leads ↔ visualizations | `is_primary`, `admin_selected` |
| `invoices` | Billing | Line items, payment tracking, auto-numbering (INV-YYYY-NNN) |
| `payments` | Payment log | Amount, method, reference number |
| `drawings` | CAD/technical plans | Drawing data (JSONB), status workflow |
| `chat_sessions` | Save/resume conversations | Messages (JSONB), 7-day expiry |
| `audit_log` | Change tracking | Action, old/new values, IP address |
| `visualization_metrics` | Analytics data | Generation time, validation scores, conversion tracking |
| `invoice_sequences` | Auto-increment per tenant/year | `(site_id, year)` → `last_number` |

### Key Database Functions

- `next_invoice_number(site_id)` — Returns next sequential invoice number
- `record_visualization_metrics(...)` — Inserts analytics after each generation
- `get_visualization_summary(site_id, days)` — KPI aggregation for dashboard
- `link_visualization_to_lead(...)` — Creates junction record with `is_primary` flag
- `payment_balance_update()` — Trigger: auto-updates invoice status after payment

---

## API Routes (48 endpoints)

### AI (7 routes)
| Route | Description |
|-------|-------------|
| `POST /api/ai/analyze-photo` | GPT Vision photo analysis at upload time |
| `POST /api/ai/chat` | Emma receptionist streaming chat |
| `POST /api/ai/receptionist` | Emma routing (text/voice context) |
| `POST /api/ai/summarize-voice` | Voice transcription + structured extraction |
| `POST /api/ai/visualize` | Generate 4 concepts (non-streaming, legacy) |
| `POST /api/ai/visualize/stream` | Generate 4 concepts (SSE streaming, primary) |
| `POST /api/ai/visualizer-chat` | Design chat during visualization |

### Leads (6 routes)
| Route | Description |
|-------|-------------|
| `GET/POST /api/leads` | List or create leads |
| `GET/PATCH/DELETE /api/leads/[id]` | Single lead CRUD |
| `GET /api/leads/[id]/audit` | Lead audit log |
| `POST /api/leads/intake` | Contractor lead intake (extract AI fields or create lead) |
| `POST /api/transcribe` | Whisper audio transcription for voice dictation |

### Quotes (8 routes)
| Route | Description |
|-------|-------------|
| `GET/PUT /api/quotes/[leadId]` | Retrieve or update quote |
| `GET /api/quotes/[leadId]/pdf` | Generate multi-page PDF |
| `POST /api/quotes/[leadId]/draft-email` | AI-draft email text |
| `POST /api/quotes/[leadId]/regenerate` | Re-generate from conversation |
| `POST /api/quotes/[leadId]/send` | Send via Resend email (generates acceptance token, snapshots version) |
| `GET /api/quotes/[leadId]/versions` | Quote version history |
| `GET /api/quotes/accept/[token]` | Public: fetch quote summary for acceptance page |
| `POST /api/quotes/accept/[token]` | Public: accept quote with typed name |

### Invoices (6 routes)
| Route | Description |
|-------|-------------|
| `GET/POST /api/invoices` | List or create |
| `GET/PUT/DELETE /api/invoices/[id]` | Single invoice CRUD |
| `GET /api/invoices/[id]/pdf` | Generate PDF |
| `GET/POST /api/invoices/[id]/payments` | Payment management |
| `POST /api/invoices/[id]/send` | Send via email |
| `GET /api/invoices/export/sage` | Sage 50 CSV export |

### Admin (13 routes)
| Route | Description |
|-------|-------------|
| `GET/POST /api/admin/leads/[id]/visualizations` | Lead-visualization linking |
| `POST/GET/DELETE /api/admin/prices` | CSV price upload (POST multipart), list (GET), clear all (DELETE) |
| `GET /api/admin/quote-assistance` | Quote assistance config |
| `GET/PUT/PATCH /api/admin/settings` | Tenant settings CRUD |
| `GET/POST /api/admin/templates` | List templates (GET, optional ?category= filter), create template (POST) |
| `GET/PUT/DELETE /api/admin/templates/[id]` | Single template CRUD |
| `GET/PATCH /api/admin/visualizations/[id]` | Visualization admin review |
| `GET /api/admin/visualizations/metrics` | Visualization KPIs |
| `GET /api/admin/visualizations/trends` | Daily trends (Dominate only) |

### Other (7 routes)
| Route | Description |
|-------|-------------|
| `GET/POST /api/visualizations` | Visualization CRUD |
| `GET/PATCH/POST /api/visualizations/[id]` | Single visualization |
| `GET/POST /api/drawings` | Drawing CRUD (Accelerate+) |
| `GET/PUT/DELETE /api/drawings/[id]` | Single drawing |
| `POST /api/voice/signed-url` | Voice recording URL (Dominate) |
| `GET /api/voice/check` | Voice availability check |
| `POST /api/sessions/save`, `GET /api/sessions/[id]` | Chat session persistence |

---

## Page Routes (22 pages)

### Public (accessible to all visitors)
| Route | Purpose |
|-------|---------|
| `/` | Homepage — hero, social proof bar, visualizer teaser, services, how it works, why us (with `aboutImageUrl` image or gradient fallback), testimonials |
| `/about` | Company information — hero, what we do (with `aboutImageUrl` image), mission, values (icon-mapped), certifications (conditional), team cards (Lucide `User` icon placeholder when no `photoUrl`), service area, CTA |
| `/services` | Services listing |
| `/services/[slug]` | Dynamic service detail (kitchen, bathroom, etc.) |
| `/visualizer` | AI renovation visualizer |
| `/visualizer/share/[token]` | Shareable visualization result |
| `/estimate` | Quote request flow |
| `/estimate/resume` | Resume saved session |
| `/contact` | Contact form |
| `/projects` | Portfolio / case studies |
| `/quote/accept/[token]` | Public e-signature acceptance page (no auth, token-gated) |

### Admin (gated by tier)
| Route | Tier Required | Purpose |
|-------|---------------|---------|
| `/admin/login` | — | Authentication |
| `/admin` | Accelerate+ | Dashboard overview |
| `/admin/leads` | Accelerate+ | Leads table |
| `/admin/leads/[id]` | Accelerate+ | Lead detail with visualization context |
| `/admin/quotes` | Accelerate+ | Quote management |
| `/admin/invoices` | Accelerate+ | Invoice list |
| `/admin/invoices/[id]` | Accelerate+ | Invoice detail with payments |
| `/admin/drawings` | Accelerate+ | Drawing management |
| `/admin/drawings/[id]` | Accelerate+ | Drawing editor |
| `/admin/settings` | Accelerate+ | Branding, pricing, quote assistance, price list, templates |
| `/admin/analytics` | Dominate | Recharts analytics dashboard |

---

## External Integrations

| Service | Purpose | Cost Model |
|---------|---------|------------|
| **OpenAI** (GPT-5.2, GPT-4o-mini, Whisper) | Chat, vision analysis, quote generation, moderation, intake field extraction (GPT-4o-mini), voice transcription (gpt-4o-mini-transcribe, ~$0.003/min) | Per-token |
| **Google Generative AI** (Gemini 3 Pro Image) | Renovation concept generation | Per-request |
| **ElevenLabs** | Voice agent: Emma (all tiers, web; Dominate only for phone/Twilio), single agent per tenant with session prompt overrides | Per-minute |
| **Supabase** | PostgreSQL database + file storage + RLS | Free tier / Pro |
| **Resend** | Email delivery (lead notifications, quotes, invoices) | Per-email |
| **Vercel** | Hosting, CDN, serverless functions, domain routing | Pro plan |
| **Firecrawl** | Web scraping for automated tenant onboarding (dev dependency) | Per-scrape |

---

## Automated Tenant Onboarding

New contractors can be onboarded to the platform in under 5 minutes at ~$0.07 cost:

1. **Score** — Firecrawl fitness assessment of the contractor's current website (0-100, auto-proceed at 70+)
2. **Scrape** — Multi-page extraction with hallucination filtering (placeholder detection, off-domain URL filter, markdown cross-reference)
3. **Upload** — Download images → Supabase Storage (`tenant-assets/{site-id}/`)
4. **Provision** — Seed `admin_settings` JSONB + `tenants` table + update `proxy.ts`
5. **Verify** — Playwright QA (8 checks, pass threshold 7/8)

**Invoke from Mission Control:** "Build Demo" button on candidate cards
**Invoke from CLI:** `node scripts/onboarding/onboard.mjs --url {url} --site-id {id} --tier {tier}`
**Invoke from Telegram:** `/onboard-tenant {site-id} {url} {tier}`

---

## White-Label Configuration

Every aspect of the contractor's experience is configurable per tenant:

| Parameter | Storage | UI |
|-----------|---------|------|
| Company name, tagline, phone, email, address | `admin_settings` → `business_info` | Settings page |
| Logo (SVG/PNG URL), primary colour (OKLCH), secondary colour | `admin_settings` → `branding` or `company_profile` → `logoUrl` | Settings page |
| Hero headline, subheadline, hero image | `admin_settings` → `company_profile` | Settings page |
| Services list with descriptions, features, packages | `admin_settings` → services keys | Settings page |
| Testimonials, trust badges, certifications | `admin_settings` → `company_profile` | Settings page |
| Team members (name, role, bio, photoUrl) | `admin_settings` → `company_profile` → `teamMembers` | Settings page. Cards show Lucide `User` icon when `photoUrl` is empty. Fallback: single card with company principals if no team members configured. |
| About / Why Choose image | `admin_settings` → `company_profile` → `aboutImageUrl` | Settings page. Used in About page "What We Do" section and homepage "Why Choose Us" section. Falls back to `/images/demo/flooring-vinyl.png` on About; gradient placeholder on homepage. |
| Pricing tier | `admin_settings` → `plan` | Provisioned at onboarding |
| Quote assistance mode + range band | `admin_settings` → `quote_assistance` | Settings → Quoting tab |
| Notification email addresses | `admin_settings` → `notification_emails` | Settings page |
| Custom domain | `src/proxy.ts` → `DOMAIN_TO_SITE` | Manual (or onboarding script) |
| "Powered by ConversionOS" footer | Tier-dependent visibility | Elevate: shown (60% opacity), Accelerate: shown (40% opacity), Dominate: hidden |
| Footer legal links (Privacy Policy, Terms of Service) | Rendered as non-clickable `<span>` elements | Intentional for demo tenants. Production tenants will need actual policy pages and clickable links. |
| Social proof metrics (Google rating, years, projects, licensed) | `admin_settings` → `company_profile` → `trust_metrics` | Settings page |

---

## Known Constraints & Technical Debt

| Item | Impact | Location |
|------|--------|----------|
| Depth estimation disabled | `REPLICATE_API_TOKEN` not configured; edge detection via Sharp works as fallback | `src/lib/ai/config.ts` |
| Iterative refinement disabled globally | Enabled per-request for Accelerate+ but the route doesn't use `generateWithRefinement()` | `src/lib/ai/config.ts` |
| Stripe payment gateway not integrated | Payments recorded manually (cash, cheque, e-transfer, credit card) | Invoice payment flow |
| Style History Gallery not built | Users can "Try Another Style" but can't browse across all previous generations | Visualizer results |
| Session linking not built | Multiple generations from same photo aren't linked by session_id | `visualizations` table |
| Quick Style Preview not built | No low-fidelity preview before committing to full generation | Visualizer |
| 24 pre-existing ESLint errors | Non-blocking, all in legacy code | `npm run lint` |
| `getSiteId()` is synchronous | 80+ call sites; cannot use async `headers()` from Next.js 16 | `src/lib/db/site.ts` |
| Privacy Policy / Terms of Service pages not built | Footer renders these as non-clickable `<span>` text. Production tenants will need actual policy pages with clickable links. | `src/components/footer.tsx` |
| Deposit % not read from admin_settings | API hardcodes `DEPOSIT_PERCENT = 15`. Settings UI may display a stale 50% from DB. Either make it configurable or update the DB value. | `src/app/api/quotes/[leadId]/route.ts` |
| E-signature acceptance page untested in QA | Page timed out during Playwright MCP testing. Needs manual verification with warm dev server at next session. | `src/app/quote/accept/[token]/page.tsx` |
| `tier_mode` not persisted in DB | Inferred from presence of `tier_good`/`tier_better`/`tier_best` arrays. Works correctly but means you cannot distinguish "explicitly single-tier" from "never set to tiered". | `src/app/api/quotes/[leadId]/route.ts` |

---

## Success Metrics

| Metric | Industry Baseline | Target |
|--------|-------------------|--------|
| Visitor-to-lead conversion | 2-3% | 8%+ |
| Intake completion rate | N/A | 70%+ |
| Time-to-initial response | 24-48 hours | < 2 hours (instant via AI) |
| Quote preparation time | 2-3 hours manual | < 10 minutes |
| Emma discovery questions before first estimate | 5-7 | 1-2 (context pipeline) |
| Time from "Get a Quote" to first estimate | ~8 minutes | ~3 minutes |
| Styles explored per session | 1.0 | 1.8+ |
| Generation perceived wait | ~90 seconds (progress bar) | ~41 seconds (SSE streaming) |

---

## Build & Test Status

**Quote Engine V2 status:** Final QA complete. All 12 features functional. Two bugs found and fixed during QA (dashboard null safety crash, quote save 500 from `tier_mode` column). Build clean, 511 unit tests pass, 6 E2E test suites written.

| Check | Status | Notes |
|-------|--------|-------|
| `npm run build` | Passing | TypeScript strict + Next.js build |
| `npm run test` | 511 passing | 15+ test files (pricing, schemas, visualizer, copy, transparency, markups, tiers, scope gaps, PDF utils, e-signature, quote versioning, intake extraction, fuzzy match, price upload, assembly templates) |
| `npm run lint` | Passing | 24 pre-existing errors, 123 warnings (none from recent work) |
| E2E test suites | 6 suites written | quote-editor-core, transparency-cards, tier-mode, csv-price-upload, assembly-templates, public-pages |
| SSE streaming | Verified | 4 concepts in ~41s, progressive reveal |
| Multi-tenant isolation | Verified | McCarty Squared vs ConversionOS Demo vs Red White Reno — no brand leakage |
| Tier gating | Verified | Analytics hidden for Accelerate, visible for Dominate; contractor intake on Accelerate+ |
| Mobile layout | Verified | 375x812 renders correctly |
| E-signature acceptance | **Deferred** | Page timed out during QA — needs testing at next session with warm dev server |

### QA Bugs Fixed (Feb 27, 2026)

| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 1 | `VisualizationMetricsWidget` — TypeError crash when `rate` fields are null | P1 | Added null safety checks (`?? 0`, `?? '-'`) to all rate field accesses in `visualization-metrics-widget.tsx` |
| 2 | Quote save 500 — `tier_mode` column does not exist in `quote_drafts` table | P1 | Removed `tier_mode` from DB writes in `quotes/[leadId]/route.ts`. Tier mode is now inferred from whether `tier_good`/`tier_better`/`tier_best` arrays are populated (app-level logic, not stored). |

---

## Enterprise Hardening (Feb 27, 2026)

### Authentication & Authorization

All admin routes are protected by Supabase auth middleware integrated into `src/proxy.ts` (Next.js 16 proxy layer). The proxy handles both tenant resolution (x-site-id header) and auth gating in a single pass.

**Protected routes:** `/api/admin/*`, `/api/leads` (GET only), `/api/quotes/*` (except `/api/quotes/accept/*`), `/api/invoices/*`, `/api/drawings/*`, `/admin/*` (except `/admin/login`). Returns 401 for unauthenticated API requests, redirects to `/admin/login` for page requests.

**Public routes:** All `/api/ai/*`, `/api/contact`, `/api/voice/*`, `POST /api/leads`, `/api/quotes/accept/*` (e-signature).

### Rate Limiting

Module: `src/lib/rate-limit.ts`. Uses Upstash Redis if `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set; falls back to in-memory `Map` per serverless instance. Edge-runtime compatible.

| Endpoints | Limit | Rationale |
|-----------|-------|-----------|
| `/api/ai/visualize*` | 5/min | $0.40/call (Gemini) |
| `/api/ai/chat`, `/api/ai/receptionist` | 20/min | Streaming chat |
| `/api/ai/visualizer-chat` | 15/min | Streaming chat |
| `/api/ai/analyze-photo`, `/api/ai/summarize-voice` | 10/min | Per-call cost |
| `/api/transcribe` | 5/min | Whisper cost |
| `/api/contact`, `POST /api/leads` | 5/min | Spam prevention |

Usage: `const limited = await applyRateLimit(request); if (limited) return limited;`

### Security Headers

Added to `next.config.ts` headers for all routes:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Permissions-Policy: camera=(self), microphone=(self), geolocation=()`
- `Content-Security-Policy` with scoped directives for self, ElevenLabs CDN, Supabase, Sentry

### Error Handling

All API routes return generic error messages to clients. Internal error details (`error.code`, `error.hint`, `error.message`) are logged via `console.error()` only. No stack traces or database hints are exposed.

### Input Validation

- **OKLCH injection:** `src/app/layout.tsx` validates `branding.primaryOklch` against `/^\d+(\.\d+)?\s+\d+(\.\d+)?\s+\d+(\.\d+)?$/` before `dangerouslySetInnerHTML`
- **PostgREST escape:** `src/app/api/leads/route.ts` escapes `,()%_\*` in search queries
- **Audio validation:** `src/app/api/transcribe/route.ts` enforces 10MB size limit and MIME type allowlist
- **Query param clamping:** `/api/admin/visualizations/trends` clamps `days` to 1-365

### Monitoring

Sentry integration via `@sentry/nextjs`. Config files: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation.ts`. Only active when `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` env var is set. PII scrubbing enabled (cookies, auth headers stripped from error reports).

### Compliance

- **Privacy Policy:** `/privacy` — PIPEDA-compliant, covers data collected, AI services used (OpenAI, Google, ElevenLabs), retention, rights. Server component using `getBranding()`.
- **Terms of Service:** `/terms` — Ontario-governed, covers AI disclaimers, acceptable use, liability. Server component using `getBranding()`.
- **Data Deletion:** `/data-deletion` — Public form. API `POST /api/data-deletion` marks matching leads with `deletion_requested_at` timestamp. 30-day processing timeline.
- **CASL Consent:** `email-capture-modal.tsx` sends `marketingOptIn` + `consentTimestamp` with visualization requests.
- **Deny-by-default tier:** `DEFAULT_TIER` is `'elevate'` (not `'accelerate'`). On DB failure, tenants degrade to public-only features.

### CI/CD

`.github/workflows/ci.yml` — Three jobs: `lint-typecheck` → `test-unit` → `build`. Runs on push/PR to `main`. E2E tests excluded (need running server).

### Pre-commit Hooks

Husky + lint-staged. Pre-commit runs `eslint --fix` on staged `.ts/.tsx` files + `tsc --noEmit` for type checking.

### Test Infrastructure

- **Entitlements tests:** `tests/unit/entitlements.test.ts` — 60 tests covering all 18 features × 3 tiers exhaustively
- **Coverage thresholds:** `vitest.config.ts` — lines 30%, functions 25%, branches 25%, statements 30%
- **Browser coverage:** Playwright config includes Firefox and WebKit (Desktop Safari) alongside existing Chrome, Mobile, Tablet
- **Cross-tenant E2E:** `tests/e2e/v2/cross-tenant.spec.ts` — verifies leads and admin_settings isolated between tenants
- **Quality gates extraction:** `scripts/onboarding/lib/quality-gates.mjs` — shared functions extracted from provision.mjs

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
