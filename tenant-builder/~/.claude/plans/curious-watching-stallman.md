# Plan: Dynamic Nav, Hero Policy, Pipeline Fixes & Tenant Audit

## Context

After a batch build of 30 tenants (Session 38), we discovered that:
- Nav links are hardcoded for all tenants — "Services", "Projects", "About", "Contact" always show even when content is empty
- Scroll-spy watches 9 hardcoded section IDs regardless of what's actually rendered
- Hero section falls back to a generic kitchen photo (`/images/hero/before-kitchen.png`) when no real hero exists — violates the "no AI-generated room images" policy
- Footer has hardcoded quickLinks that don't match tenant content
- The provisioner ALREADY generates `navItems` (provision-tenant.mjs:468-489) and conditional `page_layouts` (lines 441-466), but the platform doesn't properly consume `navItems` because the `Branding` type doesn't include the field

Additionally, 9 systemic pipeline bugs were found (improvement-log.md #8-#14). The 4 highest-impact, lowest-risk ones need fixing.

**Goal:** Make nav/scroll/footer dynamic based on tenant content, fix hero policy, fix pipeline bugs, backfill all existing tenants, QA everything via Playwright.

---

## Phase 1: Platform Code — Dynamic Nav + Hero (5 files, ~40 min)

### 1A. Add `navItems` to Branding type
**File:** `packages/conversionos-runtime/src/branding.ts`
- Add `navItems?: { label: string; href: string }[]` to the `Branding` interface
- In `getBranding()`, read `navItems` from the branding row value
- This eliminates the `as any` cast in header.tsx

### 1B. Fix scroll-spy to derive from DOM
**File:** `src/components/header.tsx`
- Remove `as any` cast on line 91 — use `branding.navItems` directly
- Change `useScrollSpy()` to scan actual `[id]` elements in `<main>` instead of hardcoded array:
  ```typescript
  // Instead of hardcoded sectionIds, scan the DOM:
  const sectionEls = document.querySelectorAll('main [id]')
  sectionEls.forEach(el => observer.observe(el))
  ```
- This automatically works with whatever sections SectionRenderer renders — no manual sync needed

### 1C. Footer derives quickLinks from navItems
**File:** `src/components/footer.tsx`
- Replace hardcoded `quickLinks` with: `branding.navItems?.filter(n => n.href !== '/') ?? DEFAULT_QUICK_LINKS`
- Falls back to current hardcoded array for tenants without navItems

### 1D. Hero gradient fallback (no AI room images)
**File:** `src/sections/hero/visualizer-teardown.tsx`
- When `heroImageUrl` is falsy, render a CSS gradient background using brand primary colour instead of the generic kitchen photo
- Pattern: `bg-gradient-to-br from-zinc-900 via-primary/30 to-zinc-950` (dark ambient with brand accent)
- Remove or guard the `DEFAULT_BEFORE` constant — never show a generic kitchen photo as a hero background

### 1E. Anchor map fix — gallery maps to gallery, not projects
**File:** `src/components/section-renderer.tsx`
- Change `gallery: 'projects'` to `gallery: 'gallery'` in `ANCHOR_MAP`
- Add `how-it-works` mapping for `misc:process*` sections (already exists, verify)

---

## Phase 2: Pipeline Bug Fixes (4 issues, ~20 min)

### 2A. ICP threshold uses routing threshold, not manual_review
**File:** `tenant-builder/orchestrate.mjs` (line 226)
- Change: `const threshold = CONFIG.icp_scoring.icp_routing?.tenant_threshold ?? CONFIG.icp_scoring.thresholds.manual_review`
- Add `--min-icp N` CLI flag to override

### 2B. Merge-proxy safety — append-only, never remove
**File:** `tenant-builder/provision/merge-proxy.mjs`
- Before writing proxy.ts, read current entries and verify none are being removed
- If the new set is smaller than the existing set, abort with error and log

### 2C. Results directory protection
**File:** `tenant-builder/orchestrate.mjs`
- Ensure no pipeline step deletes `results/{date}/{site-id}/scraped.json`
- Add guard: if results dir exists and `scraped.json` is present, preserve it across waves

### 2D. add-domain.mjs — call Vercel API directly
**File:** `scripts/onboarding/add-domain.mjs`
- Verify the Vercel API call (`POST /v10/projects/.../domains`) actually fires
- If using CLI (`vercel domains add`), switch to direct API call which works reliably

---

## Phase 3: Backfill All Tenants (~25 min)

### 3A. Create backfill script
**File:** New: `tenant-builder/scripts/backfill-dynamic-nav.mjs`

For each tenant in Supabase:
1. Read `company_profile` — extract services count, portfolio count, about copy length, testimonials count
2. Build `navItems` using same logic as provision-tenant.mjs:468-489:
   - Home (always)
   - Services (if services.length >= 2)
   - Gallery (if portfolio with images >= 3)
   - About (if aboutCopy > 50 chars or has mission/principals)
   - Contact (always)
3. Build `page_layouts.homepage` — remove sections with no content:
   - Remove services section if services.length === 0
   - Remove gallery section if portfolio.length === 0
   - Remove testimonials if < 2
4. Check heroImageUrl — if it's the generic kitchen fallback or an AI-generated room, clear it
5. Write updated `branding.navItems` and `page_layouts` to Supabase
6. Support `--dry-run`, `--site-id`, `--all` flags

### 3B. Hero image audit
As part of backfill, flag any `heroImageUrl` that:
- Is `/images/hero/before-kitchen.png` (generic fallback) — clear it
- Contains `hero-generated` or similar AI markers — clear it
- Is a real contractor photo (Supabase storage URL with `/hero.jpg` etc.) — keep it

---

## Phase 4: Deploy + QA (~20 min)

### 4A. Build and deploy
1. `npm run build` — verify TypeScript passes
2. `scripts/sync-deploy.sh` — sync to deploy repo
3. `git push` — trigger Vercel build

### 4B. Run backfill
1. `node tenant-builder/scripts/backfill-dynamic-nav.mjs --all --dry-run` — review
2. `node tenant-builder/scripts/backfill-dynamic-nav.mjs --all` — apply

### 4C. Playwright QA sweep
For each deployed tenant:
1. Navigate to homepage — verify nav links match `navItems`
2. Verify no nav link points to an empty page
3. Verify hero renders (gradient or real image, not broken)
4. Verify scroll-spy highlights correct section while scrolling
5. Check at 375px mobile breakpoint
6. Report pass/fail per tenant

---

## Files to Modify

| File | Change |
|------|--------|
| `packages/conversionos-runtime/src/branding.ts` | Add `navItems` to type + reader |
| `src/components/header.tsx` | Dynamic scroll-spy from DOM, remove `as any` |
| `src/components/footer.tsx` | Dynamic quickLinks from navItems |
| `src/sections/hero/visualizer-teardown.tsx` | Gradient fallback, no generic kitchen |
| `src/components/section-renderer.tsx` | Fix gallery anchor map |
| `tenant-builder/orchestrate.mjs` | ICP threshold fix, results protection |
| `tenant-builder/provision/merge-proxy.mjs` | Append-only safety |
| `scripts/onboarding/add-domain.mjs` | Direct Vercel API call |
| **New:** `tenant-builder/scripts/backfill-dynamic-nav.mjs` | Backfill all tenants |

## Verification

1. `npm run build` passes clean
2. Local dev: test with `?__site_id=demo` — nav should show all sections
3. Local dev: test with `?__site_id=borman-construction` — nav should only show sections with content
4. Playwright: scroll homepage, verify active nav highlight changes
5. Playwright: verify no broken images on hero
6. Backfill dry-run shows expected navItems per tenant
7. Post-deploy: curl all tenant domains, verify HTTP 200

---

**TLDR:** Thread `navItems` through 5 platform files so nav/scroll/footer auto-reflect each tenant's content. Fix 4 pipeline bugs. Backfill all 54+ tenants via Supabase script. Playwright QA everything. All backward-compatible — tenants without navItems fall back to current defaults.

**Complexity:** MEDIUM — cross-cutting but well-scoped. The provisioner already generates the data; the platform just needs to consume it properly. Riskiest step is the Supabase backfill (dry-run first).
