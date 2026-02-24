# PRD: Visualizer Enhancement — Context-Capture Engine & Iterative Exploration
**ConversionOS | NorBot Systems Inc. | v1.0 | February 22, 2026**
**Author: Strategic AI Partner (Claude Opus) for Ferdie Botden**
**Implementer: Claude Code (Opus 4.6)**

> **STATUS (Feb 24, 2026):** Implementation complete. All 7 feature groups were built across Sessions 1-5 (Feb 23-24). See `docs/IMPLEMENTATION_STATUS.md` for per-feature completion status. The living product reference at `docs/PRODUCT_REFERENCE.md` describes the product as it exists now.
>
> **What was built:** Feature Groups 1 (enriched handoff), 2 (parallel analysis + photo pre-analysis), 3 (iterative exploration — "Try Another Style" + tier-aware CTAs), 4 (SSE streaming + progressive reveal), 5 (mobile camera capture), 6 (admin dashboard + analytics), and 7 (schema improvements).
>
> **What was deferred:** Feature 1.5 (database-persisted handoff — sessionStorage retained), Feature 3.2 (Style History Gallery), Feature 3.3 (Quick Style Preview), Feature 7.2 (session_id linking). See Known Constraints in `docs/PRODUCT_REFERENCE.md`.

---

## How to Read This Document

This PRD defines **what** to build and **why**. It is intentionally non-prescriptive about implementation details — the implementer should research optimal technical approaches (models, libraries, APIs) independently. Where the codebase briefing reveals specific architectural realities that constrain or enable a feature, those are noted.

Features are organized into prioritised groups. Each feature includes acceptance criteria written as observable user or system behaviours.

**Reference documents (read before implementing):**
- `VISUALIZER_CODEBASE_BRIEFING.md` — Current architecture, components, schemas, data flows
- The screenshots in `VISUALIZER_SCREENSHOTS/` — Current UI state at each step
- Project knowledge docs in `/mnt/project/` — Brand, pricing tiers, product strategy

---

## Strategic Context

### Why This Matters

ConversionOS's visualizer is already a strong lead-capture tool. But right now it operates as an isolated feature — a homeowner uploads a photo, gets renders, and then starts over with Marcus (the quote specialist) who asks many of the same questions the visualizer already answered. The competitive landscape confirms that **no product in this category closes the loop from visualization to contractor quoting with rich context**. Block Renovation comes closest with their contractor marketplace, but they commoditize the contractor relationship.

This PRD turns the visualizer from an isolated render tool into **ConversionOS's primary context-capture engine** — the mechanism that transforms every homeowner interaction into structured, quote-ready intelligence that makes Marcus faster, more accurate, and more impressive.

### The Moat We're Building

The combination that no competitor offers:
1. A visualizer that captures deep room context (dimensions, materials, condition, constraints)
2. Iterative style exploration that reveals what homeowners actually want
3. A quoting agent (Marcus) who already knows everything when the homeowner arrives
4. A contractor who sees the exact render the homeowner fell in love with, alongside the quote

That loop — **visualize → capture context → quote with context → contractor sees what homeowner visualized** — is unique. This PRD builds it.

### What We Learned from Competitive Research

Ten AI room visualizer products were analyzed in depth. Key findings that shaped this PRD:

**Patterns to adopt:**
- HomeDesigns AI's progressive lead capture (render first, ask later) — we already do this well
- ReimagineHome's structural lock and persistent canvas for iteration — our top UX priority
- Block Renovation's real-time cost signalling tied to style changes — our quoting integration
- Remodeled AI's interactive drag slider for before/after — we already have this

**Category-wide gaps we can own:**
- No product offers in-browser camera capture with framing guidance
- No product uses step-by-step progress indicators during generation
- No product offers a true multi-style comparison grid
- No product connects visualization context to a quoting engine (our entire thesis)

**Patterns to avoid:**
- RoomGPT's one-shot rigidity (no iteration = low engagement)
- Watermark gating on free renders (generates hostility)
- Bare-minimum loading states (every competitor ships these; easy to beat)

---

## Feature Group 1: Enriched Handoff to Marcus (CRITICAL — Build First)

