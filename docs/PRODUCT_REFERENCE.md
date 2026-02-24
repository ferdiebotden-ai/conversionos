# ConversionOS — Product Reference

**Last updated:** February 24, 2026 | **Updated by:** Claude Code (Session 5)

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
- **Emma** (receptionist chat widget) engages visitors instantly on every page
- **The AI Visualizer** lets homeowners upload a photo of their room and see it transformed in 4 design styles — in under a minute
- **Marcus** (quote specialist) receives the full context from the visualizer — room dimensions, fixtures, materials, preferences — and produces a ballpark estimate without re-asking questions the homeowner already answered
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
| AI Quote Engine (Marcus) | — | Yes | Yes |
| PDF quote generation + email sending | — | Yes | Yes |
| Invoicing + payment tracking | — | Yes | Yes |
| Architecture drawings management | — | Yes | Yes |
| Cost range indicator (visualizer) | — | Yes | Yes |
| Quote assistance (admin-configurable) | — | Yes | Yes |
| Voice agents (Emma, Marcus, Mia via ElevenLabs) | — | — | Yes |
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
| Component library | shadcn/ui + Radix UI | Latest | 10+ primitive libraries |
| Charts | Recharts | 3.7.0 | Dominate-tier analytics only |
| State management | Zustand | 5.0.11 | Client-side state |
| Animation | Framer Motion | Latest | UI transitions |
| Chat/Vision AI | OpenAI GPT-5.2 | via Vercel AI SDK v6 | Chat, photo analysis, quote generation, extraction |
| Image generation | Google Gemini 3 Pro Image | gemini-3-pro-image-preview | 4 renovation concepts per generation |
| Voice agents | ElevenLabs Conversational AI | @elevenlabs/react 0.14.0 | Dominate tier only |
| Content moderation | OpenAI omni-moderation-latest | — | All user inputs |
| Database | Supabase (PostgreSQL) | @supabase/supabase-js 2.93.3 | ca-central-1 region, RLS enabled |
| File storage | Supabase Storage | — | Photos, concepts, PDFs, tenant assets |
| Email | Resend | 6.9.1 | Lead notifications, quote delivery, invoice sending |
| PDF | @react-pdf/renderer + jspdf | — | Quotes and invoices |
| Image processing | Sharp | 0.34.5 | Compression, resizing, edge detection |
| Mobile photos | heic2any | — | HEIC/HEIF conversion from iOS |
| AI framework | Vercel AI SDK | 6.0.67 | Streaming, structured outputs, tool calling |
| Validation | Zod | 4.3.6 | All AI outputs validated before render/store |
| Testing | Vitest + Playwright | — | 139 unit tests, E2E browser automation |

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

The `admin_settings` table stores per-tenant JSONB configuration under keys like `business_info`, `branding`, `company_profile`, and `plan`. Server-side rendering reads this via `getBranding()`. Client components receive it through `BrandingProvider` + `useBranding()` context. CSS variables (including the primary colour in OKLCH) are injected in the root layout.

### Current Tenants

| Site ID | Domain | Tier | Contractor |
|---------|--------|------|------------|
| `demo` | ai-reno-demo.vercel.app | Accelerate | AI Reno Demo (base demo) |
| `mccarty-squared` | mccarty.norbotsystems.com | Dominate | McCarty Squared (real client demo) |
| `redwhitereno` | redwhite.norbotsystems.com | Accelerate | Red White Reno (first paying customer) |

---

## User Journeys

### Homeowner Journey

1. **Landing** (`/`) — Branded homepage with hero, "Get Your Estimate in Minutes" CTA, project-type quick selector ("What are you planning?" — 6 options), interactive before/after visualizer teaser, services, testimonials, trust badges. All content driven by database.

2. **Visualizer** (`/visualizer`) — Upload a photo of their room (drag-and-drop on desktop, "Take a Photo" or "Choose from Gallery" on mobile). Photo pre-analysis fires immediately via GPT Vision — detects room type, layout, dimensions, fixtures, condition. Room type selector auto-fills from analysis.

3. **Style selection** — Choose from 8 room types and 6 design styles (Modern, Traditional, Farmhouse, Industrial, Minimalist, Contemporary). Add text preferences. Optionally speak to Mia (voice design consultant, Dominate only) for richer preference capture.

4. **Generation** — SSE streaming endpoint generates 4 concepts in parallel via Gemini 3 Pro Image. Progressive reveal: skeleton cards cross-fade to real images as concepts arrive (~15-20s per concept, ~41s total). Real-time progress stages shown during generation.

