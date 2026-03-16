#!/usr/bin/env python3
"""Bulk-insert territory records into the pipeline database.

Expands from the current 14 territories to 50+ by adding Ring 2-3 Ontario cities.
Each territory is inserted as 'available' with no lock.

Usage:
    python scripts/expand_territories.py              # Insert all new territories
    python scripts/expand_territories.py --dry-run    # Preview only
    python scripts/expand_territories.py --ring 2     # Only Ring 2
    python scripts/expand_territories.py --ring 3     # Only Ring 3
    python scripts/expand_territories.py --ring 4     # Only Ring 4 (future)
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import get_all_territories, insert_territory

# Territory expansion rings (ordered by distance from Stratford, ON)

# Ring 1 (0-60 km) — Already active, included for reference only
RING_1 = [
    "London, ON",
    "Kitchener, ON",
    "Waterloo, ON",
    "Cambridge, ON",
    "Guelph, ON",
    "Ingersoll, ON",
    "Woodstock, ON",
    "Brantford, ON",
    "Hamilton, ON",
    "St. Thomas, ON",
    "Tillsonburg, ON",
    "Oakville, ON",
    "Burlington, ON",
    "Stratford, ON",  # SOLD — never target
]

# Ring 2 (60-120 km) — 15 new cities
RING_2 = [
    "Simcoe, ON",
    "Norfolk County, ON",
    "Paris, ON",
    "Fergus, ON",
    "Elora, ON",
    "Mount Forest, ON",
    "Listowel, ON",
    "Exeter, ON",
    "Strathroy, ON",
    "Aylmer, ON",
    "Port Dover, ON",
    "Caledonia, ON",
    "Dundas, ON",
    "Ancaster, ON",
    "Stoney Creek, ON",
]

# Ring 3 (120-200 km) — GTA + extensions, 20 cities
RING_3 = [
    "Mississauga, ON",
    "Brampton, ON",
    "Toronto - Etobicoke, ON",
    "Toronto - Scarborough, ON",
    "Toronto - North York, ON",
    "Vaughan, ON",
    "Markham, ON",
    "Richmond Hill, ON",
    "Newmarket, ON",
    "Aurora, ON",
    "Oshawa, ON",
    "Whitby, ON",
    "Ajax, ON",
    "Pickering, ON",
    "Milton, ON",
    "Georgetown, ON",
    "Orangeville, ON",
    "Barrie, ON",
    "Orillia, ON",
    "Collingwood, ON",
    "Owen Sound, ON",
    "Chatham-Kent, ON",
]

# Ring 4 (200+ km) — Future expansion
RING_4 = [
    "Windsor, ON",
    "Sarnia, ON",
    "Niagara Falls, ON",
    "St. Catharines, ON",
    "Welland, ON",
    "Thorold, ON",
    "Grimsby, ON",
    "Peterborough, ON",
    "Belleville, ON",
    "Kingston, ON",
    "Sudbury, ON",
    "North Bay, ON",
    "Thunder Bay, ON",
    "Sault Ste. Marie, ON",
    "Huntsville, ON",
]

RINGS = {
    1: RING_1,
    2: RING_2,
    3: RING_3,
    4: RING_4,
}


def expand_territories(rings: list[int], dry_run: bool = False):
    """Insert territory records for the specified rings."""
    existing = {t["name"] for t in get_all_territories()}
    print(f"\n=== Territory Expansion ===")
    print(f"  Existing territories: {len(existing)}")
    print(f"  Rings to expand: {rings}")
    print(f"  Mode: {'DRY RUN' if dry_run else 'LIVE'}")

    inserted = 0
    skipped = 0

    for ring_num in sorted(rings):
        cities = RINGS.get(ring_num, [])
        print(f"\n--- Ring {ring_num} ({len(cities)} cities) ---")

        for city in cities:
            if city in existing:
                print(f"  SKIP (exists): {city}")
                skipped += 1
                continue

            if dry_run:
                print(f"  [DRY RUN] Would insert: {city}")
            else:
                result = insert_territory(city)
                if result:
                    print(f"  INSERTED: {city}")
                else:
                    print(f"  SKIP (exists): {city}")
                    skipped += 1
                    continue

            inserted += 1

    print(f"\n=== Expansion Summary ===")
    print(f"  Inserted: {inserted}")
    print(f"  Skipped (already exist): {skipped}")
    print(f"  Total territories: {len(existing) + inserted}")

    if not dry_run and inserted > 0:
        # Verify
        new_total = len(get_all_territories())
        print(f"  Verified total in DB: {new_total}")


def list_territories():
    """List all current territories."""
    territories = get_all_territories()
    print(f"\n=== Current Territories ({len(territories)}) ===")
    for t in territories:
        status = t["status"]
        reserved = f" (target #{t.get('reserved_for_target_id', '?')})" if status == "reserved" else ""
        print(f"  {t['name']} — {status}{reserved}")


def main():
    parser = argparse.ArgumentParser(description="Expand pipeline territories")
    parser.add_argument("--ring", type=int, choices=[2, 3, 4], action="append",
                        help="Ring(s) to expand (default: 2 and 3)")
    parser.add_argument("--all", action="store_true", help="Expand rings 2, 3, and 4")
    parser.add_argument("--dry-run", action="store_true", help="Preview without changes")
    parser.add_argument("--list", action="store_true", help="List current territories")

    args = parser.parse_args()

    if args.list:
        list_territories()
        return

    if args.all:
        rings = [2, 3, 4]
    elif args.ring:
        rings = args.ring
    else:
        # Default: Rings 2 and 3 (35 new territories)
        rings = [2, 3]

    expand_territories(rings, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
