# ConversionOS — Product Reference

**Last updated:** March 3, 2026

---

## What ConversionOS Is

ConversionOS is a white-label AI renovation platform that turns contractor websites into lead generation machines. A homeowner uploads a photo of their kitchen, bathroom, or basement, and within 30 seconds sees four photorealistic concepts of what their renovation could look like — branded to the contractor. They chat with an AI design advisor (Emma), refine their vision, and submit a lead request. The contractor receives the lead with full context: the original photo, generated concepts, the homeowner's starred favourites, chat transcript, and an AI-generated quote draft.

**Company:** NorBot Systems Inc. (Stratford, Ontario) | **CEO:** Ferdie Botden, CPA
**Model:** B2B SaaS — sold to contractors, used by their homeowner customers
**Deployment:** Single codebase serving all contractors, branded per-tenant via database configuration

---

## Who We Sell To (NorBot's ICP)

**Primary buyer:** Ontario residential renovation contractors

| Attribute | Profile |
|-----------|---------|
| **Company size** | 5-50 employees |
| **Revenue** | $1M-$15M annually |
| **Services** | Kitchen, bathroom, basement renovations (full-service or specialty) |
| **Current quoting** | Manual — pen-and-paper, spreadsheets, or basic software |
| **Online presence** | Basic website, few leads from web, relies on referrals and yard signs |
| **Pain points** | Slow quoting (days, not minutes), losing bids to faster competitors, no way to "show" the homeowner what the reno will look like |
| **Decision maker** | Owner/operator or VP of Sales |
| **Geography** | Ontario (expanding to other Canadian provinces) |

**Three tiers map to contractor sophistication:**
- **Elevate ($249/mo):** Smaller contractors who want a modern branded website with AI — entry point
- **Accelerate ($699/mo):** Mid-size contractors ready for AI-powered quoting and lead management
- **Dominate ($2,500/mo):** Premium contractors who want exclusive territory ownership and full platform access

---

## Who Their Customers Are (Homeowner ICP)

The homeowner is the end-user of the platform — the person uploading photos and requesting estimates.

| Attribute | Profile |
|-----------|---------|
| **Age** | 30-65 years old |
| **Household income** | $100K+ |
| **Renovation budget** | $15K-$150K |
| **Stage** | Researching and planning — not yet committed to a contractor |
| **Behaviour** | Browses online, wants to "see it before committing," compares 2-3 contractors |
| **Motivation** | Tired of imagining from Pinterest boards — wants their actual space transformed |
| **Decision trigger** | Seeing a photorealistic concept of their own room changes "maybe someday" to "let's do this" |

**Why ConversionOS converts:** The homeowner uploads a photo of their actual space and sees four professional concepts in 30 seconds. This is fundamentally different from browsing a portfolio of someone else's kitchen. The emotional connection to their own space, reimagined, is the conversion driver.

---

## Pricing Tiers

| | Elevate | Accelerate | Dominate |
|---|---|---|---|
| **Setup** | $1,500 | $4,500 | $20,000 |
| **Monthly** | $249/mo | $699/mo | $2,500/mo |
| **Positioning** | Modern branded website + AI visualizer | Full AI quoting platform | Exclusive territory + founder-led growth |

### What Each Tier Gets

**All tiers:**
- Fully branded website (company name, colours, logo, services, testimonials)
- AI Design Studio (4 photorealistic concepts per upload, before/after slider at 85% opacity)
- Portfolio gallery with full-screen lightbox, room-type filtering with count badges, and "Inspired by Our Work?" AI Visualizer CTA
- Homepage gallery teaser (featured projects section)
- Before/after comparison slider (where paired images exist)
- Emma AI text chat (design guidance, context-aware, concept-specific awareness)
- Concept starring + email favourites
- Lead capture + email notification (with optional "anything else" free-text field)
- Mobile camera capture (take a photo, get concepts instantly)

