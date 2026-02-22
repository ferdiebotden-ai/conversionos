#!/usr/bin/env bash
# Health check: runs npm run build and validates output.
# Returns 0 on success, 1 on failure.
# Captures build output for comparison and regression detection.

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
LOG_DIR="$PROJECT_DIR/scripts/logs"

mkdir -p "$LOG_DIR"

# Run build and capture output
run_health_check() {
  local label="${1:-check}"
  local log_file="$LOG_DIR/build-${label}-$(date +%Y%m%d-%H%M%S).log"

  echo "  Running health check ($label)..."
  echo "  Log: $log_file"

  if cd "$PROJECT_DIR" && npm run build > "$log_file" 2>&1; then
    local warnings
    warnings=$(grep -c "warning" "$log_file" 2>/dev/null || echo "0")
    echo "  BUILD PASSED ($warnings warnings)"
    echo "$log_file"
    return 0
  else
    echo "  BUILD FAILED — see $log_file"
    # Print last 30 lines of error output
    echo "  --- Last 30 lines ---"
    tail -30 "$log_file" | sed 's/^/  | /'
    echo "  --- End ---"
    echo "$log_file"
    return 1
  fi
}

# Compare two build logs for regressions
compare_builds() {
  local pre_log="$1"
  local post_log="$2"

  if [ ! -f "$pre_log" ] || [ ! -f "$post_log" ]; then
    echo "  Cannot compare: log files missing"
    return 0
  fi

  local pre_errors post_errors
  pre_errors=$(grep -c "Error" "$pre_log" 2>/dev/null || echo "0")
  post_errors=$(grep -c "Error" "$post_log" 2>/dev/null || echo "0")

  if [ "$post_errors" -gt "$pre_errors" ]; then
    echo "  REGRESSION DETECTED: errors increased from $pre_errors to $post_errors"
    return 1
  fi

  echo "  No regressions detected (errors: $pre_errors -> $post_errors)"
  return 0
}
