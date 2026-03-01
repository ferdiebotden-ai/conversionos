# ConversionOS — Coding Agent Handoff Brief
**NorBot Systems Inc. | February 27, 2026**
**Prepared by: Opus 4.6 (Ferdie's Cowork AI Business Partner)**
**For: Coding Agent (Claude Code / Cursor / Next Session)**

---

## CONTEXT FOR THE CODING AGENT

You are receiving a codebase that has been audited, improved, and prepared for production launch. This document tells you everything you need to know: what was built, what's good, what's broken, what's next, and exactly how to finish the job.

Ferdie Botden is a solo founder (CPA, ex-TD Bank) running NorBot Systems Inc. The company sells ConversionOS — a white-label AI renovation platform — to Ontario contractors. The product is real, deployed, and being used in demos. Revenue target: first paying clients within 2 weeks.

**Your job is to take this from "impressive demo" to "production SaaS."**

---

## PART 1: WHAT WAS JUST BUILT (This Session)

### 4 Critical Pipeline Fixes

All scripts are in `scripts/onboarding/` and `scripts/`.

#### Fix 1: `scripts/onboarding/add-domain.mjs` (NEW — 255 lines)
Registers domains with the Vercel API for SSL cert provisioning. DNS is handled by wildcard CNAME (`*.norbotsystems.com → cname.vercel-dns.com`) on Cloudflare — no per-tenant DNS setup needed.

**How it works:**
1. Calls `POST https://api.vercel.com/v10/projects/{id}/domains` to add domain to Vercel
2. Polls Vercel verification endpoint every 30s for up to 10 minutes
3. Gracefully degrades: if API keys missing, prints manual instructions instead of failing

**Environment variables needed (add to `~/pipeline/scripts/.env`):**
```
VERCEL_TOKEN=<create at vercel.com/account/tokens>
VERCEL_PROJECT_ID=<from Vercel project settings>
```

#### Fix 2: `scripts/onboarding/upload-images.mjs` (UPGRADED — 279 lines)
Now uses `sharp` (installed as devDependency) to optimize all images before Supabase upload.

**What changed:**
- Converts all images to WebP (except SVG logos)
- Per-category size limits: hero 1920×1080, logo 600×600, team 400×400, portfolio 1200×900, service 800×600
- 10MB file size guardrail (skips oversized files)
- Reports total bandwidth savings in console output
- `--skip-optimize` flag for raw uploads
- 30-second timeout per download (was unlimited)

#### Fix 3: `scripts/onboarding/provision.mjs` (UPGRADED — 279 lines)
Added rollback on partial failure.

**What changed:**
- Tracks all completed upsert operations in `completedKeys[]`
- If any upsert fails: deletes all completed rows from `admin_settings` + `tenants` table
- Leaves Supabase clean for re-run (no orphaned partial tenants)
- Non-blocking: proxy.ts update still happens after successful DB operations

#### Fix 4: `scripts/onboarding/onboard.mjs` (UPGRADED — 185 lines)
Added git commit/push + domain setup + batch mode.

**New steps in the pipeline:**
- Step 4.1: Auto-commits `src/proxy.ts` changes and pushes to `main` (triggers Vercel deploy)
- Step 4.5: Runs `add-domain.mjs` for Vercel SSL cert provisioning
- `--batch-mode` flag: defers push and domain setup (used by nightly pipeline for single push at end)
- Writes `onboard-summary.json` to `/tmp/onboarding/{site-id}/` for pipeline consumption
- Timing: reports total elapsed seconds

### Nightly Pipeline Orchestrator

> **Note:** The original `scripts/nightly-pipeline.mjs` has been superseded by `tenant-builder/orchestrate.mjs` (which the LaunchAgent `com.norbot.tenant-builder` runs nightly). Outreach is handled by `scripts/outreach/outreach-pipeline.mjs`. See `tenant-builder/CLAUDE.md` and `scripts/outreach/README.md` for current architecture.

---

## PART 2: QUALITY ASSESSMENTS

### Codebase Quality: 7.8/10

**329 TypeScript/TSX files, 57,811 lines of code, 799 passing tests across 29 test files.**

**What's excellent:**
- TypeScript strict mode with every flag enabled (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, etc.)
- Zod validation on ALL API inputs — no raw JSON parsed anywhere
- Multi-tenancy properly enforced: 79 instances of `getSiteId()` filtering across all DB queries
- Entitlements system is a 10/10 — pure function `canAccess(tier, feature)`, exhaustive type coverage, 60 tests
- Rate limiting with Upstash Redis + in-memory fallback
- SSE streaming visualization with progressive reveal, heartbeat, timeouts
- Photo analysis caching by FNV-1a image hash
- Test coverage strong: entitlements (60 tests), pricing engine (19), visualizer conversation (40), PDF utils (24), schemas (24)

**What needs work:**
- **Admin auth is commented out** — `src/proxy.ts` line 7-9 says "Auth bypass is active — all admin routes are open for prospect demo previews." This is the #1 thing to fix before any paying client.
- **Type assertions:** Several `(supabase as any)` casts for columns missing from generated types (`concept_pricing`, `contractor_prices`, `visualization_metrics`)
- **No multi-tenant E2E tests** — the rules say "test with 2 SITE_ID values" but no actual test does this
- **No structured logging** — `console.error()` scattered throughout, no centralized logger
- **Concept descriptions block response** — `generateConceptDescriptions()` runs before returning visualization, should be async
- **Shared ElevenLabs agent** — all Dominate tenants use same voice agent ID; need per-tenant duplication
- **No prompt injection protection** — user-provided `constraints`, `customRoomType`, `customStyle` injected directly into Gemini prompt

### Product Quality: 8.5/10

The product itself is remarkably complete for a solo-founder operation. The feature map covers a genuine SaaS platform, not a demo:

**Fully working:**
- AI Visualizer with 4 concurrent concept generation (Gemini 3 Pro), SSE streaming, progressive reveal
- Photo pre-analysis with GPT Vision (auto-detects room type from uploaded photo)
- Mobile camera capture with quality checks
- Emma AI chat with context-aware personality per page (general/estimate/visualizer)
- Voice agents (ElevenLabs) on all tiers with pricing deflection for Elevate
- Admin dashboard with lead management, quote engine, PDF quotes, e-signature
- Quote versioning with snapshot-on-send and undo/redo
- Invoicing + payment tracking
- Architecture drawings management
- Ontario pricing database (14 trade rates, 50+ material costs, 9 regional multipliers)
- Analytics dashboard (Dominate only) with Recharts
- Assembly templates for reusable line item bundles
- CSV price upload for contractor's own pricing

**What separates this from a demo:**
- Cost range indicator adapts per tier and per admin config
- Quote assistance mode (none/range/estimate) configurable per tenant
- Contractor lead intake with voice dictation
- Proper OKLCH color injection with regex validation
- 14-day Confidence Guarantee with 75% activation refund built into pricing

### Website Quality: 8/10 (design) / 7/10 (conversion)

**norbotsystems.com is professionally executed.** Clean design, strong messaging ("Turn Homeowner Vision into Booked Renovations"), clear pricing page with working monthly/annual toggle and explicit 30% savings display.

**The pricing "mismatch" is resolved.** The website shows annual-discounted prices when the Annual toggle is selected. The monthly prices match the locked pricing docs exactly. The toggle is visible, the savings are displayed three ways (badge, per-card, helper text). No action needed.

**What would improve conversions:**
1. **No customer testimonials** — Contractors want proof from other contractors. Add 2-3 quotes with names and photos.
2. **No case study or results metrics** — "Red White Reno added X% more projects" would be powerful
3. **CTA text is generic** — "Request Your Demo" should be "See Your Custom Demo (15 min)" or similar
4. **React hydration error (Error #418)** — SSR/client mismatch in the before/after slider component. Cosmetic but signals code quality to technical prospects.
5. **No FAQ section** — Add answers to "Do I own my client data?", "What's the contract length?", "Can I keep my existing domain?"

### Production Readiness: 70%

**What's production-ready today:**
- Core platform (visualizer, chat, voice, admin, quotes, invoicing)
- Multi-tenancy + entitlements
- Rate limiting + input validation
- Deployment pipeline (proxy routing, Vercel auto-deploy)
- Test suite (799 tests)

**What's NOT production-ready:**

| Gap | Severity | Effort | Description |
|-----|----------|--------|-------------|
| Admin auth bypass | CRITICAL | 2-4 hours | Re-enable auth gating in `proxy.ts`. The full implementation exists in git history — just restore it. |
| Multi-tenant E2E tests | HIGH | 1 day | Add Playwright tests that run with 2+ `SITE_ID` values and verify data isolation |
| Per-tenant voice agents | HIGH | 4 hours | Duplicate ElevenLabs agent per Dominate tenant; store agent ID in `admin_settings` |
| Prompt injection protection | HIGH | 4 hours | Sanitize user inputs before injecting into Gemini/GPT prompts |
| Type assertions cleanup | MEDIUM | 4 hours | Add missing columns to Supabase generated types; remove `(supabase as any)` |
| Structured logging | MEDIUM | 1 day | Replace `console.error()` with Pino or similar; add request IDs for tracing |
| Candidates table creation | MEDIUM | 30 min | Run `scripts/sql/create-candidates-table.sql` in Supabase dashboard |
| Environment variables | MEDIUM | 30 min | Set `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` in `~/pipeline/scripts/.env` |
| Homepage testimonials | LOW | 2 hours | Add real testimonials once first clients are live |
| Concept description async | LOW | 2 hours | Make `generateConceptDescriptions()` non-blocking |

---

## PART 3: EXACT FILES YOU NEED TO KNOW

### Pipeline Scripts (3,045 lines total)

| File | Lines | What It Does |
|------|-------|--------------|
| `scripts/onboarding/scrape.mjs` | 819 | 7-step extraction pipeline: FireCrawl → multi-page fallback → hallucination filter → AI enrichment → color extraction → AI content gen → quality audit |
| `tenant-builder/orchestrate.mjs` | ~500 | Nightly orchestrator: discover → build → push → domains → outreach → QA → log |
| `scripts/onboarding/upload-images.mjs` | 279 | Download + sharp optimize + Supabase upload |
| `scripts/onboarding/provision.mjs` | 279 | DB seeding (admin_settings, tenants) + proxy.ts update + rollback |
| `scripts/onboarding/add-domain.mjs` | 255 | Vercel API SSL cert registration |
| `scripts/onboarding/onboard.mjs` | 185 | Master pipeline: score → scrape → upload → provision → git push → domain → verify |
| `scripts/outreach/outreach-pipeline.mjs` | ~200 | Outreach: select targets, generate email, create Gmail drafts |
| `scripts/onboarding/score.mjs` | 120 | Fitness scoring (0-100) via FireCrawl keyword matching |
| `scripts/onboarding/schema.mjs` | 109 | Zod v4 schema for scraped contractor data |
| `scripts/onboarding/verify.mjs` | 94 | Playwright QA (8 checks, 7/8 pass threshold) |

### Core Platform Architecture

| File/Dir | Purpose |
|----------|---------|
| `src/proxy.ts` | Domain → tenant routing (64 lines, auth currently bypassed) |
| `src/lib/entitlements.ts` | Feature gating by tier — `canAccess(tier, feature)` |
| `src/lib/entitlements.server.ts` | Server-side tier detection from `admin_settings` |
| `src/lib/db/site.ts` | `getSiteId()` (sync) and `getSiteIdAsync()` (async with proxy header) |
| `src/lib/branding.ts` | Server-side branding from `admin_settings` table |
| `src/lib/ai/` | AI integrations: personas, knowledge base, config, prompt builder |
| `src/lib/ai/knowledge/pricing-data.ts` | Ontario pricing DB (trade rates, materials, regional multipliers) |
| `src/lib/quote-assistance.ts` | Quote mode config (none/range/estimate) |
| `src/components/tier-provider.tsx` | Client-side `useTier()` hook + `TierProvider` context |
| `src/components/receptionist/` | Emma chat + voice widget (all tiers) |
| `src/components/visualizer/` | AI renovation visualizer UI |
| `src/components/admin/` | Admin dashboard components |
| `src/app/api/ai/visualize/stream/` | SSE streaming visualization endpoint |

### Key Configuration

| Item | Value |
|------|-------|
| Repo | `github.com/ferdiebotden-ai/conversionos.git` |
| Branch | `main` (single branch, never per-tenant branches) |
| Supabase project | `ktpfyangnmpwufghgasx` (shared demo) |
| Vercel deploy | Push to `main` → auto-deploy all tenants |
| Domain pattern | `{site-id}.norbotsystems.com` |
| HST | 13% |
| Deposit | 15% |
| Contingency | 10% |
| Estimate variance | ±15% |

### Current Tenants

| Site ID | Domain | Tier |
|---------|--------|------|
| `demo` | `conversionos-demo.norbotsystems.com` | Accelerate |
| `mccarty-squared` | `mccarty.norbotsystems.com` | Dominate |
| `redwhitereno` | `redwhite.norbotsystems.com` | Accelerate |

---

## PART 4: WHAT TO DO NEXT (Priority Order)

### Immediate (Today/Tomorrow)

1. **Run candidates table SQL** — Copy `scripts/sql/create-candidates-table.sql` into Supabase SQL Editor and execute
2. **Set pipeline env vars** — Add `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` to `~/pipeline/scripts/.env`
3. **Re-enable admin auth** — Restore the auth gating in `src/proxy.ts`. The full Supabase SSR auth implementation is in git history (search for `createServerClient` import and the `isProtectedAPI`/`isProtectedPage` functions). Keep the current tenant-resolution logic, just add auth checks back for `/admin` routes and protected APIs.
4. **Test pipeline end-to-end** — Run `node tenant-builder/orchestrate.mjs --target-id <id> --skip-git`, verify the demo deploys

### This Week

5. **Pipeline targets** — Targets are in Turso CRM (managed via `~/pipeline` dashboard)
6. **First nightly run** — `node tenant-builder/orchestrate.mjs --nightly --max 5`
7. **Outreach drafts** — `node scripts/outreach/outreach-pipeline.mjs` (auto-runs after demo builds pass QA)
8. **Fix React hydration error** — The before/after slider on norbotsystems.com triggers Error #418. Wrap the slider state initialization in `useEffect` + `useState(false)` pattern (same fix used in mobile camera capture — see `src/components/visualizer/visualizer-form.tsx`).
9. **Add multi-tenant E2E tests** — Create a Playwright test that runs the visualizer flow with `?__site_id=demo` and `?__site_id=redwhitereno`, verifying different branding appears

### Before First Paying Client

10. **Per-tenant voice agents** — For Dominate clients, duplicate the ElevenLabs agent via `POST /v1/convai/agents/{ELEVENLABS_AGENT_EMMA}/duplicate`, store new agent ID in `admin_settings` with key `elevenlabs_agent_id`
11. **Prompt injection sanitization** — Strip HTML tags, limit character count, and validate against a blocklist before injecting `constraints`, `customRoomType`, `customStyle` into AI prompts
12. **Remove `(supabase as any)` casts** — Run `npx supabase gen types typescript` to regenerate types with new columns (`concept_pricing`, `contractor_prices`, `visualization_metrics`), then remove type assertions
13. **Add structured logging** — Install Pino, create a `src/lib/logger.ts` wrapper, replace `console.error` calls in API routes with structured log entries including request ID

---

## PART 5: PIPELINE ARCHITECTURE (Current)

> **The nightly pipeline described in earlier versions of this document has been replaced.** Current orchestration:
> - **Demo building:** `tenant-builder/orchestrate.mjs` (LaunchAgent: `com.norbot.tenant-builder`, runs nightly at 00:15)
> - **Outreach emails:** `scripts/outreach/outreach-pipeline.mjs` (creates Gmail drafts via OAuth2 REST API)
> - **Send monitoring:** `scripts/outreach/send-monitor.mjs` (LaunchAgent: `com.norbot.send-monitor`, every 15 min)
>
> See `tenant-builder/CLAUDE.md` and `scripts/outreach/README.md` for full documentation.

---

## PART 5.5: OUTREACH PIPELINE (Built Feb 27, 2026)

The "last mile" after a demo is built: personalised Gmail drafts + automated call booking.

### What Was Built (12 files, 1742 lines)

| File | Purpose |
|------|---------|
| `scripts/outreach/generate-email.mjs` | Fills Ferdie's exact email template with target data |
| `scripts/outreach/create-draft.mjs` | Gmail IMAP APPEND via raw TLS (zero npm deps) |
| `scripts/outreach/outreach-pipeline.mjs` | Orchestrator: select targets, generate, validate, create drafts |
| `scripts/outreach/send-monitor.mjs` | Cron: detect sends in Gmail Sent, book calendar, generate call scripts |
| `scripts/outreach/calendar.mjs` | Apple Calendar AppleScript (query events, book 30-min slots) |
| `scripts/outreach/rescore-all.mjs` | Batch ICP re-scoring (6 dimensions, 100 pts) |
| `scripts/outreach/schemas/email-output.json` | Template variable schema |
| `scripts/outreach/tests/test-email-template.mjs` | 35 mock data tests |
| `scripts/outreach/tests/test-imap.mjs` | IMAP connectivity test |
| `com.norbot.send-monitor.plist` | macOS LaunchAgent (every 15 min, 6am-9pm weekdays) |

### Architecture Decisions

- **Raw IMAP over TLS** (not nodemailer/googleapis): Zero dependencies, 189 lines, full control over Message-ID tracking. Gmail API would require OAuth token refresh; raw IMAP with app password is simpler and more reliable for this use case.
- **AppleScript for calendar** (not Google Calendar API): Ferdie uses Apple Calendar "Work" calendar. AppleScript is native, instant, no auth flow. Trade-off: macOS-only.
- **Template filling, not AI copy**: Ferdie's exact words in `BODY_TEMPLATE`. AI only fills `{variables}`. This preserves his voice and avoids the "sounds like a robot" problem.
- **Message-ID tracking**: RFC 2822 Message-ID stored in Turso. Send monitor matches by searching `[Gmail]/Sent Mail` HEADER. This decouples draft creation from send detection.
- **Sentinel name filtering**: Owner names like "Not specified", "N/A" → "there" to avoid "Hey Not specified," emails.

### Integration

- `tenant-builder/orchestrate.mjs` Step 6 auto-runs outreach after QA passes (`--skip-outreach` to skip)
- Mission Control: Upcoming Calls panel in Pipeline page shows targets with `status = 'email_1_sent'`
- Send monitor LaunchAgent runs independently (no dependency on Claude Code sessions)

### Test Coverage

- 35 mock data tests: template filling, quality gates, HTML conversion, MIME structure, calendar slots, sentinel names
- IMAP connectivity test (real Gmail connection)
- No Playwright tests for outreach (not a web UI)

### Known Limitations

- Calendar integration is macOS-only (AppleScript)
- IMAP connections use `rejectUnauthorized: false` (Node 25 TLS strictness)
- Send monitor checks every 15 min — minimum delay between Ferdie clicking Send and call being booked
- Call script generation requires Claude CLI (`callClaude()`) — falls back to static template if unavailable

## PART 6: RULES YOU MUST FOLLOW

These are non-negotiable architectural rules. Violating them will break multi-tenancy or pricing.

1. **All DB queries MUST filter by `getSiteId()`** — No exceptions. Use `withSiteId()` for inserts.
2. **All features MUST be gated with `canAccess(tier, feature)`** — Never check `tier === 'dominate'` directly.
3. **Never create per-tenant git branches** — Single `main` branch serves all tenants.
4. **Never hardcode tenant branding** — Always read from `admin_settings`.
5. **`getSiteId()` is synchronous** — Do NOT make it async (80+ call sites depend on this).
6. **CASL compliance** — Every outreach email must include: sender name, business name, mailing address ("PO Box 23030 Stratford PO Main, ON N5A 7V8"), unsubscribe mechanism ("Reply STOP to be removed").
7. **AI drafts, humans approve** — Nothing is ever sent automatically. All emails land as Gmail drafts for Ferdie's review.
8. **Validate all AI outputs with Zod** — Before rendering or storing any AI-generated content.
9. **Production clients get their own Supabase project** — Demo tenants share `ktpfyangnmpwufghgasx`, paying clients get isolated databases.
10. **Primary color uses OKLCH** — `--primary: oklch(...)` in globals.css. Use `convert-color.mjs` for hex → OKLCH conversion.

---

## PART 7: KNOWN GOTCHAS

- **Write tool creates CRLF on macOS** — Fix shell scripts with `perl -pi -e 's/\r\n/\n/g'`
- **Vercel env vars** — Use the API (`curl`), NOT `echo | vercel env add` (adds trailing newline)
- **Wildcard DNS** — `*.norbotsystems.com` on Cloudflare handles all subdomains; no per-tenant DNS setup needed
- **`getSiteIdAsync()` exists for new code** — Use it in new routes, but never refactor existing `getSiteId()` calls
- **Admin header uses User icon, not initials** — Design choice, not a bug
- **Supabase generated types lag behind schema** — Some columns need `(supabase as any)` until types are regenerated
- **sharp requires native binaries** — Installed as devDependency; won't deploy to Vercel (only used in pipeline scripts, not in the Next.js app)

---

*This document reflects the state of the codebase as of February 27, 2026. Update it after major changes.*