5. **Results** — Before/after slider comparison. Enriched AI-generated descriptions for each concept (not generic labels). Cost range indicator for Accelerate+ tenants ($30K-$60K + HST format). "Try Another Style" preserves photo and room type, resets style. "Get a Personalised Estimate" hands off to Marcus (Accelerate+) or "Request a Callback" (Elevate).

6. **Quote** (`/estimate`) — Marcus receives the full handoff context: photo analysis (dimensions, layout, fixtures, condition), selected concept, material preferences, voice-extracted preferences, cost signals, and the contractor's quote assistance mode. Marcus skips discovery questions and goes straight to refinement.

7. **Lead capture** — Contact information collected. Lead created in database with full visualization context, chat transcript, and AI-generated scope. Contractor notified by email.

### Contractor (Admin) Journey

1. **Login** (`/admin/login`) — Authentication via admin credentials.

2. **Dashboard** (`/admin`) — Overview of leads, visualization metrics, pipeline health.

3. **Leads** (`/admin/leads`) — Searchable, filterable table of all leads. Feasibility badges (colour-coded dots: green 4-5, yellow 3, red 1-2). Click into lead detail for full context: contact info, visualization panel, chat transcript, cost analysis.

4. **Quotes** (`/admin/quotes`) — AI-generated quotes with line items, tiered pricing (good/better/best), PDF generation, email sending.

5. **Invoices** (`/admin/invoices`) — Create from quotes, track payments (cash, cheque, e-transfer, credit card), auto-update status (draft → sent → partially paid → paid). PDF generation. Sage 50 CSV export.

6. **Drawings** (`/admin/drawings`) — CAD-style drawing management for technical plans.

7. **Settings** (`/admin/settings`) — Business info, branding, pricing parameters, quote assistance mode (none/range/estimate with configurable range band).

8. **Analytics** (`/admin/analytics`, Dominate only) — Recharts dashboard: daily visualization trends, room type distribution, generation time tracking, conversion rates. KPI cards with period-over-period deltas.

---

## AI Agents

### Emma — The Receptionist

**Role:** Smart chat widget on all public pages. Available to all tiers (text only for Elevate/Accelerate, text + voice for Dominate).

**Powered by:** GPT-5.2 via Vercel AI SDK streaming.

**Personality:** Warm, concise (2-3 sentences max), conversational. Uses contractions and casual language. Never info-dumps.

**Capabilities:**
- Answers questions about the contractor's services, process, and general pricing ranges
- Routes to the visualizer (`/visualizer`) for design exploration
- Routes to the estimate page (`/estimate`) for detailed quotes
- Captures lead information when the homeowner is ready
- Page-aware — adapts context based on which page the homeowner is browsing

**Routing mechanism:** CTA markers `[CTA:Label:/path]` rendered as clickable buttons in the chat widget. Emma never says "let me connect you to Marcus" without providing a CTA link.

**Knowledge layers:** Company profile → services summary → Ontario general knowledge → pricing summary → sales training → persona rules. Knowledge is dynamically injected based on keyword detection in the user's message.

### Marcus — The Quote Specialist

**Role:** Conversational quote intake. Available to Accelerate and Dominate tiers.

**Powered by:** GPT-5.2 via Vercel AI SDK streaming.

**Personality:** Professional, structured, confident. Asks one question at a time. Provides helpful context about budget ranges. Acknowledges responses before moving on.

**Context pipeline (the core moat):**
When a homeowner arrives from the visualizer, Marcus receives:
- **Photo analysis:** Room layout, estimated dimensions, ceiling height, wall count + dimensions, identified fixtures, structural elements, current condition — from GPT Vision
- **Design preferences:** Selected style, text preferences, voice-extracted preferences (desired changes, material preferences, preservation notes)
- **Cost signals:** AI-estimated cost range, material breakdown hints — from Ontario pricing database
- **Quote assistance mode:** Whether the contractor wants no pricing, ranges, or point estimates shown to homeowners

This means Marcus can skip the typical 5-7 discovery questions and go straight to refinement: "I can see you have an L-shaped kitchen, roughly 12 by 14 feet. Based on the Modern style you chose with marble counters, here's what I'm estimating..."

**Knowledge layers:** Company summary → full services → Ontario pricing database (14 trades, 50+ materials, 9 regional multipliers) → Ontario budget knowledge → sales training → persona rules → handoff context.

### Mia — The Design Consultant

**Role:** Voice-based design consultation during the visualizer flow. Dominate tier only.

**Powered by:** ElevenLabs Conversational AI (voice) + GPT-5.2 (text fallback).

