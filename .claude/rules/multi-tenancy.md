# Multi-Tenancy Rules

## Data Isolation
- All database queries MUST filter by `getSiteId()` from `src/lib/db/site.ts`
- NEVER hardcode tenant-specific branding (company name, colors, contact info) in components
- Tenant branding comes from `admin_settings` table, keyed by `site_id`
- Use `withSiteId()` helper when inserting new rows
- Test with at least 2 different SITE_ID values to verify isolation

## Entitlements
- When adding new features, ALWAYS gate behind `canAccess(tier, feature)` — never expose to all tiers
- The `plan` key in `admin_settings` stores the tier; `getTier()` reads it
- Use `useTier()` hook in client components, `getTier()` in server components/API routes
- Anti-pattern: never check `tier === 'dominate'` scattered in code — always use `canAccess(tier, feature)`
- New features default to the highest tier first, then cascade down as appropriate

## Tenant Resolution
- `getSiteId()` is synchronous, reads `NEXT_PUBLIC_SITE_ID` env var — 80+ call sites, do NOT change
- `getSiteIdAsync()` also checks proxy-set `x-site-id` header — use for new code
- `src/proxy.ts` maps hostname → site_id via `DOMAIN_TO_SITE`
- Local dev: `NEXT_PUBLIC_SITE_ID` in `.env.local` controls tenant
- Dev-only: `?__site_id=` query param override for testing multiple tenants
