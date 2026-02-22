# Onboard Tenant

Automated tenant onboarding for ConversionOS. Scrapes a contractor website, extracts branding/content/images, provisions a fully branded tenant, and runs QA verification.

## Usage

```
/onboard-tenant {site-id} {url} {tier}
```

**Arguments:**
- `site-id` — Unique tenant identifier (lowercase, hyphenated, e.g., `pioneer-craftsmen`)
- `url` — The contractor's website URL (e.g., `https://pioneercraftsmen.com`)
- `tier` — Pricing tier: `elevate`, `accelerate`, or `dominate`

**Examples:**
```
/onboard-tenant pioneer-craftsmen https://pioneercraftsmen.com accelerate
/onboard-tenant smith-reno https://smithrenovations.ca dominate
```

## Pipeline Steps

The pipeline runs 5 steps with file-based checkpoints. If a step fails, re-running the skill resumes from the last successful checkpoint.

### Step 1: Score (fitness assessment)

Run: `node scripts/onboarding/score.mjs --url {url}`

Outputs a 0-100 fitness score:
- >= 70: Auto-proceed
- 50-69: Proceed with warning (flag for review)
- < 50: Stop and report (site too different from template)

Checkpoint: `/tmp/onboarding/{site-id}/score.json`

### Step 2: Scrape (data extraction)

Run: `node scripts/onboarding/scrape.mjs --url {url} --output /tmp/onboarding/{site-id}/scraped.json`

Extracts:
- Business info (name, contact, location)
- Brand (colours, logo, tagline)
- Content (services, testimonials, about, team, portfolio)
- Images (hero, team photos, portfolio)

AI generates missing fields with strict guardrails:
- SAFE to generate: tagline, mission, why choose us, values, process steps
- NEVER generates: testimonials, certifications, team names, contact info, pricing

Checkpoint: `/tmp/onboarding/{site-id}/scraped.json`
Generation log: `/tmp/onboarding/{site-id}/scraped-generation-log.json`

### Step 3: Upload Images

Run: `node scripts/onboarding/upload-images.mjs --site-id {site-id} --data /tmp/onboarding/{site-id}/scraped.json --output /tmp/onboarding/{site-id}/provisioned.json`

Downloads all extracted images and uploads to Supabase Storage at `tenant-assets/{site-id}/`.

Checkpoint: `/tmp/onboarding/{site-id}/provisioned.json`

### Step 4: Provision (database seeding)

Run: `node scripts/onboarding/provision.mjs --site-id {site-id} --data /tmp/onboarding/{site-id}/provisioned.json --domain {site-id}.norbotsystems.com --tier {tier}`

Seeds `admin_settings` table with 4 rows:
- `business_info` — contact details
- `branding` — colours, tagline, socials
- `company_profile` — full content (services, testimonials, team, etc.)
- `plan` — pricing tier

Also:
- Inserts into `tenants` table
- Updates `src/proxy.ts` with domain mapping

### Step 5: Verify (QA)

Run: `node scripts/onboarding/verify.mjs --url https://{site-id}.norbotsystems.com --site-id {site-id}`

8 automated checks (requires deployed site):
1. No demo images in rendered HTML
2. No broken images
3. Correct primary colour CSS variable
4. Testimonials present
5. Services present (3+)
6. Contact info correct
7. Business name in page title
8. Correct `data-site-id` attribute

Pass threshold: 7/8

## Post-Onboarding

After the pipeline completes:
1. Review the generation log at `/tmp/onboarding/{site-id}/scraped-generation-log.json`
2. Add the domain to the Vercel project
3. Commit and push: `git add -A && git commit -m "feat: onboard tenant {site-id}" && git push`
4. Wait for Vercel deploy, then run Step 5 verification

## Resuming After Failure

If any step fails, fix the issue and re-run the skill. Steps with existing checkpoint files are skipped automatically.

To force re-run from scratch:
```bash
rm -rf /tmp/onboarding/{site-id}
```

## Environment Requirements

These must be set (already configured in the NorBot environment):
- `FIRECRAWL_API_KEY` — in `~/pipeline/scripts/.env`
- `OPENAI_API_KEY` — in `~/pipeline/scripts/.env`
- `NEXT_PUBLIC_SUPABASE_URL` — in `.env.local`
- `SUPABASE_SERVICE_ROLE_KEY` — in `.env.local`

## Cost Per Tenant

- FireCrawl: ~6 credits ($0.05)
- GPT-4o (content generation): ~$0.02
- Supabase Storage: negligible
- **Total: ~$0.07/tenant**
