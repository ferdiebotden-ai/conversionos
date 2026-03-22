# Plan: Pipeline Hardening + Full Draft Tenant Audit & Fix

## Context

Ferdie has ~38 Gmail drafts from March 18-19, each linking to a `{slug}.norbotsystems.com` demo site. The biggest problem: roughly **half show "Tenant not found"** because those slugs are missing from `proxy.ts` (the sole tenant resolution mechanism — Edge Config is not active). Additionally, the pipeline has several systemic bugs that allowed drafts to be created for broken/non-existent sites, and email quality issues (bad names, long company titles, duplicate drafts).

This plan has two work streams executed in sequence:
- **Work Stream A:** Pipeline improvements (prevent future broken drafts)
- **Work Stream B:** Audit & fix all 38 draft tenants (make every draft sendable)

---

## Work Stream A: Pipeline Improvements (11 changes, ~3 hours)

### Phase A1: Outreach Quality Gates (5 changes in 2 files)

**Files:**
- `scripts/outreach/generate-email.mjs`
- `scripts/outreach/outreach-pipeline.mjs`
- `scripts/outreach/tests/test-email-template.mjs`

| # | Fix | File | What |
|---|-----|------|------|
| A1.1 | URL liveness gate | outreach-pipeline.mjs | HTTP GET demo URL before draft creation. Non-200 → skip, set `status = 'demo_unreachable'` |
| A1.2 | Draft dedup | outreach-pipeline.mjs | Check `email_message_id IS NOT NULL` before creating draft. Tighten main query with `AND email_message_id IS NULL` |
| A1.3 | Placeholder email detection | generate-email.mjs | Reject `mymail@mailservice.com`, `info@example.com`, single-char local parts. New HARD STOP |
| A1.4 | Sentinel name "Not" fix | generate-email.mjs | Add `SENTINEL_FIRST_NAMES` set checking extracted first name: not, mr, mrs, the, admin, info, team, etc. |
| A1.5 | Company name truncation | generate-email.mjs | `cleanCompanyName()` — truncate at `|`, ` - `, ` — `. Cap at 50 chars |

**Tests:** ~15 new tests in `test-email-template.mjs`

### Phase A2: Proxy Safety (3 changes in 2 files)

**Files:**
- `tenant-builder/provision/merge-proxy.mjs`
- `tenant-builder/orchestrate.mjs`

| # | Fix | File | What |
|---|-----|------|------|
| A2.1 | Merge-proxy post-write verification | merge-proxy.mjs | After write, read back proxy.ts and verify ALL entries present. Log CRITICAL if any missing |
| A2.2 | Proxy verification after provision | orchestrate.mjs (~line 660) | After merge-proxy, verify each built site-id exists in proxy.ts. Self-heal with emergency fragment if missing |
| A2.3 | SIGPIPE protection | orchestrate.mjs (top) | `process.on('SIGPIPE', () => {})` + CLAUDE.md gotcha: never pipe through `head` |

### Phase A3: Pipeline Reliability (3 changes)

**Files:**
- `tenant-builder/orchestrate.mjs`
- `tenant-builder/config.yaml` (if exists)

| # | Fix | File | What |
|---|-----|------|------|
| A3.1 | Claude CLI pre-flight check | orchestrate.mjs | Run `claude -p 'OK'` before batch. Fail fast if session expired |
| A3.2 | ICP threshold alignment | orchestrate.mjs (~line 226) | Use `icp_routing.tenant_threshold` (55) instead of `manual_review` (65). Add `--min-icp` flag |
| A3.3 | Architect timeout increase | config.yaml or orchestrate.mjs | 300s → 600s for Opus architect timeout |

---

## Work Stream B: Draft Tenant Audit & Fix (~2.5 hours)

### All Draft Tenants (38 unique, from Gmail)

**March 18 batch (10:34am) — 16 tenants:**
| Company | Slug | In Proxy? | Email |
|---------|------|-----------|-------|
| House Renovations | house-renovations | YES | info@house-renovations.ca |
| Hemeryck Homes | hemeryck-homes-construction-ltd | YES | office@hemeryckhomes.ca |
| Tyton Homes | tyton-homes | YES | info@tytonhomes.ca |
| McKegney Contracting | mckegney-contracting | YES | info.mckegneycontracting@gmail.com |
| Germano Creative | germano-creative-interior-contracting-ltd | YES | info@germanocreative.ca |
| Camboia Contracting | camboia-contracting | YES | info@camboia.ca |
| TPM Construction | tpm-construction | YES | info@tpmconstruction.ca |
| Verbeek Kitchens | verbeek-kitchens-and-bath | YES | info@verbeekkitchens.com |
| JFS Construction | jfs-construction | YES | fred@jfsconstruction.ca |
| Family Home Improvements | family-home-improvements | YES | fhi@primus.ca |
| Ostrander Construction | ostrander-construction | YES | ostranderconstruction@gmail.com |
| Bacvar Building | bacvar-building | YES | cameron@bacvarbuilding.com |
| DEP Construction | d-e-p-construction | **NO** | depconstruction@persona.ca |
| Chermark Renovations | chermark-renovations | **NO** | office@chermarkrenovations.com |
| KWC Basements | kwc-basements | **NO** | info@kwcbasements.ca |
| A. MacDonald Construction | a-macdonald-construction | **NO** | a.macdonald.construct@gmail.com |

