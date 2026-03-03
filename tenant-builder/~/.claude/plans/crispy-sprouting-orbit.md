# Plan: CCR Feedback — Contrast Fixes + Pipeline Hardening

## Context

User reviewed CCR Renovations demo and found recurring issues: (1) white text on light primary-coloured backgrounds is unreadable across multiple components, (2) CCR-specific copy doesn't reflect their brand ("Excellence, Integrity, Dependability"), (3) sample lead detail page 404s, and (4) QA pipeline misses these problems. The root cause of the contrast issues is systemic — `--primary-foreground` is hardcoded to white in `globals.css` regardless of the primary colour's luminance. One fix in `layout.tsx` heals every affected component at once.

---

## Work Stream 1 — Adaptive Foreground Contrast (platform-wide, highest priority)

**Root cause:** `src/app/globals.css` line 58 hardcodes `--primary-foreground: oklch(0.985 0 0)` (white). Any tenant with a light primary colour (OKLCH L > ~0.6) gets white text on a light background — unreadable.

**Files affected by this one fix:**
- `src/components/ui/button.tsx` — default variant `bg-primary text-primary-foreground`
- `src/components/home/visualizer-teaser.tsx:280` — active style button `bg-primary text-primary-foreground`
- `src/app/page.tsx:286-294` — final CTA section `bg-primary`, text `text-primary-foreground`
- `src/components/admin/sidebar.tsx:104` — active nav item `bg-primary text-primary-foreground`
- `src/app/admin/admin-layout-client.tsx:185` — splash "Start Exploring" button

**Fix: `src/app/layout.tsx` lines 87–97**

Extend the existing `<style>` tag injection to also compute `--primary-foreground` from the OKLCH L channel:

```typescript
// OKLCH format: "L C H" — L is 0 (black) to 1 (white)
const oklchParts = safeOklch.split(/\s+/);
const L = parseFloat(oklchParts[0]);
// Threshold 0.6: above = light colour → dark text; below = dark → white text
const foreground = L > 0.6 ? 'oklch(0.145 0 0)' : 'oklch(0.985 0 0)';
// Inject both variables
`--primary:oklch(${safeOklch});--primary-foreground:${foreground}`
```

No other files need changing. Tailwind's CSS variable references cascade automatically.

---

## Work Stream 2 — CCR Content Fixes (DB + small code change)

### 2a. Hero subheadline — CCR tagline
CCR's website prominently shows "Excellence, Integrity, Dependability." This should appear as the hero subheadline.

`config.heroSubheadline` already exists in `CompanyConfig` (`src/lib/ai/knowledge/company.ts:51`) and is already rendered in `src/app/page.tsx:92`. It just needs to be set in CCR's DB.

**DB fix script** (new file: `tenant-builder/fix-ccr-content.mjs`):
```javascript
// Set heroSubheadline = "Excellence, Integrity, Dependability."
// Set whyChooseSubtitle = "Specialists in all aspects of Durham Home Renovations and Remodelling."
```

### 2b. "Why Choose" section subtitle — make dynamic
**File: `src/app/page.tsx:233-236`** — hardcoded "We combine AI technology..." copy.

**File: `src/lib/ai/knowledge/company.ts`** — add `whyChooseSubtitle?: string` to `CompanyConfig` and read from `company_profile.whyChooseSubtitle` in `getCompanyConfig()`.

**`page.tsx` change:**
```tsx
// Replace hardcoded line 234:
{config.whyChooseSubtitle || `Serving ${branding.city} and surrounding communities with quality craftsmanship.`}
```

**DB fix:** Set `company_profile.whyChooseSubtitle` = "Specialists in all aspects of Durham Home Renovations and Remodelling." for CCR via fix script.

---

## Work Stream 3 — Sample Lead Seeding (operational)

The 4 new tenants (ccr-renovations, md-construction, mccarty-squared-inc, bl-renovations) were provisioned before sample lead seeding was integrated as Step 2c. The lead detail 404 confirms Margaret Wilson's record doesn't exist for these tenants.

**Fix:** Run the idempotent seeder for each:
```bash
node tenant-builder/provision/seed-sample-leads.mjs --site-id ccr-renovations
node tenant-builder/provision/seed-sample-leads.mjs --site-id md-construction
node tenant-builder/provision/seed-sample-leads.mjs --site-id mccarty-squared-inc
node tenant-builder/provision/seed-sample-leads.mjs --site-id bl-renovations
```

---

## Work Stream 4 — Onboarding Pipeline: Capture Company Tagline

CCR's "Excellence, Integrity, Dependability" is a hero tagline. The scraper doesn't currently extract this.

**File: `scripts/onboarding/schema.mjs`** — add `hero_subheadline: z.string().optional()` (tagline/values statement, max 10 words, what the company stands for).

**File: `scripts/onboarding/scrape.mjs`**:
- Add `hero_subheadline` to the scrape schema
- Add to `SAFE_TO_GENERATE` list with prompt: "company tagline or core values (5-8 words, e.g. 'Quality, Integrity, Service' — do NOT generate if not on website)"
- Quality gate: only keep if scraped from actual website content (not AI-generated); AI generation produces it as the hero_subheadline only if the website has a clear tagline

**File: `scripts/onboarding/provision.mjs`** — map `data.hero_subheadline` → `company_profile.heroSubheadline` (only if not already set from hero_headline quality gate fallback).

