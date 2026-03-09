# ConversionOS Tenant Onboarding Pipeline

Automated pipeline to create a bespoke ConversionOS tenant from a contractor's website URL.

## Quick Start

```bash
node scripts/onboarding/onboard.mjs \
  --url https://example-reno.ca \
  --site-id example-reno \
  --domain example.norbotsystems.com \
  --tier accelerate
```

## Individual Scripts

| Script | Purpose | Credits |
|--------|---------|---------|
| `score.mjs` | Fitness scoring (0-100) | 1 FireCrawl |
| `scrape.mjs` | Full extraction + AI generation | ~5 FireCrawl |
| `upload-images.mjs` | Image download → Supabase Storage | 0 |
| `provision.mjs` | DB seeding + proxy.ts update | 0 |
| `verify.mjs` | Playwright QA (8 checks) | 0 |
| `onboard.mjs` | Orchestrator (chains all above) | ~6 FireCrawl |
| `convert-color.mjs` | Hex → OKLCH conversion | 0 |

## Environment Variables

Set in `~/pipeline/scripts/.env` and `.env.local`:
- `FIRECRAWL_API_KEY` — FireCrawl Standard plan
- `OPENAI_API_KEY` — GPT for content generation
- `NEXT_PUBLIC_SUPABASE_URL` — Demo Supabase project
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key

## Tiers

- **elevate** ($299/mo): Website + visualizer + chat
- **accelerate** ($699/mo): + Admin dashboard + quotes
- **dominate** ($1,799/mo): + Voice agents + custom integrations
- **black_label** ($4,999/mo): + White-glove, fully custom, dedicated support
