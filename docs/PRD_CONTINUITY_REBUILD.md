# PRD: Continuity Rebuild Pipeline — "Keep the Feel, Upgrade the Brain"

**Version:** 1.0 | **Date:** 2026-03-09 | **Status:** ACTIVE
**Owner:** Ferdie Botden, CEO | **Architect:** Claude Code (Opus 4.6)

> This is the master continuity document for the strategic pivot. Any session implementing a sprint reads this first, checks the Progress Tracker (bottom), and picks up the next uncompleted sprint.

---

## 1. Executive Summary

NorBot Systems is pivoting from "same template, different data" to **"your website, rebuilt as a conversion system."** The pipeline will autonomously take any Ontario renovation contractor's existing website, rebuild it as a premium site preserving their exact layout/brand/copy, and embed ConversionOS AI features (Visualizer, Emma chat, admin dashboard, quote engine) as a native conversion layer.

### Strategic Framing
- **Public:** "Your website, rebuilt as a conversion system"
- **Internal:** "Continuity rebuild + AI visualizer + lead-to-quote operating layer"
- **Guardrail:** "NorBot is a productized AI conversion infrastructure company, not a custom web agency"

### Pricing (AUTHORITATIVE — March 9, 2026)

| Tier | Setup | Monthly | Best Fit |
|------|------:|--------:|----------|
| Elevate | $4,500 | $299/mo | Premium rebuild + visualizer-led conversion |
| Accelerate | $12,000 | $699/mo | + admin dashboard + AI quote workflow |
| Dominate | $20,000 | $1,799/mo | + exclusivity + founder-led onboarding + analytics |
| Black Label | $40,000 | $4,999/mo | Custom AI implementation beyond product envelope |

**Voice add-on:** $499/mo on any tier. Premium voice (sales-trained routing) on Dominate+.
**Guarantee:** 75% of setup fee refunded within 14 days of go-live.

### Scale Target
10 production-ready demos per day, each feeling hand-built. ~15-20 min/build.

### What Changes vs What Stays

**Stays the same:** Single repo, single Vercel project, all `/api/*` + `/admin/*` + `/visualizer/*` routes, Emma chat, voice agents, entitlements, Supabase data model, outreach pipeline.

**Changes:** Public pages get per-tenant layouts (section registry), proxy.ts gets Edge Config, ICP scoring flips to target established operators, pricing updates across codebase, Black Label tier added.

---

## 2. Architecture Decisions (LOCKED)

These decisions are final. Do not revisit during implementation.

### 2.1 Evolve Existing Codebases
Modify `~/norbot-ops/products/demo/` in place. No new repository, no new folder. The section registry is a backward-compatible evolution — existing 14+ tenants render identically via a default layout config.

### 2.2 Section Registry + Database-Driven Layout Composition
~50 section-level components in `/src/sections/`. Per-tenant layout stored as `page_layouts` key in `admin_settings` (Supabase). An AI layout composer (Opus Vision) analyses original sites and selects sections. Max 3 custom sections per site via GPT 5.4 Codex.

### 2.3 Edge Config Replaces Hardcoded Proxy Map
Vercel Edge Config replaces the `DOMAIN_TO_SITE` Record in `proxy.ts`. No git commit needed per tenant. Hardcoded map retained as fallback.

### 2.4 Admin Dashboard NOT Rebranded
`/admin/*` maintains NorBot Systems' brand. No per-tenant dashboard customisation. "Configuration is allowed. Bespoke code is not."

### 2.5 Model Usage Map

| Task | Model | Reason |
|------|-------|--------|
| Section library build | Opus 4.6 (Agent Teams) | Sustained multi-file code generation |
| Blueprint generation | Opus 4.6 (Vision) | Best vision + reasoning for section matching |
| Custom section generation | GPT 5.4 Codex | Fast bespoke code from screenshots |
| ICP scoring classification | Sonnet 4.6 | Cheap structured output |
| Visual Fidelity QA | Opus 4.6 (Vision) | Highest accuracy for comparison |
| Content integrity QA | Haiku 4.5 | Cheapest for pattern matching |
| Image generation | Gemini 3.1 Flash (Nano Banana 2) | Pro quality at Flash speed |
| Background monitoring | Gemini Flash Lite | Cheapest heartbeat model |

### 2.6 Migration Envelope (Hard Limits)

| Constraint | Limit | Enforcement |
|-----------|-------|-------------|
| Page count | 15 max | Pipeline rejects |
| Custom sections | 3 max per site | Pipeline flags for review |
| Complexity score | <= 7/10 | Pipeline pauses |
| Excluded features | No e-commerce, no booking systems, no custom DBs | Section classifier rejects |
| Animation presets | 3 only (fade-in-up, stagger-reveal, slide-in-left) | Fixed set |

---

## 3. Sprint 0 — ICP Scoring Flip + Pricing Update

**Execution:** Single session | **Time:** 4-6 hours | **Dependencies:** None | **Risk:** LOW

### 3.1 ICP Scoring Changes

