# Plan: Systematic Design Overhaul — Hero, Layout, Navigation, Mobile, Image Intelligence

## Context

After the Firecrawl upgrade and image fixes (128 fixes across 23 tenants), manual review revealed **deeper structural problems** that make demos look unfinished:

1. **Hero sections have NO background image** — `hero:visualizer-teardown` (current default) is pure animation that completely ignores `heroImageUrl`. When frame sequences aren't generated, it shows hardcoded kitchen fallbacks instead of the contractor's actual hero photo.

2. **About section uses logos as images** — `aboutImageUrl` sometimes gets the logo URL, resulting in a blown-up unreadable logo instead of a team/workspace photo.

3. **Wrong page flow** — Homepage currently: Hero → Trust → Services → About → Gallery → Testimonials → CTA. Missing: "How It Works" and Projects.

4. **No scroll-spy navigation** — Header doesn't highlight active section. Navigation uses page-based routing only.

5. **Mobile issues** — Visualizer too large on mobile, CTA button blocks logo, no mobile Playwright testing in pipeline.

6. **Image placement is context-blind** — Pipeline stores URLs but doesn't classify images (hero vs service vs portfolio vs about).

**This is NOT an AI capability limitation.** The scraping, mapping, and image discovery all work (proven with 0 errors on 23 tenants). The issues are rendering decisions and design architecture.

---

## WS0: Multi-Model Pipeline Optimization

### Current State — All AI Invocations Audited

**3 CLIs installed and authenticated via subscription (marginal cost ~$0):**
- `claude` v2.1.78 — Opus 4.6 / Sonnet 4.6 / Haiku 4.5 (Max subscription)
- `codex` v0.114.0 — GPT 5.4 / GPT 5.3 Codex (ChatGPT Pro, multi_agent enabled)
- `gemini` v0.33.0 — Gemini 3.1 Pro / Flash (Google OAuth)

**API keys (pay-per-use):**
- `OPENAI_API_KEY` — GPT 5.4, GPT-4o, GPT-4o-mini (runtime chat, visualization, quotes)
- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini 3.1 Flash Image (visualization), Veo 3.1 (video)
- `FIRECRAWL_API_KEY` — 100K credits/month

### Current Model Assignments vs Optimal

| Task | Current Model | Cost | Optimal Model | Why |
|------|--------------|------|--------------|-----|
| **Build-time: Scrape enrichment** | Sonnet 4.6 CLI | ~$0 | Keep Sonnet CLI | Good for text extraction, subscription-free |
| **Build-time: Site architecture** | GPT 5.4 vision (Codex) → Opus fallback | ~$0 | Keep as-is | GPT 5.4 vision is best for screenshots |
| **Build-time: Custom sections** | Codex multi-agent | ~$0 | Keep Codex | Subscription, code generation strength |
| **Build-time: Image generation** | Gemini 3.1 Flash Image API | ~$0.25 | **Switch to Gemini CLI** | $0 marginal via subscription instead of $0.25/image API |
| **Build-time: Hero video frames** | Veo 3.1 API | ~$0.40 | Keep Veo API | No CLI alternative |
| **Build-time: Image classification** | None (heuristic) | $0 | **Add: Gemini CLI** | Free vision analysis via subscription |
| **Runtime: Chat/Receptionist** | GPT 5.4 API | ~$0.03 | Keep GPT 5.4 API | Must be fast, streaming, per-request |
| **Runtime: Visualization** | Gemini API | ~$0.30 | Keep Gemini API | Must be fast, server-side, concurrent |
| **Runtime: Quote generation** | GPT-4o API | ~$0.03 | **Switch to GPT-4o-mini** | Structured output, doesn't need frontier reasoning |
| **Runtime: Email generation** | GPT-4o API | ~$0.003 | **Switch to GPT-4o-mini** | Simple template filling |
| **Runtime: Photo analysis** | GPT 5.4 API | ~$0.008 | Keep GPT 5.4 | Needs vision + spatial reasoning |

### Key Optimization: Use CLI Subscriptions for Build-Time Tasks

**Principle:** Any AI task that runs during the BUILD pipeline (not runtime) can use CLI subscriptions instead of API keys. CLIs invoke the same models but at $0 marginal cost.

