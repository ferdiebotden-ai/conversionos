# Build Session Protocol

You are an autonomous build session implementing one work unit of the ConversionOS Onboarding Pipeline. Follow this 6-phase protocol exactly.

## Context

- **Project:** ConversionOS — multi-tenant AI renovation platform
- **Stack:** Next.js 16.1.6, React 19, TypeScript 5 (strict), Supabase, Tailwind v4, shadcn/ui
- **Working directory:** The demo product repo
- **Tenant resolution:** `getSiteId()` (synchronous, env var) — 80+ call sites, never make async
- **Branding:** `admin_settings` table stores per-tenant config — never hardcode tenant values
- **CSS colours:** `--primary` uses OKLCH format in `globals.css`

## Phase 1: Orient (read-only)

1. Read `scripts/build-state.json` to identify which unit you're implementing
2. Read the CLAUDE.md files at the project root and `.claude/` for conventions
3. Read every file listed in the unit's "files" array to understand current state
4. Check the unit's scope — you MUST NOT modify files outside the listed scope

## Phase 2: Pre-Build Health Check

1. Run `npm run build` to establish baseline
2. If the build fails, document the pre-existing errors and work around them
3. If the build passes, note the baseline for regression comparison

## Phase 3: Implement

Follow the unit-specific instructions below exactly. For each file:
1. Read the current file content first
2. Make the specified changes using Edit (preferred) or Write
3. Ensure TypeScript strict mode compliance — no `any` types, no missing properties
4. Preserve existing code style (indentation, import ordering, component patterns)

Key conventions:
- `getSiteId()` for tenant isolation in ALL DB queries
- `canAccess(tier, feature)` for feature gating — never check tier directly
- `getBranding()` for server-side branding, `useBranding()` for client-side
- `getCompanyConfig()` for rich company data
- Canadian spelling (colour, centre, favourite) in comments and user-facing strings
- All Supabase queries must filter by `site_id`

## Phase 4: Post-Build Health Check

1. Run `npm run build`
2. Fix ALL TypeScript errors before proceeding
3. If you introduce new errors, fix them immediately
4. Re-run `npm run build` until it passes clean

## Phase 5: Delete (if applicable)

If the unit specifies files to delete:
1. Delete them using `rm`
2. Run `npm run build` again to verify nothing breaks

## Phase 6: Commit

1. Stage all changes: `git add -A`
2. Create a commit with message format:
   ```
   feat(onboarding): implement {unit-id} — {unit-name}

   {brief description of changes}

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
   ```
3. Verify commit succeeded

## Rules

- **DO NOT** modify files outside the unit's scope
- **DO NOT** hardcode tenant-specific values (company names, colours, content)
- **DO NOT** break existing functionality — all fallback paths must work
- **DO NOT** skip the health checks
- **DO NOT** leave TypeScript errors
- **DO** use the exact field names specified (camelCase for TS interfaces, snake_case for DB/JSON)
- **DO** add fallback defaults for all new fields (backward compatibility)
- **DO** run `npm run build` after every significant change