**Accelerate adds:**
- Admin dashboard (leads, quotes, invoicing, settings)
- AI Quote Engine (auto-generated quotes from room analysis with full cost breakdowns)
- PDF quotes with e-signature acceptance
- Contractor lead intake (text, form)
- Cost range indicator on visualizer results
- Live design refinement (up to 3 AI-powered re-renders)
- Assembly templates, CSV price upload, analytics

**Dominate adds:**
- Phone/Twilio voice agent (Emma answers inbound calls)
- Analytics dashboard (daily trends, room types, conversions)
- Territory exclusivity (one contractor per city)
- Custom integrations
- Founder-led onboarding and growth support

---

## The Homeowner Journey (Design Studio)

The entire homeowner experience happens on a single page — no clicking between forms, no separate estimate page. The homeowner never feels like they're "filling out a form." They're designing their space.

### Step 1: Upload a Photo (or Skip It)
The homeowner takes a photo of their kitchen, bathroom, or basement (camera on mobile, drag-and-drop on desktop). AI immediately analyses the photo — detecting room type, dimensions, layout, fixtures, and condition.

**No-photo fallback:** A skip link below the upload area ("Don't have a photo? Tell us about your project...") opens an alternative path with an embedded Emma chat panel and a standalone lead capture form. This is also accessible via `/visualizer?mode=chat` (linked from the homepage final CTA). The lead form captures name, email, phone, project type (7 options), timeline, and notes — and submits with `source: 'chat_no_photo'` for separate tracking in analytics.

### Step 2: Choose a Style
Eight room types and six design styles (Modern, Traditional, Contemporary, Transitional, Minimalist, Industrial). The room type is pre-filled from the AI analysis. Optional: type design preferences ("marble countertops, brass fixtures, warm tones").

### Step 3: AI Generates 4 Concepts (~30 seconds)
Four photorealistic concepts stream in progressively via SSE with a smooth, dopamine-inducing loading experience. A RAF-based progress bar interpolates smoothly (no 20% jumps), staged status messages explain what's happening ("Analysing your space...", "Designing concepts..."), and each concept cross-fades from blur to sharp as it arrives. A concept counter ("2 of 4 concepts ready!") keeps the homeowner engaged. Each concept preserves the actual room geometry while applying the chosen style.

### Step 4: Explore and Refine

**Side-by-side layout (desktop):** The before/after slider ("Your Photo" vs. "Concept N") sits on the left with a vertical stack of concept thumbnails on the right. On mobile, these stack vertically — full-width slider above, thumbnails in a horizontal row below.

- **Single active concept:** The homeowner taps one concept to work on — this selects AND stars it in a single action (only one active at a time). The active concept gets a prominent ring and filled star badge; others are slightly dimmed. This is the concept Emma discusses and refinement targets.
- **Before/after slider:** Drag to compare original vs. concept. During refinement, an "Updating..." overlay appears on the slider. After refinement, the slider label updates to show the version (e.g., "Concept 2 — V2").
- **Version badges:** When a concept is refined, its thumbnail updates to show the new image with a version badge (V2, V3) in the bottom-left corner.
- **Concept awareness header:** A subtle header bar above the chat shows the active concept thumbnail and "Discussing Concept N". When the user switches concepts, a divider appears in the conversation. Emma's prompt includes an emphatic ACTIVE CONCEPT section — she always references the correct concept number.
- **Chat with Emma:** An inline AI design advisor appears below the results. Emma opens with "Tap the concept that catches your eye — I'll help you refine it" and waits for the homeowner to engage — no buttons until they do.
- **Suggestion chips:** After each response, Emma offers 2 short clickable suggestions (max 8 words each) inline below her message. They scroll naturally with the conversation. Clicking sends the suggestion as a message.
- **Quick action toolbar:** A compact fixed toolbar sits above the chat input with contextual actions:
  - After the 1st exchange: "Apply My Feedback" (with tooltip explaining it refines the active concept based on the conversation)
  - After the 2nd exchange: "Get My Estimate" (Accelerate+) or "Email My Designs" (Elevate)
