#!/usr/bin/env python3
"""Shared SQLite helpers for the agentic outreach pipeline.

Supports two backends:
  - Local SQLite (default): uses data/leads.sqlite
  - Turso (cloud): set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN env vars
"""

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "leads.sqlite"
SCHEMA_PATH = Path(__file__).parent.parent / "data" / "schema.sql"

# Turso remote DB config (optional — set env vars to use cloud DB)
TURSO_URL = os.environ.get("TURSO_DATABASE_URL")
TURSO_TOKEN = os.environ.get("TURSO_AUTH_TOKEN")


def _is_turso() -> bool:
    """Check if Turso cloud DB is configured."""
    return bool(TURSO_URL)


class _TursoCursor:
    """Wraps a libsql_client ResultSet to mimic sqlite3 cursor interface.

    The libsql-client package returns ResultSet objects with .rows and .columns,
    not sqlite3-style cursors. This adapter makes them work with dict(row).
    """

    def __init__(self, result_set, last_insert_rowid=None):
        self._rs = result_set
        self._lastrowid = last_insert_rowid
        self._rows = None
        self._idx = 0

    def _to_dicts(self):
        if self._rows is None:
            cols = self._rs.columns
            self._rows = [dict(zip(cols, row)) for row in self._rs.rows]
        return self._rows

    def fetchone(self):
        rows = self._to_dicts()
        if self._idx < len(rows):
            row = rows[self._idx]
            self._idx += 1
            return row
        return None

    def fetchall(self):
        return self._to_dicts()

    @property
    def lastrowid(self):
        return self._lastrowid


class _TursoConnection:
    """Wraps libsql_client sync client to mimic sqlite3 connection interface.

    Uses libsql_client.create_client_sync() which communicates over HTTP/WS.
    """

    def __init__(self, client):
        self._client = client

    def execute(self, sql, params=()):
        # libsql-client uses list for positional params
        rs = self._client.execute(sql, list(params))
        return _TursoCursor(rs, getattr(rs, "last_insert_rowid", None))

    def executescript(self, sql):
        # Split and execute each statement
        for stmt in sql.split(";"):
            stmt = stmt.strip()
            if stmt:
                self._client.execute(stmt)

    def commit(self):
        pass  # libsql-client auto-commits

    def rollback(self):
        pass  # no-op for HTTP client

    def close(self):
        self._client.close()


@contextmanager
def get_db():
    """Context manager for database connections.

    Uses Turso (libsql-client) when TURSO_DATABASE_URL is set,
    otherwise falls back to local SQLite.
    """
    if _is_turso():
        import libsql_client

        # Convert libsql:// to https:// (libsql_client HTTP mode is more reliable)
        url = TURSO_URL
        if url.startswith("libsql://"):
            url = url.replace("libsql://", "https://", 1)
        client = libsql_client.create_client_sync(
            url=url,
            auth_token=TURSO_TOKEN,
        )
        conn = _TursoConnection(client)
        try:
            yield conn
        finally:
            conn.close()
    else:
        import warnings
        warnings.warn(
            "TURSO_DATABASE_URL not set — falling back to local SQLite. "
            "Run: source scripts/.env",
            stacklevel=2,
        )
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys=ON")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


def init_db():
    """Initialize database from schema.sql."""
    schema = SCHEMA_PATH.read_text()
    with get_db() as conn:
        conn.executescript(schema)
    print(f"Database initialized at {DB_PATH}")


def insert_target(
    company_name: str,
    slug: str,
    city: str,
    territory: str,
    website: str | None = None,
    email: str | None = None,
    phone: str | None = None,
    google_rating: float | None = None,
    google_review_count: int | None = None,
    services: list[str] | None = None,
    years_in_business: int | None = None,
    brand_colors: dict | None = None,
    brand_description: str | None = None,
    notes: str | None = None,
    owner_name: str | None = None,
) -> int:
    """Insert a new target into the database. Returns the target ID."""
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO targets
            (company_name, slug, city, territory, website, email, phone,
             google_rating, google_review_count, services, years_in_business,
             brand_colors, brand_description, notes, owner_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                company_name,
                slug,
                city,
                territory,
                website,
                email,
                phone,
                google_rating,
                google_review_count,
                json.dumps(services) if services else None,
                years_in_business,
                json.dumps(brand_colors) if brand_colors else None,
                brand_description,
                notes,
                owner_name,
            ),
        )
        return cursor.lastrowid


def get_target(target_id: int) -> dict | None:
    """Get a target by ID."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM targets WHERE id = ?", (target_id,)).fetchone()
        return dict(row) if row else None


def get_target_by_slug(slug: str) -> dict | None:
    """Get a target by slug."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM targets WHERE slug = ?", (slug,)).fetchone()
        return dict(row) if row else None


def get_targets_by_status(status: str) -> list[dict]:
    """Get all targets with a given status."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM targets WHERE status = ? ORDER BY score DESC",
            (status,),
        ).fetchall()
        return [dict(r) for r in rows]


def update_target_status(target_id: int, new_status: str):
    """Update a target's status with timestamp."""
    ts_fields = {
        "qualified": "qualified_at",
        "email_1_sent": "contacted_at",
    }
    with get_db() as conn:
        conn.execute(
            f"UPDATE targets SET status = ?, updated_at = datetime('now')"
            + (f", {ts_fields[new_status]} = datetime('now')" if new_status in ts_fields else "")
            + " WHERE id = ?",
            (new_status, target_id),
        )


