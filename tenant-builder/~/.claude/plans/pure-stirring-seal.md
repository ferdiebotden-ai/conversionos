# Plan: Re-Rank Pipeline Targets with Current ICP Model

## Context

**Yes — existing scores are stale.** The ICP scoring model was significantly updated on **March 3, 2026** (commit `7c92f5f`) but existing Turso scores were never retroactively recalculated.

### What changed in the new model

| Criterion | Old model | New model |
|-----------|-----------|-----------|
| **Geography** | Farther/larger cities scored high | **INVERTED** — small towns near Stratford score highest (15 pts). London/Kitchener now score 12, not the top. |
| **6th criterion** | `years_in_business` | **Replaced** with `contact_completeness` (email + phone + owner_name). |

Geography inversion is the biggest impact: Cambridge/Waterloo currently top the rankings, but under the new model, Woodstock/Ingersoll/Tillsonburg area contractors should rank higher. The current "top 10" is based on inverted geography + wrong criterion.

### Current pipeline state
- **102 qualified targets** (status = 'qualified') with stale ICP scores
- **Score range:** 47–96, average 67.6 (under old model — will shift after re-score)
- **5 draft-ready** targets already built (Red White Reno, MD Construction, CCR, McCarty, BL)
- `icp-score.mjs --all` skips already-scored targets — need a `--force` flag to re-score

---

## Implementation Plan

### Step 1 — Add `--force` flag to `icp-score.mjs`

**File:** `tenant-builder/icp-score.mjs`

Find the argument parsing section and add `--force` flag. Then find the SQL query that selects targets with `icp_score IS NULL` and conditionally remove that filter when `--force` is set.

Likely change:
```js
// Argument parsing
const forceRescore = args.includes('--force');

// SQL query — remove icp_score IS NULL filter when --force passed
const whereClause = forceRescore
  ? `WHERE status IN (...) AND website IS NOT NULL`
  : `WHERE status IN (...) AND website IS NOT NULL AND icp_score IS NULL`;
```

### Step 2 — Re-score all 102 qualified targets

```bash
cd ~/norbot-ops/products/demo/tenant-builder
node icp-score.mjs --all --force --limit 110
```

This will:
- Re-call Claude Sonnet for sophistication + company size assessment (~102 calls)
- Recalculate all 6 dimensions with the current model
- Update `icp_score` and `icp_breakdown` in Turso

**Estimated cost:** ~$0.50 (Claude Sonnet at ~$0.003/target)
**Estimated time:** ~8–10 minutes (5s/target sequential)

### Step 3 — Pull fresh ranking

```bash
node discover.mjs --pipeline --limit 20
```

Present the updated top 20 with breakdowns for Ferdie to review.

### Step 4 — User selects 10 targets → build

After Ferdie confirms the top 10:
```bash
node orchestrate.mjs --batch --limit 10
```

---

## Key Files

| File | Change |
|------|--------|
| `tenant-builder/icp-score.mjs` | Add `--force` flag (small change ~15 lines) |
| No other files change | Everything else is data |

---

## Verification

1. After adding `--force`, run `node icp-score.mjs --target-id 42 --dry-run --force` — confirm score recalculates and geography/contact_completeness dimensions show correct values
2. Run full re-score with `--limit 110 --force`
3. Compare top 10 before vs after — expect small-town Ontario targets to rise in rankings vs Cambridge/Waterloo
4. Confirm no previously-qualified target lost enough score to drop below 50 threshold

---

**TLDR:** All 102 qualified targets have stale ICP scores from before the March 3 geography inversion + criterion swap. We add a `--force` flag to icp-score.mjs (small change), re-score all 102 in one pass (~10 min, ~$0.50), then pull the corrected ranking so Ferdie can confidently pick 10 targets to build. Low complexity, no DB schema changes, no risk to existing tenants.

**Complexity:** LOW — single file change, existing scoring infrastructure does all the work.
