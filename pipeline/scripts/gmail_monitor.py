#!/usr/bin/env python3
"""Gmail monitoring daemon for the outreach pipeline.

Monitors inbox, sent, and drafts folders to auto-update the pipeline DB.
Designed to run as a LaunchAgent every 15 minutes during business hours.

Features:
    - Sent folder: detect new sends → update target to email_N_sent
    - Inbox: detect replies → update to interested, notify via Telegram
    - Inbox: detect STOP replies → mark closed_lost, log unsubscribe
    - Drafts: track pending drafts count

Usage:
    python scripts/gmail_monitor.py                  # Full monitor run
    python scripts/gmail_monitor.py --dry-run        # Preview only
    python scripts/gmail_monitor.py --check-inbox    # Inbox only
    python scripts/gmail_monitor.py --check-sent     # Sent only
"""

import argparse
import email
import email.utils
import imaplib
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import (
    get_target,
    get_targets_by_status,
    get_all_territories,
    log_touch,
    release_territory,
    reserve_territory,
    update_target_status,
)

SENDER_EMAIL = "ferdie@norbotsystems.com"
STATE_FILE = Path(__file__).parent / ".gmail_monitor_state.json"

# Telegram notification (optional — set env vars to enable)
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_NOTIFY_CHAT_ID", "")


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
        sys.exit(1)

    return user, password


def load_state() -> dict:
    """Load monitor state (last check timestamps, processed message IDs)."""
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {
        "last_sent_check": None,
        "last_inbox_check": None,
        "processed_sent_ids": [],
        "processed_inbox_ids": [],
    }


def save_state(state: dict):
    """Save monitor state to disk."""
    STATE_FILE.write_text(json.dumps(state, indent=2))


