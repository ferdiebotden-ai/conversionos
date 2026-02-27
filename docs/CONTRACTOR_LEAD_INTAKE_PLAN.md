# Contractor Lead Intake — Feature Plan

> **Purpose:** Enable contractors to create leads from any source — phone calls, emails, walk-ins, referrals — directly from their admin dashboard, with AI-assisted quote generation that works just as well (or better) than the website flow.

> **Status:** Planning (research complete, no code changes)
> **Date:** February 26, 2026

---

## The Problem

Today, every lead in ConversionOS must originate from the customer-facing website — either through Emma's chat widget, the contact form, or the visualizer handoff. There is no way for a contractor to manually create a lead from the admin dashboard.

This is a critical gap. In the Ontario renovation market, a significant percentage of leads arrive through channels the platform doesn't capture:

- **Phone calls** — A homeowner calls after seeing a truck, a yard sign, or a Google listing
- **Emails** — Direct emails from referrals, real estate agents, or repeat customers
- **Walk-ins / site visits** — Homeowner flags down the contractor at a neighbour's job
- **Referrals** — Another contractor or a past customer sends someone their way
- **Social media DMs** — Facebook Marketplace, Instagram, community groups
- **Trade shows / home shows** — Quick conversations with a stack of business cards

These "off-platform" leads are often the highest-intent, highest-trust leads a contractor gets — and right now they fall entirely outside the system. The contractor either tracks them in their head, a notebook, or a spreadsheet, losing all the benefits of AI-powered quoting, professional PDF delivery, and pipeline management.

---

## The Vision

A contractor opens their admin dashboard, clicks **"New Lead"**, and has multiple ways to get a lead into the system — fast, flexible, and designed for how contractors actually work (often on a job site, phone in hand, between tasks).

The system should feel like a smart assistant that takes rough input and structures it into a professional quote-ready lead — not a data entry form.

---

## Input Methods

### 1. Voice Dictation (Primary — Highest Value)

Contractors think in spoken language: *"Got a call from Sarah Mitchell, she's at 42 Elm Street in Stratford. Wants a full kitchen reno, gut to studs, probably 200 square feet. She wants quartz counters, new cabinets, keep the existing layout. Budget's around 40 to 50K, wants to start in March."*

That single dictation contains: name, address, city, project type, area, finish level, specific materials, budget band, timeline, and scope notes. A contractor can capture more useful detail in 30 seconds of speech than a homeowner provides in 10 minutes of chat with Emma.

**What the system does with it:**
- Transcribes the audio (browser Web Speech API or Whisper)
- AI extracts structured fields: name, email, phone, address, project type, area, finish level, timeline, budget, goals, specific materials mentioned
- Pre-fills the lead form with extracted data
- Contractor reviews, corrects if needed, and submits
- AI generates a quote using the same pipeline as website leads — but with *better* input because the contractor knows the trade

**Why this is the killer feature:** Contractors are domain experts. When they describe a job, they include specifics that homeowners never would — stud-to-stud dimensions, whether the plumbing stack needs moving, if the subfloor is concrete or wood. This makes the AI quote dramatically more accurate.

### 2. Free-Text Input (Quick Capture)

A simple text box where the contractor types or pastes anything:
- Rough notes from a phone call
- A forwarded email body (copy-paste)
- Notes from a site visit
- A message from a referral source

The AI parses whatever is provided and extracts what it can. Missing fields are flagged for the contractor to fill in manually. The bar is low — even just a name, project type, and a sentence of scope is enough to create a lead and generate a preliminary quote.

### 3. Email Import (Forwarding)

Contractors receive quote requests by email constantly. Rather than re-typing the information:
- **Copy-paste:** Paste the email body into the free-text input
- **Forward-to-intake:** (Future) A dedicated intake email address (e.g., `leads@[tenant].conversionos.com`) that auto-creates leads from forwarded emails
- **File upload:** Drop a `.eml`, `.txt`, or `.pdf` file and the system extracts the content

The AI should handle messy, real-world email formats — reply chains, signatures, forwarded headers — and pull out the useful project information.

### 4. Photo Upload (On Behalf of Homeowner)