**New helper:** `tenant-builder/lib/gemini-cli.mjs`
```js
export async function geminiGenerate(prompt, options = {}) {
  // Invoke: gemini -p "prompt" --model gemini-3.1-flash
  // Returns: stdout text
  // Cost: $0 (Google OAuth subscription)
}

export async function geminiVision(imagePath, prompt, options = {}) {
  // Invoke: gemini -p "prompt" --model gemini-3.1-pro --sandbox
  // Pipe image to stdin or use --add-file
  // Returns: structured analysis
  // Cost: $0 (Google OAuth subscription)
}
```

**New helper:** `tenant-builder/lib/model-router.mjs`
```js
// Route AI tasks to the cheapest capable model
export function selectModel(task) {
  switch (task) {
    case 'image-classify':    return { cli: 'gemini', model: 'gemini-3.1-flash' };
    case 'scrape-enrich':     return { cli: 'claude', model: 'sonnet' };
    case 'architect-vision':  return { cli: 'codex', model: 'gpt-5.4' };
    case 'code-generate':     return { cli: 'codex', model: 'gpt-5.4' };
    case 'code-review':       return { cli: 'codex', model: 'gpt-5.4' };
    case 'image-generate':    return { api: 'gemini', model: 'gemini-3.1-flash-image-preview' };
    case 'content-audit':     return { cli: 'gemini', model: 'gemini-3.1-flash' };
  }
}
```

### Image Classification via Gemini CLI (Free)

Instead of heuristic-only classification (WS5), use Gemini CLI for intelligent image classification:

```bash
gemini -p "Classify this image for a contractor website. Categories: hero_background, service_photo, portfolio_project, team_photo, logo, icon, irrelevant. Return JSON: {category, confidence, description}" --model gemini-3.1-flash < image.jpg
```

This gives us AI-powered image understanding at **$0 cost** via subscription. Use for:
- Determining which scraped image is the hero vs a service photo vs portfolio
- Validating that aboutImageUrl is actually a team/workspace photo, not a logo
- Quality assessment (blurry, too small, wrong aspect ratio)

### Savings per build
- Image generation: $0.25 → $0 (Gemini CLI instead of API)
- Image classification: $0 (new capability, free via CLI)
- Quote generation: $0.03 → $0.001 (GPT-4o-mini)
- Email generation: $0.003 → $0.0005 (GPT-4o-mini)
- **Net savings: ~$0.28/build × 10 builds/night = $2.80/night = $84/month**

### Files to Create/Modify
- `tenant-builder/lib/gemini-cli.mjs` — **New**: Gemini CLI wrapper
- `tenant-builder/lib/model-router.mjs` — **New**: Task → model routing
- `src/lib/ai/config.ts` — Update quote/email models to gpt-4o-mini
- `tenant-builder/scrape/scrape-enhanced.mjs` — Use Gemini CLI for image classification in merge phase

---

## WS1: Hero Section Fix (Critical — affects ALL tenants)

### Problem
`hero:visualizer-teardown` (`src/sections/hero/visualizer-teardown.tsx`, 568 lines) is animation-only. It never reads `config.heroImageUrl`. When Veo frame sequences don't exist (which is most template builds), it shows hardcoded `/images/hero/before-kitchen.png`.

### Fix: Hybrid Hero with Background Image Fallback

Modify `visualizer-teardown.tsx` to display `heroImageUrl` as a background image behind the animation content. When no frames exist AND no heroImageUrl exists, THEN show AuroraBackground gradient.

**Priority chain:**
1. Frame scrubber animation (if `heroVisualizerImages` exists) — overlaid on heroImageUrl background
2. `heroImageUrl` as full-bleed background with overlay + headline + CTA (like `full-bleed-overlay`)
3. `AuroraBackground` gradient (absolute last resort)

**File:** `src/sections/hero/visualizer-teardown.tsx`

**Changes:**
- Add `config.heroImageUrl` read at the top of the component
- Wrap the entire section in a container that renders the hero background image behind the animation
- When frames are unavailable, render a `full-bleed-overlay`-style hero with the background image, headline, subheadline, and CTA
- Keep the frame scrubber as a premium feature that renders ON TOP of the background

### Also fix: About image validation

**File:** `tenant-builder/scripts/fix-tenant-images.mjs` (update)

Add a check: if `aboutImageUrl` matches the logo URL pattern (same domain + path as `logoUrl`, or contains `logo` in filename), clear it and use the first substantial image from the about page instead. About images should never be logos.

---

## WS2: Homepage Layout Redesign

### New Default Homepage Flow

