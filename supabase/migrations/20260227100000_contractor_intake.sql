ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'customer'
    CHECK (created_by IN ('customer', 'contractor')),
  ADD COLUMN IF NOT EXISTS intake_raw_input TEXT,
  ADD COLUMN IF NOT EXISTS intake_method TEXT
    CHECK (intake_method IN ('website', 'voice_dictation', 'text_input', 'form'));
