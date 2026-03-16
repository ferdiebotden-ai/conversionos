#!/usr/bin/env python3
"""Semantic memory utilities for Mission Control.

Stores and retrieves memories using Supabase pgvector for similarity search.
Embeddings generated via OpenAI text-embedding-3-small through OpenRouter API.

Usage:
    # Store a memory
    python scripts/memory_utils.py store --type idea --content "We should try X" --source telegram

    # Search memories
    python scripts/memory_utils.py search --query "territory expansion strategy"

    # List recent memories
    python scripts/memory_utils.py list --type pipeline --limit 10

    # Delete a memory
    python scripts/memory_utils.py delete --id <uuid>
"""

import argparse
import json
import os
import sys
import urllib.request
from datetime import datetime
from pathlib import Path


# Supabase config — NorBot-Pipeline project (ca-central-1, organizational brain)
SUPABASE_URL = os.environ.get(
    "SUPABASE_URL", "https://tebaswjwlrkzugbiuulg.supabase.co"
)
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")

# Embeddings via OpenRouter (proxies to OpenAI text-embedding-3-small)
# $0.02/M tokens — essentially free at our volume
EMBEDDING_API_URL = "https://openrouter.ai/api/v1/embeddings"
EMBEDDING_MODEL = "openai/text-embedding-3-small"
EMBEDDING_DIM = 1536
TABLE = "memories"

VALID_TYPES = [
    "idea", "fact", "conversation", "improvement", "research",
    "pipeline", "decision", "preference", "learning", "goal", "blocker",
]


def _load_env():
    """Load env vars from scripts/.env and fallback locations."""
    global SUPABASE_SERVICE_KEY, OPENROUTER_API_KEY

    env_files = [
        Path(__file__).parent / ".env",
        Path(__file__).parent / "../dashboard/.env.local",
    ]

    for env_path in env_files:
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    if key == "SUPABASE_SERVICE_KEY" and not SUPABASE_SERVICE_KEY:
                        SUPABASE_SERVICE_KEY = val
                    elif key == "OPENROUTER_API_KEY" and not OPENROUTER_API_KEY:
                        OPENROUTER_API_KEY = val


def _supabase_request(method: str, path: str, body: dict | list | None = None) -> dict | list:
    """Make a request to the Supabase REST API."""
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else ""
        print(f"ERROR: Supabase API {e.code}: {error_body}")
        sys.exit(1)


def _supabase_rpc(fn_name: str, params: dict) -> list:
    """Call a Supabase RPC (database function)."""
    url = f"{SUPABASE_URL}/rest/v1/rpc/{fn_name}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }

    data = json.dumps(params).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else ""
        print(f"ERROR: Supabase RPC {e.code}: {error_body}")
        sys.exit(1)


def generate_embedding(text: str) -> list[float]:
    """Generate an embedding using OpenAI text-embedding-3-small via OpenRouter."""
    if not OPENROUTER_API_KEY:
        print("WARN: No OPENROUTER_API_KEY — storing without embedding (search won't work)")
        return []

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    body = json.dumps({
        "model": EMBEDDING_MODEL,
        "input": text,
    }).encode()

    req = urllib.request.Request(EMBEDDING_API_URL, data=body, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode())
            return result["data"][0]["embedding"]
    except Exception as e:
        print(f"WARN: Embedding generation failed: {e}")
        return []


def store_memory(
    content: str,
    memory_type: str = "fact",
    metadata: dict | None = None,
    source: str = "manual",
    agent_id: str | None = None,
    product: str | None = None,
    importance: int = 5,
) -> dict:
    """Store a new memory with embedding."""
    if memory_type not in VALID_TYPES:
        print(f"ERROR: Invalid type '{memory_type}'. Valid: {VALID_TYPES}")
        sys.exit(1)

    embedding = generate_embedding(content)

    record = {
        "type": memory_type,
        "content": content,
        "metadata": metadata or {},
        "source": source,
        "importance": importance,
    }
    if agent_id:
        record["agent_id"] = agent_id
    if product:
        record["product"] = product
    if embedding:
        record["embedding"] = embedding

    result = _supabase_request("POST", TABLE, record)
    if isinstance(result, list) and result:
        return result[0]
    return result


