-- Agentic Business Organization - SQLite Schema
-- ConversionOS Outreach Pipeline

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- targets: company records with pipeline status
CREATE TABLE IF NOT EXISTS targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    city TEXT NOT NULL,
    province TEXT NOT NULL DEFAULT 'Ontario',
    territory TEXT NOT NULL,  -- e.g. "London, ON"
    website TEXT,
    email TEXT,
    phone TEXT,
    google_rating REAL,
    google_review_count INTEGER,
    services TEXT,  -- JSON array of services
    years_in_business INTEGER,
    brand_colors TEXT,  -- JSON: {"primary": "#xxx", "accent": "#xxx"}
    brand_description TEXT,
    owner_name TEXT,  -- Owner/founder first name for personalized greetings
    score INTEGER DEFAULT 0,  -- 0-100 qualification score
    score_breakdown TEXT,  -- JSON: scoring detail
    status TEXT NOT NULL DEFAULT 'discovered'
        CHECK(status IN (
            'discovered', 'qualified', 'disqualified',
            'draft_ready', 'reviewed', 'contacted',
            'email_1_sent', 'sms_sent', 'phone_called',
            'email_2_sent', 'email_3_sent',
            'interested',
            'demo_booked', 'bespoke_in_progress', 'bespoke_ready',
            'demo_sent', 'closed_won', 'closed_lost'
        )),
    notes TEXT,
    discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
    qualified_at TEXT,
    contacted_at TEXT,
    demo_booked_at TEXT,
    bespoke_status TEXT DEFAULT NULL,  -- 'scraping', 'generating', 'refining', 'complete', 'failed'
    bespoke_score REAL DEFAULT NULL,   -- 1.0-5.0 quality score from refinement loop
    brand_assets TEXT DEFAULT NULL,     -- JSON: BrandAssets (logo, colors, fonts, copy, testimonials, images)
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    -- CRM Phase 1 columns
    customer_tier TEXT DEFAULT 'standard',
    last_interaction_at TEXT,
    interaction_count INTEGER DEFAULT 0,
    avg_response_time_hours REAL,
    preferred_contact_method TEXT,
    preferred_contact_time TEXT  -- JSON: {"days": [], "hours": "8am-10am"}
);

-- territories: one-company-per-territory rule
CREATE TABLE IF NOT EXISTS territories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,  -- e.g. "London, ON"
    status TEXT NOT NULL DEFAULT 'available'
        CHECK(status IN ('available', 'reserved', 'sold')),
    reserved_for_target_id INTEGER REFERENCES targets(id),
    reserved_at TEXT,
    sold_at TEXT,
    lock_expires_at TEXT,  -- 90 days from reservation
    notes TEXT
);

-- touches: every outreach attempt logged
CREATE TABLE IF NOT EXISTS touches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id),
    type TEXT NOT NULL
        CHECK(type IN ('email_initial', 'email_followup', 'email_breakup',
                        'phone_call', 'sms', 'linkedin', 'in_person', 'other')),
    subject TEXT,
    outcome TEXT
        CHECK(outcome IS NULL OR outcome IN (
            'sent', 'opened', 'replied', 'no_response',
            'interested', 'not_interested', 'voicemail',
            'conversation', 'demo_booked', 'unsubscribe'
        )),
    message_id TEXT,  -- RFC 2822 Message-ID for reply matching (e.g. <uuid@outreach.norbotsystems.com>)
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- artifacts: every generated file tracked
CREATE TABLE IF NOT EXISTS artifacts (
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

-- CRM Phase 1: customer_profiles (1:1 with target)
CREATE TABLE IF NOT EXISTS customer_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id) UNIQUE,
    owner_name TEXT,
    owner_role TEXT,
    communication_style TEXT,   -- JSON
    decision_drivers TEXT,      -- JSON array
    personal_notes TEXT,        -- JSON array
    health_score REAL DEFAULT 0,
    win_probability REAL DEFAULT 0,
    competitor_mentions TEXT,   -- JSON array
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CRM Phase 1: call_reports
CREATE TABLE IF NOT EXISTS call_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id),
    touch_id INTEGER REFERENCES touches(id),
    report_type TEXT NOT NULL DEFAULT 'phone_call',
    summary TEXT NOT NULL,
    outcomes TEXT,
    action_items TEXT,
    objections_raised TEXT,
    sentiment TEXT DEFAULT 'neutral',
    next_steps TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CRM Phase 1: objections
CREATE TABLE IF NOT EXISTS objections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id),
    call_report_id INTEGER REFERENCES call_reports(id),
    category TEXT NOT NULL,
    objection_text TEXT NOT NULL,
    response_text TEXT,
    resolved INTEGER DEFAULT 0,
    effectiveness TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CRM Phase 1: customer_signals
CREATE TABLE IF NOT EXISTS customer_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id),
    signal_type TEXT NOT NULL,
    signal_text TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    source TEXT NOT NULL,
    source_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- CRM Phase 1: email_threads
CREATE TABLE IF NOT EXISTS email_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id),
    direction TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    email_number INTEGER,
    gmail_message_id TEXT,
    sent_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Phase 3: bookings (replaces Calendly)
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL REFERENCES targets(id),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    preferred_time TEXT,  -- optional scheduling hint from prospect
    source TEXT NOT NULL DEFAULT 'bespoke_demo',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'scheduled', 'completed', 'no_show', 'cancelled')),
    follow_up_date TEXT,  -- 2-3 days after booking submission
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_targets_status ON targets(status);
CREATE INDEX IF NOT EXISTS idx_targets_territory ON targets(territory);
CREATE INDEX IF NOT EXISTS idx_targets_score ON targets(score DESC);
CREATE INDEX IF NOT EXISTS idx_territories_status ON territories(status);
CREATE INDEX IF NOT EXISTS idx_touches_target ON touches(target_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_target ON artifacts(target_id);

-- CRM Phase 1 indexes
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

-- Phase 3 indexes
CREATE INDEX IF NOT EXISTS idx_bookings_target ON bookings(target_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_follow_up ON bookings(follow_up_date);

-- Seed default territories for Phase 1 (London, ON)
INSERT OR IGNORE INTO territories (name, status) VALUES ('London, ON', 'available');
INSERT OR IGNORE INTO territories (name, status) VALUES ('Stratford, ON', 'sold');
