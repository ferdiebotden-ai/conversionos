#!/usr/bin/env python3
"""One-time migration: Recreate targets table without old CHECK constraint.

Turso/libsql can't ALTER CHECK constraints, so we recreate the table.
Maps old statuses to new:
  reviewed   -> draft_ready
  contacted  -> email_1_sent
  interested -> email_2_sent
  demo_sent  -> email_3_sent

Must handle both local SQLite (PRAGMA foreign_keys) and Turso (HTTP mode).
"""

import os
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import _is_turso, TURSO_URL, TURSO_TOKEN, DB_PATH


def migrate_local_sqlite():
    """Migrate local SQLite DB with FK constraints properly disabled."""
    # Open a fresh connection with FK checks OFF from the start
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    # MUST be set before any transaction
    conn.execute("PRAGMA foreign_keys=OFF")

    rows = conn.execute("SELECT id, company_name, status FROM targets ORDER BY id").fetchall()
    print(f"\nCurrent targets ({len(rows)}):")
    for r in rows:
        print(f"  [{r['id']}] {r['company_name']}: {r['status']}")

    # Drop targets_new if it exists from a previous failed run
    conn.execute("DROP TABLE IF EXISTS targets_new")

    # Get column list dynamically
    schema = conn.execute("PRAGMA table_info(targets)").fetchall()
    columns = [r['name'] for r in schema]
    print(f"\nColumns: {', '.join(columns)}")

    conn.execute("""
        CREATE TABLE targets_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            city TEXT NOT NULL,
            province TEXT NOT NULL DEFAULT 'Ontario',
            territory TEXT NOT NULL,
            website TEXT,
            email TEXT,
            phone TEXT,
            google_rating REAL,
            google_review_count INTEGER,
            services TEXT,
            years_in_business INTEGER,
            brand_colors TEXT,
            brand_description TEXT,
            owner_name TEXT,
            score INTEGER DEFAULT 0,
            score_breakdown TEXT,
            status TEXT NOT NULL DEFAULT 'discovered',
            notes TEXT,
            discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
            qualified_at TEXT,
            contacted_at TEXT,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)

    conn.execute("""
        INSERT INTO targets_new (
            id, company_name, slug, city, province, territory,
            website, email, phone, google_rating, google_review_count,
            services, years_in_business, brand_colors, brand_description,
            owner_name, score, score_breakdown,
            status,
            notes, discovered_at, qualified_at, contacted_at, updated_at
        )
        SELECT
            id, company_name, slug, city, province, territory,
            website, email, phone, google_rating, google_review_count,
            services, years_in_business, brand_colors, brand_description,
            owner_name, score, score_breakdown,
            CASE status
                WHEN 'reviewed' THEN 'draft_ready'
                WHEN 'contacted' THEN 'email_1_sent'
                WHEN 'interested' THEN 'email_2_sent'
                WHEN 'demo_sent' THEN 'email_3_sent'
                ELSE status
            END,
            notes, discovered_at, qualified_at, contacted_at, updated_at
        FROM targets
    """)

    conn.execute("DROP TABLE targets")
    conn.execute("ALTER TABLE targets_new RENAME TO targets")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_targets_status ON targets(status)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_targets_territory ON targets(territory)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_targets_score ON targets(score DESC)")
    conn.commit()

    # Verify
    rows = conn.execute("SELECT id, company_name, status FROM targets ORDER BY id").fetchall()
    print(f"\nMigrated targets ({len(rows)}):")
    for r in rows:
        print(f"  [{r['id']}] {r['company_name']}: {r['status']}")

    conn.execute("PRAGMA foreign_keys=ON")
    conn.close()


def migrate_turso():
    """Migrate Turso cloud DB."""
    import libsql_client

    url = TURSO_URL
    if url.startswith("libsql://"):
        url = url.replace("libsql://", "https://", 1)
    client = libsql_client.create_client_sync(url=url, auth_token=TURSO_TOKEN)

    rs = client.execute("SELECT id, company_name, status FROM targets ORDER BY id")
    print(f"\nCurrent targets ({len(rs.rows)}):")
    for row in rs.rows:
        print(f"  [{row[0]}] {row[1]}: {row[2]}")

    # Drop targets_new if it exists from a previous failed run
    client.execute("DROP TABLE IF EXISTS targets_new")

    client.execute("""
        CREATE TABLE targets_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            city TEXT NOT NULL,
            province TEXT NOT NULL DEFAULT 'Ontario',
            territory TEXT NOT NULL,
            website TEXT,
            email TEXT,
            phone TEXT,
            google_rating REAL,
            google_review_count INTEGER,
            services TEXT,
            years_in_business INTEGER,
            brand_colors TEXT,
            brand_description TEXT,
            owner_name TEXT,
            score INTEGER DEFAULT 0,
            score_breakdown TEXT,
            status TEXT NOT NULL DEFAULT 'discovered',
            notes TEXT,
            discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
            qualified_at TEXT,
            contacted_at TEXT,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)

    client.execute("""
        INSERT INTO targets_new (
            id, company_name, slug, city, province, territory,
            website, email, phone, google_rating, google_review_count,
            services, years_in_business, brand_colors, brand_description,
            owner_name, score, score_breakdown,
            status,
            notes, discovered_at, qualified_at, contacted_at, updated_at
        )
        SELECT
            id, company_name, slug, city, province, territory,
            website, email, phone, google_rating, google_review_count,
            services, years_in_business, brand_colors, brand_description,
            owner_name, score, score_breakdown,
            CASE status
                WHEN 'reviewed' THEN 'draft_ready'
                WHEN 'contacted' THEN 'email_1_sent'
                WHEN 'interested' THEN 'email_2_sent'
                WHEN 'demo_sent' THEN 'email_3_sent'
                ELSE status
            END,
            notes, discovered_at, qualified_at, contacted_at, updated_at
        FROM targets
    """)

    client.execute("PRAGMA foreign_keys=OFF")
    client.execute("DROP TABLE targets")
    client.execute("ALTER TABLE targets_new RENAME TO targets")
    client.execute("PRAGMA foreign_keys=ON")
    client.execute("CREATE INDEX IF NOT EXISTS idx_targets_status ON targets(status)")
    client.execute("CREATE INDEX IF NOT EXISTS idx_targets_territory ON targets(territory)")
    client.execute("CREATE INDEX IF NOT EXISTS idx_targets_score ON targets(score DESC)")

    # Verify
    rs = client.execute("SELECT id, company_name, status FROM targets ORDER BY id")
    print(f"\nMigrated targets ({len(rs.rows)}):")
    for row in rs.rows:
        print(f"  [{row[0]}] {row[1]}: {row[2]}")

    client.close()


def main():
    print("=== Status Migration ===")
    if _is_turso():
        print("Target: Turso Cloud DB")
        migrate_turso()
    else:
        print("Target: Local SQLite")
        migrate_local_sqlite()
    print("\n=== Migration complete ===")


if __name__ == "__main__":
    main()