**Personality:** Creative, enthusiastic, visually descriptive. Gets excited about design ideas. Offers concrete options when the homeowner is unsure.

**Capabilities:**
- Guides homeowners through style exploration
- Extracts structured preferences (desired changes, material preferences, preservation notes) via `VoiceExtractedPreferences`
- Preferences feed directly into the generation prompt and Marcus handoff

### Persona Architecture

All three agents use a layered prompt system:
1. **Persona identity** — Name, role, personality traits, capabilities, boundaries
2. **Company knowledge** — Dynamically loaded from `admin_settings` per tenant
3. **Domain knowledge** — Ontario pricing, design styles, general renovation knowledge
4. **Sales training** — Shared conversion techniques
5. **Dynamic injection** — Cross-domain knowledge added based on keyword detection
6. **Handoff context** — Rich structured data from previous interactions

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

**AI prompt integration:** `PRICING_FULL` and `PRICING_SUMMARY` constants are auto-generated from the typed data, injected into Marcus's and Emma's system prompts. This ensures AI pricing advice matches the database exactly.

---

## Quote Assistance System

Per-tenant configuration controlling how pricing is displayed to homeowners:

| Mode | Behaviour | Example |
|------|-----------|---------|
| `none` | No pricing shown. Marcus tells homeowners the contractor will follow up. | — |
| `range` | Cost ranges displayed. Marcus uses "typically runs between $X and $Y." | $30,000 - $60,000 + HST |
| `estimate` | Point estimates with disclaimers. Marcus provides specific numbers. | ~$45,000 + HST (subject to site inspection) |

- **Elevate:** Always `none` (no admin dashboard to configure)
- **Accelerate/Dominate default:** `{ mode: 'range', rangeBand: 10000 }`
- **Admin UI:** Settings page → "Quoting" tab → mode dropdown + range band selector + live preview
- **Storage:** `quote_assistance` key in `admin_settings` JSONB

The mode flows through the entire pipeline: cost range indicator in the visualizer → handoff context → Marcus's prompt instructions.

---

## Database Schema

**Supabase project:** NorBot-Pipeline (ktpfyangnmpwufghgasx, ca-central-1)

### Core Tables (12)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `admin_settings` | Per-tenant config (branding, pricing, plan) | `site_id`, `key`, `value` (JSONB) |
| `leads` | CRM — homeowner inquiries | Contact info, project details, AI transcripts, Ontario-specific fields |
| `quote_drafts` | AI-generated quotes | Line items, tiered pricing (good/better/best), totals with HST |
| `visualizations` | AI design concepts | Photo analysis, concepts (JSONB), generation metrics, admin review fields |
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

## API Routes (36 endpoints)

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

### Leads (4 routes)
| Route | Description |
|-------|-------------|
| `GET/POST /api/leads` | List or create leads |
| `GET/PATCH/DELETE /api/leads/[id]` | Single lead CRUD |
| `GET /api/leads/[id]/audit` | Lead audit log |

### Quotes (5 routes)
| Route | Description |
|-------|-------------|
| `GET/PUT /api/quotes/[leadId]` | Retrieve or update quote |
| `GET /api/quotes/[leadId]/pdf` | Generate PDF |
| `POST /api/quotes/[leadId]/draft-email` | AI-draft email text |
| `POST /api/quotes/[leadId]/regenerate` | Re-generate from conversation |
| `POST /api/quotes/[leadId]/send` | Send via Resend email |

### Invoices (6 routes)
| Route | Description |
|-------|-------------|
| `GET/POST /api/invoices` | List or create |
| `GET/PUT/DELETE /api/invoices/[id]` | Single invoice CRUD |
| `GET /api/invoices/[id]/pdf` | Generate PDF |
| `GET/POST /api/invoices/[id]/payments` | Payment management |
| `POST /api/invoices/[id]/send` | Send via email |
| `GET /api/invoices/export/sage` | Sage 50 CSV export |

### Admin (7 routes)
| Route | Description |
|-------|-------------|
| `GET/POST /api/admin/leads/[id]/visualizations` | Lead-visualization linking |
| `GET /api/admin/quote-assistance` | Quote assistance config |
| `GET/PUT/PATCH /api/admin/settings` | Tenant settings CRUD |
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

## Page Routes (21 pages)

