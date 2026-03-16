#!/usr/bin/env python3
"""One-time migration: add 'sms' to touches.type CHECK and 'unsubscribe' to outcome CHECK.

SQLite doesn't support ALTER TABLE to modify CHECK constraints, so we must:
1. Create touches_new with updated constraints
2. Copy all data
3. Drop touches
4. Rename touches_new -> touches
5. Recreate indexes

Usage:
    python scripts/fix_touches_constraint.py --dry-run   # Preview
    python scripts/fix_touches_constraint.py              # Execute migration
"""

import argparse
import os
import sys
from pathlib import Path

# Load env
SCRIPTS_DIR = Path(__file__).parent
ENV_FILE = SCRIPTS_DIR / ".env"


def load_env():
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip().replace("\r", "")
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value


load_env()

sys.path.insert(0, str(SCRIPTS_DIR))
from db_utils import get_db


CREATE_NEW_TABLE = """
CREATE TABLE touches_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id),
    type TEXT NOT NULL
        CHECK(type IN ('email_initial', 'email_followup', 'email_breakup',
                        'phone_call', 'sms', 'linkedin', 'in_person', 'other')),
    subject TEXT,
    outcome TEXT
        CHECK(outcome IS NULL OR outcome IN (
            'sent', 'opened', 'replied', 'no_response',
            'interested', 'not_interested', 'voicemail',
            'conversation', 'demo_booked', 'unsubscribe'
        )),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
"""

COPY_DATA = "INSERT INTO touches_new SELECT * FROM touches"
DROP_OLD = "DROP TABLE touches"
RENAME_NEW = "ALTER TABLE touches_new RENAME TO touches"
RECREATE_INDEX = "CREATE INDEX IF NOT EXISTS idx_touches_target ON touches(target_id)"

VERIFY_SQL = "SELECT sql FROM sqlite_master WHERE type='table' AND name='touches'"


def main():
    parser = argparse.ArgumentParser(description="Fix touches CHECK constraint to include 'sms'")
    parser.add_argument("--dry-run", action="store_true", help="Preview SQL without executing")
    args = parser.parse_args()

    steps = [
        ("Create touches_new with updated CHECK", CREATE_NEW_TABLE),
        ("Copy data from touches -> touches_new", COPY_DATA),
        ("Drop old touches table", DROP_OLD),
        ("Rename touches_new -> touches", RENAME_NEW),
        ("Recreate index", RECREATE_INDEX),
    ]

    if args.dry_run:
        print("=== DRY RUN — SQL that would execute ===\n")
        for desc, sql in steps:
            print(f"-- {desc}")
            print(f"{sql.strip()};\n")

        print("=== Verification query ===")
        print(f"{VERIFY_SQL};")
        return

    print("=== Migrating touches table ===\n")

    with get_db() as conn:
        # Check current schema
        row = conn.execute(VERIFY_SQL).fetchone()
        current_schema = row.get("sql", "") if row else ""
        print(f"Current schema:\n{current_schema}\n")

        if "'sms'" in current_schema:
            print("'sms' already in touches CHECK constraint. Nothing to do.")
            return

        for desc, sql in steps:
            print(f"  {desc}...")
            conn.execute(sql)
            print(f"    Done.")

        # Verify
        row = conn.execute(VERIFY_SQL).fetchone()
        new_schema = row.get("sql", "") if row else ""
        print(f"\nNew schema:\n{new_schema}\n")

        if "'sms'" in new_schema:
            print("Migration successful. 'sms' is now in touches.type CHECK.")
        else:
            print("WARNING: 'sms' not found in new schema. Check manually.")

        # Quick count check
        count = conn.execute("SELECT COUNT(*) as c FROM touches").fetchone()
        print(f"Touches count after migration: {count.get('c', 'unknown')}")


if __name__ == "__main__":
    main()
