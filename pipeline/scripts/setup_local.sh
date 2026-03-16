#!/usr/bin/env bash
# Setup script for the Agentic Business Organization pipeline.
# Creates Python venv, installs dependencies, initializes SQLite database.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Agentic Business Organization — Local Setup ==="
echo "Project: $PROJECT_DIR"
echo ""

# 1. Python virtual environment
VENV_DIR="$PROJECT_DIR/.venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "[1/4] Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR"
    echo "  Created at $VENV_DIR"
else
    echo "[1/4] Virtual environment already exists at $VENV_DIR"
fi

# 2. Activate and install dependencies
echo "[2/4] Installing Python dependencies..."
source "$VENV_DIR/bin/activate"
pip install --quiet --upgrade pip
pip install --quiet pyyaml

echo "  Installed: pyyaml"

# 3. Initialize database
echo "[3/4] Initializing SQLite database..."
python3 "$SCRIPT_DIR/db_utils.py" init

# 4. Verify
echo "[4/4] Verifying setup..."

DB_PATH="$PROJECT_DIR/data/leads.sqlite"
if [ -f "$DB_PATH" ]; then
    TABLE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
    TERRITORY_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM territories;")
    echo "  Database: $DB_PATH"
    echo "  Tables: $TABLE_COUNT"
    echo "  Territories seeded: $TERRITORY_COUNT"
else
    echo "  ERROR: Database not created!"
    exit 1
fi

# Create outbox audit log
touch "$PROJECT_DIR/outbox/_audit.log"
echo "  Audit log: outbox/_audit.log"

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Add targets:  python scripts/discover_targets.py add --name 'Company' --city 'London' --territory 'London, ON'"
echo "  2. Run pipeline:  bash scripts/daily_outreach_run.sh"
echo ""
