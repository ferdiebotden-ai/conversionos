# Architecture

## Pipeline Shape

1. Capture source-site evidence from a live URL or saved HTML.
2. Build a `BrandResearchBundle` containing identity, visual tokens, layout patterns, copy tone, trust markers, services, proof assets, and CTA patterns.
3. Convert the bundle into a `SiteBlueprint` that describes reusable page structure and platform-entry placement.
4. Emit a `BuildManifest` containing the replacement gates and platform embed contract.
5. Emit an `AcceptanceReport` that keeps the run in private-preview status until a human approves it.

## Boundaries

- The dominant-builder owns the public-shell reconstruction plan.
- The shared product core remains in the demo app.
- Results are comparison artifacts first, not deploy targets.

## Initial Implementation

The first implementation is intentionally lightweight:
- HTML signal extraction is heuristic-driven and dependency-free.
- Contracts are explicit and testable.
- The CLI writes comparable artifacts for shadow review.
- Human review remains mandatory.
