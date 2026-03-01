# ConversionOS — Product Reference

**Last updated:** March 2, 2026

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
- AI Design Studio (4 photorealistic concepts per upload, before/after slider)
- Emma AI assistant (text + voice, design guidance, context-aware)
- Concept starring + email favourites
- Lead capture + email notification
- Mobile camera capture (take a photo, get concepts instantly)

**Accelerate adds:**
- Admin dashboard (leads, quotes, invoicing, settings)
- AI Quote Engine (auto-generated quotes from room analysis with full cost breakdowns)
- PDF quotes with e-signature acceptance
- Contractor lead intake (voice dictation, text, form)
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

### Step 1: Upload a Photo
The homeowner takes a photo of their kitchen, bathroom, or basement (camera on mobile, drag-and-drop on desktop). AI immediately analyses the photo — detecting room type, dimensions, layout, fixtures, and condition.

### Step 2: Choose a Style
Eight room types and six design styles (Modern, Traditional, Contemporary, Transitional, Minimalist, Industrial). The room type is pre-filled from the AI analysis. Optional: type design preferences ("marble countertops, brass fixtures, warm tones") or speak them via voice.

### Step 3: AI Generates 4 Concepts (~30 seconds)
Four photorealistic concepts stream in progressively via SSE. Each concept preserves the actual room geometry while applying the chosen style. The homeowner sees their space transformed — not a stock photo.

### Step 4: Explore and Refine

**Side-by-side layout (desktop):** The before/after slider sits on the left with a vertical stack of concept thumbnails on the right. On mobile, these stack vertically — full-width slider above, thumbnails in a horizontal row below.

- **Before/after slider:** Drag to compare original vs. concept
- **Star favourites:** Gold star toggle on each concept thumbnail
- **Chat with Emma:** An inline AI design advisor appears below the results. Emma opens with "These look amazing! What would you like to explore?" and waits for the homeowner to speak first — no buttons until they engage.
- **Suggestion chips:** After each response, Emma offers 2-3 clickable design suggestions parsed from her message (e.g., "Swap to white quartz countertop", "Add floating shelves with under-shelf LED"). Clicking a chip sends it as a message — the homeowner can explore without typing.
- **Contextual quick actions:** Buttons appear only when relevant:
  - After the 1st exchange: "Refine My Design" — AI re-renders the starred concept incorporating all design signals from the conversation
  - After the 2nd exchange: "Get My Estimate" (Accelerate+) or "Email My Designs" (Elevate)
- **Up to 3 refinements:** The "Refine" button silently disappears after the 3rd use. No counter, no pressure.

### Step 5: Connect
- **Accelerate+:** An inline lead capture form slides in below the chat (name, email, phone, timeline). On submit, the contractor receives the lead with full context and an AI-generated quote draft.
- **Elevate:** The homeowner can email their starred designs to themselves or request a callback.

The homeowner never navigates away from the page. Each phase builds below the previous one — a natural scroll through their design journey.

---

## The Contractor Journey (Admin Dashboard)

Available on Accelerate and Dominate tiers.

### Leads
Every lead arrives with full context: the homeowner's original photo, AI-generated concepts, starred favourites, Emma's chat transcript, room analysis (dimensions, condition, layout), and design preferences. On Accelerate+, an AI-generated quote draft is automatically created.

### Quoting
The AI Quote Engine generates structured quotes with transparency cards showing the math behind every line item — materials, labour rates, Ontario pricing sources. Contractors can:
- Review and customise AI-generated quotes
- Toggle Good/Better/Best pricing tiers
- Upload their own price list (CSV) — AI prioritises contractor prices over defaults
- Use assembly templates (reusable line item bundles for common work)
- Detect scope gaps (20+ rules check for missing items like waterproofing, permits, demolition)
- Send multi-page PDFs with e-signature acceptance

### Invoicing
Create invoices directly from accepted quotes. Payment tracking, PDF generation, Sage 50 CSV export.

### Settings
Business info, branding (colours, logo, hero), pricing configuration, quote assistance mode, category markups, price lists, templates — all self-serve.

### Analytics (Dominate only)
Daily trends, room type distribution, generation times, conversion metrics via Recharts.

---

## Emma — AI Design Advisor

Emma is a single AI persona that adapts to context. On the homepage, she's a receptionist. In the Design Studio, she's a design consultant who knows the homeowner's room inside and out. On the admin side, she generates quotes.

