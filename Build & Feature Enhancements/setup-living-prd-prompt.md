# Prompt for Claude Code: Set Up a Living Product Reference Document

## What I Need You to Do

I want you to set up a self-maintaining product reference system for this codebase. The system has three parts: a living product reference document, a skill that contains instructions for how to update it, and a rule in CLAUDE.md that tells you to keep it current. Here's exactly what to create.

---

## Part 1: The Living Product Reference Document

Create `docs/PRODUCT_REFERENCE.md` in the project root. This is the single source of truth for what ConversionOS is, how it works, and what's been built. It is NOT a changelog, NOT a PRD of what we plan to build, and NOT a development log. It describes the product as it exists RIGHT NOW.

**Populate it by auditing the actual codebase.** Read the source files, the database schema, the API routes, the components, the AI prompts, and the configuration. Document what you find — not what any planning document says should exist.

Use this structure:

```markdown
# ConversionOS — Product Reference
**Last updated:** [date] | **Updated by:** Claude Code session

---

## Platform Overview
One paragraph: what ConversionOS is, who it's for, what it does.

## Tech Stack
Table format: layer, technology, version, notes.
Frontend, backend, AI models (with exact model strings), database, hosting, APIs, testing.

## User Journeys

### Homeowner Journey
Step-by-step: how a homeowner experiences the platform from landing on the site through to receiving a quote. Include the actual URL paths, component names, and what happens at each step.

### Contractor (Admin) Journey
Step-by-step: how a contractor uses the admin dashboard. What they see, what they can do, what's gated by tier.

### Visualizer Flow
Detailed flow: upload → form → generation → results → quote handoff. Include the actual AI pipeline stages, models used at each stage, what data is captured, and what gets passed forward.

## AI Agents

### Emma (Receptionist)
What she does, where she appears, her persona rules, her routing logic, which model powers her.

### Marcus (Quote Specialist)  
What he does, his conversation flow, what context he receives from handoffs, his pricing knowledge, which model powers him, his boundaries and rules.

### Mia (Design Consultant)
What she does, the voice consultation flow, how preferences are extracted, which model powers her, her persona rules.

## AI Pipeline — Visualizer
The complete generation pipeline: photo analysis schema (list all fields), edge detection, prompt construction (all sections), Gemini generation (batching strategy, retry logic, time budget), validation, concept storage. Include actual model names and costs per call.

## Database Schema
Key tables and their purposes. For each table: name, key columns (with types), relationships, and what feature it supports. Focus on: visualizations, leads, lead_visualizations, sites, quotes, invoices.

## API Routes
List the API routes that power core features. For each: path, method, what it does, what it returns, any notable constraints (rate limits, timeouts, auth).

## Handoff Mechanisms
How data flows between agents and features. Document each handoff point: what triggers it, what data is passed, what format it's in, where it's stored, what gets lost.

## Feature Status by Tier
Table: feature name, Elevate, Accelerate, Dominate, implementation status (Live/Partial/Planned). Only mark "Live" if the code exists and works. Be honest about what's Planned vs. actually built.

## White-Label Configuration
What's configurable per contractor deployment. List every parameter with where it's set.

## Known Constraints & Technical Debt
Architectural limitations, workarounds, disabled features, hardcoded values, timeout pressures, missing error handling. Be specific — file paths and line numbers where relevant.

## External Integrations
Every external service the platform connects to: name, what it's used for, how it's configured, cost per call if applicable.
```

**Rules for this document:**
- Every claim must be verifiable by reading the codebase. No aspirational statements.
- Use exact model names (e.g., "gpt-5.2" not "GPT"), exact file paths, exact column names.
- If something is partially built or has a flag that's disabled, say so explicitly.
- Keep it factual and concise. No marketing language. No "we plan to" — only "this exists" or "this doesn't exist yet."
- Target length: 400-800 lines. Enough to be comprehensive, short enough to be useful as context.

---

## Part 2: The Update Skill

Create `.claude/skills/update-product-reference/SKILL.md` with this content:

```markdown
---
name: update-product-reference
description: Updates the living product reference document (docs/PRODUCT_REFERENCE.md) to reflect the current state of the codebase after implementation changes. Use when features have been added, modified, or removed, when AI models or prompts have changed, when database schema has been altered, when API routes have been added or changed, when handoff mechanisms have been modified, or when the user asks to update the product reference.
---

# Update Product Reference

When updating `docs/PRODUCT_REFERENCE.md`, follow these rules:

## What This Document Is
- A snapshot of the product AS IT EXISTS in the codebase right now
- The single source of truth that gets shared with strategic planning sessions
- Written for a technical co-founder who needs to understand the full system without reading code

## What This Document Is NOT
- Not a changelog (don't say "added X on Feb 22" — just describe X as part of the product)
- Not a PRD or roadmap (don't say "we plan to" — only "this exists" or "this doesn't exist yet")
- Not a development log (don't say "in this session we..." — just update the relevant sections)

## How to Update
1. Read the current `docs/PRODUCT_REFERENCE.md` first
2. Identify which sections are affected by the changes you just made
3. Rewrite those sections to reflect the new reality
4. Do NOT append to the bottom. Integrate changes into the existing structure.
5. Update the "Last updated" date at the top
6. If you added a new feature that doesn't fit existing sections, add a subsection in the most logical place
7. If you removed or disabled a feature, remove it from the document (or move it to Known Constraints if it's temporarily disabled)
8. Keep the same structure and formatting conventions as the rest of the document

## Accuracy Rules
- Only document what you can verify exists in the codebase
- Use exact model names, file paths, column names, and route paths
- If a feature flag disables something, note it as disabled with the flag name
- If a database column exists but no UI populates it, say so
- Never copy from planning documents — always verify against actual code

## After Updating
- Verify the document reads coherently as a standalone reference
- Check that no section contradicts another
- Ensure the "Last updated" date is current
```

---

## Part 3: CLAUDE.md Rule

Add this to the project's CLAUDE.md file. If CLAUDE.md doesn't exist, create it. If it does exist, add this as a clearly separated section. Place it near the top — within the first 30 lines — so it's never ignored due to length.

```markdown
## Living Product Reference — IMPORTANT
After ANY session where you implement features, fix bugs, modify AI prompts, change database schema, update API routes, or alter handoff mechanisms: update `docs/PRODUCT_REFERENCE.md` to reflect the current state of the product. This is not optional. The document must always match what's actually in the codebase. Use the `/update-product-reference` skill for detailed instructions. Do not treat this as a changelog — rewrite the affected sections to describe the product as it exists now.
```

**Placement rules for this CLAUDE.md entry:**
- It must be within the first 30 lines of the file
- It must not be buried inside a long list of other rules
- The word "IMPORTANT" must be present (research shows this improves adherence)
- Keep it to 5-6 lines maximum — longer instructions get ignored

---

## Part 4: Verify the Setup

After creating all three files, verify:
1. `docs/PRODUCT_REFERENCE.md` exists and has been populated from an actual codebase audit
2. `.claude/skills/update-product-reference/SKILL.md` exists with valid frontmatter
3. The CLAUDE.md rule is present within the first 30 lines
4. Run `/skills` to confirm the update-product-reference skill is discoverable
5. Tell me what you created and give me a summary of the product reference document's table of contents

---

## Why This Matters

This document gets shared with a strategic AI partner (Claude in a separate project) for feature planning, competitive analysis, and business strategy. If it's stale or inaccurate, we make bad decisions. Keeping it current is as important as keeping tests passing.
