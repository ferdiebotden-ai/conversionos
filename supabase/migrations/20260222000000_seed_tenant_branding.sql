-- Seed comprehensive branding data for the demo tenant.
-- Uses UPSERT so it's safe to re-run.

-- ============================================================
-- Demo tenant (NorBot Systems base platform)
-- ============================================================

INSERT INTO admin_settings (id, site_id, key, value, description, updated_at)
VALUES (
  gen_random_uuid(),
  'demo',
  'business_info',
  '{
    "name": "AI Reno Demo",
    "phone": "(555) 000-0000",
    "email": "demo@example.com",
    "payment_email": "payments@example.com",
    "quotes_email": "quotes@example.com",
    "website": "ai-reno-demo.vercel.app",
    "address": "123 Demo Street",
    "city": "London",
    "province": "ON",
    "postal": "N6A 1A1"
  }'::jsonb,
  'Demo tenant business info',
  now()
)
ON CONFLICT (site_id, key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

INSERT INTO admin_settings (id, site_id, key, value, description, updated_at)
VALUES (
  gen_random_uuid(),
  'demo',
  'branding',
  '{
    "tagline": "Smart Renovations",
    "colors": {
      "primary_hex": "#1565C0",
      "primary_oklch": "0.45 0.18 250"
    },
    "socials": []
  }'::jsonb,
  'Demo tenant brand settings',
  now()
)
ON CONFLICT (site_id, key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

INSERT INTO admin_settings (id, site_id, key, value, description, updated_at)
VALUES (
  gen_random_uuid(),
  'demo',
  'company_profile',
  '{
    "principals": "the team",
    "founded": "2024",
    "booking": "",
    "serviceArea": "London, ON and surrounding communities",
    "hours": "Mon-Fri 9am-5pm",
    "certifications": [],
    "testimonials": [],
    "aboutCopy": [
      "We are a professional renovation company dedicated to transforming homes with quality craftsmanship and modern building techniques."
    ],
    "mission": "To deliver exceptional renovation experiences powered by AI technology.",
    "services": [
      { "name": "Kitchen Renovation", "description": "Custom kitchen design and renovation" },
      { "name": "Bathroom Renovation", "description": "Full bathroom remodels" },
      { "name": "Basement Finishing", "description": "Unfinished to entertainment-ready" },
      { "name": "Flooring", "description": "Hardwood, vinyl plank, tile installation" }
    ]
  }'::jsonb,
  'Demo tenant company profile',
  now()
)
ON CONFLICT (site_id, key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();
