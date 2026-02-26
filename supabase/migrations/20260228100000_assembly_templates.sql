-- Reusable line item bundles for quote editor
-- F10: Assembly Templates

CREATE TABLE IF NOT EXISTS assembly_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'kitchen', 'bathroom', 'basement', 'flooring', 'painting', 'exterior', 'general', 'other'
  )),
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assembly_templates_site
  ON assembly_templates(site_id);

CREATE INDEX IF NOT EXISTS idx_assembly_templates_category
  ON assembly_templates(site_id, category);

ALTER TABLE assembly_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assembly_templates_site_isolation" ON assembly_templates
  USING (true)
  WITH CHECK (true);
