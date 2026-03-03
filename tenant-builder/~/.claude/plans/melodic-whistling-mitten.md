# Tenant Builder — Phase 2 Enhancements

## Context

Deliverables 1-3 from Phase 1 are **DONE** (CLAUDE.md trimmed 452→118 lines, custom agent created, per-page visual QA expanded, stale skills cleaned up, 223 tests pass). This plan covers two additions:

1. **Learned Patterns System** — accumulate build learnings across sessions without modifying pipeline code
2. **Original Website Comparison in Refinement Loop** — give Claude Vision the original website screenshots during autonomous fix cycles so corrections align with what the contractor's site actually looks like

## Clarification: Custom Agent vs CLAUDE.md

**They serve different purposes:**

| File | When It Loads | What It Does |
|------|--------------|--------------|
| `tenant-builder/CLAUDE.md` | **Auto-loaded** when you open the folder | The "expert employee" brain — pipeline instructions, post-build review, quality bar |
| `.claude/agents/tenant-builder.md` | When spawned via Agent tool | For subagent spawning from another context (Mission Control, Agent Teams, parent session) |

**Opening the tenant-builder folder directly = CLAUDE.md is your agent.** The custom agent file is bonus for when you want to spawn a tenant-builder worker from a different root folder or context. Both contain the same operational instructions, so either path gives the same behaviour. For your daily workflow (open folder → build tenants), CLAUDE.md is all you need.

---

## Deliverable 4: Learned Patterns System

### What

A `docs/learned-patterns.md` file that accumulates build-specific learnings. Claude reads it at session start and applies patterns proactively. No pipeline code changes.

### Files to Create/Modify

| File | Action |
|------|--------|
| `docs/learned-patterns.md` | **Create** — starter file with section headers and format instructions |
| `CLAUDE.md` | **Edit** — add reference in Deep Reference table + instruction to read/append during sessions |

### learned-patterns.md Structure

```markdown
# Learned Patterns

Accumulated learnings from tenant builds. Read at session start. Append after corrections.

## How to Use This File
- Read at the start of every build session
- After fixing an issue in a tenant, ask: "Is this a pattern that will repeat?"
- If yes, append it here with: what the issue was, what caused it, what the fix was, which build it came from
- Every ~10 builds, review for patterns worth codifying into the pipeline

## Hero Images
(empty — will fill as builds accumulate)

## Colour & Contrast
(empty)

## Copy & Content
(empty)

## Services & Portfolio
(empty)

## Layout & Responsive
(empty)

## Scraping Edge Cases
(empty)
```

### CLAUDE.md Changes

Add to the Deep Reference table:
```
| Accumulated build learnings | `docs/learned-patterns.md` |
```

Add to the Post-Build Review section (step 7):
```
7. **Update learned patterns** — If you made manual corrections, ask Ferdie if the pattern should be recorded in `docs/learned-patterns.md`
```

### Why This Is Safe

- **Read-only reference** — Claude reads it for context, never modifies pipeline code based on it
- **Human-gated writes** — Claude asks Ferdie before appending (not autonomous)
- **Git-tracked** — all changes are committable and reviewable
- **Zero pipeline risk** — no code changes, no threshold changes, no config changes

**Complexity: LOW.** 1 new file, 2 small edits to CLAUDE.md.

---

## Deliverable 5: Original Website Screenshots in Refinement Loop

### Problem

The refinement loop (`refinement-loop.mjs`) tries to fix visual QA failures by having Claude analyse the demo's screenshots and suggest admin_settings fixes. But Claude never sees the **original contractor website** — it's guessing what the demo should look like based on scores alone. `visual-qa.mjs` already supports an `--original` flag, but nobody passes it.

### Solution

1. Capture one screenshot of the original contractor website during the pipeline (before QA)
2. Pass it through the refinement loop to visual-qa.mjs
3. Include it in the fix analysis prompt so Claude knows what the demo SHOULD match

### Files to Modify

