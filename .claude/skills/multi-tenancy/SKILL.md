---
name: multi-tenancy
description: "Multi-tenant architecture patterns for ConversionOS. Use when adding new features, creating new tables, onboarding tenants, understanding data isolation, entitlements, or working with per-tenant branding and configuration."
---

# Multi-Tenancy Architecture

ConversionOS is a multi-tenant platform where a single codebase serves multiple renovation contractor clients. Tenants are resolved via proxy (hostname) or env var, gated by pricing tier (Elevate/Accelerate/Dominate).

## Core Architecture

```
┌─────────────────────────────────────────────────┐
│                  Git: main branch                │
│               (single codebase)                  │
└──────────────────────┬──────────────────────────┘
                       │
              ┌────────▼────────┐
              │  Vercel Project  │
              │  (single or      │
              │   per-tenant)    │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │   proxy.ts       │
              │  hostname →      │
              │  x-site-id       │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────▼────┐  ┌─────▼───┐  ┌─────▼───────┐
    │Elevate  │  │Accelerate│  │ Dominate    │
    │Website  │  │+ Admin   │  │+ Voice      │
    │+ Chat   │  │+ Quotes  │  │+ Integrations│
    └────┬────┘  └────┬─────┘  └────┬────────┘
         │            │             │
    ┌────▼────────────▼─────────────▼──────┐
    │         Supabase Database             │
    │  (all tables have site_id column)     │
    │  admin_settings.plan → tier           │
    └───────────────────────────────────────┘
```

## How Tenant Identity Works

### Resolution Order

1. `NEXT_PUBLIC_SITE_ID` env var (always checked first, synchronous)
2. `x-site-id` header set by `src/proxy.ts` (from hostname mapping)
3. Dev-only: `?__site_id=` query param override

### getSiteId() Helper

```typescript
// src/lib/db/site.ts
export function getSiteId(): string {
  // Synchronous — reads env var only (80+ call sites)
  const siteId = process.env['NEXT_PUBLIC_SITE_ID']
  if (siteId) return siteId
  throw new Error('Could not resolve site_id')
}

export async function getSiteIdAsync(): Promise<string> {
  // Also checks proxy-set header — use for new code
}

export function withSiteId<T extends Record<string, unknown>>(data: T) {
  return { ...data, site_id: getSiteId() }
}
```

**Every server component, server action, and API route** that touches the database must call `getSiteId()` and use it to filter queries.

## Entitlements System

### Feature Map

| Feature | Elevate | Accelerate | Dominate |
|---------|:---:|:---:|:---:|
| branded_website | Yes | Yes | Yes |
| ai_visualizer | Yes | Yes | Yes |
| lead_capture | Yes | Yes | Yes |
| emma_text_chat | Yes | Yes | Yes |
| admin_dashboard | — | Yes | Yes |
| ai_quote_engine | — | Yes | Yes |
| pdf_quotes | — | Yes | Yes |
| invoicing | — | Yes | Yes |
| drawings | — | Yes | Yes |
| voice_web | — | — | Yes |
| voice_phone | — | — | Yes |
| custom_integrations | — | — | Yes |
| location_exclusivity | — | — | Yes |

### Gating Code

```typescript
// Server-side
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';

const tier = await getTier();
if (!canAccess(tier, 'invoicing')) {
  return NextResponse.json({ error: '...' }, { status: 403 });
}

// Client-side
import { useTier } from '@/components/tier-provider';

const { canAccess } = useTier();
if (canAccess('voice_web')) { /* show voice UI */ }
```

## admin_settings Table

Per-tenant branding and configuration stored as JSONB key/value pairs.

### Standard Keys

| Key | Type | Description |
|-----|------|-------------|
| `business_info` | JSONB | name, phone, email, address, city, province, postal |
| `branding` | JSONB | tagline, colors (primary_hex, primary_oklch), socials |
| `company_profile` | JSONB | principals, testimonials, services, aboutCopy, mission |
| `plan` | JSONB | `{"tier": "elevate" | "accelerate" | "dominate"}` |
| `pricing_*` | JSONB | Per-project-type pricing (kitchen, bathroom, etc.) |

### Reading Branding in Components

```typescript
// Server: use getBranding() from src/lib/branding.ts
const branding = await getBranding();

// Client: use useBranding() from src/components/branding-provider.tsx
const branding = useBranding();
```

## Data Isolation

### All Tables Must Have site_id

Every table that contains tenant data MUST include a `site_id TEXT NOT NULL` column.

### All Queries Must Filter by site_id

```typescript
// CORRECT
const { data } = await supabase
  .from('leads')
  .select('*')
  .eq('site_id', getSiteId())

// WRONG — returns data from ALL tenants
const { data } = await supabase
  .from('leads')
  .select('*')
```

## How to Add a New Tenant

1. Seed `admin_settings` rows: `business_info`, `branding`, `company_profile`, `plan`, pricing keys
2. Add domain → site_id mapping to `DOMAIN_TO_SITE` in `src/proxy.ts`
3. Insert into `tenants` table with domain and plan tier
4. Add domain to Vercel project (or create new project with `NEXT_PUBLIC_SITE_ID`)
5. Push to `main` → deploy

## Adding New Features

When building any new feature, always:

1. Include `site_id` column on any new tables
2. Filter by `getSiteId()` in all queries
3. Gate behind `canAccess(tier, feature)` — never expose to all tiers
4. Read tenant-specific config from `admin_settings` instead of hardcoding
5. Test with at least 2 different `NEXT_PUBLIC_SITE_ID` values
