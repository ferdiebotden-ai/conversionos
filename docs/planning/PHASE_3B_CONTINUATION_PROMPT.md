# Quote Engine V2 — Phase 3B Continuation Prompt

Copy everything below the line into a new Claude Code session to continue.

---

## Context

You are continuing the Quote Engine V2 implementation for ConversionOS, a multi-tenant AI renovation quoting platform for Ontario contractors.

**What's already shipped (all committed + pushed to main):**

### Phase 2 (commit `07d9552`, 358 tests):
- **F1:** Default-accepted line items (no accept/reject gate)
- **F2:** Transparency cards ("show the math" per line item — material cost, labour, markup %)
- **F3:** Per-category markups (7 categories: Materials 15%, Labour 30%, Contract Labour 15%, Equipment 10%, Permits 0%, Allowances 0%, Other 10%)
- **F4:** Good/Better/Best tiers (single AI call, tab UI in editor, comparison page in PDF)
- **F5:** Scope gap detection (20+ pure rules, zero API cost, warnings in quote editor)
- **F11:** Deposit changed from 50% to 15%

### Phase 3A (commit `9d5ef0f`, 449 tests):
- **F6: Multi-Page PDF** — Cover page (logo, company info, quote ref, customer details), before/after photo page (conditional), category-grouped line items with subtotals (no unit prices shown), tier comparison page, terms + signature block, "Page X of Y" footer
- **F7: E-Signature** — Public `/quote/accept/[token]` page (mobile-first, contractor-branded), 24-char token, typed name + checkbox acceptance, acceptance status badge in editor, lead status → 'won' on approval
- **F8: Quote Versioning** — Snapshot-on-send (freeze current row, create new draft v+1), version history API, horizontal chip bar in editor, read-only mode for old versions
- **Contractor Lead Intake** — `contractor_lead_intake` entitlement (accelerate+), 3-tab dialog (Dictate/Type/Form), voice dictation via MediaRecorder + OpenAI Whisper ($0.003/min), AI field extraction via GPT-4o-mini, source badges on leads table, intake-aware email generation

## What Phase 3B Implements

Two remaining PRD features from the Quote Engine V2 PRD:

### Feature 9: CSV Price Upload
**Goal:** Let contractors upload their own material/labour price lists (CSV/Excel) so AI quotes use real prices instead of the Ontario average database.

**Key requirements:**
- Upload UI in admin Settings → "Pricing" tab (new tab alongside existing Branding, Quoting, etc.)
- Accept CSV with columns: `item_name`, `category`, `unit`, `unit_price`, `supplier` (optional)
- Parse + validate with Zod (reject malformed rows, show error summary)
- Store in new `contractor_prices` table (site_id, item_name, category, unit, unit_price, supplier, uploaded_at)
- AI quote generation: when `contractor_prices` has entries for the site, prefer those over Ontario DB prices
- Price merge logic: contractor price wins when item name fuzzy-matches (Levenshtein distance < 3), fall back to Ontario DB otherwise
- Entitlement: gate behind `csv_price_upload` (accelerate + dominate)
- Show "Using your prices" indicator in quote editor when contractor prices were used
- Allow re-upload (replaces all rows for that site_id — full replace, not merge)

**Files to create/modify:**
- `supabase/migrations/YYYYMMDD_contractor_prices.sql` (NEW)
- `src/app/api/admin/prices/route.ts` (NEW — POST upload, GET list, DELETE clear)
- `src/components/admin/price-upload.tsx` (NEW — upload UI with drag-drop, preview table, error display)
- `src/app/admin/settings/page.tsx` (MODIFY — add Pricing tab)
- `src/lib/ai/quote-generation.ts` (MODIFY — integrate contractor prices into prompt)
- `src/lib/entitlements.ts` (MODIFY — add feature)
- `src/types/database.ts` (MODIFY — add ContractorPrice type)
- `tests/unit/price-upload.test.ts` (NEW)

### Feature 10: Assembly Templates
**Goal:** Let contractors define reusable "assemblies" — pre-built bundles of line items that represent common work packages (e.g., "Standard Kitchen Demo" = 5 specific items, "Bathroom Tile Package" = 3 items). When building a quote, contractors can insert an assembly and all its items appear at once.

