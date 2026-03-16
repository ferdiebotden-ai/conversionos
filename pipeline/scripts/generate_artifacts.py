#!/usr/bin/env python3
"""LEGACY — not used by nightly pipeline. Generation happens via Dashboard API (ai-generate.ts).

This script was the original Python artifact generator. The nightly pipeline now
calls POST /api/pipeline/generate which uses ai-generate.ts (Opus 4.6 + Haiku 4.5).

Usage (if needed for manual testing):
    python generate_artifacts.py --id <target_id>
    python generate_artifacts.py --id <target_id> --dry-run
"""

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path
from string import Template

import yaml

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import get_target, log_artifact, update_target_status

PROJECT_ROOT = Path(__file__).parent.parent
OUTBOX = PROJECT_ROOT / "outbox"
TEMPLATES = PROJECT_ROOT / "templates"
CONFIG_PATH = PROJECT_ROOT / "config" / "outreach_config.yaml"


def load_config() -> dict:
    """Load outreach configuration."""
    if CONFIG_PATH.exists():
        return yaml.safe_load(CONFIG_PATH.read_text()) or {}
    return {}


def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 3:
        hex_color = "".join(c * 2 for c in hex_color)
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))


def lighten_color(hex_color: str, amount: float = 0.9) -> str:
    """Lighten a hex color by blending toward white."""
    r, g, b = hex_to_rgb(hex_color)
    r = int(r + (255 - r) * amount)
    g = int(g + (255 - g) * amount)
    b = int(b + (255 - b) * amount)
    return f"#{r:02X}{g:02X}{b:02X}"


def darken_color(hex_color: str, amount: float = 0.4) -> str:
    """Darken a hex color by blending toward black."""
    r, g, b = hex_to_rgb(hex_color)
    r = int(r * (1 - amount))
    g = int(g * (1 - amount))
    b = int(b * (1 - amount))
    return f"#{r:02X}{g:02X}{b:02X}"


def load_template(path: Path) -> str:
    """Load a template file."""
    return path.read_text()


def fill_template(template_str: str, data: dict) -> str:
    """Replace {{PLACEHOLDER}} tokens in template with data values."""
    result = template_str
    for key, value in data.items():
        result = result.replace(f"{{{{{key}}}}}", str(value) if value else "")
    return result


def build_template_data(target: dict) -> dict:
    """Build the template data dict from a target record."""
    config = load_config()
    sender = config.get("sender", {})

    services_list = []
    if target.get("services"):
        try:
            services_list = json.loads(target["services"]) if isinstance(target["services"], str) else target["services"]
        except (json.JSONDecodeError, TypeError):
            services_list = []

    brand_colors = {}
    if target.get("brand_colors"):
        try:
            brand_colors = json.loads(target["brand_colors"]) if isinstance(target["brand_colors"], str) else target["brand_colors"]
        except (json.JSONDecodeError, TypeError):
            brand_colors = {}

    accent_color = brand_colors.get("accent", "#DC2626")
    accent_color_light = lighten_color(accent_color, 0.9)
    accent_color_dark = darken_color(accent_color, 0.4)

    rating_text = f"{target['google_rating']}" if target.get("google_rating") else "highly rated"
    review_text = f"{target['google_review_count']}+" if target.get("google_review_count") else "numerous"
    years_text = f"{target['years_in_business']}+ years" if target.get("years_in_business") else "years"

    return {
        "COMPANY_NAME": target["company_name"],
        "COMPANY_SLUG": target["slug"],
        "CITY": target["city"],
        "TERRITORY": target["territory"],
        "WEBSITE": target.get("website") or "[no website found]",
        "EMAIL": target.get("email") or "[email not found — find on website]",
        "PHONE": target.get("phone") or "[phone not found]",
        "GOOGLE_RATING": rating_text,
        "GOOGLE_REVIEW_COUNT": review_text,
        "SERVICES_LIST": ", ".join(services_list) if services_list else "renovation services",
        "YEARS_IN_BUSINESS": years_text,
        "PRIMARY_COLOR": brand_colors.get("primary", "#2563eb"),
        "ACCENT_COLOR": accent_color,
        "ACCENT_COLOR_LIGHT": accent_color_light,
        "ACCENT_COLOR_DARK": accent_color_dark,
        "BRAND_DESCRIPTION": target.get("brand_description") or f"{target['city']}'s trusted renovation experts",
        "DATE": date.today().isoformat(),
        "DEMO_URL": "https://dashboard-rho-ten-70.vercel.app",
        "MICROSITE_URL": f"www.norbotsystems.com/{target['slug']}",
        "MICROSITE_LINK_LABEL": f"A private page I built for {target['company_name']}",
        "CALENDAR_URL": sender.get("calendar_url", "https://calendly.com/ferdie-norbotsystems/30min"),
        "PHONE_NUMBER": sender.get("phone_number", "519-378-8973"),
        "SETUP_PRICE": sender.get("setup_price", "$4,500"),
        "MONTHLY_PRICE": sender.get("monthly_price", "$699"),
        "OWNER_NAME": target.get("owner_name") or target["company_name"],
        "OWNER_GREETING": f"Hi {target['owner_name'].split()[0]}," if target.get("owner_name") else "Hi there,",
        "COMPANY_LOGO_URL": target.get("logo_url", ""),
        "TESTIMONIAL_1": target.get("testimonial_1", "Outstanding quality and professionalism from start to finish."),
        "TESTIMONIAL_1_AUTHOR": target.get("testimonial_1_author", "A Happy Customer"),
        "TESTIMONIAL_2": target.get("testimonial_2", "They transformed our home beyond what we imagined possible."),
        "TESTIMONIAL_2_AUTHOR": target.get("testimonial_2_author", "A Satisfied Homeowner"),
        "TERRITORIES_AVAILABLE": sender.get("territories_available", "3"),
        "FOUNDING_SLOT": sender.get("founding_slot", "2"),
        "SENDER_NAME": sender.get("name", "Ferdie Botden"),
        "SENDER_EMAIL": sender.get("email", "ferdie@norbotsystems.com"),
        "CASL_ADDRESS": config.get("casl", {}).get("physical_address_placeholder", "140 Dempsey Dr, Stratford, ON N5A 0K5"),
        "CASL_UNSUBSCRIBE": config.get("casl", {}).get("unsubscribe_text", "If you'd prefer not to hear from me, just reply STOP and I'll remove you immediately."),
        "CASL_FOOTER_FULL": sender.get("casl_footer", "Ferdie Botden | NorBot Systems Inc. | 140 Dempsey Dr, Stratford, ON N5A 0K5"),
    }


