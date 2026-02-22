-- Extend existing tenant company_profile rows with new CompanyConfig fields:
-- heroHeadline, heroSubheadline, heroImageUrl, aboutImageUrl, logoUrl,
-- trustBadges, whyChooseUs, values, processSteps, teamMembers, portfolio,
-- and extended services (slug, features, packages).
--
-- Uses JSONB concatenation (||) to ADD new fields without overwriting existing ones.
-- Uses jsonb_set for the services array to REPLACE it entirely (adding slug/features/packages).

BEGIN;

-- ============================================================
-- McCarty Squared — extended fields
-- ============================================================

UPDATE admin_settings SET value = value || '{
  "heroHeadline": "Dream. Plan. Build.",
  "heroSubheadline": "With a focus on quality craftsmanship and integrity, McCarty Squared provides superior construction and renovation services in London, ON and surrounding areas.",
  "heroImageUrl": "",
  "aboutImageUrl": "",
  "logoUrl": "",
  "trustBadges": [
    { "label": "RenoMark Certified", "iconHint": "award" },
    { "label": "13 Service Categories", "iconHint": "grid" },
    { "label": "NetZero Home Certified", "iconHint": "leaf" }
  ],
  "whyChooseUs": [
    { "title": "RenoMark Certified", "description": "Minimum 2-year warranty on all work, $2M liability insurance, and strict Code of Conduct compliance." },
    { "title": "Quality Guaranteed", "description": "Written contracts required on every project. Code of Conduct compliance ensures your renovation meets the highest standards." },
    { "title": "2-Day Response Time", "description": "RenoMark''s 2-business-day response commitment means you''ll never be left waiting. Quick answers, clear communication." }
  ],
  "values": [
    { "title": "Customer First", "description": "Your satisfaction drives everything we do. We listen, communicate, and deliver on our promises.", "iconHint": "heart" },
    { "title": "Quality Craftsmanship", "description": "Every detail matters, from initial design to final walkthrough.", "iconHint": "target" },
    { "title": "Integrity", "description": "Honest pricing, realistic timelines, and transparent communication throughout your project.", "iconHint": "shield" }
  ],
  "processSteps": [
    { "title": "Design Consultation", "description": "Collaborate with Garnet & Carisa to refine your vision" },
    { "title": "Planning & Approval", "description": "Finalize detailed plans and obtain necessary permits" },
    { "title": "Construction Phase", "description": "Skilled crew executes with precision and quality materials" },
    { "title": "Final Inspection", "description": "Review completed project for quality assurance" }
  ],
  "teamMembers": [
    { "name": "Garnet McCarty", "role": "Co-Founder & Project Lead", "photoUrl": "" },
    { "name": "Carisa McCarty", "role": "Co-Founder & Design Lead", "photoUrl": "" }
  ],
  "portfolio": []
}'::jsonb
WHERE site_id = 'mccarty-squared' AND key = 'company_profile';

-- McCarty Squared — extended services (slug, features, packages)
UPDATE admin_settings SET value = jsonb_set(value, '{services}', '[
  { "name": "Kitchen Renovation", "slug": "kitchen-renovation", "description": "Custom kitchen design and renovation including cabinetry, countertops, and appliances.", "features": ["Custom cabinet design", "Countertop installation", "Appliance integration", "Kitchen island design", "Lighting upgrades", "Plumbing fixtures", "Backsplash tile work"], "packages": [] },
  { "name": "Bathroom Renovation", "slug": "bathroom-renovation", "description": "Full bathroom remodels from powder rooms to spa-inspired master suites.", "features": ["Walk-in shower design", "Freestanding tub installation", "Heated floors", "Custom vanities", "Tile work", "Plumbing upgrades"], "packages": [] },
  { "name": "Basement Finishing", "slug": "basement-finishing", "description": "Transform unfinished basements into entertainment-ready living spaces.", "features": ["Home theater rooms", "Wet bar installation", "Guest bedrooms", "Full bathrooms", "Soundproofing", "Custom built-ins"], "packages": [] },
  { "name": "Custom Cabinetry", "slug": "custom-cabinetry", "description": "Built-in and custom cabinet work for any room.", "features": ["Built-in bookshelves", "Entertainment centres", "Mudroom storage", "Custom closets"], "packages": [] },
  { "name": "Flooring", "slug": "flooring", "description": "Hardwood, vinyl plank, tile installation for every room.", "features": ["Hardwood installation", "Luxury vinyl plank", "Tile flooring", "Heated floor systems"], "packages": [] },
  { "name": "Additions", "slug": "additions", "description": "Home additions and extensions to expand your living space.", "features": ["Room additions", "Second storey additions", "Sunroom construction", "Garage conversions"], "packages": [] },
  { "name": "Heritage Restoration", "slug": "heritage-restoration", "description": "Restoring character homes with period-appropriate materials and techniques.", "features": ["Original trim restoration", "Period hardware sourcing", "Heritage-compliant updates", "Character preservation"], "packages": [] },
  { "name": "Accessibility Modifications", "slug": "accessibility-modifications", "description": "Aging-in-place and accessibility upgrades for comfortable living.", "features": ["Barrier-free showers", "Grab bar installation", "Ramp construction", "Wider doorways", "Accessible kitchens"], "packages": [] },
  { "name": "Net-Zero Homes", "slug": "net-zero-homes", "description": "Energy-efficient building and retrofits for sustainable living.", "features": ["Solar-ready construction", "Superior insulation", "High-efficiency HVAC", "Air sealing", "Energy monitoring"], "packages": [] },
  { "name": "Outdoor Living", "slug": "outdoor-living", "description": "Decks, patios, and outdoor spaces to extend your home.", "features": ["Custom deck design", "Patio construction", "Outdoor kitchens", "Pergolas", "Fencing"], "packages": [] },
  { "name": "Commercial Renovation", "slug": "commercial-renovation", "description": "Office and retail space renovation for businesses.", "features": ["Office buildouts", "Retail renovations", "ADA compliance", "Commercial kitchens"], "packages": [] },
  { "name": "Whole Home Renovation", "slug": "whole-home-renovation", "description": "Complete home transformation from top to bottom.", "features": ["Full interior renovation", "Layout redesign", "Systems upgrades", "Design coordination"], "packages": [] },
  { "name": "Painting & Drywall", "slug": "painting-drywall", "description": "Interior and exterior finishing work.", "features": ["Interior painting", "Exterior painting", "Drywall installation", "Texture repair", "Trim painting"], "packages": [] }
]'::jsonb)
WHERE site_id = 'mccarty-squared' AND key = 'company_profile';

