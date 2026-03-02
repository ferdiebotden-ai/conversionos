# Tenant Builder Production-Grade Refinement Plan

## Context

The ConversionOS platform has undergone significant polish — unified Design Studio, adaptive copy system, aurora hero, mobile camera capture, analytics dashboard, 17-item UX sprint, go-live readiness audit, and outreach pipeline. However, the tenant builder pipeline was built earlier and doesn't fully leverage these improvements. When building a new tenant site, gaps remain: missing social links, empty hero/about images, placeholder team photos, sparse portfolios, generic process steps, "N/A" business hours, and no favicon. The result is functional but not "hand-built" quality.

**Goal:** Update the tenant builder so every automated build produces a site that looks bespoke — no gaps, no placeholders, no missing data. Where real data isn't available, intelligently fill with generated content or gracefully hide sections. Verify every page element with a comprehensive QA loop.

**Approach:** Incremental refinement of existing pipeline modules (not a rewrite). The pipeline is 90% there — we're closing the last 10% of data gaps and adding a page-by-page verification pass.

---

## Gap Analysis (From Live Site Inspection)

### Data Gaps Found (Red White Reno tenant vs original site)

| Gap | Original Site Has | Our Tenant Shows | Root Cause |
|-----|------------------|-----------------|------------|
| **Social links** | Facebook, Instagram | Nothing | Scraper found them but they're empty in Supabase `branding.socials` |
| **Hero image** | No hero image (Mobirise text-only) | Aurora fallback (correct) | N/A — but for targets WITH hero images, scraper may miss them |
| **About image** | No about image | Gradient fallback | `about_image_url` empty — expected for this target |
| **Team photos** | No photos (text only) | Placeholder person icons | `teamMembers[].photoUrl` empty — expected, but icons look incomplete |
| **Portfolio** | 1 kitchen gallery link | 1 kitchen project | Sparse portfolio — scraper can only extract what exists |
| **Business hours** | Not listed | "N/A" displayed literally | Scraper returns literal "N/A" string, contact page renders it |
| **Process steps** | Not on original | Generic 3 steps | AI-generated — `_provenance` should flag these |
| **Favicon** | Mobirise default | NorBot teal favicon | No per-tenant favicon provisioned |
| **OG/SEO meta** | Minimal | Uses tenant name (good) | Missing og:image for social sharing |
| **Second phone** | Michel: 226-929-1519 | Not captured | Scraper only extracts primary phone |
| **Booking URL** | Embedded form | Correctly linked on contact | Working correctly |

### App Features the Builder Doesn't Fully Populate

1. **Footer social icons** — code reads `branding.socials[]` (footer.tsx:60-73) — works if populated
2. **Hero image** — falls back to AuroraBackground if `heroImageUrl` empty (good fallback)
3. **About image** — falls back to gradient (acceptable)
4. **Service images** — only first image per service stored (`services[].imageUrl` singular)
5. **Visualizer teaser** — uses stock before/after images from `/images/teaser/` (not tenant-specific)
6. **Process steps** — shows 3 scraped + 1 adaptive ("Receive Your Estimate") — step 4 is always correct
7. **"Powered by ConversionOS"** — correctly shows for Elevate/Accelerate, hidden for Dominate

---

## Implementation Plan

### Workstream 1: Enhanced Social Link Scraping

**Problem:** Social links exist on target websites but aren't making it to the tenant site.

**Files to modify:**
- `scripts/onboarding/scrape.mjs` — enhance social link extraction
- `tenant-builder/scrape/scrape-enhanced.mjs` — add social link verification pass

**Changes:**
1. In the scrape schema, add extraction hints for social links in footer/header/contact sections
2. After Firecrawl extraction, add a Playwright pass that:
   - Navigates to the target site
   - Queries `a[href*="facebook.com"], a[href*="instagram.com"], a[href*="twitter.com"], a[href*="x.com"], a[href*="houzz.com"], a[href*="linkedin.com"], a[href*="youtube.com"], a[href*="tiktok.com"], a[href*="pinterest.com"]`
   - Extracts href values
   - Merges into `social_facebook`, `social_instagram`, etc. (only if Firecrawl missed them)
3. Add `social_twitter`, `social_linkedin`, `social_youtube`, `social_tiktok`, `social_pinterest` to the scrape schema
4. Update `provision.mjs` lines 97-102 to include all social platforms:
   ```js
   const socialMap = {
     social_facebook: 'Facebook', social_instagram: 'Instagram',
     social_houzz: 'Houzz', social_google: 'Google',
     social_twitter: 'X', social_linkedin: 'LinkedIn',
     social_youtube: 'YouTube', social_tiktok: 'TikTok',
     social_pinterest: 'Pinterest',
   };
   branding.socials = Object.entries(socialMap)
     .filter(([key]) => data[key])
     .map(([key, label]) => ({ label, href: data[key] }));
   ```

