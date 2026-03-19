# Plan: Dynamic Navigation + Gallery Page + Service Card Polish

## Context

After the Session 38 scraping fixes (which solved the 95% image failure rate), the first live build (House Renovations) exposed **rendering-level issues**:

1. **Missing service card images** — Bathroom Renovation card has no photo, same-size card looks incomplete
2. **Before/after transformation mismatch** — The visualizer teardown hero shows before/after photos that aren't from the same room. Looks broken, not impressive.
3. **No Gallery page** — Most renovation contractors have galleries. We scrape 50-200 images but have no dedicated gallery page to showcase them.
4. **Hardcoded navigation** — `header.tsx` always shows Home/Services/Projects/About/Contact regardless of whether we have content for each page.

**User directive:** Only affect new builds. Don't break existing deployed tenants. Backward compatible changes only.

---

## Architecture: How It Works Today

- **Nav** is hardcoded in `src/components/header.tsx` — always Home, Services, Projects, About, Contact
- **Page layouts** are data-driven from `admin_settings.page_layouts` — which sections render on each page
- **`gallery:masonry-grid`** section exists and works — it renders `config.portfolio` images
- **Provisioner** already removes gallery sections if portfolio is empty
- **No `/gallery` route** exists — gallery images only appear inside `/projects`
- **Hero `visualizer-teardown`** is default for all tenants — shows before/after animation with mismatched photos
- **Service cards** (`services:grid-3-cards`) render text-only when `imageUrl` is empty — looks incomplete

**Backward compatibility approach:** Changes to platform code (`src/`) use a `nav_config` key in `admin_settings`. Existing tenants don't have this key → fall back to current hardcoded nav. Only new builds set it.

---

## Change 1: Dynamic Navigation

**Files:** `src/components/header.tsx`, `src/lib/branding.ts` (or wherever branding is read)

**Problem:** Nav is hardcoded. Some tenants have no portfolio (so "Projects" leads to empty page). Others have a rich gallery that's hidden.

**Fix:** Read `nav_config` from `admin_settings.branding` (or a new key). If present, use it. If absent, fall back to current hardcoded nav.

```typescript
// In header.tsx
const defaultNav = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Projects', href: '/projects' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

// Read from branding.navItems — only set for new builds
const navItems = branding.navItems ?? defaultNav;
```

**Data shape for `branding.navItems`:**
```json
[
  { "label": "Home", "href": "/" },
  { "label": "Services", "href": "/services" },
  { "label": "Gallery", "href": "/gallery" },
  { "label": "About", "href": "/about" },
  { "label": "Contact", "href": "/contact" }
]
```

**Existing tenants:** No `navItems` → uses `defaultNav` → zero change.

---

## Change 2: Gallery Page

**Files:** New `src/app/(public)/gallery/page.tsx`

**Problem:** No dedicated gallery page. Portfolio images only visible on homepage and `/projects`.

**Fix:** Create `/gallery` page following the exact same pattern as `/projects`:
```typescript
// src/app/(public)/gallery/page.tsx
export default async function GalleryPage() {
  const [branding, config, layout, tokens] = await Promise.all([
    getBranding(), getCompanyConfig(), getPageLayout('gallery'), getDesignTokens()
  ]);
  return <SectionRenderer sections={layout} branding={branding} config={config} tokens={tokens} />;
}
```

Add `gallery` to DEFAULT_LAYOUTS in `src/lib/page-layout.ts`:
```typescript
gallery: ['misc:breadcrumb-hero', 'gallery:masonry-grid', 'cta:full-width-primary'],
```

**Existing tenants:** Page exists but no one links to it (no `navItems` pointing there). If someone visits `/gallery` directly, they see the gallery — that's fine, not harmful.

---

## Change 3: Exclude Before/After Slider Section

**File:** `tenant-builder/provision/provision-tenant.mjs`

**Problem:** The architect blueprint includes `gallery:before-after-slider` on homepage and projects page. This section shows a before/after photo pair, but we don't have matched pairs from the same room — the images are completely different photos side by side, which looks broken and confusing. The **hero visualizer-teardown is fine** (it's the AI design visualizer, which is our product demo).

**Fix:** During provisioning, strip `gallery:before-after-slider` from all page_layouts. Replace with `gallery:masonry-grid` (which shows the portfolio photos in a clean grid).

```javascript
// In provision-tenant.mjs, after building pageLayouts from blueprint:
for (const [page, sections] of Object.entries(pageLayouts)) {
  pageLayouts[page] = sections.map(id =>
    id === 'gallery:before-after-slider' ? 'gallery:masonry-grid' : id
  );
}
```

This only affects new builds. Existing tenants keep their stored layouts.

---

## Change 4: Service Card Image Fallback

**File:** `src/sections/services/grid-3-cards.tsx`

**Problem:** Service cards without `imageUrl` render as same-size cards with a gap where the image should be. Looks broken.

**Fix:** When `imageUrl` is missing, render a coloured icon placeholder using the existing `iconHint` field (already set by `inferServiceIcon()` during provisioning — kitchen→chef-hat, bathroom→bath, etc.):

```tsx
{service.imageUrl ? (
  <Image src={service.imageUrl} alt={service.name} ... />
) : (
  <div className="flex aspect-[3/2] items-center justify-center bg-primary/5 rounded-lg">
    <DynamicIcon name={service.iconHint || 'wrench'} className="h-12 w-12 text-primary/30" />
  </div>
)}
```

**Existing tenants:** This improves their cards too — but only visually (icon placeholder instead of nothing). This is a strictly better rendering, no content change.

---

## Change 5: Provisioner Builds `nav_config` + `page_layouts` Dynamically

**File:** `tenant-builder/provision/provision-tenant.mjs` (and `scripts/onboarding/provision.mjs`)

