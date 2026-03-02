# ConversionOS — UX Polish & Bug Fixes Sprint

## Context

Ferdie's brainstorming session identified ~17 improvements across the homeowner visualizer and contractor admin. After deep codebase exploration and UX research, this plan organises them into 4 workstreams by priority. Every change has been validated against the actual code — file paths, line numbers, and data flows are confirmed.

**Key finding:** The refinement "bug" (image not changing) has a clear root cause — the refine endpoint only receives extracted keyword signals, NOT the actual conversation text. If the user describes preferences in natural language without trigger keywords, the refinement prompt has no specific changes to apply, so Gemini regenerates a near-identical image.

**Second key finding:** Concept pricing analysis (Gemini vision → materials, costs) is generated and stored but NEVER fed into quote generation. The AI quote is built without knowing what the customer's chosen design concept actually contains. Connecting this data meaningfully improves quote accuracy.

---

## Workstream 1 — Quick Wins (30 min, LOW risk)

### 1A. Slider opacity: 50% → 85%
**File:** `src/components/visualizer/before-after-slider.tsx`
- Line 70: `animate(100, 50, {` → `animate(100, 85, {`
- Line 34: reduced-motion fallback `50` → `85`
- **ROI:** HIGH — instant visual improvement, users see concepts clearly

### 1B. "Refine My Design" → "Apply My Feedback"
**File:** `src/components/visualizer/design-studio-chat.tsx`
- Update button label + add `title="Generate a new version of your selected concept based on your conversation feedback"`
- **ROI:** HIGH — removes confusion about what the button does

### 1C. Homepage CTA copy
**File:** `src/app/page.tsx`
- Hero button: "See Your Renovation" → "Visualise Your Dream Space"
- Final CTA section heading: "Ready to See Your Renovation?" → "Ready to Bring Your Vision to Life?"
- **ROI:** MEDIUM — better conversion copy, brand-aligned

### 1D. Lead capture — "Anything else" field
**File:** `src/components/visualizer/lead-capture-form.tsx`
- Add optional `<Textarea>` after timeline: "Is there anything else we should know?"
- Map to existing `goalsText` field in API (already in schema, already in DB)
- Placeholder: "Budget range, specific materials, accessibility needs..."
- **ROI:** HIGH — zero-effort data capture, feeds into quote generation

### 1E. Quote description field width
**File:** `src/components/admin/quote-editor.tsx`
- Assumptions/Exclusions grid: `md:grid-cols-2` → stack vertically full-width
- **ROI:** MEDIUM — readability fix for contractors

### 1F. Quotes list — clickable rows
**File:** `src/app/admin/quotes/page.tsx`
- Extract table to client component, add `useRouter` + `onClick` to `<TableRow>`
- Add `cursor-pointer hover:bg-muted/50` classes
- Keep "View Lead" button for clarity
- **ROI:** MEDIUM — standard UX pattern, reduces clicks

---

## Workstream 2 — Visualizer UX Overhaul (3-4 hours, MEDIUM risk)

### 2A. Remove voice chat, add dictation button

**Scope:** Remove ElevenLabs voice toggle from public pages. Add Web Speech API dictation to Design Studio chat input.

**Files:**
- `src/components/receptionist/receptionist-chat.tsx` — Remove the "Chat"/"Talk" segmented toggle and all voice-related logic (the `startVoice`, `endVoice` calls). Keep text chat only.
- `src/components/receptionist/receptionist-widget.tsx` — Remove `VoiceProvider` wrapper. The widget becomes text-only.
- **NEW** `src/hooks/use-dictation.ts` — Lightweight Web Speech API hook. Pattern from existing `src/components/admin/voice-dictation-input.tsx` (lines 146-172) but simplified: no MediaRecorder, no Whisper — just `SpeechRecognition` with `interimResults: true`, `continuous: true`, `lang: 'en-CA'`.
- `src/components/visualizer/design-studio-chat.tsx` — Add mic button inside chat input form: `[Input] [Mic] [Send]`. States: idle (grey mic), recording (red pulsing), unsupported (hidden). Transcribed text populates input field — user must click Send.

**Decision:** Do NOT remove voice provider/API routes entirely. Just disconnect from the UI. Voice infrastructure stays for future re-introduction.

