# Kickoff Prompt — Continuity Rebuild Pipeline

**Copy everything below the line into a fresh Claude Code session opened at `~/norbot-ops/products/demo/`**

---

## Prompt

You are executing the Continuity Rebuild Pipeline for NorBot Systems — a strategic pivot from "same template, different data" to "your website, rebuilt as a conversion system." This is the most important build in the company's history.

### Step 1: Read the Master PRD

Read `docs/PRD_CONTINUITY_REBUILD.md` in full. This is a 1,008-line self-contained execution document containing 6 sprints with exact code patterns, type definitions, interface contracts, teammate assignments, and a progress tracker. Every architectural decision is locked. Do not second-guess the PRD — execute it.

Check the Progress Tracker at the bottom of the PRD. Pick up from the first uncompleted item.

### Step 2: Understand the Codebase You're Modifying

Before writing code, read these files to understand the current architecture:

- `src/proxy.ts` — Current hardcoded domain routing (31 tenants). Sprint 1 replaces this with Edge Config.
- `src/lib/entitlements.ts` — Feature gating by tier. Sprint 0 adds `black_label` tier.
- `src/app/page.tsx` — Current hardcoded homepage sections. Sprint 2 replaces this with SectionRenderer.
- `src/lib/branding.ts` — Server-side branding from admin_settings. Sections consume this.
- `tenant-builder/icp-score.mjs` — Current ICP scoring with inverted dimensions. Sprint 0 flips these.
- `tenant-builder/config.yaml` — Current weights and thresholds. Sprint 0 updates these.

Also read the existing type contracts that Sprint 3 extends:
- `../dominant-builder/src/contracts/types.d.ts` — BrandResearchBundle, SiteBlueprint types

### Step 3: Execute — Parallelise Aggressively

**Sprints 0, 1, and 2 have ZERO dependencies on each other.** Run them in parallel using Agent Teams. Here is the execution strategy:

#### Phase 1: Create Shared Interfaces (Lead — you, solo, ~30 minutes)

Before spawning any teammates, create the 3 shared interface files that Sprint 2 teammates need. The PRD Section 5 has the exact code. Create:

1. `src/lib/section-types.ts` — DesignTokens, SectionBaseProps, SectionId, PageLayout types
2. `src/lib/section-registry.ts` — registerSection(), getSection(), listSections()
3. `src/components/section-renderer.tsx` — Dynamic section compositor

Commit these to main so teammates have them.

#### Phase 2: Spawn Agent Teams (7 teammates, all parallel)

Spawn all of these as Agent Teams teammates with worktree isolation. Each teammate owns disjoint files — no conflicts possible.

**Teammate A — Sprint 0: ICP Scoring Flip + Pricing Update**
- Files: `tenant-builder/icp-score.mjs`, `tenant-builder/config.yaml`, `src/lib/entitlements.ts`
- Task: Flip sophistication_gap scoring (stunning=20, basic=3 instead of basic=20, stunning=3). Flip company_size scoring (large=15, solo=4 instead of solo=15, large=4). Add 2 new dimensions: marketing_sophistication (15pts) and years_in_business (15pts). Update config.yaml weights to new 130-point scale. Update thresholds to 85/65. Add ring-based geography scoring from Stratford. Add `black_label` to PlanTier in entitlements.ts with all Dominate features plus custom_workflows and bespoke_automation. Update any pricing constants across the codebase to $299/$699/$1,799/$4,999 monthly. The PRD Section 3 has exact before/after code.

**Teammate B — Sprint 1: Edge Config Migration**
- Files: `src/proxy.ts`, `tenant-builder/provision/merge-proxy.mjs`, `scripts/onboarding/add-domain.mjs`
- Task: Install `@vercel/edge-config`. Replace hardcoded DOMAIN_TO_SITE in proxy.ts with Edge Config lookup + hardcoded fallback. Update merge-proxy.mjs to write to Edge Config API instead of editing proxy.ts source. Update add-domain.mjs to include Edge Config step. The PRD Section 4 has exact replacement code. Retain the hardcoded map as fallback for when Edge Config is unavailable.

**Teammates C through G — Sprint 2: Section Component Library (5 teammates)**
- Each teammate reads `src/lib/section-types.ts` and `src/lib/section-registry.ts` first
- Every component must: accept `SectionBaseProps & Record<string, unknown>`, use Tailwind v4, be responsive (mobile-first), use CSS custom properties from branding, call `registerSection()` at module scope
- Use Framer Motion for animations where the PRD specifies animation presets

