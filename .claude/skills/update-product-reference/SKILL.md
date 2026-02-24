---
name: update-product-reference
description: Updates the living product reference document (docs/PRODUCT_REFERENCE.md) to reflect the current state of the codebase. Use after any session that modifies features, AI models, database schema, API routes, handoff mechanisms, pricing tiers, or tenant configuration. Also use when the user explicitly asks to update the product reference.
user_invocable: true
---

# Update Product Reference

Update `docs/PRODUCT_REFERENCE.md` to accurately describe the product as it exists RIGHT NOW.

## What This Document Is

- The single source of truth for what ConversionOS is, who it's for, and how it works
- Written for a technical co-founder or strategic partner who needs to understand the full system without reading code
- A living PRD — it describes the current product, not its history or future

## What This Document Is NOT

- **Not a changelog.** Never write "added X in Session 4" or "removed Y on Feb 24." Just describe the current state.
- **Not a development log.** Never write "in this session we..." or "this was implemented by..."
- **Not a roadmap.** Never write "we plan to build..." If something doesn't exist yet, either omit it or list it under Known Constraints.
- **Not a technical implementation tracker.** That's `docs/IMPLEMENTATION_STATUS.md`.

## How to Update

1. **Read the current `docs/PRODUCT_REFERENCE.md` first.** Understand the existing structure and content.
2. **Identify which sections are affected** by the changes made in this session.
3. **Rewrite those sections** to reflect the new reality. Do NOT append notes at the bottom. Integrate changes into the existing structure.
4. **Verify claims against the codebase.** Every model name, file path, column name, route path, and feature description must match what's actually in the code.
5. **Update the "Last updated" date and "Updated by"** at the top of the document.
6. **If you added a feature** that doesn't fit existing sections, add a subsection in the most logical place.
7. **If you removed or disabled a feature**, remove it from the document. If it's temporarily disabled, move it to Known Constraints with a note about why.
8. **If you changed a feature's behaviour**, rewrite the relevant description to match the new behaviour. Don't mention what it used to do.

## Accuracy Rules

- Only document what exists in the codebase. Use exact model names (`gpt-5.2`, not "GPT"), exact file paths, exact column names, exact route paths.
- If a feature flag disables something, note it as disabled with the flag name.
- If a database column exists but no UI populates it, say so in Known Constraints.
- If a feature is gated by tier, specify which tier.
- Never copy from planning documents (PRDs, enhancement docs) — always verify against actual code.

## Tone and Voice

- Factual and concise. No marketing language.
- Strategic context is important — explain WHY features exist, not just what they do.
- Write for someone who is smart but hasn't seen the codebase.
- Canadian spelling (colour, favourite, centre).

## Sections to Check After Common Changes

| Change Type | Sections to Update |
|-------------|-------------------|
| New feature | Feature Map, relevant User Journey, API Routes, Page Routes |
| AI model change | Tech Stack, relevant Agent section, AI Visualization Pipeline |
| New API route | API Routes table |
| New page | Page Routes table |
| Schema change | Database Schema, possibly Known Constraints |
| New tenant | Multi-Tenancy → Current Tenants |
| Tier/pricing change | Pricing Tiers, Feature Map |
| New integration | External Integrations, Tech Stack |
| Bug fix only | Usually no update needed unless it changes user-visible behaviour |
| Removed feature | Remove from Feature Map, relevant sections. Add to Known Constraints only if temporarily disabled. |

## After Updating

- Re-read the full document to verify it reads coherently as a standalone reference
- Check that no section contradicts another
- Ensure the "Last updated" date is current
- Verify the document stays between 400-800 lines (currently ~450 lines of content)
