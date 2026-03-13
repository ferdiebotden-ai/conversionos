# Session Handoff — Session 15 → Session 16 (Mar 12, 2026)

## Copy-paste this as your opening prompt:

---

You are the Mission Director for NorBot Systems. Load /mission-director skill. Read `tenant-builder/docs/session-handoff-2026-03-12-s15.md` and `tenant-builder/docs/learned-patterns.md` first.

## What just happened (Session 15 — Pre-Flight)

8 systemic pipeline fixes were applied, committed (c72e75a), and pushed to the deploy repo (`~/norbot-ops/products/demo/`). Vercel is building now. All fixes address `permanent_fix_needed: true` issues from today's issue log. Next.js build passes clean. Zero new TS errors.

Fixes: email demo leakage (deriveEmail), address cleanup (cleanAddress), gallery guard (portfolio=0), --skip-architect fallback (synthetic blueprint from DD manifest), inner page headlines (per-page), custom_nav removal (never set), section ID labels (human-readable), TS strict mode rules (bracket notation + Image priority).

## What to do now (Session 16 — Discovery + ICP Ranking)

**Goal:** Discover ~1000 renovation contractors within our geographic rings, ICP-score them all, and produce a ranked shortlist of the top 30-40 for tonight's batch build.

### Step 1: Expand discovery across all geographic rings

```bash
cd ~/norbot-ops/products/demo

# Ring 1 (closest — Stratford corridor): 10 cities
node tenant-builder/discover.mjs --cities "Stratford,Woodstock,Kitchener,Waterloo,Cambridge,Guelph,New Hamburg,Listowel,Mitchell,Tavistock" --limit 10

# Ring 2 (medium — surrounding region): 14 cities
node tenant-builder/discover.mjs --cities "London,Brantford,Hamilton,Fergus,Orangeville,Ingersoll,Tillsonburg,St. Thomas,Elmira,Elora,Paris,Simcoe,Norfolk,Exeter" --limit 10

# Ring 3 (far — GTA + major centres): 7 cities
node tenant-builder/discover.mjs --cities "Toronto,Oakville,Burlington,Barrie,Kingston,Mississauga,Brampton" --limit 5
```

Use `--limit 10` for Ring 1-2, `--limit 5` for Ring 3 (lower priority). This should yield 200-300 raw targets.

### Step 2: ICP-score all unscored targets

```bash
node tenant-builder/icp-score.mjs --all --limit 500
```

ICP scoring uses 6 criteria (total 130 pts): geography, company size, web sophistication gap, contact completeness, Google reviews, marketing sophistication. Threshold: auto_proceed >= 85, manual_review >= 65.

### Step 3: Filter and rank

Query Turso for all targets with icp_score >= 65, sorted descending. Filter out:
- Already built (status = 'demo_built', 'bespoke_ready', etc.)
- Already in proxy.ts (34 tenants currently deployed)
- No website or dead website (4xx/5xx)

### Step 4: Produce the shortlist

Output a ranked list of top 30-40 targets with:
- company_name, city, website, icp_score, google_reviews, google_rating
- Flag any with missing contact info (will be skipped by outreach hard stops)
- Note which have portfolio/gallery pages (better bespoke results)

### ICP Profile (Our Ideal Customer)

We want contractors who:
- Have a decent website already (shows they invest in marketing)
- Are clearly established (Google reviews, years in business)
- Have portfolio/gallery photos (critical for bespoke visual matching)
- Are in renovation/remodelling (not just general contracting)
- Are within our geographic rings (prefer Ring 1-2 over Ring 3)

**Reject:** directory listings, one-page sites, no phone number, under 5 Google reviews.

## Key references

| File | What |
|------|------|
| `tenant-builder/config.yaml` | ICP scoring weights, geographic rings, discovery search templates |
| `tenant-builder/docs/learned-patterns.md` | 40+ patterns including all 8 Session 15 fixes |
| `tenant-builder/docs/icp-scoring.md` | Full ICP scoring methodology |
| `tenant-builder/CLAUDE.md` | Pipeline architecture, quick start, model usage |
| Deploy repo | `~/norbot-ops/products/demo/` (GitHub: ferdiebotden-ai/conversionos.git) |
| Issue log | `tenant-builder/results/2026-03-12/issue-log.jsonl` (12 entries from today) |

## After this session

Session 17 will be the batch build: take the top 10-15 from the ranked list and run:
```bash
node tenant-builder/orchestrate.mjs --batch --limit 10 --bespoke --timeout-multiplier 1.5
```

Full QA (5-gate RALPH loop), Playwright screenshots, and Gmail outreach drafts for each.

## Current infrastructure status

- Deploy repo: clean, main branch, c72e75a (8 pre-flight fixes)
- Vercel: building from latest push
- Gmail API: working (OAuth2)
- Playwright: installed, MCP tools available
- 34 tenants in proxy.ts
- Turso CRM: active, targets table has existing ICP scores

---