**Problem:** Provisioning uses static default page layouts. Doesn't adapt to what content was actually scraped.

**Fix:** After quality gates, construct `navItems` and `page_layouts` based on data availability:

```javascript
const navItems = [{ label: 'Home', href: '/' }];
const pageLayouts = { homepage: [...] };

// Services: include if we have 2+ services
if (validServices.length >= 2) {
  navItems.push({ label: 'Services', href: '/services' });
  pageLayouts.services = ['misc:breadcrumb-hero', 'services:grid-3-cards', 'testimonials:cards-carousel', 'cta:full-width-primary'];
}

// Gallery: include if we have 3+ portfolio images
if (validPortfolio.length >= 3) {
  navItems.push({ label: 'Gallery', href: '/gallery' });
  pageLayouts.gallery = ['misc:breadcrumb-hero', 'gallery:masonry-grid', 'cta:full-width-primary'];
}

// Projects: include if we have portfolio items WITH descriptions
const describedProjects = validPortfolio.filter(p => p.description?.length > 20);
if (describedProjects.length >= 2) {
  navItems.push({ label: 'Projects', href: '/projects' });
  pageLayouts.projects = ['misc:breadcrumb-hero', 'gallery:masonry-grid', 'testimonials:cards-carousel', 'cta:full-width-primary'];
}

// About: include if we have about copy
if (aboutCopy.length > 0 || mission || principals) {
  navItems.push({ label: 'About', href: '/about' });
  pageLayouts.about = ['misc:breadcrumb-hero', 'about:split-image-copy', ...];
}

// Contact: always
navItems.push({ label: 'Contact', href: '/contact' });
pageLayouts.contact = ['misc:breadcrumb-hero', 'contact:form-with-map', 'trust:badge-strip'];
```

Store `navItems` in `branding` admin_settings row. Store dynamic `page_layouts` as today.

---

## Files Summary

### Create
| File | Purpose |
|------|---------|
| `src/app/(public)/gallery/page.tsx` | New gallery page route (same pattern as /projects) |

### Modify (Platform — backward compatible)
| File | Changes |
|------|---------|
| `src/components/header.tsx` | Read `navItems` from branding, fall back to hardcoded default |
| `src/sections/services/grid-3-cards.tsx` | Icon placeholder when service imageUrl is missing |
| `src/lib/page-layout.ts` | Add `gallery` to DEFAULT_LAYOUTS |

### Modify (Tenant Builder — new builds only)
| File | Changes |
|------|---------|
| `tenant-builder/provision/provision-tenant.mjs` | Build navItems + pageLayouts dynamically from scraped data; choose hero section based on data |
| `scripts/onboarding/provision.mjs` | Same navItems/pageLayouts logic (shared provisioner) |

### Existing utilities to reuse
| File | Function |
|------|----------|
| `src/sections/gallery/masonry-grid.tsx` | Already exists, renders portfolio images |
| `src/components/section-renderer.tsx` | Already handles any section ID in layout |
| `scripts/onboarding/lib/quality-gates.mjs` | `filterPortfolio()`, `filterServices()`, `inferServiceIcon()` |

---

## Implementation Order

1. **Change 2** — Create `/gallery` page route + add to DEFAULT_LAYOUTS (platform, minimal risk)
2. **Change 4** — Service card icon fallback (platform, strictly better rendering)
3. **Change 1** — Dynamic nav in header.tsx (platform, backward compatible via fallback)
4. **Change 5** — Provisioner builds navItems + pageLayouts dynamically (builder, new builds only)
5. **Change 3** — Strip `gallery:before-after-slider` → replace with `gallery:masonry-grid` (builder, new builds only)
6. **Deploy** — `scripts/sync-deploy.sh` → push to deploy repo → Vercel auto-build
7. **Live build** — Fresh target, full pipeline, verify nav/gallery/hero/service cards
8. **Verify** — Gmail draft + live site review

---

## Verification

### Pre-deploy
- `npm run build` passes clean (no TypeScript errors from new page/changes)
- Existing tenant (e.g., `?__site_id=demo`) still renders with hardcoded nav (no regression)

### Post-deploy, pre-build
- Visit `https://conversionos.norbotsystems.com/gallery` — should render (empty or with default data)
- Visit `https://demo.norbotsystems.com/services` — service cards should show icon placeholders where images are missing

### Live build test
- Run full pipeline on a fresh target
- Verify: nav items match scraped content (Gallery if portfolio, no Projects if no descriptions)
- Verify: hero is `full-bleed-overlay` (not visualizer-teardown)
- Verify: service cards all have either real images or icon placeholders
- Verify: `/gallery` page shows all portfolio images
- Gmail draft created

### Regression safety
- `branding.navItems` fallback: no key → hardcoded nav (all 54+ existing tenants unaffected)
- Gallery page: new route, no existing links point to it
- Service card icon: strictly better than blank space — improves all tenants
- Hero change: only in provisioner for new builds — existing tenants keep their hero
- Page layouts: only new builds get dynamic layouts — existing tenants keep their stored layouts

---

**TLDR:** Five backward-compatible changes that add a `/gallery` page, make navigation data-driven (from scraped content), replace the mismatched `before-after-slider` section with `masonry-grid`, and add icon placeholders for imageless service cards. Platform changes use a fallback pattern (`navItems ?? defaultNav`) so existing tenants are completely unaffected. Provisioner changes only apply to new builds. Hero visualizer-teardown is kept (it's working well). Live build test to verify end-to-end.

**Complexity:** MEDIUM — 1 new page route, 3 platform file edits (all backward compatible), 2 provisioner file edits. The dynamic nav logic is the most significant change but the fallback pattern makes it safe.
