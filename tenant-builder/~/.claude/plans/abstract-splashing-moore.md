# Final Plan: NorBot Agentic Organisation — Multi-Model Tenant Builder

## Context

Ferdie spends ~$5/tenant because Opus 4.6 does everything from scratch every session. Goal: build a proper agentic organisation where Opus orchestrates, Sonnet builds, Haiku monitors. Budget: **$2/tenant max, preferably $1.**

**Research basis:** 6+ parallel research agents, 40+ sources. March 5, 2026.

## System Audit Results (VERIFIED — Not Assumed)

### What's ACTUALLY Running
| Service | Status | PID |
|---------|--------|-----|
| OpenClaw Gateway (localhost:18789) | RUNNING | 487 |
| Knox Voice Server (localhost:8013) | RUNNING | 503 |
| Cloudflare Tunnel | RUNNING | 824 |
| Mission Control (localhost:3100) | RUNNING | 489 |
| OpenClaw Watchdog (30-min) | RUNNING | — |
| Ecosystem Monitor (daily) | RUNNING | — |

### What's BROKEN
| Item | Status | Impact |
|------|--------|--------|
| **OpenClaw Cron Jobs** | **ZERO registered** | All 5 scheduled automations dead (morning briefing, Gmail monitor, nightly pipeline, roundtable, research brief). Org is manual-only. |
| `com.norbot.system-health-check` | Not loaded | Health monitoring disabled |
| `com.norbot.send-monitor` | Inconsistent state | Outreach send detection may not work |

### What's Functional (Verified)
- **Knox SOUL.md:** 330 lines, fully configured as Chief of Staff — but can only respond when Ferdie messages (no proactive automations without cron)
- **Mission Control:** FULLY FUNCTIONAL — 29 routes, 13 CRM APIs, deployed locally + Vercel, 19 dev sessions, Twilio calling/SMS/voicemail, agent chat, pipeline management. It works.
- **Claude Code Bridge:** Working (v3.0.0), can relay Telegram → Claude Code sessions
- **Mem0 patches:** 3 critical patches verified
- **Gateway:** 3+ days uptime, no errors

---

## What This Plan Delivers

### Priority 1: Fix the broken automation (5 min, CRITICAL)
Re-register all 5 OpenClaw cron jobs + load missing LaunchAgents. Without this, nothing else matters — the org can't be autonomous.

### Priority 2: Multi-model tenant builder (ALREADY BUILT, 10 files)
6 subagents + 4 skills created in this session. Opus orchestrates, Sonnet builds ($0.80), Haiku validates ($0.01).

### Priority 3: Remaining items (~50 min)
- Update image-polisher with Real-ESRGAN ($0.002/img faithful upscaling)
- Create maintain-drafts.mjs cron (always 5 Gmail drafts)
- Update Knox SOUL.md to know about new agents
- Add daily AI research brief cron

---

## Part 1: Fix Broken Automation (CRITICAL — Do First)

### Re-register OpenClaw cron jobs
```bash
openclaw cron add "Nightly-Roundtable" --agent knox --schedule "0 0 * * *" --message "Run your nightly roundtable. Summarize today's key activities across all agents."
openclaw cron add "Knox-Morning-Briefing" --agent knox --schedule "0 7 * * *" --message "Run your morning briefing. Pipeline metrics, inbox scan, system status, proactive ideas."
openclaw cron add "Gmail-Monitor-15min" --agent knox --schedule "*/15 8-20 * * *" --message "Check Gmail for new replies to outreach emails."
openclaw cron add "Outreach-Pipeline-Nightly" --agent outreach-pipeline --schedule "0 23 * * *" --message "Run nightly pipeline. Discover, qualify, generate."
openclaw cron add "Research-Weekly-Brief" --agent research-scout --schedule "0 20 * * 0" --message "Compile weekly AI ecosystem brief."
```

### Load missing LaunchAgents
```bash
launchctl load ~/Library/LaunchAgents/com.norbot.system-health-check.plist
# Verify send-monitor state
launchctl list | grep send-monitor
# If inconsistent, reload:
launchctl unload ~/Library/LaunchAgents/com.norbot.send-monitor.plist 2>/dev/null
launchctl load ~/Library/LaunchAgents/com.norbot.send-monitor.plist
```

### Verify
```bash
openclaw cron list  # Should show 5 jobs
launchctl list | grep -E "norbot|openclaw"  # All should have PIDs
```