**ROI:** HIGH — removes unreliable feature, adds proven dictation pattern (ChatGPT-style)

### 2B. Generation loading animation overhaul

**Goal:** Make the 30-60s wait feel premium and dopamine-inducing.

**Files:**
- `src/hooks/use-visualization-stream.ts` — Add smoothed progress interpolation:
  - Store `targetProgress` from SSE events, interpolate `smoothedProgress` via `requestAnimationFrame`
  - Exponential ease-out: `current += (target - current) * 0.08` per frame
  - Minimum creep: if no SSE update for 3s, advance 0.5%/s (bar never freezes)
  - "Slow start, fast finish" — progress accelerates as it approaches 100%

- `src/components/visualizer/generation-loading.tsx` — Visual overhaul:
  - **Status messages** (replace generic tips): staged by progress range — "Analysing your photo...", "Matching your style preferences...", "Generating Concept 1 of 4...", "Rendering high-resolution details...", "Applying finishing touches..."
  - **Concept counter**: "1 of 4 concepts ready!" with AnimatePresence number transition
  - **Blur-to-sharp reveal**: Each concept uses Framer Motion `initial={{ filter: 'blur(20px)', opacity: 0, scale: 1.02 }} animate={{ filter: 'blur(0px)', opacity: 1, scale: 1 }}` over 600ms
  - **Smoother progress bar**: `duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]` + shimmer gradient animation
  - Keep tips carousel but make it secondary (smaller, below concept counter)

**ROI:** HIGH — the loading experience IS the product for first-time users. Research shows smooth progress bars make users willing to wait 3x longer.

### 2C. Active concept awareness — bug fix + chat header

**Files:**
- `src/lib/ai/personas/emma.ts` — Strengthen the prompt (lines 88-96):
  ```
  ## Active Concept
  The customer is currently viewing and discussing Concept #N.
  IMPORTANT: ALWAYS refer to this as "Concept N" — do NOT reference other concept numbers unless the customer explicitly asks.
  This concept is: [description]
  ```
- `src/components/visualizer/design-studio-chat.tsx` — Add concept context header above messages:
  - Small bar with 32x32 concept thumbnail + "Discussing Concept 3 — Modern Farmhouse"
  - Track `prevStarredIndex` via ref; when concept changes and chat has messages, inject a visual divider: "Now discussing Concept 3"

**ROI:** HIGH — this is a bug fix. Emma referencing wrong concept number erodes trust.

### 2D. Refinement bug fix — pass conversation to Gemini

**Root cause:** `handleRefine()` passes `designSignals` (keyword extraction) but NOT conversation text. If user says "I'd prefer something warmer" without trigger keywords like "walnut" or "oak", signals array is empty → Gemini regenerates near-identical image.

**Files:**
- `src/components/visualizer/design-studio-chat.tsx` — In `handleRefine()`, collect user messages and pass as `conversationMessages` to refine endpoint
- `src/app/api/ai/visualize/refine/route.ts` — Accept `conversationMessages: z.array(z.string())`. In `buildRefinementAddendum()`, add section:
  ```
  === HOMEOWNER'S SPECIFIC REQUESTS ===
  The homeowner said: [messages]
  Incorporate these preferences. The result MUST be visually distinct from the original concept.
  ```
- Cap at last 10 user messages to manage prompt length

**ROI:** CRITICAL — this is broken functionality. Without this fix, "Apply My Feedback" is decorative.

### 2E. Refinement loading animation

**Files:**
- `src/components/visualizer/design-studio-chat.tsx` — Replace small grey spinner with styled card:
  ```
  Applying your feedback...
  This usually takes 15-20 seconds
  ```
  With Framer Motion fade-in, primary colour spinner, subtle background tint
- `src/components/visualizer/result-display.tsx` — Replace spinner overlay with backdrop-blur panel:
  ```
  Applying your feedback...
  Generating a refined version
  ```

**ROI:** MEDIUM — polish that reinforces the feeling of intelligence behind the scenes

---

## Workstream 3 — Contractor Admin Improvements (3-4 hours, MEDIUM-HIGH risk)

### 3A. Remove tiered quoting (Good/Better/Best)

**This is the largest single change.** Touches 7+ files including the Zustand store.

