#!/usr/bin/env python3
"""
Migration: Create sms_messages table and backfill from touches.
Run once before deploying CRM Phase 3.
"""
import os
import sys

# Load env
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, val = line.split('=', 1)
                os.environ[key.strip()] = val.strip().strip('\r')

sys.path.insert(0, os.path.dirname(__file__))
from db_utils import get_db

def main():
    dry_run = '--dry-run' in sys.argv

    with get_db() as conn:
        # Create table
        print("Creating sms_messages table...")
        if not dry_run:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS sms_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    target_id INTEGER NOT NULL REFERENCES targets(id),
                    direction TEXT NOT NULL CHECK(direction IN ('outbound', 'inbound')),
                    body TEXT NOT NULL,
                    twilio_sid TEXT,
                    phone_from TEXT,
                    phone_to TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_sms_target
                ON sms_messages(target_id, created_at)
            """)
            print("  Table created.")
        else:
            print("  [DRY RUN] Would create sms_messages table")

        # Check existing data
        try:
            result = conn.execute("SELECT COUNT(*) as count FROM sms_messages")
            existing = result.fetchone()[0]
            if existing > 0:
                print(f"  Already has {existing} rows, skipping backfill.")
                return
        except Exception:
            pass  # Table might not exist yet in dry run

        # Backfill outbound SMS
        outbound = conn.execute("""
            SELECT target_id, notes, created_at
            FROM touches
            WHERE type = 'sms' AND outcome = 'sent' AND notes IS NOT NULL
        """).fetchall()
        print(f"Found {len(outbound)} outbound SMS touches to backfill")

        # Backfill inbound SMS
        inbound = conn.execute("""
            SELECT target_id, notes, created_at
            FROM touches
            WHERE type = 'sms' AND outcome = 'replied' AND notes IS NOT NULL
        """).fetchall()
        print(f"Found {len(inbound)} inbound SMS touches to backfill")

        if not dry_run:
            for row in outbound:
                conn.execute(
                    "INSERT INTO sms_messages (target_id, direction, body, created_at) VALUES (?, 'outbound', ?, ?)",
                    [row['target_id'], row['notes'], row['created_at']]
                )
            for row in inbound:
                body = row['notes']
                # Strip "Inbound SMS: " prefix if present
                if body.startswith("Inbound SMS: "):
                    body = body[len("Inbound SMS: "):]
                # Strip MessageSid suffix
                if ". MessageSid:" in body:
                    body = body[:body.index(". MessageSid:")]
                conn.execute(
                    "INSERT INTO sms_messages (target_id, direction, body, created_at) VALUES (?, 'inbound', ?, ?)",
                    [row['target_id'], body, row['created_at']]
                )
            print(f"  Backfilled {len(outbound)} outbound + {len(inbound)} inbound messages.")
        else:
            print("  [DRY RUN] Would backfill messages")

    print("Done.")

if __name__ == '__main__':
    main()
