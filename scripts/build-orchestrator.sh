#!/usr/bin/env bash
# ConversionOS Build Orchestrator
# Chains claude -p sessions to implement the onboarding pipeline.
# Each work unit gets a fresh 200K context window.
#
# Usage:
#   ./scripts/build-orchestrator.sh                     # Full run
#   ./scripts/build-orchestrator.sh --max-sessions 2    # Test with 2 units
#   ./scripts/build-orchestrator.sh --status             # Check progress
#   ./scripts/build-orchestrator.sh --resume             # Resume after fixing blocker

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
export PROJECT_DIR

# Source helpers
source "$SCRIPT_DIR/lib/build-state.sh"
source "$SCRIPT_DIR/lib/health-check.sh"

STATE_FILE="$SCRIPT_DIR/build-state.json"
export STATE_FILE

MEGA_PROMPT="$PROJECT_DIR/.claude/commands/build-session.md"
MAX_BUDGET_PER_SESSION=15
MAX_SESSIONS_OVERRIDE=""

# ─── Parse arguments ────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --status)
      print_status
      exit 0
      ;;
    --resume)
      echo "Resuming from current state..."
      shift
      ;;
    --max-sessions)
      MAX_SESSIONS_OVERRIDE="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [--status] [--resume] [--max-sessions N]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# ─── Pre-flight checks ─────────────────────────────────────────────
cd "$PROJECT_DIR"

if ! command -v claude &>/dev/null; then
  echo "ERROR: claude CLI not found. Install Claude Code first."
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "ERROR: jq not found. Install with: brew install jq"
  exit 1
fi

if [ ! -f "$STATE_FILE" ]; then
  echo "ERROR: State file not found: $STATE_FILE"
  exit 1
fi

if [ ! -f "$MEGA_PROMPT" ]; then
  echo "ERROR: Mega-prompt not found: $MEGA_PROMPT"
  exit 1
fi

MAX_SESSIONS="${MAX_SESSIONS_OVERRIDE:-$(get_max_sessions)}"
MAX_RETRIES="$(get_max_retries)"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ConversionOS Build Orchestrator         ║"
echo "╚══════════════════════════════════════════╝"
echo ""
print_status
echo ""

# ─── Main loop ──────────────────────────────────────────────────────
while true; do
  # Check session limit
  SESSIONS="$(get_sessions_run)"
  if [ "$SESSIONS" -ge "$MAX_SESSIONS" ]; then
    echo ""
    echo "MAX SESSIONS REACHED ($SESSIONS/$MAX_SESSIONS). Stopping."
    print_status
    exit 0
  fi

  # Find next unit
  UNIT_ID="$(get_next_unit)"
  if [ -z "$UNIT_ID" ]; then
    echo ""
    echo "ALL UNITS COMPLETE (or failed). No more pending work."
    print_status
    exit 0
  fi

  UNIT_NAME="$(get_unit_name "$UNIT_ID")"
  UNIT_PROMPT_FILE="$(get_unit_prompt "$UNIT_ID")"
  UNIT_RETRIES="$(get_unit_retries "$UNIT_ID")"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Starting $UNIT_ID: $UNIT_NAME"
  echo "  Session $((SESSIONS + 1))/$MAX_SESSIONS | Attempt $((UNIT_RETRIES + 1))/$((MAX_RETRIES + 1))"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Verify prompt file exists
  if [ ! -f "$UNIT_PROMPT_FILE" ]; then
    echo "ERROR: Prompt file not found: $UNIT_PROMPT_FILE"
    set_unit_status "$UNIT_ID" "failed"
    continue
  fi

  # ─── Pre-unit git tag ─────────────────────────────────────────
  TAG_NAME="pre-${UNIT_ID}"
  echo "  Creating git tag: $TAG_NAME"
  git tag -f "$TAG_NAME" 2>/dev/null || true

  # ─── Pre-build health check ──────────────────────────────────
  echo ""
  PRE_LOG=""
  PRE_OUTPUT=""
  PRE_EXIT=0
  PRE_OUTPUT="$(run_health_check "pre-${UNIT_ID}" 2>&1)" || PRE_EXIT=$?
  echo "$PRE_OUTPUT"
  if [ "$PRE_EXIT" -eq 0 ]; then
    PRE_LOG="$(echo "$PRE_OUTPUT" | tail -1)"
  else
    echo "  WARNING: Pre-build already failing. Proceeding anyway."
  fi

  # ─── Mark in-progress ────────────────────────────────────────
  set_unit_status "$UNIT_ID" "in_progress"
  increment_sessions

  # ─── Build the prompt ────────────────────────────────────────
  # Concatenate: mega-prompt protocol + unit-specific instructions
  FULL_PROMPT="$(cat "$MEGA_PROMPT")

