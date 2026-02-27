# Quote Engine V2 — Remaining Work

## Context
QE V2 Addendum identified 47 polish improvements. 40 were implemented in this session via Agent Teams (5 parallel teammates). 3 items are deferred, 4 were duplicates/already done.

## Deferred Items

### F12: Undo/Redo for Quote Editor
- **Effort:** 1+ day
- **Approach:** Snapshot-based — capture full editor state on each meaningful change, push to a history stack
- **Dependencies:** `quote-editor.tsx` (the main file)
- **Complexity:** HIGH — needs to handle line item add/remove/edit, assumptions, exclusions, tier mode changes
- **Recommendation:** Use `useReducer` with action replay, or a dedicated state management library. Consider `immer` for immutable snapshot efficiency.
- **Why deferred:** Scope too large for a polish sprint — requires its own focused session

### F13: Settings Live Preview
- **Effort:** 2-3 hours
- **Approach:** iframe or split-screen preview that renders the public site with current settings applied
- **Dependencies:** `src/app/admin/settings/page.tsx`, potentially a preview API route
- **Complexity:** MEDIUM — need to pass unsaved settings to a preview renderer without persisting them
- **Recommendation:** Use Next.js preview mode or a `?preview=true` query param with settings passed via postMessage to an iframe
- **Why deferred:** UX design decision needed — iframe vs modal vs side panel

### M3: Mobile Card Layout for Line Items
- **Effort:** 2-3 hours
- **Approach:** At < 768px, replace the table-based line item layout with a card-based layout
- **Dependencies:** `quote-line-item.tsx`, `quote-editor.tsx` (the Table wrapper)
- **Complexity:** MEDIUM — the table structure is deeply embedded; need to switch between Table and card layouts at breakpoint
- **Recommendation:** Use `useMediaQuery` hook or CSS-only approach with `display: none`/`block` at breakpoints. Each card shows description, category badge, qty × price = total, with expand for edit.
- **Why deferred:** Requires design decision on card layout and interaction patterns

## Duplicate/Already Done Items
- **C1:** Same as F10 (quote assistance mode confirmation) — implemented
- **C2:** Same as F5 (replace all clarity) — implemented
- **C3:** Same as F7 (tier mode confirmation) — implemented
- **C6:** Already done in previous session

## What Was Completed (40 Items)

### Validation (V1-V10)
- V1: Min/max guards on line items
- V2: Cross-field pricing validation
- V3: Email regex validation
- V4: Phone validation
- V5: Canadian postal code validation
- V6: Max message length (2000 chars)
- V7: CSV preview type validation
- V8: Template line item validation
- V9: Subtotal sanity check
- V10: Duplicate lead detection

### Features (F1-F11, excl F12/F13)
- F1: Confidence score tooltip
- F2: Read-only version banner
- F3: Version totals in tooltip
- F4: Always-visible transparency icon
- F5: "Replace All" clarity with confirmation
- F6: HST lock tooltip
- F7: Tier mode toggle confirmation
- F8: Scope gaps above line items
- F9: Intake confirmation modal
- F10: Quote assistance mode change confirmation
- F11: CSV export button
- F14: Template search + category filter

### Confirmations (C4-C5)
- C4: Reset to AI Quote confirmation
- C5: Load defaults confirmation

### Mobile (M1-M2, M4-M7)
- M1: Touch-visible action buttons
- M2: Slider thumb 44px touch target
- M4: E-signature responsive padding
- M5: Template modal responsive
- M6: Send wizard mobile width
- M7: Chat height on short phones

### Accessibility (A1-A8)
- A1: Keyboard support for slider
- A2: Focus trap verification (already handled by Radix)
- A3: Severity text labels in scope gaps
- A4: aria-live for loading states (SRAnnounce)
- A5: Slider ARIA attributes
- A6: Chat messages aria-live
- A7: aria-describedby on form errors
- A8: Focus-visible indicators

### Performance (P1-P5)
- P1: Memoize QuoteLineItem
- P2: Lazy-load PDF preview
- P3: Debounce field changes (1.5s)
- P4: Memoize useChat transport (already done)
- P5: ISR for homepage (1hr revalidation)

### Error Recovery (E1-E5)
- E1: Retry button on errors
- E2: E-signature retry
- E3: Settings fetch failure toast
- E4: CSV upload failure categorization
- E5: AI extraction failure recovery

## Test Coverage Added
- `tests/unit/validation.test.ts` — 18 tests (shared validation utils)
- `tests/unit/quote-editor-polish.test.ts` — 35 tests
- `tests/unit/settings-intake-polish.test.ts` — 23 tests
- `tests/unit/csv-template-polish.test.ts` — 37 tests
- `tests/unit/public-ux-polish.test.ts` — 18 tests
- `tests/unit/chat-a11y-polish.test.ts` — 21 tests
- **Total: 152 new unit tests** (723 total, up from 571)

## Next Steps
1. Implement F12 (undo/redo) — dedicated session, ~1 day
2. Implement F13 (settings preview) — after UX design decision
3. Implement M3 (mobile card layout) — after design review
4. Sprint 1 from `QUOTE_ENGINE_V2_ADDENDUM.md` — 15 quick wins
