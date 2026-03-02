# Launch Gate Review (Final)

## High-Level Summary
- `No-Go` right now due one `BLOCKER` and multiple `HIGH` issues on tenant isolation and abuse resistance.
- Architecture is consistent with the stated context: Next.js route handlers + service-role Supabase + proxy domain routing + entitlement gating, but tenant resolution is split between env-based and header-based paths.
- Biggest net-new risk: request-scoped tenant resolution is inconsistent across the stack, so `site_id` filters can still target the wrong tenant in single-project proxy mode.
- Visualizer critical path is functionally complete (SSE, retries, Gemini timeouts), but server-side image validation is too weak and storage-failure fallbacks can push large base64 payloads into DB/responses.
- Quote critical path works end-to-end, but `send` writes are non-transactional after email send, so partial state is possible.
- Onboarding pipeline is robust in sequencing/rollback, but shell command construction in `onboard.mjs` introduces injection risk if upstream inputs are compromised.
- Quality gates: tests pass (`888/888`), but lint and `tsc --noEmit` fail substantially (pre-existing).
- `npm audit` only shows the known accepted Sentry/webpack `serialize-javascript` chain (5 high), no additional net-new dependency finding.
- No code changes were made for this review.

## Issue List

| Area | Severity | Location | Description | Proposed Fix |
|---|---|---|---|---|
| Multi-tenant isolation (resolver mismatch) | BLOCKER | `src/lib/db/site.ts:18`, `src/lib/db/site.ts:33`, `src/lib/entitlements.server.ts:19`, `src/lib/branding.ts:60`, `src/app/api/admin/settings/route.ts:23`, `src/app/api/admin/settings/route.ts:33` | `getTier()/getBranding()` resolve tenant from proxy header (`getSiteIdAsync`), while most DB queries/inserts use env-only `getSiteId()/withSiteId`. In single-project proxy mode, this can read/write wrong tenant data despite `site_id` filters. | Make one request-scoped tenant resolver the only source of truth in route handlers. Migrate API handlers to resolve `siteId` once asynchronously and pass it through all queries/inserts. Replace/phase out sync `withSiteId` for request paths. |
| Proxy fallback routing | HIGH | `src/proxy.ts:36`, `src/proxy.ts:41`, `src/proxy.ts:43` | Unknown hosts fall back to `NEXT_PUBLIC_SITE_ID`, which can map unmapped traffic to a default tenant instead of 404. | In production, remove env fallback for unknown domains. Resolve only from explicit domain map/tenant registry and return 404 otherwise. Keep env fallback dev-only. |
| Rate-limit coverage gaps on high-cost/public mutation routes | HIGH | `src/app/api/quotes/[leadId]/regenerate/route.ts:30`, `src/app/api/ai/visualize/refine/route.ts:147`, `src/app/api/sessions/save/route.ts:30`, `src/app/api/admin/settings/route.ts:216`, `src/lib/rate-limit.ts:16` | Multiple expensive or publicly callable routes skip `applyRateLimit` (or have no config entry), enabling cost/abuse spikes. | Add `applyRateLimit` to these handlers and explicit config keys (method-specific where needed). Add tests asserting limiter invocation. |
| `/api/ai/chat` unvalidated raw input + unrestricted `systemPromptOverride` | HIGH | `src/app/api/ai/chat/route.ts:30`, `src/app/api/ai/chat/route.ts:96` | Route destructures raw JSON and directly trusts client-supplied `systemPromptOverride`; no bounds on message count/size/images. This is a cost and behavior-control abuse surface. | Add strict Zod schema with max lengths/counts/image constraints. Remove unrestricted override or gate to server-side approved prompt IDs only. |
| Image upload validation and storage fallback behavior | HIGH | `src/lib/schemas/visualization.ts:36`, `src/app/api/ai/analyze-photo/route.ts:16`, `src/app/api/ai/visualize/route.ts:452`, `src/app/api/ai/visualize/route.ts:476`, `src/app/api/ai/visualize/stream/route.ts:113` | Server accepts any non-empty image string, trusts MIME in data URL, lacks decoded size/dimension caps, and falls back to data URLs on storage failure. This can cause high-cost abuse and DB/payload bloat. | Enforce server-side MIME allowlist + decoded byte limits + dimension checks. Reject on storage failure (or quarantine), and do not persist raw data URLs as canonical image URLs. |
| Quote send flow consistency | MEDIUM | `src/app/api/quotes/[leadId]/send/route.ts:255`, `src/app/api/quotes/[leadId]/send/route.ts:270`, `src/app/api/quotes/[leadId]/send/route.ts:297` | After successful email send, several DB writes are not transactionally grouped and write errors are not checked. API can return success with partially applied state. | Move post-send mutations into one DB transaction/RPC and verify each write result; add retry/compensation path. |
| Onboarding script command injection surface | MEDIUM | `scripts/onboarding/onboard.mjs:57`, `scripts/onboarding/onboard.mjs:73`, `scripts/onboarding/onboard.mjs:82`, `scripts/onboarding/onboard.mjs:100` | `execSync(cmd)` uses interpolated CLI input (`url/domain/site-id/tier`) in shell strings. If upstream input is compromised, this is injectable. | Replace shell-string execution with `execFile/spawn` argument arrays and strict input validation regexes. |
| RPC signature drift (`link_visualization_to_lead`) | MEDIUM | `src/app/api/leads/route.ts:303`, `supabase/migrations/20260210000000_add_site_id_multi_tenancy.sql:225`, `supabase/migrations/20260210000000_add_site_id_multi_tenancy.sql:261` | App calls RPC without `p_site_id`, but migration defines it as required and drops old signature. Likely silent failure in lead-visualization linking path. | Pass `p_site_id` in RPC call and add integration test that asserts link row creation. |
| Missing Zod validation on several JSON routes | MEDIUM | `src/app/api/ai/receptionist/route.ts:31`, `src/app/api/data-deletion/route.ts:11`, `src/app/api/admin/leads/[id]/visualizations/route.ts:113`, `src/app/api/quotes/accept/[token]/route.ts:143` | Direct `request.json()` destructuring/manual checks create inconsistent input hardening and error handling. | Add Zod schemas for these routes and centralize bad-request responses. |
| Performance index gaps for common tenant-scoped queries | MEDIUM | `src/app/api/quotes/[leadId]/route.ts:119`, `src/app/api/visualizations/route.ts:47`, `supabase/migrations/20260210000000_add_site_id_multi_tenancy.sql:77`, `supabase/migrations/20260131000000_initial_schema.sql:192` | High-frequency filters/sorts use separate single-column indexes (`site_id`, `lead_id`, `created_at`) rather than composite indexes optimized for actual query shapes. | Add composite indexes: `quote_drafts(site_id, lead_id, version desc)`, `visualizations(site_id, created_at desc)`, and other top query-path composites based on `EXPLAIN ANALYZE`. |

