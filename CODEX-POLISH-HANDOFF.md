# Codex Handoff: Go Hard Corporation + BL Renovations — Full Visual Polish

## Your Mission

You are polishing two contractor websites to production quality. Each site must look like the contractor's OWN premium website — not a template. Match their original site's brand, layout, and photos as closely as possible, then ENHANCE with premium design, real images, and our AI visualizer integration.

## The Two Sites

### Go Hard Corporation
- **Original site:** https://www.gohardcorp.com/ (Squarespace, dark/earthy aesthetic)
- **Live demo:** https://go-hard-corporation.norbotsystems.com
- **Local dev:** http://localhost:3001/?__site_id=go-hard-corporation
- **Brand colour:** #5A5744 (earthy olive)
- **Location:** Cambridge, ON | Phone: 519-212-1296 | Email: chris@gohardcorp.com

### BL Renovations
- **Original site:** https://www.blrenos.ca/ (dark/hexagonal aesthetic)
- **Live demo:** https://bl-renovations.norbotsystems.com
- **Local dev:** http://localhost:3001/?__site_id=bl-renovations
- **Brand colour:** #0000EE (needs updating to match their actual brand — check their site)
- **Location:** Owen Sound, ON | Phone: 519.379.8995 | Email: info@blrenos.ca

## Codebase Location

Custom sections for each tenant live here:
```
src/sections/custom/go-hard-corporation/
  hero-section.tsx
  services-section.tsx
  about-section.tsx
  project-gallery.tsx
  testimonials.tsx
  why-choose-us.tsx
  footer.tsx
  index.ts            # Section registry (auto-generated, edit if adding/removing sections)

src/sections/custom/bl-renovations/
  hero-section.tsx
  services-section.tsx
  about-section.tsx
  project-gallery.tsx
  our-process.tsx
  why-choose-us.tsx
  footer.tsx
  index.ts
```

Each section receives `{ branding, config, tokens, className }` as props (type: `SectionBaseProps` from `@/lib/section-types`). The `config` object contains all company data from Supabase (services, testimonials, portfolio, about copy, images, etc.).

## Available Images (Already in Supabase Storage)

These are REAL photos scraped from their original websites. Use them extensively.

**Go Hard Corporation** — Base URL: `https://ktpfyangnmpwufghgasx.supabase.co/storage/v1/object/public/tenant-assets/go-hard-corporation/`
- `hero.webp`, `about.webp`
- `services/kitchen-renovation.webp`, `services/bathroom-renovation.webp`, `services/home-additions.webp`, `services/basement-renovations.webp`, `services/decks-fences-outdoor-living.webp`, `services/design-and-build.webp`, `services/interior-design.webp`, `services/exterior-renovations.jpg`
- `portfolio/0.webp` through `portfolio/19.webp` (20+ project photos!)
- `hero/before-kitchen.png`, `hero/after-modern.png`, `hero/after-farmhouse.png`, `hero/after-industrial.png`

**BL Renovations** — Base URL: `https://ktpfyangnmpwufghgasx.supabase.co/storage/v1/object/public/tenant-assets/bl-renovations/`
- `hero.webp`, `about.jpg`
- `services/kitchen-remodels.webp`, `services/bathroom-renovations.webp`, `services/basement-finishing.webp`, `services/flooring-tile-installations.webp`, `services/fixture-installations.jpg`
- `portfolio/0.jpg` through `portfolio/11.jpg`, `portfolio/photo_0.jpg` through `portfolio/photo_4.jpg` (15+ project photos!)
- `hero/before-kitchen.png`, `hero/after-modern.png`, `hero/after-farmhouse.png`, `hero/after-industrial.png`

## What Needs Fixing

### 1. PHOTOS EVERYWHERE
The sections currently lack images. Every service card needs its real photo. The gallery/portfolio section needs to display the 15-20+ project photos available in storage. The about section needs the real about image. No gradient placeholders where we have real images.

### 2. GALLERY / PORTFOLIO SECTION
Both sites need a proper gallery section showing their real project photos. Go Hard has 20+ photos, BL has 15+. Build a premium masonry or bento grid layout. Each gallery item should have the project photo with a subtle overlay and title.

Populate the `portfolio` array in Supabase `company_profile` (key: `company_profile`, table: `admin_settings`) with the available images. Example portfolio item:
```json
{ "title": "Kitchen Renovation", "imageUrl": "https://ktpfyangnmpwufghgasx.supabase.co/storage/v1/object/public/tenant-assets/go-hard-corporation/portfolio/0.webp", "category": "Kitchen" }
```