**Teammate C — Hero + Navigation (9 components)**
- Directory: `src/sections/hero/` and `src/sections/navigation/`
- Components: full-bleed-overlay, split-image-text, editorial-centered, video-background, gradient-text (hero); sticky-simple, sticky-transparent, split-logo-center, hamburger (nav)

**Teammate D — Services + Trust/Proof (9 components)**
- Directory: `src/sections/services/` and `src/sections/trust/`
- Components: grid-3-cards, grid-2-cards, accordion-list, alternating-rows, bento (services); badge-strip, stats-counter, certifications, review-aggregate (trust)

**Teammate E — Testimonials + Gallery (8 components)**
- Directory: `src/sections/testimonials/` and `src/sections/gallery/`
- Components: cards-carousel, single-featured, masonry, minimal-quotes (testimonials); masonry-grid, before-after-slider, lightbox, editorial-featured (gallery)

**Teammate F — About/Team + Contact (8 components)**
- Directory: `src/sections/about/` and `src/sections/contact/`
- Components: split-image-copy, timeline, team-grid, values-cards (about); form-with-map, form-simple, details-sidebar, contact-cards (contact)

**Teammate G — CTA + Footer + Misc (12 components)**
- Directory: `src/sections/cta/`, `src/sections/footer/`, and `src/sections/misc/`
- Components: full-width-primary, split-with-image, floating-banner, inline-card (cta); multi-column-3, multi-column-4, simple-centered, minimal-bar (footer); process-steps, faq-accordion, service-area-map, partner-logos (misc)

#### Phase 3: Integration (Lead — you, after all teammates merge)

Once all teammates complete:

1. Create `src/sections/register.ts` — imports all 50 components and calls registerSection() for each
2. Define `DEFAULT_LAYOUT` constant matching the current homepage structure (Hero → SocialProofBar → VisualizerTeaser → ServicesGrid → GalleryTeaser → Testimonials → CTA)
3. Create `getPageLayout()` function that reads from admin_settings with DEFAULT_LAYOUT fallback
4. Refactor `src/app/page.tsx` to use `<SectionRenderer sections={layout} branding={branding} config={config} />`
5. Run `npm run build` — must pass with zero TypeScript errors
6. Visually verify: all 14+ existing tenants must render identically to before (screenshot regression)

#### Phase 4: Continue to Sprints 3-5 (if context allows)

If you still have context headroom after Phase 3, continue directly into Sprint 3 (Enhanced Extraction + Blueprint Generator). The PRD Section 6 has the complete spec including DesignSystemBundle and SiteBlueprintV2 type definitions. Sprint 3 depends on the section catalogue from Sprint 2 being complete.

If context is getting tight, use `/compact` and continue. If you've exhausted the session, update the Progress Tracker checkboxes in the PRD for everything completed and stop — the next session picks up where you left off.

### Key Rules

- **Canadian spelling** everywhere (colour, favourite, centre, analyse)
- **Do not create documentation files** unless the PRD explicitly calls for one
- **Do not refactor code** beyond what the PRD specifies — no "improvements" or "cleanups"
- **Pricing is locked:** $299/$699/$1,799/$4,999 monthly + $499 voice. $4,500/$12,000/$20,000/$40,000 setup.
- **75% setup refund guarantee** within 14 days of go-live
- **Black Label** is the 4th tier — custom AI implementation beyond the product envelope
- **Migration envelope:** 15 pages max, 3 custom sections max, complexity score <= 7/10
- **Admin dashboard is NOT rebranded** per tenant — always NorBot Systems brand
- After completing work, update the Progress Tracker checkboxes in the PRD
- Commit completed sprints to git with descriptive messages

### Quality Gates

Before declaring any sprint complete:
- `npm run build` passes (zero TS errors)
- `npm run lint` passes
- All existing tenants still render (no regressions)
- Progress Tracker updated in the PRD

### Context About the Business

NorBot Systems Inc. is a one-person AI-native product studio in Stratford, Ontario. Founder Ferdie Botden (CPA, former TD Bank District Manager). ConversionOS is the flagship product — a white-label AI conversion operating system for renovation contractors. The pivot is from cookie-cutter templates to autonomous website rebuilds that preserve each contractor's brand identity while embedding AI features beneath it. This build is the foundation for everything — first paying client, first case study, first investor pitch. Ship it.