- **Up to 3 refinements:** The "Apply My Feedback" button silently disappears after the 3rd use. No counter, no pressure.
- **Refinement loading:** A styled overlay replaces the grey spinner — "Applying your feedback..." with backdrop blur and progress animation. The refine endpoint now receives the last 10 user messages (not just keyword signals) so Gemini produces visually distinct results.
- **Try a Different Style:** A prominent button below the chat lets the homeowner return to style selection while keeping their original photo.

### Step 5: Connect
- **Accelerate+:** An inline lead capture form slides in below the chat (name, email, phone, timeline, optional "Anything else we should know?" free-text field). On submit, the contractor receives the lead with full context and an AI-generated quote draft.
- **Elevate:** The homeowner can email their starred designs to themselves or request a callback.

The homeowner never navigates away from the page. Each phase builds below the previous one — a natural scroll through their design journey.

---

## The Contractor Journey (Admin Dashboard)

Available on Accelerate and Dominate tiers.

### Leads
Every lead arrives with full context: the homeowner's original photo, AI-generated concepts, starred favourites, Emma's chat transcript, room analysis (dimensions, condition, layout), and design preferences. On Accelerate+, an AI-generated quote draft is automatically created — incorporating concept pricing data (materials identified by AI vision, finish level, cost estimates).

The lead detail page shows the homeowner's preferred concept prominently with a gold star badge, and the Visualizations tab includes a collapsible Design Studio Chat section showing the full conversation in message bubble format.

### Quoting
The AI Quote Engine generates structured quotes with transparency cards showing the math behind every line item — materials, labour rates, Ontario pricing sources, and AI confidence score (colour-coded badge). Contractors can:
- Review and customise AI-generated quotes
- Upload their own price list (CSV) — AI prioritises contractor prices over defaults
- Use assembly templates (reusable line item bundles for common work)
- Detect scope gaps (20+ rules check for missing items like waterproofing, permits, demolition)
- Send multi-page PDFs with e-signature acceptance
- Click any row in the Quotes list to navigate directly to that quote

### Invoicing
Create invoices directly from accepted quotes. Payment tracking, PDF generation, Sage 50 CSV export.

### Settings
Business info, branding (colours, logo, hero), pricing configuration, quote assistance mode, category markups, price lists, templates — all self-serve.

### Analytics (Dominate only)
Daily trends, room type distribution, generation times, conversion metrics via Recharts. KPI cards show total visualizations, avg generation time, viz-to-lead rate, and total leads with chat-only vs visualizer breakdown.

---

## Emma — AI Design Advisor

Emma is a single AI persona that adapts to context. On the homepage, she's a receptionist. In the Design Studio, she's a design consultant who knows the homeowner's room inside and out. On the admin side, she generates quotes.

**Personality:** Warm, concise (2-3 sentences), conversational. Uses "we" language. Guides without pushing — never says "2 refinements remaining" or creates urgency.

**Voice:** All voice and dictation features removed from chat interfaces (ElevenLabs unreliable, Web Speech API inconsistent). All chat UIs are text-only. Voice API routes and provider components retained in codebase but fully disconnected from UI. Phone/Twilio on Dominate only (not yet deployed).

**Tier awareness:**
- **Elevate:** Emma never discusses dollar amounts. Routes pricing questions to the contractor's contact page.
- **Accelerate+:** Emma provides preliminary cost ranges when asked, using the Ontario pricing database.

**Design Studio integration:** After concepts generate, Emma appears inline below the results. Her prompt includes the full room analysis, design preferences, the active concept, and tier-specific pricing rules — she already knows the space. She ends responses with exactly 2 short suggestion chips (max 8 words each) that appear inline below her message. A compact action toolbar above the input shows contextual buttons (Refine, Estimate) as the conversation deepens.

---

## AI Stack

