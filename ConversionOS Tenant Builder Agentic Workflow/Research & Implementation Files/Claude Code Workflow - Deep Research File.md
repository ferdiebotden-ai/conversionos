# Claude Code production pipeline: a complete implementation reference

**Claude Code's agentic capabilities have matured significantly by February 2026, but key features span a spectrum from production-stable to experimental.** The Skills system, sub-agents, hooks, and headless CLI are all stable for production use. Agent Teams remain behind an experimental flag with known reliability issues. For a solo AI-native founder running a white-label SaaS onboarding pipeline on a Mac Mini with Claude Code Max, the practical architecture combines stable sub-agents for parallel nightly work, hooks for Telegram notifications, ElevenLabs' single-agent-with-overrides pattern for page-contextual voice AI, and Playwright + Claude Vision for automated QA — all orchestrated through the headless CLI.

This report covers all nine requested areas with exact configuration schemas, known bugs, workarounds, and production-ready code patterns.

---

## 1. The Skills system: frontmatter, progressive disclosure, and known bugs

### Complete SKILL.md frontmatter reference

Skills live as directories under `.claude/skills/` (project-level) or `~/.claude/skills/` (user-level), each containing a `SKILL.md` file with YAML frontmatter. The full field reference:

| Field | Type | Default | Behavior |
|-------|------|---------|----------|
| `name` | string (≤64 chars) | directory name | Slash command name. Must match regex `^[a-z0-9]+(-[a-z0-9]+)*$`. Must match containing directory name. |
| `description` | string (≤1024 chars) | none | **Primary signal for auto-invocation.** Loaded into system prompt at startup. Write in third person. Single-line only — YAML multiline indicators (`>-`, `|`) are not parsed correctly. |
| `disable-model-invocation` | boolean | `false` | When `true`, only user can invoke via `/name`. Removes description from Claude's context entirely. |
| `user-invocable` | boolean | `true` | When `false`, hidden from slash-command menu. Claude can still invoke unless `disable-model-invocation` is also true. |
| `allowed-tools` | comma-separated string | all tools | Restricts and pre-approves tools during skill execution. Example: `Read, Grep, Glob, Bash`. |
| `context` | string | inline | Set to `fork` to run in an isolated subagent context with independent conversation history. |
| `agent` | string | `general-purpose` | Specifies subagent type when `context: fork` is set. Options: `Explore`, `Plan`, `general-purpose`, or any custom agent name. |
| `model` | string | `inherit` | Override model. Example: `claude-opus-4-20250514`. |
| `hooks` | YAML object | none | Lifecycle hooks scoped to skill execution. Same format as settings-based hooks. |

### How progressive disclosure actually works

Progressive disclosure operates in **three tiers**. At session startup, Claude loads only the `name` and `description` from all installed skills into the system prompt as an `<available_skills>` XML block — roughly **50–100 tokens per skill**. This is the only thing loaded initially. The skill character budget scales to approximately **2% of context window size**, with a 16,000-character fallback.

When Claude determines a user request matches a skill's description through semantic matching, it reads the full SKILL.md body into context via the Read tool. The body is **only loaded after triggering**. This means "When to Use This Skill" sections in the body are useless for discovery — all trigger information must live in the description field. Reference files (in `references/`, `scripts/`, `assets/` subdirectories) load only when the specific task requires them, completing the third tier.

**The 500-line body recommendation** is a soft performance guideline, not a hard limit. Skills exceeding this compete with conversation history for context space. Community tools enforce this as a warning. If content exceeds 500 lines, split into reference files for progressive loading.

### $ARGUMENTS and shell preprocessing

When a user invokes `/skill-name something here`, `$ARGUMENTS` in the skill body is replaced with the argument text. Positional arguments `$0`, `$1`, `$2` access individual space-separated values. If the body does not include `$ARGUMENTS`, Claude Code auto-appends it. Skills also support shell preprocessing with `!` backtick syntax — for example `!`gh pr diff`` executes before sending content to Claude, injecting command output directly.

### Skills vs commands: the unified model

As of late 2025, commands and skills are functionally unified. A file at `.claude/commands/review.md` and a skill at `.claude/skills/review/SKILL.md` both create `/review`. The key remaining difference: commands are single `.md` files supporting only `description`, `allowed-tools`, and `argument-hint` in frontmatter. Skills are directories supporting the full frontmatter schema, bundled scripts, reference files, and `context: fork`. **Skills are the recommended approach** for new work.

