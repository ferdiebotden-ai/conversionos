# ConversionOS Workflow Audit + Production Readiness Assessment

## Context

Ferdie asked for a full review of the "new and enhanced workflow" — the continuity rebuild model where NorBot rebuilds contractor websites with AI underneath. Three areas to audit: (1) tenant-builder pipeline, (2) dominant-builder workspace, (3) March 8 pivot business docs. Goal: confirm everything is aligned, identify gaps, and determine production readiness.

---

## 1. How the Workflow Actually Works Today

```
Discovery (Firecrawl/Turso)
  → ICP Scoring (6 criteria, 100 pts)
    → Scrape (Firecrawl branding v2 + 7-stage + logo + socials)
      → Quality Gates (6 pre-provision checks)
        → Provision (Supabase + Storage + proxy fragment + sample leads)
          → Deploy (git push → Vercel build → wildcard DNS)
            → QA (9 modules, 30+ checks)
              → Audit Report (READY / REVIEW / NOT READY)
                → Polish Queue (codex-polish/queue/pending/)
                  → Outreach (Gmail draft, CASL-compliant, Ferdie sends manually)
```

**Two builders exist:**
| Builder | Location | Status | Purpose |
|---------|----------|--------|---------|
| **tenant-builder** | `products/demo/tenant-builder/` | **Production** — 12+ tenants deployed, 258 tests | Autonomous end-to-end pipeline (scrape → deploy → QA → outreach) |
| **dominant-builder** | `products/dominant-builder/` | **POC** — 1 shadow run (Oak & Stone), 2 tests | Shadow research for premium Dominate-tier builds. Outputs JSON contracts, not live sites |

**The tenant-builder IS the production pipeline.** The dominant-builder is an experiment that has NOT replaced it.

---

## 2. Document Alignment Audit

### Business docs — THREE versions exist (problem)

