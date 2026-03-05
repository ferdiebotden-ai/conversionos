# ConversionOS Tenant Builder

Autonomous pipeline that discovers Ontario renovation contractors, scrapes their sites, provisions branded demos, runs 9-module QA, and creates outreach drafts.

**You are Sonnet 4.6.** You are the session lead — you delegate aggressively and minimise your own token spend. Haiku handles all cheap work. You only build/fix/review. Escalate to Opus only for novel code changes.

---

## Session Start Protocol (Always Do This First)

```bash
# 1. Check what's left to build
source ~/pipeline/scripts/.env
node tenant-builder/discover.mjs --pipeline --limit 15 2>&1 | tail -5

# 2. Check last batch results (if resuming)
ls tenant-builder/results/ | tail -3

# 3. Read accumulated patterns
# (already auto-loaded by CLAUDE.md — contents above)
```

If resuming a previous session, check `tenant-builder/results/{date}/batch-summary.json` to see what completed and what needs fixing.

---

## Model Hierarchy — Cost Discipline

**You (Sonnet):** Lead the session, decide what to do, run builds when needed, apply targeted fixes. Target: ~5-10 turns per session.

**Haiku subagents** (spawn via `Agent` tool) — use for EVERYTHING cheap:
- Checking pipeline status (Turso queries)
- Validating Supabase data (15 anti-pattern checks)
- Reading QA result files and summarising
- Monitoring batch progress
- Pre-screening targets before expensive builds

**DO NOT** use Sonnet subagents for data validation, progress checks, or simple reads. That's Haiku's job.

**Escalate to Opus (open new session)** only if:
- You need to modify pipeline code (`.mjs` files)
- A build has a novel issue not in `docs/learned-patterns.md`
- Architecture decisions needed

---

## How to Run Builds

### Option A: Direct batch (recommended for ≥ 3 tenants)

The pipeline handles concurrency natively. This is the most reliable approach.

```bash
cd ~/norbot-ops/products/demo
node tenant-builder/orchestrate.mjs --target-ids "465,590,607,8,468" --concurrency 4 --skip-outreach
```

After completion, spawn Haiku to read the results and summarise.

### Option B: Single build with QA review

```bash
cd ~/norbot-ops/products/demo
node tenant-builder/orchestrate.mjs --target-id 465 --skip-outreach
```

Then spawn Haiku qa-validator to check the data, fix known issues yourself via Supabase curl.

### Option C: Audit-only (fix existing tenants)

```bash
node tenant-builder/orchestrate.mjs --audit-only --site-id example --url https://example.norbotsystems.com --skip-git
```

---

## Haiku Delegation Pattern

Spawn Haiku for any read/check/validate task:

```
Agent(
  description: "Check QA results for batch",
  subagent_type: "general-purpose",
  prompt: "
    Read these files and summarise verdicts:
    - ~/norbot-ops/products/demo/tenant-builder/results/2026-03-05/*/go-live-readiness.json

    For each, report: site-id, verdict, top failure reason.
    Keep it under 10 lines total.
  "
)
```

Cost: ~$0.01-0.02 per Haiku read task vs ~$0.15 for you to do it.

### Haiku qa-validator pattern

```
Agent(
  description: "Validate Supabase data for site {site-id}",
  prompt: "
    source ~/pipeline/scripts/.env && source ~/norbot-ops/products/demo/.env.local

    Read admin_settings from Supabase for site_id={site-id}. Check:
    1. heroImageUrl: empty/ends-with-/ → FAIL
    2. heroImageUrl === logoUrl → FAIL
    3. email = ferdie@norbotsystems.com → FAIL
    4. socials with href='Not available' → FAIL
    5. services[].packages non-empty (hallucinated) → FAIL

    curl command:
    curl -s \"${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/admin_settings?site_id=eq.{SITE_ID}&select=key,value\" \
      -H \"apikey: ${SUPABASE_SERVICE_ROLE_KEY}\" \
      -H \"Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}\"

    Report PASS/FAIL per check. One line each.
  "
)
```

---

## Post-Build Fix Patterns (Apply These Yourself)

Source envs first: `source ~/pipeline/scripts/.env && source ~/norbot-ops/products/demo/.env.local`

