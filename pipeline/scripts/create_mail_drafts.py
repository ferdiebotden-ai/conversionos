#!/usr/bin/env python3
"""Create Gmail drafts via IMAP APPEND from outbox email files.

Creates REAL drafts in Gmail that sync everywhere (Mac, iPhone, web).
The script ONLY creates drafts — it has zero send capability.
Ferdie reviews and sends manually from any device.

Usage:
    python scripts/create_mail_drafts.py --id 3 --email-num 1
    python scripts/create_mail_drafts.py --all --email-num 1
    python scripts/create_mail_drafts.py --id 3 --email-num 1 --dry-run
"""

import argparse
import html
import imaplib
import os
import re
import sys
import time
import uuid
from datetime import date, datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import get_artifact_url, get_target, get_targets_by_status

PROJECT_ROOT = Path(__file__).parent.parent
OUTBOX = PROJECT_ROOT / "outbox"
SCRIPTS_DIR = Path(__file__).parent

SENDER_NAME = "Ferdie"
SENDER_EMAIL = "ferdie@norbotsystems.com"

EMAIL_FILE_MAP = {
    1: "01_initial.md",
    2: "02_followup.md",
}


def load_gmail_credentials() -> tuple[str, str]:
    """Load Gmail IMAP credentials from scripts/.env or environment.

    Returns (gmail_user, gmail_app_password).
    Raises SystemExit if credentials are missing.
    """
    # Check env vars first
    user = os.environ.get("GMAIL_USER", "")
    password = os.environ.get("GMAIL_APP_PASSWORD", "")

    # Fall back to scripts/.env file
    if not (user and password):
        env_path = SCRIPTS_DIR / ".env"
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip().removeprefix("export").strip()
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


def _find_slug_dir(date_dir: Path, slug: str) -> Path | None:
    """Find outbox slug directory, handling slug mismatches.

    The DB slug may differ from the outbox folder name (e.g.,
    'way-mar-home-renovation-contractors' vs 'way-mar').
    Checks exact match first, then folders that start with the first
    word of the slug.
    """
    exact = date_dir / slug
    if exact.is_dir():
        return exact

    # Try prefix match (first part of slug before second hyphen-word)
    prefix = slug.split("-")[0]
    for d in date_dir.iterdir():
        if d.is_dir() and d.name.startswith(prefix):
            return d

    return None


def find_email_file(slug: str, email_num: int, outbox_date: str | None = None) -> Path | None:
    """Find the email markdown file for a target slug and email number."""
    filename = EMAIL_FILE_MAP.get(email_num)
    if not filename:
        return None

    if outbox_date:
        dates_to_check = [outbox_date]
    else:
        # Check today first, then scan for most recent
        dates_to_check = [date.today().isoformat()]
        if OUTBOX.exists():
            all_dates = sorted(
                [d.name for d in OUTBOX.iterdir() if d.is_dir()],
                reverse=True,
            )
            dates_to_check = all_dates if all_dates else dates_to_check

    for d in dates_to_check:
        date_dir = OUTBOX / d
        slug_dir = _find_slug_dir(date_dir, slug)
        if slug_dir:
            path = slug_dir / "email" / filename
            if path.exists():
                return path

    return None


def parse_email_md(md_path: Path) -> dict:
    """Parse an email markdown file into subject, body, and CASL footer."""
    text = md_path.read_text()
    lines = text.strip().split("\n")

    # Extract subject from header line like "**Recommended subject:** ..."
    subject = ""
    body_start = 0
    for i, line in enumerate(lines):
        if line.startswith("**Recommended subject:**"):
            subject = line.replace("**Recommended subject:**", "").strip()
            body_start = i + 1
            break
        if line.startswith("# Email"):
            body_start = i + 1
            continue

    # Skip past the --- separator after subject
    remaining = lines[body_start:]
    body_lines = []
    found_first_separator = False
    casl_lines = []
    in_casl = False

    for line in remaining:
        if not found_first_separator:
            if line.strip() == "---":
                found_first_separator = True
            continue

        # Check for CASL footer separator (last --- block)
        if line.strip() == "---" and not in_casl:
            in_casl = True
            continue

        if in_casl:
            casl_lines.append(line)
        else:
            body_lines.append(line)

    body = "\n".join(body_lines).strip()

    # Strip inline signature block ("— Name" + optional email line)
    # Handles both "— Ferdie\nferdie@..." and "— {{SENDER_NAME}}\n{{SENDER_EMAIL}}"
    body = re.sub(r'\n+—\s+.+(?:\n\S+@\S+.*)?$', '', body).strip()

    casl_footer = "\n".join(casl_lines).strip()

    return {
        "subject": subject,
        "body": body,
        "casl_footer": casl_footer,
    }


