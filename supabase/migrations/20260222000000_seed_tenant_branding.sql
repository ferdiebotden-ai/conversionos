-- Seed comprehensive branding data for all tenants.
-- Uses UPSERT so it's safe to re-run.

-- ============================================================
-- McCarty Squared tenant
-- ============================================================

INSERT INTO admin_settings (id, site_id, key, value, description, updated_at)
VALUES (
  gen_random_uuid(),
  'mccarty-squared',
  'business_info',
  '{
    "name": "McCarty Squared Inc.",
    "phone": "(226) 700-2548",
    "email": "info@mccartysquared.ca",
    "payment_email": "payments@mccartysquared.ca",
    "quotes_email": "quotes@mccartysquared.ca",
    "website": "mccartysquared.ca",
    "address": "",
    "city": "London",
    "province": "ON",
    "postal": ""
  }'::jsonb,
  'McCarty Squared business contact info',
  now()
)
ON CONFLICT (site_id, key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

INSERT INTO admin_settings (id, site_id, key, value, description, updated_at)
VALUES (
  gen_random_uuid(),
  'mccarty-squared',
  'branding',
  '{
    "tagline": "Dream. Plan. Build.",
    "colors": {
      "primary_hex": "#1565C0",
      "primary_oklch": "0.45 0.18 250"
    },
    "socials": [
      { "label": "Facebook", "href": "https://www.facebook.com/mccartysquared" },
      { "label": "Instagram", "href": "https://www.instagram.com/mccartysquared" },
      { "label": "Google", "href": "https://g.co/kgs/mccartysquared" },
      { "label": "Houzz", "href": "https://www.houzz.com/pro/mccartysquared" }
    ]
  }'::jsonb,
  'McCarty Squared brand settings',
  now()
)
ON CONFLICT (site_id, key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

INSERT INTO admin_settings (id, site_id, key, value, description, updated_at)
VALUES (
  gen_random_uuid(),
  'mccarty-squared',
  'company_profile',
  '{
    "principals": "Garnet & Carisa",
    "founded": "2021",
    "booking": "https://mccartysquared.ca/booking",
    "serviceArea": "London, ON and 20+ surrounding communities including Argyle, Arva, Belmont, Byron, Dorchester, Hyde Park, Ingersoll, Komoka, Masonville, Mt Brydges, North London, Oakridge, Old North, OEV, St Thomas, Strathroy, Tillsonburg, Woodfield, and Wortley",
    "hours": "Mon-Fri 8am-5pm",
    "certifications": ["RenoMark", "LHBA", "NetZero Home", "Houzz Pro", "London Chamber of Commerce"],
    "testimonials": [
      {
        "author": "Ziad A.",
        "quote": "McCarty Squared did a fantastic job renovating our house. Garnet and Carisa fully understood our vision, ensuring everything — kitchen, bathrooms and bedrooms — was perfect. We won''t hesitate to call them for future projects. Highly recommend them!",
        "projectType": "Whole Home Renovation"
      },
      {
        "author": "Megan E.",
        "quote": "Garnet and Carisa helped with my apartment overhaul in a 112-year-old house. They combined what I had hoped with new ideas I had never considered and provided exceptional workmanship to complete the project. They made me feel like family and my house is now truly a home.",
        "projectType": "Heritage Apartment Overhaul"
      },
      {
        "author": "Jenny K. S.",
        "quote": "Garnet''s professionalism, knowledge, and expertise are among the best in London. I''ve worked with six other contractors in the past nine years, and Garnet was by far my favorite. His precise assessment and detailed education on technical aspects were invaluable.",
        "projectType": "Home Renovation"
      }
    ],
    "aboutCopy": [
      "Founded in 2021 by Garnet and Carisa, McCarty Squared Inc. has quickly become one of London''s most trusted renovation contractors. Our past projects include both commercial and residential spaces across 13 service categories.",
      "From accessibility modifications and net-zero homes to heritage restoration and custom cabinetry — we focus on quality craftsmanship as well as modern building techniques. A clean, courteous, efficient worksite is a must, and taking care of our clients is what we do best.",
      "We offer an end-to-end client experience that includes seamless communication, budgeting, on-site organization, and solid, quality handiwork every time. From the design phase to the last touch-ups, we''ll be there working hard to finish on time and on budget."
    ],
    "mission": "To transform houses into dream homes through exceptional craftsmanship, innovative technology, and an unwavering commitment to customer satisfaction.",
    "services": [
      { "name": "Kitchen Renovation", "description": "Custom kitchen design and renovation" },
      { "name": "Bathroom Renovation", "description": "Full bathroom remodels" },
      { "name": "Basement Finishing", "description": "Unfinished to entertainment-ready" },
      { "name": "Custom Cabinetry", "description": "Built-in and custom cabinet work" },
      { "name": "Flooring", "description": "Hardwood, vinyl plank, tile installation" },
      { "name": "Additions", "description": "Home additions and extensions" },
      { "name": "Heritage Restoration", "description": "Restoring character homes" },
      { "name": "Accessibility Modifications", "description": "Aging-in-place and accessibility upgrades" },
      { "name": "Net-Zero Homes", "description": "Energy-efficient building and retrofits" },
      { "name": "Outdoor Living", "description": "Decks, patios, outdoor spaces" },
      { "name": "Commercial Renovation", "description": "Office and retail space renovation" },
      { "name": "Whole Home Renovation", "description": "Complete home transformation" },
      { "name": "Painting & Drywall", "description": "Interior and exterior finishing" }
    ]
  }'::jsonb,
  'McCarty Squared company profile (principals, testimonials, services)',
  now()
)
ON CONFLICT (site_id, key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- ============================================================
-- Demo tenant (generic fallback)
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

-- ============================================================
-- Red White Reno tenant
-- ============================================================

INSERT INTO admin_settings (id, site_id, key, value, description, updated_at)
VALUES (
  gen_random_uuid(),
  'redwhitereno',
  'business_info',
  '{
    "name": "Red White Reno Inc.",
    "phone": "",
    "email": "",
    "payment_email": "",
    "quotes_email": "",
    "website": "redwhite.norbotsystems.com",
    "address": "",
    "city": "Stratford",
    "province": "ON",
    "postal": ""
  }'::jsonb,
  'Red White Reno business contact info',
  now()
)
ON CONFLICT (site_id, key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

INSERT INTO admin_settings (id, site_id, key, value, description, updated_at)
VALUES (
  gen_random_uuid(),
  'redwhitereno',
  'branding',
  '{
    "tagline": "Full-Service Renovation Excellence",
    "colors": {
      "primary_hex": "#D60000",
      "primary_oklch": "0.50 0.22 27"
    },
    "socials": []
  }'::jsonb,
  'Red White Reno brand settings',
  now()
)
ON CONFLICT (site_id, key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

INSERT INTO admin_settings (id, site_id, key, value, description, updated_at)
VALUES (
  gen_random_uuid(),
  'redwhitereno',
  'company_profile',
  '{
    "principals": "Michel & Clodagh",
    "founded": "2020",
    "booking": "",
    "serviceArea": "Stratford, ON and surrounding areas",
    "hours": "Mon-Fri 8am-5pm",
    "certifications": [],
    "testimonials": [
      {
        "author": "Justin O.",
        "quote": "Red White Reno Inc. did an excellent job on the complete renovation of my bathroom. Michel and Clodagh are extremely attentive to the smallest detail and provide excellent information along the way.",
        "projectType": "Bathroom Renovation"
      },
      {
        "author": "Kaleigh S.",
        "quote": "We couldn''t have been more happy with the work done by Red & White Reno Inc. Thoughtful planning and quoting, efficient timeline, mindful of budget, trustworthy and comfortable to have in our home.",
        "projectType": "General Renovation"
      }
    ],
    "aboutCopy": [
      "Red White Reno Inc. is a full-service renovation company based in Stratford, Ontario. Founded by Michel and Clodagh, we bring over 5 years of experience to every project. With a perfect 5.0 Google rating, we''re known for exceptional attention to detail and client communication.",
      "From kitchens and bathrooms to basements and outdoor living spaces, we deliver quality craftsmanship with thoughtful planning and transparent budgeting."
    ],
    "mission": "To deliver exceptional renovation experiences with meticulous attention to detail and unwavering commitment to client satisfaction.",
    "services": [
      { "name": "Kitchen Renovation", "description": "Custom kitchen design and renovation" },
      { "name": "Bathroom Renovation", "description": "Full bathroom remodels" },
      { "name": "Basement Finishing", "description": "Unfinished to entertainment-ready" },
      { "name": "Outdoor Living", "description": "Decks, patios, outdoor spaces" }
    ]
  }'::jsonb,
  'Red White Reno company profile',
  now()
)
ON CONFLICT (site_id, key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();