| Component | Model | Purpose | Cost per Use |
|-----------|-------|---------|------|
| Chat + Vision | GPT-5.2 | Emma's conversations, photo analysis, quote generation | ~$0.01-0.05 |
| Image generation | Gemini 3.1 Flash Image (Nano Banana 2) | 4 photorealistic concepts | ~$0.27 |
| Refinement | Gemini 3.1 Flash Image | Re-render starred concept | ~$0.07 |
| Voice | ElevenLabs Conversational AI | Emma's voice (infra retained, UI removed) | ElevenLabs pricing |
| Receptionist chat | GPT-5.2 | Emma homepage widget + no-photo chat | ~$0.01-0.03 |

**Total cost per session:** ~$0.36 (no refinements) to ~$0.56 (3 refinements). Well within the $150/mo API cap at 50 sessions/month.

---

## Tech Stack

Next.js 16 (App Router) | React 19 | TypeScript 5 (strict) | Tailwind v4 | shadcn/ui | Zustand | Framer Motion | Supabase (PostgreSQL, ca-central-1, RLS) | Vercel AI SDK v6 | Sentry | Vitest (889 tests) | Playwright (9 E2E suites, 12 Design Studio tests) | Husky + lint-staged CI

---

## Multi-Tenancy

Single codebase, single branch (`main`), unlimited contractors. Every contractor gets a fully branded experience driven by database configuration — no per-tenant code.

- **Domain routing:** `src/proxy.ts` maps hostnames to tenant IDs (e.g., `red-white-reno.norbotsystems.com` → `red-white-reno`). Production unknown hosts get 404 (no fallback).
- **Data isolation:** Every table includes `site_id`. All 33 API route files resolve tenant via `getSiteIdAsync()` (reads proxy `x-site-id` header at runtime). Row-Level Security enforces tenant boundaries at the database level.
- **Branding:** Colours, logo, services, testimonials, contact info — all from the `admin_settings` table per tenant
- **Feature gating:** `canAccess(tier, feature)` — pure function, no hardcoded tier checks
- **Image validation:** All AI image upload endpoints validate MIME type (jpeg/png/webp) and decoded size (max 10MB) before processing
- **Rate limiting:** 15 endpoints rate-limited via Upstash Redis with in-memory fallback (5-20 req/min depending on endpoint)

### Current Tenants

| Tenant | Domain | Tier | Portfolio |
|--------|--------|------|-----------|
| ConversionOS Demo | conversionos-demo.norbotsystems.com | Accelerate | Base platform |
| Red White Reno | red-white-reno.norbotsystems.com | Accelerate | 23 images |
| BL Renovations | bl-renovations.norbotsystems.com | Accelerate | 12 images |
| CCR Renovations | ccr-renovations.norbotsystems.com | Accelerate | 20 images |
| McCartry Squared | mccarty-squared-inc.norbotsystems.com | Accelerate | 22 images |

### Automated Onboarding

New tenants are onboarded via the tenant-builder pipeline. Pipeline: ICP score (6-criterion, contact completeness + geography + sophistication gap) → scrape brand assets + portfolio images (10-20 per tenant) → provision database → deploy → 9-module QA → post-QA polish queue/manual review → outreach email draft. Triggered from Mission Control ("Build Demo" button), CLI, or Telegram.

ICP scoring prioritises small-town Ontario contractors near Stratford with complete contact data and basic websites. Pipeline targets sorted by `icp_score` — built tenants auto-drop (`status = 'bespoke_ready'`).

After QA, the builder writes `codex-polish/queue/pending/{site-id}.json`. While that queue item exists, outreach is held. Codex (or Ferdie manually) clears the queue by applying a tenant-scoped `admin_settings` patch or marking the polish job complete, then the draft-creation scripts pick the tenant up automatically.

Gallery images are scraped from original contractor websites and uploaded to Supabase Storage. The `upgrade-tenant-gallery.mjs` script handles bulk image downloads and portfolio data updates.

---

## Ontario Pricing Database

