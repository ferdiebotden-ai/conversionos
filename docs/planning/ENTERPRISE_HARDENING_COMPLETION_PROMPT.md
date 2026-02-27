# Enterprise Hardening Completion — Sentry, Upstash, & Verification QA

## Context

The previous session implemented 20 enterprise hardening fixes (commit `9eb6c5d`). The code is written and deployed, but two external services need to be provisioned and connected, and the entire hardening suite needs automated verification via Playwright.

**This is the final gate before moving to the PRD addendum improvements** (`QUOTE_ENGINE_V2_ADDENDUM.md` — 47 sprint items).

---

## Part 1: Provision Sentry (Error Monitoring)

Sentry catches unhandled errors in production — crashes, API failures, edge-case exceptions — and sends alerts with full stack traces. Without it, errors are silent.

### What's already done
- `@sentry/nextjs` is installed
- Config files exist: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation.ts`
- `next.config.ts` conditionally wraps with `withSentryConfig()` when `SENTRY_AUTH_TOKEN` is present
- PII scrubbing is configured (strips cookies, auth headers from reports)

### What you need to do

1. **Create a Sentry project** at https://sentry.io (free tier gives 5,000 errors/month — more than enough):
   - Sign up / log in
   - Create organization: `norbot-systems`
   - Create project: platform = `Next.js`, name = `conversionos-demo`
   - Sentry will show you a DSN (looks like `https://abc123@o456.ingest.sentry.io/789`)

2. **Get these 4 values from Sentry dashboard:**
   - `NEXT_PUBLIC_SENTRY_DSN` — the DSN URL (Settings → Client Keys → DSN)
   - `SENTRY_DSN` — same DSN (used server-side)
   - `SENTRY_AUTH_TOKEN` — Settings → Auth Tokens → Create New Token (scope: `project:releases`, `org:read`)
   - `SENTRY_ORG` — your org slug (e.g. `norbot-systems`)
   - `SENTRY_PROJECT` — your project slug (e.g. `conversionos-demo`)

3. **Add to `.env.local`:**
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://...@....ingest.sentry.io/...
   SENTRY_DSN=https://...@....ingest.sentry.io/...
   SENTRY_AUTH_TOKEN=sntrys_...
   SENTRY_ORG=norbot-systems
   SENTRY_PROJECT=conversionos-demo
   ```

4. **Add to Vercel** (all ConversionOS projects):
   ```bash
   # For each Vercel project (ai-reno-demo, leadquoteenginev2, etc.)
   vercel env add NEXT_PUBLIC_SENTRY_DSN production
   vercel env add SENTRY_DSN production
   vercel env add SENTRY_AUTH_TOKEN production
   vercel env add SENTRY_ORG production
   vercel env add SENTRY_PROJECT production
   ```
   Or use the Vercel dashboard: Project → Settings → Environment Variables.

5. **Verify Sentry works:**
   - Run `npm run dev`
   - In browser console on any page: `throw new Error('Sentry test error')`
   - Check Sentry dashboard — the error should appear within 30 seconds
   - Delete the test error from Sentry after confirming

---

## Part 2: Provision Upstash Redis (Global Rate Limiting)

Upstash Redis makes rate limiting work across all serverless instances globally (not just per-instance). Currently the rate limiter falls back to in-memory `Map` which works but resets on each cold start.

### What you need to do

1. **Create an Upstash Redis database** at https://upstash.com (free tier gives 10,000 commands/day):
   - Sign up / log in
   - Create database: name = `conversionos-ratelimit`, region = `us-east-1` (closest to Vercel)
   - Choose "Regional" (not Global — cheaper, adequate for our scale)

2. **Get these 2 values from the Upstash console:**
   - `UPSTASH_REDIS_REST_URL` — looks like `https://abc-123.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` — the REST API token

3. **Add to `.env.local`:**
   ```
   UPSTASH_REDIS_REST_URL=https://...upstash.io
   UPSTASH_REDIS_REST_TOKEN=AX...
   ```

4. **Add to Vercel** (same projects as Sentry):
   ```bash
   vercel env add UPSTASH_REDIS_REST_URL production
   vercel env add UPSTASH_REDIS_REST_TOKEN production
   ```

5. **Verify Upstash works:**
   - Run `npm run dev`
   - Hit `/api/ai/visualize` 6 times rapidly (e.g. via curl or Playwright)
   - The 6th request should return `429 Too Many Requests`
   - Check Upstash console — you should see commands logged

---

## Part 3: Automated Verification QA (Playwright)

Write and run Playwright tests that verify every enterprise hardening fix works end-to-end. This replaces manual spot-checking.

### Create `tests/e2e/v2/enterprise-hardening.spec.ts`

The test should cover these scenarios:

#### Auth Middleware (Fix 1)
```
- GET /api/admin/settings without auth cookie → expect 401
- GET /api/leads without auth cookie → expect 401
- GET /api/quotes/{any-id} without auth cookie → expect 401
- GET /api/invoices/{any-id} without auth cookie → expect 401
- GET /api/drawings/{any-id} without auth cookie → expect 401
- Navigate to /admin without auth → expect redirect to /admin/login
- POST /api/leads (public lead submission) without auth → expect 200 or 400 (NOT 401)
- GET /api/ai/chat without auth → expect NOT 401 (public)
- POST /api/contact without auth → expect NOT 401 (public)
- GET /api/voice/signed-url without auth → expect NOT 401 (public)
- GET /api/quotes/accept/{any-token} without auth → expect NOT 401 (public)
```

#### Rate Limiting (Fix 2)
```
- Send 6 rapid POST requests to /api/contact → 6th should return 429
- Verify 429 response includes Retry-After header
- Verify 429 response body has { error: 'Too many requests...' }
```

Note: Rate limiting tests may need adjusted thresholds if using in-memory fallback (resets per test run). Test against `/api/contact` (5/min limit) as it's the easiest to trigger without AI dependencies.

#### Security Headers (Fix 6)
```
- GET / → verify response headers include:
  - Strict-Transport-Security: max-age=31536000; includeSubDomains
  - Permissions-Policy: camera=(self), microphone=(self), geolocation=()
  - Content-Security-Policy contains "default-src 'self'"
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: SAMEORIGIN
```

#### Error Handling (Fix 7)
```
- Trigger an error on a known endpoint (e.g. GET /api/visualizations/nonexistent-id)
- Verify response body does NOT contain: error.code, error.hint, stack trace, or SQL fragments
- Verify response body contains generic message like "An unexpected error occurred"
```

#### Input Validation (Fixes 17-19)
```
- GET /api/admin/visualizations/trends?days=9999 → verify days is clamped (response still works, not 500)
- GET /api/admin/visualizations/trends?days=abc → verify fallback to 30 (not NaN error)
- GET /api/admin/visualizations/trends?days=-5 → verify clamped to minimum 1
```
Note: These admin endpoints need auth — either skip gracefully if 401, or test the clamping logic via unit test.

#### Compliance Pages (Fixes 9, 9b, 11)
```
- GET /privacy → expect 200, page contains "Privacy Policy", contains tenant name from branding
- GET /terms → expect 200, page contains "Terms of Service", contains tenant name
- GET /data-deletion → expect 200, page contains form with email input
- Footer on homepage → verify "Privacy Policy" and "Terms of Service" are <a> links (not plain text)
- Click footer "Privacy Policy" link → navigates to /privacy
- Click footer "Terms of Service" link → navigates to /terms
```

#### Deny-by-Default Tier (Fix 4)
```
- This is hard to test E2E without manipulating the database
- Instead, verify the unit test covers it: run `npx vitest run tests/unit/entitlements.test.ts` and confirm all 60 pass
```

#### OKLCH Validation (Fix 8)
```
- Load homepage → verify <style> tag contains valid oklch value (regex match)
- OR: verify the page renders without a broken CSS custom property
```

### Run the tests
```bash
# Start dev server first
npm run dev &

# Run just the enterprise hardening spec
npx playwright test tests/e2e/v2/enterprise-hardening.spec.ts --project=Desktop

# Also run the full V2 suite to make sure nothing regressed
npx playwright test tests/e2e/v2/ --project=Desktop --workers=2
```

### Expected results
- All enterprise hardening tests pass
- All existing E2E tests still pass (no regressions from auth middleware)
- Note: Some existing tests may now get 401s if they hit admin endpoints — add `test.skip` annotations or auth helpers as needed

---

## Part 4: Final Verification & Commit

After all three parts are done:

```bash
npm run build          # Clean build with Sentry
npm run test           # 571+ unit tests pass
npm run lint           # No new lint errors
npx playwright test tests/e2e/v2/ --project=Desktop --workers=2  # E2E pass
```

Commit the new test file and any fixes:
```
feat: enterprise hardening verification — Sentry, Upstash, Playwright QA
```

Update `docs/PRODUCT_REFERENCE.md` (use `/update-product-reference` skill).

---

## What Comes After This

Once this prompt is complete, the platform is enterprise-ready. The next work is:

**`QUOTE_ENGINE_V2_ADDENDUM.md`** — 47 improvements organized into 3 sprints:
- Sprint 1 (Quick Wins): 15 items, mostly UI polish and micro-interactions
- Sprint 2 (Intelligence): 16 items, AI-powered features like smart defaults and price trend analysis
- Sprint 3 (Scale): 16 items, multi-quote comparison, bulk operations, advanced analytics

That file is in this same folder. Read it and start Sprint 1 after this hardening work is confirmed complete.
