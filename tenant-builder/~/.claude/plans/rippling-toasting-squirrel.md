# Plan: Bespoke Pipeline Bug Fixes + Visual Fidelity Overhaul

## Context

Two bespoke tenants deployed (md-construction, westmount-craftsmen) with QA verdict REVIEW. Five root causes drive poor quality: (1) snake_case/camelCase field mismatch causes every custom section to read null, (2) double navigation bar from unconditional Header rendering, (3) broken image URLs with no graceful fallback, (4) vague architect specs produce generic layouts, (5) no visual refinement loop to compare generated vs original. Additionally, the `business_info` double-serialization guard and content-integrity false positives need fixing for pipeline robustness.

The larger vision: the pipeline should rebuild a contractor's website with near-identical visual DNA + premium feel (animations, scroll effects, hover states) + ConversionOS AI features (visualizer, chat, voice) natively integrated. This plan addresses both the immediate bugs AND the architectural improvements needed to achieve that vision.

---

## Phase 1: Fix Priority 1 Bugs (Immediate)

### 1A. Fix camelCase/snake_case Field Mismatch (Systemic)

**Root cause:** `integration-spec.md` documents `config.hero_headline`, `config.about_text`, `config.hero_image_url` (snake_case). Provisioner stores `heroHeadline`, `aboutCopy`, `heroImageUrl` (camelCase). Every Codex-generated section reads wrong keys -> null -> blank.

**Files to modify:**

1. **`tenant-builder/templates/integration-spec.md`** — Rewrite "Branding Data Access" section:
   - Document the ACTUAL camelCase field names from `company_profile`: `heroHeadline`, `heroSubheadline`, `heroImageUrl`, `aboutCopy`, `aboutImageUrl`, `logoUrl`, `services`, `testimonials`, `portfolio`, `trustMetrics`, `whyChooseUs`, `principals`, `certifications`
   - Add mandatory dual-lookup pattern with `str()` helper
   - Add "Field Name Reference" table mapping provisioner field -> access pattern
   - Document that `config` is `CompanyConfig` but must be accessed via bracket notation (`config['heroHeadline']`)

2. **`tenant-builder/build-custom-sections.mjs`** — In `buildBespokeCodexPrompt()` (line ~261):
   - Inject the full integration-spec content (currently loaded at line 53 but NOT referenced in bespoke prompts at line 293)
   - Inject actual scraped field values from `scraped.json` as examples: `"heroHeadline is currently: 'Building Dreams Since 1992'"`
   - Add a post-generation validation step: grep each `.tsx` file for snake_case field patterns (`config['hero_headline']`, `config.hero_headline`) and log warnings

3. **`tenant-builder/templates/custom-section-template.tsx`** (new file) — Full reference template:
   - Demonstrates dual-lookup `str()` helper
   - Shows proper null guards with graceful degradation
   - Imports `next/image`, `next/link`, motion components
   - This template gets injected into every Codex prompt

### 1B. Fix Double Navigation Bar

**Root cause:** `layout.tsx` line 144 renders `<Header />` unconditionally. Bespoke page_layouts include `custom:*-nav` sections. Both render = double nav.

**Files to modify:**

1. **`src/app/layout.tsx`** — Add conditional rendering:
   - Read a `layout_flags` key from `admin_settings` (new, cached with other settings)
   - `if (!layoutFlags?.custom_nav) render <Header />`
   - `if (!layoutFlags?.custom_footer) render <Footer />`
   - Minimal change: add `getLayoutFlags()` call to the existing `Promise.all()`

2. **`src/lib/page-layout.ts`** — Add `getLayoutFlags()`:
   ```ts
   export async function getLayoutFlags(): Promise<{ custom_nav?: boolean; custom_footer?: boolean }> {
     const siteId = await getSiteIdAsync();
     const supabase = createServiceClient();
     const { data } = await supabase.from('admin_settings').select('value')
       .eq('site_id', siteId).eq('key', 'layout_flags').single();
     return (data?.value as Record<string, boolean>) ?? {};
   }
   ```