| File | Change | Risk |
|------|--------|------|
| `orchestrate.mjs` (~3 lines) | Before step 5f, capture original homepage screenshot using Playwright subprocess | LOW |
| `qa/refinement-loop.mjs` (~10 lines) | Accept `--original-url` flag, capture original screenshot on first iteration, pass `--original` to visual-qa.mjs | LOW |
| `qa/refinement-loop.mjs` fix prompt (~5 lines) | Add original website context to the fix analysis prompt | LOW |

### Implementation Detail

**Option A (simpler — recommended): Capture in orchestrate.mjs**

In `orchestrate.mjs`, after step 5e (screenshots) and before step 5f (refinement loop), add:

```javascript
// Capture original website for visual comparison
const originalScreenshotPath = resolve(outputDir, 'screenshots/original-homepage.png');
if (target.website && !auditOnly) {
  try {
    execFileSync('node', ['-e', `
      const { chromium } = require('playwright');
      (async () => {
        const b = await chromium.launch({ headless: true });
        const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
        await p.goto('${target.website}', { waitUntil: 'networkidle', timeout: 30000 });
        await p.screenshot({ path: '${originalScreenshotPath}' });
        await b.close();
      })();
    `], { timeout: 45000, stdio: 'pipe' });
  } catch { /* original site may be unreachable */ }
}
```

Then pass to refinement loop:
```javascript
if (existsSync(originalScreenshotPath)) {
  qaArgs.push('--original-screenshot', originalScreenshotPath);
}
```

**In refinement-loop.mjs:**

Add `--original-screenshot` to parseArgs options. Pass to visual-qa.mjs:
```javascript
if (args['original-screenshot'] && existsSync(args['original-screenshot'])) {
  qaArgs.push('--original', args['original-screenshot']);
}
```

Enhance the fix prompt:
```javascript
const originalContext = args['original-screenshot']
  ? `\nThe original contractor website screenshot is at: ${args['original-screenshot']}. Read it to understand what the demo SHOULD look like. Fixes should make the demo match the original more closely.`
  : '';
```

**In visual-qa.mjs**: Already supports `--original` — no changes needed. The prompt already says "Also read the original contractor website screenshot for comparison."

### What This Enables

- Claude Vision sees BOTH the demo and the original site during scoring
- Fix suggestions are informed by what the contractor's site actually looks like
- Example: "The original has a dark wood-toned hero, but the demo shows a generic light bathroom. Suggestion: update hero image" vs "Layout integrity is low" (unhelpful)
- The `page_issues` from per-page visual QA now have real comparison context

### Cost Impact

- One additional Playwright screenshot per build (~2-3 seconds, free)
- visual-qa.mjs already processes the `--original` image at no extra cost (same Claude CLI call)
- Net cost increase: ~$0.00 per build

**Complexity: LOW.** ~20 lines across 2 files. No schema changes. Non-blocking (graceful fallback if original site is unreachable).

---

## Sequencing

1. **Deliverable 4** first (learned-patterns.md) — 5 minutes, zero risk
2. **Deliverable 5** second (original screenshot) — 20 minutes, low risk

## Verification

- **Deliverable 4:** `docs/learned-patterns.md` exists. CLAUDE.md references it. `/prime` shows it in context.
- **Deliverable 5:** Run `node orchestrate.mjs --target-id 22 --dry-run` — should NOT create original screenshot (dry-run skips provision). Run `node orchestrate.mjs --audit-only --site-id red-white-reno --url https://red-white-reno.norbotsystems.com --skip-git` — should work (audit-only doesn't have original URL, graceful skip). Full build with `--target-id` should produce `screenshots/original-homepage.png`. Unit tests still pass (223+).

---

**TLDR:** Two small additions to the implemented system. (1) `learned-patterns.md` — a knowledge file that Claude reads each session and appends to when corrections are made, human-gated writes, zero pipeline risk. (2) Pass the original contractor website screenshot to the refinement loop so Claude Vision can compare demo vs original when suggesting fixes — 20 lines of code, $0 extra cost, makes autonomous corrections dramatically smarter.

**Complexity:** LOW for both. Total ~30 minutes implementation.