## Launch Gate Recommendation
- **No-Go**
- Must resolve before launch:
1. `BLOCKER`: tenant resolver inconsistency (`getSiteId` env-only vs `getSiteIdAsync` header-based).
2. `HIGH`: proxy unknown-host fallback to env tenant.
3. `HIGH`: rate-limit gaps on expensive/public mutation routes.
4. `HIGH`: `/api/ai/chat` unvalidated override path.
5. `HIGH`: server-side image validation + data-URL fallback behavior.

## Quality Gates Run
- `npm run lint`: failed (`18 errors`, `178 warnings`).
- `npx tsc --noEmit`: failed (many test/type errors).
- `npm run test`: passed (`32` files, `888` tests).
- `npm audit`: failed with `5 high` (`serialize-javascript` via Sentry/webpack chain; matches already-accepted known issue).

## Post-Launch Improvement Plan (Prioritized)
1. Add cross-domain integration tests that assert host A cannot read/write host B data for representative routes.
2. Standardize a single async tenant-context helper and codemod all route handlers to use it.
3. Add central request schema utilities (Zod + max size/count guards) for all JSON AI endpoints.
4. Introduce a route-level rate-limit policy matrix test to prevent coverage regressions.
5. Convert critical multi-write flows (`quote send`, `quote accept`, invoice status transitions) to transactional RPCs.
6. Enforce strict server-side media validation pipeline (MIME sniffing + decoded size + dimension caps).
7. Add structured server error reporting with Sentry context (site_id, route, operation id) instead of `console.error` only.
8. Add composite DB indexes from real query plans and monitor slow-query logs by tenant.

## Assumptions / Uncertainty
- This review assumes the deployment model is single Vercel project + proxy routing.
- If deployment is still strictly per-tenant projects with isolated env vars, top resolver issue impact is reduced, but the architecture remains brittle for the target model.