**March 18 afternoon (4:10pm) — 1 tenant:**
| Ackard Contractors | ackard-contractors | YES | info@ackard.com |

**March 18 evening (6:54pm) — 1 DUPLICATE:**
| House Renovations | house-renovations | YES | info@house-renovations.ca |

**March 19 batch 1 (5-7:22am) — 10 tenants:**
| Company | Slug (estimated) | In Proxy? | Email |
|---------|------|-----------|-------|
| Donmoyer Construction | donmoyer-construction | YES | mike@donmoyerconstruction.com |
| SAMandREZ | samandrez | **NO** | info@samandrez.com |
| M&J Contracting | m-and-j-contracting | **NO** | mike@mandjcontracting.ca |
| Stonewood Development | stonewood-development-corp | **NO** | stonewoodjohn@shawbiz.ca |
| The House Enhancer | the-house-enhancer | **NO** | info@thehouseenhancer.ca |
| Newfore | newfore | **NO** | info@newfore.com |
| BMMB Construction | bmmb-construction-group | **NO** | info@bmmb.ca |
| Seaside Renovations | seaside-renovations | **NO** | rasuli@seasiderenovations.ca |
| PD Renovations | pd-renovations | **NO** | info@pdrenovations.ca |
| Borman Construction | borman-construction | **NO** | contact@bormanconstruction.ca |

**March 19 batch 2 (8:00am) — 3 tenants:**
| Frameworks Renovation | frameworks-renovation | **NO** | frameworksrenovation@gmail.com |
| KW Renovations | kw-renovations | **NO** | info@kwrenovations.ca |
| Oak 42 | oak-42 | **NO** | info@oak42.ca |

**March 19 batch 3 (11:42am) — 7 tenants:**
| Paul's Contracting | paul-s-contracting | YES | paul@paulscontracting.net |
| Total Living Concepts | total-living-concepts | **NO** | info@totallivingconcepts.com |
| Mastered Home Renovations | mastered-home-renovations | **NO** | info@masteredhomerenovations.ca |
| Gilbert + Burke | gilbert-burke | YES | info@gilbertburke.ca |
| Yorkland Homes | yorkland-homes | **NO** | info@yorklandhomes.ca |
| RTC Renovations | rtc-renovations | **NO** | sales@rtcrenovations.ca |
| Menno S. Martin | menno-s-martin-contractor-ltd | **NO** | art@mennosmartin.com |

### Summary: 21 IN proxy, 17 NOT in proxy, 1 duplicate

### Email Issues Found in Drafts
1. "Hi Not," (Frameworks Renovation) — sentinel name bug
2. "SAMandREZ | Premium Kitchen, Bathroom & Flooring Renovations..." — full title as company name
3. "About M & J Contracting: Family-Owned Excellence - M&J" — full title as company name
4. "Custom Home Builder in Simcoe County, Ontario - Gilbert + Burke" — full title
5. Duplicate draft for House Renovations (Mar 18 morning + Mar 18 evening)

---

### Phase B0: Pre-Flight Audit (parallel, ~10 min)

Run 3 parallel checks:

**B0.1: HTTP liveness** — curl all 62 proxy tenants + all 17 missing slugs
```bash
for slug in <all-slugs>; do
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://${slug}.norbotsystems.com")
  echo "$status $slug"
done
```

**B0.2: Supabase data check** — query `admin_settings` for all 38 draft tenant slugs
```bash
source ~/Norbot-Systems/products/conversionos/pipeline/scripts/.env
# Check each slug for required keys
```

**B0.3: Vercel deployment status** — confirm latest deploy is READY (not ERROR)
```bash
cd ~/norbot-ops/products/demo && vercel ls --prod | head -5
```

**B0.4: Check Turso for target data** — get original URLs for all draft targets
```bash
# Query Turso for slug, original_url, icp_score, status for each target
```

This classifies each tenant into a fix bucket:
- **Bucket A: Working** — HTTP 200 + Supabase data + in proxy → quality review only
- **Bucket B: Deploy broken** — in proxy + Supabase data + non-200 → fix Vercel
- **Bucket C: Missing from proxy** — NOT in proxy + Supabase data → add proxy + domain + deploy
- **Bucket D: Has scraped data** — NOT in proxy + no Supabase + has results/scraped.json → re-provision
- **Bucket E: No data at all** — NOT in proxy + no Supabase + no scraped data → full build

### Phase B1: Fix Deployment Baseline (~15 min)

1. Verify Vercel deployment is READY. If ERROR → fix TypeScript error, push, wait for READY
2. Verify all Bucket B tenants (in proxy but 404) resolve after latest deploy
3. If still 404, check for proxy.ts corruption or Edge Config issues

### Phase B2: Batch Proxy.ts + Domain Registration (~20 min)

**Single atomic operation for ALL missing proxy entries:**

