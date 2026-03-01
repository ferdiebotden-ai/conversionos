# Design Studio — Final Polish Handoff

**Created:** March 1, 2026
**Source:** QA E2E testing session (28 screenshots, desktop + mobile + admin)
**Status:** Ready for implementation

This document describes all issues found during comprehensive Playwright E2E testing of the Design Studio. Each item includes the exact file to modify, what to change, and why.

---

## Critical Fix (Already Done)

### F0: handoff.ts optional chaining — FIXED
- **File:** `src/lib/chat/handoff.ts:330-335`
- **What:** `pa.structuralElements.length` crashes when photo analysis returns incomplete data
- **Fix applied:** Changed to `pa.structuralElements?.length` and `pa.identifiedFixtures?.length`
- **Impact:** This was breaking Emma chat entirely with a 500 error

---

## Priority 1 — Fix Before Demos

### F1: Render markdown in Design Studio Chat bubbles

**File:** `src/components/visualizer/design-studio-chat.tsx`

**Problem:** Emma's responses contain markdown formatting (`**bold**`, `- bullet points`) that renders as literal text. Users see `**Marble countertop:**` instead of **Marble countertop:**

**Fix:** Replace the plain text rendering in the chat message `<div>` (around line 311) with a lightweight markdown renderer.

**Options (pick one):**
1. **Simple regex** — Replace `**text**` with `<strong>text</strong>` and `- item` with bullet list items. Fastest, zero dependencies.
2. **`react-markdown`** — Already a common dependency. Handles bold, italic, lists, links. More robust.
3. **Custom component** — Parse markdown parts and render with Tailwind typography.

**Suggested approach:** Option 1 (simple regex) to keep bundle small. Create a `formatChatMessage(text: string): ReactNode` helper:
```typescript
function formatChatMessage(text: string): ReactNode {
  // Split by **bold** markers, render <strong> tags
  // Split by \n- for bullet lists
  // Return array of React elements
}
```

**Test:** Send Emma a message that triggers a bulleted response (e.g., "What materials should I consider?") and verify bold text and lists render properly.

---

### F2: Sticky CTA bar overlaps before/after slider

**File:** `src/components/visualizer/result-display.tsx`

**Problem:** The fixed-bottom "Get a Personalised Estimate" bar (lines 315-336) sits directly on top of the before/after slider labels ("Current" / "Concept 1"). This is especially problematic on mobile where the slider is already compact.

**Fix:** Add bottom padding to the results container so content doesn't get hidden behind the sticky bar.

```tsx
// Line 118 — add padding when sticky CTA is visible
<div className={cn('space-y-6', showStickyCTA && !leadSubmitted && 'pb-24', className)} data-testid="visualization-result">
```

Alternatively, add `scroll-padding-bottom: 5rem` to the parent so anchor scrolling accounts for the bar.

**Test:** On both desktop and mobile, verify the before/after slider labels are fully visible when the sticky CTA is showing.

---

### F3: Mobile results page has excessive vertical gaps

**File:** `src/components/visualizer/result-display.tsx` and child components

**Problem:** Full-page mobile screenshot shows a large blank area (~400px) between the before/after slider and the concept thumbnails. Likely caused by:
1. Concept thumbnail images loading with incorrect container heights
2. The `FadeInUp` animation wrapper reserving space before content renders
3. Hidden elements (description card, cost indicator) taking up space when empty

**Investigation steps:**
1. Open Chrome DevTools on mobile viewport (390x844)
2. Inspect the space between `BeforeAfterSlider` and `ConceptThumbnails`
3. Check for `min-height`, `aspect-ratio`, or `height` on intermediate containers
4. Check if `selectedConcept?.description` div (line 171-177) has a fixed height even when empty

**Fix:** Once the spacer element is identified, constrain its height or add `overflow-hidden` to prevent layout shift.

**Test:** Generate concepts on mobile, take a full-page screenshot, verify no excessive gaps.

---

## Priority 2 — Polish

### F4: Transition message should scroll into viewport

**File:** The component that renders the Emma transition card after clicking "Generate My Vision" (likely in the visualizer page component or `generation-loading.tsx`)

**Problem:** After clicking "Generate My Vision", the page sometimes shows the footer instead of the transition message ("Thank you for sharing your vision — let me bring it to life"). The transition card appears above the fold but the viewport doesn't scroll to it.

**Fix:** After the state change that shows the transition card, scroll it into view:
```typescript
useEffect(() => {
  if (showTransition) {
    transitionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}, [showTransition]);
```

---

### F5: Chat message text density — add line breaks

**File:** `src/components/visualizer/design-studio-chat.tsx`

**Problem:** Emma's longer responses (design advice with multiple topics) render as dense walls of text. Bullet points marked with `- ` run together without visual separation.

**Fix:** This is largely solved by F1 (markdown rendering). If using the simple regex approach, ensure `\n` characters are converted to `<br />` tags or paragraph breaks. The markdown renderer should handle `\n- ` as list items with proper spacing.

---

### F6: Cost range band too wide ($10K-$40K)

**File:** `src/lib/ai/knowledge/pricing-data.ts` (room type estimates) and/or `src/components/visualizer/cost-range-indicator.tsx`

**Problem:** The bathroom cost range shows "$10,000 – $40,000 + HST" — a 4x spread that feels vague. This comes from the Ontario pricing database room type estimates.

