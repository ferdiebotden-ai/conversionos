#!/usr/bin/env python3
"""Send SMS to pipeline targets via Twilio.

Usage:
    python scripts/send_sms.py --id 42 --dry-run     # Preview
    python scripts/send_sms.py --id 42                # Send to one target
    python scripts/send_sms.py --all --dry-run        # Preview all eligible
    python scripts/send_sms.py --all                  # Send to all eligible

Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in scripts/.env
"""

import argparse
import os
import re
import sys
from pathlib import Path

# Load env vars from scripts/.env
SCRIPTS_DIR = Path(__file__).parent
ENV_FILE = SCRIPTS_DIR / ".env"


def load_env():
    """Load environment variables from scripts/.env (handles \\r)."""
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

# Now import db_utils (after env is loaded so TURSO vars are available)
sys.path.insert(0, str(SCRIPTS_DIR))
from db_utils import get_db, log_touch, update_target_status


SMS_TEMPLATE = (
    "Hey, sent you an email about a platform I built for {company_name}. "
    "Worth a quick look? www.norbotsystems.com/{slug} "
    "- Ferdie, NorBot Systems. Reply STOP to opt out."
)


def validate_casl(message: str) -> tuple[bool, str]:
    """Validate CASL compliance for SMS."""
    lower = message.lower()
    if "norbot" not in lower and "ferdie" not in lower:
        return False, "Missing business identification (NorBot Systems or Ferdie)"
    if "stop" not in lower:
        return False, "Missing opt-out mechanism (Reply STOP)"
    return True, ""


def normalize_phone(phone: str) -> str:
    """Normalize phone to E.164 format (+1XXXXXXXXXX)."""
    digits = re.sub(r"[^\d]", "", phone)
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    return f"+{digits}"


def validate_e164(phone: str) -> bool:
    """Validate E.164 Canadian phone number."""
    return bool(re.match(r"^\+1[2-9]\d{9}$", phone))


def send_sms(target: dict, dry_run: bool = True) -> bool:
    """Send SMS to a single target. Returns True on success."""
    company = target["company_name"]
    slug = target["slug"]
    phone = target.get("phone")
    target_id = target["id"]
    status = target["status"]

    if status != "email_1_sent":
        print(f"  SKIP {company}: status is '{status}', expected 'email_1_sent'")
        return False

    if not phone:
        print(f"  SKIP {company}: no phone number")
        return False

    normalized = normalize_phone(phone)
    if not validate_e164(normalized):
        print(f"  SKIP {company}: invalid phone '{phone}' -> '{normalized}'")
        return False

    # Use personalized draft from DB if available, fall back to generic template
    message = target.get("sms_draft") or SMS_TEMPLATE.format(company_name=company, slug=slug)

    # CASL check
    ok, reason = validate_casl(message)
    if not ok:
        print(f"  SKIP {company}: CASL failed — {reason}")
        return False

    chars = len(message)
    segments = 1 if chars <= 160 else -(-chars // 153)  # ceil division

    if dry_run:
        print(f"  DRY RUN: {company}")
        print(f"    To: {normalized} ({phone})")
        print(f"    Message ({chars} chars, {segments} segment{'s' if segments > 1 else ''}):")
        print(f"    {message}")
        return True

    # Actually send via Twilio
    try:
        from twilio.rest import Client
    except ImportError:
        print("  ERROR: twilio package not installed. Run: pip install twilio")
        return False

    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_number = os.environ.get("TWILIO_PHONE_NUMBER")

    if not all([account_sid, auth_token, from_number]):
        print("  ERROR: Missing Twilio credentials in environment.")
        print("  Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in scripts/.env")
        return False

    try:
        client = Client(account_sid, auth_token)
        result = client.messages.create(
            to=normalized,
            from_=from_number,
            body=message,
        )
        print(f"  SENT: {company} -> {normalized} (SID: {result.sid})")

        # Log touch and advance status
        log_touch(target_id, "sms", outcome="sent", notes=message)
        update_target_status(target_id, "sms_sent")
        print(f"  STATUS: {company}: email_1_sent -> sms_sent")
        return True

    except Exception as e:
        print(f"  ERROR: {company}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Send SMS to pipeline targets via Twilio")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--id", type=int, help="Target ID to send SMS to")
    group.add_argument("--all", action="store_true", help="Send to all eligible targets (email_1_sent)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without sending (default)")
    parser.add_argument("--send", action="store_true", help="Actually send (overrides dry-run)")
    args = parser.parse_args()

    # Default to dry-run unless --send is explicitly passed
    dry_run = not args.send

    if dry_run:
        print("=== DRY RUN (pass --send to actually send) ===\n")

    with get_db() as conn:
        if args.id:
            row = conn.execute("SELECT * FROM targets WHERE id = ?", (args.id,)).fetchone()
            if not row:
                print(f"Target {args.id} not found")
                sys.exit(1)
            target = dict(row)
            send_sms(target, dry_run=dry_run)

        elif args.all:
            rows = conn.execute(
                "SELECT * FROM targets WHERE status = 'email_1_sent' AND phone IS NOT NULL ORDER BY score DESC"
            ).fetchall()
            targets = [dict(r) for r in rows]

            if not targets:
                print("No eligible targets found (status=email_1_sent with phone)")
                return

            print(f"Found {len(targets)} eligible target(s):\n")
            sent = 0
            for t in targets:
                if send_sms(t, dry_run=dry_run):
                    sent += 1
                print()

            print(f"\n{'Would send' if dry_run else 'Sent'}: {sent}/{len(targets)}")


if __name__ == "__main__":
    main()
