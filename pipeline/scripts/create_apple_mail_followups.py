#!/usr/bin/env python3
"""
Create Apple Mail drafts for Round 2 follow-up emails with PDF attachments.

Each email is personalized, casual (from Ferdie), and includes the target's
one-pager PDF as an attachment. Uses osascript/AppleScript to create drafts
in Apple Mail's Drafts folder.

Usage:
    python3 create_apple_mail_followups.py          # Create all drafts
    python3 create_apple_mail_followups.py --dry-run # Preview without creating
    python3 create_apple_mail_followups.py --id 45   # Single target only
"""

import os
import sys
import json
import time
import tempfile
import subprocess
import urllib.request
import quopri
from pathlib import Path
from dotenv import load_dotenv

# Load environment
SCRIPT_DIR = Path(__file__).parent
load_dotenv(SCRIPT_DIR / ".env")

TURSO_URL = os.environ["TURSO_DATABASE_URL"].replace("libsql://", "https://")
TURSO_TOKEN = os.environ["TURSO_AUTH_TOKEN"]
PDF_DIR = SCRIPT_DIR.parent / "outbox" / "pdfs"
SENDER_EMAIL = "ferdie@norbotsystems.com"

# ── Turso HTTP helper ──────────────────────────────────────────────
def turso_query(sql):
    payload = json.dumps({
        "requests": [
            {"type": "execute", "stmt": {"sql": sql}},
            {"type": "close"}
        ]
    }).encode()
    req = urllib.request.Request(
        f"{TURSO_URL}/v2/pipeline",
        data=payload,
        headers={
            "Authorization": f"Bearer {TURSO_TOKEN}",
            "Content-Type": "application/json",
        },
    )
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read())
    result = data["results"][0]["response"]["result"]
    cols = [c["name"] for c in result["cols"]]
    rows = []
    for row in result["rows"]:
        vals = {}
        for i, col in enumerate(cols):
            cell = row[i]
            vals[col] = cell["value"] if cell["type"] != "null" else None
        rows.append(vals)
    return rows


# ── Decode MIME-encoded subject lines ──────────────────────────────
def decode_subject(subj):
    if not subj:
        return None
    if "=?utf-8?" in subj.lower():
        # Handle =?utf-8?Q?...?= encoding
        try:
            parts = subj.split("?")
            if len(parts) >= 4 and parts[2].upper() == "Q":
                decoded = quopri.decodestring(parts[3].replace("_", " ").encode()).decode("utf-8")
                return decoded
        except Exception:
            pass
    return subj


# ── Determine greeting name ────────────────────────────────────────
def get_greeting(owner_name, company_name):
    """Return a casual first-name greeting or fallback."""
    if not owner_name or owner_name in ("", "None", "Not specified", "N/A",
                                         "Not provided", "not provided",
                                         "LiteSpeed Technologies Inc."):
        return "Hi there"
    # Handle "Chris and Shane" -> "Chris"
    name = owner_name.split(" and ")[0].split(",")[0].split("&")[0].strip()
    # Handle "R&M Bathroom & Kitchen" - it's a company name, not a person
    if any(w in name.lower() for w in ["inc", "ltd", "construction", "homes",
                                        "renovations", "kitchen", "bath",
                                        "contracting", "high-tier"]):
        return "Hi there"
    # Get first name only
    first = name.split()[0] if name else None
    if first and len(first) > 1:
        return f"Hi {first}"
    return "Hi there"


# ── Short company name (for subject line) ──────────────────────────
def short_name(company_name):
    """Kirk's Renovations -> Kirk's, Go Hard Corporation -> Go Hard, etc."""
    name = company_name
    for suffix in [" Construction Inc", " Construction Ltd.",
                   " Construction Ltd", " Construction",
                   " Contracting Ltd.", " Contracting Ltd",
                   " Contracting", " Renovations Co.",
                   " Renovations Inc.", " Renovations",
                   " Home Renovation Contractors",
                   " Group Ltd.", " Group", " Inc.",
                   " Inc", " Ltd.", " Ltd",
                   " - Kitchen and Bath"]:
        if name.endswith(suffix):
            name = name[: -len(suffix)]
            break
    return name.strip()


# ── Generate personalized email body ───────────────────────────────

ANGLES = [
    # (condition_fn, body_template)
    # Speed angle - for companies with high reviews
    lambda t: int(t.get("google_review_count") or 0) >= 50,
    # Years angle - for established companies
    lambda t: int(t.get("years_in_business") or 0) >= 15,
    # Rating angle - for 5-star companies
    lambda t: float(t.get("google_rating") or 0) >= 4.9,
]


