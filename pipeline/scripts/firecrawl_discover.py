#!/usr/bin/env python3
"""Discover renovation contractors using Firecrawl API.

Uses Firecrawl's search + scrape + extract endpoints to find and enrich
contractor data, then inserts into the pipeline database.

Usage:
    # Search for contractors in a city
    python scripts/firecrawl_discover.py search --city "London" --territory "London, ON" --limit 5

    # Scrape + extract structured data from a specific URL
    python scripts/firecrawl_discover.py enrich --url "https://example.com" --target-id 1

    # Full pipeline: search, scrape, extract, insert
    python scripts/firecrawl_discover.py auto --city "London" --territory "London, ON" --limit 5

    # Dry run (no DB inserts)
    python scripts/firecrawl_discover.py auto --city "London" --territory "London, ON" --limit 3 --dry-run

    # Check credit usage
    python scripts/firecrawl_discover.py credits
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import get_target_by_slug, insert_target

FIRECRAWL_API_KEY = os.environ.get("FIRECRAWL_API_KEY", "")
FIRECRAWL_BASE = "https://api.firecrawl.dev/v2"

# Brave Search API (free tier: 2000 queries/month)
BRAVE_API_KEY = os.environ.get("BRAVE_SEARCH_API_KEY", "")
BRAVE_BASE = "https://api.search.brave.com/res/v1"

# Track credits used per run
_credits_used = 0
_brave_queries = 0


def _api_request(endpoint: str, payload: dict) -> dict:
    """Make an authenticated request to the Firecrawl API."""
    global _credits_used

    if not FIRECRAWL_API_KEY:
        print("ERROR: FIRECRAWL_API_KEY not set")
        sys.exit(1)

    url = f"{FIRECRAWL_BASE}/{endpoint}"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {FIRECRAWL_API_KEY}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode())
            _credits_used += 1
            return result
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"  Firecrawl API error {e.code}: {body[:500]}")
        return {"success": False, "error": body}
    except urllib.error.URLError as e:
        print(f"  Firecrawl connection error: {e.reason}")
        return {"success": False, "error": str(e.reason)}


def _slugify(name: str) -> str:
    """Convert company name to URL-safe slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug


def _get_brave_api_key() -> str:
    """Get Brave Search API key from env or OpenClaw config."""
    key = BRAVE_API_KEY
    if key:
        return key

    # Try reading from OpenClaw config
    openclaw_path = Path.home() / ".openclaw" / "openclaw.json"
    if openclaw_path.exists():
        try:
            config = json.loads(openclaw_path.read_text())
            key = config.get("tools", {}).get("web", {}).get("search", {}).get("apiKey", "")
            if key:
                return key
        except Exception:
            pass

    return ""


def brave_search_contractors(city: str, territory: str, limit: int = 5) -> list[dict]:
    """Search for renovation contractors using Brave Search API.

    Free tier: 2000 queries/month. No scraping credits needed.
    Returns basic search results (URL, title, description).
    """
    global _brave_queries

    api_key = _get_brave_api_key()
    if not api_key:
        print("  ERROR: No Brave Search API key found")
        print("  Set BRAVE_SEARCH_API_KEY env var or configure in OpenClaw")
        return []

    queries = [
        f"renovation contractor {city} Ontario",
        f"kitchen bathroom renovation {city} ON",
        f"home remodeling contractor {city} Ontario",
    ]

    all_results = []
    seen_urls = set()

    skip_domains = [
        "yelp.com", "yellowpages", "facebook.com", "instagram.com",
        "linkedin.com", "twitter.com", "x.com", "houzz.com",
        "homestars.com", "bbb.org", "google.com", "reddit.com",
        "kijiji.ca", "indeed.com", "glassdoor", "wikipedia.org",
        "youtube.com", "tiktok.com",
    ]

    for query in queries:
        if len(all_results) >= limit:
            break

        print(f"  Brave Search: {query}")
        url = f"{BRAVE_BASE}/web/search"
        params = urllib.parse.urlencode({
            "q": query,
            "count": min(limit * 2, 20),
            "country": "CA",
            "search_lang": "en",
            "freshness": "py",  # past year
        })

        req = urllib.request.Request(
            f"{url}?{params}",
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": api_key,
            },
        )

        try:
            import gzip as _gzip
            with urllib.request.urlopen(req, timeout=20) as resp:
                raw = resp.read()
                if raw[:2] == b'\x1f\x8b':
                    raw = _gzip.decompress(raw)
                result = json.loads(raw.decode())
                _brave_queries += 1
        except urllib.error.HTTPError as e:
            body = e.read().decode() if e.fp else ""
            print(f"    Brave API error {e.code}: {body[:300]}")
            continue
        except Exception as e:
            print(f"    Brave Search error: {e}")
            continue

        web_results = result.get("web", {}).get("results", [])

        for item in web_results:
            item_url = item.get("url", "")
            if item_url in seen_urls:
                continue
            if any(d in item_url.lower() for d in skip_domains):
                continue

            seen_urls.add(item_url)
            all_results.append({
                "url": item_url,
                "title": item.get("title", ""),
                "description": item.get("description", ""),
                "territory": territory,
                "city": city,
            })

            if len(all_results) >= limit:
                break

    print(f"  Found {len(all_results)} unique contractor websites (Brave)")
    return all_results


