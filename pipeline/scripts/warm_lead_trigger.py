#!/usr/bin/env python3
"""Warm-lead auto-trigger daemon.

Polls Turso every 5 minutes for targets with status='interested' or
'warm_lead_queued' that haven't been built yet (bespoke_status IS NULL).
Spawns orchestrate.mjs --warm-lead as a background process.

Usage:
    python scripts/warm_lead_trigger.py              # One-shot check
    python scripts/warm_lead_trigger.py --dry-run    # Check without triggering

Designed to run via LaunchAgent (com.norbot.warm-lead-trigger) every 5 minutes.
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Load pipeline .env BEFORE importing db_utils (which reads TURSO_DATABASE_URL at module level)
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    with open(_env_path) as _f:
        for _line in _f:
            _line = _line.strip()
            if not _line or _line.startswith("#"):
                continue
            if _line.startswith("export "):
                _line = _line[7:]
            if "=" in _line:
                _key, _, _val = _line.partition("=")
                _key = _key.strip()
                _val = _val.strip().strip("'\"")
                if _key and _key not in os.environ:
                    os.environ[_key] = _val

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import get_db

ORCHESTRATE_PATH = str(Path(__file__).parent.parent / "tenant-builder" / "orchestrate.mjs")
CONVERSIONOS_ROOT = str(Path(__file__).parent.parent)
LOG_DIR = Path(os.path.expanduser("~/.openclaw/logs"))
LOG_FILE = LOG_DIR / "warm-lead-trigger.log"

# Telegram notification (optional)
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_NOTIFY_CHAT_ID", "")


def log(msg: str):
    """Log with timestamp."""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass


def send_telegram(message: str):
    """Send a Telegram notification (fire and forget)."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        import urllib.request
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        data = json.dumps({"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}).encode()
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=10)
    except Exception:
        pass


def get_warm_lead_candidates() -> list[dict]:
    """Find targets that need a warm-lead bespoke build."""
    with get_db() as conn:
        rows = conn.execute(
            """SELECT id, company_name, slug, website, city, icp_score
               FROM targets
               WHERE status IN ('interested', 'warm_lead_queued')
                 AND (bespoke_status IS NULL OR bespoke_status = 'failed')
                 AND website IS NOT NULL
               ORDER BY icp_score DESC
               LIMIT 5"""
        ).fetchall()
        return [dict(r) for r in rows]


def mark_queued(target_id: int):
    """Set bespoke_status to 'queued' to prevent re-triggering."""
    with get_db() as conn:
        conn.execute(
            "UPDATE targets SET bespoke_status = 'queued' WHERE id = ?",
            (target_id,)
        )


def trigger_build(target: dict, dry_run: bool = False):
    """Spawn orchestrate.mjs --warm-lead as a detached background process."""
    target_id = target["id"]
    name = target["company_name"]
    icp = target.get("icp_score", "?")

    if dry_run:
        log(f"  [DRY RUN] Would trigger warm-lead build for {name} (ID: {target_id}, ICP: {icp})")
        return

    log(f"  Triggering warm-lead build for {name} (ID: {target_id}, ICP: {icp})")
    mark_queued(target_id)

    # Spawn as detached background process
    cmd = [
        "/opt/homebrew/bin/node",
        ORCHESTRATE_PATH,
        "--warm-lead",
        "--target-id", str(target_id),
        "--auto-polish",
    ]

    log_path = LOG_DIR / f"warm-lead-build-{target['slug']}.log"
    with open(log_path, "a") as log_f:
        subprocess.Popen(
            cmd,
            cwd=CONVERSIONOS_ROOT,
            start_new_session=True,
            stdout=log_f,
            stderr=subprocess.STDOUT,
            env={**os.environ, "CLAUDECODE": ""},  # Strip to prevent nested sessions
        )

    send_telegram(f"🔨 *Warm-lead build started*\n{name} (ICP: {icp})\nCity: {target.get('city', '?')}")
    log(f"  Build process spawned for {name} (log: {log_path})")


def main():
    parser = argparse.ArgumentParser(description="Warm-lead auto-trigger")
    parser.add_argument("--dry-run", action="store_true", help="Check without triggering builds")
    args = parser.parse_args()

    log("Warm-lead trigger: checking for candidates...")
    candidates = get_warm_lead_candidates()

    if not candidates:
        log("  No warm-lead candidates found")
        return

    log(f"  Found {len(candidates)} candidate(s)")
    for target in candidates:
        trigger_build(target, dry_run=args.dry_run)

    log("Warm-lead trigger: done")


if __name__ == "__main__":
    main()
