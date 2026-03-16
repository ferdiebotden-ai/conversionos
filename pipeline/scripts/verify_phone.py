#!/usr/bin/env python3
"""Verify phone numbers to determine line type (mobile, landline, voip).

Uses Twilio Lookup API (primary, $0.005/lookup) or NumVerify (fallback).

Usage:
    python scripts/verify_phone.py --id 1                 # Verify one target
    python scripts/verify_phone.py --all                   # All unverified targets
    python scripts/verify_phone.py --all --dry-run         # Preview without updating DB
    python scripts/verify_phone.py --all --provider numverify  # Force NumVerify
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse
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


# Known bad numbers to flag
BAD_PATTERNS = [
    (r"555-\d{4}", "fictional 555 number"),
    (r"^1?8[0-9]{2}", "toll-free number"),
]


def normalize_e164(phone: str) -> str:
    """Normalize to E.164 (+1XXXXXXXXXX)."""
    digits = re.sub(r"[^\d]", "", phone)
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    return f"+{digits}"


def is_bad_number(phone: str) -> tuple[bool, str]:
    """Check if number matches known bad patterns."""
    if not phone or not phone.strip():
        return True, "empty phone"
    digits = re.sub(r"[^\d]", "", phone)
    # 555 numbers
    if "555" in phone and re.search(r"555-?\d{4}", phone):
        return True, "fictional 555 number"
    # Toll-free (800, 833, 844, 855, 866, 877, 888)
    clean = digits[-10:] if len(digits) >= 10 else digits
    if clean[:3] in ("800", "833", "844", "855", "866", "877", "888"):
        return True, "toll-free number (can't receive SMS)"
    return False, ""


def verify_twilio(phone: str) -> dict:
    """Use Twilio Lookup API to classify phone number.

    Returns dict with: valid, line_type, carrier.
    Cost: $0.005/lookup.
    """
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")

    if not account_sid or not auth_token:
        return {"valid": False, "line_type": None, "carrier": None, "error": "Missing Twilio credentials"}

    e164 = normalize_e164(phone)

    # Twilio Lookup v2 API
    url = f"https://lookups.twilio.com/v2/PhoneNumbers/{urllib.parse.quote(e164)}?Fields=line_type_intelligence"

    # Basic auth
    import base64
    credentials = base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode()

    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Basic {credentials}")

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else ""
        return {"valid": False, "line_type": None, "carrier": None, "error": f"HTTP {e.code}: {error_body[:200]}"}
    except Exception as e:
        return {"valid": False, "line_type": None, "carrier": None, "error": str(e)}

    # Parse Twilio Lookup v2 response
    valid = data.get("valid", False)
    lti = data.get("line_type_intelligence") or {}
    error_code = lti.get("error_code")
    line_type = lti.get("type")  # mobile, landline, fixedVoip, nonFixedVoip, tollFree, etc.
    carrier = lti.get("carrier_name")

    # Error 60601 = Line Type Intelligence not enabled in Twilio Console
    if error_code == 60601:
        return {
            "valid": valid,
            "line_type": None,
            "carrier": None,
            "error": "Line Type Intelligence not enabled. Enable at: https://console.twilio.com/ → Lookup → Install 'Carrier Lookups' add-on ($0.005/lookup)",
        }

    # Normalize Twilio types to our categories
    type_map = {
        "mobile": "mobile",
        "landline": "landline",
        "fixedVoip": "voip",
        "nonFixedVoip": "voip",
        "voip": "voip",
        "tollFree": "landline",  # Can't receive SMS
        "pager": "landline",
        "personal": "mobile",
    }
    normalized_type = type_map.get(line_type, "unknown") if line_type else "unknown"

    return {
        "valid": valid,
        "line_type": normalized_type,
        "carrier": carrier,
        "raw_type": line_type,
    }


def verify_numverify(phone: str) -> dict:
    """Use NumVerify API to classify phone number (fallback).

    Returns dict with: valid, line_type, carrier, location.
    """
    api_key = os.environ.get("NUMVERIFY_API_KEY", "")
    if not api_key:
        return {"valid": False, "line_type": None, "carrier": None, "error": "Missing NUMVERIFY_API_KEY"}

    digits = re.sub(r"[^\d]", "", phone)
    if len(digits) == 10:
        digits = "1" + digits

    params = urllib.parse.urlencode({
        "access_key": api_key,
        "number": digits,
        "country_code": "CA",
    })
    url = f"http://apilayer.net/api/validate?{params}"

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
    except Exception as e:
        return {"valid": False, "line_type": None, "carrier": None, "error": str(e)}

    if not data.get("valid"):
        return {
            "valid": False,
            "line_type": None,
            "carrier": data.get("carrier"),
        }

    return {
        "valid": True,
        "line_type": data.get("line_type"),  # mobile, landline, voip
        "carrier": data.get("carrier"),
    }


def update_phone_type(target_id: int, phone_type: str, dry_run: bool = False):
    """Set phone_type column on a target."""
    if dry_run:
        print(f"    [DRY RUN] Would set phone_type='{phone_type}' for target {target_id}")
        return
    with get_db() as conn:
        conn.execute(
            "UPDATE targets SET phone_type = ?, updated_at = datetime('now') WHERE id = ?",
            [phone_type, target_id],
        )
    print(f"    Updated phone_type='{phone_type}' for target {target_id}")


def process_target(target: dict, provider: str, dry_run: bool = False) -> str | None:
    """Verify phone for a single target. Returns phone_type or None."""
    phone = target.get("phone")
    company = target.get("company_name", "Unknown")
    target_id = target["id"]

    if not phone or not str(phone).strip():
        print(f"  {company}: No phone number, skipping")
        return None

    # Check for known bad numbers first
    is_bad, reason = is_bad_number(phone)
    if is_bad:
        print(f"  {company} ({phone}): BAD NUMBER — {reason}")
        update_phone_type(target_id, "invalid", dry_run)
        return "invalid"

    print(f"  {company} ({phone})...")

    if provider == "twilio":
        result = verify_twilio(phone)
    else:
        result = verify_numverify(phone)

    if result.get("error"):
        print(f"    API error: {result['error']}")
        return None

    if not result["valid"]:
        print(f"    Invalid number -> 'unknown'")
        update_phone_type(target_id, "unknown", dry_run)
        return "unknown"

    phone_type = result["line_type"] or "unknown"
    carrier = result.get("carrier") or "unknown carrier"
    raw = result.get("raw_type", "")
    raw_info = f" (raw: {raw})" if raw and raw != phone_type else ""

    print(f"    {phone_type}{raw_info} — {carrier}")
    update_phone_type(target_id, phone_type, dry_run)
    return phone_type


def main():
    parser = argparse.ArgumentParser(description="Verify phone numbers and determine line type")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--id", type=int, help="Target ID to verify")
    group.add_argument("--all", action="store_true", help="Verify all unverified targets")
    parser.add_argument("--dry-run", action="store_true", help="Preview without updating DB")
    parser.add_argument(
        "--provider",
        choices=["twilio", "numverify"],
        default="twilio",
        help="Lookup provider (default: twilio, $0.005/lookup)",
    )
    parser.add_argument(
        "--status",
        default=None,
        help="Filter by target status (e.g. 'email_1_sent'). Default: all with phone",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.5,
        help="Delay between API calls in seconds (default: 0.5)",
    )
    args = parser.parse_args()

    # Validate provider credentials
    if args.provider == "twilio":
        if not os.environ.get("TWILIO_ACCOUNT_SID") or not os.environ.get("TWILIO_AUTH_TOKEN"):
            print("ERROR: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN required for Twilio Lookup.")
            print("Set them in scripts/.env or environment.")
            sys.exit(1)
        print(f"Provider: Twilio Lookup API ($0.005/lookup)\n")
    else:
        if not os.environ.get("NUMVERIFY_API_KEY"):
            print("ERROR: NUMVERIFY_API_KEY required for NumVerify.")
            sys.exit(1)
        print(f"Provider: NumVerify API\n")

    if args.id:
        with get_db() as conn:
            row = conn.execute("SELECT * FROM targets WHERE id = ?", [args.id]).fetchone()
        if not row:
            print(f"Target {args.id} not found")
            sys.exit(1)
        print(f"Verifying phone for target {args.id}:")
        process_target(dict(row), args.provider, args.dry_run)

    elif args.all:
        status_filter = ""
        filter_args = []
        if args.status:
            status_filter = " AND status = ?"
            filter_args = [args.status]

        with get_db() as conn:
            rows = conn.execute(
                f"SELECT * FROM targets WHERE phone IS NOT NULL AND phone != '' AND (phone_type IS NULL OR phone_type = ''){status_filter} ORDER BY score DESC",
                filter_args,
            ).fetchall()
        targets = [dict(r) for r in rows]

        if not targets:
            print("No targets with unverified phone numbers found.")
            return

        print(f"Found {len(targets)} target(s) with unverified phones:\n")

        counts = {"mobile": 0, "landline": 0, "voip": 0, "unknown": 0, "invalid": 0, "error": 0}
        for i, t in enumerate(targets):
            result = process_target(t, args.provider, args.dry_run)
            if result:
                counts[result] = counts.get(result, 0) + 1
            else:
                counts["error"] += 1

            # Rate limiting
            if i < len(targets) - 1:
                time.sleep(args.delay)

        print(f"\n=== Summary ===")
        for ptype, count in sorted(counts.items()):
            if count > 0:
                sms_ok = "can SMS" if ptype in ("mobile", "voip") else "NO SMS"
                print(f"  {ptype}: {count} ({sms_ok})")

        smsable = counts.get("mobile", 0) + counts.get("voip", 0)
        print(f"\nSMS-eligible: {smsable}/{len(targets)}")
        if not args.dry_run and args.provider == "twilio":
            cost = len(targets) * 0.005
            print(f"Lookup cost: ~${cost:.2f}")

    print("\nDone.")


if __name__ == "__main__":
    main()
