#!/usr/bin/env python3
"""CRM database migration — adds 5 tables, 6 columns, 10 indexes.

All statements are idempotent (CREATE IF NOT EXISTS, ALTER with existence checks).
Uses the existing db_utils.get_db() pattern for Turso connection.

Usage:
    python scripts/migrate_crm.py              # Run migration
    python scripts/migrate_crm.py --dry-run    # Preview SQL only
    python scripts/migrate_crm.py --verify     # Check tables exist
"""

import argparse
import sys
from pathlib import Path

# Ensure project root is importable
sys.path.insert(0, str(Path(__file__).parent))
from db_utils import get_db

# -- New columns on targets --------------------------------------------------

ALTER_STATEMENTS = [
    ("customer_tier", "ALTER TABLE targets ADD COLUMN customer_tier TEXT DEFAULT 'standard'"),
    ("last_interaction_at", "ALTER TABLE targets ADD COLUMN last_interaction_at TEXT"),
    ("interaction_count", "ALTER TABLE targets ADD COLUMN interaction_count INTEGER DEFAULT 0"),
    ("avg_response_time_hours", "ALTER TABLE targets ADD COLUMN avg_response_time_hours REAL"),
    ("preferred_contact_method", "ALTER TABLE targets ADD COLUMN preferred_contact_method TEXT"),
    ("preferred_contact_time", "ALTER TABLE targets ADD COLUMN preferred_contact_time TEXT"),
]

# -- New tables ---------------------------------------------------------------

CREATE_TABLES = [
    """CREATE TABLE IF NOT EXISTS customer_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id) UNIQUE,
    owner_name TEXT,
    owner_role TEXT,
    communication_style TEXT,
    decision_drivers TEXT,
    personal_notes TEXT,
    health_score REAL DEFAULT 0,
    win_probability REAL DEFAULT 0,
    competitor_mentions TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)""",
    """CREATE TABLE IF NOT EXISTS call_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id),
    touch_id INTEGER REFERENCES touches(id),
    report_type TEXT NOT NULL DEFAULT 'phone_call',
    summary TEXT NOT NULL,
    outcomes TEXT,
    action_items TEXT,
    objections_raised TEXT,
    sentiment TEXT DEFAULT 'neutral',
    next_steps TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
)""",
    """CREATE TABLE IF NOT EXISTS objections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id),
    call_report_id INTEGER REFERENCES call_reports(id),
    category TEXT NOT NULL,
    objection_text TEXT NOT NULL,
    response_text TEXT,
    resolved INTEGER DEFAULT 0,
    effectiveness TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
)""",
    """CREATE TABLE IF NOT EXISTS customer_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id),
    signal_type TEXT NOT NULL,
    signal_text TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    source TEXT NOT NULL,
    source_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
)""",
    """CREATE TABLE IF NOT EXISTS email_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id),
    direction TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    email_number INTEGER,
    gmail_message_id TEXT,
    sent_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
)""",
]

# -- Indexes ------------------------------------------------------------------

CREATE_INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_customer_profiles_target ON customer_profiles(target_id)",
    "CREATE INDEX IF NOT EXISTS idx_call_reports_target ON call_reports(target_id)",
    "CREATE INDEX IF NOT EXISTS idx_call_reports_created ON call_reports(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_objections_target ON objections(target_id)",
    "CREATE INDEX IF NOT EXISTS idx_objections_category ON objections(category)",
    "CREATE INDEX IF NOT EXISTS idx_signals_target ON customer_signals(target_id)",
    "CREATE INDEX IF NOT EXISTS idx_signals_type ON customer_signals(signal_type)",
    "CREATE INDEX IF NOT EXISTS idx_signals_created ON customer_signals(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_email_threads_target ON email_threads(target_id)",
    "CREATE INDEX IF NOT EXISTS idx_email_threads_direction ON email_threads(direction)",
]


def column_exists(conn, table: str, column: str) -> bool:
    """Check if a column exists on a table."""
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return any(r["name"] == column for r in rows)


def table_exists(conn, table: str) -> bool:
    """Check if a table exists."""
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,)
    ).fetchall()
    return len(rows) > 0


def run_migration(dry_run: bool = False):
    """Execute the CRM migration."""
    print("=== CRM Migration ===\n")

    if dry_run:
        print("[DRY RUN] Would execute the following:\n")
        for col_name, sql in ALTER_STATEMENTS:
            print(f"  ALTER targets.{col_name}")
        for sql in CREATE_TABLES:
            table_name = sql.split("IF NOT EXISTS ")[1].split(" (")[0].strip()
            print(f"  CREATE TABLE {table_name}")
        for sql in CREATE_INDEXES:
            idx_name = sql.split("IF NOT EXISTS ")[1].split(" ON")[0].strip()
            print(f"  CREATE INDEX {idx_name}")
        print(f"\nTotal: {len(ALTER_STATEMENTS)} columns, {len(CREATE_TABLES)} tables, {len(CREATE_INDEXES)} indexes")
        return

    with get_db() as conn:
        # 1. Add columns to targets (skip if already exists)
        print("1. Adding columns to targets...")
        for col_name, sql in ALTER_STATEMENTS:
            if column_exists(conn, "targets", col_name):
                print(f"   SKIP {col_name} (already exists)")
            else:
                conn.execute(sql)
                print(f"   ADDED {col_name}")

        # 2. Create tables
        print("\n2. Creating tables...")
        for sql in CREATE_TABLES:
            table_name = sql.split("IF NOT EXISTS ")[1].split(" (")[0].strip()
            already = table_exists(conn, table_name)
            conn.execute(sql)
            print(f"   {'SKIP' if already else 'CREATED'} {table_name}")

        # 3. Create indexes
        print("\n3. Creating indexes...")
        for sql in CREATE_INDEXES:
            idx_name = sql.split("IF NOT EXISTS ")[1].split(" ON")[0].strip()
            conn.execute(sql)
            print(f"   OK {idx_name}")

    print("\n=== Migration complete ===")


def verify_migration():
    """Verify all CRM tables and columns exist."""
    print("=== CRM Migration Verification ===\n")

    expected_tables = [
        "customer_profiles",
        "call_reports",
        "objections",
        "customer_signals",
        "email_threads",
    ]
    expected_columns = [col for col, _ in ALTER_STATEMENTS]
    ok = True

    with get_db() as conn:
        # Check tables
        print("Tables:")
        for table in expected_tables:
            exists = table_exists(conn, table)
            status = "OK" if exists else "MISSING"
            print(f"  {status} {table}")
            if not exists:
                ok = False

        # Check columns on targets
        print("\nTargets columns:")
        for col in expected_columns:
            exists = column_exists(conn, "targets", col)
            status = "OK" if exists else "MISSING"
            print(f"  {status} targets.{col}")
            if not exists:
                ok = False

    print(f"\n{'All checks passed.' if ok else 'SOME CHECKS FAILED.'}")
    return ok


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CRM database migration")
    parser.add_argument("--dry-run", action="store_true", help="Preview SQL without executing")
    parser.add_argument("--verify", action="store_true", help="Verify migration was applied")
    args = parser.parse_args()

    if args.verify:
        sys.exit(0 if verify_migration() else 1)
    else:
        run_migration(dry_run=args.dry_run)