**Verification:** Run scrape against redwhitereno.com, confirm Facebook + Instagram URLs captured.

---

### Workstream 2: Business Hours & Contact Data Cleanup

**Problem:** "N/A" renders literally on the contact page. Missing data should be handled gracefully.

**Files to modify:**
- `scripts/onboarding/provision.mjs` — sanitize "N/A" values
- `src/app/contact/page.tsx` — hide business hours when not available

**Changes:**
1. In `provision.mjs`, add a sanitization pass before building `companyProfile`:
   ```js
   function sanitizeNA(val) {
     if (!val || typeof val !== 'string') return '';
     const lower = val.trim().toLowerCase();
     if (['n/a', 'na', 'not available', 'not specified', 'not applicable', 'unknown', 'none'].includes(lower)) return '';
     return val.trim();
   }
   ```
   Apply to: `business_hours`, `founded_year`, `postal`, `address`, `booking_url`, `mission`
2. In `contact/page.tsx`, conditionally render business hours section only when `config.hours` is non-empty and not a single "N/A" entry. Already has `parseBusinessHours()` — add early return for empty/invalid.

**Verification:** Provision a tenant with "N/A" business hours, confirm contact page hides that section cleanly.

---

### Workstream 3: Team Section Polish

**Problem:** Placeholder person icons look unfinished when team members have no photos.

**Files to modify:**
- `src/app/about/page.tsx` — improve no-photo team member rendering
- `tenant-builder/scrape/scrape-enhanced.mjs` — try harder to extract team photos

**Changes:**
1. In the About page team section, when `photoUrl` is empty:
   - Render styled initials avatar (first letter of first + last name) with primary colour background instead of generic person icon
   - This looks intentional rather than broken
2. In scrape-enhanced.mjs, add a Playwright pass for team photos:
   - Look for `img` elements near team member names (within same parent container)
   - Filter by reasonable size (100x100 to 600x600)
   - This is a best-effort enhancement — many small contractor sites don't have team photos

**Verification:** Build a tenant with no team photos, confirm initials render with brand colour.

---

### Workstream 4: Hero & About Image Fallback Generation

**Problem:** When no hero/about image is scraped, fallback looks incomplete.

**Files to modify:**
- `tenant-builder/provision/provision-tenant.mjs` — add image generation step
- New utility: `tenant-builder/lib/generate-hero.mjs` — Gemini image generation for hero/about

**Changes:**
1. Create `generate-hero.mjs` that:
   - Takes: primary colour hex, company name, service type (kitchen/bathroom/general)
   - Calls Gemini `gemini-3.1-flash-image-preview` (existing `scripts/generate-image.mjs` pattern)
   - Generates a high-quality renovation-themed hero image incorporating the brand colour palette
   - Prompt template: "Professional renovation photography, {service_type} space with {colour_description} accents, wide angle, modern design, bright natural lighting, editorial quality, no text, no logos"
   - Uploads to Supabase Storage `tenant-assets/{site-id}/hero-generated.jpg`
   - Returns public URL
2. In `provision-tenant.mjs`, after image upload step:
   - Check if `heroImageUrl` is empty AND target has no hero image
   - If so, call `generate-hero.mjs` to create one
   - Same for `aboutImageUrl` — generate an about-page image if missing
3. Cost: ~$0.02 per image generation (Gemini Flash)

**Verification:** Provision a tenant with no hero image, confirm generated image appears on homepage.

---

### Workstream 5: Favicon & OG Image Generation

**Problem:** All tenants use NorBot's default favicon and have no og:image for social sharing.

**Files to modify:**
- `tenant-builder/provision/provision-tenant.mjs` — add favicon + OG provisioning
- `src/app/layout.tsx` — read favicon from admin_settings
- `scripts/onboarding/provision.mjs` — store favicon URL in branding

**Changes:**
1. During provisioning, if tenant has a logo URL:
   - Resize to 32x32 and 180x180 (using Sharp or Gemini) for favicon
   - Upload to Supabase Storage `tenant-assets/{site-id}/favicon.png` and `apple-touch-icon.png`
   - Store URLs in `branding.faviconUrl` and `branding.appleTouchIconUrl`
2. If no logo exists, generate a simple favicon from primary colour + first letter of company name
3. Generate og:image (1200x630) using Gemini with company name + tagline + primary colour
4. Store `branding.ogImageUrl` in admin_settings
5. Update `layout.tsx` metadata to read `branding.faviconUrl` and `branding.ogImageUrl`

**Verification:** Open tenant site, check browser tab shows custom favicon. Share URL on social, confirm og:image appears.

---

### Workstream 6: Page-by-Page Playwright QA Pass

