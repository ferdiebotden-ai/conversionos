# Tenant Builder — Improvement Log

> **Purpose:** Systemic issues discovered during manual tenant fixes. Each entry documents a pattern that affects multiple tenants and should be addressed in the pipeline to reduce manual intervention.
>
> **Workflow:** Ferdie manually reviews tenants → Claude fixes them → Claude logs root causes here → Ferdie periodically opens this directory and points Claude at this log to implement the highest-impact, lowest-risk fixes.
>
> **Rules:**
> - Only log issues that are SYSTEMIC (affect multiple tenants, not one-off data problems)
> - Include the root cause, not just the symptom
> - Suggest a fix with a risk assessment (LOW / MEDIUM / HIGH)
> - Mark items IMPLEMENTED when they've been applied to the pipeline
> - Never implement directly during a fix session — log only, implement separately

---

## Open Issues

### 1. Services not extracted from navigation dropdowns
**Found:** 2026-03-18 (Sunnyside Kitchens, A&A Home Renovations)
**Symptom:** Services array empty or only 2 items, despite the original website listing 13-14 services in their nav dropdown menu.
**Root cause:** Firecrawl's extract endpoint doesn't reliably parse nav dropdown `<li>` items as services. The scraper relies on Firecrawl finding service content in page body, but many small contractor sites list services ONLY in the nav dropdown — the services page itself may just be a placeholder or redirect.
**Impact:** HIGH — affects every tenant whose site uses dropdowns for services (majority)
**Suggested fix:** After Firecrawl scrape, use Playwright to extract all `<a>` links under the Services nav item. Parse link text as service names, use the link URLs to scrape descriptions from those pages. Fall back to Firecrawl extract if Playwright finds nothing.
**Risk:** LOW — additive only, doesn't change existing scrape flow
**Tenants affected:** sunny-side-kitchens (had 0/13 services), a-and-a-home-renovations (had 4/14 services)

### 2. Portfolio scrapes logos and business cards instead of project photos
**Found:** 2026-03-18 (Sunnyside Kitchens)
**Symptom:** "Our Work" section displayed the contractor's logo and their web designer's (LinkNow) logo instead of actual renovation photos.
**Root cause:** The deep image scrape (Phase 2.3) grabs ALL images from the site without filtering. Logos, badge images, and web designer branding get mixed into the portfolio array. No image classification step distinguishes project photos from branding assets.
**Impact:** HIGH — every tenant with fewer than 5 real portfolio images gets logo/badge contamination
**Suggested fix:** Use Gemini CLI (free) to classify scraped images: `is_project_photo`, `is_logo`, `is_badge`, `is_icon`. Filter portfolio to only `is_project_photo`. Already have `lib/gemini-cli.mjs` — just needs a classification prompt.
**Risk:** LOW — Gemini CLI is $0 marginal cost, additive filter step
**Tenants affected:** sunny-side-kitchens (2 logos in portfolio), likely 10+ others

### 3. Gallery pages not discovered or deeply scraped
**Found:** 2026-03-18 (A&A Home Renovations)
**Symptom:** A&A has 59 gallery photos on their `/gallery.html` page, but only 4 generic portfolio items were provisioned.
**Root cause:** Phase 1.5 (Firecrawl `map()`) should discover gallery pages, but the portfolio extraction doesn't prioritize gallery URLs over other pages. When gallery images are loaded via JavaScript lightbox widgets, Firecrawl markdown scraping misses them. The deep image scrape also doesn't specifically target gallery pages with scroll+wait actions.
**Impact:** HIGH — contractors with dedicated gallery pages (common) get poor portfolio representation
**Suggested fix:** After `map()` discovers a gallery URL, use Playwright (not Firecrawl) to scrape it — `page.$$eval('img')` gets all image srcs including those in lightbox links. Deduplicate and take the top 8-12 largest images (by file size or dimensions) for the portfolio.
**Risk:** LOW — additive Playwright step, doesn't change existing flow
**Tenants affected:** a-and-a-home-renovations (had 4/59 gallery images), likely many others

### 4. Hero images often generic/poor quality
**Found:** 2026-03-18 (A&A Home Renovations)
**Symptom:** Hero showed construction materials (wood planks with a paint bottle) instead of a beautiful completed project.
**Root cause:** The CSS hero extraction (Phase 2.4) grabs the first `background-image` from the hero section. Many contractor sites use generic stock photos or construction-themed images as their hero background, not their best work. The pipeline doesn't evaluate hero image quality or try alternatives.
**Impact:** MEDIUM — the hero is the first thing visitors see, but some sites have decent hero images already
**Suggested fix:** After extracting the hero, use Gemini CLI to score it: "Does this image show a completed renovation project? Rate 1-5." If score < 3, try the first image from the homepage slider, then the best gallery image (largest file size). Already have Gemini CLI available.
**Risk:** LOW — additive quality check, falls back to current behavior
**Tenants affected:** a-and-a-home-renovations, likely 5-10 others

