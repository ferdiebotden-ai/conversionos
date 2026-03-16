#!/usr/bin/env python3
"""Nightly pipeline — runs via Claude Code skill or LaunchAgent.

5-stage autonomous flow:
  1. Discover:    Find new contractors in active cities
  2. Qualify:     Score all discovered leads (threshold >= 55, inverted logic)
  3. Generate:    Local AI generation via Claude Code Max (or Dashboard API with --use-api)
  3.5. Drafts:    Create Gmail drafts for Email 1 of newly generated targets
  4. Summary:     Report results to stdout + Telegram

Usage:
    python scripts/nightly_pipeline.py              # Full run (local generation)
    python scripts/nightly_pipeline.py --dry-run    # Preview without changes
    python scripts/nightly_pipeline.py --use-api    # Use Dashboard API (needs Anthropic credits)
    python scripts/nightly_pipeline.py --skip-discover  # Skip discovery stage
    python scripts/nightly_pipeline.py --skip-generate  # Skip generation stage
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import (
    get_all_territories,
    get_pipeline_summary,
    get_targets_by_status,
    insert_territory,
    print_pipeline_summary,
)
from qualify_target import qualify_target as _qualify_one
from firecrawl_discover import discover_and_insert as _firecrawl_discover
from firecrawl_discover import brave_discover_and_insert as _brave_discover

# ── Configuration ──────────────────────────────────────────────────────

CONFIG_PATH = Path(__file__).parent.parent / "config" / "outreach_config.yaml"
DASHBOARD_URL = os.environ.get("DASHBOARD_URL", "https://dashboard-rho-ten-70.vercel.app")
PIPELINE_API_SECRET = os.environ.get("PIPELINE_API_SECRET", "")

MAX_DISCOVER_PER_CITY = 30
QUALIFY_THRESHOLD = 55


def load_config() -> dict:
    """Load outreach_config.yaml."""
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)


def active_cities(config: dict) -> list[dict]:
    """Return only the active city entries from config."""
    return [c for c in config.get("cities", []) if c.get("active")]


def api_headers() -> dict[str, str]:
    """Build HTTP headers for dashboard API calls."""
    headers = {"Content-Type": "application/json"}
    if PIPELINE_API_SECRET:
        headers["Authorization"] = f"Bearer {PIPELINE_API_SECRET}"
    return headers


def api_call(method: str, path: str, body: dict | None = None, timeout: int = 30) -> dict:
    """Make an HTTP request to the dashboard API. Returns parsed JSON."""
    url = f"{DASHBOARD_URL}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=api_headers(), method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


# ── Stage -1: Auto-Expand ─────────────────────────────────────────────

def stage_auto_expand(config: dict, dry_run: bool = False) -> list[str]:
    """Check if current territories are saturated and expand to the next phase.

    A territory is 'saturated' if it has at least one target in draft_ready or beyond.
    When all active territories are saturated, insert the next batch of inactive cities
    as available territories (up to one phase at a time, max 4 cities).

    This only inserts territory DB records at runtime — it does NOT modify the YAML.
    """
    print("\n--- Stage -1: Auto-Expand ---")

    existing = {t["name"] for t in get_all_territories()}
    all_cities = config.get("cities", [])
    active = [c for c in all_cities if c.get("active")]

    # Check saturation: every active territory has at least one target past qualified
    advanced_statuses = {"draft_ready", "reviewed", "contacted", "interested", "demo_sent", "closed_won"}
    saturated = True
    for city_cfg in active:
        territory_name = city_cfg["name"]
        if territory_name not in existing:
            saturated = False
            break
        # Check if there's a target in an advanced status for this territory
        for status in advanced_statuses:
            targets = get_targets_by_status(status)
            if any(t.get("territory") == territory_name for t in targets):
                break
        else:
            saturated = False
            break

    if not saturated:
        print("  Not yet saturated — no expansion needed")
        return []

    # Find next inactive batch (cities with active=false that don't have territories yet)
    inactive = [c for c in all_cities if not c.get("active") and c["name"] not in existing]
    if not inactive:
        print("  All cities already have territories — no expansion available")
        return []

    # Take up to 4 cities (one phase-worth)
    batch = inactive[:4]
    expanded = []

    for city_cfg in batch:
        name = city_cfg["name"]
        if dry_run:
            print(f"  [DRY RUN] Would insert territory: {name}")
        else:
            result = insert_territory(name)
            if result:
                print(f"  Inserted territory: {name}")
            else:
                print(f"  Territory already exists: {name}")
        expanded.append(name)

    print(f"  Expanded {len(expanded)} territories")
    return expanded


# ── Stage 0: Expire ───────────────────────────────────────────────────

def stage_expire(dry_run: bool = False) -> list[dict]:
    """Release contacted targets with no positive response after 7 days."""
    print("\n--- Stage 0: Expire ---")

    if dry_run:
        print("  [DRY RUN] Would call /api/pipeline/expire")
        return []

    try:
        result = api_call("POST", "/api/pipeline/expire")
        count = result.get("count", 0)
        expired = result.get("expired", [])
        if count:
            print(f"  Expired {count} stale contacts:")
            for t in expired:
                print(f"    [{t['id']}] {t['company_name']} — territory {t['territory']} released")
        else:
            print("  No stale contacts to expire")
        return expired
    except Exception as e:
        print(f"  ERROR: expire call failed — {e}")
        return []


# ── Stage 1: Discover ─────────────────────────────────────────────────

def stage_discover(config: dict, dry_run: bool = False, skip_firecrawl: bool = False,
                    provider: str = "auto") -> list[dict]:
    """Discover new targets across all active cities.

    Provider priority: brave (free) → firecrawl (if key set) → skip.
    With --provider flag, force a specific provider.
    """
    print("\n--- Stage 1: Discover ---")

    cities = active_cities(config)
    if not cities:
        print("  No active cities configured")
        return []

    # Determine which cities need targets (skip cities that already have targets)
    territories = {t["name"]: t for t in get_all_territories()}
    cities_needing_targets = []
    for city_config in cities:
        territory_name = city_config["name"]
        territory = territories.get(territory_name)
        # Skip if territory is reserved or sold
        if territory and territory.get("status") in ("reserved", "sold"):
            continue
        cities_needing_targets.append(city_config)

    if not cities_needing_targets:
        print("  All active territories are reserved or sold")
        return []

    print(f"  Cities needing targets: {len(cities_needing_targets)}/{len(cities)}")
    discovery_limit = config.get("pipeline", {}).get("daily_discovery_limit", MAX_DISCOVER_PER_CITY)

    # Provider selection
    default_provider = config.get("discovery", {}).get("default_provider", "brave")
    if provider == "auto":
        provider = default_provider

    firecrawl_key = os.environ.get("FIRECRAWL_API_KEY")
    total_discovered = 0

    for city_config in cities_needing_targets:
        city = city_config["city"]
        territory = city_config["name"]

        if provider == "brave" or (provider == "auto" and not firecrawl_key):
            try:
                new_targets = _brave_discover(
                    city=city,
                    territory=territory,
                    limit=discovery_limit,
                    dry_run=dry_run,
                )
                total_discovered += len(new_targets)
                print(f"  Brave: found {len(new_targets)} new targets in {city}")
            except Exception as e:
                print(f"  Brave discovery failed for {city}: {e}")
                # Fallback to Firecrawl if Brave fails and key is available
                if firecrawl_key and not skip_firecrawl:
                    try:
                        new_targets = _firecrawl_discover(
                            city=city, territory=territory,
                            limit=discovery_limit, dry_run=dry_run,
                        )
                        total_discovered += len(new_targets)
                        print(f"  Firecrawl (fallback): found {len(new_targets)} in {city}")
                    except Exception as e2:
                        print(f"  Firecrawl fallback also failed for {city}: {e2}")

        elif provider == "firecrawl" and firecrawl_key and not skip_firecrawl:
            try:
                new_targets = _firecrawl_discover(
                    city=city, territory=territory,
                    limit=discovery_limit, dry_run=dry_run,
                )
                total_discovered += len(new_targets)
                print(f"  Firecrawl: found {len(new_targets)} new targets in {city}")
            except Exception as e:
                print(f"  Firecrawl discovery failed for {city}: {e}")
        else:
            print(f"  Skipping {city} — no discovery provider available")

    print(f"\n  Total new targets discovered: {total_discovered}")

    targets = get_targets_by_status("discovered")
    print(f"  Total discovered (unqualified) targets: {len(targets)}")
    for t in targets[:20]:  # Cap display at 20
        print(f"    [{t['id']}] {t['company_name']} ({t['city']})")
    if len(targets) > 20:
        print(f"    ... and {len(targets) - 20} more")
    return targets


# ── Stage 2: Qualify ───────────────────────────────────────────────────

def stage_qualify(dry_run: bool = False) -> list[dict]:
    """Qualify all discovered targets."""
    print("\n--- Stage 2: Qualify ---")

    discovered = get_targets_by_status("discovered")

    if dry_run:
        print(f"  [DRY RUN] Would qualify {len(discovered)} targets")
        return []

    for t in discovered:
        _qualify_one(t["id"])

    qualified = get_targets_by_status("qualified")
    print(f"  Qualified {len(qualified)} targets above threshold ({QUALIFY_THRESHOLD})")
    for t in qualified:
        print(f"    [{t['id']}] {t['company_name']} — score: {t['score']}")
    return qualified


# ── Stage 3: Generate ──────────────────────────────────────────────────

def stage_generate(config: dict, dry_run: bool = False, generate_limit: int | None = None,
                   use_api: bool = False) -> list[dict]:
    """Generate artifacts for top qualified candidates.

    Default: local generation via generate_local.py (Claude Code Max subscription).
    Fallback: Dashboard API via --use-api flag (requires Anthropic API credits).
    """
    print("\n--- Stage 3: Generate ---")

    limit = generate_limit or config.get("pipeline", {}).get("daily_generate_limit", 5)

    if use_api:
        return _stage_generate_api(config, dry_run, limit)
    return _stage_generate_local(dry_run, limit)


def _stage_generate_local(dry_run: bool, limit: int) -> list[dict]:
    """Generate artifacts locally using claude -p subprocess calls."""
    from db_utils import get_candidates_local

    candidates = get_candidates_local(limit)

    if dry_run:
        print(f"  [DRY RUN] Would generate locally for {len(candidates)} candidates:")
        for c in candidates:
            print(f"    [{c['id']}] {c['company_name']} (score: {c.get('score', '?')})")
        return candidates

    if not candidates:
        print("  No qualified candidates available for generation")
        return []

    print(f"  Local generation for {len(candidates)} candidates (Claude Code Max):")

    # Run generate_local.py for each candidate
    import shutil
    import subprocess as sp

    python = sys.executable
    script = str(Path(__file__).parent / "generate_local.py")
    generated = []

    for candidate in candidates:
        target_id = candidate["id"]
        name = candidate["company_name"]
        print(f"  [{target_id}] {name}...")

        try:
            result = sp.run(
                [python, script, "--id", str(target_id)],
                capture_output=True,
                text=True,
                timeout=600,
                env={k: v for k, v in os.environ.items() if k != "CLAUDECODE"},
            )

            if result.returncode == 0:
                print(f"    Done")
                generated.append(candidate)
            else:
                print(f"    FAILED (exit {result.returncode})")
                if result.stderr:
                    print(f"    {result.stderr[:300]}")

        except sp.TimeoutExpired:
            print(f"    TIMEOUT (600s)")
        except Exception as e:
            print(f"    ERROR: {e}")

    return generated


def _stage_generate_api(config: dict, dry_run: bool, limit: int) -> list[dict]:
    """Generate artifacts via Dashboard API (fallback, requires API credits)."""
    print("  (Using Dashboard API — fallback mode)")

    if dry_run:
        try:
            result = api_call("GET", f"/api/pipeline/candidates?limit={limit}")
            candidates = result.get("candidates", [])
            print(f"  [DRY RUN] Would generate for {len(candidates)} candidates:")
            for c in candidates:
                print(f"    [{c['id']}] {c['company_name']} (score: {c['score']})")
            return candidates
        except Exception as e:
            print(f"  ERROR: candidates call failed — {e}")
            return []

    try:
        result = api_call("GET", f"/api/pipeline/candidates?limit={limit}")
        candidates = result.get("candidates", [])
    except Exception as e:
        print(f"  ERROR: candidates call failed — {e}")
        return []

    if not candidates:
        print("  No qualified candidates available for generation")
        return []

    print(f"  Generating artifacts for {len(candidates)} candidates:")
    generated = []

    for candidate in candidates:
        target_id = candidate["id"]
        name = candidate["company_name"]
        print(f"  [{target_id}] {name}...")

        try:
            gen_result = api_call(
                "POST",
                "/api/pipeline/generate",
                body={"targetId": target_id},
                timeout=300,
            )

            if gen_result.get("success"):
                urls = gen_result.get("urls", {})
                review = gen_result.get("review", {})
                score = review.get("score", "?") if review else "?"
                print(f"    Done — review {score}/100")
                if urls:
                    print(f"      Microsite: {urls.get('microsite', 'N/A')}")
                generated.append(candidate)
            else:
                print(f"    FAILED: {gen_result.get('message', gen_result.get('error', 'unknown'))}")

        except urllib.error.HTTPError as e:
            body = e.read().decode() if e.readable() else ""
            print(f"    HTTP {e.code}: {body[:200]}")
        except Exception as e:
            print(f"    ERROR: {e}")

    return generated


# ── Stage 3.5: Gmail Drafts ────────────────────────────────────────────

def stage_mail_drafts(generated: list[dict], config: dict, dry_run: bool = False) -> int:
    """Create Gmail drafts for Email 1 of newly generated targets via IMAP.

    Rate-limited: 2-3 sec delay between IMAP APPEND calls.
    Daily cap: respects pipeline.daily_outreach_limit from config.
    """
    print("\n--- Stage 3.5: Gmail Drafts ---")

    if not generated:
        print("  No new packages to create drafts for")
        return 0

    try:
        from create_mail_drafts import create_draft_for_target
    except ImportError:
        print("  WARN: create_mail_drafts.py not found, skipping")
        return 0

    daily_limit = config.get("pipeline", {}).get("daily_outreach_limit", 15)
    batch = generated[:daily_limit]

    if len(generated) > daily_limit:
        print(f"  Capping at {daily_limit} drafts (daily limit). {len(generated) - daily_limit} queued for tomorrow.")

    count = 0
    for i, target in enumerate(batch):
        try:
            if create_draft_for_target(target, email_num=1, outbox_date=None, dry_run=dry_run):
                count += 1

            # Rate limit: 2-3 sec between IMAP calls (skip on dry run)
            if not dry_run and i < len(batch) - 1:
                import time
                time.sleep(2.5)

        except Exception as e:
            print(f"  WARN: draft failed for {target.get('company_name', '?')}: {e}")

    print(f"  Created {count}/{len(batch)} Gmail drafts")
    return count


# ── Stage 4: Summary ───────────────────────────────────────────────────

def stage_summary(expired: list[dict], generated: list[dict]) -> str:
    """Build and print summary report."""
    print("\n--- Stage 4: Summary ---")

    summary = get_pipeline_summary()
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    lines = [
        f"Nightly Pipeline — {now}",
        "",
    ]

    if expired:
        lines.append(f"Expired {len(expired)} stale contacts:")
        for t in expired:
            territory = t.get('territory', '?')
            lines.append(f"  - {t.get('company_name', t.get('id', '?'))} ({territory})")
            # Check if there's a backup candidate for the released territory
            qualified = get_targets_by_status("qualified")
            backups = [q for q in qualified if q.get("territory") == territory]
            if backups:
                lines.append(f"    → Territory {territory} released → next candidate: {backups[0]['company_name']}")
        lines.append("")

    if generated:
        lines.append(f"Generated {len(generated)} packages:")
        for t in generated:
            lines.append(f"  - {t['company_name']} ({t.get('city', '?')}) — score {t.get('score', '?')}")
        lines.append("")

    lines.append("Pipeline:")
    for status, count in sorted(summary["pipeline"].items()):
        lines.append(f"  {status}: {count}")

    lines.append(f"\nTerritories: {json.dumps(summary['territories'])}")
    lines.append(f"Touches: {summary['total_touches']} | Artifacts: {summary['total_artifacts']}")

    if generated:
        lines.append(f"\n{len(generated)} packages ready for morning review")
    else:
        lines.append("\nNo new packages tonight")

    msg = "\n".join(lines)
    print(msg)
    return msg


# ── Main ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Nightly outreach pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Preview without changes")
    parser.add_argument("--skip-discover", action="store_true", help="Skip discovery stage")
    parser.add_argument("--skip-firecrawl", action="store_true",
                        help="Skip Firecrawl but report existing discovered targets")
    parser.add_argument("--skip-mail-drafts", action="store_true",
                        help="Skip Gmail draft creation")
    parser.add_argument("--generate-limit", type=int, default=None,
                        help="Override daily_generate_limit from config")
    parser.add_argument("--skip-generate", action="store_true",
                        help="Skip artifact generation stage")
    parser.add_argument("--use-api", action="store_true",
                        help="Use Dashboard API for generation instead of local Claude CLI")
    parser.add_argument("--provider", type=str, choices=["auto", "brave", "firecrawl"],
                        default="auto", help="Discovery provider (default: auto)")
    args = parser.parse_args()

    config = load_config()

    cities = active_cities(config)
    print(f"=== Nightly Pipeline — {datetime.now().strftime('%Y-%m-%d %H:%M')} ===")
    if args.dry_run:
        print("  MODE: DRY RUN")
    print(f"  Generation: {'Dashboard API' if args.use_api else 'Local (Claude Code Max)'}")
    print(f"  Dashboard: {DASHBOARD_URL}")
    print(f"  Active cities: {len(cities)} ({', '.join(c['city'] for c in cities[:10])}{'...' if len(cities) > 10 else ''})")
    print(f"  Discovery provider: {args.provider}")
    print(f"  Daily limits: discover={config.get('pipeline', {}).get('daily_discovery_limit', 30)}, "
          f"generate={config.get('pipeline', {}).get('daily_generate_limit', 50)}, "
          f"outreach={config.get('pipeline', {}).get('daily_outreach_limit', 50)}")

    # Stage -1: Auto-Expand (insert new territories when current ones are saturated)
    stage_auto_expand(config, args.dry_run)

    # Stage 1: Discover
    if not args.skip_discover:
        stage_discover(config, args.dry_run, skip_firecrawl=args.skip_firecrawl,
                       provider=args.provider)

    # Stage 2: Qualify
    stage_qualify(args.dry_run)

    # Stage 3: Generate (local by default, --use-api for Dashboard API fallback)
    if not args.skip_generate:
        generated = stage_generate(config, args.dry_run, generate_limit=args.generate_limit,
                                   use_api=args.use_api)
    else:
        print("\n--- Stage 3: Generate [SKIPPED] ---")
        generated = []

    # Stage 3.5: Mail Drafts (macOS only, non-fatal)
    if not args.skip_mail_drafts:
        try:
            stage_mail_drafts(generated, config, args.dry_run)
        except Exception as e:
            print(f"\n  WARN: mail drafts stage failed (non-fatal): {e}")

    # Stage 4: Summary
    stage_summary([], generated)

    print(f"\n=== Pipeline Complete ===")
    print_pipeline_summary()


if __name__ == "__main__":
    main()