**Key requirements:**
- Template management UI in admin Settings → "Templates" tab
- Each template: name, category, description, array of line items (description, category, quantity, unit, unit_price)
- Store in new `assembly_templates` table (site_id, name, category, description, items JSONB, created_at, updated_at)
- Insert into quote editor: "Insert Template" button opens picker → selecting a template adds all its line items
- AI can suggest assemblies: when generating a quote, if contractor has templates matching the project type, AI references them
- CRUD API for templates
- Entitlement: gate behind `assembly_templates` (accelerate + dominate)
- Pre-seed: Include 5-10 default templates for common Ontario renovation assemblies (kitchen demo, bathroom rough-in, etc.) that contractors can customise

**Files to create/modify:**
- `supabase/migrations/YYYYMMDD_assembly_templates.sql` (NEW)
- `src/app/api/admin/templates/route.ts` (NEW — CRUD)
- `src/components/admin/template-manager.tsx` (NEW — list/create/edit/delete UI)
- `src/components/admin/template-picker.tsx` (NEW — modal for inserting into quote)
- `src/app/admin/settings/page.tsx` (MODIFY — add Templates tab)
- `src/components/admin/quote-editor.tsx` (MODIFY — add "Insert Template" button)
- `src/lib/ai/quote-generation.ts` (MODIFY — template-aware AI prompts)
- `src/lib/entitlements.ts` (MODIFY — add feature)
- `src/types/database.ts` (MODIFY — add AssemblyTemplate type)
- `src/lib/data/default-templates.ts` (NEW — seed data)
- `tests/unit/assembly-templates.test.ts` (NEW)

## Implementation Notes

### Stack & Patterns (follow existing conventions)
- Next.js 16 App Router, React 19, TypeScript 5 strict, Supabase, Tailwind v4, shadcn/ui
- All DB queries MUST filter by `site_id` via `getSiteId()` — see `src/lib/db/site.ts`
- All new features MUST be gated with `canAccess(tier, feature)` — see `src/lib/entitlements.ts`
- AI calls: Vercel AI SDK v6 `generateObject()` with `maxOutputTokens` (not `maxTokens`)
- Zod schemas for all validation
- `exactOptionalPropertyTypes` is on — use `type?: string | undefined` pattern
- For Supabase inserts with columns not in generated types, use `(supabase.from('table') as ReturnType<typeof supabase.from>).insert({...})`

### Key files to read first
- `docs/PRODUCT_REFERENCE.md` — comprehensive product reference (just updated for Phase 3A)
- `src/lib/entitlements.ts` — feature gating pattern
- `src/components/admin/quote-editor.tsx` — where "Insert Template" button goes
- `src/app/admin/settings/page.tsx` — where new Pricing and Templates tabs go
- `src/lib/ai/knowledge/pricing-data.ts` — existing Ontario pricing DB that CSV prices override
- `src/types/database.ts` — current schema types

### Agent Teams recommendation
These two features have clean file ownership boundaries — good candidate for Agent Teams with 2 teammates:
- **Teammate 1 (CSV Prices):** Migration, API route, upload UI, settings tab, price merge logic, tests
- **Teammate 2 (Assembly Templates):** Migration, CRUD API, template manager, template picker, quote editor integration, default seeds, tests
- **Shared files (lead assembles):** `entitlements.ts`, `database.ts`, `settings/page.tsx`, `quote-generation.ts`

### After implementation
1. Run `rm -rf .next && npm run build` (stale `.next` cache is a known issue)
2. Run `npm run test` (target: all existing 449 + new tests pass)
3. Run `npm run lint` on new files
4. Update `docs/PRODUCT_REFERENCE.md` (use `/update-product-reference` skill)
5. Commit with conventional style: `feat: Quote Engine V2 Phase 3B — CSV price upload, assembly templates`

### Business constants
- HST: 13%
- Default deposit: 15%
- Default contingency: 10%
- Estimate variance: +/- 15%
- Quote validity: 30 days
