# /build-tenant — Autonomous Multi-Model Tenant Build

Build ConversionOS demo tenants using cost-efficient model delegation: Opus orchestrates (2-3 turns), Sonnet builds and fixes, Haiku pre-screens and validates.

**Cost target:** $1-2 per tenant. Opus touches each build for 2-3 turns max.

## Parse Arguments

From the user's input, extract:
- `{site-id} {url} [tier]` → Single target by URL (tier defaults to `accelerate`)
- `--target-id {id}` → Single target from pipeline DB
- `--batch --limit {N}` → Batch from pipeline (1-15 tenants)
- `--audit-only {site-id} {url}` → QA-only on existing tenant (no scrape/provision)

## Phase 1 — Pre-Flight (Opus, this turn)

1. Source environment variables:
```bash
source ~/pipeline/scripts/.env
source ~/norbot-ops/products/demo/.env.local
```

2. Read `tenant-builder/docs/learned-patterns.md` for any new patterns.

3. Verify required env vars exist: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## Phase 2 — Pre-Screen (Haiku, ~$0.02)

**For single targets only (skip for batch — pipeline-scout handles batch pre-screening).**

Spawn the `pipeline-scout` subagent:
> Pre-screen target {target-id or URL}. Check for disqualifiers: no website, no contact info, ICP score < 50, website down. Report QUALIFIED or DISQUALIFIED with reason.

If DISQUALIFIED: stop. Report to Ferdie why the target isn't worth building.

## Phase 3 — Build (Sonnet, ~$0.80-1.00)

### Single Build

Spawn the `build-worker` subagent:
> Run the tenant builder pipeline and post-build QA/fix cycle:
> ```
> cd ~/norbot-ops/products/demo
> node tenant-builder/orchestrate.mjs {RECONSTRUCTED_ARGS}
> ```
> Then follow your full workflow (read QA, classify, fix, self-improve, return BUILD RESULT).

Wait for the build-worker to return its structured BUILD RESULT.

### Batch Build (Agent Teams — for 3+ tenants)

For 1-2 tenants: run sequentially as single builds (subagents, not Agent Teams).

For 3+ tenants: create an Agent Team:

1. **Create team:** `build-batch-{date}`
2. **Create tasks:** One task per tenant (target-id, URL, site-id)
3. **Spawn teammates:**
   - N `build-worker` teammates (Sonnet) — one per tenant
   - 1 `qa-monitor` teammate (Haiku) — heartbeat monitoring
4. **Assign tasks:** One tenant per build-worker teammate
5. **Wait:** qa-monitor reports progress every 2-3 minutes
6. **Collect:** Read all BUILD RESULT outputs after teammates finish

Agent Teams spawning:
```
Spawn teammate "worker-1" using build-worker agent type:
  "Build tenant {site-id-1} from target {id}. Run orchestrate.mjs --target-id {id}, then follow your full workflow."

Spawn teammate "worker-2" using build-worker agent type:
  "Build tenant {site-id-2} from target {id}. Run orchestrate.mjs --target-id {id}, then follow your full workflow."

Spawn teammate "monitor" using qa-monitor agent type:
  "Monitor batch build progress. {N} tenants being built today. Check results/ every 2-3 minutes, report status."
```

## Phase 4 — Validate (Haiku, ~$0.01 per tenant)

For each tenant with verdict REVIEW or NOT READY:

Spawn the `qa-validator` subagent:
> Validate tenant data for site_id: {site-id}. Run all 15 anti-pattern checks. Report PASS/FAIL with field paths.

Compare Haiku's findings with Sonnet's assessment for confirmation. If Haiku finds issues the build-worker missed, note them for the fix cycle.

## Phase 5 — Handle Escalations (Opus)

For each tenant with verdict ESCALATE:

1. Read the escalation context from the build-worker's result
2. Read screenshots in `tenant-builder/results/{date}/{site-id}/screenshots/`
3. Apply judgment — fix the novel issue if possible, or flag for Ferdie
4. If fixed: re-run targeted QA check to verify

For each tenant with verdict REVIEW after validation:
- If issues are minor (social links, favicon, hours): fix directly via Supabase curl
- If issues are substantive: flag for Ferdie with specific details

## Phase 6 — Self-Improve (Opus)

Review any new patterns the build-worker(s) added to `docs/learned-patterns.md`:
- If the pattern is genuinely reusable: keep it
- If it's a one-off: remove it
- If it should be codified into the tenant-qa-knowledge skill: note it for the next skill update

## Phase 7 — Present Summary

Format the final report:

```
## Build Report — {date}

**Processed:** {N} tenant(s)
**Cost estimate:** ~${total} ({N} Sonnet builds + {N} Haiku validations + {N} Opus turns)

### READY ({N})
| Tenant | Visual QA | Hero | Issues Fixed |
|--------|-----------|------|-------------|
| {site-id} | {score}/5 | OK/Replaced | {N} |

### REVIEW ({N})
| Tenant | Issue | Recommended Action |
|--------|-------|--------------------|
| {site-id} | {specific issue} | {fix or flag} |

### NOT READY ({N})
| Tenant | Critical Failure | Needs |
|--------|-----------------|-------|
| {site-id} | {failure} | {what's needed} |

### Self-Improvement
- New patterns added: {N}
- Patterns to review: {list}

### Pipeline Status
- Qualified targets remaining: {N}
- Recommendation: {top-up if < 50}
```

## Ralph Loop Usage

For maximum quality, wrap in a Ralph Loop:

```bash
/ralph-loop "build-tenant {site-id} {url}" --completion-promise "TENANT READY" --max-iterations 3
```

The build-worker handles internal fix loops (up to 3 cycles). The Ralph Loop adds an outer iteration at the Opus level for cases where the first full pass doesn't achieve READY.

**Completion promise:** Output `<promise>TENANT READY</promise>` ONLY when the quality gate passes (Section 10 of tenant-qa-knowledge skill). Never output the promise if any critical check fails.

## Cost Budget

| Component | Cost |
|-----------|------|
| Pipeline scripts (GPT-4o) | ~$0.15 |
| Pre-screen (Haiku) | ~$0.02 |
| Build-worker (Sonnet) | ~$0.80-1.00 |
| Validation (Haiku) | ~$0.01-0.03 |
| Image polishing (Sonnet+Gemini) | ~$0.02-0.06 |
| Opus orchestration | ~$0.10-0.20 |
| **Total per tenant** | **~$1.10-1.45** |
| **Absolute max (3 Ralph iterations)** | **~$2.80** |

If cost approaches $2 on a single tenant, consider whether it's worth continuing or flagging for Ferdie.