def generate_email(target, email1_subject):
    """Generate a personalized follow-up email body and subject."""
    greeting = get_greeting(target["owner_name"], target["company_name"])
    sname = short_name(target["company_name"])
    slug = target["slug"]
    city = target["city"]
    rating = float(target.get("google_rating") or 0)
    reviews = int(target.get("google_review_count") or 0)
    years = int(target.get("years_in_business") or 0)
    services_raw = target.get("services") or "[]"
    try:
        services = json.loads(services_raw) if isinstance(services_raw, str) else services_raw
    except (json.JSONDecodeError, TypeError):
        services = []

    # Decode email 1 subject for "re:" format
    decoded_subj = decode_subject(email1_subject)

    # Pick subject line - prefer "re:" if we have original subject
    # But skip overly salesy/auto-generated subjects
    skip_subjects = {"your demo opportunity - transform your business"}
    if decoded_subj and decoded_subj.lower().strip() not in skip_subjects:
        subject = f"re: {decoded_subj}"
    else:
        subject = f"{sname.lower()} — quick follow-up"

    # Pick angle based on company characteristics
    # Each email should feel hand-written and different from email 1

    if reviews >= 75:
        # Speed/volume angle for high-review companies
        angle_sentence = (
            f"When someone's comparing contractors, the first one to respond "
            f"usually wins the job. With {reviews} reviews, {sname} clearly "
            f"delivers — but speed to quote is the new battleground."
        )
    elif years >= 20:
        # Efficiency angle for long-established companies
        angle_sentence = (
            f"After {years} years in {city}, you've probably seen the "
            f"industry shift a dozen times. This one's about speed — "
            f"homeowners now expect a ballpark within hours, not days."
        )
    elif rating >= 4.8 and reviews >= 20:
        # Reputation + capture angle
        angle_sentence = (
            f"{rating} stars is hard to earn — but a lot of the people "
            f"Googling \"{city} renovation contractor\" at 9pm never make "
            f"it past your homepage. That's the gap I'm trying to close."
        )
    elif years >= 10:
        # Growth angle for mid-tenure companies
        angle_sentence = (
            f"You've built something real over {years} years in {city}. "
            f"The contractors I'm talking to all say the same thing — "
            f"plenty of interest, not enough hours to chase every quote."
        )
    elif services and len(services) >= 4:
        # Services breadth angle — use a clean primary service name
        primary_raw = services[0] if services else "renovation"
        # Normalize to simple lowercase form
        primary = primary_raw.strip().lower().rstrip("s")
        if len(primary) > 25:
            primary = "renovation"  # fallback if too long/complex
        angle_sentence = (
            f"When a homeowner searches for a {primary} contractor "
            f"in {city}, there's a window of about 30 minutes where "
            f"they're ready to commit. After that, they move on. "
            f"That's the moment this catches."
        )
    else:
        # Generic but personal angle
        angle_sentence = (
            f"I've been talking to a few contractors in {city} this week, "
            f"and the ones who respond first to quote requests are closing "
            f"at 3x the rate. Figured it was worth flagging."
        )

    # Build body
    body = f"""{greeting} — quick follow-up.

{angle_sentence}

I attached a one-pager showing what I built for {sname} — takes 30 seconds to skim. The full interactive version is here:

www.norbotsystems.com/{slug}

Worth a look, or should I close this out?

Cheers,
Ferdie

---

Ferdie Botden | NorBot Systems Inc. | 140 Dempsey Dr, Stratford, ON N5A 0K5
If you'd prefer not to hear from me, just reply STOP and I'll remove you immediately."""

    return subject, body


