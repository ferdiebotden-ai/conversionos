#!/usr/bin/env python3
"""One-time migration: move email_2_sent leads back to email_1_sent.

Ferdie confirmed these leads only had Email 1 actually sent.
They need to go through the new 5-touch cadence:
  email_1_sent -> sms_sent -> phone_called -> email_2_sent -> email_3_sent

Also adds phone_type column to targets table if missing.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import get_db


def main():
    dry_run = "--dry-run" in sys.argv

    with get_db() as conn:
        # 1. Add phone_type column if not exists
        cols = conn.execute("PRAGMA table_info(targets)").fetchall()
        col_names = [c[1] for c in cols]
        if "phone_type" not in col_names:
            if dry_run:
                print("[DRY RUN] Would add phone_type column to targets table")
            else:
                conn.execute("ALTER TABLE targets ADD COLUMN phone_type TEXT")
                print("Added phone_type column to targets table")
        else:
            print("phone_type column already exists")

        # 2. Migrate email_2_sent leads back to email_1_sent
        leads = conn.execute(
            "SELECT id, company_name, status FROM targets WHERE status = 'email_2_sent'"
        ).fetchall()

        if not leads:
            print("No email_2_sent leads to migrate.")
            return

        print(f"\nFound {len(leads)} leads in email_2_sent to migrate back to email_1_sent:")
        for lead in leads:
            print(f"  ID {lead[0]}: {lead[1]}")

        if dry_run:
            print("\n[DRY RUN] Would update these leads to email_1_sent status")
            return

        conn.execute(
            "UPDATE targets SET status = 'email_1_sent', updated_at = datetime('now') WHERE status = 'email_2_sent'"
        )
        print(f"\nMigrated {len(leads)} leads from email_2_sent -> email_1_sent")
        print("These leads will now flow through: text -> call -> email 2 -> email 3")


if __name__ == "__main__":
    main()