def brave_discover_and_insert(
    city: str,
    territory: str,
    limit: int = 5,
    dry_run: bool = False,
) -> list[dict]:
    """Discovery pipeline using Brave Search (no Firecrawl credits needed).

    Search → basic data extraction from title/description → insert into DB.
    Enrichment (scraping) happens separately if needed.
    """
    print(f"\n=== Brave Discovery — {city}, {territory} ===")
    print(f"  Limit: {limit} | Dry run: {dry_run}")

    candidates = brave_search_contractors(city, territory, limit=limit * 2)

    if not candidates:
        print("  No candidates found via Brave Search.")
        return []

    results = []
    for candidate in candidates:
        if len(results) >= limit:
            break

        title = candidate.get("title", "").strip()
        description = candidate.get("description", "").strip()

        # Extract company name from search title (usually "Company Name - Tagline" or "Company Name | City")
        name = title.split(" - ")[0].split(" | ")[0].split(" — ")[0].strip()
        # Remove common suffixes
        for suffix in [" Inc", " Ltd", " Corp", " LLC", " Home", " Renovations"]:
            if name.endswith(suffix + "."):
                name = name
                break

        if not name or len(name) < 3:
            continue

        slug = _slugify(name)

        # Dedup
        if not dry_run:
            existing = get_target_by_slug(slug)
            if existing:
                print(f"    SKIP (duplicate): {name} (slug: {slug})")
                continue

        # Basic data from search results
        target_data = {
            "company_name": name,
            "slug": slug,
            "city": city,
            "territory": territory,
            "website": candidate["url"],
            "brand_description": description[:500] if description else None,
            "notes": f"Discovered via Brave Search on {datetime.now().strftime('%Y-%m-%d')}. Needs enrichment.",
        }

        if dry_run:
            print(f"    [DRY RUN] Would insert: {name} ({candidate['url']})")
        else:
            target_id = insert_target(**target_data)
            print(f"    INSERTED: {name} (ID: {target_id}, slug: {slug})")
            target_data["id"] = target_id

        results.append(target_data)

    print(f"\n--- Brave Discovery Summary ---")
    print(f"  Searched: {len(candidates)} candidates")
    print(f"  Inserted: {len(results)} targets")
    print(f"  Brave queries used: {_brave_queries}")
    return results