**Files to modify:**
- `src/components/admin/quote-editor.tsx` — Remove: tier toggle button, Good/Better/Best tabs, TierComparison rendering, tiered sync useEffect, tiered branches in save/regenerate/reset, tier confirm dialog, tierTotals memo
- `src/stores/quote-editor-store.ts` — Remove: `TierMode` type, `tieredLineItems`, `tieredDescriptions`, `activeTier`, `tierMode` from state. Remove actions: `switchTier`, `toggleTierMode`, `setTieredLineItems`, `setTieredDescriptions`
- `src/components/admin/quote-send-wizard.tsx` — Remove `tierMode`/`tierTotals` props + conditional rendering
- `src/app/api/quotes/[leadId]/route.ts` — Remove `tier_mode`, `tier_good`, `tier_better`, `tier_best` from schema + save logic
- `src/app/api/quotes/[leadId]/regenerate/route.ts` — Remove `tiered` param + tiered generation branch
- `src/app/api/quotes/[leadId]/send/route.ts` — Remove tier fields from version copy
- **DELETE:** `src/components/admin/tier-comparison.tsx` (109 lines, entirely unused after removal)
- `src/lib/ai/quote-generation.ts` — Remove `generateTieredAIQuote()` + `regenerateTieredAIQuote()` (dead code after API route cleanup)

**DB columns stay** (`tier_good`, `tier_better`, `tier_best` JSONB) — harmless, existing quotes retain data.

**ROI:** HIGH — removes broken/unused feature, simplifies codebase by ~400 lines, reduces confusion for contractors

### 3B. AI Confidence Score relocation

**Files:**
- `src/components/admin/quote-editor.tsx` — Remove confidence from AI Info Banner (line 915)
- `src/components/admin/transparency-card.tsx` — Add `confidenceScore` display at bottom of card with colour-coded badge (green ≥80%, yellow ≥60%, red <60%)
- Thread `confidenceScore` from line item through to TransparencyCard

**ROI:** MEDIUM — cleaner UI, confidence is contextually useful inside the pricing breakdown

### 3C. Chat transcript on Visualizations tab

**Files:**
- `src/app/admin/leads/[id]/page.tsx` — Pass `lead.chat_transcript` to `LeadVisualizationPanel`
- `src/components/admin/lead-visualization-panel.tsx` — Add collapsible "Design Studio Chat" section after Conversation Insights. Show first 4 messages with "Show all N messages" expand. Reuse bubble rendering from `ChatTranscript` component pattern.

**ROI:** MEDIUM — contractors see the full conversation context alongside the visual design

### 3D. Featured concept on lead Details tab

**Files:**
- `src/app/admin/leads/[id]/page.tsx` — Fetch visualization data server-side, extract starred concept URL
- `src/components/admin/photo-gallery.tsx` — Add "Customer's Preferred Design" section above thumbnail grid with larger image + gold star badge. Gracefully hide when no starred concept exists.

**ROI:** MEDIUM — quick visual reference without navigating to Visualizations tab

### 3E. Connect concept pricing to quote generation

**Files:**
- `src/lib/schemas/ai-quote.ts` — Extend `QuoteGenerationInputSchema` with optional `photoAnalysis` + `conceptPricing` fields
- `src/lib/ai/quote-generation.ts` — In `buildUserPrompt()`, add sections for AI vision analysis of selected design (identified materials, inferred finish level, cost ranges, visible changes) and original photo analysis
- `src/app/api/quotes/[leadId]/regenerate/route.ts` — Fetch visualization data (photo_analysis, concept_pricing, client_favourited_concepts) and pass into quoteInput
- `src/app/api/leads/route.ts` — Same enrichment for initial quote generation

**ROI:** HIGH — this is the "are we using all the context we possibly can?" answer. Currently NO. Concept pricing has materials, costs, and finish level that the quote AI never sees.

---

## Workstream 4 — End-to-End Testing (2-3 hours, runs after implementation)

### Strategy: Agent Teams with QA Observer

Use **3 parallel agents** for testing:

1. **Desktop E2E Agent** — Playwright tests on 1280x800 viewport
2. **Mobile E2E Agent** — Playwright tests on 390x844 viewport (iPhone 14)
3. **QA Observer Agent** — Reviews screenshots, console logs, and test results. Takes notes on bugs, polish issues, and improvement suggestions. Produces a QA report.

### Test Suites

