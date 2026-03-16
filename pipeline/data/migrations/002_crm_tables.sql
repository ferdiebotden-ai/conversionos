-- CRM Overhaul Migration — Phase 1
-- 5 new tables, 6 new columns on targets, 10 indexes
-- All statements idempotent (safe to run multiple times)

-- ============================================================
-- 1. New columns on targets
-- ============================================================

ALTER TABLE targets ADD COLUMN customer_tier TEXT DEFAULT 'standard';
ALTER TABLE targets ADD COLUMN last_interaction_at TEXT;
ALTER TABLE targets ADD COLUMN interaction_count INTEGER DEFAULT 0;
ALTER TABLE targets ADD COLUMN avg_response_time_hours REAL;
ALTER TABLE targets ADD COLUMN preferred_contact_method TEXT;
ALTER TABLE targets ADD COLUMN preferred_contact_time TEXT;

-- ============================================================
-- 2. customer_profiles — relationship intelligence (1:1 with target)
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id) UNIQUE,
    owner_name TEXT,
    owner_role TEXT,
    communication_style TEXT,   -- JSON: {"preference": "direct", "formality": "casual"}
    decision_drivers TEXT,      -- JSON: ["roi_focused", "tech_curious"]
    personal_notes TEXT,        -- JSON: [{"note": "...", "date": "...", "source": "..."}]
    health_score REAL DEFAULT 0,
    win_probability REAL DEFAULT 0,
    competitor_mentions TEXT,   -- JSON: [{"competitor": "...", "context": "...", "date": "..."}]
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 3. call_reports — structured call/meeting debriefs
-- ============================================================

CREATE TABLE IF NOT EXISTS call_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id),
    touch_id INTEGER REFERENCES touches(id),
    report_type TEXT NOT NULL DEFAULT 'phone_call',
        -- phone_call, video_call, in_person, voice_debrief
    summary TEXT NOT NULL,
    outcomes TEXT,              -- JSON: ["interested_in_demo", "requested_pricing"]
    action_items TEXT,          -- JSON: [{"action": "...", "owner": "...", "due": "...", "done": false}]
    objections_raised TEXT,     -- JSON: [{"category": "...", "text": "...", "response": "..."}]
    sentiment TEXT DEFAULT 'neutral',
        -- very_positive, positive, neutral, negative, very_negative
    next_steps TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
        -- knox_debrief, manual, auto_transcribe
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 4. objections — cross-customer objection tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS objections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id),
    call_report_id INTEGER REFERENCES call_reports(id),
    category TEXT NOT NULL,
        -- pricing, timeline, trust, competitor, technical, other
    objection_text TEXT NOT NULL,
    response_text TEXT,
    resolved INTEGER DEFAULT 0,
    effectiveness TEXT,
        -- very_effective, effective, neutral, ineffective
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 5. customer_signals — typed signals
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id),
    signal_type TEXT NOT NULL,
        -- interest, objection, competitor, budget, timeline, preference, personal, decision, risk
    signal_text TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    source TEXT NOT NULL,
        -- call_report, email_reply, sms_reply, manual, ai_inferred
    source_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 6. email_threads — full email conversation tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS email_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id),
    direction TEXT NOT NULL,   -- outbound, inbound
    subject TEXT,
    body TEXT NOT NULL,
    email_number INTEGER,      -- 1, 2, 3 for sequence emails
    gmail_message_id TEXT,
    sent_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 7. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_customer_profiles_target ON customer_profiles(target_id);
CREATE INDEX IF NOT EXISTS idx_call_reports_target ON call_reports(target_id);
CREATE INDEX IF NOT EXISTS idx_call_reports_created ON call_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_objections_target ON objections(target_id);
CREATE INDEX IF NOT EXISTS idx_objections_category ON objections(category);
CREATE INDEX IF NOT EXISTS idx_signals_target ON customer_signals(target_id);
CREATE INDEX IF NOT EXISTS idx_signals_type ON customer_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_created ON customer_signals(created_at);
CREATE INDEX IF NOT EXISTS idx_email_threads_target ON email_threads(target_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_direction ON email_threads(direction);
