# Plan: Fix Brouwer Home Renovations — Images & Portfolio

## Context

The Brouwer Home Renovations build completed on 2026-03-04 but has three critical visual failures:

1. **Wrong hero image** — the scraper confused the logo for the hero (both resolved to the same CDN path: `Brouwer-Home-Renovations-LogoBlack-68eca2be-1920w.jpg`). The actual homepage hero background is a real site photo (`shutterstock_1995066977-1920w.jpg` — outdoor deck). Currently the hero.jpg in Storage is just the logo image, so the site hero looks blank/broken.

2. **Empty portfolio** — the gallery lives under Resources → Gallery (`/gallery`), which the Firecrawl scraper missed. There are **18 real project photos** available on their gallery page. Portfolio is 0 items.

3. **OG image missing** — `branding.ogImageUrl` is an empty string, causing the `no_og_image_meta` content integrity violation.

The `aboutImageUrl` is also set to the wrong image (the logo-as-hero). It needs to be updated to a real project photo.

**Intended outcome:** Live site at `brouwer-home-renovations.norbotsystems.com` has a proper hero, 18 portfolio items on the Projects page, and OG meta is set.

---

## Image Source URLs (from brouwerhomerenovations.ca)

**Hero image** (outdoor deck scene, their homepage background):
```
https://lirp.cdn-website.com/e540a56a/dms3rep/multi/opt/shutterstock_1995066977-1920w.jpg
```

**18 gallery images** (from `/gallery` page, `data-src` attributes):
| # | URL slug | Room Type | Title |
|---|----------|-----------|-------|
| 0 | `IMG_9221+%281%29-1920w.jpg` | bathroom | Bathroom Renovation — Vanity & Mirror |
| 1 | `IMG_9255-1920w.jpg` | kitchen | Kitchen Renovation — Full Remodel |
| 2 | `66990871066__6667390A-54D5-48EA-9030-E5A9A7F2BBC8-1920w.jpg` | kitchen | Kitchen Tile Work — Detail |
| 3 | `IMG_9239-1920w.jpg` | basement | Basement Living Space |
| 4 | `IMG_6131-1920w.jpg` | kitchen | Kitchen Renovation — Wood Cabinets |
| 5 | `FullSizeRender+%281%29-1920w.jpg` | bathroom | Bathroom — Glass Shower Enclosure |
| 6 | `FullSizeRender-1920w.jpg` | bathroom | Bathroom — Grey Vanity Renovation |
| 7 | `Patel+3-1920w.jpg` | general | Flooring Installation |
| 8 | `Complete+%282%29-1920w.jpg` | general | Built-In Shelving & Storage |
| 9 | `IMG-7538-1920w.jpg` | general | Accent Wall — Stone & Brick |
| 10 | `IMG_6370-1920w.jpg` | bathroom | Bathroom — Modern Mirror & Lighting |
| 11 | `IMG-7537-1920w.jpg` | outdoor | Exterior Renovation — Modern Siding |
| 12 | `IMG-7535-1920w.jpg` | outdoor | Outdoor Living Space — Deck & Patio |
| 13 | `1-1920w.jpg` | general | Stone Fireplace Feature Wall |
| 14 | `6-1920w.jpg` | basement | Basement Finishing — Open Concept |
| 15 | `unnamed-1920w.jpg` | kitchen | Kitchen — Range Hood & Cabinetry |
| 16 | `Complete-1920w.jpg` | basement | Basement Renovation — Complete |
| 17 | `IMG_9247+%281%29-1920w.jpg` | bathroom | Bathroom — Double Vanity Renovation |

Base URL: `https://lirp.cdn-website.com/e540a56a/dms3rep/multi/opt/`

**About image**: Use portfolio index 1 (`IMG_9255` — kitchen) as a dedicated `about.jpg`.

---

## Implementation Steps

### Step 1 — Create gallery-data JSON

Create `tenant-builder/gallery-data/brouwer-home-renovations.json` with the 18 gallery entries in the same format as `rwr.json` (array of `{url, roomType, title}`).

