# dominant-builder — Sprint 3 Foundation

Opus Vision-driven bespoke website generation for Dominate and Black Label tiers.

## Status: Scaffolding Only

This directory contains type definitions and pure utility functions for Sprint 3.
The actual implementation (screenshot capture, CSS extraction, Opus Vision calls,
blueprint generation) will be added in the next session.

## Architecture

1. **Screenshot Capture** — Playwright captures 5-7 pages of the original website
2. **CSS Extraction** — Extracts design tokens (colours, typography, spacing)
3. **Opus Vision Analysis** — Claude Opus analyses screenshots to generate a SiteBlueprintV2
4. **Envelope Enforcement** — Validates blueprint against platform constraints
5. **Assembly** — Codex/Claude generates the Next.js page code from blueprint
6. **Visual Fidelity QA** — Side-by-side comparison (Playwright + Claude Vision)
7. **Refinement Loop** — Iterates until visual match score > 85%

## Files

- `src/contracts/types.d.ts` — Type definitions for DesignSystemBundle, SiteBlueprintV2, PlatformEmbedContract
- `src/lib/envelope-enforcer.mjs` — Blueprint validation against hard/soft limits
- `src/lib/section-catalogue.mjs` — Auto-generates section catalogue from register.ts

## Generate Section Catalogue

```bash
node dominant-builder/src/lib/section-catalogue.mjs
```

Outputs `dominant-builder/data/section-catalogue.json`.