The current scoring rewards weak websites and small operators. Flip it to reward established contractors.

**File:** `tenant-builder/icp-score.mjs`

#### Flip `scoreSophisticationGap()` (line 77-79)

**Current:**
```javascript
function scoreSophisticationGap(level) {
  const map = { basic: 20, template: 18, professional: 12, custom: 6, stunning: 3 };
  return Math.min(map[level] || 10, WEIGHTS.sophistication_gap);
}
```

**New (rename to `scoreWebsiteQuality`):**
```javascript
function scoreWebsiteQuality(level) {
  const map = { stunning: 20, custom: 16, professional: 12, template: 6, basic: 2 };
  return Math.min(map[level] || 10, WEIGHTS.website_quality);
}
```

#### Flip `scoreCompanySize()` (line 120-123)

**Current:**
```javascript
function scoreCompanySize(sizeEstimate) {
  const map = { solo: 15, small: 12, medium: 8, large: 4 };
  return Math.min(map[sizeEstimate] || 10, WEIGHTS.company_size);
}
```

**New (rename to `scoreCompanyEstablishment`):**
```javascript
function scoreCompanyEstablishment(sizeEstimate) {
  const map = { large: 15, medium: 12, small: 8, solo: 3 };
  return Math.min(map[sizeEstimate] || 8, WEIGHTS.company_establishment);
}
```

#### Enhance `scoreGoogleReviews()` (line 92-103)

Add review count tiers for higher-end and review velocity:
```javascript
function scoreGoogleReviews(rating, count, velocity) {
  let score = 0;
  // Rating
  if (rating >= 4.5) score += 6;
  else if (rating >= 4.0) score += 4;
  else if (rating >= 3.5) score += 2;
  // Count (raised tiers)
  if (count >= 100) score += 10;
  else if (count >= 50) score += 7;
  else if (count >= 20) score += 4;
  else if (count >= 5) score += 2;
  // Velocity (reviews per month, new dimension)
  if (velocity >= 5) score += 4;
  else if (velocity >= 2) score += 2;
  return Math.min(score, WEIGHTS.google_reviews);
}
```

#### Add `scoreMarketingSophistication()` (NEW)

```javascript
function scoreMarketingSophistication(signals) {
  let score = 0;
  if (signals.google_ads) score += 8;
  if (signals.active_social) score += 6;       // 3+ posts/week on Instagram/Facebook
  if (signals.professional_photos) score += 3;  // Non-stock photography
  if (signals.video_content) score += 3;        // YouTube or video testimonials
  return Math.min(score, WEIGHTS.marketing_sophistication);
}
```

#### Add `scoreYearsInBusiness()` (NEW)

```javascript
function scoreYearsInBusiness(years) {
  if (years >= 10) return Math.min(15, WEIGHTS.years_in_business);
  if (years >= 5) return Math.min(10, WEIGHTS.years_in_business);
  if (years >= 2) return Math.min(5, WEIGHTS.years_in_business);
  return 2;
}
```

#### Update Geography (distance-based, not city-list)

```javascript
function scoreGeography(city) {
  if (!city) return 3;
  const norm = city.toLowerCase();
  if (RING_1.includes(norm)) return Math.min(15, WEIGHTS.geography);  // <50km from Stratford
  if (RING_2.includes(norm)) return Math.min(12, WEIGHTS.geography);  // 50-100km
  if (RING_3.includes(norm)) return Math.min(9, WEIGHTS.geography);   // 100-200km
  return 5; // 200km+
}
```

### 3.2 Config Changes

**File:** `tenant-builder/config.yaml`

Replace the `icp_scoring` section:

```yaml
icp_scoring:
  weights:
    template_fit: 15
    website_quality: 20       # was sophistication_gap (inverted)
    contact_completeness: 10
    google_reviews: 20        # was 15, now includes velocity
    geography: 15
    company_establishment: 15 # was company_size (inverted)
    marketing_sophistication: 20  # NEW
    years_in_business: 15         # NEW
  thresholds:
    auto_proceed: 85         # was 70
    manual_review: 65        # was 50
    reject: 65               # was 50
  geographic_rings:
    ring_1:  # <50km from Stratford
      - Stratford
      - Woodstock
      - Kitchener
      - Waterloo
      - Cambridge
      - Guelph
      - New Hamburg
      - Listowel
      - Mitchell
      - Tavistock
    ring_2:  # 50-100km
      - London
      - Brantford
      - Hamilton
      - Fergus
      - Orangeville
      - Ingersoll
      - Tillsonburg
      - St. Thomas
      - Elmira
      - Elora
      - Paris
      - Simcoe
      - Norfolk
      - Exeter
    ring_3:  # 100-200km
      - Toronto
      - Oakville
      - Burlington
      - Barrie
      - Kingston
      - Mississauga
      - Brampton
```