Typed database of 14 trade rates, 50+ material costs, 9 regional multipliers, and 8 room type estimates. Powers cost ranges in the visualizer and the AI quote engine. Pure functions — no database calls, client-safe. Source: `src/lib/ai/knowledge/pricing-data.ts`.

---

## Quote Assistance System

Per-tenant setting that controls how pricing appears to homeowners:
- **None:** No pricing shown (default for Elevate)
- **Range:** Cost ranges snapped to configurable bands (e.g., "$25,000-$35,000")
- **Estimate:** Point estimate with disclaimer

Contractors configure this in Settings → Quoting. All website copy adapts automatically — CTAs, button labels, and Emma's responses adjust based on the mode.

---

## Database

Supabase PostgreSQL (ca-central-1) with Row-Level Security. 14 tables covering admin settings, leads (with contractor intake fields), quote drafts (versioned, e-signature), contractor prices (CSV upload), assembly templates, visualizations (with concept_pricing JSONB), invoices, payments, drawings, chat sessions, and audit logging. Tiered quoting DB columns (tier_good/tier_better/tier_best) remain but are unused.

33 API routes handle AI operations, lead management, quoting, invoicing, and admin settings. All routes resolve tenant identity at runtime via `getSiteIdAsync()` (proxy header) and enforce tier-based access control via `canAccess(tier, feature)`.

---

## Security and Compliance

- **Authentication:** Supabase auth (bypassed in demo mode for prospect previews)
- **Tenant isolation:** All 33 API routes resolve tenant from proxy header at runtime (`getSiteIdAsync()`), not build-time env var. Production unknown hosts get 404.
- **Rate limiting:** Upstash Redis with in-memory fallback — 15 endpoints including AI generation, quote operations, session saves, and admin settings (5-20 req/min depending on endpoint)
- **Image validation:** MIME allowlist (JPEG, PNG, WebP) and 10MB decoded size limit on all AI image upload endpoints (`src/lib/image-validation.ts`)
- **Chat input bounds:** Max 50 messages, 100KB per message, 10 images per message, 32KB system prompt override
- **Security headers:** HSTS, CSP, Permissions-Policy
- **Privacy:** PIPEDA-compliant privacy policy, terms, and data deletion request page
- **Email:** CASL consent on all capture forms
- **Monitoring:** Sentry error tracking (client + server)
- **CI/CD:** GitHub Actions (lint → typecheck → test → build), Husky pre-commit hooks

---

## Demo Mode

Demo instances let potential clients explore the full platform — including the admin dashboard — without authentication. Three demo leads showcase the full lifecycle:

1. **Sarah Mitchell** — Bathroom renovation, `new` status. Website visitor → AI visualizer → Emma chat → lead captured.
2. **Dave Miller** — Kitchen renovation, `sent` status. Contractor phone intake → AI quote → quote sent.
3. **Jim & Karen Crawford** — Basement renovation, `won` status. Full lifecycle from visualizer through quote acceptance, invoice, and partial payment.

All demo data was created through real platform workflows (Gemini image generation, GPT-5.2 chat, AI quoting) — authentic AI-generated content indistinguishable from real usage.

---

## Business Constants

| Constant | Value |
|----------|-------|
| HST (Ontario) | 13% |
| Deposit | 15% |
| Contingency (default) | 10% |
| Estimate variance | +/-15% |
| Quote validity | 30 days |

---

## Known Constraints

- Stripe not integrated — payments recorded manually
- Phone/Twilio voice agent not yet deployed (Dominate feature)
- All voice/dictation features removed from chat UIs — infrastructure (API routes, providers) retained for future re-enablement
- Tiered quoting (Good/Better/Best) removed from UI — DB columns remain, unused
- Style History Gallery and Session linking not built
- E-signature acceptance page untested in QA
- Depth estimation disabled (Sharp fallback works)

---

*This document describes the product as it exists in the codebase. Update after any session that changes features, AI models, database schema, API routes, or handoff mechanisms.*
