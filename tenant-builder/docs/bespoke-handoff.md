# Bespoke Pipeline — Mission Operator Handoff

**Date:** 2026-03-10
**From:** Session 4 (Opus 4.6 architect session)
**To:** Fresh agent — Mission Operator role
**Status:** Code complete, untested. Your job is to make it work.

---

## The Vision (Read This First)

Ferdie's company NorBot Systems rebuilds contractor websites. The current pipeline scrapes a contractor's site, picks from 50 pre-built React section templates, and deploys a ConversionOS-powered demo. The problem: **every demo looks like "our template with different colours."** Cookie-cutter output.

The bespoke pipeline flips this. Instead of picking from templates, we:

1. **Capture the target's visual DNA** — HTML structure, computed CSS tokens, full-page screenshots
2. **Opus 4.6 analyses the original site** — identifies every visual section, decides which need custom builds vs standard sections
3. **Codex (GPT 5.4) generates custom React sections** — each one matches the original site's layout, colours, typography, and visual weight
4. **Standard sections only where they genuinely fit** — trust badges, CTAs, FAQ accordions (data-driven, not visual)

The rebuilt site should be **recognizably "their website"** — same brand feel, same layout flow — but enhanced with smooth animations, better responsiveness, and ConversionOS AI features (visualizer, Emma chat, lead capture) seamlessly integrated.

**Success looks like:** A contractor visits their demo URL and thinks "that's my website, but better." Not "that's some template with my logo."

---

## What Was Built (Session 4)

### New Files (4)

| File | What It Does |
|------|-------------|
| `tenant-builder/scrape/css-extract.mjs` | Playwright visits the live site, runs `getComputedStyle()` on body/h1-h6/p/a/button/nav/section, extracts `:root` CSS vars, `document.fonts`, border-radius/box-shadow/gradient patterns, spacing rhythm. Outputs `css-tokens.json`. |
| `tenant-builder/bespoke-architect.mjs` | Opus 4.6 reads scraped.json + css-tokens.json + HTML files. Identifies every visual section per page. For each, either assigns a standard section ID or creates a custom section spec with visual description, CSS hints, content mapping, and ConversionOS integration notes. Outputs bespoke-blueprint.json (same schema as site-blueprint-v2.json). |
| `tenant-builder/templates/integration-spec.md` | Injected into every Codex prompt. Rules for: component pattern (SectionBaseProps), replacing contact forms with `/visualizer` links, colour usage (CSS custom properties + OKLCH), typography, animations, image handling, accessibility. |
| `src/sections/custom/registry.ts` | Placeholder. `build-custom-sections.mjs` overwrites this with static imports for all tenant custom section directories. Imported by `register.ts` at build time. |

### Modified Files (8)

| File | What Changed |
|------|-------------|
| `tenant-builder/lib/codex-cli.mjs` | Added `images` parameter to `codexExec()` → passes `--image` flags to Codex for vision context |
| `tenant-builder/config.yaml` | Added `html` to Firecrawl formats. New `bespoke` config section (max 15 custom sections, screenshot viewports, visual similarity threshold 3.5) |
| `tenant-builder/scrape/scrape-enhanced.mjs` | New `--bespoke` flag. Phase 2.5: Firecrawl HTML capture per page → `html/` dir. Phase 2.7a: CSS token extraction. Phase 2.7b: Full-page Playwright screenshots of original site → `screenshots/original/` |
| `tenant-builder/build-custom-sections.mjs` | Bespoke mode: richer Codex prompts with original HTML, CSS tokens, integration spec. Screenshots passed via `--image` flag. `selectRelevantScreenshots()` picks page-relevant screenshots. `updateTopLevelRegistry()` generates `src/sections/custom/registry.ts`. New helpers: `loadJsonIfExists`, `loadHtmlDir`, `discoverScreenshots`. |
| `tenant-builder/orchestrate.mjs` | New `--bespoke` flag wired through: scrape (passes --bespoke), architect (uses `bespokeArchitect()` instead of `architectSite()`), custom sections (passes bespokeMode + resultsDir + higher maxSections), provision (passes --bespoke), QA (passes --bespoke to refinement loop) |
| `tenant-builder/provision/provision-tenant.mjs` | New `--bespoke` flag. Step 2d enriches theme with CSS tokens: rendered fonts → headingFont/bodyFont, exact border-radius from buttons/cards, spacing rhythm detection (compact/default/spacious) |
| `tenant-builder/qa/visual-qa.mjs` | New `--bespoke` flag. Adds 7th dimension "Visual Similarity" (1-5 scale comparing rebuilt vs original). Included in average calculation for bespoke builds. |
| `src/sections/register.ts` | Added `import './custom/registry'` — static import of custom section manifest |