### Step 2 — Run upgrade-tenant-gallery.mjs

```bash
cd ~/norbot-ops/products/demo
node tenant-builder/upgrade-tenant-gallery.mjs \
  --site-id brouwer-home-renovations \
  --images tenant-builder/gallery-data/brouwer-home-renovations.json
```

Uploads 18 images to `tenant-assets/brouwer-home-renovations/portfolio/0.jpg` through `portfolio/17.jpg` and updates `company_profile.portfolio`.

### Step 3 — Create fix-brouwer-images.mjs

Create `tenant-builder/fix-brouwer-images.mjs` following the pattern of `fix-bl-portfolio-images.mjs`. It should:

1. Download `shutterstock_1995066977-1920w.jpg` from lirp CDN
2. Upload to Storage as `brouwer-home-renovations/hero.jpg` with `upsert: true` (overwrite the logo-as-hero)
3. Download `IMG_9255-1920w.jpg` (kitchen photo)
4. Upload to Storage as `brouwer-home-renovations/about.jpg`
5. PATCH `company_profile` row:
   - `heroImageUrl` → `https://ktpfyangnmpwufghgasx.supabase.co/storage/v1/object/public/tenant-assets/brouwer-home-renovations/hero.jpg`
   - `aboutImageUrl` → `https://ktpfyangnmpwufghgasx.supabase.co/storage/v1/object/public/tenant-assets/brouwer-home-renovations/about.jpg`
6. PATCH `branding` row:
   - `ogImageUrl` → same hero URL

**Key pattern** (from `fix-bl-portfolio-images.mjs`):
- `createClient` from `@supabase/supabase-js`
- `loadEnv()` from `./lib/env-loader.mjs`
- Supabase Storage `upload` with `upsert: true, contentType`
- Read profile → mutate in-memory → `update` via Supabase client

### Step 4 — Run fix-brouwer-images.mjs

```bash
node tenant-builder/fix-brouwer-images.mjs
```

### Step 5 — Verify

```bash
node tenant-builder/orchestrate.mjs \
  --audit-only \
  --site-id brouwer-home-renovations \
  --url https://brouwer-home-renovations.norbotsystems.com \
  --skip-git
```

Expected results:
- `page_completeness.portfolio_items` → passes (18 items)
- `content_integrity.og_image` → passes
- Visual QA scores improve significantly (was REVIEW, target READY)
- Homepage shows real project photos instead of blank space

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `tenant-builder/gallery-data/brouwer-home-renovations.json` | CREATE — 18 gallery image entries |
| `tenant-builder/fix-brouwer-images.mjs` | CREATE — hero/about/OG image fix script |

## Files Referenced (read-only)

| File | Purpose |
|------|---------|
| `tenant-builder/upgrade-tenant-gallery.mjs` | Portfolio upload script (existing, run as-is) |
| `tenant-builder/fix-bl-portfolio-images.mjs` | Pattern reference for new fix script |
| `tenant-builder/lib/env-loader.mjs` | Env loading utility to reuse |
| `tenant-builder/lib/supabase-client.mjs` | Supabase client/upload utility to reuse |

---

## Verification

After running, visit:
- `https://brouwer-home-renovations.norbotsystems.com/` — hero should show outdoor deck, not black bar
- `https://brouwer-home-renovations.norbotsystems.com/projects` — should show 18 portfolio cards
- View page source → check `<meta property="og:image">` exists

---

**TLDR:** The Brouwer scraper made two mistakes — used the logo as the hero image, and missed the gallery hidden under Resources > Gallery (18 photos). Fix is: create gallery JSON, run upgrade script (portfolio), create fix script (hero/about/OG). Two new files, two script runs, one audit verify.

**Complexity:** LOW/MEDIUM — same pattern as BL Renovations fix (`fix-bl-portfolio-images.mjs`). No code changes to the platform itself, only data fixes and a one-off script.
