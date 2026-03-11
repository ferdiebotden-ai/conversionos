# 04. Technical Operating Model

**Prepared:** March 2026

## Purpose

This document explains how the site-preservation version of Dominate fits the **current** ConversionOS stack. It is a strategy/operating note, not an implementation spec.

## Current Platform Truth

### Facts from the repo

- The current platform lives in `products/demo`.
- Framework stack: Next.js 16, React 19, TypeScript 5, Tailwind v4, shadcn/ui, Framer Motion, Supabase, Vercel AI SDK, Vercel deployment.
- Tenant identity resolves through domain mapping in `src/proxy.ts`.
- Runtime data isolation uses `site_id` and server-side helpers in `src/lib/db/site.ts`.
- Core capabilities already exist in the shared app:
  - visualizer
  - receptionist/chat
  - quote and admin flows
  - invoicing
  - analytics
- The tenant-builder pipeline already scrapes contractor sites, provisions tenants, deploys them, and runs fidelity-oriented QA.

## Current Deployment Model

### Facts

- NorBot currently operates a shared-codebase model.
- The repo is integrated with GitHub and Vercel.
- Vercel Git deployments support production deployments from the production branch and preview deployments for other pushes/branches.
- Current NorBot subdomains are routed through a shared Vercel project and tenant identity is mapped in `src/proxy.ts`.
- Wildcard DNS is already used for `*.norbotsystems.com`.

### Current practical flow

1. Code is merged to `main`
2. Vercel builds from GitHub
3. Production deployment updates the shared project
4. Incoming domain is mapped to `site_id`
5. Server code reads `x-site-id`
6. Data access filters by tenant

## Current Data Model and Isolation

### Facts

- Core operational tables are `site_id` scoped.
- The repo includes explicit multi-tenant migrations and indexes.
- The repo includes row-level security work to strengthen isolation.
- `getSiteIdAsync()` reads the middleware-set `x-site-id` header first, then environment fallback.

### Important nuance

The current platform is strong on tenant isolation for operational data, but there is still a documentation-worthy nuance:

- `admin_settings` is currently used for broad tenant configuration
- public-facing reads of `admin_settings` are more permissive than the standard that would be ideal if more sensitive config accumulates there

### Inference

Before site-preservation Dominate becomes a scaled promise, NorBot should eventually split:

- **public site config** for branding/navigation/content
- **private admin config** for internal settings and non-public behaviour

That is not a blocker for this business dossier, but it should be stated plainly so agents do not overstate the current security posture.

## Why the Current Shared Shell Is Not Enough

### Facts from current exploration

- The live MD Construction site includes utility-bar content, dropdown nav, hero form, FAQ/resources/blog depth, and a richer public information architecture than the current MD tenant in ConversionOS.
- The current shared public app in `products/demo` uses a common layout and route family across tenants.
- The platform already reproduces branding, content, and core AI features, but not one-to-one public-site fidelity.

### Inference

If Dominate is going to preserve the feel of a contractor's site, NorBot needs a **custom shell layer**, not a full per-client repo fork.

## Shared Core + Custom Shell Model

This is the recommended operating model.

### Shared core remains common

- tenant resolution
- Supabase data model
- entitlements
- AI routes
- visualizer
- receptionist/chat
- quote engine
- admin
- invoicing
- analytics
- monitoring and deployment stack

### Custom shell becomes tenant-specific

- public navigation
- utility bar
- public page templates
- section ordering
- page availability
- visual system and motion
- public-site CTA strategy
- page-specific layout patterns

### What this is not

- not a per-client application fork
- not a separate repo by default
- not a requirement to duplicate the AI stack or admin stack

## Working Shell Direction

This shell concept is **not yet built**. The business shift assumes a future direction like:

- shell registry keyed by `site_id`
- public-site config separated from private config
- route family that can support tenant-specific public pages and templates
- reusable premium patterns for common contractor site structures

Agents should describe this as:

- "a future custom shell layer on top of the existing shared core"

Agents should **not** describe it as already implemented.

## Domain Model for Client Websites

### Facts from current external sources

- Vercel supports setting up custom domains on projects.
- Vercel's platform documentation explicitly supports tenant bring-your-own-domain flows for multi-tenant platforms.
- Domain verification may require TXT-based verification or DNS changes.
- SSL is provisioned after verification succeeds.

### Practical operating model

For a Dominate client with an existing domain:

1. Keep the domain with the client wherever possible
2. Add the domain to the shared Vercel project
3. Verify the domain
4. Update DNS records through the client's current DNS provider
5. Allow Vercel to provision SSL
6. Route that domain to the client's `site_id`

This lets the contractor keep:

- their brand
- their domain
- their registrar relationship if desired

## Why This Is Not a Repo-Fork Model

Forking the repo per premium client would create major operational drag:

- duplicate fixes across clients
- duplicate security maintenance
- duplicate AI/admin updates
- inconsistent feature rollouts
- greater drift between tenants

The shared-core/custom-shell model preserves what matters:

- one platform
- one deployment logic
- one core codebase
- one place for feature evolution

while still creating room for premium public-site fidelity.

## Same-Domain Cutover Model

The normal technical path is:

- contractor keeps their existing domain
- NorBot rebuilds the site on ConversionOS
- DNS is updated to point that domain to the new deployment

Registrar transfer is optional. It is not required for cutover.

## Operational Summary

### Today

- shared core exists
- tenant routing exists
- platform features exist
- onboarding pipeline exists
- fidelity QA exists
- public-shell flexibility is limited

### Direction implied by this business shift

- keep shared core
- add premium public-shell flexibility
- preserve domains
- preserve brand feel
- avoid per-client forks

## Bottom Line

The technical path that best fits NorBot's current stack is:

- **shared platform core**
- **tenant-specific public shell layer**
- **same-domain cutover**
- **tight tenant isolation**
- **bounded premium delivery**

That is compatible with the way `products/demo` already works. It is far cleaner than turning Dominate into a repo-per-client model.
