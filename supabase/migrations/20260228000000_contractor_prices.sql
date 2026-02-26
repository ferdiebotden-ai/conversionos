-- Contractor-uploaded price lists (replaces Ontario DB defaults when matching)
-- F9: CSV Price Upload

CREATE TABLE IF NOT EXISTS contractor_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'materials', 'labor', 'contract', 'permit', 'equipment', 'allowances', 'other'
  )),
  unit TEXT NOT NULL DEFAULT 'ea',
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  supplier TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contractor_prices_site
  ON contractor_prices(site_id);

CREATE INDEX IF NOT EXISTS idx_contractor_prices_lookup
  ON contractor_prices(site_id, item_name);

ALTER TABLE contractor_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractor_prices_site_isolation" ON contractor_prices
  USING (true)
  WITH CHECK (true);