def fetch_email_from_blob(target_id: int, email_num: int) -> str | None:
    """Fetch email markdown from Vercel Blob when local outbox files are missing.

    The dashboard API uploads a combined email_draft.md to Blob with all 3 emails.
    This function fetches it and returns the raw markdown section for the requested
    email number.

    Returns:
        The raw markdown section for the requested email, or None if not found.
    """
    import urllib.request as _urllib_req

    # Try 'email' artifact type (dashboard stores combined email_draft.md as 'email')
    blob_url = get_artifact_url(target_id, "email")
    if not blob_url:
        blob_url = get_artifact_url(target_id, "email_initial")
    if not blob_url:
        return None

    try:
        req = _urllib_req.Request(blob_url)
        with _urllib_req.urlopen(req, timeout=15) as resp:
            content = resp.read().decode("utf-8")
    except Exception as e:
        print(f"    WARN: Failed to fetch email from Blob: {e}")
        return None

    # Split on "# Email N:" headers
    # Format: "# Email 1: Initial Outreach", "# Email 2: Follow-Up ...", "# Email 3: Breakup ..."
    sections = re.split(r'(?=^# Email \d+:)', content, flags=re.MULTILINE)
    sections = [s.strip() for s in sections if s.strip()]

    # Find the section matching the requested email number
    target_header = f"# Email {email_num}:"
    for section in sections:
        if section.startswith(target_header):
            return section

    return None


def parse_blob_email_md(raw_md: str) -> dict:
    """Parse a single email section from the Blob combined email_draft.md.

    Blob format (from ai-generate.ts formatEmailSequence):
        # Email N: Title

        **Subject lines (A/B test):**
        - subject option 1
        - subject option 2

        ---
        [email body]

        ---
        Ferdie Botden | NorBot Systems Inc. | PO Box 23030 Stratford PO Main, ...
        If you'd prefer not to hear from me, ...

    Returns dict with 'subject', 'body', 'casl_footer' keys.
    """
    lines = raw_md.strip().split("\n")

    # Extract subject lines (first bullet after "**Subject lines")
    subject = ""
    subject_section = False
    for line in lines:
        if "**Subject lines" in line or "**Subject line" in line:
            subject_section = True
            continue
        if subject_section and line.strip().startswith("- "):
            subject = line.strip().lstrip("- ").strip()
            break

    # Find body between first --- and second ---, CASL footer after second ---
    # Format: subject block | --- | body | --- | CASL footer | --- | (duplicate CASL) | ---
    separator_indices = [i for i, line in enumerate(lines) if line.strip() == "---"]

    body = ""
    casl_footer = ""

    if len(separator_indices) >= 2:
        # Body is between separator[0] and separator[1]
        body_start = separator_indices[0] + 1
        body_end = separator_indices[1]
        body = "\n".join(lines[body_start:body_end]).strip()

        # CASL footer is between separator[1] and separator[2] (or end of section)
        casl_start = separator_indices[1] + 1
        casl_end = separator_indices[2] if len(separator_indices) > 2 else len(lines)
        casl_footer = "\n".join(lines[casl_start:casl_end]).strip()

        # If CASL footer contains another email header, truncate there
        if "# Email " in casl_footer:
            casl_footer = casl_footer[:casl_footer.index("# Email ")].strip()
    elif len(separator_indices) == 1:
        # Only one separator — body is after it, no separate CASL block
        body = "\n".join(lines[separator_indices[0] + 1:]).strip()

    # Strip inline signature block if present
    body = re.sub(r'\n+—\s+.+(?:\n\S+@\S+.*)?$', '', body).strip()

    return {
        "subject": subject,
        "body": body,
        "casl_footer": casl_footer,
    }