-- ============================================================
-- Red White Reno — extended fields
-- ============================================================

UPDATE admin_settings SET value = value || '{
  "heroHeadline": "Full-Service Renovation Excellence",
  "heroSubheadline": "Quality renovations in Stratford, Ontario and surrounding areas with meticulous attention to detail and transparent budgeting.",
  "heroImageUrl": "",
  "aboutImageUrl": "",
  "logoUrl": "",
  "trustBadges": [
    { "label": "5.0 Google Rating", "iconHint": "star" },
    { "label": "Full-Service Renovation", "iconHint": "home" }
  ],
  "whyChooseUs": [
    { "title": "Exceptional Attention to Detail", "description": "Michel and Clodagh are extremely attentive to the smallest detail in every project." },
    { "title": "Transparent Budgeting", "description": "Thoughtful planning and quoting with a mindful approach to your budget." },
    { "title": "Trustworthy & Professional", "description": "Comfortable to have in your home, with efficient timelines and clear communication." }
  ],
  "values": [
    { "title": "Attention to Detail", "description": "Every element of your renovation is carefully considered and executed.", "iconHint": "target" },
    { "title": "Client Communication", "description": "Excellent information along the way, keeping you informed at every step.", "iconHint": "heart" },
    { "title": "Quality Workmanship", "description": "Professional results that stand the test of time.", "iconHint": "shield" }
  ],
  "processSteps": [
    { "title": "Consultation", "description": "Meet with Michel and Clodagh to discuss your vision and goals" },
    { "title": "Detailed Quote", "description": "Receive a thoughtful, transparent quote with no surprises" },
    { "title": "Expert Construction", "description": "Efficient execution with attention to every detail" },
    { "title": "Final Walkthrough", "description": "Review the finished project to ensure complete satisfaction" }
  ],
  "teamMembers": [
    { "name": "Michel", "role": "Co-Founder & Lead Contractor", "photoUrl": "" },
    { "name": "Clodagh", "role": "Co-Founder & Design", "photoUrl": "" }
  ],
  "portfolio": []
}'::jsonb
WHERE site_id = 'redwhitereno' AND key = 'company_profile';

-- Red White Reno — extended services (slug, features, packages)
UPDATE admin_settings SET value = jsonb_set(value, '{services}', '[
  { "name": "Kitchen Renovation", "slug": "kitchen-renovation", "description": "Custom kitchen design and renovation with premium finishes.", "features": ["Custom cabinetry", "Countertop installation", "Appliance integration", "Lighting design"], "packages": [] },
  { "name": "Bathroom Renovation", "slug": "bathroom-renovation", "description": "Full bathroom remodels with exceptional attention to detail.", "features": ["Walk-in showers", "Tile work", "Vanity installation", "Plumbing upgrades"], "packages": [] },
  { "name": "Basement Finishing", "slug": "basement-finishing", "description": "Transform your basement into functional living space.", "features": ["Framing & insulation", "Drywall & finishing", "Flooring", "Electrical & lighting"], "packages": [] },
  { "name": "Outdoor Living", "slug": "outdoor-living", "description": "Decks, patios, and outdoor spaces for Stratford living.", "features": ["Deck construction", "Patio design", "Fencing", "Outdoor features"], "packages": [] }
]'::jsonb)
WHERE site_id = 'redwhitereno' AND key = 'company_profile';

-- ============================================================
-- Demo tenant — extended fields (empty defaults)
-- ============================================================

UPDATE admin_settings SET value = value || '{
  "heroHeadline": "",
  "heroSubheadline": "",
  "heroImageUrl": "",
  "aboutImageUrl": "",
  "logoUrl": "",
  "trustBadges": [],
  "whyChooseUs": [],
  "values": [],
  "processSteps": [],
  "teamMembers": [],
  "portfolio": []
}'::jsonb
WHERE site_id = 'demo' AND key = 'company_profile';

-- Demo — extended services (slug, features, packages)
UPDATE admin_settings SET value = jsonb_set(value, '{services}', '[
  { "name": "Kitchen Renovation", "slug": "kitchen-renovation", "description": "Custom kitchen design and renovation", "features": [], "packages": [] },
  { "name": "Bathroom Renovation", "slug": "bathroom-renovation", "description": "Full bathroom remodels", "features": [], "packages": [] },
  { "name": "Basement Finishing", "slug": "basement-finishing", "description": "Unfinished to entertainment-ready", "features": [], "packages": [] },
  { "name": "Flooring", "slug": "flooring", "description": "Hardwood, vinyl plank, tile installation", "features": [], "packages": [] }
]'::jsonb)
WHERE site_id = 'demo' AND key = 'company_profile';

COMMIT;
