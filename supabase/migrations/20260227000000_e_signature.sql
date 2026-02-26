-- E-Signature acceptance fields for quote_drafts
-- Enables customers to accept quotes via a unique token URL

ALTER TABLE quote_drafts
  ADD COLUMN IF NOT EXISTS acceptance_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS acceptance_status TEXT DEFAULT 'pending'
    CHECK (acceptance_status IN ('pending', 'accepted', 'declined')),
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_by_name TEXT,
  ADD COLUMN IF NOT EXISTS accepted_by_ip TEXT;

CREATE INDEX IF NOT EXISTS idx_quote_drafts_acceptance_token
  ON quote_drafts(acceptance_token) WHERE acceptance_token IS NOT NULL;