**Homeowner Journey (both viewports):**
1. Homepage → CTA copy verification → click "Visualise Your Dream Space" → lands on /visualizer
2. Upload photo → room type auto-detected → select style → generate concepts
3. Loading animation: verify smooth progress (no jumps), concept counter, blur-to-sharp reveal
4. Concept results: verify slider at ~85% opacity, click through all 4 concepts
5. Concept chat: verify header shows active concept name + thumbnail
6. Switch concept: verify divider message appears in chat
7. Chat with Emma: verify Emma references correct concept number
8. Dictation: verify mic button exists, click to record, text appears in input (manual verification on real browser)
9. Click "Apply My Feedback": verify loading animation, verify new image is visually different
10. Click tier-aware CTA → lead capture form → verify "Anything else" textarea field → submit
11. Verify lead created in Supabase with goalsText populated

**Contractor Journey (desktop only):**
1. Navigate to /admin/leads → verify leads list
2. Click into a lead → Details tab → verify featured concept image
3. Visualizations tab → verify starred concept prominent, chat transcript visible
4. Quote tab → verify NO tier toggle, single-tier only
5. Generate AI Quote → verify no tier mode options
6. Check transparency card (i button) → verify confidence score displayed inside
7. Assumptions/Exclusions → verify full-width layout
8. Navigate to /admin/quotes → click anywhere on a row → verify navigation to lead
9. Verify quote generation uses concept pricing (check API response)

**Regression:**
- `npm run build` — must pass (typecheck + build)
- `npm run test` — all 856 unit tests
- Existing E2E suites

### QA Report Output
The QA Observer agent produces:
- Screenshot-annotated report (desktop + mobile)
- Bug list with severity (P0 critical, P1 high, P2 medium, P3 low)
- Polish suggestions for future sessions
- Accessibility notes (WCAG 2.1 AA)

---

## What We're NOT Doing (Honest Assessment)

| Ferdie's Idea | Decision | Reason |
|---------------|----------|--------|
| Version history (keep V1 when V2 generates) | **DEFER** | Requires DB schema change + storage management + UI for version gallery. High complexity, medium ROI. Current in-memory versioning works for MVP. |
| Remove voice entirely (API routes, provider) | **Keep infrastructure, hide UI** | Removing code is easy to do later. Keeping it means we can re-enable voice when it's stable. |
| Dictation fallback to Whisper | **Skip** | Web Speech API covers 95%+ of browsers (Chrome, Safari, Edge). Firefox users get text-only (mic button hidden). Adding Whisper adds complexity for <5% of users. |
| Full AI model review | **Not needed now** | GPT-5.2 for chat/vision, Gemini 3.1 Flash for image gen — both are current best-in-class for their roles. No research evidence suggests switching. |

---

## Implementation Approach

**Method:** Agent Teams (3 teammates) — this sprint touches ~25 files across frontend components, API routes, AI prompts, and the Zustand store. Clean file ownership boundaries exist:

- **Teammate 1 (Homeowner):** Visualizer components, hooks, dictation, loading animation, Emma prompt
- **Teammate 2 (Admin):** Quote editor, store, API routes, lead detail, visualization panel
- **Teammate 3 (Testing):** Playwright E2E suites, QA screenshots, bug report

Estimated wall-clock: ~2 hours with Agent Teams (vs ~6-8 hours sequential).

---

## Verification

1. `npm run build` — clean typecheck + build
2. `npm run test` — all unit tests pass
3. Playwright E2E — homeowner journey (desktop + mobile) + contractor journey
4. Manual visual QA — loading animation smoothness, slider opacity, concept header, dictation UX
5. API verification — refine endpoint receives conversation, quote generation receives concept pricing

---

**TLDR:** 17 improvements organised into 4 workstreams: quick wins (6 items, 30 min), visualizer UX overhaul (5 items including refinement bug fix — conversation text wasn't reaching Gemini), contractor admin cleanup (5 items including tier removal + connecting concept pricing to quote generation), and comprehensive E2E testing. Deferred version history gallery (too complex for ROI). Agent Teams implementation for ~2hr wall-clock.

**Complexity:** HIGH — 25+ files, Zustand store surgery, prompt engineering, new dictation hook, loading animation overhaul. But each change is well-scoped with clear file ownership.