**Personality:** Warm, concise (2-3 sentences), conversational. Uses "we" language. Guides without pushing — never says "2 refinements remaining" or creates urgency.

**Voice:** Available on all tiers via ElevenLabs (web). Phone/Twilio on Dominate only.

**Tier awareness:**
- **Elevate:** Emma never discusses dollar amounts. Routes pricing questions to the contractor's contact page.
- **Accelerate+:** Emma provides preliminary cost ranges when asked, using the Ontario pricing database.

**Design Studio integration:** After concepts generate, Emma appears inline below the results. Her prompt includes the full room analysis, design preferences, starred concepts, and tier-specific pricing rules — she already knows the space. She ends responses with 2-3 concrete suggestion chips that the homeowner can click to explore ideas without typing. Quick action buttons (Refine, Estimate) appear contextually as the conversation deepens, not upfront.

---

## AI Stack

| Component | Model | Purpose | Cost per Use |
|-----------|-------|---------|------|
| Chat + Vision | GPT-5.2 | Emma's conversations, photo analysis, quote generation | ~$0.01-0.05 |
| Image generation | Gemini 3.1 Flash Image (Nano Banana 2) | 4 photorealistic concepts | ~$0.27 |
| Refinement | Gemini 3.1 Flash Image | Re-render starred concept | ~$0.07 |
| Voice | ElevenLabs Conversational AI | Emma's voice (all tiers, web) | ElevenLabs pricing |
| Transcription | GPT-4o-mini (Whisper) | Voice input, contractor dictation | ~$0.01 |

**Total cost per session:** ~$0.36 (no refinements) to ~$0.56 (3 refinements). Well within the $150/mo API cap at 50 sessions/month.

---

## Tech Stack

Next.js 16 (App Router) | React 19 | TypeScript 5 (strict) | Tailwind v4 | shadcn/ui | Zustand | Framer Motion | Supabase (PostgreSQL, ca-central-1, RLS) | Vercel AI SDK v6 | Sentry | Vitest (856 tests) | Playwright (9 E2E suites, 12 Design Studio tests) | Husky + lint-staged CI

---

## Multi-Tenancy

Single codebase, single branch (`main`), unlimited contractors. Every contractor gets a fully branded experience driven by database configuration — no per-tenant code.

- **Domain routing:** `src/proxy.ts` maps hostnames to tenant IDs (e.g., `mccarty.norbotsystems.com` → `mccarty-squared`)
- **Data isolation:** Every table includes `site_id`. Row-Level Security enforces tenant boundaries at the database level.
- **Branding:** Colours, logo, services, testimonials, contact info — all from the `admin_settings` table per tenant
- **Feature gating:** `canAccess(tier, feature)` — pure function, no hardcoded tier checks

### Current Tenants

| Tenant | Domain | Tier |
|--------|--------|------|
| ConversionOS Demo | conversionos-demo.norbotsystems.com | Accelerate |
| McCarty Squared | mccarty.norbotsystems.com | Dominate |
| Red White Reno | redwhite.norbotsystems.com | Accelerate |

### Automated Onboarding

New tenants are onboarded in ~5 minutes at ~$0.07 cost. Pipeline: score contractor website (Firecrawl) → scrape brand assets → upload images → provision database → verify with Playwright QA. Triggered from Mission Control ("Build Demo" button), CLI, or Telegram.

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

Supabase PostgreSQL (ca-central-1) with Row-Level Security. 14 tables covering admin settings, leads (with contractor intake fields), quote drafts (versioned, tiered, e-signature), contractor prices (CSV upload), assembly templates, visualizations, invoices, payments, drawings, chat sessions, and audit logging.

30+ API routes handle AI operations, lead management, quoting, invoicing, and admin settings. All routes enforce tenant isolation via `site_id` and tier-based access control.

---

## Security and Compliance

- **Authentication:** Supabase auth (bypassed in demo mode for prospect previews)
- **Rate limiting:** Upstash Redis with in-memory fallback (5-20 req/min depending on endpoint)
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
- Style History Gallery and Session linking not built
- E-signature acceptance page untested in QA
- Depth estimation disabled (Sharp fallback works)

---

*This document describes the product as it exists in the codebase. Update after any session that changes features, AI models, database schema, API routes, or handoff mechanisms.*