**Priority: P0 — This is the core moat. Everything else is secondary.**

### Why This Is P0

The codebase briefing reveals that ConversionOS already captures an 18-field room analysis via GPT Vision (dimensions, wall count, ceiling height, spatial zones, openings, architectural lines, current materials, condition rating, structural constraints) **but none of this reaches Marcus**. The handoff currently passes only: room type, style, text preferences, voice summary, and concept URLs. Marcus then re-asks questions the system already answered.

Fixing this is the single highest-ROI change in this entire PRD. It requires no new AI capabilities, no new UI, and no new user-facing features. It's a data plumbing job that transforms the product's value proposition overnight.

### Feature 1.1: Pass Full Photo Analysis to Marcus

**What:** When a homeowner clicks "Get a Quote for This Design," the handoff context sent to Marcus must include the complete photo analysis JSONB — not just room type and style, but the full structured analysis: estimated dimensions, wall dimensions, ceiling height, spatial zones, identified fixtures, current condition, current style, structural elements, preservation constraints, openings catalog, and architectural lines.

**Why:** Marcus currently starts every conversation with discovery questions: "How big is your kitchen? What's the current layout? What material are your countertops?" The photo analysis already has answers to most of these. With this data, Marcus can skip discovery and go straight to refinement: "I can see you have an L-shaped kitchen, roughly 12 by 14 feet, with oak cabinets and laminate countertops. Based on the Modern style you chose with marble counters and an island, here's what I'm estimating..."

**Acceptance Criteria:**
- The `HandoffContext` object includes a new `photoAnalysis` field containing the full `RoomAnalysis` object from the visualizations table
- Marcus's system prompt includes a "Room Analysis" section that presents the photo analysis data in natural language (not raw JSON)
- Marcus acknowledges specific details from the analysis in his opening message (e.g., references room dimensions, identified fixtures, current condition)
- Marcus does NOT re-ask questions that the photo analysis already answered (room size, layout type, current materials) unless the data has low confidence
- The photo analysis confidence score is visible to Marcus — if below 0.7, Marcus should verify key details rather than asserting them

**Codebase Reference:** The handoff mechanism lives in `src/lib/chat/handoff.ts`. The `HandoffContext` interface needs a `photoAnalysis` field. The photo analysis JSONB is already stored in the `visualizations.photo_analysis` column. The handoff serialization in `visualizer-form.tsx:271-328` needs to include it. Marcus's prompt assembly in `prompt-assembler.ts:209-233` needs to render it as natural language.

### Feature 1.2: Pass Selected Concept to Marcus

**What:** When the homeowner selects a concept (1-4) and clicks "Get a Quote for This Design," the handoff must include which concept was selected and that concept's image URL.

**Why:** Marcus currently knows "4 concepts were generated" but doesn't know which one the homeowner preferred. This matters for quoting because different concepts may imply different material choices, complexity levels, and costs. The contractor also needs to see the specific render the homeowner chose.

