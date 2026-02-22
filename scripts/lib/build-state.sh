#!/usr/bin/env bash
# Build state management helpers (jq-based)
# Used by build-orchestrator.sh to track progress through work units.

set -euo pipefail

STATE_FILE="${STATE_FILE:-scripts/build-state.json}"

# Get the next pending unit (returns unit JSON or empty string)
get_next_unit() {
  jq -r '.units[] | select(.status == "pending") | .id' "$STATE_FILE" | head -1
}

# Get unit field by ID
get_unit_field() {
  local unit_id="$1"
  local field="$2"
  jq -r --arg id "$unit_id" --arg f "$field" \
    '.units[] | select(.id == $id) | .[$f]' "$STATE_FILE"
}

# Get unit status
get_unit_status() {
  get_unit_field "$1" "status"
}

# Get unit name
get_unit_name() {
  get_unit_field "$1" "name"
}

# Get unit prompt file path
get_unit_prompt() {
  get_unit_field "$1" "prompt"
}

# Get unit retries count
get_unit_retries() {
  get_unit_field "$1" "retries"
}

# Set unit status (pending | in_progress | done | failed)
set_unit_status() {
  local unit_id="$1"
  local status="$2"
  local tmp
  tmp=$(mktemp)
  jq --arg id "$unit_id" --arg s "$status" \
    '(.units[] | select(.id == $id)).status = $s' "$STATE_FILE" > "$tmp"
  mv "$tmp" "$STATE_FILE"
}

# Increment unit retry count
increment_retries() {
  local unit_id="$1"
  local tmp
  tmp=$(mktemp)
  jq --arg id "$unit_id" \
    '(.units[] | select(.id == $id)).retries += 1' "$STATE_FILE" > "$tmp"
  mv "$tmp" "$STATE_FILE"
}

# Increment total sessions counter
increment_sessions() {
  local tmp
  tmp=$(mktemp)
  jq '.sessionsRun += 1' "$STATE_FILE" > "$tmp"
  mv "$tmp" "$STATE_FILE"
}

# Get total sessions run
get_sessions_run() {
  jq -r '.sessionsRun' "$STATE_FILE"
}

# Get max sessions allowed
get_max_sessions() {
  jq -r '.maxSessions' "$STATE_FILE"
}

# Get max retries per unit
get_max_retries() {
  jq -r '.maxRetries' "$STATE_FILE"
}

# Count completed units
count_completed() {
  jq '[.units[] | select(.status == "done")] | length' "$STATE_FILE"
}

# Count total units
count_total() {
  jq '.totalUnits' "$STATE_FILE"
}

# Print status summary
print_status() {
  local done failed pending in_progress
  done=$(jq '[.units[] | select(.status == "done")] | length' "$STATE_FILE")
  failed=$(jq '[.units[] | select(.status == "failed")] | length' "$STATE_FILE")
  pending=$(jq '[.units[] | select(.status == "pending")] | length' "$STATE_FILE")
  in_progress=$(jq '[.units[] | select(.status == "in_progress")] | length' "$STATE_FILE")

  echo "========================================="
  echo "  Build Orchestrator Status"
  echo "========================================="
  echo "  Sessions run: $(get_sessions_run) / $(get_max_sessions)"
  echo "  Units: $done done, $in_progress in-progress, $pending pending, $failed failed"
  echo "-----------------------------------------"
  jq -r '.units[] | "  \(.id) [\(.status)]\t\(.name) (retries: \(.retries))"' "$STATE_FILE"
  echo "========================================="
}
