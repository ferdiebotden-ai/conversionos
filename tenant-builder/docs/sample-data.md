# Sample Lead Fixtures

Every new tenant is seeded with 1 sample lead so prospects see a populated admin dashboard.

## Fixture

**File:** `fixtures/sample-leads.json` — Playwright-captured from ConversionOS base platform

| Lead | Status | Source | Project |
|------|--------|--------|---------|
| Margaret Wilson | new | ai_chat | Bathroom (with visualization + 4 AI concepts) |

**Images:** `public/images/sample-data/` — AI-generated concept images (static, shared across tenants)

## Seeder

```javascript
import { seedSampleLeads } from './seed-sample-leads.mjs';

const result = await seedSampleLeads(siteId);
// { seeded: true, counts: { leads: 1, visualizations: 1, ... } }
// or { seeded: false, reason: 'leads already exist for this site_id' }
```

```bash
node provision/seed-sample-leads.mjs --site-id my-tenant [--dry-run]
```

Integrated as Step 2c in `provision-tenant.mjs`. Skip with `--skip-sample-data`. Idempotent.

## How It Works

1. Reads `fixtures/sample-leads.json` (UUID placeholders like `__LEAD_MARGARET__`, relative timestamps)
2. Generates fresh UUIDs via `crypto.randomUUID()` — preserves FK relationships via placeholder map
3. Replaces `__SITE_ID__` with target tenant's site_id
4. Generates fresh `share_token` for visualizations (unique constraint)
5. Converts `_created_at_offset_days` to real ISO timestamps relative to now
6. Inserts rows in FK order: leads → visualizations → lead_visualizations → visualization_metrics → audit_log
7. Skips if leads already exist (idempotent)

## Regenerating Fixtures

```bash
node scripts/clean-demo-data.mjs --site-id conversionos
node scripts/sample-data/create-visualizer-lead.mjs
node scripts/sample-data/export-fixtures.mjs
# Commit updated fixtures/sample-leads.json + any new images
```

Cost: ~$2-3 one-time (AI generation + chat during Playwright runs), $0/tenant after.
