#!/usr/bin/env python3
"""Query Turso for all targets eligible for round 2 follow-up emails,
plus their original email_initial touch subject lines."""

import json
import os
import sys
from pathlib import Path

# Load env
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

TURSO_URL = os.environ.get("TURSO_DATABASE_URL", "")
TURSO_TOKEN = os.environ.get("TURSO_AUTH_TOKEN", "")

if not TURSO_URL or not TURSO_TOKEN:
    print("ERROR: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set")
    sys.exit(1)

# Convert libsql:// to https://
url = TURSO_URL
if url.startswith("libsql://"):
    url = url.replace("libsql://", "https://", 1)

import libsql_client

client = libsql_client.create_client_sync(url=url, auth_token=TURSO_TOKEN)

# ── Query 1: All targets eligible for follow-up ──────────────────────
print("=" * 120)
print("QUERY 1: Targets eligible for round 2 follow-up")
print("=" * 120)

rs = client.execute("""
    SELECT
        id, company_name, slug, city, territory, email, owner_name,
        google_rating, google_review_count, status, services, website,
        score, years_in_business, phone, contacted_at, updated_at
    FROM targets
    WHERE email IS NOT NULL
      AND email != ''
      AND slug IS NOT NULL
      AND slug != ''
      AND status NOT IN ('closed_lost', 'disqualified', 'discovered', 'qualified', 'draft_ready')
    ORDER BY score DESC, id ASC
""")

cols = rs.columns
rows = rs.rows
print(f"\nFound {len(rows)} targets\n")

for i, row in enumerate(rows):
    d = dict(zip(cols, row))
    print(f"--- Target {i+1} ---")
    for k in ['id', 'company_name', 'slug', 'city', 'territory', 'email', 'owner_name',
              'google_rating', 'google_review_count', 'status', 'services', 'website',
              'score', 'years_in_business', 'phone', 'contacted_at', 'updated_at']:
        print(f"  {k}: {d.get(k)}")
    print()

# ── Query 2: All email_initial touches (original subject lines) ──────
print("=" * 120)
print("QUERY 2: Original email_initial touch subject lines (from touches table)")
print("=" * 120)

rs2 = client.execute("""
    SELECT t.target_id, tgt.company_name, tgt.slug, t.subject, t.outcome, t.created_at
    FROM touches t
    JOIN targets tgt ON tgt.id = t.target_id
    WHERE t.type = 'email_initial'
    ORDER BY t.target_id ASC, t.created_at ASC
""")

cols2 = rs2.columns
rows2 = rs2.rows
print(f"\nFound {len(rows2)} email_initial touches\n")

for row in rows2:
    d = dict(zip(cols2, row))
    print(f"  Target {d['target_id']} ({d['company_name']} / {d['slug']})")
    print(f"    Subject: {d['subject']}")
    print(f"    Outcome: {d['outcome']}")
    print(f"    Date:    {d['created_at']}")
    print()

# ── Query 3: All email_followup touches already sent ─────────────────
print("=" * 120)
print("QUERY 3: Any existing email_followup touches (already sent round 2?)")
print("=" * 120)

rs3 = client.execute("""
    SELECT t.target_id, tgt.company_name, tgt.slug, t.subject, t.outcome, t.created_at
    FROM touches t
    JOIN targets tgt ON tgt.id = t.target_id
    WHERE t.type = 'email_followup'
    ORDER BY t.target_id ASC, t.created_at ASC
""")

cols3 = rs3.columns
rows3 = rs3.rows
print(f"\nFound {len(rows3)} email_followup touches\n")

for row in rows3:
    d = dict(zip(cols3, row))
    print(f"  Target {d['target_id']} ({d['company_name']} / {d['slug']})")
    print(f"    Subject: {d['subject']}")
    print(f"    Outcome: {d['outcome']}")
    print(f"    Date:    {d['created_at']}")
    print()

# ── Query 4: Full status distribution ────────────────────────────────
print("=" * 120)
print("QUERY 4: Full status distribution")
print("=" * 120)

rs4 = client.execute("SELECT status, COUNT(*) as cnt FROM targets GROUP BY status ORDER BY cnt DESC")
cols4 = rs4.columns
rows4 = rs4.rows
print()
for row in rows4:
    d = dict(zip(cols4, row))
    print(f"  {d['status']}: {d['cnt']}")

# ── Query 5: All SMS touches ─────────────────────────────────────────
print()
print("=" * 120)
print("QUERY 5: All SMS touches")
print("=" * 120)

rs5 = client.execute("""
    SELECT t.target_id, tgt.company_name, tgt.slug, t.subject, t.outcome, t.notes, t.created_at
    FROM touches t
    JOIN targets tgt ON tgt.id = t.target_id
    WHERE t.type = 'sms'
    ORDER BY t.target_id ASC, t.created_at ASC
""")

cols5 = rs5.columns
rows5 = rs5.rows
print(f"\nFound {len(rows5)} SMS touches\n")

for row in rows5:
    d = dict(zip(cols5, row))
    print(f"  Target {d['target_id']} ({d['company_name']} / {d['slug']})")
    print(f"    Subject: {d['subject']}")
    print(f"    Outcome: {d['outcome']}")
    print(f"    Notes:   {d['notes']}")
    print(f"    Date:    {d['created_at']}")
    print()

client.close()
print("\nDone.")