**Problem:** Current QA checks homepage + mobile only. Missing verification of About, Services, Projects, Contact pages.

**Files to modify:**
- `tenant-builder/qa/live-site-audit.mjs` — expand to all pages
- New: `tenant-builder/qa/page-completeness.mjs` — per-page data verification

**Changes:**
1. Create `page-completeness.mjs` that runs after provisioning:
   - **Homepage:** Verify hero section has headline + CTA, trust metrics visible, services section populated, testimonials section visible (or hidden if <2)
   - **Services page:** Verify each service has image + description, no empty cards
   - **About page:** Verify about copy present, team section either has photos/initials or is hidden, mission visible
   - **Projects page:** Verify at least 1 portfolio item with image, or show elegant "portfolio coming soon" message
   - **Contact page:** Verify phone + email + location visible, business hours section hidden or valid, form renders
   - **Footer (all pages):** Verify logo, social links (if scraped), phone, email, copyright with correct year + name
2. Each check returns `{ page, check, passed, detail }` for the audit report
3. Integrate into orchestrate.mjs as Step 5a (between content-integrity and visual QA)

**Verification:** Run against a newly provisioned tenant, confirm all pages report pass/fail correctly.

---

### Workstream 7: Enhanced Refinement Loop with Data Fixes

**Problem:** Current refinement loop only adjusts visual QA scores. It doesn't fix data gaps found by page-completeness checks.

**Files to modify:**
- `tenant-builder/qa/refinement-loop.mjs` — add data-gap resolution
- `tenant-builder/qa/content-integrity.mjs` — add new checks for social links, business hours, favicon

**Changes:**
1. Extend the refinement loop to consume `page-completeness.mjs` results:
   - If social links are missing but exist in scraped data → update `branding.socials` in Supabase
   - If business hours show "N/A" → clear the field in Supabase
   - If hero image missing and not generated → trigger `generate-hero.mjs`
   - If service images missing → use portfolio images as fallback, or generate
   - If team photos missing → confirm initials rendering (no fix needed, just verify)
2. After data fixes, re-run `page-completeness.mjs` to confirm resolution
3. Add plateau detection: if same issues persist after 2 fix attempts, mark as REVIEW and move on
4. Add to content-integrity.mjs:
   - Check 10: **Social links** — if scraped data has socials but admin_settings doesn't, flag
   - Check 11: **Favicon** — if `branding.faviconUrl` is empty, flag
   - Check 12: **OG image** — if `branding.ogImageUrl` is empty, flag

**Verification:** Provision a tenant with known data gaps, confirm refinement loop auto-fixes them.

---

### Workstream 8: Portfolio Section Graceful Handling

**Problem:** When portfolio is sparse (1-2 items), the Projects page looks thin.

**Files to modify:**
- `src/app/projects/page.tsx` — add "more projects coming soon" state for sparse portfolios
- `tenant-builder/scrape/scrape-enhanced.mjs` — enhance portfolio extraction

**Changes:**
1. In the Projects page, when portfolio has <3 items:
   - Show the available items prominently (larger cards)
   - Add a subtle "Contact us to see more of our work" CTA linking to `/contact`
   - Don't show the filter tabs when only 1 service type exists
2. In scrape-enhanced.mjs, enhance portfolio extraction:
   - Follow "gallery" or "our work" links on the original site
   - Look for image grids/galleries on sub-pages
   - Extract up to 12 portfolio items (current limit may be too conservative)

**Verification:** Build tenant with sparse portfolio, confirm Projects page looks intentional, not empty.

---

### Workstream 9: Scrape Data Completeness Score

**Problem:** No easy way to know what the scraper captured vs missed before provisioning.

**Files to modify:**
- `tenant-builder/scrape/scrape-enhanced.mjs` — add completeness scoring
- `tenant-builder/orchestrate.mjs` — log completeness score

**Changes:**
1. After merge phase in scrape-enhanced.mjs, compute a completeness score:
   ```js
   const fields = {
     business_name: 10, phone: 10, email: 10, logo_url: 10,
     primary_color_hex: 8, testimonials_2plus: 8, services_2plus: 8,
     portfolio_1plus: 6, about_copy: 6, social_any: 5,
     hero_image_url: 5, about_image_url: 4, team_members: 4,
     mission: 3, business_hours_valid: 3,
   };
   // Score 0-100 based on what was captured
   ```
2. Log as `[PROGRESS] { stage: "scrape", completeness: 78, missing: ["social_any", "hero_image_url"] }`
3. Use completeness score to decide which Workstream 4/5 generation steps to trigger

**Verification:** Run scrape, confirm score reflects actual data quality.

---

### Workstream 10: Existing Test Updates

**Files to modify:**
- `tenant-builder/tests/unit/` — update existing tests for new fields
- `tenant-builder/tests/integration/` — add tests for social links, favicon, completeness score

