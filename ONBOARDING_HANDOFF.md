# Automated Tenant Onboarding — Handoff Report

*Created: Feb 22, 2026*
*Author: Claude Opus 4.6 (build orchestrator session)*

---

## TLDR

**The automation is built but NOT yet tested end-to-end.** The pipeline code exists, the platform is now DB-driven, but several prerequisites need to happen before a real test run.

**What it does:** Given a contractor's website URL, the pipeline scrapes their branding/content/images, uploads assets to Supabase Storage, seeds the database, updates the proxy routing, and produces a fully branded ConversionOS tenant. Cost: ~$0.07/tenant.

**What you provide:** A URL, a site-id, and a tier. That's it.

```bash
/onboard-tenant pioneer-craftsmen https://pioneercraftsmen.com accelerate
```

Or directly:
```bash
node scripts/onboarding/onboard.mjs \
  --url https://pioneercraftsmen.com \
  --site-id pioneer-craftsmen \
  --domain pioneer-craftsmen.norbotsystems.com \
  --tier accelerate
```

---

## What's Done (Feb 22, 2026)

### Phase 1: Platform Made DB-Driven (8 units, all passed)

Every visible piece of content now comes from the database:

| Component | Before | After |
|-----------|--------|-------|
| Hero headline | Hardcoded "Dream. Plan. Build." | `config.heroHeadline` from DB |
| Hero image | `/images/demo/hero-kitchen.png` | `config.heroImageUrl` from DB |
| Primary colour | Hardcoded in CSS | `--primary:oklch(...)` injected from DB |
| Trust badges | Hardcoded 3 items | `config.trustBadges[]` from DB |
| Why Choose Us | Hardcoded 3 cards | `config.whyChooseUs[]` from DB |
| Process steps | Hardcoded 4 steps | `config.processSteps[]` from DB |
| Values (about page) | Hardcoded 3 values | `config.values[]` from DB |
| Team (about page) | Single card from `principals` | `config.teamMembers[]` from DB |
| Business hours | Hardcoded Mon-Fri 9-5 | `parseBusinessHours(config.hours)` |
| Service pages | 4 static pages | Dynamic `/services/[slug]` from DB |
| Footer service links | Hardcoded 4 links | Dynamic from `branding.services[]` |
| Project gallery | Hardcoded 8 projects | Optional `projects` prop from DB |
| Testimonial images | Required | Optional (gradient placeholder) |

All changes have fallback defaults — existing tenants render exactly as before.

### Phase 2: Scraping Pipeline

9 scripts in `scripts/onboarding/`:

| Script | Purpose |
|--------|---------|
| `score.mjs` | Fitness assessment (0-100) — is this site scrapable? |
| `scrape.mjs` | FireCrawl extraction + multi-page fallback + AI content generation |
| `schema.mjs` | Zod schema defining every field we extract |
| `convert-color.mjs` | hex → OKLCH conversion via culori |
| `upload-images.mjs` | Download images → Supabase Storage |
| `provision.mjs` | Seed DB + update proxy.ts |
| `onboard.mjs` | Pipeline orchestrator (chains all steps) |
| `verify.mjs` | Playwright QA (8 automated checks) |
| `README.md` | Usage docs |

### Phase 3: Provisioning & Skill

- `/onboard-tenant` skill defined in `.claude/skills/onboard-tenant/SKILL.md`
- File-based checkpoints in `/tmp/onboarding/{site-id}/` for resume-on-failure
- Generation log tracks every AI-generated field for human review

---

## What's NOT Done — Prerequisites for Test Run

### 1. Push Supabase Migrations (REQUIRED)

Two new migrations haven't been pushed to the demo Supabase project:

```bash
# From the demo product directory:
cd ~/norbot-ops/products/demo

# Push the tenant-assets bucket migration
# Push the extended seed data migration
npx supabase db push --linked
```

**Migrations to push:**
- `20260222300000_tenant_assets_bucket.sql` — Creates the `tenant-assets` Storage bucket
- `20260222400000_extend_seed_data.sql` — Adds extended fields (hero, team, portfolio, etc.) to existing tenants

**Without these, image upload and the extended content fields will fail.**

### 2. Verify Dependencies (REQUIRED)

