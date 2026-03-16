#!/usr/bin/env python3
"""Fix mismatched slugs in Blob email drafts and recreate Gmail drafts.

The AI generation pipeline sometimes shortens slugs in email URLs
(e.g., 'ferretti' instead of 'ferretti-renovations'). This script:
1. Downloads the email_draft.md from Blob
2. Replaces the wrong slug with the correct DB slug
3. Re-uploads the fixed markdown to Blob (overwrite)
4. Deletes the old Gmail draft (search by To: address)
5. Creates a new Gmail draft with the corrected URL
"""

import imaplib
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import get_db, get_artifact_url, get_target
from create_mail_drafts import (
    load_gmail_credentials,
    fetch_email_from_blob,
    parse_blob_email_md,
    body_to_html,
    build_mime_message,
    append_to_gmail_drafts,
)


def get_blob_token() -> str:
    """Load BLOB_READ_WRITE_TOKEN from dashboard/.env.local."""
    env_path = Path(__file__).parent.parent / "dashboard" / ".env.local"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line.startswith("BLOB_READ_WRITE_TOKEN="):
                return line.split("=", 1)[1].strip().strip('"').strip("'").strip()
    return os.environ.get("BLOB_READ_WRITE_TOKEN", "")


def download_blob(url: str) -> str:
    """Download content from a Blob URL."""
    with urllib.request.urlopen(url, timeout=15) as resp:
        return resp.read().decode("utf-8")


def upload_blob(path: str, content: str, token: str) -> str:
    """Upload content to Vercel Blob, overwriting existing file."""
    # Use the @vercel/blob Node.js API via a temp script
    import subprocess
    import tempfile

    script = f"""
const {{ put }} = require('{Path(__file__).parent.parent}/dashboard/node_modules/@vercel/blob');
process.env.BLOB_READ_WRITE_TOKEN = {json.dumps(token)};

async function main() {{
    const content = require('fs').readFileSync(process.argv[2], 'utf-8');
    const result = await put({json.dumps(path)}, content, {{
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
    }});
    console.log(JSON.stringify({{ url: result.url }}));
}}
main().catch(e => {{ console.error(e); process.exit(1); }});
"""
    # Write script to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.cjs', delete=False) as f:
        f.write(script)
        script_path = f.name

    # Write content to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
        f.write(content)
        content_path = f.name

    try:
        result = subprocess.run(
            ['node', script_path, content_path],
            capture_output=True, text=True, timeout=30,
            cwd=str(Path(__file__).parent.parent / "dashboard"),
        )
        if result.returncode != 0:
            print(f"    Blob upload error: {result.stderr[:300]}")
            return ""
        data = json.loads(result.stdout.strip())
        return data["url"]
    finally:
        os.unlink(script_path)
        os.unlink(content_path)


def delete_gmail_draft_by_to(to_email: str) -> int:
    """Delete Gmail drafts addressed to a specific email. Returns count deleted."""
    user, password = load_gmail_credentials()

    imap = imaplib.IMAP4_SSL("imap.gmail.com", 993)
    deleted = 0
    try:
        imap.login(user, password)
        imap.select("[Gmail]/Drafts")

        # Search for drafts to this email
        status, data = imap.search(None, f'TO "{to_email}"')
        if status != "OK" or not data[0]:
            return 0

        msg_ids = data[0].split()
        for msg_id in msg_ids:
            imap.store(msg_id, "+FLAGS", "\\Deleted")
            deleted += 1

        if deleted:
            imap.expunge()

    except imaplib.IMAP4.error as e:
        print(f"    IMAP error: {e}")
    finally:
        try:
            imap.logout()
        except Exception:
            pass

    return deleted


