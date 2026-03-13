# MD Construction: Cleanup Failed Build + Fix + Rebuild

## Context

The MD Construction bespoke build (2026-03-11) failed. The output looks like a template site — it doesn't match the original website's visual identity. Root causes:
1. All 3 architect strategies timed out → fell back to a static blueprint with only 5 generic sections
2. Codex had no real company data in its prompts → generated generic placeholder copy
3. Custom footer section only rendered on homepage → inner pages had no footer at all
4. 16 minutes wasted on 4 timeouts, build scored 60% match, verdict: NOT READY

**6 fixes were already committed** (ebda50c) addressing timeouts, OKLCH CSS, debug attrs, and the refinement loop crash. **3 more targeted fixes** are needed before the rebuild will produce quality output.

---

## Phase 1: Implement 3 Remaining Fixes (~15 min)

All edits in `~/norbot-ops/products/demo/tenant-builder/`.

### Fix A: Stop Generating Custom Footer Sections

The standard Footer component in layout.tsx renders on all pages. Custom footer sections only render on the homepage via SectionRenderer, causing either double-footer or missing-footer.

**File 1: `bespoke-architect.mjs`**
- In `getFallbackBespokeBlueprint()` (~line 247-252): Remove the `custom:${siteId}-footer` entry from `customSections` array
- In homepage page layout (~line 311): Remove `{ sectionId: \`custom:${siteId}-footer\` }` from the sections array
- In `buildOpusFallbackPrompt()` (~line 165): Add instruction: `"Do NOT create a custom footer section. The platform has a global Footer component."`

**File 2: `lib/gpt54-architect.mjs`**
- In `buildVisionPrompt()` (~line 164): Remove "footer" from the section type enumeration
- In section count guidance (~line 188): Add `"Do NOT include a footer section — the platform has a global Footer."`

**File 3: `build-custom-sections.mjs`**
- In the build loop (~line 143): Add guard to skip any section with "footer" in name/sectionId:
  ```js
  if (spec.name.toLowerCase().includes('footer') || spec.sectionId.includes('-footer')) {
    logger.info(`Skipping custom footer: ${spec.sectionId} (global Footer handles this)`);
    continue;
  }
  ```

### Fix B: Inject Real Scraped Data into Codex Prompts

Codex generates generic copy because it has no company facts. The scraped.json has rich data that should be summarised and injected.

**File: `build-custom-sections.mjs`**
- Load `scraped.json` alongside CSS tokens (~line 88-95)
- Add `buildScrapedSummary(scraped)` helper that extracts: business_name, founded_year, principals, city/province, service_area, phone, email, certifications, service names, about_copy (first 300 chars), tagline, trust metrics
- Inject summary into `buildBespokeCodexPrompt()` between VISUAL SPEC and CSS sections as:
  ```
  ## REAL COMPANY DATA (use these exact facts — do NOT invent copy)
  Company: MD Construction
  Founded: 1987
  Owners: Tom Baines and Jocelyn McTaggart
  ...
  ```
- Pass `scrapedData` through the call chain to the prompt builder

### Fix C (Optional, P3): Content Integrity False Positives

**File: `qa/content-integrity.mjs`**
- In `checkForeignBrandNamesOnPage()` (~line 450): Add filter to skip Canadian province abbreviation prefixes (ON, BC, AB, etc.)
- Strip `__NEXT_DATA__` serialized JSON from bodyText before brand name checking

**Verification:** Run `npm run test:unit` — all 258+ tests should pass.

---

## Phase 2: Cleanup Failed Build (~10 min)

### Step 2.1: Run Existing Cleanup Script

The codebase has `tests/cleanup.mjs` that handles Supabase + proxy + results cleanup:
```bash
cd ~/norbot-ops/products/demo
node tenant-builder/tests/cleanup.mjs --site-id md-construction --all --reset-turso
```

This deletes: admin_settings rows, tenants row, leads, Storage files, proxy.ts entry, results dir, and resets Turso status.

### Step 2.2: Manual Cleanup (not covered by cleanup.mjs)

```bash
cd ~/norbot-ops/products/demo

# Delete custom section files
rm -rf src/sections/custom/md-construction/

# Remove import from registry.ts (keep westmount-craftsmen)
# Edit: src/sections/custom/registry.ts — remove `import './md-construction/index';`

# Remove proxy fragment
rm -f tenant-builder/proxy-fragments/md-construction.txt
rm -f tenant-builder/results/2026-03-11/proxy-fragments/md-construction.json
```

### Step 2.3: Remove Vercel Domain