Update discovery section:
```yaml
discovery:
  search_templates:
    - "premium renovation contractor {city} Ontario"
    - "design build firm {city} Ontario portfolio"
    - "kitchen bathroom renovation company {city} reviews"
    - "luxury home renovation {city} Ontario"
    - "award winning contractor {city} Ontario"
  quality_floor:
    min_google_reviews: 10
    min_google_rating: 3.5
    reject_directory_listings: true
  max_results_per_city: 10
  active_cities:
    - Kitchener
    - Waterloo
    - Cambridge
    - Guelph
    - London
    - Woodstock
    - Brantford
    - Hamilton
    - Oakville
    - Burlington
    - Stratford
    - Ingersoll
    - Tillsonburg
    - St. Thomas
    - Toronto
```

### 3.3 Turso Schema Additions

```sql
ALTER TABLE targets ADD COLUMN website_custom_built INTEGER DEFAULT 0;
ALTER TABLE targets ADD COLUMN marketing_signals TEXT DEFAULT NULL;
ALTER TABLE targets ADD COLUMN team_size_estimate TEXT DEFAULT 'small';
ALTER TABLE targets ADD COLUMN years_established INTEGER DEFAULT NULL;
ALTER TABLE targets ADD COLUMN review_velocity REAL DEFAULT NULL;
ALTER TABLE targets ADD COLUMN branding_quality TEXT DEFAULT 'basic';
```

### 3.4 Re-Score Existing Targets

```bash
node tenant-builder/icp-score.mjs --all --limit 733 --force --dry-run  # Preview first
node tenant-builder/icp-score.mjs --all --limit 733 --force            # Apply
```

### 3.5 Pricing Updates

**Files to update:**
- `src/lib/entitlements.ts` — Add `'black_label'` to `PlanTier`, add Black Label features
- `src/lib/entitlements.server.ts` — Handle `'black_label'` tier
- `shared/BUSINESS_CONTEXT.md` — Update pricing table
- `MEMORY.md` — Update pricing section
- `tenant-builder/config.yaml` — `provisioning.default_tier` stays `accelerate`

**Entitlements addition:**
```typescript
export type PlanTier = 'elevate' | 'accelerate' | 'dominate' | 'black_label';

// Add to TIER_FEATURES:
black_label: new Set([
  ...Array.from(TIER_FEATURES.dominate),
  'custom_workflows',
  'bespoke_automation',
]),
```

### 3.6 Claude CLI Assessment Enhancement

Update the Claude prompt in `scoreTarget()` (line 152-159) to also assess marketing sophistication and years in business:

```javascript
const prompt = `Analyse this contractor website and assess:
1. Website sophistication level (basic, template, professional, custom, stunning)
2. Estimated team size (solo, small, medium, large)
3. Estimated years in business (number, or null if unknown)
4. Marketing signals: {google_ads: bool, active_social: bool, professional_photos: bool, video_content: bool}

Website: ${target.website || 'unknown'}
Company: ${name}

Content (first 3000 chars):
${markdown.slice(0, 3000)}`;
```

Update the JSON schema at `tenant-builder/schemas/icp-score.json` to include the new fields.

### 3.7 Test Criteria
- [ ] Top 20 re-scored targets have professional/custom/stunning websites
- [ ] Top 20 have 50+ Google reviews
- [ ] Top 20 are in Ring 1 or Ring 2 geography
- [ ] No basic-website solo operators in top 20
- [ ] Existing built tenants unaffected (scoring is separate from rendering)

---

## 4. Sprint 1 — Edge Config Migration

**Execution:** Single session | **Time:** 3-4 hours | **Dependencies:** None | **Risk:** LOW

### 4.1 Install Edge Config

```bash
cd ~/norbot-ops/products/demo
npm install @vercel/edge-config
```

### 4.2 Create Edge Config Store

Via Vercel dashboard or API:
1. Create a new Edge Config store named `conversionos-tenants`
2. Populate with current `DOMAIN_TO_SITE` entries (all 30 domains)
3. Note the Edge Config ID and connection string
4. Add `EDGE_CONFIG` env var to Vercel project

### 4.3 Update `src/proxy.ts`

Replace the hardcoded `DOMAIN_TO_SITE` Record with Edge Config lookup:

```typescript
import { get } from '@vercel/edge-config';

// Fallback map (retained for safety — remove once Edge Config is proven)
const DOMAIN_TO_SITE_FALLBACK: Record<string, string> = {
  // ... current entries ...
};

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') ?? '';
  const [domain = ''] = hostname.split(':');

  // Dev override
  const devOverride = process.env.NODE_ENV === 'development'
    ? request.nextUrl.searchParams.get('__site_id') || process.env.NEXT_PUBLIC_SITE_ID
    : null;

  // Edge Config lookup (fast, <1ms at edge)
  let siteId = devOverride;
  if (!siteId) {
    try {
      siteId = await get<string>(`domain:${domain}`) ?? await get<string>(`domain:${hostname}`);
    } catch {
      // Edge Config unavailable — use fallback
    }
  }

  // Fallback to hardcoded map
  if (!siteId) {
    siteId = DOMAIN_TO_SITE_FALLBACK[hostname] || DOMAIN_TO_SITE_FALLBACK[domain];
  }

  // Env var fallback (dev only)
  if (!siteId && process.env.NODE_ENV === 'development') {
    siteId = process.env.NEXT_PUBLIC_SITE_ID ?? null;
  }

  if (!siteId) {
    return new NextResponse('Tenant not found', { status: 404 });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-site-id', siteId);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
```

