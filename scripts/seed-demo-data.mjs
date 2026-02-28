#!/usr/bin/env node
/**
 * Seed the `demo` tenant with 3 realistic leads for sales demonstrations.
 * Idempotent — clears existing demo data before inserting.
 *
 * Lead 1: Mike Thompson — Kitchen (165 sqft), status: sent
 *   - Contractor intake via voice dictation (no chat, no visualisations)
 *   - 1 quote (v1, sent), 8 line items, $26,396.35 total
 *
 * Lead 2: Robert Kowalski — Basement (900 sqft), status: won
 *   - Full customer journey — visualiser, Emma chat, 2 quote versions, deposit paid
 *   - 2 visualisation sessions, v1 (AI) + v2 (contractor-refined)
 *   - 2 drawings (floor plan approved, egress window submitted)
 *
 * Lead 3: Priya Sharma — Bathroom (85 sqft), status: new
 *   - Website visitor — uploaded photo, 18-message chat, AI quote
 *   - 1 visualisation with 4 concepts + full JSONB data
 *
 * Tables populated (10): leads, visualizations, lead_visualizations,
 *   visualization_metrics, chat_sessions, quote_drafts, invoices, payments,
 *   drawings, audit_log
 *
 * Usage: node scripts/seed-demo-data.mjs
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');

// Load .env.local
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const SITE_ID = 'demo';

// ─── Date Helpers ────────────────────────────────────────────────────────────

function daysAgo(n, hour = null) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour ?? (Math.floor(Math.random() * 10) + 8), Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
}

function daysAgoDate(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ─── Lead Data ───────────────────────────────────────────────────────────────

const leads = [
  // Lead 1: Mike Thompson — Kitchen, standard, sent (contractor intake)
  {
    site_id: SITE_ID,
    name: 'Mike Thompson',
    email: 'mike.thompson@rogers.com',
    phone: '(519) 555-0312',
    address: '88 Ontario Street',
    postal_code: 'N5A 3H1',
    city: 'Stratford',
    province: 'ON',
    project_type: 'kitchen',
    area_sqft: 165,
    timeline: '1_3_months',
    budget_band: '25k_40k',
    finish_level: 'standard',
    goals_text: 'Kitchen refresh — replace countertops, reface cabinets, new backsplash, upgrade lighting, replace flooring. Keep existing layout.',
    status: 'sent',
    confidence_score: 0.76,
    ai_notes: 'Standard kitchen refresh scope. Budget aligns well with described work. No structural changes — straightforward project. Good candidate for quick turnaround.',
    source: 'phone',
    created_by: 'contractor',
    intake_raw_input: 'Just got off the phone with Mike Thompson from Stratford. He wants a kitchen refresh — not a full gut, just the surfaces. New quartz countertops to replace the old laminate, cabinet refacing (paint the boxes, new Shaker doors), ceramic tile backsplash, pot lights to replace the old fluorescent, and LVP flooring. Kitchen is about 165 square feet, standard layout with an L-shaped counter. Budget is $25-30k. Wants to start in 6-8 weeks. Seems straightforward.',
    intake_method: 'voice_dictation',
    uploaded_photos: ['/images/teaser/before-kitchen.jpg'],
    generated_concepts: null,
    chat_transcript: null,
    session_id: null,
    last_contacted_at: daysAgo(3),
    created_at: daysAgo(5, 14),
  },
  // Lead 2: Robert Kowalski — Basement, premium, won (full journey)
  {
    site_id: SITE_ID,
    name: 'Robert Kowalski',
    email: 'robert.kowalski@outlook.com',
    phone: '(519) 555-0483',
    address: '203 Colborne Street',
    postal_code: 'N3T 2G9',
    city: 'Brantford',
    province: 'ON',
    project_type: 'basement',
    area_sqft: 900,
    timeline: '1_3_months',
    budget_band: '60k_plus',
    finish_level: 'premium',
    goals_text: 'Full basement finishing — home theatre with built-in speakers, wet bar, guest bedroom with egress window, full bathroom, exercise area with rubber flooring. High-end finishes throughout.',
    status: 'won',
    confidence_score: 0.91,
    ai_notes: 'Premium basement build-out. Budget supports full scope including theatre, wet bar, and guest suite. Permit required for egress window. Client signed and deposit received.',
    source: 'website',
    created_by: 'customer',
    intake_raw_input: null,
    intake_method: null,
    uploaded_photos: ['/images/demo/before-basement.png'],
    generated_concepts: [
      '/images/demo/basement-entertainment.png',
      '/images/demo/basement-walkout.png',
      '/images/demo/basement-bar.png',
      '/images/demo/basement-theatre.png',
    ],
    chat_transcript: null, // Will be set after chat session insert
    session_id: null, // Will be set after chat session insert
    last_contacted_at: daysAgo(8),
    created_at: daysAgo(28, 10),
  },
  // Lead 3: Priya Sharma — Bathroom, premium, new (fresh lead with AI visualisation)
  {
    site_id: SITE_ID,
    name: 'Priya Sharma',
    email: 'priya.sharma@gmail.com',
    phone: '(226) 555-0198',
    address: '14 Avondale Avenue',
    postal_code: 'N2G 2V4',
    city: 'Kitchener',
    province: 'ON',
    project_type: 'bathroom',
    area_sqft: 85,
    timeline: '3_6_months',
    budget_band: '25k_40k',
    finish_level: 'premium',
    goals_text: 'Complete bathroom renovation with accessibility in mind — parents visit often. Want a curbless shower, comfort-height toilet, wider doorway, but still beautiful and modern. Not clinical-looking.',
    status: 'new',
    confidence_score: 0.84,
    ai_notes: 'Premium bathroom renovation with accessibility focus. Budget is healthy for the scope. Emotional buyer — wants both beauty and function. Strong lead, schedule follow-up within 48 hours.',
    source: 'website',
    created_by: 'customer',
    intake_raw_input: null,
    intake_method: null,
    uploaded_photos: ['/images/demo/before-bathroom.png'],
    generated_concepts: [
      '/images/demo/bathroom-modern.png',
      '/images/demo/bathroom-spa.png',
      '/images/demo/bathroom-transitional.png',
      '/images/demo/bathroom-accessible-new.png',
    ],
    chat_transcript: null, // Will be set after chat session insert
    session_id: null, // Will be set after chat session insert
    last_contacted_at: null,
    created_at: daysAgo(1, 19),
  },
];

// ─── Visualizations ──────────────────────────────────────────────────────────

function buildVisualizations(insertedLeads) {
  const byName = Object.fromEntries(insertedLeads.map((l) => [l.name, l]));
  const robert = byName['Robert Kowalski'];
  const priya = byName['Priya Sharma'];

  return [
    // Robert — Entertainment area visualization
    {
      site_id: SITE_ID,
      lead_id: robert.id,
      email: robert.email,
      original_photo_url: '/images/demo/before-basement.png',
      room_type: 'basement',
      style: 'contemporary',
      constraints: 'Want a home theatre area with built-in entertainment centre and wet bar. Premium finishes, warm lighting.',
      generated_concepts: [
        { id: 'rc1', imageUrl: '/images/demo/basement-entertainment.png', description: 'Open-concept entertainment zone with 120" projection screen, built-in walnut cabinetry, ambient LED cove lighting, and luxury vinyl plank flooring in warm oak.', generatedAt: daysAgo(26) },
        { id: 'rc2', imageUrl: '/images/demo/basement-bar.png', description: 'Wet bar with waterfall quartz countertop, floating glass shelves with LED backlighting, under-counter wine fridge, and brushed gold fixtures.', generatedAt: daysAgo(26) },
      ],
      generation_time_ms: 45200,
      photo_analysis: {
        roomType: 'basement',
        currentCondition: 'unfinished',
        structuralElements: ['concrete foundation walls', 'steel support columns', 'exposed joists', 'HVAC ductwork'],
        identifiedFixtures: ['sump pump', 'water heater', 'electrical panel'],
        layoutType: 'open rectangular',
        lightingConditions: 'minimal — two bare bulb fixtures',
        perspectiveNotes: 'Wide-angle from staircase looking across full space',
        preservationConstraints: ['steel columns (structural)', 'main drain stack', 'electrical panel location'],
        confidenceScore: 0.88,
      },
      conversation_context: {
        extractedData: {
          desiredChanges: ['home theatre with 120" screen', 'wet bar with sink and mini fridge', 'ambient lighting throughout', 'sound insulation'],
          constraintsToPreserve: ['steel support columns', 'existing drain locations'],
          stylePreference: 'contemporary',
          materialPreferences: ['luxury vinyl plank', 'quartz countertops', 'walnut cabinetry'],
        },
        turnCount: 6,
      },
      concept_pricing: {
        identifiedMaterials: [
          { name: 'Luxury vinyl plank (premium)', category: 'flooring', estimatedQuantity: '500 sqft', priceRange: { low: 5000, high: 7000 }, unit: 'sqft', confidence: 0.85 },
          { name: 'Quartz countertop (bar)', category: 'surfaces', estimatedQuantity: '20 sqft', priceRange: { low: 2000, high: 3000 }, unit: 'sqft', confidence: 0.80 },
          { name: 'Custom walnut cabinetry', category: 'cabinetry', estimatedQuantity: '12 lf', priceRange: { low: 6000, high: 9600 }, unit: 'lf', confidence: 0.75 },
          { name: 'LED cove lighting system', category: 'electrical', estimatedQuantity: '1 lot', priceRange: { low: 2500, high: 4000 }, unit: 'lot', confidence: 0.70 },
        ],
        inferredFinishLevel: 'premium',
        materialCostRange: { low: 28000, high: 42000 },
        labourCostRange: { low: 35000, high: 48000 },
        totalEstimate: { low: 63000, high: 90000 },
        visibleChanges: ['home theatre wall with concealed wiring', 'wet bar with floating shelves', 'LED ambient lighting', 'premium LVP flooring'],
        overallConfidence: 0.78,
      },
      admin_notes: 'Client very excited about theatre setup. Discussed acoustic panels — may add to quote.',
      selected_concept_index: 0,
      contractor_feasibility_score: 4,
      estimated_cost_impact: 'very_high',
      technical_concerns: ['HVAC ductwork routing needs planning', 'Egress window structural assessment needed', 'Plumbing for wet bar and bathroom requires careful routing'],
      shared: false,
      share_token: null,
      downloaded: false,
      download_count: 0,
      source: 'visualizer',
      device_type: 'desktop',
      created_at: daysAgo(26, 11),
    },
    // Robert — Guest suite visualization
    {
      site_id: SITE_ID,
      lead_id: robert.id,
      email: robert.email,
      original_photo_url: '/images/demo/before-basement.png',
      room_type: 'basement',
      style: 'modern',
      constraints: 'Guest bedroom with egress window, full bathroom, and small exercise area. Comfortable and bright despite being below grade.',
      generated_concepts: [
        { id: 'rc3', imageUrl: '/images/demo/basement-walkout.png', description: 'Guest suite with large egress window flooding the room with natural light, built-in wardrobe with mirrored doors, plush carpet, and recessed lighting with dimmer.', generatedAt: daysAgo(25) },
        { id: 'rc4', imageUrl: '/images/demo/basement-theatre.png', description: 'Full 3-piece bathroom with walk-in shower, floating vanity, large-format tile, and heated floors. Exercise area visible through glass partition.', generatedAt: daysAgo(25) },
      ],
      generation_time_ms: 52800,
      photo_analysis: {
        roomType: 'basement',
        currentCondition: 'unfinished',
        structuralElements: ['concrete block wall (exterior)', 'small window opening (to be enlarged)', 'floor drain'],
        identifiedFixtures: ['floor drain near proposed bathroom location'],
        layoutType: 'rectangular section of larger space',
        lightingConditions: 'very limited — single small window',
        perspectiveNotes: 'Looking toward exterior wall where egress window will go',
        preservationConstraints: ['main drain location', 'foundation waterproofing integrity'],
        confidenceScore: 0.82,
      },
      conversation_context: {
        extractedData: {
          desiredChanges: ['egress window installation', 'full 3-piece bathroom', 'built-in wardrobe', 'rubber gym flooring in exercise area'],
          constraintsToPreserve: ['main drain location', 'foundation waterproofing'],
          stylePreference: 'modern',
          materialPreferences: ['plush carpet for bedroom', 'large-format tile for bathroom', 'rubber flooring for gym'],
        },
        turnCount: 4,
      },
      concept_pricing: null,
      admin_notes: null,
      selected_concept_index: null,
      contractor_feasibility_score: null,
      estimated_cost_impact: null,
      technical_concerns: null,
      shared: false,
      share_token: null,
      downloaded: false,
      download_count: 0,
      source: 'visualizer',
      device_type: 'desktop',
      created_at: daysAgo(25, 14),
    },
    // Priya — Bathroom visualization (4 concepts)
    {
      site_id: SITE_ID,
      lead_id: priya.id,
      email: priya.email,
      original_photo_url: '/images/demo/before-bathroom.png',
      room_type: 'bathroom',
      style: 'modern',
      constraints: 'Accessibility features without looking clinical. Curbless shower, grab bars that look like design elements, comfort-height toilet. Parents visit often — need it safe but beautiful.',
      generated_concepts: [
        { id: 'pc1', imageUrl: '/images/demo/bathroom-modern.png', description: 'Sleek modern bathroom with frameless glass curbless shower, floating double vanity, large-format grey porcelain tile, and backlit LED mirror. Integrated grab bars in matte black match the fixtures.', generatedAt: daysAgo(1) },
        { id: 'pc2', imageUrl: '/images/demo/bathroom-spa.png', description: 'Spa-inspired retreat with rainfall showerhead, teak bench in curbless shower, natural stone accent wall, and warm ambient lighting. Grab bars integrated into towel bar design.', generatedAt: daysAgo(1) },
        { id: 'pc3', imageUrl: '/images/demo/bathroom-transitional.png', description: 'Transitional style with freestanding soaker tub, white subway tile with brass accents, patterned cement floor tile, and wall-mounted grab bars in brushed brass finish.', generatedAt: daysAgo(1) },
        { id: 'pc4', imageUrl: '/images/demo/bathroom-accessible-new.png', description: 'Fully accessible design with roll-in shower, fold-down bench seat, wall-hung vanity at accessible height, non-slip textured tile, and elegant chrome grab bars throughout.', generatedAt: daysAgo(1) },
      ],
      generation_time_ms: 68400,
      photo_analysis: {
        roomType: 'bathroom',
        currentCondition: 'dated',
        structuralElements: ['standard stud walls', 'concrete subfloor under tile', 'single window (frosted)'],
        identifiedFixtures: ['bathtub/shower combo', 'single vanity with oak cabinet', 'standard toilet', 'medicine cabinet'],
        layoutType: 'standard rectangular (5x10)',
        lightingConditions: 'dim fluorescent overhead + small window',
        perspectiveNotes: 'Taken from doorway looking toward window wall, showing full room layout',
        preservationConstraints: ['window location', 'main stack position (behind toilet)'],
        confidenceScore: 0.91,
      },
      conversation_context: {
        extractedData: {
          desiredChanges: ['curbless walk-in shower replacing tub', 'comfort-height toilet', 'floating vanity', 'integrated grab bars', 'wider doorway', 'heated floors'],
          constraintsToPreserve: ['window location and natural light', 'main plumbing stack position'],
          stylePreference: 'modern',
          materialPreferences: ['large-format porcelain tile', 'quartz countertop', 'matte black or brushed brass fixtures'],
        },
        turnCount: 9,
      },
      concept_pricing: {
        identifiedMaterials: [
          { name: 'Large-format porcelain tile', category: 'flooring', estimatedQuantity: '85 sqft', priceRange: { low: 1275, high: 2125 }, unit: 'sqft', confidence: 0.90 },
          { name: 'Frameless glass shower enclosure', category: 'fixtures', estimatedQuantity: '1 unit', priceRange: { low: 2800, high: 4200 }, unit: 'unit', confidence: 0.85 },
          { name: 'Floating vanity (36")', category: 'cabinetry', estimatedQuantity: '1 unit', priceRange: { low: 1200, high: 2400 }, unit: 'unit', confidence: 0.82 },
          { name: 'Quartz countertop', category: 'surfaces', estimatedQuantity: '6 sqft', priceRange: { low: 480, high: 720 }, unit: 'sqft', confidence: 0.88 },
          { name: 'Comfort-height toilet', category: 'fixtures', estimatedQuantity: '1 unit', priceRange: { low: 400, high: 800 }, unit: 'unit', confidence: 0.92 },
          { name: 'In-floor heating system', category: 'mechanical', estimatedQuantity: '85 sqft', priceRange: { low: 850, high: 1700 }, unit: 'sqft', confidence: 0.78 },
          { name: 'Integrated grab bars (set of 3)', category: 'accessibility', estimatedQuantity: '3 units', priceRange: { low: 450, high: 900 }, unit: 'set', confidence: 0.85 },
        ],
        inferredFinishLevel: 'premium',
        materialCostRange: { low: 12000, high: 18000 },
        labourCostRange: { low: 14000, high: 20000 },
        totalEstimate: { low: 26000, high: 38000 },
        visibleChanges: ['curbless shower with frameless glass', 'floating vanity with vessel sink', 'heated porcelain floor', 'designer grab bars', 'backlit mirror'],
        overallConfidence: 0.83,
      },
      shared: false,
      share_token: null,
      downloaded: false,
      download_count: 0,
      source: 'visualizer',
      device_type: 'mobile',
      created_at: daysAgo(1, 19),
    },
  ];
}

// ─── Lead Visualizations (Junction Table) ────────────────────────────────────

function buildLeadVisualizations(insertedLeads, insertedVisualizations) {
  const byName = Object.fromEntries(insertedLeads.map((l) => [l.name, l]));
  const robert = byName['Robert Kowalski'];
  const priya = byName['Priya Sharma'];

  const robertVizs = insertedVisualizations.filter((v) => v.lead_id === robert.id);
  const priyaVizs = insertedVisualizations.filter((v) => v.lead_id === priya.id);

  return [
    // Robert — entertainment area (primary)
    {
      site_id: SITE_ID,
      lead_id: robert.id,
      visualization_id: robertVizs[0]?.id,
      is_primary: true,
      admin_selected: true,
    },
    // Robert — guest suite
    {
      site_id: SITE_ID,
      lead_id: robert.id,
      visualization_id: robertVizs[1]?.id,
      is_primary: false,
      admin_selected: false,
    },
    // Priya — bathroom (primary)
    {
      site_id: SITE_ID,
      lead_id: priya.id,
      visualization_id: priyaVizs[0]?.id,
      is_primary: true,
      admin_selected: false,
    },
  ].filter((lv) => lv.visualization_id); // Filter out any missing viz IDs
}

// ─── Visualization Metrics ──────────────────────────────────────────────────

function buildVisualizationMetrics(insertedVisualizations) {
  return insertedVisualizations.map((viz) => ({
    site_id: SITE_ID,
    visualization_id: viz.id,
    generation_mode: 'parallel',
    total_generation_time_ms: viz.generation_time_ms,
    concepts_requested: viz.generated_concepts?.length || 4,
    concepts_generated: viz.generated_concepts?.length || 4,
    model_used: 'gemini-3.1-flash-image-preview',
    estimated_cost_usd: parseFloat((0.003 * (viz.generated_concepts?.length || 4)).toFixed(4)),
    created_at: viz.created_at,
  }));
}

// ─── Chat Sessions ───────────────────────────────────────────────────────────

function buildChatSessions(insertedLeads) {
  const byName = Object.fromEntries(insertedLeads.map((l) => [l.name, l]));
  const robert = byName['Robert Kowalski'];
  const priya = byName['Priya Sharma'];

  return [
    // Robert Kowalski — 12-message basement discovery chat
    {
      site_id: SITE_ID,
      email: robert.email,
      state: 'completed',
      device_type: 'desktop',
      started_from: 'general',
      extracted_data: {
        leadId: robert.id,
        projectType: 'basement',
      },
      messages: [
        { role: 'assistant', content: "Welcome! I'm Emma, your renovation assistant. How can I help you today?", timestamp: daysAgo(28, 10) },
        { role: 'user', content: "Hi there. I've got an unfinished basement — about 900 square feet — and I want to turn it into something special.", timestamp: daysAgo(28, 10) },
        { role: 'assistant', content: "That's a fantastic amount of space to work with! An unfinished 900 sqft basement opens up so many possibilities. What's your vision for the space?", timestamp: daysAgo(28, 10) },
        { role: 'user', content: "I want the full package. A home theatre area with built-in speakers and a proper screen wall, a wet bar for entertaining, and a guest bedroom with its own bathroom.", timestamp: daysAgo(28, 10) },
        { role: 'assistant', content: "That sounds like an incredible entertainment space! A home theatre, wet bar, and guest suite — you'll essentially be adding a whole new living area to your home. Are you thinking about an exercise area too? That's a popular addition with this kind of build-out.", timestamp: daysAgo(28, 10) },
        { role: 'user', content: "Actually yes, I was thinking about that too. A small exercise area with rubber flooring in one corner. Maybe 120 square feet or so. And I want premium finishes throughout — this isn't a budget build.", timestamp: daysAgo(28, 10) },
        { role: 'assistant', content: "Premium finishes throughout will really elevate the space. For the guest bedroom, are you planning to add an egress window? That's typically required by building code for a bedroom in a basement, and it also brings in natural light.", timestamp: daysAgo(28, 10) },
        { role: 'user', content: "Yes, egress window is a must. I know we'll need permits for that. What about the wet bar — I'm thinking proper cabinetry, a sink, countertop, and space for a mini fridge.", timestamp: daysAgo(28, 10) },
        { role: 'assistant', content: "A full wet bar with cabinetry, sink, countertop, and mini fridge alcove is a great call for entertaining. We'd need to run plumbing for the sink and the bathroom, plus extend your HVAC to heat and cool the finished space properly. Have you thought about flooring for the main areas?", timestamp: daysAgo(28, 10) },
        { role: 'user', content: "Luxury vinyl plank for most of it — I've heard it's the best option for basements because of moisture. Rubber for the gym area like I mentioned. What kind of budget should I be thinking about for all of this?", timestamp: daysAgo(28, 10) },
        { role: 'assistant', content: "LVP is the perfect choice for basements — it's waterproof, durable, and looks beautiful. For a 900 sqft premium basement build-out with theatre, wet bar, guest suite with egress window, full bathroom, exercise area, and high-end finishes, you're likely looking at $70-90k range. That includes framing, insulation, electrical, plumbing, HVAC extension, and all the finishing work. Does that align with your expectations?", timestamp: daysAgo(28, 10) },
        { role: 'user', content: "That's right in line with what I was expecting. We want to get started within the next couple of months. Can we move forward with a detailed quote?", timestamp: daysAgo(28, 10) },
      ],
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: daysAgo(28, 10),
    },
    // Priya Sharma — 18-message bathroom accessibility chat
    {
      site_id: SITE_ID,
      email: priya.email,
      state: 'completed',
      device_type: 'mobile',
      started_from: 'visualizer',
      extracted_data: {
        leadId: priya.id,
        projectType: 'bathroom',
      },
      messages: [
        { role: 'assistant', content: "Hi there! I'm Emma. I see you've been exploring some renovation ideas — those AI visualizations look great! What caught your eye?", timestamp: daysAgo(1, 19) },
        { role: 'user', content: "Hi Emma! I'm really impressed by the modern bathroom concept. I love the clean lines and the curbless shower idea.", timestamp: daysAgo(1, 19) },
        { role: 'assistant', content: "The curbless shower is a beautiful choice! It makes the whole bathroom feel more spacious and open. Is there a particular reason you're drawn to that design — beyond the aesthetics?", timestamp: daysAgo(1, 19) },
        { role: 'user', content: "Actually yes. My parents are getting older and they visit us a lot. My mom has some mobility issues, so I want the bathroom to be accessible without looking like a hospital. Is that possible?", timestamp: daysAgo(1, 19) },
        { role: 'assistant', content: "Absolutely! That's actually one of the biggest trends in bathroom design right now — universal design that's beautiful first and accessible by nature. A curbless shower is the perfect starting point. We can also integrate grab bars that look like sleek towel bars, install a comfort-height toilet, and use non-slip tile that still looks gorgeous.", timestamp: daysAgo(1, 19) },
        { role: 'user', content: "That sounds exactly what I want. What about the vanity? My dad uses a wheelchair sometimes — could we make the vanity accessible too?", timestamp: daysAgo(1, 19) },
        { role: 'assistant', content: "A wall-mounted (floating) vanity is perfect for this. We can set it at a height that works for both standing and seated users, and the open space underneath allows wheelchair access. You can choose a beautiful modern design that happens to be accessible. What style of fixtures are you thinking — matte black, brushed brass, chrome?", timestamp: daysAgo(1, 19) },
        { role: 'user', content: "I love the matte black look, but my husband prefers brushed brass. We'll probably go with brass since it feels warmer. What about the floor? I'm worried about slipping.", timestamp: daysAgo(1, 19) },
        { role: 'assistant', content: "Brushed brass is a gorgeous choice and it does add warmth. For the floor, we'd recommend large-format porcelain tile with a textured (slip-resistant) finish. You get the beautiful clean look of large tiles with built-in safety. We can also add in-floor heating — it's a luxury upgrade that also helps keep the floor dry faster, which adds another layer of safety.", timestamp: daysAgo(1, 19) },
        { role: 'user', content: "Heated floors! I didn't even think of that but I love the idea. How much does that add to the cost?", timestamp: daysAgo(1, 19) },
        { role: 'assistant', content: "For an 85 square foot bathroom, in-floor heating typically adds about $1,000-1,800 including materials and labour. It's one of the best bang-for-your-buck upgrades — people absolutely love it, especially in Canadian winters. Worth every penny in my opinion!", timestamp: daysAgo(1, 19) },
        { role: 'user', content: "Definitely including that. What about the shower itself? I saw the concept with the rainfall showerhead — can we do that with a bench seat too?", timestamp: daysAgo(1, 19) },
        { role: 'assistant', content: "Of course! A rainfall showerhead with a built-in bench seat is a beautiful combination. The bench can be tiled to match the walls, so it looks intentional and luxurious rather than clinical. We'd include a handheld showerhead on a slide bar too — essential for accessibility and great for anyone. A frameless glass enclosure keeps it looking clean and open.", timestamp: daysAgo(1, 19) },
        { role: 'user', content: "This is all sounding perfect. Can you tell me what the total budget might look like? We're thinking $25-35k. Is that realistic?", timestamp: daysAgo(1, 19) },
        { role: 'assistant', content: "For an 85 sqft premium bathroom renovation with curbless shower, frameless glass, heated floors, floating vanity, comfort-height toilet, and accessibility features — $28-35k is a realistic range. That includes demolition, plumbing updates, waterproofing, tile work, fixtures, lighting, and all the finishing touches. The doorway widening might add $1,000-2,000 depending on the wall structure.", timestamp: daysAgo(1, 19) },
        { role: 'user', content: "That's right in our range. The doorway definitely needs to be wider — it's only 24 inches right now. Would you be able to put together a detailed quote?", timestamp: daysAgo(1, 19) },
        { role: 'assistant', content: "I'd be happy to help with that! I've captured all your preferences — curbless shower with bench and rainfall head, floating vanity, comfort-height toilet, heated porcelain floors, brushed brass fixtures, frameless glass, integrated grab bars, and doorway widening. I'll put together a detailed estimate for you. Can I get your contact information so our team can follow up?", timestamp: daysAgo(1, 19) },
        { role: 'user', content: "Sure! I'm Priya Sharma, my email is priya.sharma@gmail.com and my phone is 226-555-0198. We're at 14 Avondale Avenue in Kitchener. Looking forward to the quote!", timestamp: daysAgo(1, 19) },
      ],
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: daysAgo(1, 19),
    },
  ];
}

// ─── Quote Drafts ────────────────────────────────────────────────────────────

function buildQuoteDrafts(insertedLeads) {
  const byName = Object.fromEntries(insertedLeads.map((l) => [l.name, l]));
  const mike = byName['Mike Thompson'];
  const robert = byName['Robert Kowalski'];
  const priya = byName['Priya Sharma'];

  // ── Mike Thompson — Kitchen Refresh ($26,396.35) ──
  const mikeItems = [
    { description: 'Kitchen demolition — countertops, backsplash, flooring removal', category: 'Demo/Framing', quantity: 1, unit: 'lot', unit_price: 2200, total: 2200 },
    { description: 'Quartz countertop installation (L-shaped, 38 lf)', category: 'Surfaces', quantity: 38, unit: 'lf', unit_price: 115, total: 4370 },
    { description: 'Cabinet refacing — paint boxes, new Shaker doors + soft-close hardware', category: 'Cabinetry', quantity: 18, unit: 'door', unit_price: 285, total: 5130 },
    { description: 'Ceramic tile backsplash — subway pattern', category: 'Surfaces', quantity: 42, unit: 'sqft', unit_price: 28, total: 1176 },
    { description: 'Pot light installation (8 units) replacing fluorescent', category: 'Electrical', quantity: 8, unit: 'unit', unit_price: 185, total: 1480 },
    { description: 'Luxury vinyl plank flooring — waterproof, 165 sqft', category: 'Flooring', quantity: 165, unit: 'sqft', unit_price: 14, total: 2310 },
    { description: 'Plumbing — new faucet and sink installation', category: 'Plumbing', quantity: 1, unit: 'lot', unit_price: 1850, total: 1850 },
    { description: 'Paint and trim — walls, ceiling (2 coats)', category: 'Finishes', quantity: 1, unit: 'lot', unit_price: 2720, total: 2720 },
  ];
  const mikeSubtotal = mikeItems.reduce((sum, i) => sum + i.total, 0); // 21236
  const mikeContingency = Math.round(mikeSubtotal * 0.10 * 100) / 100; // 2123.60
  const mikeHst = Math.round((mikeSubtotal + mikeContingency) * 0.13 * 100) / 100; // 3036.75
  const mikeTotal = Math.round((mikeSubtotal + mikeContingency + mikeHst) * 100) / 100; // 26396.35
  const mikeDeposit = Math.round(mikeTotal * 0.15 * 100) / 100; // 3959.45

  // ── Robert v1 — AI-generated basement quote ($92,356.86) ──
  const robertV1Items = [
    { description: 'Basement framing — walls, bulkheads, soffits (900 sqft)', category: 'Demo/Framing', quantity: 900, unit: 'sqft', unit_price: 8, total: 7200 },
    { description: 'Spray foam insulation and vapour barrier', category: 'Insulation', quantity: 900, unit: 'sqft', unit_price: 5, total: 4500 },
    { description: 'Drywall, taping, and sanding throughout', category: 'Finishes', quantity: 900, unit: 'sqft', unit_price: 8, total: 7200 },
    { description: 'Electrical — panel upgrade, 20 circuits, theatre wiring', category: 'Electrical', quantity: 1, unit: 'lot', unit_price: 9800, total: 9800 },
    { description: 'Plumbing — full bathroom + wet bar sink', category: 'Plumbing', quantity: 1, unit: 'lot', unit_price: 8400, total: 8400 },
    { description: 'Luxury vinyl plank flooring', category: 'Flooring', quantity: 780, unit: 'sqft', unit_price: 12, total: 9360 },
    { description: 'Wet bar — stock cabinetry, laminate counter, sink', category: 'Fixtures', quantity: 1, unit: 'lot', unit_price: 5800, total: 5800 },
    { description: 'Interior trim, doors, baseboards', category: 'Finishes', quantity: 1, unit: 'lot', unit_price: 4800, total: 4800 },
    { description: 'HVAC ductwork extension — 2 zones', category: 'Mechanical', quantity: 1, unit: 'lot', unit_price: 6400, total: 6400 },
    { description: 'Paint — walls, ceilings, trim (2 coats)', category: 'Finishes', quantity: 1, unit: 'lot', unit_price: 3800, total: 3800 },
  ];
  const robertV1Subtotal = robertV1Items.reduce((sum, i) => sum + i.total, 0); // 67260
  const robertV1Contingency = Math.round(robertV1Subtotal * 0.10 * 100) / 100;
  const robertV1Hst = Math.round((robertV1Subtotal + robertV1Contingency) * 0.13 * 100) / 100;
  const robertV1Total = Math.round((robertV1Subtotal + robertV1Contingency + robertV1Hst) * 100) / 100;

  // ── Robert v2 — Contractor-refined ($101,876.28) ──
  const robertV2Items = [
    { description: 'Basement framing — walls, bulkheads, soffits (900 sqft)', category: 'Demo/Framing', quantity: 900, unit: 'sqft', unit_price: 8, total: 7200 },
    { description: 'Spray foam insulation and vapour barrier', category: 'Insulation', quantity: 900, unit: 'sqft', unit_price: 5.50, total: 4950 },
    { description: 'Drywall, taping, and sanding throughout', category: 'Finishes', quantity: 900, unit: 'sqft', unit_price: 8, total: 7200 },
    { description: 'Electrical — panel upgrade, 22 circuits, theatre wiring + dedicated circuits', category: 'Electrical', quantity: 1, unit: 'lot', unit_price: 11200, total: 11200 },
    { description: 'Plumbing — full bathroom + wet bar + egress window drain', category: 'Plumbing', quantity: 1, unit: 'lot', unit_price: 9600, total: 9600 },
    { description: 'Luxury vinyl plank flooring (main areas)', category: 'Flooring', quantity: 780, unit: 'sqft', unit_price: 13, total: 10140 },
    { description: 'Rubber gym flooring (exercise area)', category: 'Flooring', quantity: 120, unit: 'sqft', unit_price: 9, total: 1080 },
    { description: 'Wet bar — custom walnut cabinetry, quartz countertop, sink, mini fridge alcove', category: 'Fixtures', quantity: 1, unit: 'lot', unit_price: 8900, total: 8900 },
    { description: 'Egress window installation (incl. excavation + well)', category: 'Structural', quantity: 1, unit: 'lot', unit_price: 6800, total: 6800 },
    { description: 'Interior trim, doors (solid core), and baseboards', category: 'Finishes', quantity: 1, unit: 'lot', unit_price: 5890, total: 5890 },
    { description: 'HVAC ductwork extension — 2 zones + returns', category: 'Mechanical', quantity: 1, unit: 'lot', unit_price: 7200, total: 7200 },
    { description: 'Prime and paint — walls, ceilings, trim (2 coats, premium paint)', category: 'Finishes', quantity: 1, unit: 'lot', unit_price: 1800, total: 1800 },
  ];
  const robertV2Subtotal = robertV2Items.reduce((sum, i) => sum + i.total, 0); // 81960
  const robertV2Contingency = Math.round(robertV2Subtotal * 0.10 * 100) / 100; // 8196.00
  const robertV2Hst = Math.round((robertV2Subtotal + robertV2Contingency) * 0.13 * 100) / 100; // 11720.28
  const robertV2Total = Math.round((robertV2Subtotal + robertV2Contingency + robertV2Hst) * 100) / 100; // 101876.28
  const robertV2Deposit = Math.round(robertV2Total * 0.15 * 100) / 100; // 15281.44

  // ── Priya — Bathroom Renovation ($35,189.33) ──
  const priyaItems = [
    { description: 'Bathroom demolition — full gut including tile, fixtures, vanity', category: 'Demo/Framing', quantity: 1, unit: 'lot', unit_price: 2800, total: 2800 },
    { description: 'Plumbing reconfiguration — curbless shower drain, new supply lines', category: 'Plumbing', quantity: 1, unit: 'lot', unit_price: 4200, total: 4200 },
    { description: 'Electrical — GFCI outlets, exhaust fan, recessed lighting (6 units)', category: 'Electrical', quantity: 1, unit: 'lot', unit_price: 2400, total: 2400 },
    { description: 'Waterproofing — Schluter membrane system (shower + floor)', category: 'Waterproofing', quantity: 85, unit: 'sqft', unit_price: 18, total: 1530 },
    { description: 'Large-format porcelain tile — floor + shower walls', category: 'Tile', quantity: 210, unit: 'sqft', unit_price: 24, total: 5040 },
    { description: 'In-floor radiant heating system', category: 'Mechanical', quantity: 85, unit: 'sqft', unit_price: 16, total: 1360 },
    { description: 'Frameless glass shower enclosure (custom)', category: 'Fixtures', quantity: 1, unit: 'lot', unit_price: 3400, total: 3400 },
    { description: 'Floating vanity with quartz top + vessel sink', category: 'Fixtures', quantity: 1, unit: 'lot', unit_price: 2800, total: 2800 },
    { description: 'Comfort-height toilet + integrated grab bars (3 locations)', category: 'Fixtures', quantity: 1, unit: 'lot', unit_price: 1680, total: 1680 },
    { description: 'Doorway widening (24" to 34") — framing + drywall + trim', category: 'Structural', quantity: 1, unit: 'lot', unit_price: 1800, total: 1800 },
    { description: 'Brushed brass fixtures package + backlit LED mirror', category: 'Fixtures', quantity: 1, unit: 'lot', unit_price: 2300, total: 2300 },
  ];
  const priyaSubtotal = priyaItems.reduce((sum, i) => sum + i.total, 0); // 28310
  const priyaContingency = Math.round(priyaSubtotal * 0.10 * 100) / 100; // 2831.00
  const priyaHst = Math.round((priyaSubtotal + priyaContingency) * 0.13 * 100) / 100; // 4048.33
  const priyaTotal = Math.round((priyaSubtotal + priyaContingency + priyaHst) * 100) / 100; // 35189.33
  const priyaDeposit = Math.round(priyaTotal * 0.15 * 100) / 100; // 5278.40

  return [
    // Mike v1 — Kitchen, sent
    {
      site_id: SITE_ID,
      lead_id: mike.id,
      version: 1,
      line_items: mikeItems,
      subtotal: mikeSubtotal,
      contingency_percent: 10,
      contingency_amount: mikeContingency,
      hst_percent: 13,
      hst_amount: mikeHst,
      total: mikeTotal,
      deposit_percent: 15,
      deposit_required: mikeDeposit,
      validity_days: 30,
      assumptions: [
        'Standard 8\' ceiling height',
        'Existing electrical panel has capacity for 8 new pot lights',
        'No asbestos in existing flooring or ceiling',
        'Existing plumbing in good condition (sink relocation not included)',
      ],
      exclusions: [
        'Appliance supply (installation allowance included)',
        'Window treatments',
        'Furniture and personal item removal',
        'Any structural modifications',
      ],
      sent_at: daysAgo(3),
      sent_to_email: mike.email,
      acceptance_status: null,
      accepted_at: null,
      accepted_by_name: null,
      created_at: daysAgo(4, 9),
    },
    // Robert v1 — AI-generated (not sent, superseded by v2)
    {
      site_id: SITE_ID,
      lead_id: robert.id,
      version: 1,
      line_items: robertV1Items,
      subtotal: robertV1Subtotal,
      contingency_percent: 10,
      contingency_amount: robertV1Contingency,
      hst_percent: 13,
      hst_amount: robertV1Hst,
      total: robertV1Total,
      deposit_percent: 15,
      deposit_required: Math.round(robertV1Total * 0.15 * 100) / 100,
      validity_days: 30,
      assumptions: [
        'Basement ceiling height min 7\'6" after framing',
        'No existing water infiltration issues',
        'HVAC system has capacity for additional zones',
      ],
      exclusions: [
        'AV equipment (speakers, projector, screen)',
        'Exercise equipment and accessories',
        'Furniture and decor',
        'Bar accessories and mini fridge',
      ],
      sent_at: null,
      sent_to_email: null,
      acceptance_status: null,
      accepted_at: null,
      accepted_by_name: null,
      created_at: daysAgo(24, 15),
    },
    // Robert v2 — Contractor-refined, sent and accepted
    {
      site_id: SITE_ID,
      lead_id: robert.id,
      version: 2,
      line_items: robertV2Items,
      subtotal: robertV2Subtotal,
      contingency_percent: 10,
      contingency_amount: robertV2Contingency,
      hst_percent: 13,
      hst_amount: robertV2Hst,
      total: robertV2Total,
      deposit_percent: 15,
      deposit_required: robertV2Deposit,
      validity_days: 30,
      assumptions: [
        'Basement ceiling height min 7\'6" after framing',
        'No existing water infiltration or moisture issues',
        'Permit applications handled by contractor',
        'HVAC capacity supports additional finished space',
        'Egress window location approved by structural engineer',
      ],
      exclusions: [
        'Audio/video equipment (speakers, projector, screen)',
        'Exercise equipment and rubber gym accessories',
        'Furniture and decor',
        'Mini fridge and bar accessories',
        'Municipal permit fees (passed through at cost)',
      ],
      sent_at: daysAgo(20),
      sent_to_email: robert.email,
      acceptance_status: 'accepted',
      accepted_at: daysAgo(18),
      accepted_by_name: 'Robert Kowalski',
      created_at: daysAgo(22, 10),
    },
    // Priya v1 — AI-generated (not sent yet — new lead)
    {
      site_id: SITE_ID,
      lead_id: priya.id,
      version: 1,
      line_items: priyaItems,
      subtotal: priyaSubtotal,
      contingency_percent: 10,
      contingency_amount: priyaContingency,
      hst_percent: 13,
      hst_amount: priyaHst,
      total: priyaTotal,
      deposit_percent: 15,
      deposit_required: priyaDeposit,
      validity_days: 30,
      assumptions: [
        'Standard wood-frame walls (not concrete block)',
        'Existing plumbing in serviceable condition',
        'Doorway header exists and is structurally adequate for widening',
        'No asbestos or lead paint in existing finishes',
      ],
      exclusions: [
        'Fixtures beyond specified scope (towel warmers, etc.)',
        'Paint beyond bathroom (hallway patching from doorway widening included)',
        'Storage solutions and accessories',
        'Municipal permit fees (if required for doorway)',
      ],
      sent_at: null,
      sent_to_email: null,
      acceptance_status: null,
      accepted_at: null,
      accepted_by_name: null,
      created_at: daysAgo(1, 20),
    },
  ];
}

// ─── Invoice ────────────────────────────────────────────────────────────────

function buildInvoices(insertedLeads, insertedQuoteDrafts) {
  const byName = Object.fromEntries(insertedLeads.map((l) => [l.name, l]));
  const robert = byName['Robert Kowalski'];

  // Find Robert's v2 quote (accepted)
  const robertV2 = insertedQuoteDrafts.find(
    (q) => q.lead_id === robert.id && q.version === 2
  );
  if (!robertV2) return [];

  return [
    {
      site_id: SITE_ID,
      invoice_number: 'INV-2026-001',
      lead_id: robert.id,
      quote_draft_id: robertV2.id,
      status: 'paid',
      line_items: [
        {
          description: 'Basement renovation — 15% deposit per signed quote v2',
          category: 'Deposit',
          quantity: 1,
          unit: 'lot',
          unit_price: robertV2.deposit_required,
          total: robertV2.deposit_required,
        },
      ],
      subtotal: robertV2.deposit_required,
      contingency_percent: 0,
      contingency_amount: 0,
      hst_amount: 0,
      total: robertV2.deposit_required,
      amount_paid: robertV2.deposit_required,
      balance_due: 0,
      deposit_required: robertV2.deposit_required,
      deposit_received: true,
      customer_name: robert.name,
      customer_email: robert.email,
      customer_phone: robert.phone,
      customer_address: robert.address,
      customer_city: robert.city,
      customer_province: robert.province,
      customer_postal_code: robert.postal_code,
      issue_date: daysAgoDate(18),
      due_date: daysAgoDate(4),
      sent_at: daysAgo(18),
      notes: 'Deposit invoice — project start contingent on receipt. Thank you for choosing us!',
      created_at: daysAgo(18, 9),
    },
  ];
}

// ─── Payments ───────────────────────────────────────────────────────────────

function buildPayments(insertedInvoices) {
  const paidInvoice = insertedInvoices.find((i) => i.status === 'paid');
  if (!paidInvoice) return [];

  return [
    {
      site_id: SITE_ID,
      invoice_id: paidInvoice.id,
      amount: paidInvoice.total,
      payment_method: 'etransfer',
      payment_date: daysAgoDate(16),
      reference_number: 'EMT-20260211-RK001',
      notes: 'Deposit received via Interac e-Transfer. Project start confirmed.',
    },
  ];
}

// ─── Drawings ───────────────────────────────────────────────────────────────

function buildDrawings(insertedLeads) {
  const byName = Object.fromEntries(insertedLeads.map((l) => [l.name, l]));
  const robert = byName['Robert Kowalski'];

  return [
    // Robert — Basement floor plan (approved)
    {
      site_id: SITE_ID,
      name: 'Basement Floor Plan — Full Layout',
      description: 'Complete basement layout showing all zones: theatre (280 sqft), wet bar (80 sqft), guest bedroom (200 sqft), bathroom (60 sqft), exercise area (120 sqft), hallway/mechanical (160 sqft). Includes electrical panel location, HVAC routing, and egress window placement.',
      lead_id: robert.id,
      drawing_data: {
        type: 'floor_plan',
        scale: '1/4" = 1\'',
        dimensions: { width: 30, height: 30, unit: 'ft' },
        zones: [
          { name: 'Home Theatre', sqft: 280, position: 'north-west' },
          { name: 'Wet Bar', sqft: 80, position: 'north-east' },
          { name: 'Guest Bedroom', sqft: 200, position: 'south-east' },
          { name: 'Bathroom', sqft: 60, position: 'south-centre' },
          { name: 'Exercise Area', sqft: 120, position: 'south-west' },
          { name: 'Hallway / Mechanical', sqft: 160, position: 'centre' },
        ],
      },
      thumbnail_url: null,
      status: 'approved',
      permit_number: 'BP-2026-0342',
      pdf_url: null,
      created_by: null,
      created_at: daysAgo(15, 11),
    },
    // Robert — Egress window detail (submitted for review)
    {
      site_id: SITE_ID,
      name: 'Egress Window Detail — Guest Bedroom',
      description: 'Structural detail for egress window installation. Shows excavation depth, window well dimensions, drainage, and waterproofing membrane. Meets Ontario Building Code 9.9.10.1 for below-grade bedroom egress.',
      lead_id: robert.id,
      drawing_data: {
        type: 'structural_detail',
        scale: '1" = 1\'',
        dimensions: { width: 4, height: 6, unit: 'ft' },
        specifications: {
          windowSize: '48" x 36" casement',
          wellDepth: '42 inches below grade',
          wellWidth: '48 inches',
          drainage: 'Weeping tile to existing foundation drain',
          waterproofing: 'Blueskin membrane with drainage board',
        },
      },
      thumbnail_url: null,
      status: 'submitted',
      permit_number: null,
      pdf_url: null,
      created_by: null,
      created_at: daysAgo(12, 14),
    },
  ];
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

function buildAuditLog(insertedLeads, insertedQuoteDrafts) {
  const byName = Object.fromEntries(insertedLeads.map((l) => [l.name, l]));
  const mike = byName['Mike Thompson'];
  const robert = byName['Robert Kowalski'];
  const priya = byName['Priya Sharma'];

  const mikeQuote = insertedQuoteDrafts.find((q) => q.lead_id === mike.id);
  const robertV1 = insertedQuoteDrafts.find((q) => q.lead_id === robert.id && q.version === 1);
  const robertV2 = insertedQuoteDrafts.find((q) => q.lead_id === robert.id && q.version === 2);
  const priyaQuote = insertedQuoteDrafts.find((q) => q.lead_id === priya.id);

  return [
    // Mike — 3 events
    {
      site_id: SITE_ID,
      lead_id: mike.id,
      action: 'lead_created',
      old_values: null,
      new_values: { source: 'phone', created_by: 'contractor' },
      created_at: daysAgo(5, 14),
    },
    {
      site_id: SITE_ID,
      lead_id: mike.id,
      action: 'quote_created',
      old_values: null,
      new_values: { total: mikeQuote?.total || 0, line_items_count: 8 },
      created_at: daysAgo(4, 9),
    },
    {
      site_id: SITE_ID,
      lead_id: mike.id,
      action: 'quote_sent',
      old_values: null,
      new_values: { sent_to: mike.email },
      created_at: daysAgo(3, 10),
    },
    // Robert — 7 events
    {
      site_id: SITE_ID,
      lead_id: robert.id,
      action: 'lead_created',
      old_values: null,
      new_values: { source: 'website', created_by: 'customer' },
      created_at: daysAgo(28, 10),
    },
    {
      site_id: SITE_ID,
      lead_id: robert.id,
      action: 'quote_created',
      old_values: null,
      new_values: { total: robertV1?.total || 0, line_items_count: 10 },
      created_at: daysAgo(24, 15),
    },
    {
      site_id: SITE_ID,
      lead_id: robert.id,
      action: 'quote_updated',
      old_values: { total: robertV1?.total || 0 },
      new_values: { total: robertV2?.total || 0, line_items_count: 12 },
      created_at: daysAgo(22, 10),
    },
    {
      site_id: SITE_ID,
      lead_id: robert.id,
      action: 'quote_sent',
      old_values: null,
      new_values: { sent_to: robert.email },
      created_at: daysAgo(20, 9),
    },
    {
      site_id: SITE_ID,
      lead_id: robert.id,
      action: 'status_change',
      old_values: { status: 'new' },
      new_values: { status: 'sent' },
      created_at: daysAgo(20, 9),
    },
    {
      site_id: SITE_ID,
      lead_id: robert.id,
      action: 'status_change',
      old_values: { status: 'sent' },
      new_values: { status: 'won' },
      created_at: daysAgo(18, 15),
    },
    {
      site_id: SITE_ID,
      lead_id: robert.id,
      action: 'pdf_generated',
      old_values: null,
      new_values: { version: 2 },
      created_at: daysAgo(18, 16),
    },
    // Priya — 2 events
    {
      site_id: SITE_ID,
      lead_id: priya.id,
      action: 'lead_created',
      old_values: null,
      new_values: { source: 'website', created_by: 'customer' },
      created_at: daysAgo(1, 19),
    },
    {
      site_id: SITE_ID,
      lead_id: priya.id,
      action: 'quote_created',
      old_values: null,
      new_values: { total: priyaQuote?.total || 0, line_items_count: 11 },
      created_at: daysAgo(1, 20),
    },
  ];
}

// ─── API Helpers ─────────────────────────────────────────────────────────────

async function deleteRows(table) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?site_id=eq.${SITE_ID}`,
    {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  if (!res.ok) {
    const text = await res.text();
    // Ignore 404 (table doesn't exist) — migration may not have run yet
    if (res.status === 404) {
      console.log(`    (${table} not found — skipping)`);
      return;
    }
    throw new Error(`Failed to delete from ${table}: ${res.status} ${text}`);
  }
}

async function insertRows(table, rows) {
  if (rows.length === 0) return [];

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to insert into ${table}: ${res.status} ${text}`);
  }

  return res.json();
}

async function updateRow(table, id, data) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update ${table} (${id}): ${res.status} ${text}`);
  }

  return res.json();
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSeeding demo data (site_id: ${SITE_ID})...\n`);

  // ── Step 1: Clear existing data (FK reverse order) ──
  console.log('  Step 1/12: Clearing existing demo data...');
  for (const table of [
    'payments',
    'invoices',
    'audit_log',
    'lead_visualizations',
    'visualization_metrics',
    'visualizations',
    'chat_sessions',
    'quote_drafts',
    'drawings',
    'leads',
  ]) {
    await deleteRows(table);
  }
  console.log('    ✓ Cleared\n');

  // ── Step 2: Insert leads ──
  console.log('  Step 2/12: Inserting leads...');
  const insertedLeads = await insertRows('leads', leads);
  console.log(`    ✓ ${insertedLeads.length} leads inserted\n`);

  // ── Step 3: Insert visualizations ──
  console.log('  Step 3/12: Inserting visualizations...');
  const vizData = buildVisualizations(insertedLeads);
  const insertedViz = [];
  for (const v of vizData) {
    // Separate known columns from extra JSONB columns that may not exist
    const { concept_pricing, ...insertable } = v;
    const [row] = await insertRows('visualizations', [insertable]);
    insertedViz.push(row);
    // Try to update concept_pricing separately (column may not exist)
    if (concept_pricing) {
      try {
        await updateRow('visualizations', row.id, { concept_pricing });
      } catch {
        // Column doesn't exist — skip silently
      }
    }
  }
  console.log(`    ✓ ${insertedViz.length} visualizations inserted\n`);

  // ── Step 4: Insert lead_visualizations junction ──
  console.log('  Step 4/12: Inserting lead_visualizations...');
  const lvData = buildLeadVisualizations(insertedLeads, insertedViz);
  let insertedLV = [];
  try {
    insertedLV = await insertRows('lead_visualizations', lvData);
    console.log(`    ✓ ${insertedLV.length} lead_visualizations inserted\n`);
  } catch (err) {
    console.log(`    ⚠ lead_visualizations table may not exist: ${err.message}\n`);
  }

  // ── Step 5: Insert visualization_metrics ──
  console.log('  Step 5/12: Inserting visualization_metrics...');
  const metricsData = buildVisualizationMetrics(insertedViz);
  let insertedMetrics = [];
  try {
    insertedMetrics = await insertRows('visualization_metrics', metricsData);
    console.log(`    ✓ ${insertedMetrics.length} visualization_metrics inserted\n`);
  } catch {
    console.log('    ⚠ visualization_metrics skipped (table or columns may not exist)\n');
  }

  // ── Step 6: Insert chat sessions ──
  console.log('  Step 6/12: Inserting chat sessions...');
  const chatData = buildChatSessions(insertedLeads);
  const insertedSessions = await insertRows('chat_sessions', chatData);
  console.log(`    ✓ ${insertedSessions.length} chat sessions inserted\n`);

  // ── Step 7: Patch leads with session_id + chat_transcript ──
  console.log('  Step 7/12: Linking chat sessions to leads...');
  const byEmail = Object.fromEntries(insertedSessions.map((s) => [s.email, s]));
  const byName = Object.fromEntries(insertedLeads.map((l) => [l.name, l]));

  // Robert
  const robert = byName['Robert Kowalski'];
  const robertSession = byEmail[robert.email];
  if (robertSession) {
    await updateRow('leads', robert.id, {
      session_id: robertSession.id,
      chat_transcript: robertSession.messages,
    });
  }

  // Priya
  const priya = byName['Priya Sharma'];
  const priyaSession = byEmail[priya.email];
  if (priyaSession) {
    await updateRow('leads', priya.id, {
      session_id: priyaSession.id,
      chat_transcript: priyaSession.messages,
    });
  }
  console.log('    ✓ Linked\n');

  // ── Step 8: Insert quote drafts ──
  console.log('  Step 8/12: Inserting quote drafts...');
  const quoteData = buildQuoteDrafts(insertedLeads);
  const insertedQuotes = await insertRows('quote_drafts', quoteData);
  console.log(`    ✓ ${insertedQuotes.length} quote drafts inserted\n`);

  // ── Step 9: Insert invoice ──
  console.log('  Step 9/12: Inserting invoices...');
  const invoiceData = buildInvoices(insertedLeads, insertedQuotes);
  const insertedInvoices = await insertRows('invoices', invoiceData);
  console.log(`    ✓ ${insertedInvoices.length} invoice(s) inserted\n`);

  // ── Step 10: Insert payment ──
  console.log('  Step 10/12: Inserting payments...');
  const paymentData = buildPayments(insertedInvoices);
  const insertedPayments = await insertRows('payments', paymentData);
  console.log(`    ✓ ${insertedPayments.length} payment(s) inserted\n`);

  // ── Step 11: Insert drawings ──
  console.log('  Step 11/12: Inserting drawings...');
  const drawingData = buildDrawings(insertedLeads);
  const insertedDrawings = await insertRows('drawings', drawingData);
  console.log(`    ✓ ${insertedDrawings.length} drawings inserted\n`);

  // ── Step 12: Insert audit log ──
  console.log('  Step 12/12: Inserting audit log...');
  const auditData = buildAuditLog(insertedLeads, insertedQuotes);
  const insertedAudit = await insertRows('audit_log', auditData);
  console.log(`    ✓ ${insertedAudit.length} audit entries inserted\n`);

  // ── Verify ──
  console.log('─'.repeat(50));
  console.log('Summary:');
  console.log(`  ${insertedLeads.length} leads (Mike: sent, Robert: won, Priya: new)`);
  console.log(`  ${insertedViz.length} visualizations`);
  console.log(`  ${insertedLV.length} lead_visualizations`);
  console.log(`  ${insertedMetrics.length} visualization_metrics`);
  console.log(`  ${insertedSessions.length} chat sessions`);
  console.log(`  ${insertedQuotes.length} quote drafts`);
  console.log(`  ${insertedInvoices.length} invoice(s)`);
  console.log(`  ${insertedPayments.length} payment(s)`);
  console.log(`  ${insertedDrawings.length} drawings`);
  console.log(`  ${insertedAudit.length} audit entries`);

  // Verify quote math
  console.log('\nQuote Math Verification:');
  for (const q of insertedQuotes) {
    const lead = insertedLeads.find((l) => l.id === q.lead_id);
    const items = q.line_items;
    const itemsTotal = items.reduce((sum, i) => sum + i.total, 0);
    const expectedContingency = Math.round(itemsTotal * 0.10 * 100) / 100;
    const expectedHst = Math.round((itemsTotal + expectedContingency) * 0.13 * 100) / 100;
    const expectedTotal = Math.round((itemsTotal + expectedContingency + expectedHst) * 100) / 100;

    const mathOk =
      q.subtotal === itemsTotal &&
      q.contingency_amount === expectedContingency &&
      q.hst_amount === expectedHst &&
      q.total === expectedTotal;

    console.log(`  ${lead?.name || 'Unknown'} v${q.version}: $${q.total?.toLocaleString()} ${mathOk ? '✓' : '✗ MATH ERROR'}`);
    if (!mathOk) {
      console.log(`    Expected: subtotal=$${itemsTotal} contingency=$${expectedContingency} hst=$${expectedHst} total=$${expectedTotal}`);
      console.log(`    Got:      subtotal=$${q.subtotal} contingency=$${q.contingency_amount} hst=$${q.hst_amount} total=$${q.total}`);
    }
  }

  console.log('\nDone! Demo data seeded successfully.\n');
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  if (err.message.includes('duplicate key')) {
    console.error('Hint: Run the script again — it clears data first but FK constraints may have changed.');
  }
  process.exit(1);
});