| Doc Set | Location | Date | Pricing (Dominate) | Status |
|---------|----------|------|-------------------|--------|
| **business-shift/** | `products/demo/docs/business-shift/` (8 files, untracked) | Mar 5 | $2,500/mo + $20K setup | **STALE** — old pricing, pre-pivot |
| **Business Setup Files/** | `norbot-ops/docs/business-context/March 8 Pivot/Business Setup Files/` (10 files) | Mar 8 | $1,799/mo + $20K setup | **AUTHORITATIVE** |
| **output_pack_2026-03-09/** | `norbot-ops/docs/business-context/March 8 Pivot/norbot_business_output_pack_2026-03-09/` (12 files) | Mar 9 | Matches Mar 8 | **Supporting detail** |

**Key pricing discrepancy in stale docs:**
- `business-shift/README.md` says Dominate = **$2,500/mo** (wrong, now $1,799/mo)
- `business-shift/README.md` says Elevate = **$1,500 activation** (wrong, now $4,500)

### CLAUDE.md files — aligned

| File | Pricing Correct? | Workflow Correct? | Notes |
|------|:-:|:-:|-------|
| `products/demo/CLAUDE.md` | YES | YES | Matches March 8 pivot |
| `products/demo/.claude/CLAUDE.md` | YES | YES | Matches March 8 pivot |
| `tenant-builder/CLAUDE.md` | YES | YES | 18-step pipeline documented |
| `MEMORY.md` (auto-memory) | YES | YES | Pricing table matches |
| `.claude/rules/entitlements.md` | YES | — | $4,500/$12K/$20K/$40K correct |
| `.claude/rules/outreach.md` | YES | YES | CASL, template, slots correct |

### dominant-builder docs — aligned but isolated

| File | Status | Notes |
|------|--------|-------|
| `README.md` | OK | Clear "shadow only, private-preview" |
| `ARCHITECTURE.md` | OK | 5-stage pipeline well-defined |
| `SHADOW_ROLLOUT.md` | OK | Replacement gates defined (90% success, 4.5/5 fidelity, etc.) |
| `AGENTS.md` | OK | "Do not change tenant-builder" rule |
| `BUSINESS_CONTEXT_INDEX.md` | **STALE** | References the older business-shift pricing ($2,500/mo Dominate) |

---

## 3. Production Readiness Assessment

### READY (go ahead and scale)

- **Pipeline orchestration** — 18 steps, error handling, batch/single/discovery modes
- **Concurrency** — Promise pool, configurable workers (default 4)
- **Data quality gates** — 6 pre-provision checks (Mar 8 hardening)
- **QA system** — 9 modules, 30+ checks, READY/REVIEW/NOT READY verdicts
- **Outreach integration** — Gmail drafts, CASL-compliant, 56 template tests
- **Testing** — 258 unit tests (257 passing), 26 integration tests
- **Documentation** — Extensive CLAUDE.md, learned-patterns.md, QA modules docs
- **Deployment** — Wildcard DNS, Vercel project, proxy routing, SSL automation

### GAPS (need fixing before high-volume production)

| # | Gap | Severity | Impact | Fix |
|---|-----|----------|--------|-----|
| 1 | **VQA subprocess fails in nested Claude sessions** | HIGH | Batch builds from Mission Control skip visual QA | Replace `claude -p` subprocess with direct Anthropic API call |
| 2 | **Stale `docs/business-shift/` in demo repo** | MEDIUM | Agents reading these files get wrong pricing ($2,500 vs $1,799 Dominate) | Delete or archive — Business Setup Files are authoritative |
| 3 | **dominant-builder refs stale pricing** | LOW | `BUSINESS_CONTEXT_INDEX.md` still references business-shift pricing | Update to reference March 8 Business Setup Files |
| 4 | **17 untracked files** in demo repo | MEDIUM | Screenshots, codex-polish dir, business-shift docs — uncommitted work at risk | Commit or .gitignore the intentional ones |
| 5 | **QuickBooks sync not built** | MEDIUM | Risk register says "blocks Accelerate promise" | Either build or remove from marketing |
| 6 | **Phone/Twilio voice not live** | LOW | Web voice works on all tiers; phone is Dominate promise | Build when first Dominate client signs |
| 7 | **Polish queue has no operator SOP** | MEDIUM | Ferdie has no documented process for reviewing/clearing queue items | Write 1-page SOP |
| 8 | **codex-polish/ is untracked** | MEDIUM | Post-QA polish queue infrastructure exists but isn't committed | Review and commit |
| 9 | **0 paying clients** | STRATEGIC | Investor memo parked, case studies empty, proof metrics not instrumented | Revenue sprint (07_REVENUE_SPRINT.md) |
| 10 | **Scraper depth** | LOW | Misses deep galleries, sub-page service descriptions (~5% of sites) | Workarounds documented in learned-patterns.md |

---

## 4. Recommended Actions

### Immediate (this session)

1. **Delete or archive `docs/business-shift/`** — it has stale pricing and creates confusion. The authoritative docs are in `norbot-ops/docs/business-context/March 8 Pivot/Business Setup Files/`
2. **Commit the 17 untracked files** — codex-polish infrastructure, screenshots (if intentional), plan files
3. **Update dominant-builder BUSINESS_CONTEXT_INDEX.md** to reference March 8 pricing
4. **Update MEMORY.md** to note the three doc layers and which is authoritative

### Short-term (this week)

5. **Write polish queue SOP** — 1-page doc: how Ferdie reviews queue items, clears them, triggers outreach
6. **Run a 5-target batch build** to validate end-to-end flow with current codebase
7. **Fix VQA subprocess** — replace `claude -p` with direct Anthropic API in `visual-qa.mjs`

### Before revenue sprint

8. **Decide on QuickBooks** — build basic sync or remove from Accelerate marketing
9. **Instrument proof metrics** on first client (Red White Reno?) — leads, time-to-quote, visualizer engagement
10. **Run the 3-week revenue sprint** per `07_REVENUE_SPRINT.md`

---

## 5. Workflow Summary for Ferdie

The system works like this:

1. **Pipeline finds contractors** (Firecrawl discovery or manual URL)
2. **Builder scrapes their website** (brand, colours, services, testimonials, portfolio)
3. **Builder creates their demo** (provisions Supabase, uploads images, registers domain)
4. **Builder deploys to `{slug}.norbotsystems.com`** (git push, Vercel build)
5. **9-module QA runs** (page completeness, content integrity, visual QA, branding, live audit)
6. **Verdict: READY / REVIEW / NOT READY**
7. **If READY: outreach email drafted** (Gmail, Ferdie's exact template, CASL-compliant)
8. **Ferdie reviews draft and sends** (morning window, 7-8am ET)
9. **Call booked, Ferdie closes** (DNS cutover is manual post-sale)

The dominant-builder is a **separate research experiment** for premium Dominate builds. It has 1 shadow run. It does NOT replace the tenant-builder. If it proves superior (90%+ success, 4.5/5 fidelity), learnings merge into the main pipeline.

---

## Verification

After implementing:
- `npm run test:unit` in tenant-builder (258 tests should pass)
- `npm run build` in demo root (typecheck + build)
- Confirm `docs/business-shift/` removed or archived
- Confirm no stale pricing references remain in any CLAUDE.md or MEMORY.md
- Run `node tenant-builder/orchestrate.mjs --audit-only --site-id red-white-reno --url https://red-white-reno.norbotsystems.com --skip-git` to verify QA still passes on existing tenant

---

**TLDR:** The tenant-builder pipeline is production-ready and correctly aligned with the March 8 "Embed in Website" pivot. The dominant-builder is a separate POC (1 shadow run, not production). Main gaps: stale `docs/business-shift/` has wrong pricing ($2,500 vs $1,799 Dominate), 17 untracked files need committing, VQA subprocess needs API replacement for automation, and there's no polish queue SOP for Ferdie. Zero paying clients remains the strategic blocker.

**Complexity:** MEDIUM — mostly cleanup and documentation alignment, one code change (VQA subprocess), no architectural changes needed.
