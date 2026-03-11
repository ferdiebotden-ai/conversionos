# Session Handoff — March 11, 2026

**From:** Session 4-5 (Opus 4.6, bespoke pipeline builds + deployment)
**To:** Fresh agent — enhance pipeline, fix known issues
**Goal:** Codify learned-patterns into the pipeline code so these issues don't recur

---

## What Was Accomplished

Two bespoke tenant builds completed end-to-end with the Phase 1-3 pipeline:
- **MD Construction** (11 custom sections, burgundy `oklch(0.42 0.08 14)`, Poppins/Inter)
- **Westmount Craftsmen** (13 custom sections, blue `oklch(0.37 0.17 262)`, Raleway/Mulish)

Both are deployed and live on `{slug}.norbotsystems.com`. Both received QA verdict: REVIEW.

### Commits (deploy repo: `~/norbot-ops/products/demo/`)
- `de07281` — feat: Phase 1-3 + bespoke sections (49 files, +5,385 lines)
- `5939dba` — fix: custom section camelCase config field reads + Westmount branding

---

## Priority 1: Bugs to Fix (Blocking Quality)

### 1. Double Navigation Bar
**Impact:** Every bespoke tenant shows two nav bars — standard nav in `<banner>` + custom nav in `<main>`.
**Root cause:** `page_layouts` includes a `custom:{siteId}-nav` section AND the standard nav renders unconditionally from `layout.tsx`.
**Fix options:**
- A) Hide standard nav when `page_layouts` includes a `custom:*-nav` section (check in layout.tsx)
- B) Remove `custom:*-nav` from page_layouts (let standard nav handle it)
- Recommendation: Option A is cleaner — the bespoke nav matches the original site's style

### 2. camelCase vs snake_case Config Mismatch (Systemic)
**Impact:** Custom sections fail to read data → return null → blank sections.
**Root cause:** Provisioner stores `heroHeadline`, `heroImageUrl`, `aboutCopy`. Codex writes sections reading `hero_headline`, `hero_image_url`, `about_copy`.
**Already fixed in:** MD Construction hero, Westmount hero, Westmount about-split (manual dual-format reads)
**Systemic fix needed:** Update `templates/integration-spec.md` to list the EXACT camelCase field names the provisioner uses. Add a code review step in `build-custom-sections.mjs` that validates generated sections read the correct field names.

### 3. business_info Double-Serialization
**Impact:** `getBranding()` falls back to "ConversionOS Demo" because `business_info.value` is a JSON string, not object.
**Root cause:** `provision-tenant.mjs` sometimes `JSON.stringify()`s the value before Supabase upsert, creating `"{\"name\":\"Foo\"}"`.
**Fix:** In `provision-tenant.mjs`, ensure `business_info` value is always a plain object, never a string. Add a guard: `typeof val === 'string' ? JSON.parse(val) : val`.
**Affected tenant:** westmount-craftsmen (fixed manually via Supabase PATCH)

### 4. About-Split Section Not Rendering (Westmount)
**Impact:** About section is blank despite data existing.
**Root cause:** The camelCase fix was applied for root-level `aboutCopy`, but the section checks `configRecord['company_profile']['about_copy']` first (nested path). The provisioner stores about_copy at the root of company_profile, not nested further.
**Fix:** Trace the exact data path from Supabase → SectionRenderer config prop → about-split section. Ensure the field access matches where the data actually lives.

---

## Priority 2: Data Issues (Quick Supabase Fixes)

### 5. Trust Metrics Showing Zero (MD Construction)
MD Construction shows 0.0/0+/0+/0% in trust badge section. Data exists in Supabase as `trustMetrics` (camelCase) but the standard trust section reads `trust_metrics` or specific keys like `google_rating`, `projects_completed`. Check the section component to find the expected field names, then verify the Supabase data matches.

### 6. Empty Gallery/Testimonials (Both Tenants)
`portfolio: []` and `testimonials: []` in `company_profile`. Not a code bug — the scraper didn't capture this data. Options:
- Re-scrape with gallery-specific discovery (check `/gallery`, `/portfolio`, `/our-work` pages)
- Use `upgrade-tenant-gallery.mjs` to manually add portfolio images
- Leave as-is and rely on other sections for the demo

---

## Priority 3: Pipeline Codification (Prevent Recurrence)

These patterns from `docs/learned-patterns.md` should be codified into pipeline code:

### 7. Content Integrity False Positives (71-83 per build)
**Pattern:** `checkForeignBrandNamesOnPage()` fires on "Bathroom Renovation", "Request a Free Estimate", "Port Stanley ON Renovation Contractor" — generic renovation industry language, not actual brand leakage.
**Fix:** Tune the foreign brand detector to only flag when another contractor's actual business name appears. Add a whitelist of common renovation terms. Or make it warning-only (not counted in the score).