def search_memory(
    query: str,
    threshold: float = 0.5,
    limit: int = 10,
    filter_type: str | None = None,
    filter_agent: str | None = None,
    filter_product: str | None = None,
) -> list[dict]:
    """Search memories by semantic similarity."""
    embedding = generate_embedding(query)
    if not embedding:
        print("ERROR: Cannot search without embedding (no OPENROUTER_API_KEY)")
        sys.exit(1)

    params = {
        "query_embedding": embedding,
        "match_threshold": threshold,
        "match_count": limit,
    }
    if filter_type:
        params["filter_type"] = filter_type
    if filter_agent:
        params["filter_agent"] = filter_agent
    if filter_product:
        params["filter_product"] = filter_product

    return _supabase_rpc("search_memories", params)


def list_memories(
    memory_type: str | None = None,
    limit: int = 20,
) -> list[dict]:
    """List recent memories, optionally filtered by type."""
    path = f"{TABLE}?select=id,type,content,source,created_at&order=created_at.desc&limit={limit}"
    if memory_type:
        path += f"&type=eq.{memory_type}"
    return _supabase_request("GET", path)


def delete_memory(memory_id: str) -> bool:
    """Delete a memory by ID."""
    path = f"{TABLE}?id=eq.{memory_id}"
    _supabase_request("DELETE", path)
    print(f"  Deleted memory {memory_id}")
    return True


def main():
    _load_env()

    parser = argparse.ArgumentParser(description="Semantic memory for Mission Control")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Store
    store_p = subparsers.add_parser("store", help="Store a new memory")
    store_p.add_argument("--type", required=True, choices=VALID_TYPES)
    store_p.add_argument("--content", required=True)
    store_p.add_argument("--source", default="manual")
    store_p.add_argument("--metadata", default=None, help="JSON metadata")

    # Search
    search_p = subparsers.add_parser("search", help="Search memories by similarity")
    search_p.add_argument("--query", required=True)
    search_p.add_argument("--threshold", type=float, default=0.1)
    search_p.add_argument("--limit", type=int, default=10)
    search_p.add_argument("--type", default=None, choices=VALID_TYPES)

    # List
    list_p = subparsers.add_parser("list", help="List recent memories")
    list_p.add_argument("--type", default=None, choices=VALID_TYPES)
    list_p.add_argument("--limit", type=int, default=20)

    # Delete
    del_p = subparsers.add_parser("delete", help="Delete a memory")
    del_p.add_argument("--id", required=True)

    args = parser.parse_args()

    if not SUPABASE_SERVICE_KEY:
        print("ERROR: SUPABASE_SERVICE_KEY not set.")
        print("Set in environment or add to scripts/.env")
        sys.exit(1)

    if args.command == "store":
        metadata = json.loads(args.metadata) if args.metadata else None
        result = store_memory(args.content, args.type, metadata, args.source)
        print(f"  Stored memory: {result.get('id', 'unknown')}")
        print(f"  Type: {args.type}")
        print(f"  Content: {args.content[:100]}...")

    elif args.command == "search":
        results = search_memory(args.query, args.threshold, args.limit, args.type)
        if not results:
            print("  No matching memories found")
        else:
            print(f"  Found {len(results)} memories:\n")
            for i, mem in enumerate(results, 1):
                sim = mem.get("similarity", 0)
                print(f"  {i}. [{mem['type']}] (similarity: {sim:.3f})")
                print(f"     {mem['content'][:120]}...")
                print(f"     Source: {mem.get('source', '?')} | {mem.get('created_at', '?')}")
                print()

    elif args.command == "list":
        results = list_memories(args.type, args.limit)
        if not results:
            print("  No memories found")
        else:
            print(f"  {len(results)} recent memories:\n")
            for i, mem in enumerate(results, 1):
                print(f"  {i}. [{mem['type']}] {mem['content'][:100]}...")
                print(f"     Source: {mem.get('source', '?')} | {mem.get('created_at', '?')}")
                print()

    elif args.command == "delete":
        delete_memory(args.id)


if __name__ == "__main__":
    main()