def send_telegram_notification(message: str):
    """Send a notification via Telegram (if configured)."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    data = json.dumps({
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "Markdown",
    }).encode()

    try:
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        print(f"  WARN: Telegram notification failed: {e}")


def build_target_email_map() -> dict[str, dict]:
    """Build a map of target email addresses to target records.

    Includes all active statuses that might receive email updates.
    """
    email_map = {}
    active_statuses = [
        "draft_ready", "reviewed", "qualified",
        "email_1_sent", "email_2_sent", "email_3_sent",
    ]
    for status in active_statuses:
        for target in get_targets_by_status(status):
            target_email = (target.get("email") or "").strip().lower()
            if target_email:
                email_map[target_email] = target
    return email_map


def check_sent_folder(imap: imaplib.IMAP4_SSL, state: dict, dry_run: bool = False) -> list[dict]:
    """Check Sent folder for new sends and update DB accordingly."""
    print("\n--- Checking Sent Folder ---")

    imap.select('"[Gmail]/Sent Mail"', readonly=True)

    # Search for recent emails from our address (last 7 days)
    since_date = (datetime.now() - timedelta(days=7)).strftime("%d-%b-%Y")
    status, msg_ids = imap.search(None, f'FROM "{SENDER_EMAIL}" SINCE {since_date}')

    if status != "OK" or not msg_ids[0]:
        print("  No recent sent emails found")
        return []

    id_list = msg_ids[0].split()
    processed_ids = set(state.get("processed_sent_ids", []))
    target_map = build_target_email_map()
    updates = []

    for msg_id in id_list:
        msg_id_str = msg_id.decode()
        if msg_id_str in processed_ids:
            continue

        status, data = imap.fetch(msg_id, "(BODY[HEADER.FIELDS (TO SUBJECT DATE MESSAGE-ID)])")
        if status != "OK":
            continue

        raw_header = data[0][1]
        msg = email.message_from_bytes(raw_header)

        to_addr = msg.get("To", "")
        subject = msg.get("Subject", "")

        # Extract email address
        if "<" in to_addr and ">" in to_addr:
            to_addr = to_addr.split("<")[1].split(">")[0]
        to_addr = to_addr.strip().lower()

        if to_addr in target_map:
            target = target_map[to_addr]
            current_status = target["status"]

            # Determine new status based on current
            new_status = None
            touch_type = None
            if current_status in ("draft_ready", "reviewed", "qualified"):
                new_status = "email_1_sent"
                touch_type = "email_initial"
            elif current_status == "email_1_sent":
                new_status = "email_2_sent"
                touch_type = "email_followup"
            elif current_status == "email_2_sent":
                new_status = "email_3_sent"
                touch_type = "email_breakup"

            if new_status:
                print(f"  MATCH: {target['company_name']} ({to_addr})")
                print(f"    Subject: {subject}")
                print(f"    Transition: {current_status} -> {new_status}")

                if not dry_run:
                    update_target_status(target["id"], new_status)

                    if new_status == "email_1_sent":
                        reserve_territory(target["territory"], target["id"])
                        print(f"    Territory '{target['territory']}' reserved")

                    log_touch(
                        target["id"],
                        touch_type,
                        subject=subject,
                        outcome="sent",
                        notes=f"Detected by gmail_monitor on {datetime.now().isoformat()}",
                    )

                updates.append({
                    "target": target,
                    "new_status": new_status,
                    "subject": subject,
                })

        # Mark as processed
        processed_ids.add(msg_id_str)

    state["processed_sent_ids"] = list(processed_ids)[-500:]  # Keep last 500
    state["last_sent_check"] = datetime.now().isoformat()

    if updates:
        print(f"\n  Updated {len(updates)} targets from Sent folder")
    else:
        print("  No new sends to sync")

    return updates


def check_inbox(imap: imaplib.IMAP4_SSL, state: dict, dry_run: bool = False) -> list[dict]:
    """Check Inbox for replies from targets.

    Detects:
    - STOP/unsubscribe replies -> mark closed_lost, release territory
    - Any other reply -> mark interested, notify Ferdie
    """
    print("\n--- Checking Inbox ---")

    imap.select("INBOX", readonly=True)

    # Search for recent emails (last 7 days)
    since_date = (datetime.now() - timedelta(days=7)).strftime("%d-%b-%Y")
    status, msg_ids = imap.search(None, f'SINCE {since_date}')

    if status != "OK" or not msg_ids[0]:
        print("  No recent inbox emails found")
        return []

    id_list = msg_ids[0].split()
    processed_ids = set(state.get("processed_inbox_ids", []))
    target_map = build_target_email_map()
    replies = []

    for msg_id in id_list:
        msg_id_str = msg_id.decode()
        if msg_id_str in processed_ids:
            continue

        status, data = imap.fetch(msg_id, "(BODY[HEADER.FIELDS (FROM SUBJECT DATE)] BODY[TEXT])")
        if status != "OK":
            continue

        # Parse headers
        raw_header = data[0][1]
        msg = email.message_from_bytes(raw_header)
        from_addr = msg.get("From", "")
        subject = msg.get("Subject", "")

        # Extract email address from From
        if "<" in from_addr and ">" in from_addr:
            from_addr = from_addr.split("<")[1].split(">")[0]
        from_addr = from_addr.strip().lower()

        if from_addr not in target_map:
            processed_ids.add(msg_id_str)
            continue

        target = target_map[from_addr]

        # Get body text for STOP detection
        body_text = ""
        if len(data) > 2 and data[2] and data[2][1]:
            try:
                body_text = data[2][1].decode("utf-8", errors="ignore")
            except Exception:
                body_text = ""

        # Detect STOP / unsubscribe
        stop_patterns = [r'\bstop\b', r'\bunsubscribe\b', r'\bremove\b', r'\bopt.?out\b']
        is_stop = any(re.search(p, body_text, re.IGNORECASE) for p in stop_patterns)
        is_stop = is_stop or any(re.search(p, subject, re.IGNORECASE) for p in stop_patterns)

        if is_stop:
            print(f"  STOP DETECTED: {target['company_name']} ({from_addr})")
            print(f"    Subject: {subject}")

            if not dry_run:
                update_target_status(target["id"], "closed_lost")
                release_territory(target["territory"], target["id"])
                log_touch(
                    target["id"],
                    "email_initial",
                    subject=subject,
                    outcome="not_interested",
                    notes=f"STOP reply detected by gmail_monitor on {datetime.now().isoformat()}",
                )

                send_telegram_notification(
                    f"STOP reply from *{target['company_name']}* ({target['territory']})\n"
                    f"Territory released. Target marked closed_lost."
                )

            replies.append({
                "target": target,
                "type": "stop",
                "subject": subject,
            })

        else:
            print(f"  REPLY DETECTED: {target['company_name']} ({from_addr})")
            print(f"    Subject: {subject}")

            if not dry_run:
                # Only update to interested if they're in a contacted status
                if target["status"] in ("email_1_sent", "email_2_sent", "email_3_sent", "sms_sent", "phone_called"):
                    log_touch(
                        target["id"],
                        "email_initial",
                        subject=subject,
                        outcome="replied",
                        notes=f"Reply detected by gmail_monitor on {datetime.now().isoformat()}",
                    )
                    # Advance to interested — triggers bespoke pipeline eligibility
                    update_target_status(target["id"], "interested")
                    print(f"    ✓ Status updated to 'interested'")

                send_telegram_notification(
                    f"🟢 *POSITIVE REPLY* from *{target['company_name']}* ({target['territory']})\n"
                    f"Subject: {subject}\n"
                    f"Previous status: {target['status']}\n"
                    f"→ Auto-advanced to *interested*\n\n"
                    f"*Next steps:*\n"
                    f"• Reply to their email\n"
                    f"• Book a demo: `mark_stage.py {target['id']} demo_booked`"
                )

            replies.append({
                "target": target,
                "type": "reply",
                "subject": subject,
            })

        processed_ids.add(msg_id_str)

    state["processed_inbox_ids"] = list(processed_ids)[-500:]
    state["last_inbox_check"] = datetime.now().isoformat()

    if replies:
        stops = sum(1 for r in replies if r["type"] == "stop")
        positive = sum(1 for r in replies if r["type"] == "reply")
        print(f"\n  Detected {len(replies)} replies ({positive} positive, {stops} STOP)")
    else:
        print("  No new replies from targets")

    return replies


def check_drafts(imap: imaplib.IMAP4_SSL) -> int:
    """Count pending drafts."""
    print("\n--- Checking Drafts ---")

    imap.select('"[Gmail]/Drafts"', readonly=True)
    status, msg_ids = imap.search(None, "ALL")

    if status != "OK" or not msg_ids[0]:
        count = 0
    else:
        count = len(msg_ids[0].split())

    print(f"  Pending drafts: {count}")
    return count


def run_monitor(dry_run: bool = False, check_inbox_only: bool = False, check_sent_only: bool = False):
    """Run the full Gmail monitor cycle."""
    print(f"\n=== Gmail Monitor ===")
    print(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"  Mode: {'DRY RUN' if dry_run else 'LIVE'}")

    user, password = load_gmail_credentials()
    state = load_state()

    imap = imaplib.IMAP4_SSL("imap.gmail.com", 993)
    try:
        imap.login(user, password)
        print("  Connected to Gmail")

        sent_updates = []
        inbox_replies = []
        draft_count = 0

        if not check_inbox_only:
            sent_updates = check_sent_folder(imap, state, dry_run)

        if not check_sent_only:
            inbox_replies = check_inbox(imap, state, dry_run)

        if not check_inbox_only and not check_sent_only:
            draft_count = check_drafts(imap)

        # Save state
        if not dry_run:
            save_state(state)

        # Summary
        print(f"\n=== Monitor Summary ===")
        print(f"  Sent synced: {len(sent_updates)}")
        print(f"  Inbox replies: {len(inbox_replies)}")
        print(f"  Pending drafts: {draft_count}")

        if sent_updates or inbox_replies:
            summary_parts = []
            if sent_updates:
                summary_parts.append(f"{len(sent_updates)} sends synced")
            if inbox_replies:
                stops = sum(1 for r in inbox_replies if r["type"] == "stop")
                positive = sum(1 for r in inbox_replies if r["type"] == "reply")
                if positive:
                    summary_parts.append(f"{positive} positive replies")
                if stops:
                    summary_parts.append(f"{stops} STOP requests")

            send_telegram_notification(
                f"Gmail Monitor: {', '.join(summary_parts)}\n"
                f"Drafts pending: {draft_count}"
            )

    finally:
        try:
            imap.logout()
        except Exception:
            pass


def main():
    parser = argparse.ArgumentParser(description="Gmail monitoring daemon for outreach pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Preview without changes")
    parser.add_argument("--check-inbox", action="store_true", help="Only check inbox")
    parser.add_argument("--check-sent", action="store_true", help="Only check sent folder")

    args = parser.parse_args()
    run_monitor(
        dry_run=args.dry_run,
        check_inbox_only=args.check_inbox,
        check_sent_only=args.check_sent,
    )


if __name__ == "__main__":
    main()
