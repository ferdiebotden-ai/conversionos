#!/usr/bin/env python3
"""Memory system health check for NorBot organizational brain.

Tests Supabase connectivity, table row counts, embedding generation,
and search RPC functionality. Used by Knox in morning briefings.

Usage:
    source ~/pipeline/scripts/.env
    python ~/pipeline/scripts/memory_health.py
"""

import json
import os
import sys
import urllib.request
from pathlib import Path


def _load_env():
    """Load env vars from scripts/.env."""
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key not in os.environ or not os.environ[key]:
                    os.environ[key] = val


def check_supabase_connectivity(url, key):
    """Test basic Supabase REST API connectivity."""
    try:
        req = urllib.request.Request(
            f"{url}/rest/v1/agents?select=id&limit=1",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
            },
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp.read()
        return True, "Connected"
    except Exception as e:
        return False, str(e)


def count_table_rows(url, key, table):
    """Count rows in a Supabase table."""
    try:
        req = urllib.request.Request(
            f"{url}/rest/v1/{table}?select=id&limit=0",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Prefer": "count=exact",
                "Range": "0-0",
            },
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            content_range = resp.headers.get("content-range", "")
            if "/" in content_range:
                count = content_range.split("/")[1]
                return True, int(count) if count != "*" else 0
        return True, 0
    except Exception as e:
        return False, str(e)


def test_embedding_generation(api_key):
    """Test embedding generation via OpenRouter."""
    try:
        body = json.dumps({
            "model": "openai/text-embedding-3-small",
            "input": "memory health check test",
        }).encode()
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/embeddings",
            data=body,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode())
            embedding = result["data"][0]["embedding"]
            if len(embedding) == 1536:
                return True, "1536-dim embedding generated", embedding
            return False, f"Unexpected dimension: {len(embedding)}", None
    except Exception as e:
        return False, str(e), None


def test_search_rpc(url, key, embedding):
    """Test the search_memories RPC with a real embedding."""
    try:
        body = json.dumps({
            "query_embedding": embedding,
            "match_threshold": 0.3,
            "match_count": 3,
        }).encode()
        req = urllib.request.Request(
            f"{url}/rest/v1/rpc/search_memories",
            data=body,
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            results = json.loads(resp.read().decode())
            return True, f"{len(results)} results returned"
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else ""
        return False, f"HTTP {e.code}: {error_body}"
    except Exception as e:
        return False, str(e)


def main():
    _load_env()

    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    openrouter_key = os.environ.get("OPENROUTER_API_KEY", "")

    if not url or not key:
        print("FAIL: SUPABASE_URL or SUPABASE_SERVICE_KEY not set")
        print("Run: source ~/pipeline/scripts/.env")
        sys.exit(1)

    results = []
    all_passed = True

    # 1. Supabase connectivity
    ok, msg = check_supabase_connectivity(url, key)
    results.append(("Supabase connectivity", ok, msg))
    if not ok:
        all_passed = False

    # 2. Table row counts
    for table in ["memories", "mem0_memories", "agents", "decisions", "learnings"]:
        ok, count = count_table_rows(url, key, table)
        if ok:
            results.append((f"Table: {table}", True, f"{count} rows"))
        else:
            results.append((f"Table: {table}", False, str(count)))
            all_passed = False

    # 3. Embedding generation
    embedding = None
    if openrouter_key:
        ok, msg, embedding = test_embedding_generation(openrouter_key)
        results.append(("Embedding generation", ok, msg))
        if not ok:
            all_passed = False
    else:
        results.append(("Embedding generation", False, "OPENROUTER_API_KEY not set"))
        all_passed = False

    # 4. Search RPC
    if embedding:
        ok, msg = test_search_rpc(url, key, embedding)
        results.append(("Search RPC (search_memories)", ok, msg))
        if not ok:
            all_passed = False
    else:
        results.append(("Search RPC", False, "Skipped (no embedding)"))
        all_passed = False

    # Print results
    print("\n=== Memory System Health Check ===\n")
    for name, ok, msg in results:
        status = "PASS" if ok else "FAIL"
        print(f"  [{status}] {name}: {msg}")

    print()
    if all_passed:
        print("  All checks passed.")
    else:
        print("  Some checks FAILED. Review above.")
    print()

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