def body_to_html(body: str, casl_footer: str) -> str:
    """Convert plain text email body to minimal HTML with clickable links.

    Converts 'Label: https://...' pattern into an HTML anchor tag.
    Style: looks like a hand-typed email — system font, no logos.
    Professional signature block at bottom.
    """
    # Escape HTML entities
    escaped = html.escape(body)

    # Convert markdown [text](url) to HTML anchor
    escaped = re.sub(
        r'\[([^\]]+)\]\((https?://[^\s)]+)\)',
        r'<a href="\2" style="color:#2563eb;text-decoration:underline">\1</a>',
        escaped,
    )

    # Convert any remaining bare URLs (https://...) to links
    escaped = re.sub(
        r'(?<!href=")(https?://\S+)',
        r'<a href="\1" style="color:#2563eb;text-decoration:underline">\1</a>',
        escaped,
    )

    # Convert www.norbotsystems.com/... plain URLs to clickable links
    escaped = re.sub(
        r'(?<!href=")(www\.norbotsystems\.com/[a-z0-9][a-z0-9-]*)',
        r'<a href="https://\1" style="color:#2563eb;text-decoration:underline">\1</a>',
        escaped,
    )

    # Convert double newlines to paragraph breaks with consistent spacing
    paragraphs = re.split(r'\n\n+', escaped)
    html_body = "\n".join(
        f'<p style="margin:0 0 16px 0">{p.strip()}</p>'
        for p in paragraphs if p.strip()
    )

    # Single newlines within paragraphs become <br>
    html_body = html_body.replace("\n", "<br>\n")

    # Professional signature block (table-based for cross-client reliability)
    sig_html = (
        '<table cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;'
        "border-top:1px solid #9ca3af;padding-top:14px;font-family:-apple-system,"
        "BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif\">"
        "<tr><td>"
        '<strong style="font-size:14px">Ferdie Botden, CPA</strong><br>'
        '<span style="font-size:13px;opacity:0.7">Founder, NorBot Systems Inc.</span><br>'
        '<a href="mailto:ferdie@norbotsystems.com" style="font-size:13px;color:#2563eb;'
        'text-decoration:none">ferdie@norbotsystems.com</a>'
        "</td></tr>"
        "</table>"
    )

    # CASL footer - muted style (opacity for dark mode compatibility)
    casl_html = ""
    if casl_footer:
        casl_escaped = html.escape(casl_footer)
        casl_html = f'\n<hr style="border:none;border-top:1px solid #9ca3af;margin:24px 0 12px">\n<p style="font-size:12px;line-height:1.4;opacity:0.5">{casl_escaped.replace(chr(10), "<br>")}</p>'

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;max-width:600px">
{html_body}
{sig_html}
{casl_html}
</body>
</html>"""


def build_mime_message(to_email: str, subject: str, text_body: str, html_body: str, casl_footer: str) -> tuple[str, str]:
    """Build an RFC 2822 MIME message string for Gmail IMAP APPEND.

    Returns (message_string, message_id) tuple. The message_id can be stored
    in the touches table for reply matching via In-Reply-To header.
    """
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    message_id = f"<{uuid.uuid4()}@outreach.norbotsystems.com>"
    msg["Message-ID"] = message_id
    msg["Date"] = datetime.now().strftime("%a, %d %b %Y %H:%M:%S %z")

    # Plain text version (body + signature + CASL)
    # Strip markdown link syntax for plain text: [text](url) -> text\nurl
    plain = re.sub(r'\[([^\]]+)\]\((https?://[^\s)]+)\)', r'\1\n\2', text_body)
    plain += "\n\n--\nFerdie Botden, CPA\nFounder, NorBot Systems Inc.\nferdie@norbotsystems.com"
    if casl_footer:
        plain += f"\n\n---\n{casl_footer}"

    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    return msg.as_string(), message_id


def append_to_gmail_drafts(message_str: str) -> bool:
    """Append a MIME message to Gmail Drafts via IMAP.

    This ONLY creates drafts. There is no SMTP code, no send function,
    no way for this to deliver email. Drafts-only by design.
    """
    user, password = load_gmail_credentials()

    imap = imaplib.IMAP4_SSL("imap.gmail.com", 993)
    try:
        imap.login(user, password)
        date_time = imaplib.Time2Internaldate(time.time())
        status, response = imap.append(
            "[Gmail]/Drafts",
            "\\Draft",
            date_time,
            message_str.encode("utf-8"),
        )
        if status != "OK":
            print(f"    IMAP APPEND failed: {response}")
            return False
        return True
    except imaplib.IMAP4.error as e:
        print(f"    IMAP error: {e}")
        return False
    finally:
        try:
            imap.logout()
        except Exception:
            pass


def validate_casl(parsed: dict) -> list[str]:
    """Validate CASL compliance. Returns list of violations (empty = compliant)."""
    violations = []
    footer = parsed.get("casl_footer", "")

    if "Ferdie Botden" not in footer:
        violations.append("Missing full sender name (need 'Ferdie Botden')")
    if "NorBot Systems" not in footer:
        violations.append("Missing business name (need 'NorBot Systems Inc.')")
    if "PO Box 23030" not in footer and "140 Dempsey" not in footer:
        violations.append("Missing mailing address (need 'PO Box 23030 Stratford PO Main')")
    if "N5A 7V8" not in footer and "N5A 0K5" not in footer:
        violations.append("Missing postal code (need 'N5A 7V8')")
    if "STOP" not in footer and "stop" not in footer:
        violations.append("Missing unsubscribe mechanism")

    return violations


def quality_score(parsed: dict, company: str) -> tuple[int, list[str]]:
    """Score email quality 0-10. Returns (score, list of issues).

    Threshold: 9/10 minimum (was 8/10).
    """
    score = 10
    issues = []
    body = parsed.get("body", "")
    subject = parsed.get("subject", "")

    # 1. Word count (max 80 body words, excluding signature/CASL)
    word_count = len(body.split())
    if word_count > 80:
        score -= 1
        issues.append(f"Body {word_count} words (max 80)")

    # 2. Subject: professional case, <50 chars, must contain company/owner/city
    if len(subject) > 50:
        score -= 1
        issues.append(f"Subject '{subject}' is {len(subject)} chars (max 50)")

    # 3. Subject MUST NOT contain "Ferdie" or "Botden"
    if "ferdie" in subject.lower() or "botden" in subject.lower():
        score -= 2
        issues.append("CRITICAL: Subject contains 'Ferdie'/'Botden' — NEVER allowed")

    # 3b. Subject MUST NOT contain banned patterns
    banned_subject_patterns = ["quick question", "just following up", "touching base"]
    for pattern in banned_subject_patterns:
        if pattern in subject.lower():
            score -= 1
            issues.append(f"Subject contains '{pattern}' — overused cold email pattern")
            break

    # 4. No banned terms in body or subject
    banned = ["conversionos", "artificial intelligence"]
    for term in banned:
        if term in body.lower():
            score -= 1
            issues.append(f"Body contains '{term}'")
            break
    if "conversionos" in subject.lower():
        score -= 1
        issues.append("Subject contains 'ConversionOS'")
    if " ai " in f" {body.lower()} " or body.lower().startswith("ai "):
        score -= 1
        issues.append("Body contains 'AI' — avoid tech jargon")

    # 5. Opening line must be specific (not generic pitch)
    first_line = body.split("\n")[0].strip() if body else ""
    generic_openers = ["i wanted", "our platform", "the platform", "we offer", "we help"]
    if any(first_line.lower().startswith(p) for p in generic_openers):
        score -= 1
        issues.append("Opens with generic pitch, not specific to prospect")

    # 6. One CTA link present
    md_links = re.findall(r'\[([^\]]+)\]\(https?://[^\s)]+\)', body)
    plain_urls = re.findall(r'www\.norbotsystems\.com/[a-z0-9][a-z0-9-]*', body)
    bare_urls = re.findall(r'(?<!\()https?://\S+', body)
    if not md_links and not plain_urls and not bare_urls:
        score -= 1
        issues.append("No CTA link found")

    # 7. No feature lists or bullet points
    if re.search(r'^\s*[-•]\s', body, re.MULTILINE):
        score -= 1
        issues.append("Contains bullet list (no feature lists in emails)")

    # 8. Full CASL footer
    casl_violations = validate_casl(parsed)
    if casl_violations:
        score -= 1
        issues.append(f"CASL: {'; '.join(casl_violations)}")

    return max(0, score), issues


def create_draft_for_target(target: dict, email_num: int, outbox_date: str | None, dry_run: bool, force: bool = False) -> bool:
    """Create a Gmail draft for a specific target and email number."""
    slug = target["slug"]
    company = target["company_name"]
    to_email = target.get("email") or ""

    if not to_email:
        print(f"  SKIP: {company} — no email address on file")
        return False

    md_path = find_email_file(slug, email_num, outbox_date)
    parsed = None
    source_label = None

    if md_path:
        source_label = str(md_path)
        parsed = parse_email_md(md_path)
    else:
        # Fallback: fetch from Vercel Blob
        target_id = target.get("id")
        if target_id:
            raw_section = fetch_email_from_blob(target_id, email_num)
            if raw_section:
                source_label = f"Blob (target {target_id}, email {email_num})"
                parsed = parse_blob_email_md(raw_section)

    if not parsed:
        print(f"  SKIP: {company} — email {email_num} not found in outbox or Blob")
        return False

    print(f"  Processing: {company} (Email {email_num})")
    print(f"    Source: {source_label}")

    if not parsed["subject"]:
        print(f"    WARN: No subject found, using safe fallback")
        parsed["subject"] = f"{company.lower().split()[0]}'s website"

    # CASL compliance gate
    casl_issues = validate_casl(parsed)
    if casl_issues and not force:
        print(f"    BLOCKED: CASL non-compliant — {'; '.join(casl_issues)}")
        print(f"    Use --force to override")
        return False

    # Quality scoring
    score, issues = quality_score(parsed, company)
    print(f"    Quality: {score}/10", end="")
    if issues:
        print(f" — {', '.join(issues)}")
    else:
        print()
    if score < 9 and not force:
        print(f"    BLOCKED: Score {score}/10 < 9 threshold. Use --force to override")
        return False

    html_body = body_to_html(parsed["body"], parsed["casl_footer"])
    message_str, message_id = build_mime_message(to_email, parsed["subject"], parsed["body"], html_body, parsed["casl_footer"])

    if dry_run:
        print(f"    To: {to_email}")
        print(f"    Subject: {parsed['subject']}")
        print(f"    Body: {len(parsed['body'].split())} words")
        print(f"    CASL: {'compliant' if not casl_issues else 'NON-COMPLIANT'}")
        print(f"    Message-ID: {message_id}")
        print(f"    [DRY RUN] Would append to Gmail Drafts via IMAP")
        return True

    if append_to_gmail_drafts(message_str):
        print(f"    Draft created in Gmail (syncs to all devices)")
        print(f"    Message-ID: {message_id}")
        return True

    return False


def main():
    parser = argparse.ArgumentParser(description="Create Gmail drafts via IMAP from outbox email files")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--id", type=int, help="Target ID")
    group.add_argument("--all", action="store_true", help="All draft_ready/reviewed targets")
    parser.add_argument("--email-num", type=int, required=True, choices=[1, 2],
                        help="Email number (1=initial, 2=follow-up)")
    parser.add_argument("--outbox-date", type=str, help="Outbox date folder (default: most recent)")
    parser.add_argument("--dry-run", action="store_true", help="Print summary without touching Gmail")
    parser.add_argument("--force", action="store_true", help="Override CASL/quality gates")
    parser.add_argument("--batch-size", type=int, default=15,
                        help="Max drafts per run (default: 15)")
    parser.add_argument("--delay", type=float, default=2.5,
                        help="Seconds between IMAP APPEND calls (default: 2.5)")

    args = parser.parse_args()

    print(f"\n=== Creating Gmail Drafts — Email {args.email_num} ===")

    targets = []
    if args.id:
        target = get_target(args.id)
        if not target:
            print(f"Target {args.id} not found.")
            sys.exit(1)
        targets = [target]
    else:
        targets = get_targets_by_status("draft_ready")
        if not targets:
            print("No targets in draft_ready status.")
            sys.exit(0)

    # Apply batch size cap
    if len(targets) > args.batch_size:
        print(f"  Capping at {args.batch_size} drafts (--batch-size). "
              f"{len(targets) - args.batch_size} remaining for next run.")
        targets = targets[:args.batch_size]

    success = 0
    for i, target in enumerate(targets):
        if create_draft_for_target(target, args.email_num, args.outbox_date, args.dry_run, force=args.force):
            success += 1

        # Rate limit between IMAP calls (skip on dry run and last item)
        if not args.dry_run and i < len(targets) - 1 and args.delay > 0:
            time.sleep(args.delay)

    print(f"\n=== Done: {success}/{len(targets)} drafts created ===")
    if not args.dry_run and success > 0:
        print("Drafts will appear in Gmail on all devices within 30 seconds.")


if __name__ == "__main__":
    main()
