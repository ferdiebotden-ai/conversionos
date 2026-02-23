# Automated Tenant Onboarding — Reference

*Created: Feb 22, 2026 | Updated: Feb 23, 2026*
*Status: PRODUCTION-READY — tested end-to-end with Red White Reno and McCarty Squared*

---

## TLDR

**The automation is built, tested, and production-ready.** Given a contractor's website URL, the pipeline scrapes their branding/content/images, uploads assets to Supabase Storage, seeds the database, sets up domain routing, and produces a fully branded ConversionOS tenant. Cost: ~$0.03/tenant.

**What you provide:** A URL, a site-id, and a tier. That's it.

### From Claude Code (recommended)

```
/onboard-tenant {site-id} {url} {tier}
```

Example:
```
/onboard-tenant pioneer-craftsmen https://pioneercraftsmen.com accelerate
```

### From the command line

```bash
cd ~/norbot-ops/products/demo

node scripts/onboarding/onboard.mjs \
  --url https://pioneercraftsmen.com \
  --site-id pioneer-craftsmen \
  --domain pioneer-craftsmen.norbotsystems.com \
  --tier accelerate
```

### After the pipeline finishes

```bash
# 1. Add domain to Vercel
npx vercel domains add pioneer-craftsmen.norbotsystems.com

# 2. Add DNS CNAME (Cloudflare dashboard or API)
#    CNAME: pioneer-craftsmen → cname.vercel-dns.com

# 3. Commit and deploy
git add src/proxy.ts
git commit -m "feat: onboard tenant pioneer-craftsmen"
git push
```

The site will be live at `https://pioneer-craftsmen.norbotsystems.com` within ~2 minutes of push.

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

## Infrastructure Status (All Complete)

| Prerequisite | Status |
|---|---|
| Supabase migrations pushed | Done (tenant-assets bucket, RLS policies, seed data) |
| Dependencies installed | Done (firecrawl-js, culori) |
| FireCrawl credits | 100K/month (upgraded) |
| Env vars configured | Done (FIRECRAWL_API_KEY, Supabase keys) |
| Code deployed to Vercel | Done (auto-deploys on push to main) |
| DNS configured | Done (Cloudflare CNAME → cname.vercel-dns.com) |

## AI Provider

- **Primary:** Claude Sonnet 4.6 via `claude -p` CLI — uses Max subscription, $0 marginal cost
- **Fallback:** OpenAI GPT-5.2 API — only used if Claude CLI is unavailable
- Both AI calls per tenant: mission statement generation + array augmentation

## Test Results

### Red White Reno (Feb 23, 2026)
- Audit score: **85%** (14 pass, 0 warnings, 3 missing: logo, about image, certifications)
- Brand colour: #d60000 extracted from CSS (56 occurrences)
- All AI generation via Claude Max subscription ($0 cost)
- Zero hallucinated content — 3-layer filter removes fake data
- Live at: https://redwhite.norbotsystems.com

### McCarty Squared (Feb 23, 2026)
- Full pipeline test with separate site-id `mccarty-test`
- Successfully scraped and provisioned alongside existing manual tenant

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

## Cost Per Tenant

| Item | Cost |
|------|------|
| FireCrawl (3 credits) | ~$0.03 |
| Claude AI (Max subscription) | $0 |
| Supabase Storage | Negligible |
| **Total** | **~$0.03/tenant** |

---

## Hallucination Protection

The scraper has 3 layers of hallucination detection:

1. **Placeholder patterns** — Filters "Jane Doe", "Your Business", "example.com", "BBB Accredited", etc.
2. **Off-domain URL filter** — Removes any URLs that don't match the source domain
3. **Markdown cross-reference** — Certifications, trust badges, and portfolio items must have 50%+ of their significant words present in the raw site content

## Current Tenants

| Site ID | Domain | Tier | Source |
|---------|--------|------|--------|
| `demo` | ai-reno-demo.vercel.app | Accelerate | Manual |
| `mccarty-squared` | mccarty.norbotsystems.com | Dominate | Manual |
| `redwhitereno` | redwhite.norbotsystems.com | Accelerate | Automated |
