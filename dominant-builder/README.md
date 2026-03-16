# Dominant Builder

Dominant Builder is a separate shadow workspace for high-fidelity, private-preview reconstruction of dominant-tier prospect websites. It does not replace the current tenant-builder by default.

## Purpose

- capture target-site evidence
- normalise it into reusable brand and layout contracts
- map those contracts into a stronger public-shell blueprint
- keep the existing ConversionOS platform core as the embedded engine

## Current Scope

- shadow builds only
- private-preview only
- no public release or outreach send authority

## Quick Start

```bash
npm test
node src/cli/shadow-build.mjs --html-file tests/fixtures/source.html --source-url https://oakandstonebuild.ca --site-id oak-and-stone
```

## Output

Shadow runs write these files under `results/<site-id>/`:

- `brand-research-bundle.json`
- `site-blueprint.json`
- `build-manifest.json`
- `acceptance-report.json`
- `shadow-brief.md`
