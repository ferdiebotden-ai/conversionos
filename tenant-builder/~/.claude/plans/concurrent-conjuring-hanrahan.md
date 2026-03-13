# Pre-Flight Check & Pipeline Hardening for Tonight's 10-Build Batch

## Context

Tonight we're running a batch of 10 autonomous bespoke tenant builds — the highest-quality demos we've done yet. Each must pass 5-gate QA, have working images, Playwright-verified screenshots, and Gmail outreach drafts ready for Ferdie's morning send window.

**Current state (Mar 12 EOD):**
- 34 tenants deployed across proxy.ts
- Today's batch: 1 build (TC Contracting) — NOT READY (VQA 2.83/5, no logo, no hero image, city inconsistency)
- Issue log: 12 entries from today, 6 flagged `permanent_fix_needed: true`
- Deploy repo: clean, main branch, ready to push
- Gmail API: working (OAuth2 functional)
- Playwright: installed, MCP tools available

**Problem:** 6 systemic issues from today's builds will repeat on every batch target if not fixed. The issue log reveals patterns that guarantee sub-4.0 VQA scores.

## 3-Session Overview

| Session | Goal | Outcome |
|---------|------|---------|
| **Session 1 (NOW)** | Pre-flight fixes + validation build | Pipeline hardened, 1 test build passes all 5 gates |
| **Session 2 (NEXT)** | Discover + ICP rank ~1000 targets | Top 30-40 ranked list, ready to build |
| **Session 3 (TONIGHT)** | Batch build top 10, full QA, outreach drafts | 10 LAUNCH-ready demos + 10 Gmail drafts |

---

## Session 1 Plan: Pre-Flight Fixes

### Fix 1: Codex Section IDs as Eyebrow Text (G3 — Copy Accuracy)
**Issue:** Codex writes `custom:go-hard-corporation-services` as visible label text
**File:** `~/norbot-ops/products/demo/tenant-builder/templates/integration-spec.md`
**Fix:** Add rule: "NEVER use the section ID as visible text. Use human-readable labels: 'Our Services', 'Why Choose Us', 'About Us', etc."

### Fix 2: Email Demo Leakage — ferdie@ Default (G3 — Copy Accuracy)
**Issue:** Empty scrape email → `ferdie@norbotsystems.com` appears on contact pages
**Files:**
- `~/norbot-ops/products/demo/tenant-builder/provision/provision-tenant.mjs` — change email fallback from empty string to `info@{scraped-domain}`
- `~/norbot-ops/products/demo/src/lib/company.ts` — change `||` to `??` for email fallback (line ~95)
**Fix:** Derive default email from contractor's domain when scrape returns empty. Never fall back to ferdie@.

### Fix 3: "Not provided" in Address Fields (G3 — Copy Accuracy)
**Issue:** Address shows "Not provided, Owen Sound, ON Not provided"
**File:** `~/norbot-ops/products/demo/tenant-builder/provision/provision-tenant.mjs`
**Fix:** Strip "Not provided" / "Not specified" / "N/A" from address components before storing. If street is unknown, store only city + province.

### Fix 4: Empty Gallery/Service Images Rendering Broken `<img>` (G2 — Image Integrity)
**Issue:** 20+ broken images when portfolio=0 or service image_urls empty
**Files:**
- `~/norbot-ops/products/demo/tenant-builder/provision/provision-tenant.mjs` — remove `gallery:masonry-grid` from page_layouts when portfolio.length === 0
- Standard section components — guard `<img>` with `imageUrl &&` check (or handle at provisioner level by not including gallery sections without images)
**Fix:** Provisioner checks portfolio count before adding gallery sections to page_layouts. If 0 portfolio items, use `cta:full-width-primary` instead.

### Fix 5: `--skip-architect` Breaks Custom Section Build (Critical Path)
**Issue:** `--skip-architect` skips blueprint creation → `buildCustomSections` never runs → zero custom sections despite bespoke mode
**File:** `~/norbot-ops/products/demo/tenant-builder/orchestrate.mjs`
**Fix:** If `--skip-architect` AND Design Director manifest exists, synthesize minimal `site-blueprint-v2.json` from the manifest before the custom sections check.

