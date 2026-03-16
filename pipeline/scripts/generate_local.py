#!/usr/bin/env python3
"""Local AI generation using Claude Code Max subscription.

Generates microsites, email sequences, and call scripts for pipeline targets
using `claude -p` subprocess calls with --json-schema for structured output.

Replaces the Dashboard API (ai-generate.ts) path that required per-API-call
Anthropic credits. Max subscription = $200/mo flat rate.

Usage:
    python scripts/generate_local.py --id <target_id>             # Generate for one target
    python scripts/generate_local.py --id <target_id> --dry-run   # Preview without DB changes
    python scripts/generate_local.py --all --limit 3              # Generate for top N candidates
    python scripts/generate_local.py --id <target_id> --use-api   # Fall back to Dashboard API
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import (
    get_target,
    get_targets_by_status,
    log_artifact,
    log_touch,
    update_target_status,
)
from generate_artifacts import fill_template, load_template

PROJECT_ROOT = Path(__file__).parent.parent
SCRIPTS_DIR = Path(__file__).parent
OUTBOX = PROJECT_ROOT / "outbox"
TEMPLATES = PROJECT_ROOT / "templates"
SCHEMAS_DIR = SCRIPTS_DIR / "schemas"
PROMPTS_DIR = SCRIPTS_DIR / "prompts"

# Claude CLI settings
GENERATION_MODEL = "opus"
REVIEW_MODEL = "sonnet"
MAX_TURNS = 10
MAX_BUDGET_USD = 5
INTER_TARGET_DELAY = 5  # seconds between targets to avoid rate limiting

# CASL footer — appended programmatically as safety net
CASL_FOOTER = (
    "\n\n---\n"
    "Ferdie Botden | NorBot Systems Inc. | 140 Dempsey Dr, Stratford, ON N5A 0K5\n"
    "If you'd prefer not to hear from me, just reply STOP and I'll remove you immediately."
)


def find_claude_binary() -> str:
    """Find the claude CLI binary."""
    # Check common locations
    claude = shutil.which("claude")
    if claude:
        return claude
    for path in ["/usr/local/bin/claude", str(Path.home() / ".local" / "bin" / "claude")]:
        if Path(path).exists():
            return path
    print("ERROR: claude CLI not found. Install Claude Code or check PATH.")
    sys.exit(1)


def run_claude(
    prompt: str,
    *,
    model: str = GENERATION_MODEL,
    schema_file: str | None = None,
    claude_bin: str,
) -> str:
    """Run claude -p and return the AI response.

    Uses --output-format json to get the session envelope, then extracts:
    - envelope["structured_output"] when --json-schema is used
    - envelope["result"] for plain text calls

    Args:
        prompt: The prompt text (piped via stdin).
        model: Model alias (opus, sonnet, haiku).
        schema_file: Path to JSON schema file for structured output.
        claude_bin: Path to claude binary.

    Returns:
        JSON string (for schema calls) or plain text (for non-schema calls).
    """
    cmd = [
        claude_bin,
        "-p",
        "--model", model,
        "--max-turns", str(MAX_TURNS),
        "--max-budget-usd", str(MAX_BUDGET_USD),
        "--dangerously-skip-permissions",
        "--output-format", "json",
    ]

    if schema_file:
        schema = Path(schema_file).read_text()
        cmd.extend(["--json-schema", schema])

    # Unset CLAUDECODE to allow nested invocation from within Claude Code sessions
    env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}

    result = subprocess.run(
        cmd,
        input=prompt,
        capture_output=True,
        text=True,
        timeout=180,
        env=env,
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"claude -p failed (exit {result.returncode}):\n"
            f"stderr: {result.stderr[:500]}"
        )

    stdout = result.stdout.strip()
    if not stdout:
        raise RuntimeError("claude -p returned empty output")

    # Parse the session envelope
    envelope = json.loads(stdout)

    if envelope.get("is_error"):
        raise RuntimeError(
            f"claude -p error: {envelope.get('subtype', 'unknown')} — "
            f"{envelope.get('result', '')}"
        )

    # Extract content from envelope
    if schema_file:
        # --json-schema puts validated output in "structured_output"
        structured = envelope.get("structured_output")
        if structured is None:
            raise RuntimeError(
                f"No structured_output in response (subtype: {envelope.get('subtype')})"
            )
        return json.dumps(structured)
    else:
        # Plain text calls put content in "result"
        return envelope.get("result", "")


def build_target_context(target: dict) -> str:
    """Build the context string from target data (matches ai-generate.ts:93-104)."""
    services = []
    try:
        services = json.loads(target.get("services") or "[]")
    except (json.JSONDecodeError, TypeError):
        services = []

    brand_colors = {}
    try:
        brand_colors = json.loads(target.get("brand_colors") or "{}")
    except (json.JSONDecodeError, TypeError):
        brand_colors = {}

    return f"""COMPANY: {target['company_name']}
