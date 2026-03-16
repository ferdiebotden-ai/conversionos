#!/usr/bin/env python3
"""Discover and add target contractors to the pipeline database.

Usage:
    # Add a target manually
    python discover_targets.py add \
        --name "Company Name" \
        --city "London" \
        --territory "London, ON" \
        --website "https://example.com" \
        --email "info@example.com" \
        --phone "519-555-1234" \
        --rating 4.8 \
        --reviews 35 \
        --services "kitchen,bathroom,basement" \
        --years 5

    # List targets by status
    python discover_targets.py list [--status discovered]

    # Show pipeline summary
    python discover_targets.py summary
"""

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import (
    get_pipeline_summary,
    get_target,
    get_targets_by_status,
    insert_target,
    print_pipeline_summary,
)


def slugify(name: str) -> str:
    """Convert company name to URL-safe slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s-]+", "-", slug)
    return slug.strip("-")


def add_target(args):
    """Add a new target to the database."""
    slug = slugify(args.name)
    services = [s.strip() for s in args.services.split(",")] if args.services else None

    target_id = insert_target(
        company_name=args.name,
        slug=slug,
        city=args.city,
        territory=args.territory,
        website=args.website,
        email=args.email,
        phone=args.phone,
        google_rating=args.rating,
        google_review_count=args.reviews,
        services=services,
        years_in_business=args.years,
        brand_colors=json.loads(args.brand_colors) if args.brand_colors else None,
        brand_description=args.brand_description,
        notes=args.notes,
    )

    target = get_target(target_id)
    print(f"\nTarget added successfully!")
    print(f"  ID: {target_id}")
    print(f"  Name: {target['company_name']}")
    print(f"  Slug: {target['slug']}")
    print(f"  City: {target['city']}")
    print(f"  Territory: {target['territory']}")
    print(f"  Status: {target['status']}")
    return target_id


def list_targets(args):
    """List targets, optionally filtered by status."""
    status = args.status if args.status else None

    if status:
        targets = get_targets_by_status(status)
        print(f"\n=== Targets with status '{status}' ({len(targets)}) ===")
    else:
        # Get all statuses
        all_statuses = [
            "discovered", "qualified", "disqualified", "draft_ready",
            "reviewed", "contacted", "interested", "demo_sent",
            "closed_won", "closed_lost",
        ]
        targets = []
        for s in all_statuses:
            targets.extend(get_targets_by_status(s))
        print(f"\n=== All Targets ({len(targets)}) ===")

    if not targets:
        print("  (none)")
        return

    for t in targets:
        rating = f"{t['google_rating']}" if t["google_rating"] else "N/A"
        reviews = t["google_review_count"] or 0
        print(
            f"  [{t['id']}] {t['company_name']} ({t['city']}) "
            f"— {t['status']} | Score: {t['score']} | "
            f"Rating: {rating} ({reviews} reviews)"
        )


def show_summary(_args):
    """Show pipeline summary."""
    print_pipeline_summary()


def main():
    parser = argparse.ArgumentParser(description="Discover and manage target contractors")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Add command
    add_parser = subparsers.add_parser("add", help="Add a new target")
    add_parser.add_argument("--name", required=True, help="Company name")
    add_parser.add_argument("--city", required=True, help="City")
    add_parser.add_argument("--territory", required=True, help="Territory (e.g. 'London, ON')")
    add_parser.add_argument("--website", help="Website URL")
    add_parser.add_argument("--email", help="Contact email")
    add_parser.add_argument("--phone", help="Phone number")
    add_parser.add_argument("--rating", type=float, help="Google rating (0-5)")
    add_parser.add_argument("--reviews", type=int, help="Google review count")
    add_parser.add_argument("--services", help="Comma-separated services")
    add_parser.add_argument("--years", type=int, help="Years in business")
    add_parser.add_argument("--brand-colors", help="JSON brand colors")
    add_parser.add_argument("--brand-description", help="Brand description")
    add_parser.add_argument("--notes", help="Additional notes")

    # List command
    list_parser = subparsers.add_parser("list", help="List targets")
    list_parser.add_argument("--status", help="Filter by status")

    # Summary command
    subparsers.add_parser("summary", help="Show pipeline summary")

    args = parser.parse_args()

    if args.command == "add":
        add_target(args)
    elif args.command == "list":
        list_targets(args)
    elif args.command == "summary":
        show_summary(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