### Public (accessible to all visitors)
| Route | Purpose |
|-------|---------|
| `/` | Homepage — hero, project selector, visualizer teaser, services, testimonials |
| `/about` | Company information |
| `/services` | Services listing |
| `/services/[slug]` | Dynamic service detail (kitchen, bathroom, etc.) |
| `/visualizer` | AI renovation visualizer |
| `/visualizer/share/[token]` | Shareable visualization result |
| `/estimate` | Quote request flow |
| `/estimate/resume` | Resume saved session |
| `/contact` | Contact form |
| `/projects` | Portfolio / case studies |

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
| `/admin/settings` | Accelerate+ | Branding, pricing, quote assistance config |
| `/admin/analytics` | Dominate | Recharts analytics dashboard |

---

## External Integrations

| Service | Purpose | Cost Model |
|---------|---------|------------|
| **OpenAI** (GPT-5.2) | Chat, vision analysis, quote generation, moderation | Per-token |
| **Google Generative AI** (Gemini 3 Pro Image) | Renovation concept generation | Per-request |
| **ElevenLabs** | Voice agents: Emma, Marcus, Mia (Dominate only) | Per-minute |
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
| Logo, primary colour (OKLCH), secondary colour | `admin_settings` → `branding` | Settings page |
| Hero headline, subheadline, hero image | `admin_settings` → `company_profile` | Settings page |
| Services list with descriptions, features, packages | `admin_settings` → services keys | Settings page |
| Testimonials, trust badges, certifications | `admin_settings` → `company_profile` | Settings page |
| Pricing tier | `admin_settings` → `plan` | Provisioned at onboarding |
| Quote assistance mode + range band | `admin_settings` → `quote_assistance` | Settings → Quoting tab |
| Notification email addresses | `admin_settings` → `notification_emails` | Settings page |
| Custom domain | `src/proxy.ts` → `DOMAIN_TO_SITE` | Manual (or onboarding script) |

---

## Known Constraints & Technical Debt

| Item | Impact | Location |
|------|--------|----------|
| Room type DB CHECK constraint allows only 6 of 8 UI types | "exterior" and "other" silently map to "living_room" | `visualizations.room_type` |
| Handoff uses sessionStorage with 15-min TTL | Context lost if user refreshes, opens new tab, or returns later | `src/lib/chat/handoff.ts` |
| Depth estimation disabled | `REPLICATE_API_TOKEN` not configured; edge detection via Sharp works as fallback | `src/lib/ai/config.ts` |
| Iterative refinement disabled globally | Enabled per-request for Accelerate+ but the route doesn't use `generateWithRefinement()` | `src/lib/ai/config.ts` |
| Stripe payment gateway not integrated | Payments recorded manually (cash, cheque, e-transfer, credit card) | Invoice payment flow |
| Style History Gallery not built | Users can "Try Another Style" but can't browse across all previous generations | Visualizer results |
| Session linking not built | Multiple generations from same photo aren't linked by session_id | `visualizations` table |
| Quick Style Preview not built | No low-fidelity preview before committing to full generation | Visualizer |
| 24 pre-existing ESLint errors | Non-blocking, all in legacy code | `npm run lint` |
| `getSiteId()` is synchronous | 80+ call sites; cannot use async `headers()` from Next.js 16 | `src/lib/db/site.ts` |

---

## Success Metrics

| Metric | Industry Baseline | Target |
|--------|-------------------|--------|
| Visitor-to-lead conversion | 2-3% | 8%+ |
| Intake completion rate | N/A | 70%+ |
| Time-to-initial response | 24-48 hours | < 2 hours (instant via AI) |
| Quote preparation time | 2-3 hours manual | < 10 minutes |
| Marcus discovery questions before first estimate | 5-7 | 1-2 (context pipeline) |
| Time from "Get a Quote" to first estimate | ~8 minutes | ~3 minutes |
| Styles explored per session | 1.0 | 1.8+ |
| Generation perceived wait | ~90 seconds (progress bar) | ~41 seconds (SSE streaming) |

---

## Build & Test Status

| Check | Status | Notes |
|-------|--------|-------|
| `npm run build` | Passing | TypeScript strict + Next.js build |
| `npm run test` | 139 passing | 6 test files (pricing, schemas, visualizer, etc.) |
| `npm run lint` | Passing | 24 pre-existing errors, 123 warnings (none from recent work) |
| SSE streaming | Verified | 4 concepts in ~41s, progressive reveal |
| Multi-tenant isolation | Verified | McCarty Squared vs AI Reno Demo — different everything |
| Tier gating | Verified | Analytics hidden for Accelerate, visible for Dominate |
| Mobile layout | Verified | 375x812 renders correctly |

---

*This document describes the product as it exists in the codebase. It is not a roadmap. Items listed under Known Constraints are acknowledged gaps, not planned features. Update this document after any session that changes features, AI models, database schema, API routes, or handoff mechanisms.*
