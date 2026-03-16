#!/usr/bin/env python3
"""Audit all Gmail drafts: cross-check norbotsystems URLs against DB slugs."""

import imaplib
import email
import re
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import get_db


def main():
    # Step 1: Get all targets with their slugs
    with get_db() as conn:
        rows = conn.execute('''
            SELECT id, company_name, email, slug, status
            FROM targets
            WHERE slug IS NOT NULL AND email IS NOT NULL AND email != ''
            ORDER BY id
        ''').fetchall()

    # Build email -> slug lookup
    email_to_slug = {}
    email_to_info = {}
    for r in rows:
        if r['email']:
            email_to_slug[r['email'].lower()] = r['slug']
            email_to_info[r['email'].lower()] = f"{r['company_name']} (ID {r['id']}, {r['status']})"

    # Step 2: Check ALL Gmail drafts
    user = os.environ['GMAIL_USER']
    pwd = os.environ['GMAIL_APP_PASSWORD']

    imap = imaplib.IMAP4_SSL('imap.gmail.com', 993)
    imap.login(user, pwd)
    imap.select('[Gmail]/Drafts')

    status, data = imap.search(None, 'ALL')
    msg_ids = data[0].split() if data[0] else []

    print(f'Total Gmail drafts: {len(msg_ids)}')
    print(f'Total targets with email+slug: {len(email_to_slug)}')
    print()

    # Known middleware aliases
    aliases = {
        'donmoyer': 'donmoyer-construction',
        'kwc-basements': 'kwc-basements-renovations',
        'hemeryck-homes': 'hemeryck-homes-construction-ltd',
        'ferretti': 'ferretti-renovations',
        'high-tier-construction': 'high-tier-construction-inc',
        'conpro-contracting': 'conpro-contracting-ltd',
        'mccarty-squared': 'mccarty-squared-inc',
        'joescarpentry': 'joes-carpentry',
    }

    mismatches = []
    correct = []
    alias_ok = []

    for mid in msg_ids:
        _, msg_data = imap.fetch(mid, '(RFC822)')
        msg = email.message_from_bytes(msg_data[0][1])
        to_addr = (msg.get('To', '') or '').strip().lower()
        subject = msg.get('Subject', 'no subject')

        body = ''
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == 'text/plain':
                    body = part.get_payload(decode=True).decode('utf-8', errors='replace')
                    break
        else:
            body = msg.get_payload(decode=True).decode('utf-8', errors='replace')

        # Extract URLs
        urls = re.findall(r'www\.norbotsystems\.com/([a-z0-9-]+)', body)
        if not urls:
            continue

        url_slug = urls[0]
        db_slug = email_to_slug.get(to_addr, None)
        info = email_to_info.get(to_addr, f'Unknown ({to_addr})')

        if db_slug and url_slug != db_slug:
            if url_slug in aliases and aliases[url_slug] == db_slug:
                alias_ok.append(f'  {info}: {url_slug} -> {db_slug} (ALIAS)')
            else:
                mismatches.append({
                    'info': info,
                    'to': to_addr,
                    'subject': subject,
                    'url_slug': url_slug,
                    'db_slug': db_slug,
                })
        elif db_slug:
            correct.append(f'  {info}: {url_slug}')

    imap.logout()

    print(f'=== CORRECT ({len(correct)}) ===')
    for c in correct:
        print(c)

    if alias_ok:
        print(f'\n=== ALIAS-PROTECTED ({len(alias_ok)}) ===')
        for a in alias_ok:
            print(a)

    print(f'\n=== MISMATCHES ({len(mismatches)}) ===')
    if mismatches:
        for m in mismatches:
            print(f"  MISMATCH: {m['info']}")
            print(f"    To: {m['to']}")
            print(f"    Subject: {m['subject']}")
            print(f"    URL slug: {m['url_slug']}")
            print(f"    DB slug:  {m['db_slug']}")
    else:
        print('  None! All URLs match DB slugs or have middleware aliases.')


if __name__ == '__main__':
    main()