def search_contractors(city: str, territory: str, limit: int = 5) -> list[dict]:
    """Search for renovation contractors using Firecrawl search API."""
    queries = [
        f"renovation contractor {city} Ontario",
        f"kitchen bathroom renovation company {city} ON",
        f"home renovation remodeling contractor {city} Ontario reviews",
    ]

    all_results = []
    seen_urls = set()

    for query in queries:
        if len(all_results) >= limit:
            break

        print(f"  Searching: {query}")
        result = _api_request("search", {
            "query": query,
            "limit": limit,
            "location": f"{city},Ontario,Canada",
            "country": "CA",
        })

        if not result.get("success"):
            print(f"    Search failed: {result.get('error', 'unknown')}")
            continue

        web_results = result.get("data", {}).get("web", [])
        if not web_results:
            # Some API versions return data as a list directly
            web_results = result.get("data", [])

        for item in web_results:
            url = item.get("url", "")
            if url in seen_urls:
                continue
            # Skip aggregator sites, directories, social media
            skip_domains = [
                "yelp.com", "yellowpages", "facebook.com", "instagram.com",
                "linkedin.com", "twitter.com", "x.com", "houzz.com",
                "homestars.com", "bbb.org", "google.com", "reddit.com",
                "kijiji.ca", "indeed.com", "glassdoor",
            ]
            if any(d in url.lower() for d in skip_domains):
                continue

            seen_urls.add(url)
            all_results.append({
                "url": url,
                "title": item.get("title", ""),
                "description": item.get("description", ""),
                "territory": territory,
                "city": city,
            })

            if len(all_results) >= limit:
                break

    print(f"  Found {len(all_results)} unique contractor websites")
    return all_results


def extract_contractor_data(url: str) -> dict | None:
    """Scrape a contractor website and extract structured business data."""
    print(f"  Extracting data from: {url}")

    schema = {
        "type": "object",
        "properties": {
            "company_name": {
                "type": "string",
                "description": "The official business name of the renovation company"
            },
            "phone": {
                "type": "string",
                "description": "Primary phone number"
            },
            "email": {
                "type": "string",
                "description": "Primary contact email address"
            },
            "services": {
                "type": "array",
                "items": {"type": "string"},
                "description": "List of renovation services offered (e.g., kitchen, bathroom, basement, general renovation)"
            },
            "years_in_business": {
                "type": "integer",
                "description": "Number of years the company has been in business"
            },
            "brand_description": {
                "type": "string",
                "description": "Brief company tagline or mission statement"
            },
            "owner_name": {
                "type": "string",
                "description": "Owner, founder, or principal's first name (or full name). Look on About page, Team page, footer, or Google Business Profile."
            },
            "logo_url": {
                "type": "string",
                "description": "URL of the company logo image"
            },
            "primary_color": {
                "type": "string",
                "description": "Primary brand colour as hex code (e.g., #FF0000)"
            },
            "secondary_color": {
                "type": "string",
                "description": "Secondary brand colour as hex code"
            },
            "accent_color": {
                "type": "string",
                "description": "Accent/highlight brand colour as hex code"
            },
            "city": {
                "type": "string",
                "description": "City where the company is located"
            },
            "google_rating": {
                "type": "number",
                "description": "Google Business rating (0-5 stars)"
            },
            "google_review_count": {
                "type": "integer",
                "description": "Number of Google reviews"
            },
            "tagline": {
                "type": "string",
                "description": "Company tagline, slogan, or hero text from the website header"
            },
            "testimonials": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "author": {"type": "string", "description": "Name of the reviewer"},
                        "text": {"type": "string", "description": "The testimonial or review text"},
                        "rating": {"type": "number", "description": "Star rating if available (1-5)"}
                    }
                },
                "description": "Customer testimonials or reviews found on the website"
            },
            "portfolio_images": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "url": {"type": "string", "description": "Full URL of the project image"},
                        "caption": {"type": "string", "description": "Image caption or alt text"},
                        "project_type": {"type": "string", "description": "Type of project (kitchen, bathroom, basement, etc.)"}
                    }
                },
                "description": "Project portfolio images showing completed renovation work"
            },
            "hero_image_url": {
                "type": "string",
                "description": "URL of the main hero/banner image from the homepage"
            },
            "about_text": {
                "type": "string",
                "description": "About us text — company history, mission, or team description"
            },
        },
        "required": ["company_name"],
    }

    result = _api_request("scrape", {
        "url": url,
        "formats": [
            {
                "type": "json",
                "schema": schema,
            }
        ],
        "timeout": 60000,
    })

    if not result.get("success"):
        print(f"    Scrape failed: {result.get('error', 'unknown')[:200]}")
        return None

    data = result.get("data", {})
    extracted = data.get("json", {})

    if not extracted or not extracted.get("company_name"):
        print("    No structured data extracted")
        return None

    print(f"    Extracted: {extracted.get('company_name', 'unknown')}")
    return extracted


