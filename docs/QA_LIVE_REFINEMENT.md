# QA Report: Live Design Refinement & Full User Journey

**Date:** 2026-02-28
**Tested by:** Claude Opus 4.6 (Playwright MCP manual walkthrough)
**Environment:** localhost:3000, desktop (1536x864) + mobile (375x812)
**Tenant:** demo (Accelerate tier)

## Test Flow

Upload photo → Select room/style → Generate concepts → Star favourite → Navigate to estimate → Rendering panel → Chat with design signals → Refinement triggers → Panel updates

---

## Bugs Found

### BUG-1: clientFavouritedConcepts lost during DB-backed handoff [CRITICAL — FIXED]

**Severity:** Critical — rendering panel never appeared on estimate page
**Root cause:** When estimate page loads with `?visualization=UUID`, it fetches the visualization from the DB API. The DB record's `conversation_context` JSONB does not contain `clientFavouritedConcepts` because starring is a client-side-only action (stored in React state, written to sessionStorage on navigate). The DB-backed handoff takes priority over sessionStorage in `estimate-client.tsx`, so the favourites are lost.
**Fix applied:** `src/app/estimate/estimate-client.tsx` — after building the DB handoff, merge `clientFavouritedConcepts` from sessionStorage if the DB doesn't have them.
**File:** `src/app/estimate/estimate-client.tsx:36-40`
**Status:** FIXED

### BUG-2: Nested button HTML validation in concept-thumbnails.tsx [MEDIUM]

**Severity:** Medium — HTML spec violation, accessibility issue
**Location:** `src/components/visualizer/concept-thumbnails.tsx:32-87`
**Description:** The outer `<button>` (concept selector, `onClick → onSelect(index)`) wraps an inner `<button>` (favourite star toggle, `onClick → onToggleFavourite(index)` with `e.stopPropagation()`). This produces `<button> cannot be a descendant of <button>` HTML validation error in the console.
**Console error:** "In HTML, %s cannot be a descendant of <%s>"
**Fix pattern:** Same as the fix applied to `rendering-panel.tsx` compact mode — restructure to use a `<div>` wrapper with sibling elements, or change the outer element to a `<div role="button">`.
**Status:** NOT YET FIXED

### BUG-3: Double period in Emma's photo analysis reference [LOW]

