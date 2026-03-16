#!/usr/bin/env bash
# Daily outreach pipeline — orchestrates discovery, qualification, artifact generation.
# DRY-RUN BY DEFAULT. Nothing is sent automatically.
#
# Usage:
#   bash scripts/daily_outreach_run.sh             # Dry-run mode
#   bash scripts/daily_outreach_run.sh --live       # Generate actual artifacts

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DB_PATH="$PROJECT_DIR/data/leads.sqlite"
AUDIT_LOG="$PROJECT_DIR/outbox/_audit.log"

DRY_RUN=true
if [[ "${1:-}" == "--live" ]]; then
    DRY_RUN=false
fi

MODE="DRY-RUN"
if [ "$DRY_RUN" = false ]; then
    MODE="LIVE"
fi

# Activate venv
source "$PROJECT_DIR/.venv/bin/activate"

timestamp() {
    date "+%Y-%m-%d %H:%M:%S"
}

log() {
    local msg="[$(timestamp)] $1"
    echo "$msg"
    echo "$msg" >> "$AUDIT_LOG"
}

echo ""
echo "============================================"
echo "  AGENTIC OUTREACH PIPELINE ($MODE)"
echo "  $(date '+%A, %B %d, %Y')"
echo "============================================"
echo ""

log "Pipeline started ($MODE)"

# --- Step 1: Check pipeline state ---
echo "[1/7] Checking pipeline state..."
python3 "$SCRIPT_DIR/db_utils.py"

# --- Step 2: Check if we need more targets ---
echo "[2/7] Checking discovery needs..."
DISCOVERED=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM targets WHERE status = 'discovered';")
QUALIFIED=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM targets WHERE status = 'qualified';")
DRAFT_READY=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM targets WHERE status = 'draft_ready';")

echo "  Discovered: $DISCOVERED | Qualified: $QUALIFIED | Draft Ready: $DRAFT_READY"

if [ "$DISCOVERED" -eq 0 ] && [ "$QUALIFIED" -eq 0 ] && [ "$DRAFT_READY" -eq 0 ]; then
    echo ""
    echo "  *** PIPELINE IS EMPTY ***"
    echo "  Run lead discovery to find new targets:"
    echo "    python scripts/discover_targets.py add --name 'Company' --city 'London' --territory 'London, ON' ..."
    echo ""
    echo "  Or ask Claude Code to run the lead-researcher agent."
    echo ""
    log "Pipeline empty — discovery needed"
fi

# --- Step 3: Qualify discovered targets ---
echo "[3/7] Qualifying discovered targets..."
if [ "$DISCOVERED" -gt 0 ]; then
    if [ "$DRY_RUN" = true ]; then
        python3 "$SCRIPT_DIR/qualify_target.py" --all --dry-run
    else
        python3 "$SCRIPT_DIR/qualify_target.py" --all
    fi
    log "Qualified $DISCOVERED discovered targets"
else
    echo "  No discovered targets to qualify."
fi

# --- Step 4: Pick top qualified target ---
echo "[4/7] Selecting top qualified target..."
TOP_TARGET_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM targets WHERE status = 'qualified' ORDER BY score DESC LIMIT 1;" 2>/dev/null || echo "")

if [ -z "$TOP_TARGET_ID" ]; then
    echo "  No qualified targets available."

    # Check if there are draft_ready targets to review
    if [ "$DRAFT_READY" -gt 0 ]; then
        echo ""
        echo "  You have $DRAFT_READY targets with artifacts ready for review."
        echo "  Check the outbox/ directory and run:"
        echo "    python scripts/mark_stage.py <id> reviewed"
    fi
else
    TOP_TARGET_NAME=$(sqlite3 "$DB_PATH" "SELECT company_name FROM targets WHERE id = $TOP_TARGET_ID;")
    TOP_TARGET_SCORE=$(sqlite3 "$DB_PATH" "SELECT score FROM targets WHERE id = $TOP_TARGET_ID;")
    echo "  Selected: [$TOP_TARGET_ID] $TOP_TARGET_NAME (Score: $TOP_TARGET_SCORE)"
    log "Selected target: $TOP_TARGET_NAME (ID: $TOP_TARGET_ID, Score: $TOP_TARGET_SCORE)"

    # --- Step 5: Generate artifacts ---
    echo ""
    echo "[5/7] Generating artifacts..."
    if [ "$DRY_RUN" = true ]; then
        python3 "$SCRIPT_DIR/generate_artifacts.py" --id "$TOP_TARGET_ID" --dry-run
    else
        python3 "$SCRIPT_DIR/generate_artifacts.py" --id "$TOP_TARGET_ID"
        log "Artifacts generated for $TOP_TARGET_NAME"
    fi

    # --- Step 6: Compliance note ---
    echo ""
    echo "[6/7] Compliance check..."
    echo "  CASL compliance reminder:"
    echo "    - B2B first-contact to publicly listed business email = implied consent"
    echo "    - Every email MUST include: sender ID, physical address, unsubscribe mechanism"
    echo "    - FILL IN YOUR PHYSICAL ADDRESS before sending any email"
    echo "    - Review all artifacts before use"
fi

# --- Step 7: Action checklist ---
echo ""
echo "============================================"
echo "  ACTION REQUIRED — Review Checklist"
echo "============================================"
echo ""

REVIEW_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM targets WHERE status IN ('draft_ready', 'reviewed');" 2>/dev/null || echo "0")

if [ "$REVIEW_COUNT" -gt 0 ]; then
    echo "  Targets needing your review:"
    sqlite3 -header -column "$DB_PATH" \
        "SELECT id, company_name, city, score, status FROM targets WHERE status IN ('draft_ready', 'reviewed') ORDER BY score DESC;"
    echo ""
    echo "  For each target:"
    echo "    1. Open outbox/<date>/<slug>/microsite/index.html in browser"
    echo "    2. Review outbox/<date>/<slug>/email_draft.md"
    echo "    3. Review outbox/<date>/<slug>/call_script.md"
    echo "    4. FILL IN your physical address in email_draft.md"
    echo "    5. When ready: python scripts/mark_stage.py <id> reviewed"
    echo "    6. Send email manually from Gmail"
    echo "    7. After sending: python scripts/mark_stage.py <id> contacted"
else
    echo "  No targets need review right now."
    echo "  Run discovery to fill the pipeline."
fi

echo ""
log "Pipeline completed ($MODE)"
echo "============================================"
echo "  Pipeline run complete. ($MODE)"
echo "============================================"
echo ""