def _find_owner_name(base_url: str) -> str | None:
    """Try scraping common about/team pages to find the owner or founder name.

    Tries a few well-known URL patterns. Returns the first owner name found,
    or None. Uses 1 credit per attempt.
    """
    # Normalize base URL
    base = base_url.rstrip("/")

    # Common about page paths, ordered by likelihood
    about_paths = ["/about", "/about-us", "/our-team", "/team", "/about-us/"]

    owner_schema = {
        "type": "object",
        "properties": {
            "owner_name": {
                "type": "string",
                "description": (
                    "The owner, founder, or principal contractor's full name. "
                    "Look for headings like 'Meet the Owner', 'About', 'Our Team', "
                    "founder bios, or any name with title Owner/Founder/President/Principal."
                ),
            },
        },
        "required": ["owner_name"],
    }

    for path in about_paths:
        url = base + path
        result = _api_request("scrape", {
            "url": url,
            "formats": [{"type": "json", "schema": owner_schema}],
            "timeout": 30000,
        })

        if not result.get("success"):
            continue

        extracted = result.get("data", {}).get("json", {})
        name = (extracted.get("owner_name") or "").strip()

        # Filter out placeholder/junk values
        if name and len(name) > 2 and name.lower() not in ("n/a", "unknown", "none", "null"):
            print(f"    Found owner on {path}: {name}")
            return name

    return None


