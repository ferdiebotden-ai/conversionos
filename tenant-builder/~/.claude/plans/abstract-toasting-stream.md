# Tenant Builder Pipeline — Data Quality Hardening Plan

## Context

During a manual polish of 13 demo tenants (Mar 7, 2026), 7 recurring data quality issues were discovered that the autonomous pipeline should have caught and fixed. Six require code changes (one was already fixed on Mar 5). These issues caused: broken images on live sites, missing testimonials, generic portfolio titles, and brand name contamination — all requiring manual Supabase patches post-deploy.

**Goal:** Harden the pipeline so these issues are prevented at provisioning time, not discovered during manual review. All changes are additive — no pipeline restructuring, no new dependencies, no expensive AI calls.

**Research context:** /last30days (Mar 7, 2026) confirmed current best practices favour pre-validation gates over post-hoc QA, file-based checkpoints between pipeline phases, and spec-driven validation. Simon Willison's "Agentic Engineering Patterns" guide (2728 likes) emphasises structured validation at phase boundaries — exactly where our fixes go.

---

## Changes (6 issues, 5 files)

### 1. Testimonial Field Normalization [HIGH IMPACT, LOW RISK]

**Problem:** `filterTestimonials()` expects `author`/`quote` but scrapers produce `name`/`text`/`type`. Testimonials silently drop to `[]`.

**File:** `scripts/onboarding/lib/quality-gates.mjs` (lines 51-57)

**Change:**
- Add `normalizeTestimonial(t)` — maps `name→author`, `text→quote`, `type→project_type`
- Modify `filterTestimonials(raw)` — normalize before filtering

**Existing function to reuse:** None — new pure function.

---

### 2. aboutCopy Type Coercion [HIGH IMPACT, LOW RISK]

**Problem:** `provision.mjs` stores `aboutCopy: data.about_copy || []` but scraper sometimes returns a string. Platform `.map()` crashes.

**File:** `scripts/onboarding/lib/quality-gates.mjs` — add `normalizeAboutCopy(raw)`
**File:** `scripts/onboarding/provision.mjs` (line ~130) — use `normalizeAboutCopy(data.about_copy)` + add import

---

### 3. Hotlinked Image Clear-on-Failure [HIGH IMPACT, LOW RISK]

**Problem:** `upload-images.mjs` — portfolio images correctly clear to `''` on download failure (line 255), but hero/logo/about images keep the broken hotlink URL (lines 215, 222, 229).

**File:** `scripts/onboarding/upload-images.mjs` (lines 212-230)

**Change:** Add `else` branches to hero (line 215), logo (line 222), about (line 229) that clear to `''` and log the failure — matching the portfolio pattern at line 253-255. Add `failedUploads[]` tracking array and print summary. Write `_upload_failures` to output JSON for downstream consumption.

---

### 4. Generic Portfolio Title Diversification [MEDIUM IMPACT, LOW RISK]

**Problem:** `filterPortfolio()` only checks `title.length > 0`. Scraper generates "Custom Renovation" for every item.

**File:** `scripts/onboarding/lib/quality-gates.mjs` (lines 60-65)

**Change:**
- Add `GENERIC_PORTFOLIO_TITLES` constant (10 patterns)
- Add `diversifyPortfolioTitles(portfolio)` — if >50% share the same title, replace with `service_type`/`room_type`-specific titles, fallback to `"Project N"`
- Modify `filterPortfolio()` — call `diversifyPortfolioTitles()` after filtering

---

### 5. Brand Name Leakage Detection [MEDIUM IMPACT, MEDIUM RISK]

**Problem:** Content integrity only checks hardcoded demo strings (NorBot phone, demo images). Doesn't detect other contractors' names leaking into a tenant's data (e.g., "Manzine Contracting" in Ancaster).

**File:** `scripts/onboarding/lib/quality-gates.mjs` — add `detectForeignBrandNames(data, expectedName)`
**File:** `scripts/onboarding/provision.mjs` — add warning log after quality gates
**File:** `tenant-builder/qa/content-integrity.mjs` — add Check 13: rendered-page brand name cross-reference
**File:** `tenant-builder/orchestrate.mjs` — pass `--business-name` flag to content-integrity

