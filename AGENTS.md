# ConversionOS — Agent Instructions

## Cursor Cloud specific instructions

### Services overview

ConversionOS is a Next.js 16 (App Router) multi-tenant AI renovation platform. Single service — no Docker, no local database. Uses hosted Supabase (PostgreSQL) as its backend.

### Running the dev server

```bash
npm run dev   # starts on http://localhost:3000
```

The app renders and navigates correctly without Supabase credentials, but DB-backed features (leads, quotes, admin dashboard data) will fail gracefully. The `SUPABASE_SERVICE_ROLE_KEY not set` warning in dev is harmless — it falls back to the anon client.

### Commands reference

See `CLAUDE.md` and `package.json` scripts. Key commands:

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Lint | `npm run lint` |
| Unit tests | `npm run test` (Vitest) |
| E2E tests | `npm run test:e2e` (Playwright, needs dev server on :3000) |
| Build | `npm run build` |

### Non-obvious caveats

- **Lint exits non-zero** due to ~19 pre-existing errors (mostly unused vars and React hooks false-positives in Playwright fixtures). This is the repo's current state, not an environment issue.
- **3 unit test failures in `tests/unit/pdf-utils.test.ts`** are pre-existing — tests expect `DEMO-` prefix but code produces `QE-` prefix. Unrelated to environment.
- **Playwright config** sets `baseURL` to `localhost:3002` but webServer starts on `:3000`. Override with `BASE_URL=http://localhost:3000` for local E2E runs, or use the default config which auto-starts the dev server.
- **Playwright browsers**: only Chromium is pre-installed. Install others with `npx playwright install --with-deps` if needed for cross-browser testing.
- **`.env.local`** is created from `.env.example` during setup. Supabase URL/keys and AI API keys are required as secrets for full functionality. Without them, pages render but API calls to Supabase/OpenAI/Gemini will fail.
- **Pre-commit hook** runs `lint-staged` (ESLint --fix on `.ts`/`.tsx` files). May fail on pre-existing lint errors in staged files.
- **Node.js 22+** and **npm** are required (matches the environment's nvm-managed Node).
