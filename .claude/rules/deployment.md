# Deployment Rules

## Single Vercel Project + Proxy Routing

All tenants deploy from one Vercel project (`conversionos`) via proxy-based domain routing.

- `src/proxy.ts` resolves tenant from hostname via `DOMAIN_TO_SITE` map
- Sets `x-site-id` request header → `getSiteIdAsync()` reads it
- Wildcard DNS (`*.norbotsystems.com → cname.vercel-dns.com`) on Cloudflare handles all subdomains
- Wildcard domain `*.norbotsystems.com` registered on Vercel for SSL cert provisioning
- One push to `main` = one build = all tenants updated

## Adding a New Tenant

1. Seed `admin_settings` rows in Supabase (business_info, branding, company_profile, plan, pricing)
2. Add domain → site_id mapping to `DOMAIN_TO_SITE` in `src/proxy.ts`
3. Push to `main` — wildcard DNS resolves the subdomain automatically
4. Optionally run `node scripts/onboarding/add-domain.mjs --domain X --site-id Y` to explicitly register the domain with Vercel for SSL cert provisioning (wildcard cert covers this, but explicit registration is faster)

## Rules

- NEVER create git branches for per-tenant customisation
- Push to `main` auto-deploys to all tenants simultaneously
- Production clients get their own Supabase project (not the shared demo one)
- Session save URLs and share URLs derive from the request `Host` header — no hardcoded fallback URLs

## Local Development

- `NEXT_PUBLIC_SITE_ID` in `.env.local` controls which tenant renders
- `?__site_id=` query param override (dev mode only) for testing multiple tenants without restart
- `NEXT_PUBLIC_APP_URL=http://localhost:3000` for email links during local dev
