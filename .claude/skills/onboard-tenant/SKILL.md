# Onboard Tenant

Automated tenant onboarding for ConversionOS. Scrapes a contractor website, builds a branded demo tenant, runs 9-module QA, and creates an outreach email draft.

**This skill wraps `tenant-builder/orchestrate.mjs` — the full automated pipeline.**

## Usage

```
/onboard-tenant {site-id} {url} [tier]
```

**Arguments:**
- `site-id` — Unique tenant identifier (lowercase, hyphenated, e.g., `pioneer-craftsmen`)
- `url` — The contractor's website URL (e.g., `https://pioneercraftsmen.com`)
- `tier` — Pricing tier (default: `accelerate`): `elevate`, `accelerate`, or `dominate`

**Examples:**
```
/onboard-tenant pioneer-craftsmen https://pioneercraftsmen.com accelerate
/onboard-tenant smith-reno https://smithrenovations.ca dominate
```

## What It Does

Runs the full tenant-builder pipeline (16 steps):

```bash
cd ~/norbot-ops/products/demo
node tenant-builder/orchestrate.mjs --url {url} --site-id {site-id} --tier {tier}
```

1. ICP scoring (6 dimensions, 100 pts)
2. Scrape (branding v2 + 7-stage + logo extraction + social links)
3. Quality gates (hero, testimonials, portfolio, services)
4. Provision (images → Supabase → proxy.ts → sample leads)
5. Git commit + push → Vercel deploy
6. QA suite: page completeness → data-gap resolution → content integrity → visual QA + refinement → live audit → original-vs-demo → PDF/email branding → go-live readiness report
7. Outreach email draft (Gmail)

## After the Pipeline

Follow the post-build review workflow in `tenant-builder/CLAUDE.md`:
1. Read batch summary and go-live readiness
2. Review screenshots visually
3. Check email draft quality
4. Present structured summary to Ferdie

## Alternative Modes

```bash
# Batch from pipeline DB
node tenant-builder/orchestrate.mjs --batch --limit 10

# Audit existing tenant (no scrape/provision)
node tenant-builder/orchestrate.mjs --audit-only --site-id ID --url URL --skip-git

# Dry run (score + scrape only)
node tenant-builder/orchestrate.mjs --url URL --site-id ID --tier accelerate --dry-run
```

## Environment Requirements

Loaded automatically from `~/norbot-ops/products/demo/.env.local` and `~/pipeline/scripts/.env`:
- `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` (CRM)
- `FIRECRAWL_API_KEY` (scraping)
- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (provisioning)
- `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` + `VERCEL_TEAM_ID` (domain registration, optional)
- `GMAIL_CLIENT_ID` + `GMAIL_CLIENT_SECRET` + `GMAIL_REFRESH_TOKEN` (outreach, optional)

## Cost

- Firecrawl: ~$0.07/tenant
- Claude CLI (Max subscription): $0 marginal
- Total: ~$0.10/tenant

## Full Reference

- Pipeline architecture: `tenant-builder/docs/pipeline-architecture.md`
- QA modules: `tenant-builder/docs/qa-modules.md`
- Outreach integration: `tenant-builder/docs/outreach-integration.md`