The contractor takes photos during a site visit or receives them via text/email from the homeowner. These photos should flow into the lead just like they would through the visualizer:
- Upload one or more photos from the phone's camera or gallery
- AI runs the same photo analysis used in the visualizer flow (room type detection, condition assessment, fixture identification, dimension estimation)
- Photo analysis feeds into the quote generation for better accuracy
- Photos attach to the lead record for reference

**Key difference from the website flow:** The contractor may upload photos *without* running them through the visualizer. The system should still extract value from them (room analysis, material identification) even if no AI renovation concepts are generated.

### 5. Structured Form (Fallback)

For contractors who prefer a traditional approach, a clean form with all the standard fields:
- Contact info (name, email, phone, address)
- Project details (type, area, finish level, timeline, budget)
- Scope notes (free text)
- Photo upload

This is the least interesting input method but must exist for completeness. It should be the "expanded view" that all other methods pre-fill into.

---

## How It Integrates with the Existing System

### Lead Record

Off-platform leads must be first-class citizens in the system. They should be indistinguishable from website leads once created, with a few additions:

- **`source` field:** Currently hardcoded to `'ai_chat'` for all leads. Must support new values: `'phone'`, `'email'`, `'walk_in'`, `'referral'`, `'manual'`, `'dictation'` — or a simpler approach: `'website'` vs `'contractor_intake'` with a `source_detail` field for the specific channel.
- **`created_by` field:** New. `'customer'` for website leads, `'contractor'` for admin-created leads. Useful for analytics and distinguishing intent.
- **`intake_raw_input` field:** New. Stores the original dictation transcript, pasted email, or uploaded file content. Valuable for audit trail and AI re-processing if the extraction needs refinement.

### AI Quote Generation

The existing `generateAIQuote()` pipeline works without modification — it takes `projectType`, `areaSqft`, `finishLevel`, `goalsText`, and `chatTranscript`. For contractor-created leads:

- `goalsText` becomes the contractor's description (dictated or typed)
- `chatTranscript` is empty (no Emma conversation) — but `goalsText` is richer to compensate
- The AI prompt may benefit from a flag indicating this is contractor-provided scope (more technical, can trust material specifics) vs customer-provided (aspirational, may need reality-checking)

The quote generation should produce *better* results for contractor-dictated leads because:
- Contractors specify exact materials, not just "I want a nice kitchen"
- Contractors know room dimensions, not guesses
- Contractors flag structural issues that affect cost (load-bearing walls, plumbing relocation, electrical panel upgrades)

### PDF Quote Template

The current PDF template is text-only — no images. This is actually fine for off-platform leads because there are no visualizer concepts to show. However, this raises a broader question: should the PDF template be enhanced to optionally include:

- **Uploaded photos** (site photos the contractor took)
- **Visualizer concepts** (when available from website leads)
- **Company logo** (`branding.logoUrl` exists but is unused in PDFs)

This is a separate enhancement from the intake feature, but the two are related — a contractor who uploads site photos during intake would benefit from seeing them in the PDF they send to the customer.

### Email Template