**Changes:**
1. Update `provision-quality-gates.test.mjs` to test social link mapping with new platforms
2. Update `scraper-enhancements.test.mjs` to test social link Playwright extraction
3. Add `page-completeness.test.mjs` unit tests (mocked Playwright responses)
4. Add `generate-hero.test.mjs` unit tests (mocked Gemini responses)
5. Update `audit-report-enhanced.test.mjs` for new checks (social, favicon, OG)
6. Update integration tests to verify end-to-end social link flow

---

## Implementation Order

| Phase | Workstreams | Dependencies | Effort |
|-------|------------|-------------|--------|
| **Phase A** | WS2 (hours cleanup), WS3 (team initials), WS8 (portfolio) | None — app-side only | Small |
| **Phase B** | WS1 (social links), WS9 (completeness score) | None — scrape-side only | Medium |
| **Phase C** | WS4 (hero/about generation), WS5 (favicon/OG) | WS9 for triggering | Medium |
| **Phase D** | WS6 (page-by-page QA), WS7 (enhanced refinement) | WS1-5 complete | Medium |
| **Phase E** | WS10 (tests) | All workstreams | Small |

**Estimated API cost per tenant build after changes:** ~$0.15 (current ~$0.07 + ~$0.04 image gen + ~$0.04 extra QA passes)

---

## Critical Files Reference

| File | Purpose | Modifications |
|------|---------|--------------|
| `scripts/onboarding/provision.mjs` | Maps scraped → Supabase | WS1, WS2, WS5 |
| `scripts/onboarding/scrape.mjs` | Firecrawl extraction schema | WS1 |
| `tenant-builder/scrape/scrape-enhanced.mjs` | 3-phase scrape orchestrator | WS1, WS8, WS9 |
| `tenant-builder/provision/provision-tenant.mjs` | Per-target provisioning | WS4, WS5 |
| `tenant-builder/qa/content-integrity.mjs` | 9-check suite (→12 checks) | WS7 |
| `tenant-builder/qa/refinement-loop.mjs` | Fix-and-recheck cycle | WS7 |
| `tenant-builder/qa/live-site-audit.mjs` | 8 Playwright checks | WS6 |
| `tenant-builder/orchestrate.mjs` | Master pipeline | WS6, WS9 |
| `src/app/about/page.tsx` | About page | WS3 |
| `src/app/projects/page.tsx` | Projects page | WS8 |
| `src/app/contact/page.tsx` | Contact page | WS2 |
| `src/app/layout.tsx` | Root layout (favicon, OG) | WS5 |
| `src/components/footer.tsx` | Footer (social links) | Already works — no changes needed |
| `src/lib/branding.ts` | Server branding fetch | WS5 (add favicon, OG fields) |

---

## Verification Plan

1. **Unit tests:** Run `cd tenant-builder && npm run test:unit` — all 215+ tests pass
2. **Integration test:** Run `npm run test:integration` against Red White Reno
3. **Manual build:** `node orchestrate.mjs --target-id 22 --skip-outreach` (Red White Reno)
4. **Playwright audit:** `node qa/run-full-audit.mjs --url https://redwhite.norbotsystems.com --site-id red-white-reno --scraped-data ./results/.../scraped.json`
5. **Visual comparison:** Open tenant site in browser, check every page:
   - Homepage: hero, trust metrics, services, how-it-works, testimonials, CTA
   - Services: all cards have images + descriptions
   - About: team initials (or photos), about copy, mission
   - Projects: portfolio items or graceful sparse state
   - Contact: no "N/A", social links in footer, business hours hidden or valid
   - Footer: logo, socials, phone, email, copyright
6. **Compare with original:** Open original site side-by-side, verify matching social links, phone, email, testimonials

---

## What This Does NOT Change

- **No changes to the adaptive copy system** — already production-grade
- **No changes to the entitlements system** — working correctly
- **No changes to the Design Studio / Visualizer** — already polished
- **No changes to the admin dashboard** — already functional
- **No changes to the outreach pipeline** — already integrated
- **No structural rewrite** — incremental improvements to existing modules

---

**TLDR:** This plan closes the "last 10%" gap in the tenant builder by enhancing social link scraping, sanitizing N/A values, generating hero/about/favicon images when missing, adding styled initials for team photos, improving sparse portfolio handling, and adding a comprehensive page-by-page Playwright QA pass with data-gap auto-resolution. 10 workstreams across 5 phases, building on existing infrastructure. No rewrites, just targeted refinements.

**Complexity:** MEDIUM — cross-cutting changes across scraping, provisioning, QA, and a few app components, but each workstream is self-contained and testable independently. The riskiest parts are the Gemini image generation (new capability) and the enhanced refinement loop (more states to handle).