# ── Apple Mail draft creation via AppleScript ──────────────────────
def create_apple_mail_draft(to_email, subject, body, pdf_path):
    """Create a draft in Apple Mail with PDF attachment using AppleScript.

    Writes AppleScript to a temp file to avoid shell escaping issues with
    em-dashes, smart quotes, and other Unicode characters.
    """

    # Escape for AppleScript string literals (inside double quotes)
    def escape_as(s):
        return (s
                .replace("\\", "\\\\")
                .replace('"', '\\"')
                .replace("\n", "\\n")
                .replace("\t", "\\t"))

    escaped_body = escape_as(body)
    escaped_subject = escape_as(subject)
    escaped_to = escape_as(to_email)
    escaped_pdf = str(pdf_path)

    applescript = f'''tell application "Mail"
    set newMsg to make new outgoing message with properties {{subject:"{escaped_subject}", content:"{escaped_body}", visible:false}}
    tell newMsg
        set sender to "{SENDER_EMAIL}"
        make new to recipient at end of to recipients with properties {{address:"{escaped_to}"}}
    end tell
    save newMsg
    delay 1

    -- Attach the PDF
    tell newMsg
        make new attachment with properties {{file name:(POSIX file "{escaped_pdf}")}} at after last paragraph
    end tell
    save newMsg
end tell
'''

    # Write to temp file to avoid shell escaping issues with Unicode
    with tempfile.NamedTemporaryFile(mode="w", suffix=".scpt", delete=False,
                                      encoding="utf-8") as f:
        f.write(applescript)
        tmp_path = f.name

    try:
        result = subprocess.run(
            ["osascript", tmp_path],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode != 0:
            raise RuntimeError(f"AppleScript error: {result.stderr.strip()}")
    finally:
        os.unlink(tmp_path)

    return True


# ── Main ───────────────────────────────────────────────────────────
def main():
    dry_run = "--dry-run" in sys.argv
    single_id = None
    if "--id" in sys.argv:
        idx = sys.argv.index("--id")
        single_id = sys.argv[idx + 1]

    print("=" * 60)
    print("Round 2 Follow-Up Email Draft Creator — Apple Mail")
    print("=" * 60)
    if dry_run:
        print(">>> DRY RUN MODE — no drafts will be created <<<\n")

    # 1. Get all targets that received email_initial
    print("Querying Turso for targets with email_initial touches...")
    targets = turso_query("""
        SELECT DISTINCT t.id, t.company_name, t.slug, t.city, t.territory,
               t.email, t.owner_name, t.google_rating, t.google_review_count,
               t.status, t.services, t.website, t.score, t.years_in_business,
               t.phone
        FROM targets t
        INNER JOIN touches tc ON t.id = tc.target_id AND tc.type = 'email_initial'
        WHERE t.email IS NOT NULL AND t.email != ''
          AND t.email NOT IN ('Not provided', 'N/A', 'not provided')
          AND t.status NOT IN ('disqualified', 'closed_lost', 'discovered',
                               'demo_booked', 'interested', 'closed_won')
        ORDER BY t.score DESC
    """)

    # 2. Get email 1 subjects from touches
    print("Getting original email 1 subject lines...")
    touches = turso_query("""
        SELECT target_id, subject FROM touches
        WHERE type = 'email_initial' AND subject IS NOT NULL AND subject != ''
        ORDER BY created_at ASC
    """)
    email1_subjects = {}
    for t in touches:
        if t["target_id"] not in email1_subjects:
            email1_subjects[t["target_id"]] = t["subject"]

    # 3. Get targets that already received email_followup
    print("Checking which targets already got follow-up...")
    followups = turso_query(
        "SELECT DISTINCT target_id FROM touches WHERE type = 'email_followup'"
    )
    already_followup = {f["target_id"] for f in followups}

    # 4. Deduplicate targets
    seen = set()
    eligible = []
    for target in targets:
        tid = target["id"]
        if tid in seen:
            continue
        seen.add(tid)

        # Skip if already got follow-up
        if tid in already_followup:
            continue

        # Check PDF exists
        pdf_path = PDF_DIR / f"{target['slug']}-one-pager.pdf"
        if not pdf_path.exists():
            print(f"  SKIP {target['company_name']} — no PDF at {pdf_path.name}")
            continue

        if single_id and tid != single_id:
            continue

        target["_pdf_path"] = pdf_path
        target["_email1_subject"] = email1_subjects.get(tid)
        eligible.append(target)

    print(f"\n{'─' * 60}")
    print(f"Eligible targets for Round 2 follow-up: {len(eligible)}")
    print(f"{'─' * 60}\n")

    # 5. Generate and create drafts
    created = 0
    errors = []
    for i, target in enumerate(eligible, 1):
        company = target["company_name"]
        email = target["email"]
        pdf_path = target["_pdf_path"]

        subject, body = generate_email(target, target["_email1_subject"])

        print(f"[{i}/{len(eligible)}] {company}")
        print(f"  To: {email}")
        print(f"  Subject: {subject}")
        print(f"  PDF: {pdf_path.name}")

        if dry_run:
            print(f"  Body preview: {body[:120]}...")
            print()
            continue

        try:
            create_apple_mail_draft(email, subject, body, pdf_path)
            created += 1
            print(f"  ✓ Draft created in Apple Mail")
            # Small delay between drafts to avoid overwhelming Mail.app
            if i < len(eligible):
                time.sleep(1.5)
        except Exception as e:
            errors.append((company, str(e)))
            print(f"  ✗ ERROR: {e}")
        print()

    # 6. Summary
    print(f"\n{'=' * 60}")
    print(f"SUMMARY")
    print(f"{'=' * 60}")
    print(f"Total eligible: {len(eligible)}")
    if not dry_run:
        print(f"Drafts created: {created}")
        if errors:
            print(f"Errors: {len(errors)}")
            for company, err in errors:
                print(f"  - {company}: {err}")
    print(f"\nAll drafts are in Apple Mail → Drafts folder.")
    print(f"Review each one, then send manually.\n")


if __name__ == "__main__":
    main()
