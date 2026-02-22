# Deployment Rules

## Two Deployment Patterns (Both Supported)

### Primary: Single Vercel Project + Proxy Routing
- `src/proxy.ts` resolves tenant from hostname via `DOMAIN_TO_SITE` map
- Sets `x-site-id` request header → `getSiteIdAsync()` reads it
- Add new tenant domains to the consolidated Vercel project via Vercel Domains API
- Unlimited tenants from a single project

### Legacy: Per-Tenant Vercel Projects
- Each tenant = separate Vercel project with `NEXT_PUBLIC_SITE_ID` env var
- Still works — `getSiteId()` reads env var first (takes precedence)
- Caps at 60 projects on Vercel Pro plan

## Rules
- NEVER create git branches for per-tenant customization
- Push to `main` auto-deploys ALL tenant projects simultaneously
- New tenants: seed admin_settings → add to `DOMAIN_TO_SITE` in proxy.ts → add domain to Vercel
- Production clients get their own Supabase project (not the shared demo one)

## Local Development
- `NEXT_PUBLIC_SITE_ID` in `.env.local` controls which tenant renders
- `?__site_id=` query param override (dev mode only) for testing multiple tenants without restart