---

## Architecture You Need to Understand

### The Hybrid Approach

The existing infrastructure stays:
- `SectionRenderer` renders any registered section by ID
- `page_layouts` in `admin_settings` maps page slugs → section ID arrays
- `src/sections/custom/{siteId}/` directories hold per-tenant React components
- `registerSection(id, component)` makes any component renderable
- Multi-tenancy via `proxy.ts` → `x-site-id` header → per-tenant data

What changes is the **input**:
- Template mode: Opus picks from 50 standard sections → generic layouts
- Bespoke mode: Opus analyses original HTML/CSS/screenshots → Codex generates matching custom sections → visually faithful layouts

### Data Flow

```
Target URL
  ↓
scrape-enhanced.mjs --bespoke
  ├── Phase 1: Branding v2 (colours, fonts, logos)
  ├── Phase 2: scrape.mjs (content extraction)
  ├── Phase 2.5: Firecrawl HTML capture → results/{date}/{siteId}/html/
  ├── Phase 2.7a: CSS token extraction → results/{date}/{siteId}/css-tokens.json
  ├── Phase 2.7b: Original screenshots → results/{date}/{siteId}/screenshots/original/
  ├── Phase 3: Logo extraction
  └── Phase 4: Social links
  ↓
bespoke-architect.mjs (Opus 4.6)
  ├── Reads: scraped.json + css-tokens.json + html/*.html + screenshots/original/
  ├── Identifies visual sections per page
  ├── Decides: custom vs standard for each
  └── Outputs: bespoke-blueprint.json (SiteBlueprint v2 schema)
  ↓
build-custom-sections.mjs --bespokeMode
  ├── For each customSection in blueprint:
  │   ├── Builds rich prompt (HTML + CSS tokens + integration spec)
  │   ├── Passes screenshots via --image flag to Codex
  │   ├── Codex generates React component → src/sections/custom/{siteId}/
  │   ├── TypeScript compilation check (retry once on failure)
  │   └── Generates per-tenant index.ts manifest
  └── Updates src/sections/custom/registry.ts (top-level imports)
  ↓
provision-tenant.mjs --bespoke
  ├── Enriches theme with CSS tokens (fonts, border-radius, spacing)
  ├── page_layouts from bespoke blueprint
  └── Standard provisioning (images, DB, proxy, domain)
  ↓
QA Pipeline
  ├── Standard 9 QA modules
  └── visual-qa.mjs --bespoke adds "visual_similarity" dimension
```

### Key Models

| Model | Role | Cost |
|-------|------|------|
| **Opus 4.6** (Claude Code CLI, `claude -p`) | Bespoke architect — analyses site structure, produces blueprint | ~$0.30/target |
| **GPT 5.4** (Codex CLI, `codex exec --full-auto`) | Section builder — generates React components from specs + screenshots | ~$0 (flat rate subscription) |
| **Sonnet 4.6** (Claude Code CLI) | Visual QA — scores rebuilt site on 7 dimensions | ~$0.80/target |
| **Gemini 3.1 Flash** | Fallback image generation when scraping misses hero/about images | ~$0.05/target |

### Test Targets