### 4.4 Update Tenant Builder

**File:** `tenant-builder/provision/merge-proxy.mjs`

Replace file-edit logic with Edge Config API call:

```javascript
import { createClient } from '@vercel/edge-config';

async function addDomainMapping(domain, siteId) {
  const edgeConfigId = process.env.VERCEL_EDGE_CONFIG_ID;
  const token = process.env.VERCEL_TOKEN;

  const response = await fetch(
    `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          { operation: 'upsert', key: `domain:${domain}`, value: siteId },
        ],
      }),
    }
  );

  if (!response.ok) throw new Error(`Edge Config update failed: ${response.statusText}`);
}
```

Also update `scripts/onboarding/add-domain.mjs` to call Edge Config after Vercel domain registration.

### 4.5 Environment Variables

Add to Vercel project + `.env.local`:
- `EDGE_CONFIG` — Edge Config connection string
- `VERCEL_EDGE_CONFIG_ID` — Edge Config store ID (for write API)

### 4.6 Test Criteria
- [ ] All 14+ existing tenants resolve correctly via Edge Config
- [ ] New tenant added via API resolves instantly (no deploy)
- [ ] Fallback map works when Edge Config is unavailable
- [ ] Dev override (`?__site_id=`) still works
- [ ] Production deploy succeeds with no errors

---

## 5. Sprint 2 — Section Component Library (Agent Teams)

**Execution:** Agent Teams (6 teammates) | **Time:** 2-3 days | **Dependencies:** None (can start before 0/1) | **Risk:** MEDIUM

### 5.1 Research Step (Before Building)

Spawn a research subagent:
```
/last30days "Next.js section component library patterns Tailwind v4 Framer Motion reusable components 2026" --ai
```

### 5.2 Shared Interfaces (Lead Creates First)

**File:** `src/lib/section-types.ts`

```typescript
import type { Branding } from './branding';

