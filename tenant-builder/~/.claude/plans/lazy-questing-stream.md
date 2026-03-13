# Plan: McCarty Squared Inc — Full Launch Audit & Fix

## Context

McCarty Squared Inc (mccarty-squared-inc.norbotsystems.com) has been through POLISH fixes (str() array bug, service image generation, hero gradient, storage bucket fix). A comprehensive 3-agent audit has now been completed across all 5 pages, all Supabase data, and all 6 custom section files. The site is ~95% launch-ready with a few remaining gaps to close.

**Key finding:** All copy is accurately scraped from their real website (mccartysquared.ca). The service descriptions, hero headline, about copy, testimonials, and process steps all match the original site content. No copy changes needed — it's their words.

---

## Issues Found (Priority Order)

### P0 — Must Fix (Launch Blockers)

**1. Projects page is empty**
- `/projects` renders only breadcrumb-hero + CTA with nothing between them
- `company_profile.portfolio` is an empty array (scraper found 0 portfolio items)
- `page_layouts.projects` has no content section — just `misc:breadcrumb-hero` + `cta:full-width-primary`
- **Fix:** Add a projects page layout that reuses the services section + testimonials as content. The service images (Gemini-generated) give the page visual weight, and testimonials provide social proof. This is better than an empty page.
- **Files:** Update `page_layouts` in Supabase `admin_settings` for the `projects` page

**2. OG image missing (social sharing broken)**
- `branding.ogImageUrl` is empty string
- When Ferdie shares the demo link, there's no preview image in email/Slack/iMessage
- **Fix:** Generate an OG image via Gemini (function exists in `generate-images.mjs`) and update `branding.ogImageUrl` in Supabase
- The storage bucket fix from the previous session means the OG generation will now work correctly

### P1 — Should Fix (Quality Gaps)

**3. Services imageUrl field inconsistency**
- Services 2-4 (Bathroom, Basement, Room Extensions) have empty `imageUrl` but populated `image_urls[0]`
- Some platform components may read `imageUrl` (legacy field) before `image_urls[0]`
- **Fix:** Back-fill `imageUrl` from `image_urls[0]` for services 2-4 in Supabase
- **Impact:** Prevents any component from showing gradient fallback instead of the Gemini-generated image

**4. Hero image on inner pages**
- The `misc:breadcrumb-hero` section on /about, /services, /projects, /contact uses the hero image as background
- Need to verify this image loads correctly on all inner pages (it should, since heroImageUrl is set)
- **Action:** Visual verification after deploy

### P2 — Nice to Have (Polish)

**5. Contact page has no form or map**
- `/contact` shows breadcrumb-hero + CTA only — no contact form, no map, no hours
- Contact info IS in the footer on every page
- **Fix (optional):** Add `contact:split-form` section to the contact page layout. This standard section renders a contact form + map + hours from business_info.
- **Risk:** Low — but adds form functionality the contractor may not be ready for

**6. Visualizer teaser uses platform demo images**
- Before/after slider shows generic kitchen transformations (`/images/teaser/before-kitchen.jpg` etc.)
- This is by design — it demos the AI Visualizer feature using polished example images
- Since McCarty has no portfolio photos (0 scraped), these defaults are the best option
- **Action:** No change needed — these are feature demo images, not company work samples

---

## Execution Plan

### Step 1: Generate OG image + fix service imageUrl fields (Supabase updates)
```
- Run generateOgImage() for mccarty-squared-inc → upload to Supabase Storage
- Update branding.ogImageUrl in admin_settings
- Back-fill services[1-3].imageUrl from image_urls[0] in admin_settings
```
**Files:** One-off script using existing `generateOgImage()` from `tenant-builder/lib/generate-images.mjs`

### Step 2: Fix Projects page layout (Supabase update)
```
- Update page_layouts.projects in admin_settings to include content sections:
  misc:breadcrumb-hero
  custom:mccarty-squared-inc-services    ← reuse services section
  custom:mccarty-squared-inc-testimonials ← social proof
  cta:full-width-primary
```
**Files:** Supabase PATCH to admin_settings (page_layouts key)

### Step 3: Optionally add contact form section (Supabase update)
```
- Update page_layouts.contact to include contact:split-form:
  misc:breadcrumb-hero
  contact:split-form                      ← contact form + map + hours
  cta:full-width-primary
```
**Files:** Supabase PATCH to admin_settings (page_layouts key)

### Step 4: Verify all pages
```
- WebFetch all 5 pages and verify:
  - All images loading (no gradient fallbacks on any page)
  - All CTAs point to /visualizer
  - Projects page now has content
  - OG image URL returns 200
  - Contact page shows form (if Step 3 applied)
```

### Step 5: Run QA audit
```
node tenant-builder/orchestrate.mjs --audit-only \
  --site-id mccarty-squared-inc \
  --url https://mccarty-squared-inc.norbotsystems.com \
  --skip-git
```

---

## No Code Deployments Needed

All fixes are Supabase data updates (page_layouts, branding, company_profile). No TypeScript changes, no git push, no Vercel build. The site will reflect changes immediately on next page load since admin_settings are fetched at runtime.

The only exception is the OG image generation which uploads to Supabase Storage — this also doesn't require a code deploy.

---

## Verification Checklist

- [ ] OG image URL returns HTTP 200
- [ ] Social preview shows image when sharing the URL (test via https://opengraph.xyz or similar)
- [ ] All 4 services have both `imageUrl` AND `image_urls[0]` populated
- [ ] `/projects` page shows services section + testimonials (not empty)
- [ ] `/contact` page shows contact form (if Step 3 applied)
- [ ] All 5 pages load without broken images
- [ ] All CTAs on all pages point to `/visualizer`
- [ ] QA audit returns READY verdict

---

## What's Already Working (No Action Needed)

| Area | Status | Details |
|------|--------|---------|
| Homepage | READY | 9 sections, all content rendering |
| About page | READY | Real about copy, service images, trust badges |
| Services page | READY | All 4 services with Gemini images |
| Navigation | READY | All pages linked, mobile responsive |
| Footer | READY | Phone, email, address, 5 social links |
| CTAs | READY | All 18+ CTAs point to /visualizer |
| Custom sections (6) | READY | Production-quality code, no issues |
| Copy accuracy | READY | All text scraped from real website |
| Testimonials | READY | 3 real reviews with names |
| Process steps | READY | 4 real steps from their site |
| Trust badges | READY | RENOMARK + LHBA |
| Branding | READY | Logo, favicon, colours, fonts |

---

**TLDR:** Three fixes to reach LAUNCH: (1) generate OG image for social sharing, (2) populate the empty Projects page by reusing services + testimonials sections, (3) back-fill missing service imageUrl fields. All are Supabase data updates — no code deploy needed. Copy is accurate (scraped from their real site). Optionally add a contact form to the Contact page.
**Complexity:** LOW — all fixes are Supabase admin_settings patches + one Gemini image generation. No TypeScript, no git, no Vercel build.