| Target | URL | Why |
|--------|-----|-----|
| **MD Construction** | https://mdconstruction1987.com/ | First test — unknown site, never built before |
| **Westmount Craftsmen** | https://www.westmountcraftsmen.com/ | Has existing template demo — A/B comparison possible |

---

## Your Mission

### Phase 1: Validate the Scrape

Run the enhanced scrape on MD Construction and verify all bespoke outputs:

```bash
cd ~/Norbot-Systems/products/conversionos

# Just the scrape first (not full pipeline)
node tenant-builder/scrape/scrape-enhanced.mjs \
  --url https://mdconstruction1987.com/ \
  --site-id md-construction \
  --output ./tenant-builder/results/$(date +%Y-%m-%d)/md-construction/ \
  --bespoke
```

**Check:**
- `scraped.json` — does it have business name, services, testimonials, portfolio?
- `html/homepage.html` — is it real HTML from the site? Is it complete enough to identify sections?
- `css-tokens.json` — are renderedFonts populated? Are customProperties captured? Do spacingRhythm entries have realistic values?
- `screenshots/original/` — do homepage-desktop-full.png and homepage-mobile-full.png exist? Are they actual full-page captures?

If any of these are missing or empty, debug and fix. The CSS extractor may need tuning for sites with heavy JS rendering. The HTML capture depends on Firecrawl's `html` format support — verify it returns actual DOM, not just the raw source.

### Phase 2: Test the Architect

Feed the scrape results to the bespoke architect:

```bash
# You can test the architect module directly:
node -e "
import { bespokeArchitect } from './tenant-builder/bespoke-architect.mjs';
const bp = await bespokeArchitect('./tenant-builder/results/$(date +%Y-%m-%d)/md-construction/', 'md-construction', { timeoutMs: 180000 });
console.log(JSON.stringify(bp, null, 2));
" 2>&1 | tee /tmp/bespoke-blueprint.json
```

**Check:**
- Does the blueprint have 5 pages (homepage, about, services, contact, projects)?
- Are most sections `custom:md-construction-*` (not standard)?
- Do custom section specs have detailed visual descriptions?
- Does the theme use exact fonts from css-tokens.renderedFonts?
- Does the theme use OKLCH colours from the scraped data?

**Iterate:** If the architect output is thin (vague specs, few custom sections), the Opus prompt needs enhancement. Read what the architect actually received and improve `buildBespokePrompt()`. You may need to pass more HTML, smarter CSS token summaries, or restructure the prompt.

### Phase 3: Test the Full Pipeline

```bash
node tenant-builder/orchestrate.mjs \
  --url https://mdconstruction1987.com/ \
  --site-id md-construction \
  --tier accelerate \
  --bespoke \
  --skip-outreach \
  --skip-git
```

**Watch for:**
- Scrape phase completes with HTML + CSS + screenshots
- Architect produces a blueprint with custom sections
- Codex builds each custom section (check `src/sections/custom/md-construction/`)
- TypeScript check passes after custom sections are built
- Provision writes enriched theme to admin_settings
- QA includes visual_similarity dimension

### Phase 4: Review Quality

After the pipeline runs:

1. **Read the generated sections:** `src/sections/custom/md-construction/*.tsx` — are they real React components? Do they import SectionBaseProps? Do they use Tailwind? Do they match the visual description from the architect?

2. **Check the blueprint:** `tenant-builder/results/{date}/md-construction/bespoke-blueprint.json` — does each custom section spec have enough detail for Codex to work with?

3. **Check QA results:** `tenant-builder/results/{date}/md-construction/visual-qa.json` — what's the visual_similarity score? What issues were flagged?

4. **Side-by-side comparison:** If deployed, compare the demo URL with the original site. Does it feel like "their website"?

### Phase 5: Iterate and Enhance

This is where the real work happens. The first run WILL have issues. Common ones:

- **Codex generates broken components** → Look at TypeScript errors. Common: missing imports, wrong prop types, invalid Tailwind classes. Fix the prompt in `buildBespokeCodexPrompt()`.
- **Architect specs are too vague** → Codex needs precise instructions. Enhance `buildBespokePrompt()` with more HTML context, better CSS token summaries.
- **CSS tokens are empty** → The site uses heavy JS rendering and Playwright didn't wait long enough. Increase timeout or add `waitForSelector` calls in `css-extract.mjs`.
- **HTML capture failed** → Firecrawl may not support `html` format for this site. Fallback: use Playwright to capture `page.content()` instead.
- **Screenshots don't capture full page** → Lazy-loaded content. The scroll-to-bottom logic may need tuning.
- **Custom section registry not imported at build time** → Check `src/sections/custom/registry.ts` was updated and `register.ts` imports it.

---

## Research Guidance

Use `/last30days` for current best practices when you encounter specific challenges:

```
/last30days Codex GPT 5.4 --image flag vision React component generation best practices --ai
/last30days Firecrawl HTML extraction structured data scraping 2026 --ai
/last30days Playwright full-page screenshot lazy loading infinite scroll capture --ai
/last30days Claude Code opus subprocess structured JSON output constrained decoding --ai
```

Cached research is in `~/.config/last30days/memory/`. Check there first before running new queries. Key cached files:
- `bespoke-website-generation-pipeline.json` — pipeline architecture patterns
- `claude-code-cli-structured-output.json` — `claude -p --json-schema` patterns
- `codex-gpt-5.4-autonomous-website-rebuild.json` — Codex vision + `--image` capabilities

---

## Key File Paths (Absolute)

```
# Pipeline code
~/Norbot-Systems/products/conversionos/tenant-builder/orchestrate.mjs          # Master orchestrator
~/Norbot-Systems/products/conversionos/tenant-builder/bespoke-architect.mjs     # NEW: Bespoke architect
~/Norbot-Systems/products/conversionos/tenant-builder/build-custom-sections.mjs # Enhanced builder
~/Norbot-Systems/products/conversionos/tenant-builder/scrape/scrape-enhanced.mjs # Enhanced scraper
~/Norbot-Systems/products/conversionos/tenant-builder/scrape/css-extract.mjs    # NEW: CSS extractor
~/Norbot-Systems/products/conversionos/tenant-builder/provision/provision-tenant.mjs # Enhanced provisioner
~/Norbot-Systems/products/conversionos/tenant-builder/qa/visual-qa.mjs          # Enhanced QA
~/Norbot-Systems/products/conversionos/tenant-builder/lib/codex-cli.mjs         # --image support
~/Norbot-Systems/products/conversionos/tenant-builder/lib/opus-cli.mjs          # Opus subprocess
~/Norbot-Systems/products/conversionos/tenant-builder/config.yaml               # Pipeline config

# Templates + specs
~/Norbot-Systems/products/conversionos/tenant-builder/templates/integration-spec.md     # NEW
~/Norbot-Systems/products/conversionos/tenant-builder/templates/custom-section-template.tsx

# Section system
~/Norbot-Systems/products/conversionos/src/sections/register.ts                 # Section registration
~/Norbot-Systems/products/conversionos/src/sections/custom/registry.ts          # NEW: Custom registry
~/Norbot-Systems/products/conversionos/src/lib/section-types.ts                 # SectionBaseProps type
~/Norbot-Systems/products/conversionos/src/lib/section-registry.ts              # Registry functions

# Schemas
~/Norbot-Systems/products/conversionos/tenant-builder/schemas/site-blueprint-v2.zod.mjs
~/Norbot-Systems/products/conversionos/tenant-builder/schemas/visual-qa.json

# Documentation
~/Norbot-Systems/products/conversionos/tenant-builder/docs/bespoke-handoff.md   # THIS FILE
~/Norbot-Systems/products/conversionos/tenant-builder/docs/learned-patterns.md  # Historical patterns
~/Norbot-Systems/products/conversionos/tenant-builder/docs/pipeline-architecture.md

# Results (after running)
~/Norbot-Systems/products/conversionos/tenant-builder/results/{date}/{siteId}/
  scraped.json, branding-v2.json, css-tokens.json, bespoke-blueprint.json,
  site-blueprint-v2.json, html/*.html, screenshots/original/*.png
```