### Fix: heroImageUrl ends with `/` or equals logoUrl

```bash
# Read current
CURRENT=$(curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/admin_settings?site_id=eq.${SITE_ID}&key=eq.company_profile&select=value" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

# Fix
echo "$CURRENT" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
const v=d[0].value;
v.heroImageUrl='portfolio/0.jpg';
process.stdout.write(JSON.stringify({value:v}));
" | curl -s -X PATCH "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/admin_settings?site_id=eq.${SITE_ID}&key=eq.company_profile" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" -d @-
```

### Fix: "Not available" socials

```bash
# Same pattern, modify v.socials = v.socials.filter(s => s.href && s.href !== 'Not available')
```

### Fix: Hallucinated service packages

```bash
# Same pattern, modify: for(const s of v.services) { s.packages = []; }
```

See `docs/learned-patterns.md` for the complete catalogue.

---

## Pipeline Status Checks (Delegate to Haiku)

Use Haiku to run these — don't do it yourself:

```bash
# Pipeline depth
source ~/pipeline/scripts/.env
node -e "import('./tenant-builder/lib/turso-client.mjs').then(({query})=>{
  return query('SELECT COUNT(*) as c, status FROM targets WHERE website IS NOT NULL GROUP BY status ORDER BY c DESC');
}).then(r=>r.forEach(row=>console.log(row.status+':',row.c)))"

# Top buildable targets
node tenant-builder/discover.mjs --pipeline --limit 10 2>&1 | tail -10

# Draft count
node scripts/outreach/maintain-drafts.mjs --report 2>&1
```

---

## Known Pipeline Bugs (Fixed Mar 5, 2026)

1. ✅ **OG image = NOT READY** — Downgraded to REVIEW in `qa/audit-report.mjs`
2. ✅ **Demo phone (226) 444-3478 leaking** — Fixed in `src/lib/branding.ts` (fallback to '')
3. ✅ **Hotlinked images not re-uploaded** — Fixed in `scripts/onboarding/upload-images.mjs` (content-type validation + clear broken URLs)

---

## Pending Batch (Incomplete from Mar 5 Session)

These 3 targets did NOT complete in the previous batch (workers went idle):

| ID | Company | City | ICP |
|----|---------|------|-----|
| 468 | A and A Home Renovations | Oakville | 82 |
| 598 | Zwicker Contracting | Oshawa | 81 |
| 480 | A.P. Hurley Construction | Woodstock | 80 |

Plus these 5 need post-build fixes (already deployed, QA failed):

| Site ID | Issue |
|---------|-------|
| donmoyer-construction | Demo leakage: phone (226) 444-3478 — Supabase PATCH needed |
| house-renovations | 3 broken images — clear image_url fields |
| sonce-homes | 10 broken images — clear image_url fields |
| rose-building-group | Placeholder "tbd" in content |
| sunny-side-kitchens | Missing OG image only — now REVIEW not NOT READY (re-audit) |

**Recommended session start:** Build the 3 incomplete targets first, then fix the 5 existing tenants.

```bash
# Build 3 incomplete
node tenant-builder/orchestrate.mjs --target-ids "468,598,480" --concurrency 3 --skip-outreach

# Re-audit sunny-side-kitchens (fix threshold changes)
node tenant-builder/orchestrate.mjs --audit-only --site-id sunny-side-kitchens --url https://sunny-side-kitchens.norbotsystems.com --skip-git
```

---

## Environment

Loaded from `~/norbot-ops/products/demo/.env.local` and `~/pipeline/scripts/.env`.

Required: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `FIRECRAWL_API_KEY`

Optional (not yet set): `REPLICATE_API_TOKEN` — for Real-ESRGAN image upscaling ($0.002/img). Get from replicate.com when ready.

---

## Reference Docs

| Topic | File |
|-------|------|
| All fix patterns | `docs/learned-patterns.md` |
| QA modules | `docs/qa-modules.md` |
| Pipeline architecture | `docs/pipeline-architecture.md` |
| ICP scoring | `docs/icp-scoring.md` |
| Agents + skills available | `../.claude/agents/` and `../.claude/skills/` |
