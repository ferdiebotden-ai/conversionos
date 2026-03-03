# ICP Scoring (6 Dimensions, 100 pts)

Ideal Customer Profile scoring for demo fitness assessment.

## Dimensions

| Dimension | Points | Logic |
|-----------|--------|-------|
| Template fit | 0-20 | Keyword scan for services, testimonials, portfolio, about |
| Sophistication gap | 0-20 | INVERTED: basic Wix = 20, stunning custom = 3 |
| Years in business | 0-15 | INVERTED: 1-3 yrs = 15, 15+ yrs = 5 |
| Google reviews | 0-15 | Rating + count combined |
| Geography | 0-15 | Phase 1 cities = 15, Phase 3+ = 9 |
| Company size | 0-15 | INVERTED: solo = 15, large = 4 |

## Thresholds

- **≥ 70:** Auto-proceed to build
- **50-69:** Proceed with manual review warning
- **< 50:** Reject (site too different from template)

## Turso Columns

- `icp_score INTEGER` — 0-100 ICP score
- `icp_breakdown TEXT` — JSON string of ICPBreakdown shape
- `bespoke_status` — Pipeline state tracking
- `bespoke_score` — Visual QA average after build

## Configuration

All weights and thresholds configurable in `config.yaml`.

```bash
# Score a target
node icp-score.mjs --target-id 42

# Dry run (score without DB update)
node icp-score.mjs --target-id 42 --dry-run
```
