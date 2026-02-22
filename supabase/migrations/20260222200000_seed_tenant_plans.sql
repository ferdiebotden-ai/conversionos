-- Seed plan tier data for existing tenants
-- Plan tiers: elevate ($249/mo), accelerate ($699/mo), dominate ($2,500/mo)

INSERT INTO admin_settings (site_id, key, value) VALUES
  ('demo', 'plan', '{"tier": "accelerate"}'::jsonb),
  ('mccarty-squared', 'plan', '{"tier": "dominate"}'::jsonb),
  ('redwhitereno', 'plan', '{"tier": "accelerate"}'::jsonb)
ON CONFLICT (site_id, key) DO UPDATE SET value = EXCLUDED.value;

-- Tenants domain registry table (source of truth for domain → site_id)
CREATE TABLE IF NOT EXISTS tenants (
  site_id TEXT PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  plan_tier TEXT NOT NULL DEFAULT 'accelerate',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed tenant records
INSERT INTO tenants (site_id, domain, plan_tier) VALUES
  ('demo', 'ai-reno-demo.vercel.app', 'accelerate'),
  ('mccarty-squared', 'mccarty.norbotsystems.com', 'dominate'),
  ('redwhitereno', 'redwhite.norbotsystems.com', 'accelerate')
ON CONFLICT (site_id) DO UPDATE SET
  domain = EXCLUDED.domain,
  plan_tier = EXCLUDED.plan_tier;
