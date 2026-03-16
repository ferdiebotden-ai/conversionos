#!/usr/bin/env python3
"""Sync pipeline DB with actual Gmail sent status.

Scans Gmail Sent folder for emails matching target email addresses,
then updates DB status to email_1_sent, reserves territories, and logs touches.

Usage:
    python scripts/sync_gmail_status.py              # Full sync
    python scripts/sync_gmail_status.py --dry-run    # Preview only
"""

import argparse
import email
import imaplib
import os
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import (
    get_target,
    get_targets_by_status,
    get_all_territories,
    log_touch,
    reserve_territory,
    update_target_status,
)


SENDER_EMAIL = "ferdie@norbotsystems.com"


def load_gmail_credentials() -> tuple[str, str]:
    """Load Gmail IMAP credentials from scripts/.env or environment."""
    user = os.environ.get("GMAIL_USER", "")
    password = os.environ.get("GMAIL_APP_PASSWORD", "")

    if not (user and password):
        env_path = Path(__file__).parent / ".env"
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    if key == "GMAIL_USER" and not user:
                        user = val
                    elif key == "GMAIL_APP_PASSWORD" and not password:
                        password = val

    if not user or not password:
        print("ERROR: Gmail credentials not found.")
        print("Set GMAIL_USER and GMAIL_APP_PASSWORD in scripts/.env or environment.")
        sys.exit(1)

    return user, password


def get_sent_recipients(imap: imaplib.IMAP4_SSL) -> dict[str, dict]:
    """Scan Gmail Sent folder and return a map of recipient email -> message info.

    Returns dict like: {"info@company.com": {"date": "...", "subject": "..."}}
    """
    imap.select('"[Gmail]/Sent Mail"', readonly=True)

    # Search for emails sent FROM our address
    status, msg_ids = imap.search(None, f'FROM "{SENDER_EMAIL}"')
    if status != "OK" or not msg_ids[0]:
        print("  No sent emails found from", SENDER_EMAIL)
        return {}

    id_list = msg_ids[0].split()
    print(f"  Found {len(id_list)} sent emails from {SENDER_EMAIL}")

    recipients = {}
    for msg_id in id_list:
        status, data = imap.fetch(msg_id, "(BODY[HEADER.FIELDS (TO SUBJECT DATE)])")
        if status != "OK":
            continue

        raw_header = data[0][1]
        msg = email.message_from_bytes(raw_header)

        to_addr = msg.get("To", "")
        subject = msg.get("Subject", "")
        date_str = msg.get("Date", "")

        # Extract email address from "Name <email>" format
        if "<" in to_addr and ">" in to_addr:
            to_addr = to_addr.split("<")[1].split(">")[0]
        to_addr = to_addr.strip().lower()

        if to_addr and to_addr != SENDER_EMAIL.lower():
            # Keep the most recent send per recipient
            if to_addr not in recipients:
                recipients[to_addr] = {"subject": subject, "date": date_str}

    return recipients


def sync_targets(dry_run: bool = False):
    """Match sent emails against targets and update DB status."""
    print(f"\n=== Gmail → DB Status Sync ===")
    print(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"  Mode: {'DRY RUN' if dry_run else 'LIVE'}")

    user, password = load_gmail_credentials()

    # Connect to Gmail
    print(f"\n  Connecting to Gmail as {user}...")
    imap = imaplib.IMAP4_SSL("imap.gmail.com", 993)
    try:
        imap.login(user, password)
        print("  Connected.")

        # Get all sent recipients
        sent = get_sent_recipients(imap)
        print(f"  Unique recipients: {len(sent)}")

    finally:
        try:
            imap.logout()
        except Exception:
            pass

    # Get targets that should be updated (draft_ready or reviewed status)
    syncable_statuses = ["draft_ready", "reviewed", "qualified"]
    targets_to_check = []
    for status in syncable_statuses:
        targets_to_check.extend(get_targets_by_status(status))

    # Also check email_1_sent targets (to detect follow-ups)
    targets_to_check.extend(get_targets_by_status("email_1_sent"))

    print(f"\n  Checking {len(targets_to_check)} targets against sent emails...")

    updated = 0
    skipped = 0
    no_match = 0

    for target in targets_to_check:
        target_email = (target.get("email") or "").strip().lower()
        company = target["company_name"]
        current_status = target["status"]

        if not target_email:
            skipped += 1
            continue

        if target_email in sent:
            send_info = sent[target_email]
            # Determine what status to set based on current status
            if current_status in ("draft_ready", "reviewed", "qualified"):
                new_status = "email_1_sent"
            elif current_status == "email_1_sent":
                # Already at email_1_sent, skip unless we detect a follow-up
                # (Future: detect email 2/3 by subject matching)
                continue
            else:
                continue

            print(f"\n  MATCH: {company}")
            print(f"    Email: {target_email}")
            print(f"    Sent subject: {send_info['subject']}")
            print(f"    Transition: {current_status} -> {new_status}")

            if not dry_run:
                # Update status
                update_target_status(target["id"], new_status)

                # Reserve territory
                reserve_territory(target["territory"], target["id"])
                print(f"    Territory '{target['territory']}' reserved")

                # Log touch
                log_touch(
                    target["id"],
                    "email_initial",
                    subject=send_info.get("subject"),
                    outcome="sent",
                    notes=f"Synced from Gmail Sent on {datetime.now().isoformat()}",
                )
                print(f"    Touch logged: email_initial / sent")
            else:
                print(f"    [DRY RUN] Would update status and reserve territory")

            updated += 1
        else:
            no_match += 1

    print(f"\n=== Sync Summary ===")
    print(f"  Updated: {updated}")
    print(f"  Skipped (no email): {skipped}")
    print(f"  No match in sent: {no_match}")

    if not dry_run and updated > 0:
        print(f"\n  {updated} targets synced to email_1_sent with territory reservations.")
    elif dry_run and updated > 0:
        print(f"\n  [DRY RUN] Would update {updated} targets. Run without --dry-run to apply.")


def main():
    parser = argparse.ArgumentParser(description="Sync pipeline DB with Gmail sent status")
    parser.add_argument("--dry-run", action="store_true", help="Preview without changes")
    args = parser.parse_args()

    sync_targets(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
