# Shared Interfaces — Tenant Builder ↔ Mission Control

This document defines the contract between the tenant-builder (pipeline-dev) and Mission Control (dashboard-dev). Both teammates MUST reference this for data shapes.

---

## 1. Turso DB Changes (Pipeline-Dev Adds Columns)

New columns on `targets` table:

```sql
ALTER TABLE targets ADD COLUMN icp_score INTEGER DEFAULT NULL;
ALTER TABLE targets ADD COLUMN icp_breakdown TEXT DEFAULT NULL;
```

- `icp_score`: 0-100 integer, enhanced ICP scoring for demo fitness
- `icp_breakdown`: JSON string of `ICPBreakdown` shape (see below)

Existing columns used (already in schema):
- `bespoke_status`: 'scraping' | 'generating' | 'refining' | 'complete' | 'failed'
- `bespoke_score`: 1.0-5.0 float from visual QA rubric
- `brand_assets`: JSON string of brand data

---

## 2. Data Shapes

### ICPBreakdown (written by icp-score.mjs, read by Mission Control)

```typescript
interface ICPBreakdown {
  template_fit: number        // 0-20
  sophistication_gap: number  // 0-20 (INVERTED: basic site = high score)
  years_in_business: number   // 0-15 (INVERTED: newer = higher)
  google_reviews: number      // 0-15
  geography: number           // 0-15
  company_size: number        // 0-15 (INVERTED: smaller = higher)
  total: number               // 0-100
  notes: string               // human-readable assessment
}
```

### VisualQAResult (written by visual-qa.mjs, stored in results/)

```typescript
interface VisualQAResult {
  logo_fidelity: number       // 1-5
  colour_match: number        // 1-5
  copy_accuracy: number       // 1-5
  layout_integrity: number    // 1-5
  brand_cohesion: number      // 1-5
  average: number             // computed average
  pass: boolean               // avg >= 4.0, no dimension < 3.0
  notes: string               // AI assessment
  screenshots: {
    desktop: string           // Supabase Storage URL or local path
    mobile: string            // Supabase Storage URL or local path
  }
}
```

### BatchBuildProgress (written by orchestrate.mjs to stdout, read by BuildProgressPanel)

Progress lines follow this format for machine parsing:
```
[PROGRESS] {"stage": "discover|score|scrape|provision|qa", "target_id": 42, "site_id": "example-reno", "status": "start|complete|error", "detail": "..."}
[SUMMARY] {"total": 10, "succeeded": 8, "failed": 2, "skipped": 0}
```

All other stdout is human-readable log lines (displayed as-is in BuildProgressPanel).

---

## 3. Orchestrator CLI Interface

```bash
# Read from existing pipeline targets (default)
node tenant-builder/orchestrate.mjs --batch --limit 10

# Single target from pipeline
node tenant-builder/orchestrate.mjs --target-id 42

# Direct URL (bypass pipeline DB)
node tenant-builder/orchestrate.mjs --url https://example.com --site-id example --tier accelerate

# Full autonomous: discover + score + build
node tenant-builder/orchestrate.mjs --discover --cities "London,Kitchener" --limit 10

# Nightly (midnight LaunchAgent)
node tenant-builder/orchestrate.mjs --nightly

# Dry run (score + scrape only, no provisioning)
node tenant-builder/orchestrate.mjs --batch --limit 5 --dry-run

# Concurrency control
node tenant-builder/orchestrate.mjs --batch --limit 10 --concurrency 4
```

Exit codes:
- 0: success (all targets processed)
- 1: fatal error (bad config, missing env)
- 2: partial success (some targets failed, see summary)

---

## 4. Mission Control API Routes (Dashboard-Dev Creates)

### POST /api/crm/build-batch

Triggers batch tenant building via Claude Code Bridge.

```typescript
// Request
interface BuildBatchRequest {
  limit?: number          // default: 10
  concurrency?: number    // default: 4
  dryRun?: boolean        // default: false
}

// Response
interface BuildBatchResponse {
  status: 'started' | 'error'
  message: string
}
```

Implementation: Uses `bridge.spawn()` with workspace `/Users/norbot/norbot-ops/products/demo` and command `node tenant-builder/orchestrate.mjs --batch --limit ${limit} --concurrency ${concurrency}`.

### POST /api/crm/discover

Triggers discovery + build via Claude Code Bridge.

```typescript
// Request
interface DiscoverRequest {
  cities?: string         // comma-separated, default: all active
  limit?: number          // default: 10
  dryRun?: boolean        // default: false
}

// Response
interface DiscoverResponse {
  status: 'started' | 'error'
  message: string
}
```

Implementation: Uses `bridge.spawn()` with workspace and command `node tenant-builder/orchestrate.mjs --discover --cities "${cities}" --limit ${limit}`.

---

## 5. Supabase Storage Paths

QA screenshots are uploaded to the demo Supabase Storage bucket `tenant-assets`:

```
tenant-assets/{site-id}/qa/desktop.png
tenant-assets/{site-id}/qa/mobile.png
```

Public URLs: `{SUPABASE_URL}/storage/v1/object/public/tenant-assets/{site-id}/qa/desktop.png`

---

## 6. Turso Query for ICP Data (Dashboard-Dev Uses)

```sql
-- Get ICP score + breakdown for a target
SELECT icp_score, icp_breakdown, bespoke_status, bespoke_score
FROM targets WHERE id = ?
```

Dashboard-dev should add these fields to the existing `useTarget(id)` hook return value.

---

## 7. File Ownership

| Directory | Owner |
|-----------|-------|
| `~/norbot-ops/products/demo/tenant-builder/**` | pipeline-dev |
| `~/norbot-ops/products/demo/src/proxy.ts` | pipeline-dev (merge-proxy.mjs writes here) |
| `~/norbot-ops/products/mission-control/src/components/pipeline/batch-build-button.tsx` | dashboard-dev |
| `~/norbot-ops/products/mission-control/src/components/pipeline/discover-build-button.tsx` | dashboard-dev |
| `~/norbot-ops/products/mission-control/src/components/pipeline/qa-results-panel.tsx` | dashboard-dev |
| `~/norbot-ops/products/mission-control/src/app/api/crm/build-batch/route.ts` | dashboard-dev |
| `~/norbot-ops/products/mission-control/src/app/api/crm/discover/route.ts` | dashboard-dev |
| `~/norbot-ops/products/mission-control/src/lib/turso/hooks.ts` | dashboard-dev (extend only) |
| `~/norbot-ops/products/mission-control/src/lib/turso/queries.ts` | dashboard-dev (extend only) |
| `~/norbot-ops/products/mission-control/src/lib/crm/onboard-helpers.ts` | dashboard-dev (extend only) |
| `~/norbot-ops/products/mission-control/src/app/pipeline/page.tsx` | dashboard-dev (extend only) |
| `~/norbot-ops/products/mission-control/src/components/pipeline/lead-detail-modal.tsx` | dashboard-dev (extend only) |