**Approach:** Warning-only (not blocking) to avoid false positives from suppliers/partners mentioned in copy. Regex matches contractor-name patterns (`X Contracting`, `Y Renovations`, etc.) that don't match the expected business name.

---

### 6. Upload Failure Logging [LOW-MEDIUM IMPACT, LOW RISK]

**Problem:** Portfolio items with failed uploads are silently dropped. No record of what was lost.

**File:** `scripts/onboarding/upload-images.mjs` (combined with Change 3)

**Change:** Track failures in `failedUploads[]`, print summary, write `_upload_failures` metadata to output JSON.

---

## File Change Summary

| File | Lines Touched | Issues |
|------|---------------|--------|
| `scripts/onboarding/lib/quality-gates.mjs` | Add 4 functions (~60 lines), modify 2 functions | #1, #2, #4, #5 |
| `scripts/onboarding/upload-images.mjs` | Add 3 else branches + tracking array (~20 lines) | #3, #6 |
| `scripts/onboarding/provision.mjs` | 1 import change + 1 line change + 4-line warning block | #2, #5 |
| `tenant-builder/qa/content-integrity.mjs` | Add Check 13 function (~30 lines) + wire into run | #5 |
| `tenant-builder/orchestrate.mjs` | Add `--business-name` flag to content-integrity call (~5 lines) | #5 |

## New Functions

| Function | File | Purpose |
|----------|------|---------|
| `normalizeTestimonial(t)` | quality-gates.mjs | Map `name→author`, `text→quote`, `type→project_type` |
| `normalizeAboutCopy(raw)` | quality-gates.mjs | Coerce string/null/array to string[] |
| `diversifyPortfolioTitles(portfolio)` | quality-gates.mjs | Replace >50% duplicate titles with room-type-specific |
| `detectForeignBrandNames(data, name)` | quality-gates.mjs | Find other contractors' names in text fields |

## Implementation Sequence

1. `quality-gates.mjs` — All 4 new functions + 2 modifications
2. Unit tests — ~20 new test cases in `provision-quality-gates.test.mjs`
3. `upload-images.mjs` — Clear-on-failure + failure tracking
4. `provision.mjs` — Import new functions, use them
5. `orchestrate.mjs` — Pass `--business-name` flag
6. `content-integrity.mjs` — Add Check 13
7. `learned-patterns.md` — Document all 6 patterns with dates

## Verification

```bash
# 1. Unit tests (should add ~20 to existing 223)
cd ~/norbot-ops/products/demo/tenant-builder && npm run test:unit

# 2. Audit-only run on a known-problematic tenant
node tenant-builder/orchestrate.mjs --audit-only \
  --site-id ancaster-home-renovations \
  --url https://ancaster-home-renovations.norbotsystems.com \
  --skip-git

# 3. Full build test (dry run)
node tenant-builder/orchestrate.mjs --target-id 42 --dry-run

# 4. Verify no regressions
npm run build
```

## What This Does NOT Change

- No pipeline restructuring — all changes are additive to existing functions
- No new npm dependencies
- No expensive AI calls (all new logic is pure string matching)
- No scraper changes (normalization happens at quality-gate layer)
- No QA scoring threshold changes
- No database schema changes
- Existing 223 unit tests remain green (backward compatible)

---

**TLDR:** Six additive fixes to 5 pipeline files — normalise testimonial field names, coerce aboutCopy to array, clear broken hotlink URLs for hero/logo/about, diversify generic portfolio titles, detect foreign brand name contamination, and log upload failures. All pure functions, no AI calls, no restructuring. ~20 new unit tests. Prevents the exact data quality issues found during the Mar 7 manual polish of 13 tenants.

**Complexity:** LOW-MEDIUM — All changes are additive pure functions in well-understood files. Brand name detection (Issue #5) has highest false-positive risk but is warning-only. No cross-cutting concerns, no migrations, no infrastructure.