1. Identify exact slugs for all Bucket C + D + E tenants (from Supabase check + Turso query)
2. Edit `proxy.ts` in BOTH repos simultaneously — add all missing entries to `DOMAIN_TO_SITE_FALLBACK`
3. Register Vercel domains for each new entry: `node scripts/onboarding/add-domain.mjs --domain {slug}.norbotsystems.com --site-id {slug}`
4. Single commit + push to deploy repo
5. Wait for READY
6. Verify HTTP 200 for all new entries

**Risk mitigation:**
- Backup proxy.ts before editing
- Add entries only (never remove)
- After deploy, re-check ALL 62+ tenants (not just new ones)

### Phase B3: Provision Missing Tenants (~45 min, parallel)

**Bucket D (has scraped data, ~4-5 tenants):**
Re-provision from cached `results/{date}/{slug}/scraped.json`:
```bash
node tenant-builder/provision/provision-tenant.mjs --site-id {slug} --tier accelerate
```

**Bucket E (no data, ~13 tenants):**
Full pipeline builds from Turso original URLs:
```bash
node tenant-builder/orchestrate.mjs --url {url} --site-id {slug} --tier accelerate --skip-outreach --skip-polish --concurrency 4
```

After provisioning, re-run Phase B2 for any new proxy entries, then deploy again.

### Phase B4: Quality Verification (~30 min, parallel)

For EVERY draft tenant (all 38), verify:
1. HTTP 200 ✓
2. Correct company name (not "NorBot" or "ConversionOS")
3. Logo legible in header (exists, non-zero size, sufficient contrast)
4. Real hero image (not AI-generated logo, not generic stock)
5. Sections present: hero, services, about, testimonials, contact
6. Chat widget loads
7. Mobile responsive at 375px

Use existing QA: `node tenant-builder/orchestrate.mjs --audit-only --site-id {slug} --url https://{slug}.norbotsystems.com --skip-git`

For logo/contrast specifically, use Playwright screenshots and visual inspection.

### Phase B5: Email Draft Cleanup (~20 min)

1. **Delete duplicate** House Renovations draft (keep the newer one from Mar 18 evening)
2. **Flag bad emails:** "Hi Not," draft for Frameworks Renovation (needs re-generation after sentinel fix)
3. **Flag long company names:** SAMandREZ, M&J Contracting, Gilbert+Burke drafts (need re-generation after truncation fix)
4. **Re-generate fixed drafts** after Work Stream A pipeline improvements are deployed
5. **Final verification:** Every draft has a working URL confirmed by curl

---

## Execution Strategy

### Agent Usage
- **Phase B0:** 3 parallel subagents (HTTP checks, Supabase queries, Turso queries)
- **Phase B2:** Sequential (proxy.ts edit must be atomic)
- **Phase B3:** `orchestrate.mjs --concurrency 4` for parallel builds
- **Phase B4:** Parallel QA audit subagents (groups of 10 tenants each)
- **Phase B5:** Sequential (Gmail API operations)

### Deploy Sequence
1. Work Stream A changes → commit + sync-deploy → Vercel READY
2. Work Stream B proxy.ts additions → commit to deploy repo → Vercel READY
3. Work Stream B new provisions → commit + sync-deploy → Vercel READY
4. Final HTTP liveness check for ALL tenants

### Key Files Modified
- `scripts/outreach/generate-email.mjs` — sentinel names, placeholder emails, company name truncation
- `scripts/outreach/outreach-pipeline.mjs` — URL liveness gate, draft dedup
- `scripts/outreach/tests/test-email-template.mjs` — 15 new tests
- `tenant-builder/orchestrate.mjs` — proxy verification, SIGPIPE, pre-flight, ICP threshold
- `tenant-builder/provision/merge-proxy.mjs` — post-write verification
- `src/proxy.ts` (both repos) — add ~17 missing tenant entries

---

## Verification

After all work is complete:
1. `npm run build` passes clean in deploy repo
2. ALL 38 draft tenant URLs return HTTP 200
3. No "Tenant not found" on any draft URL
4. Each tenant shows correct company name + logo
5. Each tenant has hero, services, testimonials, contact sections
6. Email template tests pass (`node scripts/outreach/tests/test-email-template.mjs`)
7. No regression on existing 62 tenants (full HTTP sweep)

---

**TLDR:** Two work streams — (A) 11 pipeline improvements preventing future broken drafts (URL liveness gate, dedup, placeholder rejection, sentinel name fix, company name truncation, proxy safety, SIGPIPE protection, CLI pre-flight, ICP alignment, architect timeout); (B) audit all 38 Gmail draft tenants, add ~17 missing proxy.ts entries, provision ~13 tenants with no Supabase data, run quality verification on all, clean up email drafts. The root cause of "Tenant not found" is missing proxy.ts entries — a single batch edit + deploy fixes the majority. Estimated ~5.5 hours total.

**Complexity:** HIGH — touches outreach pipeline, orchestrator, proxy system, Supabase provisioning, Vercel deployment, Gmail drafts, and quality verification across 38 tenants. Each individual change is low-risk, but the volume and cross-cutting nature requires careful sequencing.
