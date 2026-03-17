# ConversionOS — Platform Context

## Who We Are

NorBot Systems Inc. is a one-person AI-native company founded by Ferdie Botden (CPA, 10yr TD Bank agriculture banking). We build vertical operating systems for high-trust industries. The founder operates with an 8-agent AI mesh that does the work of a 15-person team. Monthly infrastructure cost: ~$860.

## What ConversionOS Does

ConversionOS rebuilds contractor websites from the ground up — premium, AI-native, conversion-optimised. Each tenant gets:
- **Public website** — hero, services, gallery, testimonials, contact (52 section components in `src/sections/`)
- **AI Design Visualiser** — homeowner uploads photo, sees renovation in multiple styles (Gemini 3.1 Flash Image)
- **Smart Quote Engine** — AI-generated ballpark estimates with line items
- **Voice Receptionist** — 24/7 AI phone + chat (ElevenLabs + GPT 5.4)
- **Admin Dashboard** — leads, quotes, invoices, drawings, conversion analytics

## Multi-Tenancy Architecture

**Single Vercel deployment** serves ALL 36+ tenants (proxy.ts DOMAIN_TO_SITE):
- `src/proxy.ts` maps hostname → `site_id` (e.g., `red-white-reno.norbotsystems.com` → `red-white-reno`)
- DNS: wildcard CNAME `*.norbotsystems.com` → Vercel via Cloudflare
- Tenant isolation: all DB queries filter by `site_id`
- Branding: per-tenant config in `admin_settings` table (colours, contact, tier)
- Entitlements: gated by pricing tier (Elevate / Accelerate / Dominate)

## Two Build Workflows

### 1. Tenant Builder (Batch Pipeline)
- Location: `tenant-builder/orchestrate.mjs`
- 18-step autonomous pipeline: URL → Scrape → Architect → Build → QA → Deploy → Email Draft
- Runs nightly via LaunchAgent, builds 10 sites/night
- Output: template tenants on the multi-tenant platform

### 2. Warm-Lead Builder (Bespoke)
- Location: `../../products/warm-leads/{client-name}/`
- Each warm-lead is a STANDALONE Next.js app (own Vercel project, own domain)
- Uses the same 3 shared packages but gets custom sections, branding, images
- Deploy: copy packages locally → transform paths → `npx vercel --prod`
- Currently 11 individual client builds deployed

## Shared Packages (The Hub)

Location: `../../packages/` (3 packages, consumed by ConversionOS AND all warm-leads)

| Package | Path | Contains |
|---------|------|----------|
| `conversionos-runtime` | `packages/conversionos-runtime/` | Entitlements, branding helpers, DB schema, theme engine, quote assistance |
| `conversionos-admin-core` | `packages/conversionos-admin-core/` | Admin dashboard components (leads table, quote editor, invoice manager, drawings) |
| `conversionos-visualizer` | `packages/conversionos-visualizer/` | AI design visualiser logic, image generation, style engine |

**Propagation:** Changes to packages affect ALL builds. After modifying a package, every warm-lead needs to be redeployed to pick up the change.

## Deploy Workflow

**For ConversionOS (multi-tenant platform):**
```bash
scripts/sync-deploy.sh  # Transforms monorepo → standalone Vercel project
cd ~/norbot-ops/products/demo && git add -A && git commit && git push
# Vercel auto-deploys from GitHub
```

**For warm-leads (individual clients):**
```bash
cd products/warm-leads/{client}/
# Copy packages locally, swap refs, deploy, restore
# See /fix-warm-lead skill for the full workflow
```

## Brand Rules
- Primary: teal #0D9488 | OKLCH: 0.55 0.15 170
- Canadian spelling: colour, centre, favourite, visualiser
- All sections must be mobile-responsive (test at 375px, 768px, 1024px)

## Key Credential Locations (DO NOT commit values)
- Supabase + OpenRouter + Gmail: `pipeline/scripts/.env`
- Turso DB: `pipeline/.env` or `.env.local`
- Vercel: `npx vercel env ls` for current project
