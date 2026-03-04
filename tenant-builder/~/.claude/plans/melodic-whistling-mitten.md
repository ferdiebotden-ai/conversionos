# ICP Scoring Audit + Gallery Feature Build

## Context

Ferdie wants: (1) ICP scoring that properly prioritizes small-town, owner-operator contractors with contact data and basic websites, so "top 10 next targets" reflects the actual sales strategy. (2) A premium gallery/portfolio feature for ConversionOS, built directly, based on competitor research of 16 Ontario contractor websites.

---

## Part 1: ICP Scoring Fixes

### Four Gaps Found

**Gap 1 (CRITICAL): Pipeline uses wrong score.** `discover.mjs` line 64 sorts by `score` (old Python scorer), not `icp_score`. Fix: `ORDER BY COALESCE(icp_score, 0) DESC, score DESC` + contact pre-filter.

**Gap 2: Contact data ignored.** Email, phone, owner_name not in scoring. Fix: Replace `years_in_business` (15 pts, weakest signal) with `contact_completeness` — has all 3 = 15 pts, 2 of 3 = 10, 1 = 5, none = 0.

**Gap 3: Geography favours big cities.** Phase 1 (London, K-W) gets max points, but ICP wants small towns. Fix: Invert — small towns near Stratford (Woodstock, Ingersoll, Tillsonburg, St. Thomas) = 15 pts, mid-size cities = 12, farther/larger = 9.

**Gap 4: Built targets don't auto-drop.** Fix: `UPDATE targets SET status = 'bespoke_ready'` after provision+deploy in `orchestrate.mjs`.

### Files to Modify

| File | Change |
|------|--------|
| `discover.mjs` | SQL ordering + contact pre-filter |
| `icp-score.mjs` | New `scoreContactCompleteness()`, invert `scoreGeography()` |
| `config.yaml` | Weight rename, `small_town_cities` list, reorder cities |
| `orchestrate.mjs` | Status update after deploy |
| `CLAUDE.md` | "Getting Next Targets" section |
| `docs/icp-scoring.md` | Updated documentation |
| Tests | Update ICP scoring tests |

---

## Part 2: Gallery Feature Build

### Research Basis (16 Ontario Contractors Surveyed)

- 62% have some gallery — all weak (4-12 photos, basic grid, no descriptions)
- 38% have NO gallery at all
- Before/after sliders: 6% (1 site)
- ConversionOS already has `/projects` page with `ProjectGallery`, filtering tabs, animated cards
- Gap: image depth (3-5 scraped) and presentation (no lightbox, no before/after)

### Design Approach

Enhance the existing `/projects` page and components. No new pages, no new routes — upgrade what's there to feel premium.