User-requested order (validated by research — @viktoroddy's "blueprint every section in exact order" approach):

```
1. hero:visualizer-teardown     (with background image fallback)
2. services:grid-3-cards        (what they do — with real photos)
3. gallery:masonry-grid          (their work — real project photos)
4. misc:process-steps            (How It Works — ConversionOS standard)
5. about:split-image-copy        (who they are — real team/workspace photo)
6. testimonials:cards-carousel   (social proof)
7. trust:badge-strip             (certifications, ratings)
8. contact:form-simple           (contact form inline — no separate page needed for homepage)
9. cta:full-width-primary        (final CTA)
```

**Changes from current:**
- Trust badges moved from #2 to #7 (social proof after content, not before)
- Services moved from #3 to #2 (most important — what they do)
- Gallery moved from #5 to #3 (showcase projects early)
- Process-steps added at #4 (How It Works)
- About moved from #4 to #5 (less prominent, after their work)
- Contact form added at #8 (inline, no need to navigate away)

**Files to modify:**
- `src/lib/page-layout.ts` — update `DEFAULT_HOMEPAGE_LAYOUT`
- `tenant-builder/provision/provision-tenant.mjs:404-413` — update default pageLayouts for new builds

### Gallery Section Conditional
If tenant has no portfolio images, replace `gallery:masonry-grid` with nothing (skip it). Already handled by existing portfolio-count gate in provision-tenant.mjs.

---

## WS3: Scroll-Spy Navigation (Hybrid Approach)

### Architecture
Keep separate pages (`/services`, `/projects`, `/about`, `/contact`) for SEO and direct links. Add scroll-spy to homepage only.

### Implementation

**3A. Add section anchor IDs to SectionRenderer**

**File:** `src/components/section-renderer.tsx`

Wrap each rendered section in a `<div id="section-{type}">` where type is derived from the section ID (e.g., `hero:visualizer-teardown` → `id="hero"`, `services:grid-3-cards` → `id="services"`).

Map section categories to anchor IDs:
```
hero:*           → id="hero"
services:*       → id="services"
gallery:*        → id="projects"
misc:process-*   → id="how-it-works"
about:*          → id="about"
contact:*        → id="contact"
testimonials:*   → id="testimonials"
trust:*          → id="trust"
cta:*            → id="cta"
```

**3B. Add scroll-spy to header (homepage only)**

**File:** `src/components/header.tsx`

- Use `IntersectionObserver` to track which section is in the viewport
- Only active on homepage (check `pathname === '/'`)
- When on homepage, nav links become `href="#services"` instead of `href="/services"`
- Highlight the currently-visible section in the nav
- Add `scroll-smooth` to the html element
- On non-homepage pages, nav links remain `href="/services"` (page-based)

**3C. Smooth scroll behaviour**

**File:** `src/app/layout.tsx` or `globals.css`

Add `scroll-behavior: smooth` and `scroll-padding-top: 4rem` (to account for sticky header height).

---

## WS4: Mobile Responsiveness Fixes

### 4A. Header CTA button sizing

**File:** `src/components/header.tsx`

- Mobile CTA: Reduce from `h-10 px-4` to `h-8 px-3 text-xs` on mobile
- Use shorter CTA text on mobile: "Get Quote" instead of "Start Your Project"
- Ensure logo has `min-w-0 max-w-[120px]` to prevent CTA overlap

### 4B. Visualizer sizing on mobile

**File:** `src/sections/hero/visualizer-teardown.tsx`

- Reduce the visualizer container height on mobile: `h-[280px] md:h-[400px] lg:h-[500px]`
- Ensure the frame scrubber canvas scales properly at 375px width
- Style tabs: ensure horizontal scroll with `overflow-x-auto` at small widths

### 4C. Section spacing consistency

Review all section components for mobile padding:
- `px-4` minimum on mobile (not `px-6` which wastes space at 375px)
- `py-12 md:py-20` for vertical rhythm (not too cramped, not too spacious)

---

## WS5: Image Intelligence — Contextual Placement

### Problem
The pipeline stores image URLs but doesn't classify WHAT the image depicts or WHERE it belongs.

### Fix: AI Image Classification During Scraping

**File:** `tenant-builder/scrape/scrape-enhanced.mjs` (new Phase 2.5)

After deep image scrape (Phase 2.3), use the scraped page context to classify images:

```
Homepage first large image  → hero candidate
/about page images         → about/team candidates
/gallery, /portfolio pages → portfolio candidates
/services page images      → service candidates (map by proximity to service names)
Logo-like images (small, SVG, contains "logo") → skip for content sections
```

**Classification heuristic (no AI API cost):**
1. **By source page URL** (already done in fix-tenant-images.mjs merge logic)
2. **By image dimensions** (via sharp metadata after download):
   - Wide/panoramic (>2:1 ratio) → hero candidate
   - Square-ish (0.8-1.2 ratio, >300px) → service/portfolio
   - Very small (<100px either dimension) → icon/badge, skip
3. **By filename/alt text** (from markdown extraction):
   - Contains "team", "staff", "about", "office" → about image
   - Contains "kitchen", "bathroom", "renovation" → service image
   - Contains "project", "portfolio", "gallery" → portfolio image
4. **By position on page** (first image on homepage = hero candidate)

### Also fix: About image validation
In the merge phase, if `aboutImageUrl` matches patterns suggesting it's a logo (same URL as `logoUrl`, contains "logo" in path, is SVG, or is very small), clear it and use the first about-page image instead.

---

## WS6: Pipeline Mobile Testing

### Add Playwright mobile checks to the pipeline

**File:** `tenant-builder/scripts/fix-tenant-images.mjs` (update verification section)

After each tenant fix, run mobile viewport checks:
1. **375px viewport** — iPhone SE minimum
2. Check: Header logo visible (not overlapped by CTA)
3. Check: Hero section renders within viewport height
4. Check: Service cards stack vertically (not horizontally overflowing)
5. Check: Text is readable (no truncation of critical content)
6. Screenshot at 375px for manual review

**Also add to pipeline QA:**
**File:** New check in `tenant-builder/qa/` or enhance existing `live-site-audit.mjs`

Add mobile viewport checks as a QA gate:
- Navigate to tenant URL at 375px width
- Verify no horizontal overflow (`document.body.scrollWidth <= window.innerWidth`)
- Verify all images load (`querySelectorAll('img').forEach(img => img.naturalWidth > 0)`)
- Screenshot mobile view

---

## WS7: Batch Update All 23 Tenants

After WS1-WS4 code changes are deployed:

1. **Update page_layouts** in Supabase for all 23 tenants to new homepage flow
2. **Verify hero images** — ensure each tenant's `heroImageUrl` is a real photo (not a logo, not AI-generated)
3. **Verify about images** — ensure `aboutImageUrl` is not a logo
4. **Run Playwright verification** at both 1440px and 375px viewports
5. **Screenshot each tenant** for manual review

Use the existing `fix-tenant-images.mjs` script with a new `--update-layouts` flag.

---

## Execution Order

```
1. WS0: Model optimization (gemini-cli.mjs, model-router, config updates)  [30 min]
2. WS1: Hero section fix                    [45 min — most critical]
3. WS2: Homepage layout redesign            [15 min — DEFAULT_HOMEPAGE_LAYOUT change]
4. WS3: Scroll-spy navigation               [45 min — IntersectionObserver + header refactor]
5. WS4: Mobile fixes                        [30 min — header CTA, visualizer sizing]
6. npm run build — verify clean              [5 min]
7. WS5: Image classification with Gemini CLI  [30 min — enhance merge phase]
8. WS6: Mobile Playwright testing            [20 min — add to verification]
9. WS7: Batch update 23 tenants              [20 min — page_layouts + verification]
10. Deploy via sync-deploy.sh                [10 min]
11. Live verification (desktop + mobile)     [15 min]
```

---

## Critical Files

| File | Change | WS |
|------|--------|-----|
| `tenant-builder/lib/gemini-cli.mjs` | **New**: Gemini CLI wrapper | WS0 |
| `tenant-builder/lib/model-router.mjs` | **New**: Task → model routing | WS0 |
| `src/lib/ai/config.ts` | Quote/email models → gpt-4o-mini | WS0 |
| `src/sections/hero/visualizer-teardown.tsx` | Add heroImageUrl background fallback | WS1 |
| `src/lib/page-layout.ts` | New DEFAULT_HOMEPAGE_LAYOUT order | WS2 |
| `tenant-builder/provision/provision-tenant.mjs` | Update default pageLayouts | WS2 |
| `src/components/section-renderer.tsx` | Add section anchor IDs | WS3 |
| `src/components/header.tsx` | Scroll-spy + mobile CTA fix | WS3, WS4 |
| `src/app/globals.css` | scroll-behavior: smooth | WS3 |
| `tenant-builder/scrape/scrape-enhanced.mjs` | Image classification via Gemini CLI | WS5 |
| `tenant-builder/scripts/fix-tenant-images.mjs` | Mobile testing + layout updates + Gemini classify | WS6, WS7 |

---

## Honest Capability Assessment

**Is the autonomous daily outreach pipeline achievable? YES — with these fixes.**

### What We Proved Today
- Firecrawl `map()` discovered 50+ pages per site automatically
- Markdown extraction with scroll actions found 10-100x more images
- 23 tenants were re-scraped and fixed with **0 errors**
- Real contractor photos were downloaded, optimized, uploaded, and linked in Supabase

### What Was Broken — Rendering Decisions, Not AI
1. Choosing `visualizer-teardown` as default hero removed all background images (a code decision)
2. No image classification logic (images stored as URLs without context)
3. No mobile testing in the pipeline (easy to add with Playwright)
4. AI image generation was too eager (now removed for services)

### Multi-Model Advantage — Nobody Else Has This
We have 3 frontier model CLIs authenticated via flat-rate subscription:
- **Claude Code** (Opus 4.6) — best reasoning, orchestration, code review
- **Codex CLI** (GPT 5.4) — best code generation, vision analysis, multi-agent
- **Gemini CLI** (3.1 Pro/Flash) — free vision, image classification, content analysis

This means ALL build-time AI tasks cost ~$0 marginal. Only runtime API calls (chat, visualization) cost money. At 10 builds/night, the pipeline cost is effectively just Firecrawl credits (~50 credits/night) plus runtime API calls when homeowners actually use the demos.

### What's Genuinely Achievable
- Autonomous scraping with real images: **YES** (proven)
- AI image classification (hero vs service vs portfolio): **YES** (Gemini CLI, $0)
- Hero images from contractor sites: **YES** (CSS backgrounds + markdown extraction)
- Mobile-responsive testing: **YES** (Playwright at 375px)
- 10 quality builds/night: **YES** — with layout fix + hero fallback + mobile QA gate
- Scroll-spy navigation: **YES** — IntersectionObserver, well-established pattern

### What Requires Human Review
- Logo contrast edge cases (auto-detected but confirm visually)
- Whether a specific photo truly represents the contractor's work
- Email copy personalization (Ferdie's personal touch)
- Final "send" decision on outreach emails (CASL compliance)

### Honest Limitation
The pipeline cannot yet produce the quality of a hand-crafted warm-lead build (like CCR Renovations with 11 custom sections). Template builds are good for outreach demos but not portfolio-quality. The gap is narrowing with Gemini vision classification and the layout improvements in this plan.

**Recommendation:** Continue the pipeline. The infrastructure works. These design + model fixes close the quality gap to "ready for outreach" level.

---

## Verification

1. After WS1: Load a tenant with heroImageUrl → verify background image appears behind animation
2. After WS2: Check homepage section order matches new flow
3. After WS3: Scroll homepage → verify nav highlights change; click nav item → smooth scroll
4. After WS4: Open tenant at 375px → verify header logo visible, CTA doesn't overlap
5. After WS7: Playwright screenshots of all 23 tenants at 1440px + 375px
6. Build: `npm run build` clean
7. Deploy + live verification

---

**TLDR:** Hero sections are broken because `visualizer-teardown` ignores `heroImageUrl` — it's pure animation with hardcoded fallbacks. Fix: (1) add background image fallback to hero, (2) redesign homepage flow to Hero → Services → Projects → How It Works → About → Contact, (3) add scroll-spy navigation, (4) fix mobile CTA/visualizer sizing, (5) add Gemini CLI for free image classification, (6) optimize model routing (CLI subscriptions for build-time = $0 marginal, GPT-4o-mini for simple runtime tasks), (7) batch-update all 23 tenants with mobile Playwright testing. The pipeline IS achievable — we have 3 frontier model CLIs at $0 marginal cost. What was broken was rendering decisions, not AI capability.

**Complexity:** HIGH — 11 files across 8 workstreams + batch update of 23 tenants. Each workstream is independent and testable. Deploy WS0+WS1+WS2 first (models + hero + layout) as quick wins, then WS3+WS4 (navigation + mobile), then WS5-WS7 (classification + testing + batch update).
