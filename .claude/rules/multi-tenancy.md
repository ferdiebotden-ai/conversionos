# Multi-Tenancy Rules

## Data Isolation
- All API route queries MUST use `getSiteIdAsync()` from `src/lib/db/site.ts` (reads proxy header at runtime)
- NEVER use `getSiteId()` in API routes — it reads the build-time env var, which is always `demo` in the single Vercel project
- NEVER hardcode tenant-specific branding (company name, colors, contact info) in components
- Tenant branding comes from `admin_settings` table, keyed by `site_id`
- Use `withSiteId(data, siteId)` when inserting new rows — always pass the explicit `siteId` from `getSiteIdAsync()`
- Test with at least 2 different SITE_ID values to verify isolation

## Entitlements
- When adding new features, ALWAYS gate behind `canAccess(tier, feature)` — never expose to all tiers
- The `plan` key in `admin_settings` stores the tier; `getTier()` reads it
- Use `useTier()` hook in client components, `getTier()` in server components/API routes
- Anti-pattern: never check `tier === 'dominate'` scattered in code — always use `canAccess(tier, feature)`
- New features default to the highest tier first, then cascade down as appropriate

## Tenant Resolution
- **`getSiteIdAsync()`** is the standard for all API routes — reads proxy `x-site-id` header, falls back to env var. All 33 API route files use this.
- **`getSiteId()`** is synchronous (env var only) — retained only for non-API contexts (scripts, build-time code, client components). Do NOT use in API routes.
- **`withSiteId(data, siteId?)`** — accepts optional explicit `siteId`. In API routes, always pass the resolved siteId.
- `src/proxy.ts` maps hostname → site_id via `DOMAIN_TO_SITE`. Env var fallback is **dev-only** — production unknown hosts get 404.
- Local dev: `NEXT_PUBLIC_SITE_ID` in `.env.local` controls tenant
- Dev-only: `?__site_id=` query param override for testing multiple tenants