**Severity:** Low — cosmetic text issue
**Location:** Emma's first message on estimate page
**Description:** Emma says "...the space is approximately Approx. 10–12 ft wide x 11–14 ft deep (based on U-shape spans and standard appliance widths).." — note the double period at the end (`.` from the analysis text + `.` from Emma's sentence).
**Root cause:** The photo analysis string already ends with a period, and the prompt template appends another.
**Status:** NOT YET FIXED

---

## Improvements Recommended

### IMP-1: Before/after slider initial position [MEDIUM]

**Current:** The comparison slider starts at ~50%, showing both images overlapping with transparency.
**Suggestion:** Start the slider at 100% (showing full "Current" photo) and animate it to 50% after a brief delay (500ms). This creates a "reveal" effect that's more dramatic and intuitive. Users immediately see their original photo, then the transformation appears.

### IMP-2: Photo thumbnail too small after upload [LOW]

**Current:** After uploading a photo, it shows as a tiny ~48x48px thumbnail with "Analysing photo..." text.
**Suggestion:** Show a larger preview (e.g., 200px wide) so users can verify they uploaded the correct image. The current thumbnail is barely recognizable.

### IMP-3: "Analysing photo..." indicator may get stuck [LOW]

**Current:** The photo analysis indicator shows "Analysing photo..." but if the API returns a 500 error (observed in console during first load), the indicator may remain indefinitely without error feedback.
**Suggestion:** Add a timeout (15s) and fallback text like "Analysis complete" or "Skipped — continue below" so the user isn't left waiting.

### IMP-4: Finish Level defaults to "Economy" on estimate page [MEDIUM]

**Current:** The sidebar shows "Finish Level: Economy" by default, even though the user selected "Modern" style in the visualizer and mentioned $50K budget — both suggesting mid-to-high-end finishes.
**Suggestion:** Infer finish level from style + budget signals. Modern style + $50K budget → "Standard" or "Premium". Economy feels incongruent with the user's stated preferences and may undermine trust.

### IMP-5: Mobile "Talk to Emma" truncated to just "Talk" [LOW]

**Current:** On mobile, the voice button shows "Talk" instead of "Talk to Emma".
**Suggestion:** This is fine for space, but consider "Voice" or "Emma" as alternatives that maintain personality.

### IMP-6: Rendering panel could show refinement diff [NICE-TO-HAVE]

**Current:** When refinement completes, the image crossfades to the new version.
**Suggestion:** Add a brief "before/after" comparison within the panel — a small slider or tap-to-toggle between old and new refinement. This helps users appreciate how the rendering evolved based on their input.

### IMP-7: "Save Progress" button appears after first message [NICE-TO-HAVE]

**Current:** The "Save Progress" button appears in the progress stepper area after the first user message. Good feature, but no explanation of what it does.
**Suggestion:** Add a tooltip or brief label: "Save your progress to continue later via email."

### IMP-8: Step indicator could reflect rendering state [NICE-TO-HAVE]

**Current:** Progress stepper shows Start → Type → Details → Scope → Quote → Contact. The rendering refinement is invisible in this flow.
**Suggestion:** Consider a subtle visual indicator (pulse or badge) on the "Details" step when a refinement is in progress, connecting the chat conversation to the rendering update.

---

## Design Quality Assessment

### Strengths (World-Class)

1. **AI concept generation quality** — 4 distinct modern kitchen concepts generated in 46s, all visually stunning and distinctly different. Gemini Nano Banana 2 delivers excellent results.

2. **Before/after comparison slider** — Intuitive and dramatic. Users can drag to see the transformation.

3. **Emma's contextual greeting** — Immediately references the room type, style, number of concepts, and photo analysis dimensions. Feels personal and informed.

4. **Rendering panel design** — Clean integration in the sidebar. Star icon, "Your Vision" label, enlarge button, and signal summary text all feel polished.

5. **Refinement trigger UX** — "Refining your vision..." overlay is subtle (doesn't block the chat), and the system message after completion feels natural. The "Refined (1/3)" badge communicates the cap without being intrusive.

6. **Mobile adaptation** — Compact card with collapsible sections. Doesn't overwhelm the mobile chat experience.

7. **Signal summary text** — "Based on your quartz countertops, open concept layout, budget ~$50,000 preferences" — clear, specific, and builds confidence that the AI understood.

### Areas for Polish

1. **Concept thumbnail interaction model** — The favourite button is hard to discover (small star on hover overlay). Consider making it always visible, or adding a "tap to favourite" instruction on first visit.

2. **Cost estimate range** — "$30,000 – $60,000 + HST" is a very wide range (2x). Consider narrowing based on room size analysis and finish level signals.

3. **Progress stepper visual weight** — The stepper takes significant vertical space on desktop. Consider a more compact horizontal progress bar for the estimate page.

4. **Sticky CTA overlap** — The "Get a Personalised Estimate" sticky bar and "Submit Request Now" full-width bar both compete for attention. On the estimate page, "Submit Request Now" is the primary action — the sticky bar could be removed or made more subtle.

---

## Screenshots Captured

| # | File | Description |
|---|------|-------------|
| 01 | `qa-screenshots/01-homepage.png` | Homepage initial state |
| 02 | `qa-screenshots/02-visualizer-upload.png` | Visualizer page before upload |
| 03 | `qa-screenshots/03-photo-uploaded-selections.png` | Photo uploaded, room/style visible |
| 04 | `qa-screenshots/04-selections-made-generate-button.png` | Kitchen + Modern selected, full page |
| 05 | `qa-screenshots/05-generating-concepts.png` | Generation loading (viewport) |
| 05b | `qa-screenshots/05b-generating-progress.png` | 55% progress, 2 of 4 concepts |
| 06 | `qa-screenshots/06-vision-ready.png` | Full results page |
| 07 | `qa-screenshots/07-concept-selection.png` | Before/after slider close-up |
| 08 | `qa-screenshots/08-concept-thumbnails.png` | 4 concept thumbnails with descriptions |
| 09 | `qa-screenshots/09-concept-starred.png` | Concept 2 starred (gold star) |
| 10 | `qa-screenshots/10-estimate-with-rendering-panel.png` | Estimate page with rendering panel |
| 11 | `qa-screenshots/11-enlarged-dialog.png` | Enlarged rendering dialog |
| 12 | `qa-screenshots/12-refining-your-vision.png` | "Refining your vision..." state |
| 13 | `qa-screenshots/13-refinement-complete.png` | Refinement complete, "Refined (1/3)" |
| 14 | `qa-screenshots/14-mobile-estimate.png` | Mobile estimate with compact panel |

---

## Verification Summary

| Feature | Desktop | Mobile | Status |
|---------|---------|--------|--------|
| Photo upload | ✅ | — | Working |
| Room/style selection | ✅ | — | Working |
| Concept generation (SSE) | ✅ | — | 4 concepts in 46s |
| Before/after slider | ✅ | — | Working |
| Concept starring | ✅ | — | Working (nested button warning) |
| Handoff to estimate | ✅ | — | Working (after BUG-1 fix) |
| Rendering panel (sidebar) | ✅ | — | Working |
| Rendering panel (compact) | — | ✅ | Working |
| Enlarge dialog | ✅ | — | Working |
| Signal detection | ✅ | — | material+structural=50pts triggered |
| Refinement generation | ✅ | — | Gemini re-render successful |
| Panel image update | ✅ | — | Crossfade working |
| Refinement badge | ✅ | — | "Refined (1/3)" displayed |
| Signal summary | ✅ | — | "quartz, open concept, budget" |
| System message | ✅ | — | "I see your vision is taking shape!" |
| Sidebar project data | ✅ | — | Goals extracted from chat |
| Submit CTA visible | ✅ | ✅ | Always accessible |
