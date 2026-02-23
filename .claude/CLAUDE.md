# ConversionOS Demo — Multi-Tenant Platform

## What This Is
ConversionOS is an AI-powered renovation platform sold to Ontario contractors.
Single codebase, three pricing tiers, environment + domain-driven tenancy.

Business: NorBot Systems Inc. | Three tiers: Elevate ($1,500 setup + $249/mo), Accelerate ($4,500 + $699/mo), Dominate ($15,000 + $2,500/mo)
Product: https://dashboard-rho-ten-70.vercel.app (internal pipeline dashboard)
This repo: The platform. One `main` branch serves ALL tenants. Feature gating via entitlements system.

## Architecture
- **Single codebase, single branch** (`main`). NO branches per tenant.
- **Entitlements:** `canAccess(tier, feature)` gates features by plan tier (Elevate/Accelerate/Dominate)
- **Tenant identity:** proxy resolves from hostname → `x-site-id` header, falls back to `NEXT_PUBLIC_SITE_ID` env var
- **Branding:** `admin_settings` table stores per-tenant config (name, colors, contact, pricing, plan tier)
- **UI:** `BrandingProvider` + `TierProvider` contexts feed branding and entitlements to client components
- **Server:** `getBranding()` for SSR, `getTier()` for entitlement checks
- **Deploy:** Single Vercel project with proxy routing (or legacy per-tenant projects)

## Adding a New Tenant

### Automated (preferred)
Use the `/onboard-tenant` skill or run the pipeline directly:
```bash
/onboard-tenant {site-id} {url} {tier}
# or
node scripts/onboarding/onboard.mjs --url {url} --site-id {site-id} --domain {site-id}.norbotsystems.com --tier {tier}
```
Pipeline: score → scrape → upload images → provision DB → verify. Checkpoints in `/tmp/onboarding/{site-id}/`. See `ONBOARDING_HANDOFF.md` for full details and prerequisites.

### Manual (fallback)
1. Seed `admin_settings` rows: `business_info`, `branding`, `company_profile`, `plan`, pricing keys
2. Add domain → site_id mapping to `DOMAIN_TO_SITE` in `src/proxy.ts`
3. Add domain to Vercel project (or create new project with `NEXT_PUBLIC_SITE_ID`)
4. Insert into `tenants` table with domain and plan tier
5. Optionally duplicate ElevenLabs voice agents for Dominate-tier tenants
6. Push to `main` → deploy

## Onboarding Pipeline
- **Scripts:** `scripts/onboarding/` — 9 scripts (score, scrape, schema, convert-color, upload-images, provision, onboard, verify, README)
- **Skill:** `.claude/skills/onboard-tenant/SKILL.md` — invokable as `/onboard-tenant`
- **Dependencies:** `@mendable/firecrawl-js`, `culori` (devDeps)
- **Env vars needed:** `FIRECRAWL_API_KEY`, `OPENAI_API_KEY` (in `~/pipeline/scripts/.env`), `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (in `.env.local`)
- **Cost:** ~$0.07/tenant
- **Handoff report:** `ONBOARDING_HANDOFF.md` (prerequisites, test plan, file inventory)

## ElevenLabs Voice Agents
- 3 personas: Emma (receptionist), Marcus (quote specialist), Mia (design consultant)
- **Dominate tier only** — voice toggle hidden on Elevate/Accelerate, API returns 403
- Each tenant can have duplicated agents via `POST /v1/convai/agents/{id}/duplicate`
- Agent IDs stored in env vars per Vercel project (zero code changes)

## Gemini Image Generation
- Model: `gemini-3-pro-image-preview` (configured in `src/lib/ai/gemini.ts`)
- Script: `scripts/generate-image.mjs` — reusable, takes prompt + output path
- Every image must be stunning. These demos replace real contractor websites.

## Quality Standard
Each demo must feel hand-built for the target. NOT cookie-cutter.
- Match the target's brand aesthetic (colors, tone, visual style)
- Use exact quotes from their testimonials (never paraphrase)
- Reflect their actual services, certifications, and unique selling points
- AI persona prompts must reference real staff names, real services, real location

## Gotchas
- Write tool creates CRLF on macOS — fix shell scripts: `perl -pi -e 's/\r\n/\n/g'`
- Vercel env vars: use API (curl), NOT `echo | vercel env add` (adds newline)
- Primary color uses OKLCH: `--primary: oklch(...)` in `globals.css`
- Admin header: uses User icon, not initials
- `getSiteId()` is synchronous (env var only) — do NOT make async (80+ call sites)
- `getSiteIdAsync()` exists for new code that needs proxy header support