3. **`tenant-builder/provision/provision-tenant.mjs`** — In Step 2d (page_layouts):
   - After writing page_layouts, detect if any section ID matches `custom:*-nav*` or `custom:*-header*` or `custom:*-navbar*`
   - If found, upsert `{ key: 'layout_flags', value: { custom_nav: true }, site_id }` into admin_settings
   - Same for footer: detect `custom:*-footer*` -> `custom_footer: true`

4. **Fix existing tenants:** Supabase PATCH to add `layout_flags` for md-construction and westmount-craftsmen

### 1C. Fix business_info Double-Serialization Guard

**Root cause:** `provision.mjs` passes `businessInfo` object to Supabase upsert correctly (line 194), but the `provision-tenant.mjs` wrapper may pre-serialize via `JSON.stringify()` when writing to `provisioned.json` (line 200), and that stringified version gets read back and passed through. Supabase stores `"{\"name\":\"Foo\"}"` (double-encoded).

**Files to modify:**

1. **`scripts/onboarding/provision.mjs`** — Add deserialization guard before upsert:
   ```js
   const rows = [
     { key: 'business_info', value: typeof businessInfo === 'string' ? JSON.parse(businessInfo) : businessInfo, ... },
     // same for branding, company_profile
   ];
   ```

2. **`src/lib/branding.ts`** — Add defensive parse in `getBranding()`:
   ```ts
   const info = typeof raw === 'string' ? JSON.parse(raw) : raw;
   ```
   This catches any existing double-serialized rows without requiring a migration.

### 1D. Fix About-Split Field Path (Already covered by 1A)

The about-split rendering failure is a specific manifestation of the camelCase mismatch. The section checks `companyProfile['about_copy']` but data is stored as `companyProfile.aboutCopy`. The integration-spec fix in 1A ensures future sections read both. For existing deployed sections, the dual-lookup was already manually patched.

---

## Phase 2: Pipeline Robustness

### 2A. Content Integrity False Positives

**Root cause:** `checkForeignBrandNamesOnPage()` regex matches generic renovation language ("Bathroom Renovation", "Kitchen Construction") as foreign brand names. 71-83 false positives per build inflate violation counts.

**File: `tenant-builder/qa/content-integrity.mjs`** (line 410-447):
- Add a `RENOVATION_INDUSTRY_TERMS` whitelist:
  ```js
  const RENOVATION_INDUSTRY_TERMS = new Set([
    'bathroom renovation', 'kitchen renovation', 'basement renovation',
    'home renovation', 'custom renovation', 'full renovation',
    'general construction', 'new construction', 'residential construction',
    'commercial construction', 'custom homes', 'dream homes', 'luxury homes',
    'fine carpentry', 'custom carpentry', 'home builders', 'custom builders',
    'interior renovations', 'exterior renovations',
    // ... comprehensive list
  ]);
  ```