/** Design tokens derived from the tenant's brand */
export interface DesignTokens {
  colors: {
    primary: string;      // OKLCH
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  borderRadius: string;
}

/** Base props every section receives */
export interface SectionBaseProps {
  branding: Branding;
  tokens?: DesignTokens;
  animationPreset?: 'fade-in-up' | 'stagger-reveal' | 'slide-in-left' | 'none';
  className?: string;
}

/** Section identifier: "category:variant" e.g. "hero:full-bleed-overlay" */
export type SectionId = `${string}:${string}`;

/** Page layout config stored in admin_settings */
export interface PageLayout {
  [pageSlug: string]: SectionId[];
}
```

**File:** `src/lib/section-registry.ts`

```typescript
import type { ComponentType } from 'react';
import type { SectionBaseProps, SectionId } from './section-types';

type SectionComponent = ComponentType<SectionBaseProps & Record<string, unknown>>;

const REGISTRY = new Map<string, SectionComponent>();

export function registerSection(id: SectionId, component: SectionComponent) {
  REGISTRY.set(id, component);
}

export function getSection(id: SectionId): SectionComponent | null {
  return REGISTRY.get(id) ?? null;
}

export function listSections(): SectionId[] {
  return Array.from(REGISTRY.keys()) as SectionId[];
}
```

**File:** `src/components/section-renderer.tsx`

```typescript
'use client';

import { getSection } from '@/lib/section-registry';
import type { SectionId, SectionBaseProps } from '@/lib/section-types';
import type { Branding } from '@/lib/branding';
import type { CompanyConfig } from '@/lib/ai/knowledge/company';

// Register all sections
import '@/sections/register';

interface Props {
  sections: SectionId[];
  branding: Branding;
  config: CompanyConfig;
  tokens?: SectionBaseProps['tokens'];
}

export function SectionRenderer({ sections, branding, config, tokens }: Props) {
  return (
    <>
      {sections.map((sectionId, index) => {
        const Component = getSection(sectionId);
        if (!Component) {
          console.warn(`Section not found: ${sectionId}`);
          return null;
        }
        return (
          <Component
            key={`${sectionId}-${index}`}
            branding={branding}
            config={config}
            tokens={tokens}
          />
        );
      })}
    </>
  );
}
```

### 5.3 Component Catalogue

Each component goes in `/src/sections/{category}/{variant}.tsx`. Every component:
- Is a server component (async, can fetch data)
- Accepts `SectionBaseProps & { config: CompanyConfig }`
- Uses Tailwind v4 + CSS custom properties for theming
- Includes Framer Motion animations via the `animationPreset` prop
- Is fully responsive (mobile-first)
- Self-registers via `registerSection()` call in `src/sections/register.ts`

### 5.4 Teammate Assignments

#### Teammate 1: Hero + Navigation (9 components)
**Directory:** `src/sections/hero/` + `src/sections/navigation/`

| Component | File | Key Props |
|-----------|------|-----------|
| `hero:full-bleed-overlay` | `hero/full-bleed-overlay.tsx` | heroImageUrl, heroHeadline, heroSubheadline, ctaLabel, ctaHref |
| `hero:split-image-text` | `hero/split-image-text.tsx` | heroImageUrl, heroHeadline, heroSubheadline, imagePosition ('left'|'right') |
| `hero:editorial-centered` | `hero/editorial-centered.tsx` | heroHeadline, heroSubheadline, ctaLabel (no image, gradient bg) |
| `hero:video-background` | `hero/video-background.tsx` | videoUrl, heroHeadline, heroSubheadline, fallbackImageUrl |
| `hero:gradient-text` | `hero/gradient-text.tsx` | heroHeadline, heroSubheadline (large gradient text, minimal) |
| `nav:sticky-simple` | `navigation/sticky-simple.tsx` | logoUrl, navItems[], ctaButton, phoneInNav |
| `nav:sticky-transparent` | `navigation/sticky-transparent.tsx` | logoUrl, navItems[], ctaButton (transparent -> solid on scroll) |
| `nav:split-logo-center` | `navigation/split-logo-center.tsx` | logoUrl, leftItems[], rightItems[] |
| `nav:hamburger` | `navigation/hamburger.tsx` | logoUrl, navItems[], ctaButton (always hamburger, mobile-first) |

**Reference:** Current hero in `src/app/page.tsx` lines 58-120.

#### Teammate 2: Services + Trust/Proof (9 components)
**Directory:** `src/sections/services/` + `src/sections/trust/`

| Component | File |
|-----------|------|
| `services:grid-3-cards` | `services/grid-3-cards.tsx` |
| `services:grid-2-cards` | `services/grid-2-cards.tsx` |
| `services:accordion-list` | `services/accordion-list.tsx` |
| `services:alternating-rows` | `services/alternating-rows.tsx` |
| `services:bento` | `services/bento.tsx` |
| `trust:badge-strip` | `trust/badge-strip.tsx` |
| `trust:stats-counter` | `trust/stats-counter.tsx` |
| `trust:certifications` | `trust/certifications.tsx` |
| `trust:review-aggregate` | `trust/review-aggregate.tsx` |

**Reference:** Current ServicesGrid in `src/components/services-grid.tsx`, SocialProofBar in `src/components/home/social-proof-bar.tsx`.

#### Teammate 3: Testimonials + Gallery (8 components)
**Directory:** `src/sections/testimonials/` + `src/sections/gallery/`

| Component | File |
|-----------|------|
| `testimonials:cards-carousel` | `testimonials/cards-carousel.tsx` |
| `testimonials:single-featured` | `testimonials/single-featured.tsx` |
| `testimonials:masonry` | `testimonials/masonry.tsx` |
| `testimonials:minimal-quotes` | `testimonials/minimal-quotes.tsx` |
| `gallery:masonry-grid` | `gallery/masonry-grid.tsx` |
| `gallery:before-after-slider` | `gallery/before-after-slider.tsx` |
| `gallery:lightbox` | `gallery/lightbox.tsx` |
| `gallery:editorial-featured` | `gallery/editorial-featured.tsx` |

**Reference:** Current Testimonials in `src/components/testimonials.tsx`, GalleryTeaser in `src/components/home/gallery-teaser.tsx`.

#### Teammate 4: About/Team + Contact (8 components)
**Directory:** `src/sections/about/` + `src/sections/contact/`

| Component | File |
|-----------|------|
| `about:split-image-copy` | `about/split-image-copy.tsx` |
| `about:timeline` | `about/timeline.tsx` |
| `about:team-grid` | `about/team-grid.tsx` |
| `about:values-cards` | `about/values-cards.tsx` |
| `contact:form-with-map` | `contact/form-with-map.tsx` |
| `contact:form-simple` | `contact/form-simple.tsx` |
| `contact:details-sidebar` | `contact/details-sidebar.tsx` |
| `contact:contact-cards` | `contact/contact-cards.tsx` |

#### Teammate 5: CTA + Footer + Misc (12 components)
**Directory:** `src/sections/cta/` + `src/sections/footer/` + `src/sections/misc/`

| Component | File |
|-----------|------|
| `cta:full-width-primary` | `cta/full-width-primary.tsx` |
| `cta:split-with-image` | `cta/split-with-image.tsx` |
| `cta:floating-banner` | `cta/floating-banner.tsx` |
| `cta:inline-card` | `cta/inline-card.tsx` |
| `footer:multi-column-3` | `footer/multi-column-3.tsx` |
| `footer:multi-column-4` | `footer/multi-column-4.tsx` |
| `footer:simple-centered` | `footer/simple-centered.tsx` |
| `footer:minimal-bar` | `footer/minimal-bar.tsx` |
| `misc:process-steps` | `misc/process-steps.tsx` |
| `misc:faq-accordion` | `misc/faq-accordion.tsx` |
| `misc:service-area-map` | `misc/service-area-map.tsx` |
| `misc:partner-logos` | `misc/partner-logos.tsx` |

#### Teammate 6: SectionRenderer + Registry + Page Refactoring
**Files:** `src/lib/section-types.ts`, `src/lib/section-registry.ts`, `src/components/section-renderer.tsx`, `src/sections/register.ts`, refactored `src/app/page.tsx`

Tasks:
1. Create the shared interfaces (section-types.ts) — FIRST PRIORITY
2. Create the section registry (section-registry.ts)
3. Create the SectionRenderer component
4. Create `src/sections/register.ts` that imports and registers all sections
5. Add `getPageLayout()` function to fetch `page_layouts` from `admin_settings`
6. Refactor `src/app/page.tsx` to use `SectionRenderer`
7. Define the DEFAULT_LAYOUT that matches the current hardcoded structure:
```typescript
const DEFAULT_HOMEPAGE_LAYOUT: SectionId[] = [
  'hero:full-bleed-overlay',
  'trust:badge-strip',
  'misc:visualizer-teaser',
  'services:grid-3-cards',
  'gallery:masonry-grid',
  'testimonials:cards-carousel',
  'cta:full-width-primary',
];
```

### 5.5 Test Criteria
- [ ] All 50 section components render without errors
- [ ] `npm run build` passes with zero TS errors
- [ ] Default layout renders identically to current homepage (screenshot comparison)
- [ ] All 14+ existing tenants render identically (no regression)
- [ ] Each section is responsive at desktop/tablet/mobile viewports

---

## 6. Sprint 3 — Enhanced Extraction + Blueprint Generator

**Execution:** Single session or 2 teammates | **Time:** 5-7 days | **Dependencies:** Sprint 2 | **Risk:** LOW

### 6.1 DesignSystemBundle Type

**File:** `dominant-builder/src/contracts/types.d.ts` — extend `BrandResearchBundle`:

```typescript
export interface DesignSystemBundle extends BrandResearchBundle {
  designTokens: {
    colours: { primary: string; secondary: string; accent: string; background: string; text: string; muted: string };
    typography: { headingFont: string; bodyFont: string; headingSizes: string[]; bodySize: string; lineHeight: string };
    spacing: { sectionPadding: string; containerWidth: string; gap: string };
    borderRadius: string;
    shadows: string[];
  };
  pages: Array<{
    url: string;
    slug: string;
    purpose: string;
    sections: Array<{
      type: string;
      heading: string | null;
      content: string[];
      images: string[];
      layout: 'full-width' | 'contained' | 'split-left' | 'split-right' | 'grid-2' | 'grid-3' | 'grid-4';
      background: 'light' | 'dark' | 'primary' | 'image';
    }>;
    screenshot: { desktop: string; mobile: string };
  }>;
  navigation: {
    style: 'sticky-simple' | 'sticky-transparent' | 'hamburger-only' | 'split-logo-center';
    items: Array<{ label: string; href: string; children?: Array<{ label: string; href: string }> }>;
    cta: { label: string; href: string } | null;
    phoneInNav: boolean;
  };
  footer: {
    style: 'simple-centered' | 'multi-column' | 'minimal-bar';
    columns: number;
  };
}
```

### 6.2 SiteBlueprintV2

```typescript
export interface SiteBlueprintV2 {
  siteId: string;
  sourceUrl: string;
  tier: PlanTier;
  designTokens: DesignSystemBundle['designTokens'];
  pages: Array<{
    slug: string;
    purpose: string;
    sections: Array<{
      componentId: SectionId | 'CUSTOM';
      props: Record<string, unknown>;
      customSpec: string | null;
      animationPreset: 'fade-in-up' | 'stagger-reveal' | 'slide-in-left' | 'none';
    }>;
  }>;
  navigation: { componentId: SectionId; props: Record<string, unknown> };
  footer: { componentId: SectionId; props: Record<string, unknown> };
  platformIntegration: PlatformEmbedContract;
  complexityScore: number;
  customSectionCount: number;
}
```

### 6.3 Blueprint Generator (Opus Vision)

Create `dominant-builder/src/lib/blueprint-generator.mjs`. Single Opus call with:
- All original site screenshots (desktop + mobile per page)
- The `DesignSystemBundle` JSON
- The section library catalogue (list of all registered section IDs with descriptions)
- Instructions to map each original section to a library component or mark as CUSTOM

### 6.4 Test Criteria
- [ ] 10 real contractor websites produce valid `DesignSystemBundle` JSON
- [ ] 10 blueprints have complexity score <= 7
- [ ] 10 blueprints have custom section count <= 3
- [ ] Blueprint section IDs all exist in the section registry

---

## 7. Sprint 4 — Assembly Engine + QA

**Execution:** Agent Teams (3 teammates) | **Time:** 5-7 days | **Dependencies:** Sprints 2 + 3 | **Risk:** MEDIUM

### 7.1 Assembly Engine (Teammate 1)

**File:** `tenant-builder/lib/assembler.mjs`

Takes `SiteBlueprintV2` and generates:
- `page_layouts` JSON for `admin_settings`
- `design-tokens.css` for CSS custom properties
- Content mapping for `admin_settings` keys

### 7.2 Custom Section Generator (Teammate 2)

**File:** `tenant-builder/lib/codex-generator.mjs`

For sections marked CUSTOM:
1. Take the `customSpec` + cropped screenshot + design tokens
2. Call GPT 5.4 Codex to generate a React component
3. Type-check the output
4. If TS errors, fallback to closest library component
5. Save to `src/sections/custom/{site-id}-{index}.tsx`

### 7.3 Visual Fidelity QA + Refinement (Teammate 3)

**File:** `tenant-builder/qa/visual-fidelity-qa.mjs`

7-dimension rubric comparing original vs rebuilt screenshots:

| Dimension | Weight | Pass |
|-----------|--------|------|
| Layout Fidelity | 1.0 | >= 3.0 |
| Colour Accuracy | 1.0 | >= 3.0 |
| Typography Match | 1.0 | >= 3.0 |
| Navigation Match | 1.0 | >= 3.0 |
| Content Completeness | 1.0 | >= 3.0 |
| Premium Quality | 1.0 | >= 3.0 |
| ConversionOS Integration | 1.0 | >= 3.0 |

Overall pass: average >= 4.0, no dimension below 3.0.

Refinement loop: max 3 iterations, plateau detection (< 0.2 improvement).

### 7.4 Test Criteria
- [ ] Assembly engine produces valid `page_layouts` for 10 blueprints
- [ ] Custom sections pass TypeScript compilation
- [ ] Visual Fidelity QA scores 10 known-good sites > 4.0
- [ ] Refinement loop improves scores on intentionally degraded builds

---

## 8. Sprint 5 — Orchestration + 10-Target Pilot

**Execution:** Single session | **Time:** 5-7 days | **Dependencies:** All previous | **Risk:** MEDIUM

### 8.1 Master Orchestrator

Extend `tenant-builder/orchestrate.mjs` with new pipeline steps:
1. Select targets (existing)
2. ICP score (updated in Sprint 0)
3. **Deep extract** → `DesignSystemBundle` (Sprint 3)
4. **Blueprint** → `SiteBlueprintV2` (Sprint 3)
5. **Envelope check** (Sprint 3)
6. **Assemble** → page layouts + design tokens (Sprint 4)
7. Provision Supabase (existing, + `page_layouts` key)
8. **Edge Config update** (Sprint 1)
9. Domain registration + SSL (existing)
10. QA — all 9 modules + Visual Fidelity (Sprint 4)
11. Refinement (Sprint 4)
12. Go-live report (existing)
13. Outreach (existing)

### 8.2 Pilot Protocol

Select top 10 targets by new ICP score. Run full pipeline. Measure:
- Success rate (target: 8/10 >= 4.0 fidelity)
- Build time (target: < 20 min median)
- Manual polish time (target: < 30 min median)
- Cost per build (target: < $3)

### 8.3 Go/No-Go Criteria
- [ ] 8/10 pilot builds score >= 4.0 visual fidelity
- [ ] Median build time < 20 minutes
- [ ] Median manual polish time < 30 minutes
- [ ] Zero ConversionOS functional regressions
- [ ] All 14+ existing tenants still render correctly
- [ ] Outreach pipeline generates correct email drafts for pilot builds

---

## 9. Reference Materials

### Business Documents
- `docs/business-context/March 8 Pivot - Embed in Website/norbot_business_output_pack_2026-03-09/` (12 files)

### Architecture Files
| File | Purpose |
|------|---------|
| `src/proxy.ts` | Tenant routing (30 domains → site_ids) |
| `src/lib/branding.ts` | Branding interface + `getBranding()` |
| `src/lib/entitlements.ts` | Feature gating by tier |
| `src/app/page.tsx` | Current homepage (section composition reference) |
| `src/app/layout.tsx` | Root layout (BrandingProvider + TierProvider) |
| `src/components/motion.tsx` | Framer Motion animation components |

### Pipeline Files
| File | Purpose |
|------|---------|
| `tenant-builder/icp-score.mjs` | ICP scoring (6 criteria, 100 pts) |
| `tenant-builder/config.yaml` | Pipeline configuration |
| `tenant-builder/orchestrate.mjs` | Master orchestrator (18 steps) |
| `tenant-builder/discover.mjs` | Target discovery |
| `tenant-builder/provision/provision-tenant.mjs` | DB provisioning |
| `tenant-builder/provision/merge-proxy.mjs` | Proxy.ts updates |

### Dominant Builder
| File | Purpose |
|------|---------|
| `dominant-builder/src/contracts/types.d.ts` | BrandResearchBundle, SiteBlueprint, PlatformEmbedContract |
| `dominant-builder/src/lib/html-signals.mjs` | Heuristic extraction |
| `dominant-builder/src/lib/build-brand-research-bundle.mjs` | 16-dimension brand extraction |
| `dominant-builder/src/lib/build-site-blueprint.mjs` | Page architecture + component selection |

### Research Cache
- `~/.config/last30days/memory/` — Cached /last30days research (AI ecosystem, Claude Code, autonomous pipelines)

---

## 10. Progress Tracker

### Sprint 0: ICP Scoring Flip + Pricing Update
- [x] Flip `scoreSophisticationGap()` → `scoreWebsiteQuality()`
- [x] Flip `scoreCompanySize()` → `scoreCompanyEstablishment()`
- [x] Add `scoreMarketingSophistication()` function
- [x] Add `scoreYearsInBusiness()` function
- [x] Enhance `scoreGoogleReviews()` with velocity
- [x] Update `scoreGeography()` to ring-based
- [x] Update `config.yaml` weights, thresholds, search templates
- [x] Update `schemas/icp-score.json` for new fields
- [ ] Add Turso columns (6 new columns) — operational step, requires live DB
- [ ] Re-score all 733 targets with `--force` — operational step, requires API calls
- [x] Add `black_label` to `PlanTier` in entitlements.ts
- [x] Add Black Label features to `TIER_FEATURES`
- [x] Update `shared/BUSINESS_CONTEXT.md` with new pricing
- [x] Update MEMORY.md with new pricing
- [ ] Verify top 20 re-scored targets are premium operators — after re-scoring

### Sprint 1: Edge Config Migration
- [x] Install `@vercel/edge-config`
- [ ] Create Edge Config store on Vercel — manual dashboard step
- [ ] Populate with current 30 domain mappings — after store creation
- [x] Update `src/proxy.ts` with Edge Config lookup + fallback
- [x] Update `tenant-builder/provision/merge-proxy.mjs` → Edge Config API
- [x] Update `scripts/onboarding/add-domain.mjs` → Edge Config step
- [ ] Add EDGE_CONFIG + VERCEL_EDGE_CONFIG_ID env vars — after store creation
- [ ] Test all 14+ existing tenants resolve correctly — after Edge Config populated
- [ ] Test new tenant added via API resolves instantly — after Edge Config populated
- [ ] Deploy to production and verify — after all above

### Sprint 2: Section Component Library
- [x] Create shared interfaces (`section-types.ts`, `section-registry.ts`)
- [x] Create `SectionRenderer` component
- [x] Build 5 Hero variants
- [x] Build 4 Navigation variants
- [x] Build 5 Services variants
- [x] Build 4 Trust/Proof variants
- [x] Build 4 Testimonials variants
- [x] Build 4 Gallery variants
- [x] Build 4 About/Team variants
- [x] Build 4 Contact variants
- [x] Build 4 CTA variants
- [x] Build 4 Footer variants
- [x] Build 4 Misc variants (process, FAQ, map, logos)
- [x] Create `src/sections/register.ts`
- [ ] Add `getPageLayout()` function — next session
- [ ] Refactor `page.tsx` to use SectionRenderer — next session
- [ ] Define DEFAULT_LAYOUT matching current structure — next session
- [ ] Screenshot regression test: all existing tenants identical — after page.tsx refactor
- [x] `npm run build` passes

### Sprint 3: Enhanced Extraction + Blueprint Generator
- [ ] Define `DesignSystemBundle` type (extends BrandResearchBundle)
- [ ] Build CSS design token extraction
- [ ] Build per-page section structure mapper
- [ ] Build Playwright multi-viewport screenshot capture
- [ ] Build Opus Vision blueprint generator
- [ ] Build migration envelope enforcement
- [ ] Test on 10 real contractor websites
- [ ] All 10 produce valid blueprints with complexity <= 7

### Sprint 4: Assembly Engine + QA
- [ ] Build assembly engine (blueprint → page_layouts JSON)
- [ ] Build Codex custom section generator
- [ ] Build Visual Fidelity QA (7-dimension rubric)
- [ ] Extend Playwright functional QA for ConversionOS features
- [ ] Build refinement loop with plateau detection
- [ ] Test: 10 pilot builds through full QA

### Sprint 5: Orchestration + 10-Target Pilot
- [ ] Extend `orchestrate.mjs` with new pipeline steps
- [ ] Select top 10 targets by new ICP score
- [ ] Run full pipeline on 10 targets
- [ ] 8/10 score >= 4.0 visual fidelity
- [ ] Median build time < 20 minutes
- [ ] Median polish time < 30 minutes
- [ ] Integrate with Mission Control UI
- [ ] Connect to outreach pipeline
- [ ] Update PRODUCT_REFERENCE.md

---

**Session Instructions:** Read this document. Check Progress Tracker. Pick up next uncompleted sprint. For Agent Teams sprints, create shared interfaces FIRST, then spawn teammates with their assignments. Spawn a research subagent for `/last30days` before implementing if the sprint notes recommend it. Update checkboxes when tasks complete. Update this document if architecture decisions change.
