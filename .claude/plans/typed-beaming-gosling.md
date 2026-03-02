# Go-Live Sprint — Mobile Fixes + No-Photo Fallback Path

## Context

Ferdie reviewed the app on mobile ahead of today's go-live (building first bespoke production demos). He flagged 8 issues — 7 mobile UX/layout bugs plus a major UX gap: homeowners who don't have a photo can't chat with Emma or submit for a quote. The visualizer currently requires a photo upload as the first step, with no alternative path.

Research confirms photos should be optional (industry standard). Chatbot-first flows convert 3-5x better than forms alone. The recommended pattern: progressive disclosure with "Don't have a photo?" as a natural skip on the existing visualizer page.

---

## Changes (11 items, priority order)

### 1. No-Photo Fallback Path (MAJOR)

**What:** Add a "skip photo" link on the `/visualizer` photo upload step that drops users into an inline Emma chat + lead capture form — skipping visualization entirely.

**Why:** Homeowners without a photo are currently stuck. This is a conversion blocker.

**Approach:** Add a new step `'no_photo_chat'` to the existing `visualizer-form.tsx` state machine. One skip link, two new leaf components, three small file modifications. Zero new routes, zero homepage changes.

**Files:**

| File | Action | What Changes |
|------|--------|-------------|
| `src/components/visualizer/visualizer-form.tsx` | Modify | Add `'no_photo_chat'` to `Step` type. Add skip link below `PhotoUpload`. Add conditional render for the new step. |
| `src/components/visualizer/no-photo-chat-panel.tsx` | **New** | Composites: header, embedded `ReceptionistChat` (full-width, not floating widget), CTA button, inline lead form, success state. Back-to-photo link. |
| `src/components/visualizer/no-photo-lead-form.tsx` | **New** | Same fields as `lead-capture-form.tsx` but with explicit `projectType` selector (dropdown: Kitchen, Bathroom, Basement, Flooring, Painting, Exterior, Other). Posts to existing `/api/leads` endpoint. |
| `src/app/api/leads/route.ts` | Modify | Dynamic `source` value: `'ai_chat'` when `visualizationId` present, `'chat_no_photo'` otherwise. ~2 line change. |
| `src/lib/copy/site-copy.ts` | Modify | Add `getSkipPhotoText(ctx)` — tier-aware skip link copy. 4 lines. |

**Flow:**
1. User arrives at `/visualizer` → sees photo upload
2. Below upload: "Don't have a photo? Tell us about your project instead" (tier-aware copy)
3. Click → inline Emma chat (full width, embedded `ReceptionistChat`) + "Get My Estimate" / "Get in Touch" CTA
4. Click CTA → lead form slides in with projectType selector
5. Submit → lead created with `source: 'chat_no_photo'` → success state
6. "Back to photo upload" link available throughout

**No changes to:** homepage, header, mobile CTA bar, receptionist widget, routing.

---

### 2. Consolidate Mobile Sidebar Buttons

**What:** Remove the separate "Visualise" button from the mobile Sheet menu. The primary CTA ("Get Quote" → `/visualizer`) already does this.

**Why:** Ferdie flagged redundant "Get Quote" and "Visualise" buttons in the sidebar.

**File:** `src/components/header.tsx` lines 94-110

**Change:** Remove the "Visualise" `<SheetClose>` button (lines 100-109). Keep only the primary CTA button which already links to `/visualizer` (or `/contact` for Elevate).

---

### 3. Fix "How It Works" Step 3 — Make Bespoke

**What:** Step 3 description says "connect with a qualified local contractor" — this should use the contractor's actual business name.

**Why:** Ferdie flagged it as generic. For bespoke demos, every sentence must feel hand-built.

**File:** `src/lib/copy/site-copy.ts` — `getDefaultProcessStep3()` function

**Change:** The function needs access to `companyName`. Two options:
- **(A) Extend `CopyContext`** to include `companyName` (clean, future-proof)
- **(B) Add `companyName` parameter** to just this function