### 3. HEADER NAV — ACTIVE STATE HIGHLIGHTING
The scroll-spy navigation in the shared header (`src/components/header.tsx`) needs to properly highlight which section is currently visible. On inner pages (`/services`, `/about`, `/projects`, `/contact`), the matching nav link should be highlighted.

### 4. MATCH ORIGINAL SITE LAYOUTS
Visit both original sites. Study their:
- Section order and layout patterns
- Colour palette (exact hex values)
- Typography choices
- Photo placement and sizing
- Overall feel and tone

Then rebuild the custom sections to match that aesthetic — but BETTER. Premium design with motion, proper spacing, and our visualizer integration.

### 5. HERO SECTION
The homepage uses `hero:visualizer-teardown` (the shared before/after kitchen scrubber) — this stays. But the hero background image should be their real hero image, not just the logo. Go Hard's hero currently shows only the logo — it needs their actual hero photo as the background.

### 6. TESTIMONIALS (Go Hard has 7, BL has 0)
Go Hard Corporation has 7 real Google reviews in their data. Display them properly. NOTE: The first testimonial (Kia Gaines) is SPAM — remove it from the data and don't display it.

BL Renovations has 0 testimonials scraped. Either scrape fresh ones from their Google listing, or omit the testimonials section for BL and replace with an extended gallery or trust section.

### 7. SERVICE CARDS WITH REAL PHOTOS
Each service card must show the real service photo from Supabase storage. No gradient placeholders. The photos are already there — just wire them up.

## Supabase Connection

```
URL: https://ktpfyangnmpwufghgasx.supabase.co
Service Role Key: (in .env.local as SUPABASE_SERVICE_ROLE_KEY)
Table: admin_settings
Filter: site_id = 'go-hard-corporation' or 'bl-renovations'
Keys: company_profile (services, testimonials, portfolio, aboutCopy, etc.), branding (colours, socials), page_layouts
```

To update data (e.g., populate portfolio), use the Supabase REST API:
```bash
curl -X PATCH "${SUPABASE_URL}/rest/v1/admin_settings?site_id=eq.go-hard-corporation&key=eq.company_profile" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"value": <updated company_profile JSON>}'
```

## Motion Components Available

Import from `@/components/motion`:
- `FadeInUp` — fade + slide up on scroll
- `FadeIn` — simple fade on scroll
- `StaggerContainer` + `StaggerItem` — staggered children animations
- `ScaleIn` — scale up on scroll
- `SlideInFromSide` — slide from left or right
- `ParallaxSection` — parallax scroll effect

## Design Rules

- Use `bg-primary` / `text-primary-foreground` for CTAs (reads from tenant branding)
- `object-cover object-center` on all `<Image>` components
- 44px minimum touch targets on mobile
- No pure black `#000000` — use `zinc-950` or dark brand tint
- Canadian spelling: colour, centre, favourite
- All CTAs route to `/visualizer`
- No fabricated statistics, fake team members, or made-up certifications
- "Built by NorBot Systems" footer attribution is intentional — leave it

## How to Test

```bash
# Dev server should already be running on port 3001
# If not:
cd ~/Norbot-Systems/products/conversionos && PORT=3001 npx next dev --port 3001

# View Go Hard:
open http://localhost:3001/?__site_id=go-hard-corporation

# View BL Renovations:
open http://localhost:3001/?__site_id=bl-renovations

# View specific pages:
open "http://localhost:3001/services?__site_id=go-hard-corporation"
open "http://localhost:3001/about?__site_id=go-hard-corporation"
open "http://localhost:3001/projects?__site_id=go-hard-corporation"
```

## Deploy After Changes

```bash
cd ~/Norbot-Systems/products/conversionos
bash scripts/sync-deploy.sh    # Syncs to deploy repo
cd ~/norbot-ops/products/demo
git add -A && git commit -m "polish: Go Hard + BL Renovations visual overhaul"
git push origin main           # Triggers Vercel auto-deploy
```

## Quality Bar

**"Would Ferdie be proud to show this to the contractor on a sales call tomorrow?"**

Each site must:
- Look like the contractor's OWN website (brand match)
- Be photo-rich (use every available image)
- Have smooth scroll animations
- Work perfectly on mobile (375px), tablet (768px), desktop (1440px)
- Have zero console errors
- Route all CTAs to `/visualizer`
- Display ONLY real, verified content (no fabricated data)