def generate_microsite(target: dict, data: dict, outbox_dir: Path, dry_run: bool) -> Path:
    """Generate personalized microsite HTML."""
    template = load_template(TEMPLATES / "microsite" / "base.html")
    html = fill_template(template, data)

    microsite_dir = outbox_dir / "microsite"
    microsite_dir.mkdir(parents=True, exist_ok=True)
    output_path = microsite_dir / "index.html"

    if not dry_run:
        output_path.write_text(html)
        log_artifact(target["id"], "microsite", str(output_path.relative_to(PROJECT_ROOT)))
    print(f"  Microsite: {output_path}")
    return output_path


def generate_email(target: dict, data: dict, outbox_dir: Path, dry_run: bool) -> Path:
    """Generate personalized 3-email sequence."""
    email_types = [
        ("initial_outreach.md", "email_initial"),
        ("follow_up_3day.md", "email_followup"),
        ("breakup_7day.md", "email_breakup"),
    ]

    combined = []
    for template_file, artifact_type in email_types:
        template_path = TEMPLATES / "email" / template_file
        if template_path.exists():
            template = load_template(template_path)
            filled = fill_template(template, data)
            combined.append(filled)

            if not dry_run:
                log_artifact(target["id"], artifact_type, f"outbox/{outbox_dir.name}/{target['slug']}/email_draft.md")

    output_path = outbox_dir / "email_draft.md"
    if not dry_run:
        output_path.write_text("\n\n---\n\n".join(combined))
    print(f"  Email draft: {output_path}")
    return output_path


def generate_call_script(target: dict, data: dict, outbox_dir: Path, dry_run: bool) -> Path:
    """Generate personalized call script."""
    template = load_template(TEMPLATES / "call_script" / "discovery_call.md")
    script = fill_template(template, data)

    output_path = outbox_dir / "call_script.md"
    if not dry_run:
        output_path.write_text(script)
        log_artifact(target["id"], "call_script", str(output_path.relative_to(PROJECT_ROOT)))
    print(f"  Call script: {output_path}")
    return output_path


def generate_target_json(target: dict, data: dict, outbox_dir: Path, dry_run: bool) -> Path:
    """Save target data as JSON for reference."""
    output_path = outbox_dir / "target.json"
    if not dry_run:
        output_path.write_text(json.dumps(target, indent=2, default=str))
    print(f"  Target data: {output_path}")
    return output_path


def main():
    parser = argparse.ArgumentParser(description="Generate outreach artifacts for a target")
    parser.add_argument("--id", type=int, required=True, help="Target ID")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing files")
    parser.add_argument("--mail-draft", action="store_true",
                        help="Also create a Mail.app draft for Email 1")

    args = parser.parse_args()
    target = get_target(args.id)

    if not target:
        print(f"Target {args.id} not found.")
        sys.exit(1)

    if target["status"] not in ("qualified", "draft_ready"):
        print(f"Target is in '{target['status']}' status. Must be 'qualified' or 'draft_ready' to generate artifacts.")
        print(f"Use: python mark_stage.py {args.id} qualified")
        sys.exit(1)

    print(f"\n=== Generating artifacts for: {target['company_name']} ===")

    data = build_template_data(target)
    today = date.today().isoformat()
    outbox_dir = OUTBOX / today / target["slug"]
    outbox_dir.mkdir(parents=True, exist_ok=True)

    generate_target_json(target, data, outbox_dir, args.dry_run)
    generate_microsite(target, data, outbox_dir, args.dry_run)
    generate_email(target, data, outbox_dir, args.dry_run)
    generate_call_script(target, data, outbox_dir, args.dry_run)

    if not args.dry_run:
        update_target_status(args.id, "draft_ready")
        print(f"\n  Status updated: {target['status']} → draft_ready")
    else:
        print(f"\n  (dry-run mode — no files written, no status change)")

    # Create Mail.app draft if requested
    if args.mail_draft and not args.dry_run:
        try:
            from create_mail_drafts import create_draft_for_target
            print(f"\n  Creating Mail.app draft for Email 1...")
            create_draft_for_target(target, email_num=1, outbox_date=today, dry_run=False)
        except Exception as e:
            print(f"\n  WARN: Mail draft failed (non-fatal): {e}")

    print(f"\n  Outbox: {outbox_dir}")
    print(f"\n  Next steps:")
    print(f"    1. Open microsite/index.html in browser")
    print(f"    2. Review email_draft.md")
    print(f"    3. Review call_script.md")
    print(f"    4. Run: python mark_stage.py {args.id} reviewed")


if __name__ == "__main__":
    main()