Recommend **(A)**: add `companyName: string` to `CopyContext`. Update `getCopyContext()` in `src/lib/copy/server.ts` and `useCopyContext()` in `src/lib/copy/use-site-copy.ts` to include it. Then update the step 3 copy:

```
// With quotes:
"Get a detailed cost range based on Ontario pricing data, then connect
 with {companyName} to bring it to life."

// Without quotes:
"Love what you see? Get in touch with {companyName} to discuss your
 project and bring it to life."
```

Also update `getHomepageFinalCTA()` description which has similar generic phrasing, and `getChatSkipText()` which says "a team member" (should be company name).

---

### 4. Homepage Final CTA — Add Chat Option

**What:** The bottom CTA section's secondary link ("Or get a free estimate") currently links to `/visualizer`. Add a lightweight chat alternative.

**Why:** Ferdie wants a chat option for users who don't want the full visualizer flow.

**File:** `src/app/page.tsx` lines 287-313 + `src/lib/copy/site-copy.ts` — `getHomepageFinalCTA()`

**Change:** Add a third link below the existing secondary: "Or just chat with Emma" that either:
- Links to `/visualizer?mode=chat` (visualizer page auto-skips to `no_photo_chat` step when `?mode=chat` query param present), OR
- Triggers the receptionist widget to open (via a custom event / state)

Recommend the query param approach — simpler, no cross-component state management. Add a `useSearchParams()` check in `visualizer-form.tsx` to auto-skip to `no_photo_chat` when `mode=chat`.

---

### 5. Chat Bubble Mobile Error — Investigate & Fix

**What:** Ferdie reports the chat bubble on the homepage on mobile causes an error.

**Why:** Blocking — broken chat on mobile kills trust.

**Approach:** The `ReceptionistWidget` and `ReceptionistChat` code looks structurally sound. Potential causes:
- **Rate limiting** on `/api/ai/receptionist` (edge runtime)
- **Missing OPENAI_API_KEY** env var on the demo deployment
- **Vercel AI SDK hydration issue** with `useChat()` initial messages
- **ScrollArea viewport** query failing on certain mobile browsers

**Action:** During implementation, open the mobile chat on the deployed demo and check browser console + network tab. Fix whatever the actual error is. If it's env-var related, verify `OPENAI_API_KEY` is set on the Vercel project.

---

### 6. Admin Dashboard — Fix Horizontal Scroll on Mobile

**What:** The admin main dashboard content scrolls horizontally on mobile.

**Why:** Distracting, unprofessional for a demo.

**File:** `src/app/admin/admin-layout-client.tsx` line 227

**Change:** Add `overflow-x-hidden` to the `<main>` element:
```tsx
<main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
```

Also check `src/components/admin/metrics-cards.tsx` — the `grid gap-4 md:grid-cols-2 lg:grid-cols-4` grid is fine (single column on mobile), but the cards' content may overflow if values are very long. Add `overflow-hidden` to the card wrapper.

---

### 7. Quote Detail Page — Fix Mobile Layout

**What:** The quote tab section and quote breakdown have horizontal scroll on mobile.

**Why:** Same as dashboard — unprofessional for a contractor reviewing quotes on their phone.

**Files:**
- `src/app/admin/leads/[id]/page.tsx` lines 120-129 — Tab list with `overflow-x-auto`
- `src/components/admin/quote-line-items-layout.tsx` — Desktop table with `min-w-[200px]` + fixed widths summing to ~770px

**Changes:**

**Tabs:** The current approach (`overflow-x-auto scrollbar-hide`) intentionally allows horizontal scroll for 6 tabs. On mobile, 6 tabs don't fit. Options:
- **(A)** Keep horizontal scroll but add fade indicators (like Settings page already does)
- **(B)** Use a dropdown/select on mobile for tab switching
- **(C)** Reduce to fewer tabs visible, collapse rest into "More"

Recommend **(A)** — add the same fade gradient indicators that `settings/page.tsx` already uses. Quick copy-paste, consistent pattern.