### 8. Principals Stored as Array
**Pattern:** `data.principals` from scraping is sometimes an array `['Adam']`. `provision.mjs` assigns it verbatim. About page `getInitials(name.trim())` crashes on an array.
**Fix:** In `provision.mjs`: `Array.isArray(p) ? p.join(', ') : p`

### 9. Hotlinked Images Not Cleared on Failure
**Pattern:** `upload-images.mjs` clears portfolio images on download failure but keeps broken URLs for hero, logo, about images.
**Status:** Fix was committed in Mar 8 batch but verify it's actually deployed.

### 10. Service Descriptions Empty After Scrape
**Pattern:** Firecrawl only scrapes homepage — service sub-page descriptions are missed. `filterServices()` drops services with `description.length < 10`.
**Long-term fix:** Scraper should follow service sub-page links and capture descriptions.

---

## Priority 4: Architecture Improvements

### 11. Codex Prompt Enhancement for Config Fields
The Codex prompt in `build-custom-sections.mjs` should include:
- Exact field names from company_profile (camelCase): `heroHeadline`, `heroImageUrl`, `heroSubheadline`, `aboutCopy`, `aboutImageUrl`, `services`, `testimonials`, `portfolio`, `trustMetrics`
- Pattern for dual-format reads: always check both `c['snake_case']` and `c['camelCase']`
- Bracket notation requirement for `Record<string, unknown>` in TypeScript strict mode

### 12. Deploy Repo Sync Automation
Currently manual: run pipeline → files land in wrong dir → manually sync → push. Options:
- Fix `DEMO_ROOT` in orchestrate.mjs to point to `~/norbot-ops/products/demo/`
- Or add a `--deploy-root` flag
- Or create a sync script that rsyncs the right files

### 13. Visual QA Nested Session Issue
`visual-qa.mjs` uses `claude -p` subprocess. When called from within an active Claude Code session, it fails silently (CLAUDECODE env var conflict). Current workaround: strip CLAUDECODE env var before calling. Long-term: use Anthropic SDK directly instead of spawning CLI.

---

## Files You'll Need

```
# Pipeline code (working dir: ~/Norbot-Systems/products/conversionos/)
tenant-builder/orchestrate.mjs          # Master orchestrator
tenant-builder/bespoke-architect.mjs     # Opus architect
tenant-builder/build-custom-sections.mjs # Codex section builder
tenant-builder/provision/provision-tenant.mjs
tenant-builder/scrape/scrape-enhanced.mjs
tenant-builder/scrape/css-extract.mjs
tenant-builder/templates/integration-spec.md  # Codex prompt rules
tenant-builder/lib/env-loader.mjs       # Env var paths
tenant-builder/qa/content-integrity.mjs  # Foreign brand detector
tenant-builder/qa/visual-qa.mjs

# Deploy repo (what Vercel sees: ~/norbot-ops/products/demo/)
src/sections/register.ts                # Section registration
src/sections/custom/registry.ts         # Auto-generated imports
src/sections/custom/{siteId}/           # Generated tenant sections
src/sections/custom/{siteId}/index.ts   # registerSection() calls
src/app/layout.tsx                      # Standard nav rendering
src/lib/branding.ts                     # getBranding() + fallbacks
```

---

## How to Verify Fixes

```bash
# Check a live tenant
open https://md-construction.norbotsystems.com
open https://westmount-craftsmen.norbotsystems.com

# Run QA audit only (no rebuild)
cd ~/norbot-ops/products/demo
node tenant-builder/orchestrate.mjs --audit-only --site-id md-construction --url https://md-construction.norbotsystems.com --skip-git

# Check Supabase data
source pipeline/scripts/.env  # or wherever SUPABASE vars live
curl -s "https://ktpfyangnmpwufghgasx.supabase.co/rest/v1/admin_settings?site_id=eq.md-construction&select=key,value" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq .
```

---

## What NOT to Change

- Standard section components (`src/sections/`) — these work for all tenants
- SectionBaseProps interface — bespoke sections depend on this contract
- Multi-tenancy system (proxy.ts, admin_settings schema) — production tenants depend on this
- Outreach email template — Ferdie's exact words, needs his approval to change

---

**TLDR:** Two bespoke tenants deployed (REVIEW verdict). 6 known bugs to fix (double nav, camelCase config, double-serialization, about-split rendering, trust metrics, empty data). 4 pipeline improvements to codify (content integrity false positives, principals array, config field docs in Codex prompt, deploy repo sync). Start with Priority 1 bugs — they're the most visible quality issues.