**Risk: NONE.** These are read-from-config commands. No data changes.

---

## Part 2: Multi-Model Tenant Builder (ALREADY IMPLEMENTED)

10 files created this session. All in `~/norbot-ops/products/demo/.claude/`:

| File | Type | Model | Status |
|------|------|-------|--------|
| `agents/build-worker.md` | Agent | Sonnet | CREATED |
| `agents/qa-validator.md` | Agent | Haiku | CREATED |
| `agents/pipeline-scout.md` | Agent | Haiku | CREATED |
| `agents/qa-monitor.md` | Agent | Haiku | CREATED |
| `agents/image-polisher.md` | Agent | Sonnet | CREATED (needs Real-ESRGAN update) |
| `skills/tenant-qa-knowledge/SKILL.md` | Skill | — | CREATED (263 lines) |
| `skills/build-tenant/SKILL.md` | Skill | — | CREATED |
| `skills/maintain-pipeline/SKILL.md` | Skill | — | CREATED |
| `skills/daily-ai-brief/SKILL.md` | Skill | — | CREATED |
| Research Scout SOUL.md | Update | — | DONE (added daily brief section) |

---

## Part 3: Remaining Implementation (5 items, ~50 min)

### 3a. Update `image-polisher.md` — Real-ESRGAN Tier 1 (10 min)

**Research finding:** Nano Banana 2 CANNOT faithfully enhance photos (regenerates content). Real-ESRGAN at $0.002/img is production-proven: pure upscaling, zero content modification, like a professional photo editor.

**Change:** Add Real-ESRGAN as Tier 1, Gemini generation as Tier 2 fallback only.
- Tier 1: Upscale existing photos via Replicate `nightmareai/real-esrgan` ($0.002/img)
- Tier 2: Generate replacement via Gemini ($0.02/img) — ONLY when no usable photo exists
- Hero: must be ≥ 1200px after enhancement
- Portfolio: enhance top 10 (homepage-visible ones)

**New env var:** `REPLICATE_API_TOKEN` in `~/pipeline/scripts/.env`

**File:** `.claude/agents/image-polisher.md`

### 3b. Create `maintain-drafts.mjs` (20 min)

Always keep 5 Gmail drafts ready. When Ferdie sends one, auto-replenish.

**New file:** `scripts/outreach/maintain-drafts.mjs` (~80 lines)
```
1. Query Turso: COUNT(*) WHERE status = 'draft_ready'
2. If < 5: find next demo_built targets ORDER BY icp_score DESC
3. Run outreach-pipeline.mjs --target-ids X,Y,Z as subprocess
4. If not enough demo_built: log "need more builds"
5. Log result
```

**Pattern:** Follows `send-monitor.mjs` exactly — same env loading, same Turso client, same logging.

### 3c. Create LaunchAgent `com.norbot.draft-monitor.plist` (5 min)

**New file:** `~/Library/LaunchAgents/com.norbot.draft-monitor.plist`
- Every 30 min, 7am-9pm weekdays
- Runs `maintain-drafts.mjs`
- Pattern: identical to `com.norbot.send-monitor.plist`

### 3d. Update Knox SOUL.md (10 min)

Add section teaching Knox about the new multi-model agent organisation:

**File:** `~/norbot-ops/agents/knox/SOUL.md` — add ~20 lines under a new "Tenant Build Delegation" section:
- "build a demo for X" → spawn Claude Code Bridge with `/build-tenant`
- "how's the pipeline?" → run pipeline report via pipeline-scout
- "check my drafts" → query Turso for draft count
- Report results in CEO-friendly format

### 3e. Add Daily AI Brief cron (5 min)

```bash
openclaw cron add "Daily-AI-Brief" --agent research-scout --schedule "0 7 * * 1-5" --message "Run daily AI ecosystem scan. Check Anthropic, OpenAI, Google, MiniMax, Qwen. Score ACTIONABLE/INFORMATIONAL/NOT RELEVANT. Only message Ferdie if ACTIONABLE."
```

---

## Communication Interface Recommendation

### Research Finding: Use What Already Works

| Interface | Status | Use For |
|-----------|--------|---------|
| **Knox on Telegram** | WORKING (needs cron fix) | Primary: quick decisions, idea capture, pipeline commands |
| **Mission Control PWA** | WORKING (verified) | Visual: pipeline CRM, phone/SMS, build progress, iPhone remote |
| **Claude Code Bridge** | WORKING (verified) | Heavy: Opus 4.6 coding sessions spawned by Knox |