---

## Environment Setup

The pipeline needs these env vars (already configured in the existing `.env` files):

```bash
# These should already be set from previous sessions
source ~/Norbot-Systems/products/conversionos/pipeline/scripts/.env  # or wherever the pipeline .env lives
# Contains: FIRECRAWL_API_KEY, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, etc.

# The demo .env.local
# Contains: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.
```

If `FIRECRAWL_API_KEY` is missing, the HTML capture and branding phases will fail. Check `tenant-builder/lib/env-loader.mjs` for the expected paths.

Playwright should already be installed (`npx playwright install chromium` if not).

Codex CLI must be available in PATH (`codex --version`). The Codex subscription is active (flat-rate, GPT 5.4).

---

## Quality Bar

A bespoke demo is NOT ready until:
- Visual QA average >= 4.0 across all 7 dimensions
- visual_similarity >= 3.5 (someone who knows the original site would recognize the rebuild)
- All custom sections compile cleanly (TypeScript --noEmit passes)
- `/visualizer` CTA replaces all contact/quote forms
- Emma chat widget is present (auto-injected by layout)
- Mobile responsive is tight (check mobile screenshots)
- No placeholder text, no "Lorem ipsum", no ConversionOS demo leakage
- Brand colours match the original (not our teal #0D9488)

---

## What You Can Change Freely

- Prompts in `bespoke-architect.mjs` (buildBespokePrompt)
- Prompts in `build-custom-sections.mjs` (buildBespokeCodexPrompt)
- CSS extraction logic in `css-extract.mjs`
- HTML capture logic in `scrape-enhanced.mjs`
- Visual QA prompt in `visual-qa.mjs`
- Config values in `config.yaml` (bespoke section)
- Integration spec in `templates/integration-spec.md`
- Generated custom section code in `src/sections/custom/{siteId}/`

## What Needs Approval

- Changing standard section components (`src/sections/`)
- Modifying the SectionBaseProps interface
- Changing the section registry system
- Modifying multi-tenancy (proxy.ts, admin_settings schema)
- Spending over $25 on API calls
- Deploying to production (Vercel)
- Sending outreach emails

---

## Known Risks and Unknowns

1. **Firecrawl `html` format** — We added it to config.yaml but haven't verified the Firecrawl client actually returns HTML in `result.html`. It may be `result.data.html` or require a different API call. Check the @mendable/firecrawl-js docs.

2. **Codex `--image` flag** — Added to codex-cli.mjs but untested. Verify `codex exec --full-auto --image /path/to/screenshot.png "prompt"` actually works and Codex can see the image.

3. **Opus prompt length** — The bespoke architect prompt includes HTML (up to 3000 chars) and CSS tokens. If the total prompt exceeds Opus's comfort zone, it may produce lower quality output. Monitor and trim if needed.

4. **Custom section build time** — Each section takes 2-5 min via Codex. With 8-12 custom sections per target, that's 15-60 min build time. The timeout multiplier exists for this reason.

5. **Next.js static analysis** — The `import './custom/registry'` in register.ts works because registry.ts exists as a placeholder. If it gets deleted, the build breaks. The `build-custom-sections.mjs` overwrites it with actual imports.

6. **Bundle size** — Each custom section is ~50-150 lines. At scale (30+ tenants × 8 sections = 240 components), monitor the Next.js bundle. Lazy loading or dynamic imports may be needed later.

---

**TLDR:** Code is written but untested. Run the bespoke pipeline on MD Construction, review every output at every step, fix issues, iterate prompts, and get the visual_similarity score above 3.5. The architecture is sound (hybrid approach reusing existing infrastructure), but the prompt engineering for both Opus (architect) and Codex (builder) will need iterative tuning based on real output. You are the mission operator — own the outcome.
