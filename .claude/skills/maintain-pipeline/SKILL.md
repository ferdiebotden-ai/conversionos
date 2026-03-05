# /maintain-pipeline — Pipeline Fullness Management

Maintain 50+ qualified renovation contractor targets for ConversionOS demo builds. Delegates to the pipeline-scout Haiku subagent.

## Parse Arguments

- (no args) → Check status + top-up to 50 if below
- `--report` → Status report only (no discovery)
- `--discover {N}` → Discover N new targets via Firecrawl
- `--rescore` → Re-score all unscored targets
- `--rescore --force` → Re-score ALL targets (including already-scored)

## Phase 1 — Pipeline Report (always runs first)

Spawn the `pipeline-scout` subagent:
> Generate a pipeline report. Query Turso for: total targets, scored count, qualified count (ICP ≥ 55, not already built), built count. Report pipeline depth, top 5 candidates, and geographic gaps.

If `--report` flag: present the report and stop.

## Phase 2 — Top-Up (if needed)

If qualified count < 50:
- Calculate gap: `needed = 50 - qualified_count`
- Identify under-represented cities from the report
- Spawn pipeline-scout again:
  > Discover {needed * 2} new targets (we over-discover since ~50% will score below threshold). Focus on cities: {under-represented cities}. Then ICP score all new targets.

The 2x multiplier accounts for:
- ~30% won't have websites
- ~20% will score below threshold
- ~10% will be duplicates

## Phase 3 — Score Unscored

If `--rescore` flag:
- Spawn pipeline-scout:
  > Score all unscored targets: `node tenant-builder/icp-score.mjs --all --limit 100`
  > Report: how many scored, score distribution, any failures.

If `--rescore --force`:
  > Re-score ALL targets (force flag): `node tenant-builder/icp-score.mjs --all --limit 200 --force`

## Phase 4 — Present Summary

```
## Pipeline Status — {date}

| Metric | Count |
|--------|-------|
| Total targets | {N} |
| Scored | {N} |
| Qualified (ICP ≥ 55) | {N} |
| Built (bespoke_ready) | {N} |
| **Available for build** | **{N}** |
| Target | 50+ |
| Status | {ON TARGET ✓ / BELOW TARGET — need {N} more} |

### Top 10 Candidates
| Rank | Company | City | ICP Score | Contact |
|------|---------|------|-----------|---------|
| 1 | {name} | {city} | {score} | {email/phone} |

### Geographic Coverage
| City Tier | Count | Cities |
|-----------|-------|--------|
| Ideal (15 pts) | {N} | {list} |
| Good (12 pts) | {N} | {list} |
| Acceptable (9 pts) | {N} | {list} |

### Actions Taken
- Discovered: {N} new targets
- Scored: {N} targets
- New qualifiers: {N}
```

## Cost

- Haiku pipeline-scout: ~$0.05-0.10 per run
- Firecrawl API: ~$0.01-0.05 per discovery (depends on credit plan)
- ICP scoring (GPT-4o): ~$0.01 per target
- Total: ~$0.10-0.30 per maintenance run
