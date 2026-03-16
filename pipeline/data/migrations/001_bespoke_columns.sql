-- Migration 001: Add bespoke conversion columns + update artifacts type constraint
-- Run against Turso: turso db shell lead-quote-engine < data/migrations/001_bespoke_columns.sql
-- Or via libsql client

-- 1. Add bespoke columns to targets table
ALTER TABLE targets ADD COLUMN demo_booked_at TEXT;
ALTER TABLE targets ADD COLUMN bespoke_status TEXT DEFAULT NULL;
ALTER TABLE targets ADD COLUMN bespoke_score REAL DEFAULT NULL;
ALTER TABLE targets ADD COLUMN brand_assets TEXT DEFAULT NULL;

-- 2. Recreate artifacts table with 'bespoke_microsite' in CHECK constraint
-- (SQLite does not support ALTER TABLE ... ALTER CONSTRAINT)
CREATE TABLE IF NOT EXISTS artifacts_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id),
    type TEXT NOT NULL
        CHECK(type IN ('microsite', 'email_initial', 'email_followup',
                        'email_breakup', 'call_script', 'compliance_review',
                        'bespoke_microsite')),
    file_path TEXT NOT NULL,
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK(review_status IN ('pending', 'approved', 'rejected', 'revised')),
    reviewer_notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT
);

INSERT INTO artifacts_new SELECT * FROM artifacts;
DROP TABLE artifacts;
ALTER TABLE artifacts_new RENAME TO artifacts;

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_artifacts_target ON artifacts(target_id);