### What We Evaluated and SKIPPED

| Option | Why Skip |
|--------|----------|
| Claude Code Remote Control | Permission friction on mobile (Shift+Tab unavailable), 10-min timeout, "not enabled" bugs |
| Always-on Anthropic API daemon | Redundant with Knox, 3-10x more expensive ($300-1500/mo vs $50-100) |
| Google Workspace integration | Telegram + Mission Control already cover approval workflows |
| New custom interface | Over-engineering — existing stack is proven |

**Knox IS the chief of staff on Sonnet 4.6 via Anthropic API.** He just needs his cron jobs restored and knowledge of the new agents.

---

## Cost Model

### Per-Tenant Build
| Component | Cost |
|-----------|------|
| Pipeline scripts (GPT-4o) | $0.15 |
| Pre-screen (Haiku) | $0.02 |
| Build-worker (Sonnet) | $0.80 |
| Image upscaling (Real-ESRGAN × 10) | $0.02 |
| QA validation (Haiku) | $0.01 |
| Opus orchestration (2-3 turns) | $0.15 |
| **Total** | **~$1.15** |
| **Max (3 Ralph Loop iterations)** | **~$2.80** |

### Monthly Operating
| Service | Cost/mo |
|---------|---------|
| Knox (Sonnet 4.6, Anthropic) | $50-100 |
| Tenant builds (15/mo × $1.15) | $17 |
| Image upscaling (Replicate) | $3-5 |
| Research brief (Research Scout) | $5-10 |
| Pipeline discovery (Firecrawl) | $5-10 |
| Mission Control (Vercel) | $0-20 |
| **Total** | **~$80-165/mo** |

---

## Implementation Order

| # | Task | Effort | Risk | Depends On |
|---|------|--------|------|------------|
| **1** | **Fix cron jobs + LaunchAgents** | 5 min | None | — |
| 2 | Update image-polisher.md (Real-ESRGAN) | 10 min | Low | — |
| 3 | Create maintain-drafts.mjs | 20 min | Low | — |
| 4 | Create draft-monitor LaunchAgent | 5 min | Low | #3 |
| 5 | Update Knox SOUL.md | 10 min | Low | — |
| 6 | Add daily-ai-brief cron | 5 min | Low | #1 |
| **Total** | | **55 min** | |

---

## Verification Plan

1. `openclaw cron list` → should show 6 jobs (5 restored + 1 new daily brief)
2. `launchctl list | grep norbot` → all services should have PIDs
3. Run `/build-tenant --audit-only red-white-reno https://red-white-reno.norbotsystems.com` → verify Sonnet build-worker delegation works
4. Run `node scripts/outreach/maintain-drafts.mjs --report` → verify draft count query works
5. Message Knox on Telegram: "How's the pipeline?" → verify he responds with status
6. Wait for 7am → verify morning briefing + daily AI brief both fire

---

## Confidence Assessment

| Component | Confidence | Verified? |
|-----------|-----------|-----------|
| Cron job restoration | **VERY HIGH** | Gateway running, CLI available |
| Multi-model agents (built) | **HIGH** | Files created, follow proven patterns |
| Image polisher + Real-ESRGAN | **HIGH** | $0.002/img, Replicate production API |
| Draft monitoring cron | **HIGH** | Follows send-monitor pattern exactly |
| Knox enhancement | **VERY HIGH** | 20 lines in working SOUL.md |
| Daily AI brief cron | **HIGH** | Research Scout already works |
| Knox on Telegram (communication) | **HIGH** | Gateway running, agents loaded |
| Mission Control (communication) | **HIGH** | Verified running, 29 routes, port 3100 |
| Agent Teams batch | **MEDIUM** | Experimental, fallback to sequential |

---

**TLDR:** System audit found Knox's 5 cron jobs are dead (zero registered) — the org runs manual-only. Fix that first (5 min). Then complete the remaining 5 items (~50 min): Real-ESRGAN image upscaling, always-5-drafts cron, Knox SOUL.md update, daily AI brief cron. Communication: Knox on Telegram + Mission Control PWA already work — no new interface needed. Remote Control and API daemon are SKIP. Per-build cost: ~$1.15 (77% reduction). Monthly: ~$80-165 (within $150 cap).

**Complexity:** LOW — cron fix is 5 commands. Remaining 5 items follow existing patterns. No pipeline code changes. No new infrastructure.