### 5. Header logo max-width too small for wide logos
**Found:** 2026-03-18 (Sunnyside Kitchens)
**Symptom:** Logo was illegible in the header — too small to read the text.
**Root cause:** Platform-wide CSS constraint: `max-w-[120px] md:max-w-[200px]` in `header.tsx`. Contractor logos that include the business name and phone number in a wide format get shrunk to unreadable sizes.
**Impact:** MEDIUM — only affects tenants with wide/detailed logos
**Fix applied:** Increased to `max-w-[160px] md:max-w-[260px]`, `h-11 md:h-12`. Deployed 2026-03-18.
**Status:** IMPLEMENTED

### 6. Image cache busting needed when replacing Supabase storage files
**Found:** 2026-03-18 (A&A Home Renovations)
**Symptom:** After uploading a new hero image to the same Supabase storage path (`hero.jpg`), the old image continued to display due to Vercel's `next/image` CDN cache.
**Root cause:** Supabase Storage allows upsert to the same key, but Vercel's image optimization caches the original response. The cache TTL can be hours.
**Impact:** LOW — only matters during manual fixes, not batch builds (which use fresh filenames)
**Suggested fix:** When replacing an existing image during a fix, upload to a versioned filename (e.g., `hero-v2.jpg`) and update the URL in admin_settings. OR add a `?v={timestamp}` query param to the image URL.
**Risk:** LOW — naming convention change only

### 7. Service images shared/duplicated across services
**Found:** 2026-03-18 (A&A Home Renovations)
**Symptom:** Multiple services used the same `portfolio/0.jpg` image. Kitchen and Basement both showed the same photo.
**Root cause:** The scraper assigns `image_urls[0]` from the portfolio array as the service image. When the scraper only finds a few images, they get reused across services. The service card images from the original site (`home01.jpg` through `home09.jpg`) aren't discovered because they're specific to sub-pages the scraper doesn't visit deeply enough.
**Impact:** MEDIUM — services section looks repetitive and unprofessional
**Suggested fix:** After discovering service names, check if the original site has individual service pages (from nav links). Scrape the hero/lead image from each service page. Fall back to portfolio images only if no service-specific image exists.
**Risk:** LOW — additional scrape step per service page
**Tenants affected:** a-and-a-home-renovations, likely widespread

---

## Implemented Fixes

| Date | Issue | Fix | Impact |
|------|-------|-----|--------|
| 2026-03-18 | #5 Logo max-width | Increased header.tsx constraints | All tenants with wide logos |
| 2026-03-19 | #0 Deep image scrape reliability | Playwright fallback for Firecrawl map() + Phase 2.3 image extraction | All builds (was failing 95%) |
| 2026-03-19 | #1 Nav dropdown services | Phase 2.1 Playwright nav link extraction | Pioneer Craftsmen: 1→8 services |
| 2026-03-19 | #2 Portfolio classification | URL heuristic + Gemini batch filter (logos/badges removed) | All builds |
| 2026-03-19 | #4/#10 Hero quality gate | URL heuristic + Gemini evaluation, swap if logo/generic | All builds |
| 2026-03-19 | #8 Service image mapping | Keyword match + round-robin from portfolio/discovered images | Pioneer Craftsmen: 0/8→8/8 |
| 2026-03-19 | #9 About image targeted scrape | Phase 2.6 Playwright about page image extraction | Pioneer Craftsmen: empty→populated |

**New files:** `lib/service-image-mapper.mjs`, `lib/image-classifier.mjs`
**Modified:** `scrape/scrape-enhanced.mjs` (6 new phases/enhancements), `orchestrate.mjs` (timeout 5→10 min)

---

## Remaining Open Issues

1. **#3 Gallery page deep scrape** — Lightbox/JS galleries still not fully handled (Playwright fallback helps but doesn't trigger lightbox clicks)
2. **#6 Image cache busting** — Still affects manual fixes (use versioned filenames)
3. **#7 Service-specific sub-page images** — Partially addressed by service-image-mapper (keyword match from discovered images), but individual service page scraping not yet implemented
4. **#12 Small WebP threshold** — 5KB minimum still too aggressive for some compressed thumbnails
