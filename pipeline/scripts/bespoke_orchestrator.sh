#!/usr/bin/env bash
# =========================================================================
# Bespoke Conversion Orchestrator
# =========================================================================
# Outer loop that drives the bespoke microsite generation + refinement
# cycle for a demo-booked target.
#
# Usage:
#   ./scripts/bespoke_orchestrator.sh <target_id> [--max-iterations N]
#
# Flow:
#   1. Trigger bespoke generation via dashboard API
#   2. Screenshot the bespoke microsite (desktop + mobile)
#   3. Compare against target's original website screenshots
#   4. Score on 5-dimension rubric (threshold: 4.0/5.0)
#   5. If below threshold and iterations < max: fix and regenerate
#   6. Deploy final version and notify
#
# State is persisted in a JSON file for crash recovery.
# =========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_DIR="${PROJECT_ROOT}/data/bespoke-state"
DASHBOARD_URL="${DASHBOARD_URL:-https://dashboard-rho-ten-70.vercel.app}"
MAX_ITERATIONS=5

# Parse arguments
TARGET_ID="${1:-}"
if [[ -z "$TARGET_ID" ]]; then
  echo "Usage: $0 <target_id> [--max-iterations N]"
  exit 1
fi

shift
while [[ $# -gt 0 ]]; do
  case "$1" in
    --max-iterations) MAX_ITERATIONS="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Ensure state directory exists
mkdir -p "$STATE_DIR"
STATE_FILE="${STATE_DIR}/target_${TARGET_ID}.json"

# ── Helper: Atomic JSON write ──────────────────────────────────────────
write_state() {
  local tmp="${STATE_FILE}.tmp"
  echo "$1" | python3 -m json.tool > "$tmp" 2>/dev/null || echo "$1" > "$tmp"
  mv "$tmp" "$STATE_FILE"
}

read_state() {
  if [[ -f "$STATE_FILE" ]]; then
    cat "$STATE_FILE"
  else
    echo '{}'
  fi
}

get_field() {
  local field="$1"
  python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('$field',''))" < "$STATE_FILE" 2>/dev/null || echo ""
}

# ── Helper: Log with timestamp ─────────────────────────────────────────
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# ── Initialize state ───────────────────────────────────────────────────
CURRENT_STATE=$(read_state)
ITERATION=$(echo "$CURRENT_STATE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('iteration',0))" 2>/dev/null || echo "0")

if [[ "$ITERATION" -eq 0 ]]; then
  log "Starting bespoke conversion for target $TARGET_ID"
  write_state "{
    \"target_id\": $TARGET_ID,
    \"iteration\": 0,
    \"max_iterations\": $MAX_ITERATIONS,
    \"status\": \"starting\",
    \"scores\": [],
    \"started_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }"
else
  log "Resuming bespoke conversion for target $TARGET_ID at iteration $ITERATION"
fi

# ── Step 1: Trigger bespoke generation via API ─────────────────────────
log "Step 1: Triggering bespoke generation via API..."

API_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${DASHBOARD_URL}/api/pipeline/bespoke" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${PIPELINE_API_SECRET:-}" \
  -d "{\"targetId\": $TARGET_ID}" \
  --max-time 300)

HTTP_CODE=$(echo "$API_RESPONSE" | tail -n1)
API_BODY=$(echo "$API_RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" != "200" ]]; then
  log "ERROR: API returned HTTP $HTTP_CODE"
  log "Response: $API_BODY"
  write_state "$(read_state | python3 -c "
import json,sys
d=json.load(sys.stdin)
d['status']='failed'
d['error']='API returned HTTP $HTTP_CODE'
json.dump(d,sys.stdout)
")"
  echo "BESPOKE_STATUS=failed"
  exit 1
fi

# Extract quality score from API response
QUALITY_SCORE=$(echo "$API_BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('qualityScore', 0))" 2>/dev/null || echo "0")
SUCCESS=$(echo "$API_BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('success', False))" 2>/dev/null || echo "False")

ITERATION=$((ITERATION + 1))

log "Iteration $ITERATION complete. Quality score: $QUALITY_SCORE. Success: $SUCCESS"

# Update state
write_state "$(python3 -c "
import json
state = json.load(open('$STATE_FILE'))
state['iteration'] = $ITERATION
state['status'] = 'iterating'
state['latest_score'] = $QUALITY_SCORE
state['scores'].append({'iteration': $ITERATION, 'score': $QUALITY_SCORE})
json.dump(state, open('${STATE_FILE}.tmp', 'w'))
" && mv "${STATE_FILE}.tmp" "$STATE_FILE" && cat "$STATE_FILE")"

# ── Step 2: Evaluate quality ───────────────────────────────────────────
# The API already runs the refinement loop internally via bespoke-generate.ts
# Here we check the final quality score from the API response

SCORE_FLOAT=$(python3 -c "print(float('$QUALITY_SCORE'))" 2>/dev/null || echo "0.0")
THRESHOLD="4.0"
MIN_THRESHOLD="3.5"

PASSES=$(python3 -c "print('yes' if float('$SCORE_FLOAT') >= float('$THRESHOLD') else 'no')")
ACCEPTABLE=$(python3 -c "print('yes' if float('$SCORE_FLOAT') >= float('$MIN_THRESHOLD') else 'no')")

if [[ "$PASSES" == "yes" ]]; then
  log "PASS: Quality score $QUALITY_SCORE >= $THRESHOLD threshold"
  write_state "$(python3 -c "
import json
state = json.load(open('$STATE_FILE'))
state['status'] = 'complete'
state['final_score'] = $QUALITY_SCORE
state['completed_at'] = '$(date -u +%Y-%m-%dT%H:%M:%SZ)'
json.dump(state, open('${STATE_FILE}.tmp', 'w'))
" && mv "${STATE_FILE}.tmp" "$STATE_FILE" && cat "$STATE_FILE")"
  echo "BESPOKE_STATUS=complete SCORE=$QUALITY_SCORE"

elif [[ "$ITERATION" -ge "$MAX_ITERATIONS" ]]; then
  if [[ "$ACCEPTABLE" == "yes" ]]; then
    log "PASS (with review flag): Score $QUALITY_SCORE >= $MIN_THRESHOLD after $ITERATION iterations"
    echo "BESPOKE_STATUS=complete SCORE=$QUALITY_SCORE REVIEW_NEEDED=true"
  else
    log "FAIL: Score $QUALITY_SCORE < $MIN_THRESHOLD after $ITERATION iterations"
    echo "BESPOKE_STATUS=failed SCORE=$QUALITY_SCORE"
    echo "BLOCKER: Bespoke quality below minimum threshold after max iterations"
  fi

else
  log "Score $QUALITY_SCORE below threshold. Iteration $ITERATION/$MAX_ITERATIONS."
  log "Run this script again to trigger another iteration, or use Claude Code with:"
  log "  claude --command bespoke-refine --target-id $TARGET_ID"
  echo "BESPOKE_STATUS=iterating SCORE=$QUALITY_SCORE ITERATION=$ITERATION"
fi

log "Done. State saved to $STATE_FILE"