### Known bugs and workarounds as of February 2026

**Bug 1 — `context: fork` ignored by Skill tool** (GitHub #17283, filed January 10, 2026, status: open). When a skill is invoked via the Skill tool, both `context: fork` and `agent:` fields are silently ignored. The skill runs in the main conversation context instead of spawning an isolated subagent. **Workaround:** restructure as a custom sub-agent in `.claude/agents/` and use the `skills` field to inject content.

**Bug 2 — Plugin skills with `name:` field lose namespace prefix** (GitHub #22063, filed January 31, 2026, status: open). Skills from plugins with a `name` field register without the `{plugin}:` prefix. **Workaround:** remove `name` from frontmatter so the directory name is used with proper prefix.

**Bug 3 — Plugin skills with `name:` not appearing as slash commands** (resolved ~February 20, 2026). This was fixed in Claude Code v2.1.23+. Include `name:` in all SKILL.md files where the value matches the directory name.

**Bug 4 — Skill-scoped hooks in plugins not triggering** (GitHub #17688). Hooks defined in SKILL.md frontmatter within plugins load but do not fire. **Status: open.**

### Writing descriptions for reliable auto-invocation

Community reports indicate auto-invocation success rates of roughly **20% with basic descriptions**. To maximize reliability: write in third person ("Processes Excel files" not "I can help with Excel"); include both what the skill does and specific trigger contexts; front-load keywords and file types; keep under 200 characters for optimal matching; and avoid aggressive language like "CRITICAL: You MUST use" which causes over-triggering on Opus 4.5+. A UserPromptSubmit hook pattern (forced-eval) can reportedly boost success to **~84%** based on community testing.

---

## 2. Sub-agents: configuration, spawning, and memory

### Frontmatter fields for .claude/agents/ definitions

Sub-agents are defined as Markdown files with YAML frontmatter in `.claude/agents/` (project-level) or `~/.claude/agents/` (user-level). The complete schema:

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `name` | string | required | Lowercase with hyphens |
| `description` | string | required | Natural language; phrases like "use PROACTIVELY" encourage auto-delegation |
| `model` | `sonnet` / `opus` / `haiku` / `inherit` | `sonnet` | Underlying models: Opus 4.6, Sonnet 4.5, Haiku 4.5 |
| `tools` | comma-separated list | inherits all | Allowlist; pre-approves listed tools |
| `disallowedTools` | comma-separated list | none | Denylist; can combine with `tools` |
| `permissionMode` | `default` / `acceptEdits` / `bypassPermissions` / `plan` | inherits | `acceptEdits` auto-approves Write/Edit; `bypassPermissions` skips all checks |
| `maxTurns` | integer | unbounded | Hard cap on agent loop iterations |
| `skills` | comma-separated list | none | Skill names auto-loaded into sub-agent context at startup |
| `memory` | `user` / `project` | none | Persistent markdown store (v2.1.33, Feb 2026) |
| `hooks` | YAML object | none | Lifecycle hooks scoped to sub-agent |
| `mcpServers` | object | inherits | MCP server configurations |
| `color` | string | auto | UI color for terminal identification (Red, Blue, Green, Yellow, Purple, Orange, Pink, Cyan) |

### The Task tool: how sub-agents spawn

The orchestrator invokes sub-agents through the **Task tool** with this schema: `{ description: string, prompt: string, subagent_type: string }`. The Task tool returns `{ result: string, usage: dict, total_cost_usd: float, duration_ms: int }`. Only the summary result enters the main conversation context — the sub-agent's full exploration stays in its own context window. Sub-agents **cannot spawn other sub-agents** (prevents infinite nesting). Claude can run **up to 10 sub-agents in parallel**.

### CLAUDE.md inheritance — a critical architectural detail

**Sub-agents do NOT receive the full Claude Code system prompt or CLAUDE.md content by default.** Per official documentation, sub-agents receive only their own custom system prompt plus basic environment details like working directory. To provide project context, you must either include relevant CLAUDE.md content directly in the sub-agent's markdown body, use the `skills` field to load specific knowledge, or explicitly instruct the sub-agent to read CLAUDE.md files. This is a sharp contrast with **Agent Teams teammates**, which do auto-load CLAUDE.md from their working directory.

### Persistent memory: the new `memory` field

Introduced in **v2.1.33 (February 2026)**, the `memory` field gives each sub-agent a persistent markdown knowledge store. Setting `memory: user` stores to `~/.claude/agent-memory/`; `memory: project` stores to `.claude/agent-memory/`. On startup, the first 200 lines of the agent's `MEMORY.md` are injected into its system prompt. The agent can read and update its memory during execution via auto-enabled Read/Write/Edit tools. Memory persists across sessions — the agent accumulates knowledge over time.

### Preventing file conflicts in parallel execution

There is **no built-in file locking** in Claude Code. If two sub-agents write to the same file, last write wins. Production strategies: scope each sub-agent to distinct files or directories using `tools` allowlists to enforce read-only where appropriate; add explicit file ownership instructions in sub-agent prompts; for shared files like a `proxy.ts` router, use a template/codegen approach where each agent writes a partial config to its own file and a final merge step assembles the result; use git worktrees for full isolation.

---

## 3. Agent Teams: experimental peer-to-peer collaboration

### Current status and how to enable

Agent Teams shipped as a **research preview** alongside Opus 4.6 on **February 5, 2026**, and remain behind the experimental flag `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Enable via `~/.claude/settings.json` or environment variable. Requires Claude Code **v2.1.32+**. The flag unlocks five coordination tools: `TeamCreate`, `TaskCreate`, `TaskUpdate`, `TaskList`, and `SendMessage`.

### Architecture: peers vs hierarchy

The fundamental difference from sub-agents is communication topology. Sub-agents report results back to the main agent only — they are **contractors sent on separate errands**. Agent Teams teammates can **message each other directly** (peer-to-peer) via `SendMessage` and coordinate through a **shared task list**. The team lead creates the team and populates tasks; teammates claim tasks, update statuses, and message peers without routing through the lead.

Roles are not configured in YAML — they emerge naturally from the creation prompt. The session where you issue the team creation command becomes the lead. Each teammate is a separate Claude Code instance with its own context window. You describe team structure in natural language: "Create an agent team with one teammate on UX, one on architecture, one playing devil's advocate."

### Known reliability issues

- **No session resumption** with in-process teammates — `/resume` and `/rewind` do not restore active teammates
- **Task status can lag** — teammates sometimes fail to mark tasks as completed, blocking dependent tasks
- **Shutdown is slow** — teammates finish their current tool call before stopping
- **One team per session** — clean up before starting a new team
- **No nested teams** — teammates cannot spawn their own teams
- **Permission inheritance** — `--dangerously-skip-permissions` propagates to all teammates, and delegate mode restrictions also propagate, which can cause teammates to stall on permission prompts with nobody to approve
- **Split-pane mode** requires tmux or iTerm2 (not VS Code terminal, Windows Terminal, or Ghostty)

### Throughput on Mac Mini Max subscription

Agent Teams consume approximately **7× more tokens** than standard sessions since each teammate is a separate Claude instance. On Claude Max 20× (~$200/month), usage is measured in a **5-hour rolling window**. Running 3–4 parallel agents multiplies consumption 3–4× minimum. Practical guidance: start with 2–3 teammates, use Sonnet for most teammates (balances capability and cost), keep tasks small and self-contained, and clean up teams when work is done — active teammates burn tokens even when idle. Claude Code is memory-intensive; running 10+ agents strains system resources considerably.

### Decision framework: Teams vs sub-agents

**Use sub-agents** when tasks are focused and independent, only the result matters, no inter-agent communication is needed, and you want lower token cost. **Use Agent Teams** when teammates need to share findings, challenge each other's work, discuss architecture, or when tasks have dependencies where one agent's output feeds another. For your nightly pipeline with isolated parallel work, **sub-agents are the right choice**. Reserve Agent Teams for interactive development sessions where real-time collaboration adds value.

---

## 4. CLAUDE.md: production configuration for multi-tenant SaaS

### The hierarchy and how it combines

CLAUDE.md files layer additively from multiple locations. Enterprise policy takes highest priority, followed by project memory (`./CLAUDE.md`), project rules (`.claude/rules/*.md`), and user memory (`~/.claude/CLAUDE.md`). Child directory CLAUDE.md files load on-demand when Claude works with files in those directories. A `CLAUDE.local.md` in the project root is for personal overrides (gitignore it).

### Size and content recommendations

Keep root CLAUDE.md **under 300 lines** — shorter is better. Frontier LLMs can follow roughly **150–200 instructions** with reasonable consistency. Claude Code's system prompt already contains ~50 instructions, leaving ~100–150 for your CLAUDE.md, rules, and skills combined. As instruction count increases, **all instructions degrade uniformly**, not just newer ones.

**Include:** build/test/lint commands, code style conventions Claude gets wrong, workflow rules, project structure overview, key architectural decisions. **Exclude:** generic coding advice Claude already knows, exhaustive API references (use skills), task-specific procedures (use skills), anything Claude can infer from the codebase.

### Recommended structure for your SaaS project

```markdown
# Project Overview
Multi-tenant white-label SaaS for Ontario renovation contractors.

# Architecture
- apps/web: Next.js 14 frontend (per-tenant theming)
- apps/api: Supabase Edge Functions
- packages/pipeline: Nightly onboarding pipeline (Node.js)
- packages/shared: Types, utils, Supabase client

# Commands
- Build: `pnpm build`
- Test: `pnpm test -- path/to/file`
- Type check: `pnpm typecheck`

# Conventions
- All DB access through Supabase client in packages/shared
- Tenant isolation via RLS policies on tenant_id
- No direct SQL — use typed Supabase queries

# Workflow
- Run tests before committing
- Use conventional commits

# Context
- Pipeline architecture: @docs/pipeline.md
- Tenant model: @docs/tenant-schema.md
```

Use `@path` syntax to reference detailed docs without embedding them. Use skills for domain knowledge that loads on demand. Use `.claude/rules/*.md` for path-scoped modular rules.

---

## 5. Hooks: lifecycle events, Telegram notifications, and sub-agent interaction

### Configuration and the 14 lifecycle events

Hooks are defined in JSON settings files at user (`~/.claude/settings.json`), project (`.claude/settings.json`), or local (`.claude/settings.local.json`) level. Claude Code supports **14 lifecycle events** as of February 2026, with three handler types (command, prompt, agent):

**PreToolUse**, **PostToolUse**, **PostToolUseFailure**, **PermissionRequest** (all accept tool name regex matchers), **UserPromptSubmit**, **Stop**, **SubagentStop**, **SubagentStart**, **SessionStart** (matchers: startup/resume/clear/compact), **SessionEnd**, **PreCompact**, **Notification**, **TaskCompleted**, **ConfigChange**.

The configuration format:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "./scripts/notify.sh",
        "timeout": 60
      }]
    }]
  }
}
```

Hook scripts receive JSON via stdin containing `session_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`, plus event-specific fields. PostToolUse adds `tool_name`, `tool_input`, `tool_response`, and `tool_use_id`. Exit code **0** means success; exit code **2** blocks the action; other non-zero codes are non-blocking errors.

### Telegram notifications after pipeline stages

Set up a Telegram bot via @BotFather, export `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, then configure hooks for `Stop` and `SubagentStop`:

```json
{
  "hooks": {
    "Stop": [{ "hooks": [{ "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/telegram_notify.sh" }] }],
    "SubagentStop": [{ "hooks": [{ "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/telegram_notify.sh" }] }]
  }
}
```

The notification script reads JSON from stdin and calls `curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage"` with the event name and session ID. For per-stage granularity in your pipeline, use **PostToolUse with matcher "Bash"** and filter on specific command patterns in your script.

### How hooks interact with sub-agents

**Parent hooks fire for sub-agent tool calls** — PreToolUse/PostToolUse hooks configured globally fire for tools used by sub-agents too, sharing the same `session_id`. **SubagentStop** fires when a sub-agent completes; **SubagentStart** fires when one spawns. However, hook feedback routes back to the **same agent that ran the tool** (the sub-agent), not the parent. There is no first-class mechanism for returning context from a sub-agent to its parent via hooks. Workaround: write to temporary state files.

**Critical note:** direct edits to hooks in settings files do not take effect in a running session. You must restart Claude Code. This is a security measure.

---

## 6. ElevenLabs Conversational AI: single agent, per-page behavior

### API endpoints and core schema

**Create agent:** `POST https://api.elevenlabs.io/v1/convai/agents/create` — returns `{ "agent_id": "..." }`. **Update:** `PATCH https://api.elevenlabs.io/v1/convai/agents/:agent_id`. **Get:** `GET https://api.elevenlabs.io/v1/convai/agents/:agent_id`. Authentication uses the `xi-api-key` header.

The system prompt is configured at `conversation_config.agent.prompt.prompt`. Knowledge bases are created separately via `POST /v1/convai/knowledge-base/file`, `/url`, or `/text`, then referenced in agent config via the `knowledge_base` array under the prompt object.

### Session overrides: one agent, multiple personalities

**ElevenLabs fully supports per-session overrides**, making a single-agent architecture viable for your multi-page use case. Three mechanisms:

**Overrides** completely replace agent defaults at conversation start. You can override system prompt, first message, voice, language, and LLM model. Each overridable field must be **explicitly enabled** in the agent's Security tab in the dashboard — an error is thrown for disabled fields.

```javascript
const conversation = useConversation({
  overrides: {
    agent: {
      prompt: { prompt: PAGE_CONFIGS[currentPage].systemPrompt },
      firstMessage: PAGE_CONFIGS[currentPage].greeting,
    },
  },
});
await conversation.startSession({ agentId: process.env.NEXT_PUBLIC_AGENT_ID });
```

**Dynamic variables** use `{{variable_name}}` template syntax in prompts, filled at runtime via `dynamicVariables` in `startSession()`. This lets you manage prompt templates in the dashboard while injecting page context from code. System variables like `system__time_utc` and `system__call_duration_secs` are available automatically.

**`sendContextualUpdate()`** injects context mid-conversation without triggering a response — ideal for when a user navigates pages during an active call.

### Recommended architecture for your three-page pattern

Create one agent with a base configuration. Enable overrides for system prompt and first message. Define page configs:

- **Homepage:** receptionist persona, general company greeting, routes to appropriate resources
- **Estimates page:** quote specialist persona, asks about project scope, roofing type, square footage
- **Visualizer page:** design consultant persona, helps explore materials, colors, styles

Use **signed URLs** for production security (server generates `GET /v1/convai/conversation/get-signed-url?agent_id=...`, client uses the signed WebSocket URL). The `@elevenlabs/react` package **v0.14.0** (published ~February 7, 2026) provides the `useConversation` hook with `startSession()`, `endSession()`, `sendContextualUpdate()`, and `sendUserMessage()`. Note that `@11labs/react` is deprecated — use `@elevenlabs/react`.

### Pricing and rate limits

Conversational AI is billed **per minute**, starting from approximately **$0.10/minute**. The Business plan includes 13,750 minutes at ~$0.08/minute. Concurrency limits range from 4–30 simultaneous sessions depending on plan. LLM costs are currently absorbed by ElevenLabs. Configure `call_limits` in platform settings for `agent_concurrency_limit` and `daily_limit`.

---

## 7. Playwright + Claude Vision: automated visual QA

### The full integration pattern

The pipeline follows four steps: Playwright capture, Supabase upload, Claude Vision analysis, and report storage. For screenshots, use `page.screenshot({ fullPage: true })` with `waitUntil: 'networkidle'` and a 2-second extra wait for animations. Pre-resize images to **≤1200px wide** before sending to Vision — images exceeding 1568px on the long edge are auto-downscaled anyway, adding latency without quality benefit.

Send screenshots to Claude Vision using the **base64 method** with `type: 'image'` content blocks. The critical advancement is **Structured Outputs** (GA for Sonnet 4.5, Opus 4.5, Haiku 4.5): pass `output_config.format` with a JSON schema, and Claude returns **guaranteed-valid JSON** via constrained decoding — no parsing fallbacks needed.

```javascript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 2048,
  messages: [{ role: 'user', content: [
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
    { type: 'text', text: 'Analyze this contractor website screenshot...' }
  ]}],
  output_config: {
    format: {
      type: 'json_schema',
      schema: {
        type: 'object',
        properties: {
          logo_quality: { type: 'object', properties: {
            score: { type: 'number' }, visible: { type: 'boolean' },
            issues: { type: 'array', items: { type: 'string' } }
          }, required: ['score', 'visible', 'issues'], additionalProperties: false },
          brand_colours: { type: 'object', properties: {
            score: { type: 'number' }, consistent: { type: 'boolean' },
            primary_colour_detected: { type: 'string' }
          }, required: ['score', 'consistent', 'primary_colour_detected'], additionalProperties: false },
          hero_image: { type: 'object', properties: {
            score: { type: 'number' }, present: { type: 'boolean' },
            relevant_to_renovation: { type: 'boolean' }
          }, required: ['score', 'present', 'relevant_to_renovation'], additionalProperties: false },
          placeholder_text: { type: 'object', properties: {
            found: { type: 'boolean' },
            instances: { type: 'array', items: { type: 'string' } }
          }, required: ['found', 'instances'], additionalProperties: false },
          overall_quality: { type: 'object', properties: {
            score: { type: 'number' }, grade: { type: 'string' }, summary: { type: 'string' }
          }, required: ['score', 'grade', 'summary'], additionalProperties: false }
        },
        required: ['logo_quality', 'brand_colours', 'hero_image', 'placeholder_text', 'overall_quality'],
        additionalProperties: false
      }
    }
  }
});
const report = JSON.parse(response.content[0].text);
```

### Cost at scale

Image tokens follow the formula **tokens = (width × height) / 750**. A 1920×1080 full-page viewport screenshot costs ~2,765 input tokens. At Sonnet 4.5 pricing ($3 input / $15 output per million tokens), each site assessment costs roughly **$0.022** including the ~800-token output. That is approximately **$22/month for 1,000 contractor sites**. The **Batch API** offers 50% off for non-time-sensitive workloads, cutting this to ~$11/month.

### Supabase Storage upload

Use the `@supabase/supabase-js` client with a service role key for server-side uploads. Call `supabase.storage.from('bucket').upload(path, buffer, { contentType: 'image/png', upsert: true })`. Use **unique timestamped paths** rather than overwriting at the same path — CDN propagation causes stale content on overwrites. Standard uploads handle files up to 5GB; use TUS resumable uploads for files exceeding 6MB.

---

## 8. Logo extraction: a four-level fallback chain

### When standard scraping fails

Contractor websites frequently use logos that defeat simple scraping. The production fallback chain:

**Level 1 — DOM extraction via Playwright.** After rendering with `waitUntil: 'networkidle'` (which handles React/Vue/Next.js hydration), query selectors in priority order: `header img[src*="logo"]`, `nav img[src*="logo"]`, `[class*="logo"] img`, `a[href="/"] > img`, `.navbar-brand img`. For inline SVGs, extract `outerHTML` from `header svg, [class*="logo"] svg`. For CSS background images, evaluate `getComputedStyle(el).backgroundImage` across header and nav elements, then extract the URL from the `url("...")` pattern.

**Level 2 — Canvas and data URI handling.** For canvas-rendered logos (rare but exists on modern contractor sites), use `canvas.toDataURL('image/png')` or take an element screenshot via Playwright's `locator.screenshot()`. For data URI SVGs in CSS backgrounds (`data:image/svg+xml;base64,...`), decode the base64 content directly.

**Level 3 — Claude Vision identification.** Screenshot the header region using `page.locator('header').screenshot()` or clip to `{ x: 0, y: 0, width: 1920, height: 250 }`. Send to Vision with a structured output schema requesting `logo_found`, `bounding_box` (as percentage coordinates), `company_name`, and `logo_type`. Use Sharp to crop the identified region. **Important caveat:** Claude's spatial reasoning produces approximate bounding boxes — use this for identification, not pixel-perfect extraction.

**Level 4 — Manual flag.** Insert a record into a `logo_extraction_queue` table with status `manual_review_needed` for human intervention.

### Validation before storage

Use Sharp to validate: minimum dimensions of **200×200px** (reject below 50×50), accepted formats (PNG, SVG, WebP, JPEG), maximum file size **5MB**, and aspect ratio not exceeding 8:1. Standardize all logos to **512×512px** PNG (fit inside, no enlargement) with a WebP variant for web serving. Preserve transparency with `background: { r: 0, g: 0, b: 0, alpha: 0 }`.

---

## 9. Parallel nightly pipeline on Mac Mini

### Orchestrating 4 concurrent Claude Code processes

Two production-ready approaches. **Using the CLI headless mode:**

```bash
claude -p "Update auth module for contractor-123" \
  --output-format json --allowedTools "Read,Edit,Bash" \
  --permission-mode acceptEdits --max-turns 50 \
  > results/auth.json 2>&1 &
PID1=$!
```

Spawn 4 such processes, each writing to its own output file, then `wait` for all PIDs. The JSON output includes `session_id`, `total_cost_usd`, `duration_ms`, `num_turns`, and `is_error` for structured monitoring.

**Using the Claude Agent SDK (Python)**, use `asyncio.gather()` with `asyncio.Semaphore(4)` to cap concurrency. Each query accepts `permission_mode`, `max_turns`, `max_budget_usd`, and `allowed_tools` for resource control.

### LaunchAgent scheduling

Place a plist at `~/Library/LaunchAgents/com.yourorg.nightly-pipeline.plist` with `StartCalendarInterval` specifying Hour and Minute. Unlike cron, **launchd runs missed jobs when the Mac wakes from sleep**. Include `EnvironmentVariables` for PATH and API keys. Load with `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/...`. Set `StandardOutPath` and `StandardErrorPath` for log capture.

### Preventing file conflicts with proxy.ts and shared files

For a shared router file like `proxy.ts` that multiple agents might update, **do not have agents edit it directly**. Instead, use a codegen pattern: each agent writes a partial config JSON to its own file (`routes/contractor-123.json`), and a final merge script after all agents complete assembles the combined router. For other shared resources, use Python's `fcntl.flock()` (macOS-native) or `mkdir`-based atomic locking. Note that `flock` is **not built-in on macOS** — install via `brew install flock` if needed.

The recommended community pattern uses **git worktrees** for full isolation: each agent works in its own worktree of the same repo, and results merge at the end. This eliminates all file conflict concerns.

### Job queue and monitoring

For your scale, a **SQLite job table** tracking job status, start time, retry count, and results works well. Parse JSON output with `jq` for cost and token tracking. Use PostToolUse hooks logging to a SQLite database with the `claude-code-hooks-multi-agent-observability` pattern (by disler) for real-time monitoring via a Vue.js web dashboard. Implement retries with exponential backoff: check both the CLI exit code and the `is_error` field in JSON output, use `timeout 600` to prevent runaway processes, and sleep 30 seconds between retry attempts.

### Resource budget on Max subscription

On **Claude Max 20×** (~$200/month), usage is measured in a 5-hour rolling window. Running 4 parallel agents consumes quota 4× faster. You get approximately **240–480 hours of Sonnet time per month**. Route sub-agent exploration to Haiku for cheaper operations. Use `/compact` before long runs. Each Claude Code CLI process is lightweight locally (API calls, not local compute) — a Mac Mini M4 handles 4+ concurrent processes without resource strain. The bottleneck is **API rate limits**, not local hardware.

---

## Stability summary and production readiness

| Capability | Status | Confidence |
|-----------|--------|------------|
| Skills system (full frontmatter) | **Production-stable** | High |
| `context: fork` in skills | **Buggy** — ignored by Skill tool (#17283) | Use agents/ workaround |
| Custom sub-agents (`.claude/agents/`) | **Production-stable** (since v1.0.52) | High |
| Sub-agent persistent memory | **Stable** (v2.1.33, Feb 2026) | Medium-high |
| Agent Teams | **Experimental** (behind flag) | Low for production |
| Hooks (all 14 events) | **Production-stable** | High |
| Headless CLI (`-p`, JSON output) | **Production-stable** | High |
| ElevenLabs session overrides | **Production-stable** | High |
| ElevenLabs `@elevenlabs/react` v0.14.0 | **Production-stable** | High |
| Playwright + Vision structured outputs | **Production-stable** | High |

The strongest production architecture for your pipeline combines **stable sub-agents** (not Agent Teams) for parallel nightly work, **hooks for Telegram notifications**, **headless CLI for scripted execution**, and **ElevenLabs single-agent-with-overrides** for voice AI. Reserve Agent Teams for interactive exploration sessions, not unattended pipelines. The `context: fork` bug means you should define forked execution contexts as sub-agents in `.claude/agents/` rather than relying on skill frontmatter. And budget your Max subscription carefully — 4 parallel Sonnet agents will consume your 5-hour rolling window approximately 4× faster than interactive use.