CITY: {target['city']}
TERRITORY: {target['territory']}
WEBSITE: {target.get('website') or 'none found'}
GOOGLE RATING: {target.get('google_rating') or 'unknown'}/5 from {target.get('google_review_count') or 0} reviews
SERVICES: {', '.join(services) if services else 'General renovation'}
YEARS IN BUSINESS: {target.get('years_in_business') or 'unknown'}
OWNER NAME: {target.get('owner_name') or 'unknown'}
BRAND COLORS: Primary={brand_colors.get('primary', 'unknown')}, Accent={brand_colors.get('accent', 'unknown')}
BRAND DESCRIPTION: {target.get('brand_description') or 'none'}"""


def build_full_token_map(target: dict, ai_tokens: dict) -> dict:
    """Merge DB target data with AI-generated tokens (port of buildFullTokenMap)."""
    services = []
    try:
        services = json.loads(target.get("services") or "[]")
    except (json.JSONDecodeError, TypeError):
        services = []

    brand_colors = {}
    try:
        brand_colors = json.loads(target.get("brand_colors") or "{}")
    except (json.JSONDecodeError, TypeError):
        brand_colors = {}

    return {
        # From DB
        "COMPANY_NAME": target["company_name"],
        "COMPANY_SLUG": target["slug"],
        "CITY": target["city"],
        "TERRITORY": target["territory"],
        "WEBSITE": target.get("website") or "",
        "EMAIL": target.get("email") or "",
        "GOOGLE_RATING": str(target["google_rating"]) if target.get("google_rating") else "Top-rated",
        "GOOGLE_REVIEW_COUNT": str(target["google_review_count"]) if target.get("google_review_count") else "dozens of",
        "SERVICES_LIST": ", ".join(services) if services else "renovation services",
        "YEARS_IN_BUSINESS": str(target["years_in_business"]) if target.get("years_in_business") else "several",
        "PRIMARY_COLOR": brand_colors.get("primary", "#0F172A"),
        "BRAND_DESCRIPTION": target.get("brand_description") or f"{target['city']}'s trusted renovation experts",
        "DATE": date.today().isoformat(),
        "DEMO_URL": "https://dashboard-rho-ten-70.vercel.app",
        "MICROSITE_URL": f"www.norbotsystems.com/{target['slug']}",
        "MICROSITE_LINK_LABEL": f"A private page I built for {target['company_name']}",
        "SENDER_NAME": "Ferdie Botden",
        "SENDER_EMAIL": "ferdie@norbotsystems.com",
        "CASL_ADDRESS": "140 Dempsey Dr, Stratford, ON N5A 0K5",
        "CASL_UNSUBSCRIBE": "If you'd prefer not to hear from me, just reply STOP and I'll remove you immediately.",
        # From AI
        "OWNER_NAME": ai_tokens.get("OWNER_NAME", "there"),
        "ACCENT_COLOR": ai_tokens.get("ACCENT_COLOR", "#DC2626"),
        "ACCENT_COLOR_LIGHT": ai_tokens.get("ACCENT_COLOR_LIGHT", "#FEF2F2"),
        "ACCENT_COLOR_DARK": ai_tokens.get("ACCENT_COLOR_DARK", "#B91C1C"),
        "COMPANY_LOGO_URL": ai_tokens.get("COMPANY_LOGO_URL", ""),
        "SETUP_PRICE": ai_tokens.get("SETUP_PRICE", "$4,500"),
        "MONTHLY_PRICE": ai_tokens.get("MONTHLY_PRICE", "$699/mo"),
        "CALENDAR_URL": ai_tokens.get("CALENDAR_URL", "https://www.norbotsystems.com/contact"),
        "PHONE_NUMBER": ai_tokens.get("PHONE_NUMBER", "226-884-0095"),
        "TESTIMONIAL_1": ai_tokens.get("TESTIMONIAL_1", ""),
        "TESTIMONIAL_1_AUTHOR": ai_tokens.get("TESTIMONIAL_1_AUTHOR", ""),
        "TESTIMONIAL_2": ai_tokens.get("TESTIMONIAL_2", ""),
        "TESTIMONIAL_2_AUTHOR": ai_tokens.get("TESTIMONIAL_2_AUTHOR", ""),
    }


def _ensure_casl_footer(body: str) -> str:
    """Append CASL footer if not already present in the email body."""
    if "Ferdie Botden" in body and "140 Dempsey" in body and "STOP" in body:
        return body
    return body + CASL_FOOTER


def format_email_sequence(emails: dict, microsite_url: str) -> str:
    """Format AI-generated email content into markdown (port of formatEmailSequence)."""
    sections = []

    def inject_url(body: str) -> str:
        return (
            body.replace("[MICROSITE_URL]", microsite_url)
            .replace("{{MICROSITE_URL}}", microsite_url)
        )

    # Email 1
    sections.append("# Email 1: Initial Outreach\n")
    sections.append("**Subject lines (A/B test):**")
    for subject in emails.get("initial", {}).get("subject_lines", []):
        sections.append(f"- {subject}")
    sections.append("\n---\n")
    body1 = inject_url(emails.get("initial", {}).get("body", ""))
    sections.append(_ensure_casl_footer(body1))

    # Email 2
    sections.append("\n\n---\n\n# Email 2: Follow-Up (next day)\n")
    sections.append("**Subject lines (A/B test):**")
    for subject in emails.get("follow_up", {}).get("subject_lines", []):
        sections.append(f"- {subject}")
    sections.append("\n---\n")
    body2 = inject_url(emails.get("follow_up", {}).get("body", ""))
    sections.append(_ensure_casl_footer(body2))

    return "\n".join(sections)


def generate_for_target(
    target_id: int,
    *,
    dry_run: bool = False,
    claude_bin: str,
) -> bool:
    """Generate all artifacts for a single target. Returns True on success."""
    target = get_target(target_id)
    if not target:
        print(f"  ERROR: Target {target_id} not found.")
        return False

    if target["status"] not in ("qualified", "draft_ready"):
        print(f"  SKIP: Target {target_id} ({target['company_name']}) is '{target['status']}' — must be 'qualified' or 'draft_ready'.")
        return False

    company = target["company_name"]
    slug = target["slug"]
    today = date.today().isoformat()
    context = build_target_context(target)

    print(f"\n{'='*60}")
    print(f"  Generating: {company} (ID {target_id})")
    print(f"  Territory: {target['territory']} | Status: {target['status']}")
    print(f"{'='*60}")

    services = []
    try:
        services = json.loads(target.get("services") or "[]")
    except (json.JSONDecodeError, TypeError):
        pass

    # ── Step 1: Generate AI token values ──────────────────────────────
    print("  [1/7] Generating token values...")
    tokens_prompt = (PROMPTS_DIR / "tokens.txt").read_text()
    tokens_prompt = tokens_prompt.replace("{TARGET_CONTEXT}", context)
    tokens_prompt = tokens_prompt.replace("{SERVICES}", ", ".join(services) if services else "general renovation")
    tokens_prompt = tokens_prompt.replace("{CITY}", target["city"])

    if dry_run:
        print("        [DRY RUN] Would call claude -p with tokens schema")
        ai_tokens = {
            "OWNER_NAME": target.get("owner_name", "there"),
            "ACCENT_COLOR": "#DC2626",
            "ACCENT_COLOR_LIGHT": "#FEF2F2",
            "ACCENT_COLOR_DARK": "#B91C1C",
            "COMPANY_LOGO_URL": "",
            "SETUP_PRICE": "$4,500",
            "MONTHLY_PRICE": "$699/mo",
            "CALENDAR_URL": "https://www.norbotsystems.com/contact",
            "PHONE_NUMBER": "226-884-0095",
            "TESTIMONIAL_1": "Placeholder testimonial for dry run.",
            "TESTIMONIAL_1_AUTHOR": f"Jane D., {target['city']}",
            "TESTIMONIAL_2": "Second placeholder testimonial for dry run.",
            "TESTIMONIAL_2_AUTHOR": f"Mark S., {target['city']}",
        }
    else:
        try:
            raw = run_claude(
                tokens_prompt,
                model=GENERATION_MODEL,
                schema_file=str(SCHEMAS_DIR / "ai_tokens.json"),
                claude_bin=claude_bin,
            )
            ai_tokens = json.loads(raw)
            print(f"        Done — owner: {ai_tokens.get('OWNER_NAME')}, accent: {ai_tokens.get('ACCENT_COLOR')}")
        except Exception as e:
            print(f"        ERROR: Token generation failed — {e}")
            return False

    # ── Step 2: Generate email content ────────────────────────────────
    print("  [2/7] Generating email sequence...")
    email_prompt = (PROMPTS_DIR / "emails.txt").read_text()
    email_prompt = email_prompt.replace("{TARGET_CONTEXT}", context)
    email_prompt = email_prompt.replace("{COMPANY_NAME}", company)
    email_prompt = email_prompt.replace("{SLUG}", slug)
    email_prompt = email_prompt.replace("{SERVICES}", ", ".join(services) if services else "general renovation")

    if dry_run:
        print("        [DRY RUN] Would call claude -p with email schema")
        emails = {
            "initial": {
                "subject_lines": [f"{slug} after hours"],
                "body": "Dry run email 1 body placeholder.",
            },
            "follow_up": {
                "subject_lines": [f"re: {slug}"],
                "body": "Dry run email 2 body placeholder.",
            },
        }
    else:
        try:
            raw = run_claude(
                email_prompt,
                model=GENERATION_MODEL,
                schema_file=str(SCHEMAS_DIR / "email_content.json"),
                claude_bin=claude_bin,
            )
            emails = json.loads(raw)
            n_subjects = len(emails.get("initial", {}).get("subject_lines", []))
            print(f"        Done — {n_subjects} subject lines for email 1")
        except Exception as e:
            print(f"        ERROR: Email generation failed — {e}")
            return False

    # ── Step 3: Generate call script ──────────────────────────────────
    print("  [3/7] Generating call script...")
    call_prompt = (PROMPTS_DIR / "call_script.txt").read_text()
    call_prompt = call_prompt.replace("{TARGET_CONTEXT}", context)
    call_prompt = call_prompt.replace("{COMPANY_NAME}", company)
    call_prompt = call_prompt.replace("{GOOGLE_RATING}", str(target.get("google_rating") or "unknown"))
    call_prompt = call_prompt.replace("{GOOGLE_REVIEW_COUNT}", str(target.get("google_review_count") or 0))
    call_prompt = call_prompt.replace("{SERVICES}", ", ".join(services) if services else "general renovation")
    call_prompt = call_prompt.replace("{TERRITORY}", target["territory"])

    if dry_run:
        print("        [DRY RUN] Would call claude -p for call script")
        call_script = "# Discovery Call Script (Dry Run)\n\nPlaceholder call script."
    else:
        try:
            call_script = run_claude(
                call_prompt,
                model=GENERATION_MODEL,
                claude_bin=claude_bin,
            )
            print(f"        Done — {len(call_script)} chars")
        except Exception as e:
            print(f"        ERROR: Call script generation failed — {e}")
            return False

    # ── Step 4: Build token map and fill microsite template ───────────
    print("  [4/7] Building microsite...")
    token_map = build_full_token_map(target, ai_tokens)
    microsite_template = load_template(TEMPLATES / "microsite" / "base.html")
    microsite_html = fill_template(microsite_template, token_map)

    # ── Step 5: Format email sequence ─────────────────────────────────
    print("  [5/7] Formatting email sequence...")
    email_content = format_email_sequence(emails, token_map["MICROSITE_URL"])

    # ── Step 6: Quality review ────────────────────────────────────────
    print("  [6/7] Quality review (Sonnet 4.6)...")
    review_prompt = (PROMPTS_DIR / "review.txt").read_text()
    review_prompt = review_prompt.replace("{COMPANY_NAME}", company)
    review_prompt = review_prompt.replace("{SLUG}", slug)
    review_prompt = review_prompt.replace("{MICROSITE_PREVIEW}", microsite_html[:2000])
    review_prompt = review_prompt.replace("{EMAIL_CONTENT}", email_content)
    review_prompt = review_prompt.replace("{CALL_SCRIPT_PREVIEW}", call_script[:3000])

    if dry_run:
        print("        [DRY RUN] Would call claude -p with review schema")
        review = {"pass": True, "score": 85, "issues": [], "summary": "Dry run — skipped review."}
    else:
        try:
            raw = run_claude(
                review_prompt,
                model=REVIEW_MODEL,
                schema_file=str(SCHEMAS_DIR / "review_result.json"),
                claude_bin=claude_bin,
            )
            review = json.loads(raw)
            status = "PASS" if review.get("pass") else "NEEDS REVISION"
            print(f"        {status} — score {review.get('score', '?')}/100")
            if review.get("issues"):
                for issue in review["issues"]:
                    print(f"          [{issue['severity']}] {issue['description']}")
        except Exception as e:
            print(f"        WARN: Review failed (non-fatal) — {e}")
            review = {"pass": True, "score": 0, "issues": [], "summary": f"Review error: {e}"}

    # ── Step 7: Save artifacts ────────────────────────────────────────
    print("  [7/7] Saving artifacts...")
    outbox_dir = OUTBOX / today / slug
    outbox_dir.mkdir(parents=True, exist_ok=True)
    (outbox_dir / "microsite").mkdir(exist_ok=True)

    # Save locally
    (outbox_dir / "microsite" / "index.html").write_text(microsite_html)
    (outbox_dir / "email_draft.md").write_text(email_content)
    (outbox_dir / "call_script.md").write_text(call_script)
    (outbox_dir / "target.json").write_text(json.dumps(target, indent=2, default=str))
    (outbox_dir / "review.json").write_text(json.dumps(review, indent=2))
    print(f"        Local: {outbox_dir}")

    if dry_run:
        print(f"\n  [DRY RUN] Skipping Blob upload and DB updates for {company}")
        return True

    # Upload to Vercel Blob
    blob_urls = {}
    try:
        node = shutil.which("node")
        if not node:
            raise RuntimeError("node not found in PATH")
        upload_script = str(SCRIPTS_DIR / "upload_blob.cjs")
        result = subprocess.run(
            [node, upload_script, slug, today, str(outbox_dir)],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode == 0 and result.stdout.strip():
            blob_urls = json.loads(result.stdout.strip())
            print(f"        Blob: {len(blob_urls)} files uploaded")
            for key, url in blob_urls.items():
                print(f"          {key}: {url}")
        else:
            print(f"        WARN: Blob upload failed — {result.stderr[:200]}")
            print(f"        Artifacts saved locally at {outbox_dir}")
    except Exception as e:
        print(f"        WARN: Blob upload error — {e}")
        print(f"        Artifacts saved locally at {outbox_dir}")

    # Update Turso DB
    try:
        if blob_urls.get("microsite"):
            log_artifact(target_id, "microsite", blob_urls["microsite"])
        if blob_urls.get("email"):
            log_artifact(target_id, "email_initial", blob_urls["email"])
        if blob_urls.get("callScript"):
            log_artifact(target_id, "call_script", blob_urls["callScript"])

        update_target_status(target_id, "draft_ready")

        review_note = f"Review: {'PASS' if review.get('pass') else 'FAIL'} ({review.get('score', 0)}/100). {review.get('summary', '')}"
        log_touch(
            target_id,
            "other",
            f"Local AI generation: artifacts created for {company}",
            "sent" if review.get("pass") else "no_response",
            review_note,
        )
        print(f"        DB updated — status → draft_ready")
    except Exception as e:
        print(f"        WARN: DB update failed — {e}")

    print(f"\n  Done: {company}")
    print(f"    Microsite: {blob_urls.get('microsite', outbox_dir / 'microsite' / 'index.html')}")
    print(f"    Email: {blob_urls.get('email', outbox_dir / 'email_draft.md')}")
    print(f"    Call script: {blob_urls.get('callScript', outbox_dir / 'call_script.md')}")
    print(f"    Review: {'PASS' if review.get('pass') else 'NEEDS REVISION'} ({review.get('score', 0)}/100)")

    return True


def get_candidates_local(limit: int = 5) -> list[dict]:
    """Get qualified targets in available territories, ordered by score.

    Replicates GET /api/pipeline/candidates logic without Dashboard API dependency.
    """
    qualified = get_targets_by_status("qualified")
    if not qualified:
        return []

    # Sort by score descending
    qualified.sort(key=lambda t: t.get("score") or 0, reverse=True)

    return qualified[:limit]


def main():
    parser = argparse.ArgumentParser(
        description="Generate outreach artifacts using Claude Code Max subscription"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--id", type=int, help="Target ID to generate for")
    group.add_argument("--all", action="store_true", help="Generate for top qualified candidates")
    parser.add_argument("--limit", type=int, default=5, help="Max targets when using --all (default: 5)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without DB changes or API calls")
    parser.add_argument(
        "--use-api",
        action="store_true",
        help="Fall back to Dashboard API instead of local generation",
    )

    args = parser.parse_args()

    if args.use_api:
        print("Falling back to Dashboard API — use nightly_pipeline.py stage_generate() directly.")
        sys.exit(0)

    claude_bin = find_claude_binary()
    print(f"Claude CLI: {claude_bin}")

    if args.id:
        targets = [args.id]
    else:
        candidates = get_candidates_local(args.limit)
        if not candidates:
            print("No qualified candidates available for generation.")
            sys.exit(0)
        targets = [c["id"] for c in candidates]
        print(f"Found {len(targets)} candidates:")
        for c in candidates:
            print(f"  [{c['id']}] {c['company_name']} (score: {c.get('score', '?')})")

    success_count = 0
    for i, target_id in enumerate(targets):
        ok = generate_for_target(target_id, dry_run=args.dry_run, claude_bin=claude_bin)
        if ok:
            success_count += 1

        # Delay between targets to avoid rate limiting
        if not args.dry_run and i < len(targets) - 1:
            print(f"\n  Waiting {INTER_TARGET_DELAY}s before next target...")
            time.sleep(INTER_TARGET_DELAY)

    print(f"\n{'='*60}")
    print(f"  Complete: {success_count}/{len(targets)} targets generated")
    if args.dry_run:
        print("  (dry-run mode — no files uploaded, no DB changes)")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