---

## Work Stream 5 — QA Pipeline Hardening

### 5a. Fix the WCAG contrast check gap
**Current gap:** `live-site-audit.mjs` checks `primary vs white` but NOT `primary-foreground vs primary`. CCR's issue (white text on light primary) would PASS the current check if primary has 3:1+ against white (which it may, as a medium colour).

**Fix: `tenant-builder/qa/live-site-audit.mjs` `checkWcagContrast()`**

After resolving `primaryHex`, also read `--primary-foreground` and check contrast between them:
```javascript
const fgHex = await page.evaluate(() => { /* resolve --primary-foreground to hex */ });
const fgOnPrimary = contrastRatio(fgHex, primaryHex);
if (fgOnPrimary < 4.5) {
  violations.push({ issue: 'primary_foreground_low_contrast', ratio: fgOnPrimary, level: fgOnPrimary < 3.0 ? 'fail' : 'warn' });
}
```

This would have caught CCR's issue at QA time.

### 5b. Expand screenshot coverage
**File: `tenant-builder/qa/screenshot.mjs`**

Current: homepage viewport only (desktop + mobile).
New: full-page screenshots of all 6 pages + 2 interactive states:

```
Pages: /, /services, /projects, /about, /contact, /admin (skip if redirects)
Viewports: desktop (1440×900) + mobile (390×844)
Full-page: true (captures below the fold)
Interactive states (homepage desktop only):
  - Click a style selector button → screenshot "desktop-style-active.png"
```

This gives ~14 screenshots per tenant run instead of 2. Visual QA (Claude Vision) already processes screenshots from the output dir — it will automatically analyse all of them.

### 5c. Add "text_legibility" dimension to visual QA
**File: `tenant-builder/qa/visual-qa.mjs`**

Add a 6th Claude Vision dimension:
```
text_legibility (1-5): Can all text be clearly read? 1 = significant unreadable text (white on light, dark on dark). 3 = minor contrast issues. 5 = all text perfectly legible with good contrast.
```

Update pass threshold to include this dimension and make it a hard gate: `text_legibility < 3` = fail (same as existing rule for any dimension).

---

## Critical Files

| File | Change |
|------|--------|
| `src/app/layout.tsx:87-97` | Adaptive `--primary-foreground` from OKLCH L channel |
| `src/lib/ai/knowledge/company.ts:56` | Add `whyChooseSubtitle?: string` to interface + read from DB |
| `src/app/page.tsx:233-236` | Use `config.whyChooseSubtitle` with generic fallback |
| `tenant-builder/fix-ccr-content.mjs` | NEW: set heroSubheadline + whyChooseSubtitle for CCR |
| `scripts/onboarding/schema.mjs` | Add `hero_subheadline` field |
| `scripts/onboarding/scrape.mjs` | Extract/gate `hero_subheadline` |
| `scripts/onboarding/provision.mjs` | Map `hero_subheadline` → `company_profile.heroSubheadline` |
| `tenant-builder/qa/screenshot.mjs` | Multi-page full-page screenshots + interactive state |
| `tenant-builder/qa/live-site-audit.mjs` | Add `primary-foreground vs primary` contrast check |
| `tenant-builder/qa/visual-qa.mjs` | Add `text_legibility` 6th dimension |

---

## Execution Order

1. `src/app/layout.tsx` — adaptive contrast fix (deploy → all tenants healed immediately)
2. `src/lib/ai/knowledge/company.ts` + `src/app/page.tsx` — whyChooseSubtitle support
3. `tenant-builder/fix-ccr-content.mjs` — seed CCR's content + run it
4. Sample lead seeding — run the 4 seed commands
5. Onboarding pipeline: schema + scrape + provision changes
6. QA pipeline: screenshot + contrast + visual-qa changes
7. `npm run build` → push to main → verify CCR live

---

## Verification

1. **Contrast fix:** Navigate to `ccr-renovations.norbotsystems.com` — hero button, style selector, bottom CTA should all show readable text. Admin sidebar active items should be readable.
2. **CCR content:** Hero subheadline shows "Excellence, Integrity, Dependability." "Why Choose CCR" subtitle shows Durham copy.
3. **Sample leads:** Navigate to admin → leads for ccr-renovations → Margaret Wilson row present → click → lead detail page loads (no 404).
4. **QA dry run:** `node tenant-builder/qa/live-site-audit.mjs --url https://ccr-renovations.norbotsystems.com --site-id ccr-renovations --tier accelerate` → wcag_contrast check should now pass (adaptive foreground fix).
5. **Screenshot coverage:** `node tenant-builder/qa/screenshot.mjs --url https://ccr-renovations.norbotsystems.com --site-id ccr-renovations --skip-upload` → should produce ~14 PNG files across all pages.
6. **Build:** `npm run build` from `src/` — clean.

---

**TLDR:** The contrast problem is one variable in `layout.tsx` — derive `--primary-foreground` from the OKLCH L channel instead of hardcoding white. This fixes every affected component at once. CCR content is a DB fix + one new dynamic field. The QA gap is patched by checking foreground-vs-primary contrast and expanding to full-page multi-page screenshots with a legibility dimension.
**Complexity:** MEDIUM — the contrast fix is trivially simple; most of the work is QA pipeline expansion and onboarding schema additions.
