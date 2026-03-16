#!/usr/bin/env python3
"""Score and qualify targets in the pipeline.

Usage:
    # Qualify a specific target
    python qualify_target.py --id 1

    # Qualify all discovered targets
    python qualify_target.py --all

    # Show scoring for a target without updating
    python qualify_target.py --id 1 --dry-run
"""

import argparse
import json
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import (
    get_target,
    get_targets_by_status,
    update_target_score,
    update_target_status,
)

CONFIG_PATH = Path(__file__).parent.parent / "config" / "outreach_config.yaml"


def load_scoring_config() -> dict:
    """Load scoring weights from config."""
    config = yaml.safe_load(CONFIG_PATH.read_text())
    return config["scoring"]["weights"]


def _classify_website_quality(target: dict) -> str:
    """Classify website quality from brand data. Returns: none, basic, decent, professional."""
    website = target.get("website")
    if not website:
        return "none"

    # Use brand_assets or brand_colors to infer quality
    brand_assets = target.get("brand_assets")
    if isinstance(brand_assets, str):
        try:
            brand_assets = json.loads(brand_assets)
        except (json.JSONDecodeError, TypeError):
            brand_assets = {}
    brand_assets = brand_assets or {}

    brand_colors = target.get("brand_colors")
    if isinstance(brand_colors, str):
        try:
            brand_colors = json.loads(brand_colors)
        except (json.JSONDecodeError, TypeError):
            brand_colors = {}
    brand_colors = brand_colors or {}

    # Score indicators of professionalism
    pro_signals = 0
    if brand_assets.get("hero_image_url"):
        pro_signals += 1
    if brand_assets.get("testimonials") and len(brand_assets["testimonials"]) >= 3:
        pro_signals += 1
    if brand_assets.get("portfolio_images") and len(brand_assets["portfolio_images"]) >= 5:
        pro_signals += 1
    if brand_colors.get("primary") and brand_colors.get("secondary"):
        pro_signals += 1
    if brand_assets.get("tagline"):
        pro_signals += 1

    if pro_signals >= 4:
        return "professional"
    elif pro_signals >= 2:
        return "decent"
    else:
        return "basic"


