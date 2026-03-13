# Westmount Craftsmen — Full QA, Design Polish & Deployment Readiness

## Context

Westmount Craftsmen (https://westmount-craftsmen.norbotsystems.com) is a **warm lead** — a family-owned renovation contractor in Kitchener, ON. The bespoke build completed with a **REVIEW verdict (4.0/5)** on Mar 12. This plan takes it from REVIEW to LAUNCH-ready by:

1. Running thorough Playwright testing across all pages and breakpoints
2. Fixing all design, layout, and copy issues found
3. Ensuring brand fidelity to the original site (https://www.westmountcraftsmen.com/)
4. Verifying mobile responsiveness
5. Deploying and re-verifying

**Deploy repo:** `~/norbot-ops/products/demo/` (GitHub: ferdiebotden-ai/conversionos.git)
**Custom sections:** `src/sections/custom/westmount-craftsmen/westmount-craftsmen-sections.tsx` (~1500 lines, 6 exported components)
**Site data:** `src/lib/sites/westmount-craftsmen.ts` (SERVICES, TESTIMONIALS, PROJECTS, PUBLIC_CONTENT, TRUST_METRICS)

---

## Phase 1: Playwright Full-Site Audit (Read-Only)

Use Playwright MCP to navigate every page, take screenshots at desktop (1440px) and mobile (375px), and capture the accessibility snapshot. This is the diagnostic phase — no code changes yet.

### 1a. Homepage (/)
- Navigate to `https://westmount-craftsmen.norbotsystems.com/`
- Screenshot: desktop full-page + mobile full-page
- Accessibility snapshot: verify all text content
- Check:
  - Hero shows "Love Your Home" / "Renovations Made Easy"
  - Logo renders in hero badge
  - 4 service cards with images (not empty/broken)
  - Gallery section shows 6 projects with images
  - About section renders with copy
  - WhyChooseUs section renders
  - Testimonial carousel shows Sandy E. quote
  - Trust badge bar renders
  - CTA section present
  - Footer renders with correct phone, address
  - **No admin button in nav** (or if present, note for fix)
  - **No double footer** (custom + global)

### 1b. Services Page (/services)
- Navigate + screenshot desktop + mobile
- Check:
  - Page-specific hero heading (NOT generic "Love Your Home")
  - 4 service cards render with images
  - Service descriptions match original content
  - CTAs link to /visualizer
  - Responsive layout at mobile

### 1c. Projects Page (/projects)
- Navigate + screenshot desktop + mobile
- Check:
  - Shows portfolio gallery (NOT services grid)
  - Project cards have images (not empty dark cards)
  - Project titles match real names (Kiwanis, Hostetler, etc.)
  - Gallery filter buttons work
  - Responsive grid layout

### 1d. About Page (/about)
- Navigate + screenshot desktop + mobile
- Check:
  - About copy matches original business description
  - About image renders
  - Mission/values section present
  - Trust badges render

### 1e. Contact Page (/contact)
- Navigate + screenshot desktop + mobile
- Check:
  - Phone number: (519) 635-7089
  - Address: 100 Campbell Ave #11, Kitchener, ON
  - Contact form or CTA present
  - Map or location reference

### 1f. Cross-Page Checks
- All nav links work (click each, verify navigation)
- Phone `tel:` link works
- All images load (intercept network requests, check for 4xx/5xx)
- No horizontal overflow on mobile
- No placeholder text ("Lorem ipsum", "TODO", "{{variable}}")
- Brand colour appears consistently (navy blue primary)
- Footer consistent across all pages

---

## Phase 2: Issue Triage

After Phase 1 screenshots, categorize all issues found:

### Known Issues (from prior QA + exploration):

| # | Issue | Severity | Fix Strategy |
|---|-------|----------|-------------|
| 1 | **Admin button visible in nav** | HIGH | Conditional: hide when `tier === 'demo'` or add `showAdmin` override in admin_settings. Or: PATCH `plan` to `elevate` (no admin access). Better: add CSS to hide for prospect-facing. |
| 2 | **Inner page heroes all show "Love Your Home"** | HIGH | breadcrumb-hero reads `config.heroHeadline`. Fix: update `page_layouts` to use custom sections on inner pages, OR create page-specific breadcrumb hero overrides per page via admin_settings `page_heroes` key |
| 3 | **Projects page content** | HIGH | Verify `custom:westmount-craftsmen-gallery` renders properly with FALLBACK_PROJECTS (already fixed with service images). If still broken, debug SectionRenderer lookup. |
| 4 | **FALLBACK_SERVICES have image: ''** | MEDIUM | The `services` array in the component needs images. Check if Supabase service images are being read via config, or if the fallback with empty strings causes broken cards. |
| 5 | **Single testimonial** | LOW | Only Sandy E. — carousel works but feels thin. Can't fabricate; leave as-is but ensure carousel doesn't look broken with 1 item. |
| 6 | **Double footer on homepage** | MEDIUM | Custom footer section + global `<Footer />` both render on homepage. Fix: remove `custom:westmount-craftsmen-footer` from homepage page_layouts, OR set `layout_flags.custom_footer = true` (but that hides footer on inner pages). Best: remove the custom footer from homepage layout since global footer is more complete. |
| 7 | **TRUST_METRICS all null** | LOW | `yearsInBusiness`, `googleRating`, `googleReviewCount` are null in site data despite being in scraped data. Fix: update `westmount-craftsmen.ts` with real values from scraped.json. |
| 8 | **Contact page minimal** | MEDIUM | Only breadcrumb-hero + CTA. Fix: update page_layouts.contact to include `contact:form-with-map` section. |
| 9 | **Email missing** | LOW (for demo) | Scraped email is empty. Won't block demo viewing, but footer/contact show empty. Use fallback or note. |

---

## Phase 3: Fixes (Prioritized)

### Fix 1: Admin Button — Hide for Demo Viewing (HIGH)

**File:** `src/components/header.tsx`

The admin button shows for Accelerate tier (`canAccess('admin_dashboard')`). For demo purposes, we don't want prospects seeing this.

**Options:**
- **A (recommended):** Add an `admin_settings` key `hide_admin_nav` that the header checks. Set it for prospect-facing demos.
- **B (simpler):** PATCH `plan` in admin_settings from `accelerate` to `elevate` (hides admin). But this changes the tier globally.
- **C (targeted):** Add a CSS class or data attribute to the admin link that can be toggled via admin_settings `branding.hideAdminNav: true`.

**Chosen approach:** Option A — add a `demo_mode` key to `admin_settings` that suppresses the admin nav button. This is reusable across all demo tenants.

Actually, simpler: just check if there's a `demo_mode` or `prospect_view` flag. But to avoid touching the shared header component for one tenant, the cleanest approach is: **PATCH the `plan` to `elevate` in Supabase for westmount-craftsmen**. Elevate tier has no admin dashboard access, so the button disappears. The site already renders all public pages correctly regardless of tier.

**Action:** `curl` PATCH to Supabase admin_settings: `plan` = `"elevate"` for site_id `westmount-craftsmen`

### Fix 2: Inner Page Heroes (HIGH)

**File:** `src/sections/misc/breadcrumb-hero.tsx` (line 20)

Currently: `{config.heroHeadline || branding.name}` — always shows homepage headline.

**Fix approach:** The breadcrumb-hero should be page-context-aware. Since all inner pages call `getPageLayout('about')` etc., the section can't know which page it's on from props alone.

**Better approach:** Update `page_layouts` in Supabase to NOT use `misc:breadcrumb-hero` — instead use custom per-page hero sections, or update the page_layouts to use the standard sections that render page-appropriate headings.

**Simplest fix:** PATCH `page_layouts` in admin_settings to replace `misc:breadcrumb-hero` with page-appropriate standard sections:
- `/about` → keep `misc:breadcrumb-hero` but update `company_profile.aboutHeadline` in admin_settings
- `/services` → use `services:alternating-rows` (already has "Our Services" heading built in)
- `/projects` → use `gallery:masonry-grid` (has "Our Projects" heading)
- `/contact` → use `contact:form-with-map` (has "Contact Us" heading)

Actually, the cleanest fix that doesn't modify shared components: **PATCH `page_layouts`** in Supabase to use standard section types that have their own headings, removing `misc:breadcrumb-hero` from inner pages entirely.

**Updated page_layouts:**
```json
{
  "homepage": ["custom:westmount-craftsmen-hero", "trust:badge-strip", "misc:visualizer-teaser", "custom:westmount-craftsmen-services", "custom:westmount-craftsmen-why-us", "custom:westmount-craftsmen-about", "custom:westmount-craftsmen-gallery", "cta:full-width-primary"],
  "about": ["about:split-image-copy", "misc:mission-statement", "trust:badge-strip", "testimonials:cards-carousel", "cta:full-width-primary"],
  "services": ["services:alternating-rows", "testimonials:cards-carousel", "cta:full-width-primary"],
  "projects": ["gallery:masonry-grid", "testimonials:cards-carousel", "cta:full-width-primary"],
  "contact": ["contact:form-with-map", "trust:badge-strip"]
}
```

This replaces breadcrumb-hero + custom sections on inner pages with standard sections that have built-in page-appropriate headings, and removes the custom footer from homepage (fixing double footer too).

### Fix 3: Double Footer on Homepage (MEDIUM)

Handled by Fix 2 — remove `custom:westmount-craftsmen-footer` from homepage layout. The global `<Footer />` component in `layout.tsx` handles all pages.

### Fix 4: TRUST_METRICS Population (LOW)

**File:** `src/lib/sites/westmount-craftsmen.ts` (lines 275-282)

The scraped data has: `4.8★, 126+ reviews, 18 years in business`. Update the site data file:

```typescript
export const TRUST_METRICS = {
  "yearsInBusiness": 18,
  "projectsCompleted": null,
  "googleRating": 4.8,
  "googleReviewCount": 126,
  "certifications": [],
  "awards": []
} as const;
```

### Fix 5: Service Card Images (MEDIUM)

The FALLBACK_SERVICES in `westmount-craftsmen-sections.tsx` have `image: ''`. But the component also reads from config/branding. Need to verify:
- Does the normalizeServices function pick up Supabase service images from `company_profile.services[].image_urls`?
- If not, update FALLBACK_SERVICES with Supabase URLs (same pattern as FALLBACK_PROJECTS fix from earlier session).

**Action:** Read the `normalizeServices` function in the sections file, verify image sourcing. If fallback is used, populate with Supabase URLs:
```
${BASE}/services/kitchen-renovation.webp
${BASE}/services/bathroom-renovation.webp
${BASE}/services/basement-renovation.webp
${BASE}/services/home-renovation.webp
```

### Fix 6: Contact Page Enhancement (MEDIUM)

Handled by Fix 2 — updated page_layouts uses `contact:form-with-map` which renders a contact form + map embed. The standard component reads phone, email, address from branding.

---

## Phase 4: Deploy & Re-Verify

### 4a. Apply all code changes
- Edit `westmount-craftsmen-sections.tsx` (service images, trust metrics)
- Edit `westmount-craftsmen.ts` (TRUST_METRICS values)

### 4b. Apply Supabase PATCHes
- PATCH `plan` → `"elevate"` (hide admin button)
- PATCH `page_layouts` → updated layouts (fix inner page heroes, double footer)

### 4c. Commit + Push
```bash
cd ~/norbot-ops/products/demo
git add src/sections/custom/westmount-craftsmen/westmount-craftsmen-sections.tsx
git add src/lib/sites/westmount-craftsmen.ts
git commit -m "fix(westmount): polish service images, trust metrics, page layouts"
git push
```

Wait ~3 min for Vercel deployment.

### 4d. Playwright Re-Verification
Repeat Phase 1 checks on all 5 pages:
- Homepage: no double footer, no admin button, all sections render
- Services: page-appropriate heading, service cards with images
- Projects: gallery renders with images
- About: about copy and mission render
- Contact: form + map render
- Mobile: all pages responsive, no overflow
- Take final desktop + mobile screenshots for each page

### 4e. Brand Colour Verification
- Compare primary colour (#003399 navy blue) usage across hero, CTAs, badges
- Verify it matches the original site's visual identity
- Check contrast ratios for accessibility

---

## Phase 5: Final Verdict

Run the full RALPH 5-gate check:

| Gate | Check | Expected Result |
|------|-------|-----------------|
| G1 Hero | Correct name, headline, CTA, logo, brand colour | PASS |
| G2 Images | Zero broken images across all pages | PASS |
| G3 Copy | No placeholders, correct business info, correct services | PASS |
| G4 Visual | 5+ sections visible, no empty blocks, footer complete, animations | PASS |
| G5 Brand | Same colour family, similar layout, matching visual weight | PASS (review) |

**Target verdict: LAUNCH (all 5 gates pass)**

---

## Critical Files

| File | Purpose | Action |
|------|---------|--------|
| `src/sections/custom/westmount-craftsmen/westmount-craftsmen-sections.tsx` | 6 custom section components | Edit: service fallback images |
| `src/lib/sites/westmount-craftsmen.ts` | Site content data | Edit: TRUST_METRICS values |
| `src/sections/misc/breadcrumb-hero.tsx` | Generic inner page hero | NO EDIT (fix via page_layouts PATCH) |
| `src/components/header.tsx` | Navigation with admin button | NO EDIT (fix via plan tier PATCH) |
| `src/components/footer.tsx` | Global footer | NO EDIT |
| `src/lib/page-layout.ts` | Page layout system | NO EDIT (reads from admin_settings) |
| Supabase `admin_settings` | Per-tenant config | PATCH: plan, page_layouts |

## Verification

1. Playwright desktop screenshots of all 5 pages — visually verify layout, content, branding
2. Playwright mobile screenshots of all 5 pages — verify responsive design
3. Network intercept — zero broken images (4xx/5xx)
4. Accessibility snapshot — zero placeholder text, correct business info
5. Nav link verification — all links navigate correctly
6. Phone link verification — `tel:5196357089` works
7. Compare primary colour against original site

---

**TLDR:** Full QA audit + polish pass for Westmount Craftsmen. Playwright tests all 5 pages at desktop+mobile, fixes 6 issues (admin button via plan tier PATCH, inner page heroes via page_layouts PATCH, double footer removal, service card images, trust metrics, contact page). Two code file edits + two Supabase PATCHes. Deploy, re-verify with Playwright, target LAUNCH verdict.

**Complexity:** MEDIUM — Two small code edits, two Supabase PATCHes, extensive Playwright verification. No architectural changes, no shared component modifications. Risk is low since changes are scoped to one tenant's data and custom sections.
