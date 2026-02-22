# Entitlements Rules

## Pricing Tiers
- **Elevate** ($249/mo): Branded website, AI visualizer, lead capture, Emma text chat
- **Accelerate** ($699/mo): + Admin dashboard, AI quote engine, PDF quotes, invoicing, drawings
- **Dominate** ($2,500/mo): + Voice agents, custom integrations, location exclusivity

## Code Patterns

### Server-side (API routes, server components)
```typescript
import { getTier } from '@/lib/entitlements.server';
import { canAccess } from '@/lib/entitlements';

const tier = await getTier();
if (!canAccess(tier, 'invoicing')) {
  return NextResponse.json({ error: '...' }, { status: 403 });
}
```

### Client-side (React components)
```typescript
import { useTier } from '@/components/tier-provider';

const { canAccess } = useTier();
if (canAccess('voice_web')) { /* show voice UI */ }
```

## Where Features Are Gated
- `src/app/admin/layout.tsx` — Server component redirects Elevate to `/`
- `src/components/admin/sidebar.tsx` — Hides nav items based on tier
- `src/app/api/voice/signed-url/route.ts` — 403 for non-Dominate
- `src/app/api/leads/route.ts` — Skips AI quote generation for Elevate
- `src/app/api/quotes/**/route.ts` — 403 for non-Accelerate+
- `src/app/api/invoices/**/route.ts` — 403 for non-Accelerate+
- `src/app/api/drawings/**/route.ts` — 403 for non-Accelerate+
- `src/components/receptionist/receptionist-chat.tsx` — Hides voice toggle for non-Dominate

## Adding a New Feature
1. Add feature key to the `Feature` type in `src/lib/entitlements.ts`
2. Add to appropriate tier(s) in `TIER_FEATURES`
3. Gate in server code: `const tier = await getTier(); if (!canAccess(tier, 'new_feature')) ...`
4. Gate in client code: `const { canAccess } = useTier(); if (canAccess('new_feature')) ...`

## Anti-Patterns
- Never check `tier === 'dominate'` directly — always use `canAccess(tier, feature)`
- Never expose features to all tiers without explicit entitlement mapping
- Never skip the `getTier()` check in API routes just because the admin layout gates the UI