- Before adding a violation, check `if (RENOVATION_INDUSTRY_TERMS.has(candidateLower)) continue;`
- Also skip matches where the suffix word alone triggers (e.g., "renovation" without a company-name-like prefix)
- Make Check 13 warning-only in the summary (don't count toward violation total that affects QA score)

### 2B. Verify Principals Array Fix

**Already fixed** in `scripts/onboarding/provision.mjs` line 128:
```js
principals: Array.isArray(data.principals) ? data.principals.join(', ') : (data.principals || ''),
```
No action needed. Just verify this line exists in the deploy repo.

### 2C. Verify Hotlinked Image Fix

**Already fixed** in Mar 8 batch (Issue #3 in learned-patterns). Verify the `upload-images.mjs` else branches exist in the deploy repo. No new code needed.

---

## Phase 3: Image Pipeline Hardening

### 3A. Pre-flight Image Validation

**New file: `tenant-builder/lib/image-validator.mjs`**
- `validateImageUrls(data)` — HEAD request every image URL in scraped data
- Checks: HTTP 200, content-type is image/*, not base64 data URI, not same URL as logo (hero-is-logo detection), minimum dimensions (200x200 for hero/about, 100x100 for portfolio)
- Returns `{ valid: string[], invalid: string[], replacements: { field: string, reason: string }[] }`

### 3B. Immediate Gemini Fallback

**File: `tenant-builder/provision/provision-tenant.mjs`**
- After `upload-images.mjs`, run `validateImageUrls()` on the provisioned data
- For any invalid hero/about/OG images, call `generate-images.mjs` immediately (not deferred)
- Track provenance: `_image_provenance: { hero: 'scraped' | 'generated' | 'fallback' }`

### 3C. Graceful Image Fallbacks in Sections

**File: `tenant-builder/templates/integration-spec.md`**
- Add rule: "Sections must NEVER return null just because an image is missing. Use a gradient background fallback for hero sections, a placeholder div for gallery items."
- Example fallback pattern:
  ```tsx
  {heroImageUrl ? (
    <Image src={heroImageUrl} alt={branding.name} fill className="object-cover" />
  ) : (
    <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/70" />
  )}
  ```

---

## Phase 4: Architect Blueprint Enrichment

### 4A. Structured Section Specs

**File: `tenant-builder/bespoke-architect.mjs`** — Restructure `buildBespokePrompt()`:
- Change the `customSections[].spec` from free-text to structured JSON:
  ```json
  {
    "sectionId": "custom:example-hero",
    "layout": { "type": "full-width|contained|split", "height": "100vh|auto|60vh", "columns": null, "alignment": "center" },
    "background": { "type": "image-overlay|gradient|solid|none", "overlayOpacity": 0.55 },
    "typography": { "headingSize": "clamp(2.5rem,5vw,3.5rem)", "headingWeight": 700 },
    "spacing": { "paddingY": "5rem", "gap": "2rem" },
    "animations": ["parallax-bg", "stagger-text"],
    "contentMapping": { "heading": "heroHeadline", "image": "heroImageUrl" }
  }
  ```
- Keep free-text `spec` as optional `.describe` field for backward compatibility
- Expand HTML truncation from 2000 -> 4000 chars per page (Opus handles this within 180s)

### 4B. Update Zod Schema

**File: `tenant-builder/schemas/site-blueprint-v2.zod.mjs`**
- Add optional Zod schemas for new structured fields (layout, background, typography, spacing, animations, contentMapping)
- Use `.optional()` on all new fields for backward compatibility
- Keep `.passthrough()` on section spec objects

---

## Phase 5: Premium Animation Patterns

### 5A. Document Available Motion Components

**File: `tenant-builder/templates/integration-spec.md`** — Add "Animations" section:
- Document existing components from `src/components/motion.tsx`: `StaggerContainer`, `StaggerItem`, `FadeInUp`, `FadeIn`, `ScaleIn`
- Prescribed patterns per section type:
  - Hero: parallax background + `StaggerContainer` for text elements
  - Services: `StaggerContainer` + `StaggerItem` for card reveal
  - Testimonials: `FadeIn` per card
  - Gallery: `ScaleIn` for image items
  - CTAs: `FadeInUp` for the block
- Include the md-construction parallax scroll snippet as reference
- Require `useReducedMotion()` accessibility check

### 5B. Premium Interaction Patterns

**File: `tenant-builder/templates/integration-spec.md`** — Add "Interactions" section:
- Hover effects: `hover:scale-[1.02] transition-transform duration-300` on cards
- Image reveal: `hover:brightness-110` on gallery items
- Button effects: `hover:shadow-lg active:scale-95 transition-all`
- Smooth scroll: `scroll-smooth` on section links
- Gradient overlays: `bg-gradient-to-t from-black/60 to-transparent` on image sections

---

## Phase 6: Visual Refinement Loop (Future Session)

### 6A. Anthropic SDK Client

**New file: `tenant-builder/lib/anthropic-client.mjs`**
- Direct Anthropic SDK wrapper (replaces nested `claude -p` subprocess)
- Supports image input (base64-encoded screenshots)
- Avoids the CLAUDECODE env var nested session issue
- Used by both `visual-refine.mjs` and as future replacement for `visual-qa.mjs`

### 6B. Visual Comparison + Refinement

**New file: `tenant-builder/qa/visual-refine.mjs`**
- Takes original + generated screenshots
- Sends to Claude Sonnet 4.6 with structured comparison prompt
- Returns per-section fix instructions: `{ sectionId, severity, issues[], suggestedFixes[] }`
- Called after initial section generation, before provisioning

**File: `tenant-builder/build-custom-sections.mjs`**
- After TypeScript check passes, optional refinement phase:
  1. Spin up local dev server or deploy to Vercel preview
  2. Playwright screenshots of generated site
  3. `visual-refine.mjs` compares against original screenshots
  4. For high-severity sections, call Codex with existing file + fix instructions
  5. Max 2 refinement passes
- Gate behind `--refine` flag (default off for speed, on for quality builds)

---

## Implementation Sequencing

```
Session 1 (NOW):
  Phase 1A: integration-spec.md + build-custom-sections.mjs (camelCase fix)     ~30 min
  Phase 1B: layout.tsx + page-layout.ts + provision-tenant.mjs (double nav)     ~20 min
  Phase 1C: provision.mjs + branding.ts (serialization guard)                    ~10 min
  Phase 2A: content-integrity.mjs (false positive whitelist)                     ~15 min
  Phase 5A-B: integration-spec.md (animation + interaction patterns)             ~15 min
  Verify: 2B (principals), 2C (hotlinked images)                                 ~5 min

Session 2 (follow-up):
  Phase 3: Image pipeline hardening (validator + immediate Gemini fallback)
  Phase 4: Architect blueprint enrichment (structured specs + Zod update)
  Test build: Run pipeline on a new target to validate all fixes

Session 3 (future):
  Phase 6: Visual refinement loop (Anthropic SDK + comparison + auto-refine)
```

## Verification

After Session 1 fixes:
1. Run `node tenant-builder/orchestrate.mjs --url <test-target> --site-id test --tier accelerate --bespoke --skip-git --skip-outreach` on a new target
2. Check generated sections read data correctly (not null)
3. Verify single nav bar renders (not double)
4. Check content-integrity violations < 10 (not 71+)
5. Playwright screenshot comparison vs original
6. Files to sync to deploy repo: `src/app/layout.tsx`, `src/lib/page-layout.ts`, any changed tenant-builder files

## Claude Code vs Codex Decision

**Keep Codex GPT 5.4 for initial section generation** — it handles file creation natively, has near-zero marginal cost (ChatGPT subscription), and the text-only mode generates in 30-120s. **Use Claude Sonnet 4.6 via Anthropic SDK for the visual refinement loop** (Phase 6) — it supports image input for screenshot comparison without the nested-session issue. This is a hybrid approach: Codex generates, Claude refines.

---

**TLDR:** Five root causes drive poor bespoke quality. The single biggest fix is updating `integration-spec.md` with correct camelCase field names — this alone makes sections render content instead of null. Double nav is a simple conditional in layout.tsx. Content integrity false positives need a renovation term whitelist. Premium animations use existing motion components. Visual refinement loop (Phase 6) deferred to a follow-up session after upstream fixes are validated. Session 1 delivers Phases 1, 2, 5 (~90 min). Sessions 2-3 deliver image hardening + architect enrichment + visual refinement.

**Complexity:** HIGH — cross-cutting changes spanning prompt engineering, provisioning, layout rendering, and QA. But each phase is independently shippable. Session 1 alone will dramatically improve build quality.