```bash
# culori and firecrawl-js should be installed. Verify:
node -e "import('@mendable/firecrawl-js').then(() => console.log('firecrawl OK')).catch(e => console.log('MISSING:', e.message))"
node -e "import('culori').then(() => console.log('culori OK')).catch(e => console.log('MISSING:', e.message))"
```

If missing: `npm install --save-dev @mendable/firecrawl-js culori`

### 3. Verify Environment Variables (REQUIRED)

The scripts need these env vars (should already be configured):

| Variable | Location | Used By |
|----------|----------|---------|
| `FIRECRAWL_API_KEY` | `~/pipeline/scripts/.env` | score.mjs, scrape.mjs |
| `OPENAI_API_KEY` | `~/pipeline/scripts/.env` | scrape.mjs (AI generation) |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | upload-images.mjs, provision.mjs |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` | upload-images.mjs, provision.mjs |

### 4. Verify FireCrawl Credits (REQUIRED)

Check FireCrawl dashboard. Each onboarding uses ~6 credits for the homepage + fallback pages. The ACTIVE_PROJECTS.md notes "Firecrawl credits exhausted" — this needs to be confirmed/replenished.

### 5. Deploy Current Code to Vercel (REQUIRED for verify step)

```bash
git push  # triggers Vercel deploy
```

The verify step needs the deployed site. Steps 1-4 (score, scrape, upload, provision) work without deployment.

---

## Test Run Plan: McCarty Squared

McCarty Squared is an **existing tenant** (site_id: `mccarty-squared`, domain: `mccarty.norbotsystems.com`, tier: Dominate). This makes it a good test because we can compare scraped data against manually seeded data.

### Recommended Test Approach

**Option A: Side-by-side comparison (SAFE — no data changes)**
```bash
# Run scrape only, don't provision — compare output against current DB
node scripts/onboarding/scrape.mjs \
  --url https://mccartysquared.ca \
  --output /tmp/onboarding/mccarty-test/scraped.json

# Review what was scraped vs what we manually entered
# Check: /tmp/onboarding/mccarty-test/scraped.json
# Check: /tmp/onboarding/mccarty-test/scraped-generation-log.json
```

**Option B: Full pipeline with a NEW site-id (SAFE — creates separate tenant)**
```bash
node scripts/onboarding/onboard.mjs \
  --url https://mccartysquared.ca \
  --site-id mccarty-test \
  --domain mccarty-test.norbotsystems.com \
  --tier dominate
```

This creates a separate tenant (`mccarty-test`) so the existing `mccarty-squared` data is untouched. After verifying the output, you can delete the test data.

**Option C: Overwrite existing McCarty data (DESTRUCTIVE — has upsert)**

The provision script uses `upsert` so it would overwrite McCarty's manually curated data. **Do NOT do this** until Option A/B validate that the scraper output is high quality.

### What to Check After Test

1. **Generation log** — `/tmp/onboarding/mccarty-test/scraped-generation-log.json`
   - Which fields were AI-generated vs scraped?
   - Are generated fields accurate and truthful?
2. **Scraped data** — `/tmp/onboarding/mccarty-test/scraped.json`
   - Business name, phone, email correct?
   - Services match their real offerings?
   - Testimonials extracted with real names and quotes?
   - Colour extraction matches their brand?
3. **Image quality** — Check Supabase Storage
   - Hero image resolution adequate?
   - Team photos found?
   - Portfolio images captured?

### McCarty's Actual Website

Need to confirm the URL. Likely candidates:
- `https://mccartysquared.ca`
- `https://www.mccartysquared.ca`

The site-id `mccarty-squared` is already in proxy.ts and admin_settings.

---

## Documentation Status

### What the Next Agent Knows

| Location | Knows About Pipeline? | Action Needed |
|----------|-----------------------|---------------|
| `.claude/CLAUDE.md` (demo project) | Partially — has "Adding a New Tenant" section but not the automation | **UPDATE** |
| `CLAUDE.md` (demo root) | Partially — same as above | **UPDATE** |
| `.claude/skills/onboard-tenant/SKILL.md` | YES — full pipeline docs | None |
| `.claude/commands/build-session.md` | Build orchestrator protocol (implementation tool, not the pipeline itself) | None |
| `MEMORY.md` (auto-memory) | NO — doesn't mention onboarding pipeline | **UPDATE** |
| `~/norbot-ops/shared/ACTIVE_PROJECTS.md` | NO — doesn't mention this was built | **UPDATE** |
| `~/norbot-ops/CLAUDE.md` (parent) | NO — doesn't know pipeline exists | **UPDATE** |