**Fix options:**
1. **Tighten the room type ranges** in `pricing-data.ts` — bathroom could be $15,000-$35,000 based on Ontario market data
2. **Use the AI-calculated range** from concept pricing analysis instead of the generic room type range (if `concept_pricing` data is available, prefer those narrower estimates)
3. **Snap to the configured range band** — if `rangeBand` is 10000, show $15,000-$25,000 for a mid-range bathroom

**Note:** This is a product/pricing decision. Discuss with Ferdie which approach feels most credible to contractors showing demos.

---

### F7: "Refine My Design" silent disappearance indicator

**File:** `src/components/visualizer/design-studio-chat.tsx`

**Problem:** After the 3rd refinement, the "Refine My Design" button silently disappears. The current design is intentionally non-pressuring (no counter), but some users may wonder where the button went.

**Fix (optional, subtle):** After the 3rd refinement, Emma could say "Your design is looking great — I've made all the adjustments I can. Ready to move forward?" instead of the generic "I've updated your design — take a look! What's next?" This way the disappearance feels intentional rather than broken.

**Implementation:** In `handleRefine()` callback (line 184-215), check if `refinementCount + 1 >= RENDERING_CONFIG.maxRefinements` and use a different acknowledgement message.

---

## Priority 3 — Nice to Have

### F8: Sentry error badge in admin

**File:** Admin layout or Sentry configuration

**Problem:** "1 Issue" red badge visible in bottom-left of admin dashboard. Pre-existing error tracked by Sentry.

**Fix:** Log into Sentry (`norbot-systems-inc` org), review the tracked issue, and either fix or dismiss. Likely a hydration warning or image loading issue.

---

### F9: Concept description card visibility

**File:** `src/components/visualizer/result-display.tsx`

**Problem:** The AI-generated concept description (lines 171-177) appears in a subtle `bg-muted/50` card between the thumbnails and cost range. On desktop it's easy to scroll past.

**Fix (optional):** Consider one of:
1. Move the description into the before/after slider as a caption overlay
2. Add a slight left border accent (`border-l-4 border-primary`) to make it more prominent
3. Keep as-is — some users prefer clean layouts without too much text

---

### F10: Manual mobile camera QA

**File:** `src/components/visualizer/visualizer-form.tsx`

**Problem:** "Take a Photo" / "Choose from Gallery" buttons couldn't be tested via Playwright (requires real mobile userAgent). These buttons use `capture="environment"` attribute.

**Fix:** Manually test on a real iPhone and Android device:
1. Navigate to the visualizer
2. Verify "Take a Photo" opens the rear camera
3. Verify "Choose from Gallery" opens the photo picker
4. Verify the photo uploads and triggers AI analysis
5. Verify the rest of the flow works identically to desktop

---

## General Application Polish (Beyond Design Studio)

### G1: Emma widget (receptionist chat) — verify on all pages

Test the floating Emma widget (bottom-left N icon) on every public page:
- `/` (homepage)
- `/services`, `/services/*` (service pages)
- `/projects` (portfolio)
- `/about`, `/contact`
- `/visualizer` (Design Studio — widget should coexist with inline chat)

Verify: Widget opens, Emma responds contextually per `PageContext` (general/estimate/visualizer), voice toggle works on all tiers.

### G2: Admin dashboard data freshness

After creating test leads, verify:
- Dashboard metrics update immediately (not stale cached)
- "Recent Leads" list shows newest lead at top
- Lead status badges are correct (New, Draft Ready, Sent, Won)
- Clicking through to lead detail loads all tabs without errors

### G3: PDF quote generation

Test the full PDF flow:
1. Open a lead with a quote draft
2. Click "Download PDF" in Quote tab
3. Verify PDF renders with: contractor branding, line items, totals, assumptions, e-signature block
4. Verify "Send Quote" emails the PDF (requires `RESEND_API_KEY`)

### G4: Mobile navigation

Test the hamburger menu on all pages:
- Opens/closes correctly
- All nav items visible (Home, Services, Projects, About, Contact)
- "Admin" link visible for Accelerate+ (with red border)
- Links navigate correctly
- Menu closes after navigation

### G5: Cross-tenant branding

Switch `NEXT_PUBLIC_SITE_ID` to `mccarty-squared` and verify:
- Branding changes (colours, company name, logo)
- Emma uses contractor-specific context
- Cost ranges reflect contractor's quote assistance mode
- Admin dashboard shows only that tenant's data

---

## Recommended Execution Order

1. **F1** (markdown in chat) — highest visual impact, affects every Emma interaction
2. **F2** (sticky CTA padding) — quick CSS fix, improves both viewports
3. **F3** (mobile layout gaps) — requires investigation, may be a quick fix once root cause found
4. **F4** (transition scroll) — one-line `scrollIntoView` fix
5. **F5** (text density) — mostly solved by F1
6. **F10** (manual mobile QA) — doesn't require code, just a real device
7. **F6-F9** (pricing, refinement UX, Sentry, description) — discuss with Ferdie, lower priority
8. **G1-G5** (general polish) — verification tasks, can run as a separate QA pass

**Estimated effort:** F1-F5 = ~2 hours. F6-F10 = ~1 hour. G1-G5 = ~1 hour QA time.

---

*This handoff is designed to be picked up by a fresh Claude Code session. All file paths are exact. Each fix includes the problem, location, and suggested implementation.*