**Gallery Grid Enhancement:**
- Keep existing 3-column responsive grid (it's correct)
- Add image zoom-on-hover with subtle scale + shadow elevation
- Improve card aspect ratio to 3:2 (currently 4:3) for more cinematic feel
- Add project count badge per category in filter tabs

**Lightbox/Modal:**
- Full-screen overlay using shadcn Dialog (already in the project)
- Large image display with project title, description, service type, location
- Keyboard nav (arrow keys, Escape)
- Swipe support on mobile (touch events)
- Counter: "3 of 12"

**Before/After Slider:**
- Interactive drag slider comparing before and after images
- Only renders when `beforeImageUrl` exists in portfolio data
- CSS-based clip-path approach (no external library — keeps bundle small)
- Touch-friendly drag handle with thumb indicator

**Visualizer CTA Section:**
- Below gallery grid, above page CTA
- "Inspired by our work? See what YOUR room could look like"
- Button links to `/visualizer`
- Only shows when gallery has 3+ projects (skip for sparse portfolios)

**Homepage Gallery Teaser (new section):**
- 3-4 featured project images on homepage (between "Why Choose Us" and Testimonials)
- "View All Projects" link to `/projects`
- Uses existing portfolio data, no new DB queries

### Scraper Changes (Tenant Builder)

- Increase portfolio image capture from ~5 to ~15-20
- Follow `/gallery`, `/portfolio`, `/our-work` subpages during scrape
- Optional `beforeImageUrl` field in portfolio items (detect paired images)
- Update `provision-tenant.mjs` to upload additional images

### Data Shape Update

Existing `company_profile.portfolio[]`:
```typescript
{
  title: string
  description: string
  imageUrl: string
  serviceType: string
  location: string
  beforeImageUrl?: string  // NEW — optional, for before/after pairs
}
```

No new DB tables. No schema migration. Just an optional field on existing JSON.

### Tier Gating

- Gallery page with grid + filtering: **All tiers** (Elevate, Accelerate, Dominate)
- Lightbox: **All tiers**
- Before/after slider: **All tiers** (it's a visual feature, not a gated capability)
- Visualizer CTA on gallery: **All tiers** (drives lead conversion)
- Homepage gallery teaser: **All tiers**

No tier gating needed — gallery is a presentation layer, not a feature capability.

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/project-gallery.tsx` | Enhance grid, add lightbox trigger |
| `src/components/project-card.tsx` | Improve hover effects, aspect ratio, before/after badge |
| `src/components/gallery-lightbox.tsx` | **New** — full-screen image viewer with nav |
| `src/components/before-after-slider.tsx` | **New** — interactive comparison slider |
| `src/app/projects/page.tsx` | Add visualizer CTA section |
| `src/components/home/gallery-teaser.tsx` | **New** — homepage featured projects |
| `src/app/page.tsx` | Add gallery teaser section |
| `tenant-builder/lib/scrape-enhanced.mjs` | Increase image limit, follow gallery pages |
| `tenant-builder/provision/upload-images.mjs` | Handle additional images |
| Tests | E2E tests for lightbox, before/after, responsive |

### Testing Plan

1. **Unit tests:** Gallery components render with 0, 1, 3, 10, 20 projects
2. **E2E (Playwright):** Lightbox opens/closes, keyboard nav, before/after drag, mobile swipe, filter tabs, visualizer CTA link
3. **Visual verification:** Playwright screenshots of gallery on desktop + mobile for Red White Reno tenant
4. **Multi-tenant:** Verify gallery works with `?__site_id=` override for different tenants
5. **Empty state:** Verify graceful display when portfolio is empty or has 1-2 items

---

## Part 3: Existing Tenant Upgrades (4 Bespoke Builds)

After the gallery feature is built, tested, and deployed — upgrade all 4 existing bespoke tenants so they're outreach-ready.

### Tenants to Upgrade

| Site ID | Domain | Original Website |
|---------|--------|-----------------|
| `red-white-reno` | red-white-reno.norbotsystems.com | redwhitereno.com |
| `bl-renovations` | bl-renovations.norbotsystems.com | (check Turso) |
| `ccr-renovations` | ccr-renovations.norbotsystems.com | (check Turso) |
| `mccarty-squared-inc` | mccarty-squared-inc.norbotsystems.com | mccartysquared.ca |

### Per-Tenant Upgrade Process

For each tenant:

1. **Re-scrape original website for gallery images** — target 10-20 portfolio images (current builds have ~3-5). Use the enhanced scraper that follows gallery/portfolio subpages.

2. **Upload new images to Supabase Storage** — append to existing `{site_id}/portfolio/` bucket. Don't overwrite existing images that are already working.

3. **Update `company_profile.portfolio[]`** in Supabase `admin_settings` — add the new portfolio items with title, description, serviceType, location.

4. **Run content QA checks:**
   - Hero section: correct tagline, correct image (not logo, not generic)
   - Copy: company name, city, services match the original site
   - Contact: phone, email present and correct
   - Team members: names and roles from original site
   - Testimonials: real quotes (not fabricated)

5. **Run visual QA** — Playwright screenshots of all pages (homepage, services, about, projects, contact) on desktop + mobile. Verify:
   - Gallery page shows new images with filtering
   - Lightbox works
   - Homepage teaser shows featured projects
   - Mobile layout is clean
   - No broken images

6. **Fix any issues found** — direct Supabase patches for content, code fixes if structural

7. **Verify on live URL** — Playwright screenshot of the actual deployed domain

### What NOT to Redo

- Don't re-run the full 16-step pipeline — these tenants are already provisioned
- Don't re-provision DB rows — just update `company_profile` portfolio data
- Don't re-register domains — already done
- Don't re-run outreach — Ferdie sends emails manually after verification

### Known Issues per Tenant (from learned patterns)

- **mccarty-squared-inc:** Hero was logo CDN URL (fixed to portfolio/0.jpg). About copy referenced Strathroy not London (fixed). Image URLs ending in `/` (provisioner bug — manually patched).
- **red-white-reno:** Hero tagline was template text (fixed to "Building Trust With Quality Work"). Michel's contact info added. Hero image replaced.
- **bl-renovations, ccr-renovations:** Need fresh audit — built after pipeline improvements but before gallery feature.

### Mobile-First Design Priority

All gallery work must prioritize mobile:
- Touch-friendly lightbox (swipe to navigate, tap to close)
- Before/after slider with touch drag (not just mouse)
- Gallery grid: 1 column on mobile, 2 on tablet, 3 on desktop
- Images lazy-loaded with blur placeholder
- Card text readable at mobile font sizes
- No horizontal scroll on any viewport
- Test at 375px (iPhone SE) and 390px (iPhone 14)

---

## Sequencing

1. **ICP scoring fixes** — ~45 min
2. **Gallery feature build** — ~3-4 hours (components, scraper, tests)
3. **Deploy to Vercel** — push to main, verify gallery on conversionos.norbotsystems.com
4. **Tenant upgrades** — ~30-45 min per tenant (re-scrape, upload images, QA, fix)
   - Red White Reno → BL Renovations → CCR Renovations → McCartry Squared
5. **Final verification** — Playwright screenshots of all 4 tenants, desktop + mobile

## Verification

- `node icp-score.mjs --all --limit 20 --dry-run` — small-town contractors with contact data rank highest
- `node discover.mjs --pipeline --limit 10` — ICP score ordering works
- `npm run test:unit` passes (tenant-builder + main app)
- `npm run build` passes
- Playwright screenshots of `/projects` on all 4 tenants — gallery, lightbox, mobile
- Playwright screenshots of homepage on all 4 tenants — gallery teaser visible
- All 4 tenants: hero correct, copy correct, contact data present, no broken images

---

**TLDR:** Three-part plan. (1) Fix ICP scoring — 4 gaps: wrong SQL ordering, no contact scoring, geography favours big cities, built targets don't drop. (2) Build premium gallery — lightbox, before/after slider, homepage teaser, visualizer CTA, plus scraper image capture increase from ~5 to ~15-20. Mobile-first. (3) Upgrade all 4 existing bespoke tenants — re-scrape for gallery images, run QA, fix any issues — so Ferdie can send outreach with confidence. After this, the system is ready for the first new batch.

**Complexity:** LOW for ICP fixes. MEDIUM for gallery build. MEDIUM for tenant upgrades (4 tenants x 30-45 min each, mostly data work). Total session: ~6-8 hours.