### Key Finding

**If you open a new Claude Code session in this folder, it will NOT automatically know about the onboarding pipeline** unless it:
1. Reads the `/onboard-tenant` skill (only loaded if you invoke the skill)
2. Reads `scripts/onboarding/README.md`
3. Reads this handoff report

The CLAUDE.md files need to be updated to reference the pipeline.

---

## Files Created by the Orchestrator

### Core Platform Changes (Phase 1)
```
src/lib/branding.ts                    — Added primaryOklch, services fields
src/lib/ai/knowledge/company.ts        — Extended CompanyConfig with 11 new fields
src/lib/storage.ts                     — NEW: Supabase Storage URL helpers
src/lib/utils/hours.ts                 — NEW: Business hours parser
src/app/layout.tsx                     — CSS colour injection + data-site-id
src/app/page.tsx                       — DB-driven hero, badges, why-us, process
src/app/about/page.tsx                 — DB-driven values, team
src/app/contact/page.tsx               — DB-driven business hours
src/app/services/[slug]/page.tsx       — NEW: Dynamic service pages
src/app/services/page.tsx              — Uses ServicesGridServer
src/app/projects/page.tsx              — Uses DB gallery
src/components/services-grid.tsx       — Optional services prop + icon mapping
src/components/services-grid-server.tsx — NEW: Async server wrapper
src/components/project-gallery.tsx     — Optional projects prop
src/components/testimonials.tsx        — Optional image field
src/components/footer.tsx              — Dynamic service links
src/components/branding-provider.tsx   — Added new fields
next.config.ts                         — Service URL redirects
```

### Deleted
```
src/app/services/kitchen/page.tsx      — Replaced by [slug]
src/app/services/bathroom/page.tsx     — Replaced by [slug]
src/app/services/basement/page.tsx     — Replaced by [slug]
src/app/services/outdoor/page.tsx      — Replaced by [slug]
```

### Onboarding Pipeline (Phase 2-3)
```
scripts/onboarding/onboard.mjs        — Pipeline orchestrator
scripts/onboarding/score.mjs          — Fitness scoring
scripts/onboarding/scrape.mjs         — FireCrawl + AI generation
scripts/onboarding/schema.mjs         — Zod extraction schema
scripts/onboarding/convert-color.mjs  — hex → OKLCH
scripts/onboarding/upload-images.mjs  — Image → Supabase Storage
scripts/onboarding/provision.mjs      — DB seed + proxy.ts update
scripts/onboarding/verify.mjs         — Playwright QA
scripts/onboarding/README.md          — Usage docs
```

### Migrations
```
supabase/migrations/20260222300000_tenant_assets_bucket.sql
supabase/migrations/20260222400000_extend_seed_data.sql
```

### Build Orchestrator (implementation tooling — can be deleted after verification)
```
scripts/build-orchestrator.sh
scripts/build-state.json
scripts/lib/build-state.sh
scripts/lib/health-check.sh
scripts/prompts/unit-01-data-layer.md through unit-08-provisioner.md
scripts/logs/ (build and session logs)
```

---

## Cost Summary

| Item | Cost |
|------|------|
| Build orchestrator (8 claude sessions) | ~$15-20 (Claude Code Max flat rate) |
| Per-tenant onboarding (ongoing) | ~$0.07 (FireCrawl + GPT-4o) |
| Supabase Storage | Negligible |

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| FireCrawl fails on specific site structure | Medium | Multi-page fallback + manual review |
| Image quality too low | Medium | Manual replacement via admin |
| AI generates inaccurate content | Low | Strict guardrails + generation log + human review |
| Missing testimonials/team | High | Sections hidden when data absent (by design) |
| Colour extraction wrong | Low | OKLCH conversion tested; admin can override |

---

## Recommended Next Steps

1. Push Supabase migrations
2. Verify env vars and FireCrawl credits
3. Run Option A test (scrape-only) on McCarty's site
4. Review scraped output vs existing data
5. Run Option B test (full pipeline with test site-id)
6. Visual inspection of the test tenant
7. Update CLAUDE.md files and MEMORY.md
8. Push to main, verify Vercel deploy
9. Run verify.mjs on deployed tenant
10. If all passes → onboard a NEW prospect as the real test