```bash
curl -X DELETE \
  "https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/md-construction.norbotsystems.com?teamId=${VERCEL_TEAM_ID}" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}"
```

### Step 2.4: Archive Failed Results

```bash
mv tenant-builder/results/2026-03-11/md-construction \
   tenant-builder/results/2026-03-11/md-construction-failed-v1
```

### Step 2.5: Deploy Cleanup

```bash
cd ~/norbot-ops/products/demo
git add -u src/sections/custom/md-construction/ src/sections/custom/registry.ts src/proxy.ts
git commit -m "cleanup: remove failed md-construction bespoke build"
git push origin main
```

Wait for green Vercel build.

### Verification
- `https://md-construction.norbotsystems.com/` returns 404
- No md-construction rows in Supabase admin_settings
- `src/sections/custom/md-construction/` directory gone
- Vercel build is green

---

## Phase 3: Rebuild (~30 min)

```bash
cd ~/norbot-ops/products/demo
node tenant-builder/orchestrate.mjs \
  --url https://mdconstruction1987.com/ \
  --site-id md-construction \
  --tier accelerate \
  --bespoke
```

**Expected improvements:**
- Architect should succeed on first try (2 screenshots, 360s timeout) → 8-10 sections instead of 5
- No custom footer section → standard Footer on all pages
- Codex gets real company data → authentic copy using "MD Construction", "Tom Baines", "St. Thomas, ON"
- OKLCH + debug attr fixes → cleaner generated code
- Enriched fallback (if architect still fails) → includes process_steps, why_choose_us sections

**Monitor during build:**
- Watch for architect timeout (should be fixed, but verify)
- Check section count (target: 8-10, not 5)
- Check Codex output for real company names (not generic)

---

## Phase 4: Post-Build Verification (~10 min)

1. Read `results/{date}/md-construction/go-live-readiness.json` — target: READY or REVIEW (not NOT READY)
2. Read `results/{date}/md-construction/audit-report.md` — check all QA modules
3. Visual inspection of `https://md-construction.norbotsystems.com/`:
   - Hero uses MD Construction branding and real headline
   - Services show actual services (Home Renovations, Additions, etc.)
   - About section mentions Tom Baines and Jocelyn McTaggart
   - Footer renders on ALL pages (standard Footer, not custom)
   - Colours match original site's maroon palette
   - Inner pages (/about, /services, /contact, /projects) all functional with footer
4. Compare match score: target >75% (up from 60%)
5. Compare original vs demo screenshot side-by-side

---

## Critical Files

| File | Phase | Change |
|------|-------|--------|
| `bespoke-architect.mjs` | 1A | Remove footer from fallback blueprint + Opus prompt |
| `lib/gpt54-architect.mjs` | 1A | Remove footer from vision prompt |
| `build-custom-sections.mjs` | 1A, 1B | Footer skip guard + inject scraped data summary |
| `qa/content-integrity.mjs` | 1C | Province abbreviation filter (optional) |
| `src/sections/custom/registry.ts` | 2 | Remove md-construction import |
| `src/proxy.ts` | 2 | Remove md-construction domain mapping |
| `src/sections/custom/md-construction/*` | 2 | Delete directory |

## Reusable Code

| What | Where |
|------|-------|
| Cleanup script | `tests/cleanup.mjs` — handles Supabase + proxy + Turso reset |
| Existing 6 fixes | Commit `ebda50c` — already deployed |
| Scrape data (reusable) | `results/2026-03-11/md-construction/scraped.json` |
| Integration spec (updated) | `templates/integration-spec.md` — OKLCH + debug attr rules |

## Risks

| Risk | Mitigation |
|------|-----------|
| Architect still times out | Enriched fallback now generates 8+ sections (not 5). Opus 360s timeout is generous. |
| Codex ignores scraped data | Review first generated section output; strengthen prompt wording if needed |
| cleanup.mjs doesn't cover all artifacts | Manual steps 2.2-2.3 cover the gaps (custom sections, Vercel domain) |
| Westmount-craftsmen breaks from registry edit | Only removing md-construction import; westmount import untouched |

---

**TLDR:** Clean up the failed md-construction build (Supabase + files + Vercel domain), apply 3 targeted fixes (no custom footer, inject scraped data into Codex, content integrity false positives), then re-run the bespoke pipeline. The 6 timeout/CSS fixes are already deployed. Expected result: READY verdict with 75%+ match score, up from NOT READY at 60%.

**Complexity:** MEDIUM — 3 targeted code changes in well-understood files, straightforward cleanup using existing `tests/cleanup.mjs`, and a standard pipeline re-run. Highest risk: Codex prompt tuning may need iteration.