def discover_and_insert(
    city: str,
    territory: str,
    limit: int = 5,
    dry_run: bool = False,
) -> list[dict]:
    """Full pipeline: search → scrape → extract → insert into DB."""
    print(f"\n=== Firecrawl Discovery — {city}, {territory} ===")
    print(f"  Limit: {limit} | Dry run: {dry_run}")
    print(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    # Stage 1: Search
    candidates = search_contractors(city, territory, limit=limit * 2)

    if not candidates:
        print("  No candidates found. Try different search terms.")
        return []

    # Stage 2: Extract data from each
    results = []
    for candidate in candidates:
        if len(results) >= limit:
            break

        extracted = extract_contractor_data(candidate["url"])
        if not extracted:
            continue

        name = extracted.get("company_name", "").strip()
        if not name:
            continue

        # If no owner name from homepage, try about/team pages
        if not extracted.get("owner_name"):
            print(f"    No owner name on homepage — checking about pages...")
            owner = _find_owner_name(candidate["url"])
            if owner:
                extracted["owner_name"] = owner
            else:
                print(f"    Owner name not found on about pages either")

        slug = _slugify(name)

        # Dedup: check if slug already exists in DB
        if not dry_run:
            existing = get_target_by_slug(slug)
            if existing:
                print(f"    SKIP (duplicate): {name} (slug: {slug})")
                continue

        # Build brand colours dict
        brand_colors = {}
        if extracted.get("primary_color"):
            brand_colors["primary"] = extracted["primary_color"]
        if extracted.get("secondary_color"):
            brand_colors["secondary"] = extracted["secondary_color"]
        if extracted.get("accent_color"):
            brand_colors["accent"] = extracted["accent_color"]
        if extracted.get("logo_url"):
            brand_colors["logo_url"] = extracted["logo_url"]

        # Build comprehensive brand_assets for microsite + bespoke reuse
        brand_assets = {}
        if extracted.get("tagline"):
            brand_assets["tagline"] = extracted["tagline"]
        if extracted.get("testimonials"):
            brand_assets["testimonials"] = extracted["testimonials"]
        if extracted.get("portfolio_images"):
            brand_assets["portfolio_images"] = extracted["portfolio_images"]
        if extracted.get("hero_image_url"):
            brand_assets["hero_image_url"] = extracted["hero_image_url"]
        if extracted.get("about_text"):
            brand_assets["about_text"] = extracted["about_text"]
        if extracted.get("services"):
            brand_assets["services"] = extracted["services"]
        if brand_colors:
            brand_assets["brand_colors"] = brand_colors

        target_data = {
            "company_name": name,
            "slug": slug,
            "city": extracted.get("city") or city,
            "territory": territory,
            "website": candidate["url"],
            "email": extracted.get("email"),
            "phone": extracted.get("phone"),
            "google_rating": extracted.get("google_rating"),
            "google_review_count": extracted.get("google_review_count"),
            "services": extracted.get("services"),
            "years_in_business": extracted.get("years_in_business"),
            "brand_colors": brand_colors if brand_colors else None,
            "brand_description": extracted.get("brand_description"),
            "brand_assets": brand_assets if brand_assets else None,
            "owner_name": extracted.get("owner_name"),
            "notes": f"Discovered via Firecrawl on {datetime.now().strftime('%Y-%m-%d')}",
        }

        if dry_run:
            print(f"    [DRY RUN] Would insert: {name} (slug: {slug})")
            print(f"      Services: {extracted.get('services', [])}")
            print(f"      Rating: {extracted.get('google_rating', 'N/A')}")
        else:
            target_id = insert_target(**target_data)
            print(f"    INSERTED: {name} (ID: {target_id}, slug: {slug})")
            target_data["id"] = target_id

        results.append(target_data)

    # Summary
    print(f"\n--- Discovery Summary ---")
    print(f"  Searched: {len(candidates)} candidates")
    print(f"  Inserted: {len(results)} targets")
    print(f"  Credits used: {_credits_used}")
    return results


def enrich_target(url: str, target_id: int | None = None) -> dict | None:
    """Scrape a URL and extract brand data. Optionally update a target."""
    extracted = extract_contractor_data(url)
    if not extracted:
        return None

    # Try about pages if no owner name found
    if not extracted.get("owner_name"):
        print(f"  No owner name on homepage — checking about pages...")
        owner = _find_owner_name(url)
        if owner:
            extracted["owner_name"] = owner

    print(f"\n  Extracted data:")
    for k, v in extracted.items():
        if v:
            print(f"    {k}: {v}")

    if target_id:
        print(f"\n  To update target {target_id}, use the dashboard or db_utils directly.")

    return extracted


def main():
    parser = argparse.ArgumentParser(description="Discover contractors via Firecrawl")
    sub = parser.add_subparsers(dest="command")

    # search command
    search_p = sub.add_parser("search", help="Search for contractor websites")
    search_p.add_argument("--city", required=True)
    search_p.add_argument("--territory", required=True)
    search_p.add_argument("--limit", type=int, default=5)

    # enrich command
    enrich_p = sub.add_parser("enrich", help="Extract data from a contractor URL")
    enrich_p.add_argument("--url", required=True)
    enrich_p.add_argument("--target-id", type=int)

    # auto command (full pipeline)
    auto_p = sub.add_parser("auto", help="Full discovery pipeline: search + extract + insert")
    auto_p.add_argument("--city", required=True)
    auto_p.add_argument("--territory", required=True)
    auto_p.add_argument("--limit", type=int, default=5)
    auto_p.add_argument("--dry-run", action="store_true")

    # brave command (full pipeline with Brave Search)
    brave_p = sub.add_parser("brave", help="Discovery pipeline using Brave Search (no Firecrawl credits)")
    brave_p.add_argument("--city", required=True)
    brave_p.add_argument("--territory", required=True)
    brave_p.add_argument("--limit", type=int, default=5)
    brave_p.add_argument("--dry-run", action="store_true")

    # credits command
    sub.add_parser("credits", help="Show Firecrawl credit usage info")

    args = parser.parse_args()

    if args.command == "search":
        results = search_contractors(args.city, args.territory, args.limit)
        for r in results:
            print(f"  {r['title']}: {r['url']}")

    elif args.command == "enrich":
        enrich_target(args.url, args.target_id)

    elif args.command == "auto":
        discover_and_insert(args.city, args.territory, args.limit, args.dry_run)

    elif args.command == "brave":
        brave_discover_and_insert(args.city, args.territory, args.limit, args.dry_run)

    elif args.command == "credits":
        print(f"Firecrawl credits used this session: {_credits_used}")
        print(f"Brave queries used this session: {_brave_queries}")
        print("Firecrawl: https://firecrawl.dev/app")
        print("Brave Search: 2000 free queries/month")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
