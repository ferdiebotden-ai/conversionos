#!/usr/bin/env python3
"""Generate personalized SMS drafts for pipeline targets.

Selects from 3 template variants based on owner name and Google presence.
Includes personalized demo mention + microsite link.
Stores drafts in the sms_draft column in Turso DB.

Usage:
    python scripts/update_sms_drafts.py --dry-run     # Preview all (default)
    python scripts/update_sms_drafts.py --send         # Write to DB
    python scripts/update_sms_drafts.py --id 42        # Single target
    python scripts/update_sms_drafts.py --id 42 --dry-run
"""

import argparse
import os
import sys
from datetime import datetime, timezone
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

sys.path.insert(0, str(SCRIPTS_DIR))
from db_utils import get_db


# --- Templates (v2: demo mention + microsite link) ---

TEMPLATE_A = (
    "Hi {name}, it's Ferdie from NorBot Systems. "
    "{rating}\u2605 across {reviews} reviews \u2014 that's why I picked {company} for our founding group in {city}. "
    "I've got a custom demo ready for you: www.norbotsystems.com/{slug} "
    "Reply STOP to opt out."
)

TEMPLATE_B = (
    "Hi {name}, it's Ferdie from NorBot Systems \u2014 sent you an email {time_ref}. "
    "Built a demo specifically for {company} showing how it'd look on your site: "
    "www.norbotsystems.com/{slug} "
    "Reply STOP to opt out."
)

TEMPLATE_C = (
    "Hi, it's Ferdie from NorBot Systems. "
    "Sent you an email {time_ref} about {company} \u2014 I built a custom demo for you. "
    "Take a look: www.norbotsystems.com/{slug} "
    "Reply STOP to opt out."
)


def compute_time_ref(contacted_at: str | None) -> str:
    """Compute a natural time reference from contacted_at timestamp."""
    if not contacted_at:
        return "recently"
    try:
        contacted = datetime.fromisoformat(contacted_at.replace("Z", "+00:00"))
        if contacted.tzinfo is None:
            contacted = contacted.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        days = (now - contacted).days
    except (ValueError, TypeError):
        return "recently"

    if days <= 1:
        return "yesterday"
    if days <= 3:
        return "a couple days ago"
    if days <= 6:
        return "earlier this week"
    return "last week"


GARBAGE_NAMES = {
    "not", "n/a", "na", "none", "unknown", "null", "undefined",
    "admin", "info", "contact", "owner", "litespeed", "test",
}


def _is_real_name(name: str | None) -> bool:
    """Check if an owner name is a real person name (not garbage data)."""
    if not name or not str(name).strip():
        return False
    first = str(name).strip().split()[0]
    lower = first.lower()
    if lower in GARBAGE_NAMES:
        return False
    if len(first) < 2:
        return False
    if "&" in first or (first.isupper() and len(first) <= 3):
        return False
    if "-" in first and first[0].isupper() and first.split("-")[1][:1].isupper():
        return False
    return True


def select_template(target: dict) -> tuple[str, str]:
    """Select the best template variant. Returns (template_name, template_string).

    A = Name known + strong Google (>= 4.5 stars, >= 20 reviews)
    B = Name known
    C = Name unknown
    """
    owner_name = target.get("owner_name")
    rating = target.get("google_rating")
    reviews = target.get("google_review_count")

    has_name = _is_real_name(owner_name)
    strong_google = (
        rating is not None
        and reviews is not None
        and float(rating) >= 4.5
        and int(reviews) >= 20
    )

    if has_name and strong_google:
        return "A", TEMPLATE_A
    if has_name:
        return "B", TEMPLATE_B
    return "C", TEMPLATE_C


