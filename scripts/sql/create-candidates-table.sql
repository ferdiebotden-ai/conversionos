-- ConversionOS Nightly Pipeline: Candidates Table
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ktpfyangnmpwufghgasx/sql

CREATE TABLE IF NOT EXISTS candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  owner_first_name TEXT,
  city TEXT,
  province TEXT DEFAULT 'ON',
  google_rating NUMERIC(2,1),
  google_review_count INTEGER,
  score INTEGER,
  tier TEXT DEFAULT 'accelerate',
  status TEXT DEFAULT 'pending',
  site_id TEXT,
  demo_url TEXT,
  email_subject TEXT,
  last_build_error TEXT,
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(website_url)
);

-- Index for pipeline queries
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_score ON candidates(score DESC);

-- Status tracking:
-- pending       → ready for nightly pipeline
-- building      → currently being processed
-- built         → demo site deployed successfully
-- build_failed  → onboard.mjs failed
-- email_ready   → email draft generated
-- email_sent    → Ferdie manually sent the email
-- engaged       → prospect replied or clicked
-- demo_booked   → demo call scheduled
-- closed_won    → signed as client
-- closed_lost   → declined / no response after cadence
-- no_response   → completed cadence, no response
-- excluded      → manually excluded from outreach

COMMENT ON TABLE candidates IS 'Nightly pipeline target contractors for ConversionOS outreach';