def score_target(target: dict, weights: dict) -> tuple[int, dict]:
    """Score a target 0-100 based on weighted factors. Returns (score, breakdown).

    INVERTED logic: basic websites + younger businesses score HIGHER.
    Rationale: basic site = biggest disparity when we show ConversionOS.
    """
    breakdown = {}

    # Website quality — INVERTED (0-20)
    # Basic/dated site = biggest opportunity for ConversionOS demo impact
    w = weights.get("website_quality", 20)
    quality = _classify_website_quality(target)
    if quality == "basic":
        breakdown["website_quality"] = w          # 20 — ideal target
    elif quality == "decent":
        breakdown["website_quality"] = int(w * 0.75)  # 15
    elif quality == "professional":
        breakdown["website_quality"] = int(w * 0.5)   # 10 — less to gain
    else:  # none
        breakdown["website_quality"] = 0               # 0 — can't demo without a site to compare

    # Years in business — INVERTED (0-15)
    # Younger ownership = more receptive to new tech
    w = weights.get("years_in_business", 15)
    years = target.get("years_in_business") or 0
    if 1 <= years <= 3:
        breakdown["years_in_business"] = w          # 15
    elif 4 <= years <= 7:
        breakdown["years_in_business"] = int(w * 0.8)   # 12
    elif 8 <= years <= 15:
        breakdown["years_in_business"] = int(w * 0.53)  # 8
    elif years > 15:
        breakdown["years_in_business"] = int(w * 0.33)  # 5
    else:
        breakdown["years_in_business"] = 0

    # Services match (0-15)
    w = weights.get("services_match", 15)
    target_services = ["kitchen", "bathroom", "basement", "renovation", "remodel"]
    services_raw = target.get("services")
    if services_raw:
        try:
            services = json.loads(services_raw) if isinstance(services_raw, str) else services_raw
        except (json.JSONDecodeError, TypeError):
            services = []
        matched = sum(
            1
            for s in services
            if any(ts in s.lower() for ts in target_services)
        )
        ratio = min(matched / 3, 1.0)
        breakdown["services_match"] = int(w * ratio)
    else:
        breakdown["services_match"] = 0

    # Google rating (0-10) — quality floor
    w = weights.get("google_rating", 10)
    rating = target.get("google_rating") or 0
    if rating >= 4.0:
        breakdown["google_rating"] = w
    elif rating >= 3.5:
        breakdown["google_rating"] = int(w * 0.7)
    elif rating >= 3.0:
        breakdown["google_rating"] = int(w * 0.4)
    else:
        breakdown["google_rating"] = 0

    # Google review count (0-10) — minimum social proof
    w = weights.get("google_review_count", 10)
    reviews = target.get("google_review_count") or 0
    if reviews >= 5:
        breakdown["google_review_count"] = w
    elif reviews >= 3:
        breakdown["google_review_count"] = int(w * 0.7)
    elif reviews >= 1:
        breakdown["google_review_count"] = int(w * 0.4)
    else:
        breakdown["google_review_count"] = 0

    # Content match (0-10) — thin content = more demo impact
    w = weights.get("content_match", 10)
    brand_assets = target.get("brand_assets")
    if isinstance(brand_assets, str):
        try:
            brand_assets = json.loads(brand_assets)
        except (json.JSONDecodeError, TypeError):
            brand_assets = {}
    brand_assets = brand_assets or {}

    # Count how many ConversionOS sections the target is MISSING
    demo_sections = ["testimonials", "portfolio_images", "about_text", "services"]
    missing = sum(1 for s in demo_sections if not brand_assets.get(s))
    if target.get("website"):
        # More missing sections = more "wow" from a full ConversionOS demo
        breakdown["content_match"] = int(w * min(missing / len(demo_sections), 1.0))
    else:
        breakdown["content_match"] = 0

    # Online presence (0-10)
    w = weights.get("online_presence", 10)
    presence = 0
    if target.get("website"):
        presence += 5
    if target.get("email"):
        presence += 3
    # Social presence — check notes or brand description for social hints
    notes = (target.get("notes") or "") + (target.get("brand_description") or "")
    if any(s in notes.lower() for s in ["facebook", "instagram", "social"]):
        presence += 2
    breakdown["online_presence"] = min(presence, w)

    # Response likelihood (0-10)
    w = weights.get("response_likelihood", 10)
    has_email = bool(target.get("email"))
    has_phone = bool(target.get("phone"))
    if has_email and has_phone:
        breakdown["response_likelihood"] = w
    elif has_email:
        breakdown["response_likelihood"] = int(w * 0.6)
    elif has_phone:
        breakdown["response_likelihood"] = int(w * 0.4)
    else:
        breakdown["response_likelihood"] = 0

    total = sum(breakdown.values())
    return total, breakdown


def qualify_target(target_id: int, dry_run: bool = False):
    """Score and optionally qualify a target."""
    target = get_target(target_id)
    if not target:
        print(f"Target {target_id} not found.")
        return

    weights = load_scoring_config()
    score, breakdown = score_target(target, weights)

    print(f"\n=== Qualification: {target['company_name']} ===")
    print(f"  Territory: {target['territory']}")
    print(f"  Current status: {target['status']}")
    print(f"\n  Score: {score}/100")
    print(f"  Breakdown:")
    for factor, points in breakdown.items():
        max_pts = weights.get(factor, "?")
        print(f"    {factor}: {points}/{max_pts}")

    config = yaml.safe_load(CONFIG_PATH.read_text())
    min_score = config["pipeline"]["min_qualification_score"]

    qualifies = score >= min_score

    print(f"\n  Min score required: {min_score}")
    print(f"  Qualifies: {'YES' if qualifies else 'NO'}")

    if dry_run:
        print("\n  (dry-run mode — no changes made)")
        return

    # Update score
    update_target_score(target_id, score, breakdown)

    # Update status
    if qualifies:
        if target["status"] == "discovered":
            update_target_status(target_id, "qualified")
            print(f"\n  Status updated: discovered → qualified")
    else:
        if target["status"] == "discovered":
            update_target_status(target_id, "disqualified")
            print(f"\n  Status updated: discovered → disqualified (score too low)")


def main():
    parser = argparse.ArgumentParser(description="Score and qualify targets")
    parser.add_argument("--id", type=int, help="Target ID to qualify")
    parser.add_argument("--all", action="store_true", help="Qualify all discovered targets")
    parser.add_argument("--dry-run", action="store_true", help="Show scoring without updating")

    args = parser.parse_args()

    if args.id:
        qualify_target(args.id, dry_run=args.dry_run)
    elif args.all:
        targets = get_targets_by_status("discovered")
        if not targets:
            print("No discovered targets to qualify.")
            return
        for t in targets:
            qualify_target(t["id"], dry_run=args.dry_run)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