The AI-generated quote email already works generically. For contractor-created leads, the email should:
- Not reference "your conversation with Emma" or "your visualizer session" (since those didn't happen)
- Frame the quote as following up on their "recent conversation" or "inquiry" instead
- The email generation AI already receives `goalsText` and `projectType` — it should adapt naturally

### Lead Status Flow

Off-platform leads should enter the system at `draft_ready` (if enough data for AI to generate a quote) or `new` (if minimal data). The existing status FSM (`new → draft_ready → sent → won/lost`) works without modification.

### Admin Dashboard

The leads list page should:
- Show a prominent **"+ New Lead"** button in the header
- Display a `source` indicator (small icon or badge) so the contractor can see at a glance which leads came from the website vs their own intake
- Filter by source (in addition to existing status and project type filters)

The lead detail page for contractor-created leads should:
- Show all the same tabs (Details, Visualizations, Quote, Drawings, Chat, Activity)
- **Visualizations tab:** Show "No visualizer session" with an option to run the visualizer on uploaded photos (if any)
- **Chat tab:** Show "No customer conversation" with the contractor's original intake notes/dictation instead
- **Quote tab:** Works identically — AI pre-populates, contractor edits, sends

---

## What This Means for the Contractor Experience

### Before (Today)
1. Contractor gets a phone call
2. Scribbles notes on a napkin
3. Manually creates a spreadsheet estimate
4. Types up a quote in Word
5. Emails it as a PDF attachment
6. Forgets to follow up
7. Lead goes cold

### After (With This Feature)
1. Contractor gets a phone call
2. Opens dashboard on their phone, taps "New Lead"
3. Dictates the job details in 30 seconds
4. AI extracts structured data, generates a quote with line items
5. Contractor reviews, adjusts a few numbers
6. Taps "Send Quote" — professional PDF + branded email goes out
7. Lead tracked in pipeline with follow-up reminders

**Time saved:** 30-45 minutes per off-platform lead
**Quote quality:** Higher, because AI + contractor expertise > contractor alone in a spreadsheet
**Follow-through:** 100%, because the lead is in the pipeline with status tracking

---

## UX Principles

1. **Speed over completeness.** A contractor on a job site needs to capture a lead in under 60 seconds. Minimum viable input: name + project type + one sentence of scope. Everything else can be added later.

2. **Voice-first on mobile.** The dictation button should be the most prominent input method on mobile. Contractors have dirty hands and limited patience for typing.

3. **AI does the heavy lifting.** The contractor provides rough input; the system structures it. Never make the contractor manually classify project type, finish level, or budget band if the AI can infer it from their description.

4. **Progressive enrichment.** A lead can start sparse and get enriched over time — add photos later, add address details after a site visit, regenerate the quote as more information comes in. The system should actively suggest what's missing and how it would improve the quote.

5. **No dead ends.** Every off-platform lead should flow through the same pipeline as website leads. Same PDF template, same email sending, same status tracking, same analytics. The source is different; the experience is identical.

---

## Entitlement Considerations

- **Elevate tier:** No admin dashboard, so no contractor intake. These contractors only get website leads. This is a natural upsell driver — "Want to manage phone and email leads too? Upgrade to Accelerate."
- **Accelerate tier:** Full contractor intake with AI quote generation. This is the primary target.
- **Dominate tier:** Same as Accelerate, plus potential future integrations (email-to-lead forwarding, CRM import, API access for third-party tools).

The new feature should be gated behind a new entitlement: `contractor_lead_intake` → Accelerate + Dominate.

---

## Open Questions for Ferdie

1. **Dictation priority:** Is voice dictation the #1 input method, or do most contractors prefer typing? (Hypothesis: voice on mobile, typing on desktop — support both but optimize for voice.)

2. **Email forwarding:** Is a dedicated intake email address valuable enough to build now, or is copy-paste sufficient for v1?

3. **Photo-to-quote without visualizer:** Should contractor-uploaded photos run through the GPT Vision material identification (concept pricing) to improve quote accuracy, even without generating renovation concepts? (Recommendation: yes, this is high value and the infrastructure exists.)

4. **Source tracking granularity:** Is `'website'` vs `'contractor_intake'` sufficient, or do contractors want to tag specific channels (phone, email, referral, walk-in) for their own reporting?

5. **Mobile-first or desktop-first?** Where do contractors most often need to capture off-platform leads? (Hypothesis: mobile — they're on a job site when the call comes in.)

---

## Relationship to Existing Uncommitted Work

The Quote Engine V2 work (23 uncommitted files) may affect the AI quote generation pipeline that this feature relies on. The two features are complementary — V2 improves quote accuracy and structure; contractor intake adds a new entry point to the same pipeline. They should be coordinated but can be developed independently as long as the `POST /api/leads` interface contract is stable.

---

## Summary

This feature fills the biggest gap in ConversionOS today: the assumption that every lead arrives through the website. By giving contractors a fast, AI-powered way to capture leads from any source — phone, email, walk-in, referral — we make the platform indispensable for their entire business, not just their online presence. The dictation capability is the differentiator: no competitor lets a contractor speak a job description and get a professional AI-generated quote in under a minute.

---

*This document describes **what** we want to build and **why**. Implementation details are left to the developer session that picks this up.*
