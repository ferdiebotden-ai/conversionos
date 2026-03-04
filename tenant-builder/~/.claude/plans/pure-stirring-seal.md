# Assessment: Pipeline AI Platform Strategy

## Context

Claude Code Max subscription nearing its limit. Ferdie has active subscriptions for Claude Max, GPT Business, and Google AI Pro. GPT 5.4 is imminent (OpenAI teased "5.4 sooner than you think" on March 3, 2026). 10 new tenant targets need outreach — any delay has business cost. The goal: find the most reliable, lowest-risk way to run the pipeline without burning Claude Code tokens, while positioning for GPT 5.4 when it drops.

---

## Three Options Evaluated

### Option 1: OpenAI Codex Mac App (Pipeline Manager)

**What it offers:**
- AGENTS.md (≈ CLAUDE.md): 3-tier hierarchical project instructions, auto-loaded
- Skills system: `.agents/skills/SKILL.md` with YAML frontmatter, progressive disclosure, `$` invocation
- Automations: Scheduled agents on a cron, results land in review queue (unique feature)
- `codex exec`: Non-interactive mode with `--output-schema` for structured JSON output
- Parallel threads with built-in worktrees
- GPT 5.3 Codex model (Terminal-Bench #1 at 77.3%)
- GPT 5.4 will be a drop-in upgrade when released

**What it CANNOT do:**
- Cross-session memory persistence (rebuilds every run — our MEMORY.md learnings would need to be baked into AGENTS.md)
- No plan mode (less important)
- SWE-Bench: 73.1% vs Claude's 80.8% — measurably weaker on complex multi-file debugging
- No MCP server integration

**Migration effort for "exclusive pipeline manager":**

| Task | Effort | Risk |
|------|--------|------|
| Port 4 CLAUDE.md → AGENTS.md | 2 hrs | LOW — mostly copy-paste |
| Port 10 skills → `.agents/skills/` | 3 hrs | LOW — format is very similar |
| Port 5 rules → subdirectory overrides | 1 hr | LOW |
| Replace `callClaude()` → `codex exec --output-schema` | 4 hrs | MEDIUM — different output envelope format |
| Port Visual QA (Claude Vision → GPT Vision) | 3 hrs | MEDIUM — rubric prompts need adjustment |
| Export MEMORY.md → AGENTS.md static docs | 2 hrs | LOW — one-time |
| Set up Codex Automations (nightly builds) | 2 hrs | LOW — native feature |
| End-to-end testing (full batch build) | 4 hrs | HIGH — first run always has issues |
| **Total** | **~21 hours** | **MEDIUM-HIGH** |

**Confidence that it works autonomously: 60%** — The feature parity is good on paper, but we'd be first to run a 16-step pipeline with 8 external APIs through Codex Automations. No community evidence of this pattern. First-run failures likely.

### Option 2: OpenClaw (Already Running 24/7 on Mac Mini)

**What it offers:**
- Knox agent has `exec` tool — can run scripts via Telegram
- Claude Code Bridge already maps to tenant-builder workspace
- Cron system infrastructure exists (enabled, maxConcurrentRuns: 2)
- Mem0 auto-memory for cross-agent context
- Telegram UI for Ferdie's approval workflow
- Zero additional cost (already running)

**What it CANNOT do (based on local inspection):**
- Exec tool unproven for Node.js ES modules (only tested with Python scripts)
- 4-hour session timeout would kill long batch builds (2-6 hrs typical)
- Zero cron jobs currently configured (infrastructure exists but empty)
- No `--resume` or checkpoint capability
- API credentials stored in plaintext openclaw.json
- Telegram 4MB message limit for large batch output
- Knox SOUL.md has NO tenant-builder documentation (only outreach pipeline)

**Migration effort:**

| Task | Effort | Risk |
|------|--------|------|
| Test `exec` with Node.js ES modules | 2 hrs | HIGH — may not work at all |
| Configure Knox/Ops Engineer SOUL.md for tenant-builder | 3 hrs | MEDIUM |
| Create cron job for nightly builds | 1 hr | LOW |
| Build Telegram approval workflow | 4 hrs | MEDIUM |
| Credential isolation | 2 hrs | MEDIUM |
| Output management (file storage vs Telegram) | 3 hrs | MEDIUM |
| End-to-end testing | 6 hrs | HIGH |
| **Total** | **~21 hours** | **HIGH** |

**Confidence that it works autonomously: 40%** — The exec tool has never been tested with our Node.js pipeline. Session timeouts are a known risk. Biggest concern: first failure at 3am with no human to intervene.

### Option 3: Replace callClaude() with OpenAI API (Hybrid)

**What it changes:**
- Pipeline AI calls (scoring, branding, QA) → OpenAI API using GPT Business plan ($0 cost)
- `orchestrate.mjs` runs from any terminal (no Claude Code session needed)
- Claude Code reserved for interactive polish/refinement only (the work Ferdie prefers)

**What it preserves:**
- 100% of existing pipeline logic unchanged
- All CLAUDE.md, skills, memory, rules stay as-is
- Same JSON schemas (OpenAI structured outputs are compatible)
- Automatic GPT 5.4 upgrade when released (just change model string)

**Migration effort:**

| Task | Effort | Risk |
|------|--------|------|
| Rewrite `lib/claude-cli.mjs` → OpenAI SDK | 1 hr | LOW — 40-line change |
| Add `await` to 3 callers (now async) | 15 min | LOW — 3 one-line changes |
| Add `openai` npm dependency | 5 min | LOW |
| Add `OPENAI_API_KEY` to env | 5 min | LOW |
| Test: `node icp-score.mjs --target-id 42 --dry-run` | 15 min | LOW |
| Test: `node orchestrate.mjs --batch --limit 1 --dry-run` | 30 min | LOW |
| **Total** | **~2.5 hours** | **LOW** |

**Confidence that it works autonomously: 95%** — Same JSON schemas, proven API, drop-in model replacement. The pipeline is already Node.js — adding an npm dependency is routine. GPT-4o handles classification and structured extraction as well as Sonnet for these simple tasks.

**Optional add-on: LaunchAgent for nightly builds**

| Task | Effort | Risk |
|------|--------|------|
| Create `com.norbot.tenant-builder.plist` | 30 min | LOW |
| Schedule: `node orchestrate.mjs --nightly` at 00:15 daily | — | — |
| Log to `/tmp/tenant-builder.stdout.log` | — | — |
| Add to system-health-check.sh monitoring | 15 min | LOW |

This runs the pipeline on a schedule with zero AI tool involvement. The orchestrate.mjs script handles everything — it's just Node.js on a timer.

---

## GPT 5.4 Positioning

All three options position for GPT 5.4, but differently:

| Option | GPT 5.4 upgrade path |
|--------|---------------------|
| Codex App | Automatic (Codex models update in-place) |
| OpenClaw | N/A (uses Claude/MiniMax) |
| OpenAI API (Option 3) | Change `model: 'gpt-4o'` → `model: 'gpt-5.4'` in one line |

**Option 3 gives the cleanest GPT 5.4 path** — the model string is a single constant in the rewritten `callAI()` function. When GPT 5.4 drops (potentially within days), one line change upgrades the entire pipeline.

---

## Decision Framework

| Priority | Option 1 (Codex App) | Option 2 (OpenClaw) | Option 3 (API swap) |
|----------|---------------------|--------------------|--------------------|
| **Time to working pipeline** | 3-5 days | 3-5 days | **2-3 hours** |
| **Risk of breaking outreach** | MEDIUM-HIGH | HIGH | **LOW** |
| **Autonomous confidence** | 60% | 40% | **95%** |
| **Cost savings** | $0 (GPT Business) | $0 (existing) | **$0 (GPT Business API)** |
| **Claude token savings** | 100% | 80% | **90%+** (only polish uses Claude) |
| **GPT 5.4 readiness** | Automatic | N/A | **1-line change** |
| **Preserves existing workflow** | NO (new paradigm) | PARTIALLY | **YES** |
| **Ferdie can trigger builds** | Via Codex App | Via Telegram | **Via terminal or LaunchAgent** |

---

## Recommendation

**Option 3: Replace `callClaude()` with OpenAI API.** Here's the honest reasoning:

1. **Your 10 targets need outreach NOW.** Options 1 and 2 each need 3-5 days of migration + testing before they're reliable. Option 3 takes 2-3 hours and we can re-score + build today.

2. **Confidence must be "extremely high."** Option 3 is a 95% confidence, 40-line change. Options 1 and 2 are first-of-their-kind integrations with no community precedent for our specific pipeline pattern.

3. **GPT 5.4 is positioned either way.** The OpenAI API approach lets you upgrade to 5.4 with a one-line model string change — same benefit as the Codex App.

4. **Codex App Automations are genuinely interesting** but they're a "next sprint" enhancement, not a prerequisite for today's outreach. Once Option 3 is running and targets are deployed, you can explore Codex Automations at your leisure without time pressure.

5. **OpenClaw** is best suited as a notification/trigger layer (Knox alerts → Ferdie approves → LaunchAgent runs the build), not as the pipeline orchestrator itself. The complexity mismatch is too large.

---

## Implementation Plan

### Phase 1: API Swap (2-3 hours — do now)

1. **Install dependency:** `npm install openai` in tenant-builder/
2. **Rewrite `lib/claude-cli.mjs`** → async `callAI()` using OpenAI SDK with structured outputs
3. **Update 3 callers:** Add `await` in icp-score.mjs, branding-v2.mjs, refinement-loop.mjs
4. **Add env var:** `OPENAI_API_KEY` in `~/pipeline/scripts/.env` (from GPT Business plan)
5. **Test:** Dry-run on single target, then full batch
6. **Verify:** Re-score remaining 2 unbuilt targets, build, create outreach drafts

### Phase 2: Nightly Automation (30 min — do today)

1. Create `com.norbot.tenant-builder.plist` LaunchAgent
2. Schedule `node orchestrate.mjs --nightly` at 00:15 daily
3. Add monitoring to system-health-check.sh

### Phase 3: Codex App Exploration (future sprint, optional)

1. Set up ConversionOS project in Codex App
2. Write AGENTS.md with pipeline context
3. Create Automation for nightly pipeline review
4. Test with non-critical dry-run builds
5. Evaluate whether Codex Automations add value over LaunchAgent

---

## Files to Modify

| File | Change |
|------|--------|
| `tenant-builder/lib/claude-cli.mjs` | Rewrite → OpenAI SDK async client |
| `tenant-builder/icp-score.mjs` | `callClaude()` → `await callAI()` |
| `tenant-builder/scrape/branding-v2.mjs` | `callClaude()` → `await callAI()` |
| `tenant-builder/qa/refinement-loop.mjs` | `callClaude()` → `await callAI()` |
| `tenant-builder/package.json` | Add `openai` dependency |
| `~/pipeline/scripts/.env` | Add `OPENAI_API_KEY` |
| (Phase 2) `~/Library/LaunchAgents/com.norbot.tenant-builder.plist` | New file — nightly schedule |
| (Phase 2) `~/norbot-ops/scripts/system-health-check.sh` | Add tenant-builder check |

---

## Verification

1. `node icp-score.mjs --target-id 42 --dry-run` — confirms OpenAI API scoring works
2. `node orchestrate.mjs --batch --limit 1 --dry-run` — confirms full pipeline with new API
3. `node orchestrate.mjs --target-id 44` — real build of Tyton Homes (top target)
4. Check Gmail drafts folder — confirm outreach created

---

**TLDR:** After thorough research across Codex App, Gemini CLI, OpenClaw, and GPT 5.4, the highest-confidence path is a 40-line API swap (`callClaude()` → OpenAI SDK) that makes the pipeline free via GPT Business plan, saves 90%+ of Claude tokens for polish work, and positions for GPT 5.4 with a one-line upgrade. Codex App Automations are interesting for a future sprint but would delay today's outreach by 3-5 days with 60% confidence. OpenClaw is best as a trigger/notification layer, not the orchestrator.

**Complexity:** LOW for Phase 1 (API swap). Phase 2 (LaunchAgent) is trivial. Phase 3 (Codex) is optional future work.

Sources:
- [Codex App announcement](https://openai.com/index/introducing-the-codex-app/)
- [Codex AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md/)
- [Codex Skills docs](https://developers.openai.com/codex/skills/)
- [Codex non-interactive mode](https://developers.openai.com/codex/noninteractive/)
- [GPT 5.4 leak details](https://www.nxcode.io/resources/news/gpt-5-4-leaked-openai-codex-context-window-vision-release-2026)
- [GPT 5.4 "sooner than you think" tease](https://piunikaweb.com/2026/03/04/openai-gpt-5-4-release-sooner-gpt-5-3-instant-update/)
- [Gemini CLI docs](https://github.com/google-gemini/gemini-cli)
- [Gemini CLI GEMINI.md](https://geminicli.com/docs/cli/gemini-md/)
- [Claude vs Codex vs Gemini comparison](https://www.fluxhire.ai/blog/claude-opus-4-6-vs-gemini-3-1-pro-vs-codex-5-3-comparison-2026)
- [Agentic coding comparison](https://www.deployhq.com/blog/comparing-claude-code-openai-codex-and-google-gemini-cli-which-ai-coding-assistant-is-right-for-your-deployment-workflow)