def build_draft(target: dict) -> tuple[str, str]:
    """Build the SMS draft for a target. Returns (template_name, message)."""
    template_name, template = select_template(target)
    time_ref = compute_time_ref(target.get("contacted_at"))

    # Extract owner first name
    owner_name = target.get("owner_name") or ""
    first_name = str(owner_name).strip().split()[0] if owner_name else ""

    # City without province suffix
    city = target.get("city", "your area")
    company = target.get("company_name", "your company")
    slug = target.get("slug", "")

    message = template.format(
        name=first_name,
        time_ref=time_ref,
        city=city,
        company=company,
        slug=slug,
        rating=target.get("google_rating", ""),
        reviews=target.get("google_review_count", ""),
    )

    # Fix double period when company name ends with "." (e.g. "Ltd.")
    message = message.replace("..", ".")

    return template_name, message


def validate_draft(message: str) -> list[str]:
    """Run 7-point quality checklist. Returns list of failures."""
    failures = []
    lower = message.lower()

    # 1. Under 300 chars
    if len(message) > 300:
        failures.append(f"Over 300 chars ({len(message)})")
    # 2. Founder intro
    if "ferdie" not in lower or "norbot" not in lower:
        failures.append("Missing founder intro (Ferdie from NorBot Systems)")
    # 3. Reply STOP
    if "reply stop" not in lower:
        failures.append("Missing 'Reply STOP to opt out'")
    # 4. Microsite link present
    if "www.norbotsystems.com/" not in lower:
        failures.append("Missing microsite link (www.norbotsystems.com/{slug})")
    # 5. Personalized demo mention
    if "demo" not in lower:
        failures.append("Missing personalized demo mention")
    # 6. No ConversionOS
    if "conversionos" in lower:
        failures.append("Contains 'ConversionOS'")
    # 7. No pricing
    if "$" in message or "pricing" in lower or "15,000" in message or "497" in message:
        failures.append("Contains pricing")

    return failures


def process_target(target: dict, conn, dry_run: bool) -> bool:
    """Generate and optionally save SMS draft for one target. Returns True on success."""
    company = target["company_name"]
    target_id = target["id"]

    template_name, message = build_draft(target)
    failures = validate_draft(message)

    chars = len(message)
    segments = 1 if chars <= 160 else -(-chars // 153)

    if failures:
        print(f"  FAIL {company}: {', '.join(failures)}")
        return False

    print(f"  {'DRY RUN' if dry_run else 'SAVED'}: {company} (Template {template_name})")
    print(f"    {chars} chars, {segments} segment{'s' if segments > 1 else ''}")
    print(f"    {message}")

    if not dry_run:
        conn.execute(
            "UPDATE targets SET sms_draft = ?, updated_at = datetime('now') WHERE id = ?",
            (message, target_id),
        )
        print(f"    -> sms_draft updated in DB")

    return True


def main():
    parser = argparse.ArgumentParser(description="Generate personalized SMS drafts")
    parser.add_argument("--id", type=int, help="Target ID (single target)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing to DB (default)")
    parser.add_argument("--send", action="store_true", help="Actually write to DB (overrides dry-run)")
    parser.add_argument(
        "--status",
        default="email_1_sent",
        help="Target status to filter (default: email_1_sent)",
    )
    args = parser.parse_args()

    dry_run = not args.send

    if dry_run:
        print("=== DRY RUN (pass --send to write to DB) ===\n")

    with get_db() as conn:
        if args.id:
            row = conn.execute("SELECT * FROM targets WHERE id = ?", (args.id,)).fetchone()
            if not row:
                print(f"Target {args.id} not found")
                sys.exit(1)
            target = dict(row)
            process_target(target, conn, dry_run)
        else:
            rows = conn.execute(
                "SELECT * FROM targets WHERE status = ? AND phone IS NOT NULL ORDER BY score DESC",
                (args.status,),
            ).fetchall()
            targets = [dict(r) for r in rows]

            if not targets:
                print(f"No eligible targets found (status={args.status} with phone)")
                return

            print(f"Found {len(targets)} eligible target(s):\n")
            saved = 0
            for t in targets:
                if process_target(t, conn, dry_run):
                    saved += 1
                print()

            print(f"\n{'Would save' if dry_run else 'Saved'}: {saved}/{len(targets)} drafts")


if __name__ == "__main__":
    main()