**Acceptance Criteria:**
- The `HandoffContext.visualizationData` object includes `selectedConceptIndex` (0-3) and `selectedConceptUrl` (the specific image URL)
- Marcus references the selected concept: "I can see you liked Concept 2 — the one with the grey cabinets and waterfall island. Let me scope that out..."
- The selected concept index is stored on the visualization record (the `selected_concept_index` column already exists but isn't currently populated from the results view)

**Codebase Reference:** `ResultDisplay` component tracks `selectedIndex` in state. `selected_concept_index` column exists on the `visualizations` table. The value needs to flow from the component state → handoff serialization → Marcus's prompt.

### Feature 1.3: Pass Structured Material Preferences to Marcus

**What:** The detailed style data used to build the Gemini prompt (specific materials, colours, finishes, fixtures from `prompt-builder.ts`) must also be included in the handoff to Marcus.

**Why:** When a homeowner selects "Modern," the prompt builder expands this to specific materials: polished concrete, tempered glass, engineered quartz, brushed stainless steel, etc. Marcus should know these specifics when estimating material costs, rather than just knowing the style was "Modern."

**Acceptance Criteria:**
- The `HandoffContext` includes a `materialContext` field containing: the style narrative, primary materials list, colour palette, finish types, and fixture styles from the prompt builder's detailed style data
- Marcus uses specific material names in his estimate discussion: "For Modern style, we're looking at engineered quartz countertops and brushed stainless steel fixtures, which typically run..."
- If the homeowner provided text or voice preferences specifying materials (e.g., "white marble countertops"), those override the generic style materials in Marcus's context

**Codebase Reference:** The detailed style data is in `src/lib/ai/prompt-builder.ts:47-103` (the `DETAILED_STYLES` object). Currently this data is consumed only by `buildRenovationPrompt()` and then discarded. It needs to be surfaced at handoff time.

### Feature 1.4: Pass Voice Consultation Structured Extraction

**What:** When the homeowner spoke with Mia, the voice summarization already produces a `VoiceExtractedPreferences` object with structured fields: `desiredChanges[]`, `materialPreferences[]`, `styleIndicators[]`, `preservationNotes[]`. This structured data must be included in the handoff alongside the summary.

**Why:** The summary is a prose paragraph. The structured extraction is actionable data. Marcus should see both: the narrative for conversational context, and the structured lists for precise quoting.

**Acceptance Criteria:**
- The `HandoffContext` includes `voiceExtractedPreferences` containing the full structured extraction
- Marcus's prompt includes a "Homeowner Preferences (from voice consultation)" section listing desired changes, material preferences, and preservation notes as distinct items
- Marcus references specific items from the extraction: "You mentioned wanting to keep the existing hardwood floors — I'll exclude flooring from the estimate."

**Codebase Reference:** `VoiceExtractedPreferences` is already produced by `POST /api/ai/summarize-voice` and stored in form state as `voiceExtractedPreferences`. It's currently not included in the handoff serialization.

### Feature 1.5: Persist Handoff via Database (Replace sessionStorage)

**What:** Replace the sessionStorage-based handoff mechanism with a database-persisted handoff record linked to the visualization. The current approach has a 15-minute TTL and dies if the user refreshes, opens in a new tab, or returns later.

**Why:** A homeowner might visualize on Monday evening, share the renders with their spouse, and come back Wednesday to get a quote. The current sessionStorage approach means the context is gone. Database persistence means the handoff context is always available when a user navigates to `/estimate?visualization={id}`.

**Acceptance Criteria:**
- The full handoff context (photo analysis, material context, selected concept, voice extraction, design preferences) is saved as a JSONB column on the `visualizations` table (or a dedicated `handoff_context` column)
- The `/estimate` page reads handoff context from the database using the `visualization` URL parameter, falling back to sessionStorage for backward compatibility
- No TTL expiration — the context persists as long as the visualization record exists
- Marcus receives the same rich context regardless of whether the user arrives immediately or days later

**Codebase Reference:** The `visualizations` table already has a `conversation_context` JSONB column that could serve this purpose, or a new `handoff_context` column can be added. The `/estimate` page's `readHandoffContext()` function needs a database read path.

---

## Feature Group 2: Parallel Photo Analysis & Room Intelligence Card

**Priority: P1 — Quick win that improves generation speed and builds trust.**

### Feature 2.1: Move Photo Analysis to Upload Time

**What:** Trigger the GPT Vision photo analysis immediately when the user uploads their photo, rather than waiting until they click "Generate My Vision." The analysis runs in the background while the user selects room type, style, and preferences.

**Why:** The codebase briefing confirms that photo analysis currently runs during generation, adding 2-3 seconds to the 60-90 second generation time. More importantly, this is wasted parallelism — the user spends 30-60 seconds on the form (selecting room type, style, typing preferences) during which nothing is happening server-side. Running analysis during this idle time means it's complete before generation starts.

**Acceptance Criteria:**
- Photo analysis fires as a background API call immediately after upload completes and the compressed image is ready
- The analysis result is stored in component state and available when generation starts
- If the user clicks "Generate" before analysis completes, generation waits for it (with no visible delay to the user in the typical case)
- If analysis fails, generation proceeds without it (current fallback behavior)
- The analysis result auto-populates the room type selector if the detected room type matches one of the 8 options (user can override)

**Codebase Reference:** The form has a `runPhotoAnalysis` callback that's currently a no-op (lines 103-115 in `visualizer-form.tsx`). The actual analysis function is `analyzeRoomPhotoForVisualization()` in `photo-analyzer.ts`. The API call can be a standalone endpoint or part of the existing route with a separate action.

### Feature 2.2: Room Intelligence Card (Visible to Homeowner)

**What:** After the photo analysis completes, display a subtle "Room Intelligence" card in the form step showing the AI's understanding of the room. This should appear between the photo preview and the room type selector.

**Why:** Three purposes. First, it builds trust — the homeowner sees the AI "understood" their room, making the renders feel more credible. Second, it captures corrections — if the AI says "L-shaped kitchen, ~12×14 ft, oak cabinets" and the homeowner knows it's actually 10×12, they can mentally calibrate (and in a future iteration, correct it). Third, competitive differentiation — no product in the category shows the analysis to the user. Everyone does analysis silently.

**Acceptance Criteria:**
- A compact card appears below the photo preview once analysis completes
- Card shows: detected room type, estimated dimensions, layout type, current condition, and 2-3 key identified features (e.g., "Island with seating," "Natural light from west-facing window")
- Card has a subtle "AI detected" label to set expectations
- Card does NOT show raw technical data (no wall dimensions arrays, no vanishing point descriptions, no confidence scores)
- Card is collapsible — default expanded on desktop, collapsed on mobile
- If analysis confidence is below 0.6, card shows a softer message: "Upload a clearer photo for better results" rather than displaying uncertain data
- Card loads with a brief skeleton/shimmer animation while analysis is in progress
- If the detected room type differs from what the user selects manually, the user's selection always wins (no overriding)

**Design Guidance:** Think of this as a "receipt" — a quick visual confirmation that the AI processed the photo intelligently. Keep it to 3-4 lines of information. Use the same card styling as the existing "Your Selection" summary card. Not a modal, not a full-width section — a compact informational element.

---

## Feature Group 3: Iterative Style Exploration

**Priority: P1 — The biggest UX gap in the current product.**

### Why This Matters

Currently, a homeowner picks one style, waits 60-90 seconds, sees 4 concepts, and that's it. If they think "actually, I wonder what Farmhouse would look like," they have to start the entire flow over — re-upload photo, re-select options, wait another 60-90 seconds. This kills exploration. ReimagineHome, HomeDesigns AI, and Spacely AI all allow persistent-photo restyling. We need to match this baseline, and the competitive research shows we can leapfrog with a few specific additions.

### Feature 3.1: "Try Another Style" Flow (Post-Results)

**What:** On the results page, add a "Try Another Style" action that takes the user back to a streamlined style-only selection screen (no re-upload, no room type re-selection), then generates new concepts using the same photo and room analysis.

**Why:** This is the minimum viable iteration loop. The photo is already uploaded and analysed. The room type is known. The only variable is style (and optionally, new text/voice preferences). This should be fast and frictionless.

**Acceptance Criteria:**
- A "Try Another Style" button appears in the results view, alongside the existing "Get a Quote" and "Start Over" actions
- Clicking it navigates back to the form step, BUT with the photo and room type pre-filled and locked (shown but not editable without explicitly clicking "Change")
- The style selector shows which styles have already been generated (e.g., a small "Generated" badge or checkmark on "Modern" if they already generated Modern concepts)
- User selects a new style, optionally updates preferences, and clicks "Generate"
- New concepts are generated using the same original photo and analysis
- Previous generation results are preserved — the user can navigate between style generations (see Feature 3.2)
- The "Try Another Style" button is visually secondary to "Get a Quote for This Design" — we want them to convert, not endlessly iterate

**Codebase Reference:** The original uploaded photo URL is stored in `visualizations.original_photo_url` in Supabase Storage and the base64 is in component state. The photo analysis JSONB is in `visualizations.photo_analysis`. Both are reusable. The main architectural question is whether to create a new `visualizations` row per style generation or append concepts to the existing row. Recommend new rows with a shared `session_id` linking them.

### Feature 3.2: Style History Gallery

**What:** When a user has generated multiple styles from the same photo, show a gallery that lets them browse across all their generations — not just the 4 concepts from the most recent one.

**Why:** The power of iteration is comparison. "I generated Modern, Farmhouse, and Contemporary — now let me flip between the best concept from each to decide." This is the multi-style comparison grid that no competitor does well (noted in competitive research as a clear gap).

**Acceptance Criteria:**
- After 2+ generations from the same photo, a "Your Styles" gallery appears above (or replacing) the single-style concept thumbnails
- Gallery shows one representative thumbnail per style, labeled with the style name
- Clicking a style thumbnail shows that style's 4 concepts in the existing comparison slider and concept row
- The "Get a Quote for This Design" CTA works from any style/concept combination
- Gallery persists across the session — navigating away and back preserves it
- Maximum of 6 style generations per session (cost containment at ~$0.48 per generation × 6 = ~$2.88 max per session)

**Design Guidance:** Think "film strip" — a horizontal row of style options above the main comparison area. Each style is a small thumbnail card with the style name. The currently-viewed style is highlighted. Simple, scannable, doesn't compete with the main before/after slider.

### Feature 3.3: Quick Style Preview (Stretch Goal)

**What:** Before committing to a full generation, show a low-fidelity "preview" of what a style might look like — perhaps a fast, lower-resolution render or a style-transfer overlay — so the user can decide whether to spend the 60-90 seconds on a full generation.

**Why:** The 60-90 second generation time is the friction point. If users could get a 5-second "rough preview" of Farmhouse vs. Contemporary, they'd only commit to full generation for styles they actually like. This dramatically reduces wasted generations and improves the exploration experience.

**Acceptance Criteria:**
- When hovering over (desktop) or tapping (mobile) a style card that hasn't been generated yet, a quick preview appears
- Preview renders in under 10 seconds
- Preview is clearly labeled as "Preview — Generate for full quality"
- Preview uses a lower resolution, faster generation approach (implementer to determine best method — could be a faster model, lower resolution, single concept instead of 4, or a different technique entirely)
- If the user proceeds to full generation of that style, the preview is replaced by the full-quality concepts

**Note:** This is explicitly a stretch goal. If the implementer determines that no approach can reliably deliver useful previews in under 10 seconds at acceptable quality, skip this feature. The cost-quality-speed tradeoff may not work yet. Features 3.1 and 3.2 deliver the core iteration value without this.

---

## Feature Group 4: Enhanced Generation Experience

**Priority: P1 — Every competitor fails here. Easy win.**

### Feature 4.1: Step-by-Step Progress Indicator

**What:** Replace the simulated progress bar with a real, step-based progress indicator that reflects actual pipeline stages.

**Why:** The current loading screen shows a simulated progress bar (0→97% over ~90 seconds) with a rotating tips carousel. This is honest about the wait time but provides no meaningful information. The competitive research found that no product in the category uses step-by-step progress — which means doing this at all is a differentiator.

**Acceptance Criteria:**
- Progress display shows distinct named steps that correspond to real pipeline stages:
  1. "Analysing your room..." (photo analysis, if not already complete)
  2. "Understanding the space..." (edge detection / structural conditioning)
  3. "Designing Concept 1..." (first batch of generation)
  4. "Designing Concepts 2-4..." (second batch)
  5. "Quality check..." (validation)
  6. "Your vision is ready!"
- Each step shows a checkmark when complete and transitions to the next
- Steps reflect actual progress — when the API call for batch 1 completes, step 3 marks done and step 4 begins (this requires the API to send progress updates)
- The overall progress percentage still exists alongside the steps (for users who think in percentages)
- Tips carousel remains — it fills the wait time; the steps fill the trust gap
- If a step takes longer than expected (e.g., rate limit retry), the step label updates: "Designing Concept 1... (optimising quality)"

**Implementation Hint:** The API route already processes in named stages (upload → analysis → edge detection → batch 1 → batch 2 → validation → save). These stages can be reported via Server-Sent Events, a polling endpoint, or chunked response. The implementer should choose the approach that works within Vercel's constraints.

### Feature 4.2: Progressive Concept Reveal

**What:** As each concept completes generation, show it immediately rather than waiting for all 4 to finish.

**Why:** Concepts generate in two batches (0+1 parallel, then 2+3 parallel). Currently, the user sees nothing until all concepts are complete (or the time budget forces an early return). Showing concepts as they arrive cuts perceived wait time in half — the user sees their first results at ~30-40 seconds instead of ~60-90.

**Acceptance Criteria:**
- When concept batch 1 (concepts 0 and 1) completes, the UI transitions to the results view showing the available concepts
- The before/after slider shows the first completed concept immediately
- Concept thumbnails that haven't arrived yet show a shimmer/skeleton placeholder with "Generating..." label
- As batch 2 completes, concepts 2 and 3 appear in the thumbnail row with a subtle entrance animation
- The "Get a Quote for This Design" CTA is available as soon as at least 1 concept is visible
- If only 1-2 concepts ultimately generate (due to timeout or errors), the UI works gracefully — no empty thumbnail slots, no error states for missing concepts

**Codebase Reference:** The API route already handles early return (returns available concepts if >80s elapsed). The change is in how the frontend receives and displays partial results. Currently `ResultDisplay` expects the full `VisualizationResponse`. It needs to support incremental updates.

---

## Feature Group 5: Mobile Camera Capture

**Priority: P2 — Competitive differentiator but not blocking conversion.**

### Why This Matters

The competitive research found that no product offers in-browser camera capture with framing guidance — despite the primary use case being "I'm standing in my kitchen and want to see what it could look like." Every product relies on the default file picker, which opens the system camera chooser on mobile with zero guidance on how to frame the shot. This is a missed opportunity because **input photo quality is the single biggest driver of output quality**.

### Feature 5.1: Smart Camera Capture Mode (Mobile)

**What:** On mobile devices, the photo upload area should offer a prominent "Take a Photo" option alongside "Choose from Library." When the user selects "Take a Photo," open an in-browser camera view with real-time framing guidance overlays.

**Acceptance Criteria:**
- On mobile viewports, the upload area shows two equally prominent options: "Take a Photo" (camera icon) and "Choose from Library" (gallery icon)
- On desktop, the existing drag-and-drop / click-to-browse interface is unchanged
- The camera view shows real-time framing guides:
  - Rule-of-thirds grid overlay (subtle, like the iPhone camera grid)
  - A text hint at the top: "Stand in a corner and capture the widest view possible"
  - A brightness indicator if the scene is too dark: "Move to a brighter spot or turn on lights"
- User can capture the photo, see a preview, and confirm or retake
- Captured photo goes through the same compression pipeline as uploaded photos
- If the browser doesn't support camera access (getUserMedia), fall back gracefully to the standard file input with `capture="environment"` attribute
- Camera guidance text matches the existing "Tips for best results" content: wide shot from corner, good lighting, clear clutter, include key features

**Design Guidance:** The camera view should feel like a purpose-built tool, not a generic webcam. The framing guides should be subtle enough to not obscure the room view but clear enough to improve photo composition. Think: iPhone's built-in camera with a grid overlay, plus a coaching tooltip.

### Feature 5.2: Photo Quality Assessment (Post-Capture)

**What:** After a photo is captured or uploaded, run a quick client-side quality check before proceeding.

**Acceptance Criteria:**
- Check runs locally (no API call) and completes in under 1 second
- Detects: extreme blur, very low brightness, very small image dimensions, photos that appear to be screenshots or documents (not rooms)
- If quality issues are detected, show a non-blocking suggestion: "This photo looks a bit dark. Retake with more light for better results?" with "Retake" and "Continue Anyway" options
- Never blocks the user — they can always proceed with their photo
- This assessment is separate from the GPT Vision analysis (which runs server-side and provides deep room understanding)

---

## Feature Group 6: Admin Dashboard — Visualization Context for Contractors

**Priority: P2 — Required for Accelerate/Dominate value prop but not blocking first sale.**

### Feature 6.1: Visualization Context in Lead Detail View

**What:** When a contractor views a lead in the admin dashboard that originated from the visualizer, they should see the homeowner's visualization context alongside the lead details: the original photo, the selected concept render, the room analysis summary, and the style/material preferences.

**Why:** Currently, the contractor sees basic lead info (name, phone, email, project type) and might see that a visualization exists, but they don't see the rich context. The contractor should be able to glance at a lead and immediately understand: "This homeowner has a dated 12×14 L-shaped kitchen, wants Modern style with marble counters, and liked Concept 2 with the grey cabinets."

**Acceptance Criteria:**
- Lead detail view includes a "Visualization" section when a visualization is linked
- Section shows: original photo thumbnail, selected concept render (full-size on click), room analysis summary (dimensions, layout, condition), style selected, material preferences, and homeowner's text/voice preferences
- Before/after slider is available inline in the lead detail (reuse the existing `BeforeAfterSlider` component)
- Contractor can add notes to the visualization (the `admin_notes` column already exists)
- Contractor can set a feasibility score (1-5) and flag technical concerns (columns already exist)
- All concept renders are viewable (not just the selected one)

**Codebase Reference:** The `visualizations` table already has `admin_notes`, `contractor_feasibility_score`, `estimated_cost_impact`, and `technical_concerns` columns. The `lead_visualizations` junction table with `is_primary`, `admin_selected`, and `relationship_notes` fields supports this. These columns exist but have no UI to populate or display them.

---

## Feature Group 7: Data & Schema Improvements

**Priority: P0/P1 — Foundational changes required by other features.**

### Feature 7.1: Fix Room Type Database Constraint

**What:** Update the `room_type` CHECK constraint on the `visualizations` table to include all 8 supported room types: kitchen, bathroom, living_room, bedroom, basement, dining_room, exterior, other.

**Why:** The UI supports 8 room types but the database only allows 6. Currently, "exterior" and "other" are silently mapped to "living_room" — losing the actual room type. This is a data integrity issue that will corrupt analytics and mislead Marcus.

**Acceptance Criteria:**
- Database migration adds `exterior` and `other` to the CHECK constraint
- No more silent mapping/fallback for room types
- If a custom room type text is provided (when "other" is selected), it's stored alongside the enum value

### Feature 7.2: Session Linking for Multi-Style Generations

**What:** Add a `session_id` concept to the `visualizations` table so that multiple generations from the same photo can be linked together.

**Why:** Feature 3.1 (Try Another Style) will create multiple visualization records from a single photo upload session. These need to be queryable as a group for the Style History Gallery (Feature 3.2) and for analytics.

**Acceptance Criteria:**
- New `session_id` column (UUID) on the `visualizations` table
- All visualizations generated from the same uploaded photo in the same user session share a `session_id`
- The first visualization in a session generates the `session_id`; subsequent "Try Another Style" generations inherit it
- A query like `SELECT * FROM visualizations WHERE session_id = X ORDER BY created_at` returns all generations in a session
- The `session_id` is included in the handoff context so Marcus knows the homeowner explored multiple styles

### Feature 7.3: Update Visualization Metrics for New Features

**What:** Extend the visualization metrics to capture new interaction patterns.

**Acceptance Criteria:**
- Track: `styles_explored` (count of styles generated in one session), `camera_capture_used` (boolean), `photo_quality_score` (from client-side assessment), `time_on_form` (seconds between upload and generate click), `parallel_analysis_used` (boolean — did analysis complete before generation started?)
- The existing `proceeded_to_quote` boolean gets a companion `proceeded_to_quote_with_context` boolean (true when the enriched handoff was used)
- These metrics feed future conversion analytics (Dominate tier feature)

---

## Scope Boundaries — What NOT to Build

### Explicitly Out of Scope

1. **Real-time cost estimation during visualization** — Block Renovation does this, and it's powerful, but it requires deep Ontario pricing data integration with the visualizer UI. This is a future feature (after Ontario pricing data feed is built). For now, cost context arrives via Marcus, not during visualization.

2. **Point-and-edit / object-level editing** — Spacely AI's "click on the sofa, type 'make it navy'" feature is impressive but architecturally complex. Our iteration model is style-level, not object-level. This may come later.

3. **Shoppable product links in renders** — ReimagineHome and Remodeled AI link to real purchasable products. This requires product catalog integration and affiliate relationships. Not relevant to our contractor-focused model.

4. **AR room scanning or 3D floorplan generation** — Planner 5D and Homestyler do this. It's a different product category. Our value is in the photo→render→quote pipeline, not spatial modeling.

5. **Multi-photo / panoramic input** — Valuable but complex. Single photo per session is the current model and works well. Multi-angle support is a future enhancement.

6. **Automated A/B testing infrastructure** — The codebase briefing notes this as missing. It's valuable for optimisation but not for feature development. Park it.

7. **Video generation from before/after** — Interior AI does this. Cool for social media but not on the critical path to revenue.

---

## Implementation Sequencing

The features above are grouped by priority, but within and across groups, here's the recommended build order based on dependencies and value delivery:

### Phase 1: Context Pipeline (1-2 days)
Build the enriched handoff (Features 1.1–1.5) and fix the room type constraint (7.1). This is the highest-ROI work — it requires no new UI and transforms Marcus's effectiveness. Test by going through the full visualizer → estimate flow and confirming Marcus references photo analysis details, selected concept, and material preferences.

### Phase 2: Parallel Analysis + Room Card (1-2 days)
Move photo analysis to upload time (2.1) and build the Room Intelligence Card (2.2). This improves generation speed and gives the homeowner visible proof the AI understands their room.

### Phase 3: Generation Experience (1-2 days)
Build step-by-step progress (4.1) and progressive concept reveal (4.2). These improve the generation wait experience, which is currently the weakest moment in the user journey.

### Phase 4: Iterative Exploration (2-3 days)
Build "Try Another Style" (3.1), session linking (7.2), and the Style History Gallery (3.2). This is the largest UI change and depends on the session_id schema being in place. Skip 3.3 (Quick Preview) unless the implementer identifies a fast, reliable approach.

### Phase 5: Mobile & Admin (2-3 days)
Build mobile camera capture (5.1, 5.2) and admin dashboard visualization context (6.1). These are high-value but independent of the core pipeline.

**Total estimated effort: 7-12 days of focused implementation.**

---

## Success Metrics

After implementation, measure:

| Metric | Current | Target | How to Measure |
|---|---|---|---|
| Marcus discovery questions before first estimate | 5-7 questions | 1-2 questions | Count messages before first price range appears |
| Time from "Get a Quote" click to first estimate | ~8 minutes | ~3 minutes | Timestamp delta in chat |
| Styles explored per session | 1.0 | 1.8+ | `styles_explored` metric |
| Visualizer → quote conversion rate | Unknown (no tracking) | Track baseline, then improve | `proceeded_to_quote` metric |
| Photo analysis ready before generation starts | 0% (runs during) | 90%+ | `parallel_analysis_used` metric |
| Generation perceived wait (user exits/cancels) | Track baseline | Reduce by 30% | Cancel rate during generation |

---

## Appendix: Key Codebase Files to Read

Before starting implementation, read these files in full:

| File | Why |
|---|---|
| `src/components/visualizer/visualizer-form.tsx` | Main orchestrator — all state, steps, handoff logic |
| `src/lib/ai/photo-analyzer.ts` | The 18-field analysis schema and GPT Vision prompt |
| `src/lib/ai/prompt-builder.ts` | Style data (DETAILED_STYLES) and 6-part prompt construction |
| `src/lib/chat/handoff.ts` | Current handoff mechanism (sessionStorage, TTL, interface) |
| `src/lib/ai/personas/prompt-assembler.ts` | Marcus's prompt assembly including handoff context injection |
| `src/lib/ai/personas/quote-specialist.ts` | Marcus's persona, rules, and conversation flow |
| `src/components/visualizer/result-display.tsx` | Results view — where "Try Another Style" and gallery will live |
| `src/app/api/ai/visualize/route.ts` | The API route — generation pipeline, batching, progress stages |
| `supabase/migrations/20260206000000_enhanced_visualizations.sql` | Schema — existing columns available for new features |

---

*This PRD is authoritative for visualizer enhancement scope as of February 22, 2026. Implementation questions should reference the VISUALIZER_CODEBASE_BRIEFING.md for architectural details.*