### Fix 6: Inner Page Headlines Reusing Homepage Hero (G3/G4)
**Issue:** Services/About/Projects pages show "Construction Services in Elora, Ontario" (homepage headline)
**File:** `~/norbot-ops/products/demo/tenant-builder/provision/provision-tenant.mjs`
**Fix:** Set per-page `heroHeadline` in page_layouts config: About → "About {company}", Services → "Our Services", Projects → "Our Projects", Contact → "Get in Touch".

### Fix 7: TypeScript Strict Mode — Bracket Notation + Image Priority
**Issue:** 19 dot-notation errors on `Record<string,unknown>`, Image `priority` prop typing
**File:** `~/norbot-ops/products/demo/tenant-builder/templates/integration-spec.md`
**Fix:** Add explicit rules: "ALL Record<string,unknown> access MUST use bracket notation. Image priority prop: `priority={priority ?? false}`."

### Fix 8: Codex `custom_nav` Flag Should Never Be Set
**Issue:** `custom_nav=true` hides standard nav on inner pages
**File:** `~/norbot-ops/products/demo/tenant-builder/provision/provision-tenant.mjs`
**Fix:** Remove the Step 2d logic that sets `custom_nav: true`. Custom nav sections render via SectionRenderer on homepage only — the standard Header must always render globally.

---

### Validation Build

After all 8 fixes, run a single test build to validate:

```bash
cd ~/norbot-ops/products/demo
node tenant-builder/orchestrate.mjs --url https://tccontracting.ca --site-id tc-contracting --tier accelerate --bespoke --timeout-multiplier 1.5
```

**Success criteria:**
- G1: Hero shows correct business name, logo visible, CTA present
- G2: Zero broken images in Playwright network tab
- G3: No template variables, no ferdie@, no "Not provided", no section IDs as labels
- G4: 5+ sections, footer with contact info, animations present
- G5: Brand colours match original (manual Ferdie review)
- VQA average >= 4.0

If validation build passes, run 5-gate Playwright checks via MCP to double-confirm, take desktop+mobile screenshots, and declare pre-flight complete.

---

### Files to Modify (Summary)

| File | Changes |
|------|---------|
| `tenant-builder/templates/integration-spec.md` | Add section ID label rule, bracket notation rule, Image priority rule |
| `tenant-builder/provision/provision-tenant.mjs` | Email fallback, address cleanup, gallery page_layouts guard, remove custom_nav flag, per-page headlines |
| `src/lib/company.ts` | `\|\|` → `??` for email fallback |
| `tenant-builder/orchestrate.mjs` | Fallback blueprint from DD manifest when --skip-architect |
| `tenant-builder/docs/learned-patterns.md` | Append all 8 fixes as patterns |

---

### Verification Steps

1. After code changes: `cd ~/norbot-ops/products/demo && npm run build` (must pass typecheck)
2. Run validation build (single target, full bespoke pipeline)
3. Playwright MCP: navigate to demo URL, take screenshot, check accessibility tree
4. Check network tab for broken images (G2)
5. Check accessibility tree for template vars, ferdie@, section IDs (G3)
6. Take full-page desktop + mobile screenshots (G4)
7. Compare original vs demo screenshots (G5)
8. If all pass: commit fixes, push to main
9. Declare pre-flight complete, ready for Session 2

---

**TLDR:** 8 systemic pipeline fixes addressing copy accuracy (email leakage, address cleanup, section ID labels, inner page headlines), image integrity (empty gallery guard), build path (--skip-architect fallback), TypeScript strictness, and nav flag. Validation build of TC Contracting confirms all 5 gates pass before tonight's batch. These fixes will prevent the exact failures seen in today's 12 issue log entries from recurring across all 10 targets.
**Complexity:** MEDIUM — 5 files modified, all changes are targeted patches to existing logic. No new architecture. Risk is low since each fix addresses a documented, reproducible issue.