def fix_target(target_id: int, wrong_slug: str, correct_slug: str, dry_run: bool = False):
    """Fix the email slug for a single target."""
    target = get_target(target_id)
    if not target:
        print(f"  Target {target_id} not found")
        return False

    company = target["company_name"]
    to_email = target.get("email", "")
    print(f"\n=== Fixing {company} (ID {target_id}) ===")
    print(f"  Wrong slug:   {wrong_slug}")
    print(f"  Correct slug: {correct_slug}")
    print(f"  Email: {to_email}")

    # Step 1: Get the Blob URL for the email artifact
    blob_url = get_artifact_url(target_id, "email") or get_artifact_url(target_id, "email_initial")
    if not blob_url:
        print(f"  ERROR: No email artifact found in DB")
        return False

    print(f"  Blob URL: {blob_url}")

    # Step 2: Download and fix the content
    try:
        content = download_blob(blob_url)
    except Exception as e:
        print(f"  ERROR: Failed to download: {e}")
        return False

    wrong_url = f"www.norbotsystems.com/{wrong_slug}"
    correct_url = f"www.norbotsystems.com/{correct_slug}"
    occurrences = content.count(wrong_url)

    if occurrences == 0:
        print(f"  No occurrences of '{wrong_url}' found — checking...")
        # Double-check with regex
        all_urls = re.findall(r'www\.norbotsystems\.com/([a-z0-9-]+)', content)
        print(f"  All URLs found: {set(all_urls)}")
        if correct_slug in all_urls and wrong_slug not in all_urls:
            print(f"  Already correct — skipping")
            return True
        return False

    fixed_content = content.replace(wrong_url, correct_url)
    print(f"  Fixed {occurrences} URL occurrences")

    if dry_run:
        print(f"  [DRY RUN] Would upload fixed content and recreate Gmail draft")
        return True

    # Step 3: Re-upload to Blob
    token = get_blob_token()
    if not token:
        print(f"  ERROR: No BLOB_READ_WRITE_TOKEN found")
        return False

    # Extract the Blob path from the URL
    # URL format: https://ene7zidqbpxuzjzd.public.blob.vercel-storage.com/artifacts/...
    blob_path_match = re.search(r'\.com/(artifacts/.+)$', blob_url)
    if not blob_path_match:
        print(f"  ERROR: Can't extract Blob path from URL")
        return False

    blob_path = blob_path_match.group(1)
    print(f"  Uploading fixed content to: {blob_path}")

    new_url = upload_blob(blob_path, fixed_content, token)
    if not new_url:
        print(f"  ERROR: Blob upload failed")
        return False
    print(f"  Uploaded: {new_url}")

    # Step 4: Delete old Gmail draft
    print(f"  Deleting old Gmail draft(s) for {to_email}...")
    deleted = delete_gmail_draft_by_to(to_email)
    print(f"  Deleted {deleted} draft(s)")

    # Small delay for IMAP sync
    time.sleep(1)

    # Step 5: Create new Gmail draft
    print(f"  Creating new Gmail draft...")
    raw_section = fetch_email_from_blob(target_id, 1)
    if not raw_section:
        print(f"  ERROR: Can't fetch Email 1 from Blob after fix")
        return False

    parsed = parse_blob_email_md(raw_section)
    if not parsed["subject"]:
        print(f"  ERROR: No subject found in parsed email")
        return False

    html_body = body_to_html(parsed["body"], parsed["casl_footer"])
    mime = build_mime_message(to_email, parsed["subject"], parsed["body"], html_body, parsed["casl_footer"])

    if append_to_gmail_drafts(mime):
        print(f"  New draft created successfully")
        return True
    else:
        print(f"  ERROR: Failed to create Gmail draft")
        return False


def main():
    # Targets with mismatched slugs (excluding KWC which was already sent + aliased)
    fixes = [
        (506, "hemeryck-homes", "hemeryck-homes-construction-ltd"),
        (507, "ferretti", "ferretti-renovations"),
        (522, "high-tier-construction", "high-tier-construction-inc"),
        (525, "conpro-contracting", "conpro-contracting-ltd"),
    ]

    dry_run = "--dry-run" in sys.argv

    print("=== Email Slug Fix Script ===")
    print(f"Fixing {len(fixes)} targets")
    if dry_run:
        print("[DRY RUN MODE]")

    results = []
    for target_id, wrong, correct in fixes:
        ok = fix_target(target_id, wrong, correct, dry_run)
        results.append((target_id, ok))

    print(f"\n=== Results ===")
    for tid, ok in results:
        print(f"  ID {tid}: {'OK' if ok else 'FAILED'}")


if __name__ == "__main__":
    main()