def update_target_score(target_id: int, score: int, breakdown: dict):
    """Update a target's qualification score."""
    with get_db() as conn:
        conn.execute(
            "UPDATE targets SET score = ?, score_breakdown = ?, updated_at = datetime('now') WHERE id = ?",
            (score, json.dumps(breakdown), target_id),
        )


def get_territory(name: str) -> dict | None:
    """Get territory status."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM territories WHERE name = ?", (name,)).fetchone()
        return dict(row) if row else None


def reserve_territory(territory_name: str, target_id: int):
    """Reserve a territory for a target (90-day lock)."""
    expires = (datetime.now() + timedelta(days=90)).isoformat()
    with get_db() as conn:
        conn.execute(
            """UPDATE territories
            SET status = 'reserved', reserved_for_target_id = ?,
                reserved_at = datetime('now'), lock_expires_at = ?
            WHERE name = ? AND status = 'available'""",
            (target_id, expires, territory_name),
        )


def release_territory(territory_name: str, target_id: int):
    """Release a territory reservation (target -> closed_lost)."""
    with get_db() as conn:
        conn.execute(
            """UPDATE territories
            SET status = 'available', reserved_for_target_id = NULL,
                reserved_at = NULL, lock_expires_at = NULL
            WHERE reserved_for_target_id = ?""",
            (target_id,),
        )


def log_touch(
    target_id: int,
    touch_type: str,
    subject: str | None = None,
    outcome: str | None = None,
    notes: str | None = None,
) -> int:
    """Log an outreach touch. Returns the touch ID."""
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO touches (target_id, type, subject, outcome, notes) VALUES (?, ?, ?, ?, ?)",
            (target_id, touch_type, subject, outcome, notes),
        )
        return cursor.lastrowid


def log_artifact(
    target_id: int,
    artifact_type: str,
    file_path: str,
) -> int:
    """Log a generated artifact. Returns the artifact ID."""
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO artifacts (target_id, type, file_path) VALUES (?, ?, ?)",
            (target_id, artifact_type, file_path),
        )
        return cursor.lastrowid


def get_artifact_url(target_id: int, artifact_type: str) -> str | None:
    """Get the most recent Blob URL for a target's artifact.

    Args:
        target_id: Target ID in the database.
        artifact_type: One of 'microsite', 'email', 'email_initial', 'call_script'.

    Returns:
        The Blob URL string, or None if not found.
    """
    with get_db() as conn:
        row = conn.execute(
            """SELECT file_path FROM artifacts
            WHERE target_id = ? AND type = ?
            ORDER BY created_at DESC LIMIT 1""",
            (target_id, artifact_type),
        ).fetchone()
        return row["file_path"] if row else None


def insert_territory(name: str, status: str = "available") -> int | None:
    """Insert a territory if it doesn't already exist.

    Returns the lastrowid on insert, or None if it already existed.
    """
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT OR IGNORE INTO territories (name, status) VALUES (?, ?)",
            (name, status),
        )
        return cursor.lastrowid if cursor.lastrowid else None


def get_all_territories() -> list[dict]:
    """Return all territory records as a list of dicts."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM territories ORDER BY name"
        ).fetchall()
        return [dict(r) for r in rows]


def get_pipeline_summary() -> dict:
    """Get a summary of the current pipeline state."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT status, COUNT(*) as count FROM targets GROUP BY status"
        ).fetchall()
        pipeline = {row["status"]: row["count"] for row in rows}

        territory_rows = conn.execute(
            "SELECT status, COUNT(*) as count FROM territories GROUP BY status"
        ).fetchall()
        territories = {row["status"]: row["count"] for row in territory_rows}

        total_touches = conn.execute("SELECT COUNT(*) as count FROM touches").fetchone()["count"]
        total_artifacts = conn.execute("SELECT COUNT(*) as count FROM artifacts").fetchone()["count"]

        return {
            "pipeline": pipeline,
            "territories": territories,
            "total_touches": total_touches,
            "total_artifacts": total_artifacts,
        }


def print_pipeline_summary():
    """Print a formatted pipeline summary."""
    summary = get_pipeline_summary()
    print("\n=== Pipeline Summary ===")
    print(f"Targets by status:")
    for status, count in sorted(summary["pipeline"].items()):
        print(f"  {status}: {count}")
    print(f"\nTerritories:")
    for status, count in sorted(summary["territories"].items()):
        print(f"  {status}: {count}")
    print(f"\nTotal touches: {summary['total_touches']}")
    print(f"Total artifacts: {summary['total_artifacts']}")
    print("========================\n")


def get_candidates_local(limit: int = 5) -> list[dict]:
    """Get qualified targets ready for artifact generation, ordered by score.

    Replicates GET /api/pipeline/candidates logic locally without Dashboard API.
    Returns qualified targets in available territories, sorted by score descending.
    """
    qualified = get_targets_by_status("qualified")
    if not qualified:
        return []

    # Sort by score descending (highest-scoring candidates first)
    qualified.sort(key=lambda t: t.get("score") or 0, reverse=True)

    return qualified[:limit]


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "init":
        init_db()
    else:
        print_pipeline_summary()