---

## Unit-Specific Instructions

$(cat "$UNIT_PROMPT_FILE")"

  # ─── Run Claude session ──────────────────────────────────────
  SESSION_LOG="$SCRIPT_DIR/logs/session-${UNIT_ID}-$(date +%Y%m%d-%H%M%S).log"
  mkdir -p "$SCRIPT_DIR/logs"

  echo ""
  echo "  Launching claude -p session..."
  echo "  Budget: \$${MAX_BUDGET_PER_SESSION}"
  echo "  Log: $SESSION_LOG"
  echo ""

  CLAUDE_EXIT=0
  env -u CLAUDECODE claude -p "$FULL_PROMPT" \
    --dangerously-skip-permissions \
    --max-budget-usd "$MAX_BUDGET_PER_SESSION" \
    > "$SESSION_LOG" 2>&1 || CLAUDE_EXIT=$?

  echo ""
  echo "  Claude session exited with code: $CLAUDE_EXIT"

  # ─── Post-build health check ─────────────────────────────────
  echo ""
  POST_LOG=""
  POST_OUTPUT=""
  POST_EXIT=0
  POST_OUTPUT="$(run_health_check "post-${UNIT_ID}" 2>&1)" || POST_EXIT=$?
  echo "$POST_OUTPUT"
  if [ "$POST_EXIT" -eq 0 ]; then
    POST_LOG="$(echo "$POST_OUTPUT" | tail -1)"

    # Check for regressions
    if [ -n "$PRE_LOG" ] && [ -n "$POST_LOG" ]; then
      if ! compare_builds "$PRE_LOG" "$POST_LOG"; then
        echo "  REGRESSION DETECTED after $UNIT_ID"
        if [ "$UNIT_RETRIES" -lt "$MAX_RETRIES" ]; then
          echo "  Will retry ($((UNIT_RETRIES + 1))/$MAX_RETRIES)"
          set_unit_status "$UNIT_ID" "pending"
          increment_retries "$UNIT_ID"
          # Roll back to pre-unit state
          echo "  Rolling back to tag $TAG_NAME..."
          git checkout "$TAG_NAME" -- . 2>/dev/null || true
          continue
        else
          echo "  Max retries exceeded. Marking as failed."
          set_unit_status "$UNIT_ID" "failed"
          continue
        fi
      fi
    fi

    # Build passed — mark done
    echo ""
    echo "  $UNIT_ID: $UNIT_NAME — DONE"
    set_unit_status "$UNIT_ID" "done"

    # Commit changes
    echo "  Committing changes..."
    git add -A
    git commit -m "feat(onboarding): implement $UNIT_ID — $UNIT_NAME

Automated by build-orchestrator.sh

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>" 2>/dev/null || echo "  (nothing to commit)"

  else
    # Build failed
    echo ""
    echo "  BUILD FAILED after $UNIT_ID: $UNIT_NAME"

    if [ "$UNIT_RETRIES" -lt "$MAX_RETRIES" ]; then
      echo "  Will retry ($((UNIT_RETRIES + 1))/$MAX_RETRIES)"
      set_unit_status "$UNIT_ID" "pending"
      increment_retries "$UNIT_ID"
    else
      echo "  Max retries exceeded. Marking as failed."
      set_unit_status "$UNIT_ID" "failed"
    fi
  fi

  echo ""
  print_status
done
