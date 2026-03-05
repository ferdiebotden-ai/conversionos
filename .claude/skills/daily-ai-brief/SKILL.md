# /daily-ai-brief — CEO AI Ecosystem Intelligence

Daily scan of the AI ecosystem for actionable developments that affect NorBot Systems. Written as a CEO brief — concise, decision-focused, with specific recommendations.

## When to Run

- **Daily at 7am** via OpenClaw cron (Research Scout agent) — automated
- **On demand** via `/daily-ai-brief` in Claude Code — manual
- **After major announcements** (model releases, pricing changes) — triggered

## Phase 1 — Scan Ecosystems

Research these 6 ecosystems using web search:

### Anthropic (Priority: HIGH — our primary platform)
- Claude Code updates (agent teams, skills, hooks, new features)
- Model releases (Opus, Sonnet, Haiku — new versions, pricing changes)
- Claude Cowork updates (affects our workflow patterns)
- Max subscription changes (rate limits, features)

### OpenAI (Priority: HIGH — pipeline AI + Codex comparison)
- GPT model releases (5.x series, pricing)
- Codex updates (Mac app, capabilities, pricing)
- API changes (structured outputs, batch API, caching)

### Google (Priority: MEDIUM — image generation)
- Gemini model updates (3.x series, Flash variants)
- Image generation improvements (affects our Nano Banana 2 choice)
- Gemini CLI updates (potential alternative to Claude Code)

### Moonshot / MiniMax (Priority: MEDIUM — OpenClaw fallbacks)
- MiniMax M2.5+ updates (our OpenClaw orchestration model)
- Kimi K2.5+ updates (our fallback model)
- Pricing changes

### Alibaba / Open Source (Priority: LOW — monitoring only)
- Qwen model releases
- Flux / Stable Diffusion updates (image generation alternatives)
- Llama / Mistral updates

### Infrastructure (Priority: MEDIUM)
- OpenClaw releases (affects our agent mesh)
- Vercel updates (affects deployment)
- Supabase updates (affects our database)

## Phase 2 — Score Findings

For each finding, assign a score:

**ACTIONABLE** — Implement within 1 week. Criteria:
- Model swap saves >20% cost OR >10% quality improvement
- New capability directly enables a planned feature
- Pricing change affects our $150/mo budget significantly
- Security vulnerability in a tool we use

**INFORMATIONAL** — Track, no immediate action. Criteria:
- Interesting capability but doesn't directly affect our stack
- Competing product update (good to know, no action)
- Early preview/beta not ready for production

**NOT RELEVANT** — Skip. Criteria:
- Unrelated to our tech stack
- Marketing announcements without substance
- Rumours without confirmation

## Phase 3 — Generate Brief (only if ACTIONABLE findings exist)

If no ACTIONABLE findings today: log to `~/.openclaw/logs/ai-brief.log` and exit silently. Do not message Ferdie with "nothing to report."

If ACTIONABLE findings exist, generate this brief:

```
🔔 AI Ecosystem Alert — {date}

Ferdie,

{1-2 sentence executive summary — what changed and why it matters}

## What Changed
- {Model/tool/feature}: {what's new} ({source})

## Impact on NorBot
- {Specific effect on our pipeline/agents/costs}
- {Current: model X at $Y → New: model Z at $W = {savings/improvement}}

## Recommended Action
- {Concrete next step}
- {Effort estimate: 30 min / 2 hrs / half day}
- {Risk: none / low / medium}

## Current Stack Reference
- Pipeline AI: GPT-4o ($2.50/$10 per MTok)
- Image generation: Gemini 3.1 Flash Image (Nano Banana 2)
- OpenClaw agents: Sonnet 4.6 ($3/$15)
- OpenClaw fallback: MiniMax M2.5 ($0.30/$1.10)
- Claude Code: Opus 4.6 ($5/$25), Sonnet 4.6, Haiku 4.5

Sources: {links}
```

## Phase 4 — Deliver

**Primary:** Telegram message to Ferdie via Knox (short version)
**Secondary:** If the brief is >500 words, also create a Gmail draft for longer reading

**Telegram format (short):**
```
🔔 AI Alert: {headline}

{2-3 sentence summary}

Action: {one-liner recommendation}
Full brief in Gmail drafts.
```

## NorBot Stack Reference

Keep this current when models are swapped:

| Component | Current Model | Cost | Last Updated |
|-----------|--------------|------|-------------|
| Pipeline AI (ICP, scraping, QA) | GPT-4o | $2.50/$10 MTok | Mar 4, 2026 |
| Image generation | gemini-3.1-flash-image-preview | ~$0.02/image | Feb 2026 |
| Visual QA | Claude Sonnet 4.6 (CLI) | $3/$15 MTok | Mar 2026 |
| OpenClaw agents (8) | Claude Sonnet 4.6 | $3/$15 MTok | Feb 2026 |
| OpenClaw fallback | MiniMax M2.5 | $0.30/$1.10 MTok | Feb 2026 |
| OpenClaw heartbeat | Gemini Flash Lite | $0.05/$0.20 MTok | Feb 2026 |
| Mem0 extraction | GPT-4o-mini | $0.15/$0.60 MTok | Feb 2026 |
| Claude Code subagents | Sonnet 4.6 / Haiku 4.5 | $3/$15 / $1/$5 MTok | Mar 2026 |
| Claude Code orchestrator | Opus 4.6 | $5/$25 MTok | Mar 2026 |

## Integration with Existing Systems

- **Ecosystem monitor** (`~/norbot-ops/scripts/ecosystem-monitor.sh`) — checks OpenClaw + Claude Code versions daily at 1am. This brief is ADDITIVE — it covers all AI models, not just version updates.
- **Research Scout** (`~/norbot-ops/agents/research-scout/`) — does weekly briefs. This daily scan is lighter-touch but more frequent.
- **Knox Morning Briefing** (7am cron) — this brief can be appended to the morning briefing if timing aligns.
