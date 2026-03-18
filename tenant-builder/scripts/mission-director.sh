#!/bin/bash
# Mission Director — Auto-launched alongside pipeline builds
# Monitors build progress, checks for failures, nudges the pipeline along.
# Uses Claude Code CLI (Sonnet 4.6 medium effort) on Max subscription (~$0 marginal cost).
#
# Usage: ./mission-director.sh [workspace] [batch_size]
# Example: ./mission-director.sh ~/Norbot-Systems/products/conversionos 5

WORKSPACE="${1:-$HOME/Norbot-Systems/products/conversionos}"
BATCH_SIZE="${2:-5}"
DATE=$(date +%Y-%m-%d)
RESULTS_DIR="$WORKSPACE/tenant-builder/results/$DATE"

# Strip CLAUDECODE env var to prevent nested session issues
unset CLAUDECODE

PROMPT="You are the Mission Director for a Cold Builder batch run on $DATE.

WORKSPACE: $WORKSPACE
RESULTS DIR: $RESULTS_DIR
BATCH SIZE: $BATCH_SIZE

Your job:
1. Monitor the build by checking $RESULTS_DIR/ for batch-summary.json every 30 seconds
2. For each target, check results/{date}/{slug}/go-live-readiness.json for QA results
3. Report progress: how many complete, how many in progress, any failures
4. If >50% of builds fail, report the failure pattern and suggest fixes
5. Check visual-qa.json scores — flag any below 3.5
6. When all builds complete, provide a final summary with:
   - Total succeeded/failed/skipped
   - Average QA score
   - Any recurring issues
   - Recommended next steps (outreach, polish, re-build)

Use Haiku subagents for frequent file checks. Don't block on long waits — poll and report.
If builds are stuck (no progress for 5+ min), investigate the logs.

Read the CLAUDE.md in $WORKSPACE/tenant-builder/ for full pipeline context."

# Run Mission Director as Claude Code CLI session
claude -p "$PROMPT" \
  --model sonnet \
  --max-turns 30 \
  --no-session-persistence \
  2>&1