**Quote line items:** The component already has `isMobile` detection and switches to card layout. Verify the mobile card layout renders correctly. If the desktop table bleeds through on some viewports, add a `hidden md:block` guard on the table wrapper.

---

### 8. Admin Dashboard — Rethink Visualizer Metrics

**What:** The analytics dashboard measures visualization generation metrics (total viz, avg gen time, concepts/session). With the estimate page removed and chat-only leads now possible, these metrics need updating.

**Why:** Metrics should reflect the full funnel, not just the visualizer path.

**File:** `src/app/admin/analytics/analytics-dashboard.tsx` + `/api/admin/visualizations/trends/route.ts`

**Change (minimal for go-live):**
- Rename "Conversion Rate" metric to "Lead Capture Rate" (viz-to-lead + chat-to-lead)
- Add a "Chat-Only Leads" count (leads where `source = 'chat_no_photo'`)
- The existing "Total Visualizations" and "Avg Generation Time" metrics are still valid — they measure the visualizer path specifically

**Defer to post-launch:** Chat turn count, chat satisfaction signals, per-source conversion funnels.

---

### 9. Settings Page Tabs — Consistent Mobile Treatment

**What:** Settings page already has fade gradient indicators for horizontal tab scroll. Apply the same pattern to the lead detail page tabs (item 7 above).

**File:** Already covered in item 7.

---

### 10. Admin Quote View — Full Mobile Format Review

**What:** Beyond horizontal scroll, the entire quote review page needs a mobile format pass.

**Files:** `src/components/admin/quote-editor.tsx`, `src/components/admin/quote-line-items-layout.tsx`

**Change:** During implementation, review the quote editor on a 375px viewport. Fix:
- Ensure card layout is used (not table) on mobile
- Quote totals section should stack vertically
- Action buttons (Send, Create Invoice) should be full-width on mobile
- PDF preview link should be accessible

---

### 11. Copy Registry — Sweep for Generic Language

**What:** Several copy functions use generic "contractor" or "team member" language instead of `companyName`.

**Files:** `src/lib/copy/site-copy.ts`

**Change:** Audit all copy functions that reference "contractor" or "team member" and replace with `ctx.companyName` where appropriate. Key functions:
- `getDefaultProcessStep3()` — "qualified local contractor" → `{companyName}`
- `getChatSkipText()` — "a team member" → `{companyName}`
- `getHomepageFinalCTA()` description — already fine (no generic refs)

---

## Implementation Order

1. **Items 2, 6, 7** — Quick mobile fixes (sidebar buttons, overflow, tabs) — 15 min each
2. **Item 3** — Copy registry `CopyContext` extension + bespoke step 3 — 20 min
3. **Item 11** — Copy sweep for generic language — 10 min
4. **Item 1** — No-photo fallback path (MAJOR) — 60-90 min
5. **Item 4** — Homepage final CTA chat option + `?mode=chat` query param — 15 min
6. **Item 5** — Chat bubble error investigation — 15-30 min (depends on root cause)
7. **Item 8** — Analytics metrics update — 20 min
8. **Item 10** — Quote view mobile format review — 20 min

**Estimated total:** ~3-4 hours

## Verification

After implementation:
1. Open each tenant demo on a 375px mobile viewport (Chrome DevTools)
2. Walk through: Homepage → skip-photo chat → lead form → submit → admin dashboard → lead detail → quote
3. Verify: no horizontal scroll on admin pages, chat works without error, lead created with correct source
4. Run `npm run build` to catch type errors
5. Run `npm run test` to verify no regressions

---

**TLDR:** 11 changes for go-live readiness. The big one: add a "skip photo → chat + lead form" fallback on the visualizer page (2 new components, 3 modified files, zero new routes). Plus 7 mobile layout/UX fixes across homepage nav, admin dashboard, quote detail, and copy registry. All additive, no architectural changes. ~3-4 hours.

**Complexity:** MEDIUM — the no-photo path is the only non-trivial piece; everything else is targeted CSS/copy fixes. The approach reuses existing components (`ReceptionistChat`, lead form pattern, copy registry) to minimize risk.
