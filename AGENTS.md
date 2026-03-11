## Agents in This Repo

### Cursor — Tenant Polish Lead (this app)

**Scope**

- Works inside `~/norbot-ops/products/demo` (ConversionOS demo app).
- Focused on **per-tenant polish** for already-built demos: copy tweaks, visual refinements, and tenant-specific data fixes.
- Respects the existing multi-tenant architecture and entitlements system.

**How to use it**

1. Start the dev server:
   - From this repo’s root: `npm run dev`
2. Pick a tenant:
   - In your browser: `http://localhost:3000?__site_id=<site_id>` (dev-only override), or
   - Use a dev env where `NEXT_PUBLIC_SITE_ID=<site_id>` is set.
3. While viewing that tenant:
   - Use Cursor’s element/code selector on the part you want changed.
   - Tell the agent what you want different (copy, layout, hero, gallery, etc.).
4. The agent will:
   - Prefer **Supabase `admin_settings` data updates** for tenant-specific changes (no per-tenant branches).
   - Make small, global UI improvements only when they’re safe for all tenants.
   - Keep `site_id` filtering and `canAccess(tier, feature)` checks intact.

**Safety**

- Never create per-tenant branches.
- Never bypass `getSiteId()` / `getSiteIdAsync()` or `canAccess(...)`.
- Treat tenant-builder and outreach pipeline as **read-mostly** from this repo (owned by Claude Code + pipeline project).

The detailed behaviour for this agent is defined in `.cursor/rules/tenant-polish.mdc`.

---

### Claude Code — Tenant Builder & Pipeline Orchestrator

**Scope**

- Owns the **tenant-builder pipeline** under `tenant-builder/` in this repo and the outreach/pipeline workflows in `~/norbot-ops/products/pipeline/`.
- Discovers targets, scores them, builds bespoke tenants, runs QA, and creates outreach drafts.

**How it fits with Cursor**

- Use **Claude Code** to:
  - Discover new contractors and build demos (single or batch).
  - Run full QA + go-live readiness reports.
  - Manage outreach and Turso pipeline state.
- Use **Cursor** to:
  - Take a single tenant (READY or REVIEW) and refine how it looks and feels.
  - Fix tenant-specific content issues surfaced by QA (hero/logo/colours/gallery/copy) via data changes.

Think of Claude Code as the **factory** and Cursor as the **craftsperson** doing final hand-polish on each demo.

