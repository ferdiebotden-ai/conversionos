# ICP Scoring (6 Dimensions, 100 pts)

Ideal Customer Profile scoring for demo fitness assessment. Prioritises small-town, owner-operator contractors with basic websites and complete contact data.

## Dimensions

| Dimension | Points | Logic |
|-----------|--------|-------|
| Template fit | 0-20 | Keyword scan for services, testimonials, portfolio, about |
| Sophistication gap | 0-20 | INVERTED: basic Wix = 20, stunning custom = 3 |
| Contact completeness | 0-15 | Has email + phone + owner_name = 15, 2 of 3 = 10, 1 = 5, none = 0 |
| Google reviews | 0-15 | Rating + count combined |
| Geography | 0-15 | Small towns near Stratford = 15, mid-size cities = 12, farther = 9 |
| Company size | 0-15 | INVERTED: solo = 15, large = 4 |

## Geography Tiers

| Tier | Cities | Points |
|------|--------|--------|
| Small towns (ideal ICP) | Woodstock, Ingersoll, Tillsonburg, St. Thomas, Stratford, Listowel, Mitchell, Tavistock, New Hamburg, Exeter, Elmira, Fergus, Elora, Paris, Simcoe, Norfolk | 15 |
| Mid-size cities | London, Kitchener, Waterloo, Cambridge, Guelph, Brantford | 12 |
| Farther/larger | Hamilton, Oakville, Burlington (in active_cities list) | 9 |
| Unknown Ontario | Not in any list | 5 |
| Unknown | No city data | 3 |

## Thresholds

- **>= 70:** Auto-proceed to build
- **50-69:** Proceed with manual review warning
- **< 50:** Reject (site too different from template)

## Pipeline Selection

`discover.mjs --pipeline` returns targets ordered by `COALESCE(icp_score, 0) DESC, score DESC`. Pre-filters: must have website AND at least email or phone. Built targets (`status = 'bespoke_ready'`) auto-drop from pipeline.

## Turso Columns

- `icp_score INTEGER` — 0-100 ICP score
- `icp_breakdown TEXT` — JSON string of ICPBreakdown shape
- `bespoke_status` — Pipeline state tracking
- `bespoke_score` — Visual QA average after build

## Configuration

All weights, thresholds, and city lists configurable in `config.yaml`.

```bash
# Score a target
node icp-score.mjs --target-id 42

# Dry run (score without DB update)
node icp-score.mjs --target-id 42 --dry-run

# Score all unscored targets
node icp-score.mjs --all --limit 50
```
