#!/usr/bin/env node
/**
 * Seed the `demo` tenant with realistic sample data for sales demonstrations.
 * Idempotent — clears existing demo data before inserting.
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

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(Math.floor(Math.random() * 10) + 8, Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
}

function todayAt(hour) {
  const d = new Date();
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
}

// ─── Lead Data ───────────────────────────────────────────────────────────────

const leads = [
  {
    site_id: SITE_ID,
    name: 'Sarah Mitchell',
    email: 'sarah.mitchell@gmail.com',
    phone: '(519) 555-0147',
    address: '47 Cedarbrook Drive',
    postal_code: 'N2L 3G1',
    city: 'Waterloo',
    province: 'ON',
    project_type: 'kitchen',
    area_sqft: 185,
    timeline: '1_3_months',
    budget_band: '40k_60k',
    finish_level: 'premium',
    goals_text: 'Want to open up the wall between kitchen and dining room, add a large island with waterfall quartz, new custom cabinetry, and upgraded lighting throughout.',
    status: 'new',
    confidence_score: 0.88,
    ai_notes: 'High-intent lead. Clear scope, premium finish level, realistic budget for the work described. Strong candidate for quote generation.',
    source: 'website',
    last_contacted_at: null,
    created_at: todayAt(10),
  },
  {
    site_id: SITE_ID,
    name: 'David Chen',
    email: 'david.chen@outlook.com',
    phone: '(226) 555-0293',
    address: '112 King Street West',
    postal_code: 'N2H 4Y7',
    city: 'Kitchener',
    province: 'ON',
    project_type: 'bathroom',
    area_sqft: 65,
    timeline: 'asap',
    budget_band: '25k_40k',
    finish_level: 'standard',
    goals_text: 'Main bathroom needs a full gut reno. Replacing tub with walk-in shower, new vanity, heated tile floors. Need it done before in-laws visit in April.',
    status: 'new',
    confidence_score: 0.82,
    ai_notes: 'Urgent timeline. Scope is well-defined. Budget aligns with standard bathroom renovation in K-W region.',
    source: 'website',
    last_contacted_at: null,
    created_at: todayAt(8),
  },
  {
    site_id: SITE_ID,
    name: 'Rachel Okafor',
    email: 'rachel.okafor@gmail.com',
    phone: '(905) 555-0418',
    address: '8 Paisley Crescent',
    postal_code: 'L8P 1A2',
    city: 'Hamilton',
    province: 'ON',
    project_type: 'basement',
    area_sqft: 750,
    timeline: '3_6_months',
    budget_band: '25k_40k',
    finish_level: 'standard',
    goals_text: 'Looking to finish the basement as a rental suite. Need a kitchenette, 3-piece bath, separate entrance if possible. Want to understand permit requirements.',
    status: 'needs_clarification',
    confidence_score: 0.71,
    ai_notes: 'Budget may be tight for a full basement suite with separate entrance. Need clarification on permit status and whether foundation waterproofing is needed.',
    source: 'website',
    last_contacted_at: null,
    created_at: daysAgo(3),
  },
  {
    site_id: SITE_ID,
    name: 'Marcus Thompson',
    email: 'marcus.t@gmail.com',
    phone: '(519) 555-0672',
    address: '34 Woolwich Street',
    postal_code: 'N1H 3V1',
    city: 'Guelph',
    province: 'ON',
    project_type: 'flooring',
    area_sqft: 620,
    timeline: '1_3_months',
    budget_band: '15k_25k',
    finish_level: 'standard',
    goals_text: 'Replace carpet with engineered hardwood on the main floor. Living room, dining room, and hallway. Want something durable with two dogs in the house.',
    status: 'draft_ready',
    confidence_score: 0.85,
    ai_notes: 'Straightforward flooring job. Budget is realistic for 620 sqft engineered hardwood with removal and disposal of existing carpet.',
    source: 'website',
    last_contacted_at: null,
    created_at: daysAgo(5),
  },
  {
    site_id: SITE_ID,
    name: 'Jennifer Liu',
    email: 'jennifer.liu@rogers.com',
    phone: '(226) 555-0834',
    address: '291 Oxford Street East',
    postal_code: 'N6A 1V3',
    city: 'London',
    province: 'ON',
    project_type: 'kitchen',
    area_sqft: 210,
    timeline: 'asap',
    budget_band: '60k_plus',
    finish_level: 'premium',
    goals_text: 'Complete kitchen overhaul — remove wall to open up to family room, custom Shaker cabinetry, quartz countertops with waterfall island, pot filler, under-cabinet lighting. Saw a design on Houzz we love.',
    status: 'draft_ready',
    confidence_score: 0.92,
    ai_notes: 'Premium renovation with clear vision. Budget supports the scope. Structural work (wall removal) requires engineering assessment. Excellent candidate.',
    source: 'website',
    last_contacted_at: null,
    created_at: daysAgo(6),
  },
  {
    site_id: SITE_ID,
    name: 'Andrew Patel',
    email: 'andrew.patel@bell.net',
    phone: '(519) 555-0156',
    address: '67 Hespeler Road',
    postal_code: 'N1R 6J3',
    city: 'Cambridge',
    province: 'ON',
    project_type: 'exterior',
    area_sqft: 2200,
    timeline: '1_3_months',
    budget_band: '40k_60k',
    finish_level: 'premium',
    goals_text: 'Full exterior refresh — new James Hardie siding, replace front porch with covered portico, new composite deck in back, soffit and fascia. Want a modern farmhouse look.',
    status: 'sent',
    confidence_score: 0.87,
    ai_notes: 'Well-defined exterior project. Budget supports premium materials (Hardie board, composite decking). Weather-dependent timeline — spring start ideal.',
    source: 'website',
    created_at: daysAgo(12),
    last_contacted_at: daysAgo(10),
  },
  {
    site_id: SITE_ID,
    name: 'Lisa Morrison',
    email: 'lisa.morrison@gmail.com',
    phone: '(548) 555-0291',
    address: '15 Downie Street',
    postal_code: 'N5A 1W7',
    city: 'Stratford',
    province: 'ON',
    project_type: 'bathroom',
    area_sqft: 55,
    timeline: '3_6_months',
    budget_band: '25k_40k',
    finish_level: 'premium',
    goals_text: 'Ensuite bathroom — freestanding soaker tub, frameless glass shower, double vanity with vessel sinks, large format porcelain tile. Going for a spa-inspired feel.',
    status: 'sent',
    confidence_score: 0.79,
    ai_notes: 'Premium ensuite with spa finishes. Budget is adequate for the scope. Plumbing relocation for freestanding tub may add complexity.',
    source: 'website',
    created_at: daysAgo(18),
    last_contacted_at: daysAgo(15),
  },
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
    ai_notes: 'Premium basement build-out. Budget supports full scope including theatre, wet bar, and guest suite. Permit required for egress window. Client signed.',
    source: 'website',
    created_at: daysAgo(25),
    last_contacted_at: daysAgo(20),
  },
];

// ─── Quote Drafts ────────────────────────────────────────────────────────────

function buildQuoteDrafts(insertedLeads) {
  const byName = Object.fromEntries(insertedLeads.map((l) => [l.name, l]));

  const jennifer = byName['Jennifer Liu'];
  const andrew = byName['Andrew Patel'];
  const lisa = byName['Lisa Morrison'];
  const robert = byName['Robert Kowalski'];

  return [
    // Jennifer Liu — kitchen, premium, ~$53k subtotal
    {
      site_id: SITE_ID,
      lead_id: jennifer.id,
      version: 1,
      line_items: [
        { description: 'Kitchen demolition and disposal', category: 'Demo/Framing', quantity: 1, unit: 'lot', unit_price: 3500, total: 3500 },
        { description: 'Structural header for wall removal', category: 'Demo/Framing', quantity: 1, unit: 'lot', unit_price: 4200, total: 4200 },
        { description: 'Electrical panel upgrade and rough-in (12 circuits)', category: 'Electrical', quantity: 1, unit: 'lot', unit_price: 6800, total: 6800 },
        { description: 'Plumbing rough-in and fixture install', category: 'Plumbing', quantity: 1, unit: 'lot', unit_price: 5400, total: 5400 },
        { description: 'Custom Shaker cabinetry — soft-close, full overlay', category: 'Finishes', quantity: 22, unit: 'lf', unit_price: 850, total: 18700 },
        { description: 'Quartz countertops (Cambria, waterfall edge island)', category: 'Finishes', quantity: 55, unit: 'sqft', unit_price: 125, total: 6875 },
        { description: 'Engineered hardwood flooring (5" white oak)', category: 'Flooring', quantity: 180, unit: 'sqft', unit_price: 18, total: 3240 },
        { description: 'Under-cabinet and pendant lighting package', category: 'Fixtures', quantity: 1, unit: 'lot', unit_price: 4800, total: 4800 },
      ],
      subtotal: 53515,
      contingency_percent: 10,
      contingency_amount: 5351.50,
      hst_percent: 13,
      hst_amount: 7652.65,
      total: 66519.15,
      deposit_percent: 15,
      deposit_required: 9977.87,
      validity_days: 30,
      assumptions: [
        'Standard 8\' ceiling height',
        'Existing electrical panel has capacity for new circuits',
        'No asbestos or lead paint present',
        'Structural engineer approval for wall removal included',
      ],
      exclusions: [
        'Appliance supply (allowance included for installation only)',
        'Window treatments',
        'Permits and engineering fees billed separately',
        'Furniture removal and storage',
      ],
      sent_at: null,
      sent_to_email: null,
      acceptance_status: null,
      accepted_at: null,
      accepted_by_name: null,
      created_at: daysAgo(5),
    },
    // Andrew Patel — exterior, premium, ~$44k subtotal
    {
      site_id: SITE_ID,
      lead_id: andrew.id,
      version: 1,
      line_items: [
        { description: 'Existing siding and trim removal', category: 'Demo/Framing', quantity: 1, unit: 'lot', unit_price: 3200, total: 3200 },
        { description: 'James Hardie HardiePlank siding — Arctic White', category: 'Finishes', quantity: 2200, unit: 'sqft', unit_price: 9.50, total: 20900 },
        { description: 'Front portico — covered entry with columns', category: 'Demo/Framing', quantity: 1, unit: 'lot', unit_price: 6500, total: 6500 },
        { description: 'Composite deck (16x20) with railing', category: 'Finishes', quantity: 320, unit: 'sqft', unit_price: 22, total: 7040 },
        { description: 'Soffit, fascia, and eavestrough replacement', category: 'Finishes', quantity: 1, unit: 'lot', unit_price: 3800, total: 3800 },
        { description: 'Exterior electrical — pot lights, outlet', category: 'Electrical', quantity: 1, unit: 'lot', unit_price: 2600, total: 2600 },
      ],
      subtotal: 44040,
      contingency_percent: 10,
      contingency_amount: 4404,
      hst_percent: 13,
      hst_amount: 6297.72,
      total: 54741.72,
      deposit_percent: 15,
      deposit_required: 8211.26,
      validity_days: 30,
      sent_at: daysAgo(10),
      sent_to_email: andrew.email,
      acceptance_status: null,
      accepted_at: null,
      accepted_by_name: null,
      assumptions: [
        'Existing sheathing in good condition (no replacement)',
        'Standard soil conditions for deck footings',
        'Work performed spring through fall (no winter premium)',
      ],
      exclusions: [
        'Landscaping and grading',
        'Permit fees',
        'Window and door replacement',
      ],
      created_at: daysAgo(11),
    },
    // Lisa Morrison — bathroom, premium, ~$29k subtotal
    {
      site_id: SITE_ID,
      lead_id: lisa.id,
      version: 1,
      line_items: [
        { description: 'Full bathroom demolition and disposal', category: 'Demo/Framing', quantity: 1, unit: 'lot', unit_price: 2200, total: 2200 },
        { description: 'Plumbing rough-in — tub relocation, dual vanity', category: 'Plumbing', quantity: 1, unit: 'lot', unit_price: 5800, total: 5800 },
        { description: 'Electrical — heated floor, exhaust fan, lighting', category: 'Electrical', quantity: 1, unit: 'lot', unit_price: 3200, total: 3200 },
        { description: 'Large format porcelain tile (floor and shower)', category: 'Finishes', quantity: 120, unit: 'sqft', unit_price: 28, total: 3360 },
        { description: 'Frameless glass shower enclosure', category: 'Fixtures', quantity: 1, unit: 'lot', unit_price: 4200, total: 4200 },
        { description: 'Freestanding soaker tub (acrylic)', category: 'Fixtures', quantity: 1, unit: 'ea', unit_price: 2800, total: 2800 },
        { description: 'Double vanity with vessel sinks and faucets', category: 'Fixtures', quantity: 1, unit: 'lot', unit_price: 4500, total: 4500 },
        { description: 'Accessories and finishing (mirror, towel bars, toilet)', category: 'Fixtures', quantity: 1, unit: 'lot', unit_price: 2900, total: 2900 },
      ],
      subtotal: 28960,
      contingency_percent: 10,
      contingency_amount: 2896,
      hst_percent: 13,
      hst_amount: 4141.28,
      total: 35997.28,
      deposit_percent: 15,
      deposit_required: 5399.59,
      validity_days: 30,
      sent_at: daysAgo(14),
      sent_to_email: lisa.email,
      acceptance_status: null,
      accepted_at: null,
      accepted_by_name: null,
      assumptions: [
        'Existing plumbing stack accessible and in good condition',
        'Standard joist depth (no structural modifications needed)',
        'Waterproofing membrane included for shower and tub areas',
      ],
      exclusions: [
        'Linen closet or cabinetry outside bathroom footprint',
        'Towels and decorative accessories',
        'Permit fees if required by municipality',
      ],
      created_at: daysAgo(16),
    },
    // Robert Kowalski — basement, premium, ~$72k subtotal
    {
      site_id: SITE_ID,
      lead_id: robert.id,
      version: 1,
      line_items: [
        { description: 'Basement framing — walls, bulkheads, soffits', category: 'Demo/Framing', quantity: 900, unit: 'sqft', unit_price: 8, total: 7200 },
        { description: 'Egress window installation (code compliant)', category: 'Demo/Framing', quantity: 1, unit: 'ea', unit_price: 4500, total: 4500 },
        { description: 'Electrical rough-in — panel, 20 circuits, theatre', category: 'Electrical', quantity: 1, unit: 'lot', unit_price: 9200, total: 9200 },
        { description: 'Plumbing — full bathroom + wet bar rough-in', category: 'Plumbing', quantity: 1, unit: 'lot', unit_price: 7800, total: 7800 },
        { description: 'HVAC — ductwork extension, 2 zones', category: 'Mechanical', quantity: 1, unit: 'lot', unit_price: 5500, total: 5500 },
        { description: 'Insulation and vapour barrier', category: 'Finishes', quantity: 900, unit: 'sqft', unit_price: 4.50, total: 4050 },
        { description: 'Drywall, taping, and painting throughout', category: 'Finishes', quantity: 900, unit: 'sqft', unit_price: 7, total: 6300 },
        { description: 'Luxury vinyl plank flooring', category: 'Flooring', quantity: 780, unit: 'sqft', unit_price: 12, total: 9360 },
        { description: 'Rubber gym flooring (exercise area)', category: 'Flooring', quantity: 120, unit: 'sqft', unit_price: 8, total: 960 },
        { description: 'Wet bar — cabinetry, sink, countertop, mini fridge', category: 'Fixtures', quantity: 1, unit: 'lot', unit_price: 6800, total: 6800 },
        { description: 'Home theatre — built-in speakers, wiring, screen wall', category: 'Fixtures', quantity: 1, unit: 'lot', unit_price: 5200, total: 5200 },
        { description: 'Full bathroom — toilet, vanity, shower, tile', category: 'Fixtures', quantity: 1, unit: 'lot', unit_price: 7400, total: 7400 },
      ],
      subtotal: 74270,
      contingency_percent: 10,
      contingency_amount: 7427,
      hst_percent: 13,
      hst_amount: 10620.61,
      total: 92317.61,
      deposit_percent: 15,
      deposit_required: 13847.64,
      validity_days: 30,
      sent_at: daysAgo(22),
      sent_to_email: robert.email,
      acceptance_status: 'accepted',
      accepted_at: daysAgo(20),
      accepted_by_name: 'Robert Kowalski',
      assumptions: [
        'Basement ceiling height minimum 7\'6" after framing',
        'No existing water infiltration or moisture issues',
        'Permit applications handled by contractor',
        'HVAC capacity supports additional finished space',
      ],
      exclusions: [
        'Audio/video equipment (speakers, projector, screen)',
        'Exercise equipment',
        'Furniture and decor',
        'Mini fridge and bar accessories',
      ],
      created_at: daysAgo(23),
    },
  ];
}

// ─── Invoices ────────────────────────────────────────────────────────────────

function buildInvoices(insertedLeads, insertedQuoteDrafts) {
  const byName = Object.fromEntries(insertedLeads.map((l) => [l.name, l]));
  const quoteByLead = Object.fromEntries(insertedQuoteDrafts.map((q) => [q.lead_id, q]));

  const robert = byName['Robert Kowalski'];
  const robertQuote = quoteByLead[robert.id];

  const andrew = byName['Andrew Patel'];
  const andrewQuote = quoteByLead[andrew.id];

  const lisa = byName['Lisa Morrison'];
  const lisaQuote = quoteByLead[lisa.id];

  return [
    // INV-2026-001 — Robert Kowalski — PAID (deposit)
    {
      site_id: SITE_ID,
      invoice_number: 'INV-2026-001',
      lead_id: robert.id,
      quote_draft_id: robertQuote.id,
      status: 'paid',
      line_items: [
        { description: 'Basement renovation — 15% deposit', category: 'Deposit', quantity: 1, unit: 'lot', unit_price: 13847.64, total: 13847.64 },
      ],
      subtotal: 13847.64,
      contingency_percent: 0,
      contingency_amount: 0,
      hst_amount: 0,
      total: 13847.64,
      amount_paid: 13847.64,
      balance_due: 0,
      deposit_required: 13847.64,
      deposit_received: true,
      customer_name: robert.name,
      customer_email: robert.email,
      customer_phone: robert.phone,
      customer_address: robert.address,
      customer_city: robert.city,
      customer_province: robert.province,
      customer_postal_code: robert.postal_code,
      issue_date: daysAgo(20).split('T')[0],
      due_date: daysAgo(0).split('T')[0],
      sent_at: daysAgo(20),
      notes: 'Deposit invoice — project start contingent on receipt.',
      created_at: daysAgo(20),
    },
    // INV-2026-002 — Andrew Patel — SENT (awaiting deposit)
    {
      site_id: SITE_ID,
      invoice_number: 'INV-2026-002',
      lead_id: andrew.id,
      quote_draft_id: andrewQuote.id,
      status: 'sent',
      line_items: [
        { description: 'Exterior renovation — 15% deposit', category: 'Deposit', quantity: 1, unit: 'lot', unit_price: 8211.26, total: 8211.26 },
      ],
      subtotal: 8211.26,
      contingency_percent: 0,
      contingency_amount: 0,
      hst_amount: 0,
      total: 8211.26,
      amount_paid: 0,
      balance_due: 8211.26,
      deposit_required: 8211.26,
      deposit_received: false,
      customer_name: andrew.name,
      customer_email: andrew.email,
      customer_phone: andrew.phone,
      customer_address: andrew.address,
      customer_city: andrew.city,
      customer_province: andrew.province,
      customer_postal_code: andrew.postal_code,
      issue_date: daysAgo(8).split('T')[0],
      due_date: daysAgo(-22).split('T')[0],
      sent_at: daysAgo(8),
      notes: 'Deposit invoice — spring start date pending payment.',
      created_at: daysAgo(8),
    },
    // INV-2026-003 — Lisa Morrison — DRAFT
    {
      site_id: SITE_ID,
      invoice_number: 'INV-2026-003',
      lead_id: lisa.id,
      quote_draft_id: lisaQuote.id,
      status: 'draft',
      line_items: [
        { description: 'Ensuite bathroom renovation — 15% deposit', category: 'Deposit', quantity: 1, unit: 'lot', unit_price: 5399.59, total: 5399.59 },
      ],
      subtotal: 5399.59,
      contingency_percent: 0,
      contingency_amount: 0,
      hst_amount: 0,
      total: 5399.59,
      amount_paid: 0,
      balance_due: 5399.59,
      deposit_required: 5399.59,
      deposit_received: false,
      customer_name: lisa.name,
      customer_email: lisa.email,
      customer_phone: lisa.phone,
      customer_address: lisa.address,
      customer_city: lisa.city,
      customer_province: lisa.province,
      customer_postal_code: lisa.postal_code,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: daysAgo(-30).split('T')[0],
      sent_at: null,
      notes: 'Deposit invoice — awaiting client confirmation before sending.',
      created_at: daysAgo(2),
    },
  ];
}

// ─── Payment ─────────────────────────────────────────────────────────────────

function buildPayments(insertedInvoices) {
  const paidInvoice = insertedInvoices.find((i) => i.status === 'paid');
  if (!paidInvoice) return [];

  return [
    {
      site_id: SITE_ID,
      invoice_id: paidInvoice.id,
      amount: paidInvoice.total,
      payment_method: 'etransfer',
      payment_date: daysAgo(19).split('T')[0],
      reference_number: 'EMT-20260208-001',
      notes: 'Deposit received via Interac e-Transfer',
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

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding demo data (site_id: ${SITE_ID})...\n`);

  // Step 1: Clear existing data (FK order)
  console.log('  Step 1/5: Clearing existing demo data...');
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

  // Step 2: Insert leads
  console.log('  Step 2/5: Inserting leads...');
  const insertedLeads = await insertRows('leads', leads);
  console.log(`    ✓ ${insertedLeads.length} leads inserted\n`);

  // Step 3: Insert quote drafts
  console.log('  Step 3/5: Inserting quote drafts...');
  const quoteDrafts = buildQuoteDrafts(insertedLeads);
  const insertedQuotes = await insertRows('quote_drafts', quoteDrafts);
  console.log(`    ✓ ${insertedQuotes.length} quote drafts inserted\n`);

  // Step 4: Insert invoices
  console.log('  Step 4/5: Inserting invoices...');
  const invoices = buildInvoices(insertedLeads, insertedQuotes);
  const insertedInvoices = await insertRows('invoices', invoices);
  console.log(`    ✓ ${insertedInvoices.length} invoices inserted\n`);

  // Step 5: Insert payment
  console.log('  Step 5/5: Inserting payments...');
  const payments = buildPayments(insertedInvoices);
  const insertedPayments = await insertRows('payments', payments);
  console.log(`    ✓ ${insertedPayments.length} payment(s) inserted\n`);

  console.log('Done! Demo data seeded successfully.');
  console.log(`  ${insertedLeads.length} leads`);
  console.log(`  ${insertedQuotes.length} quote drafts`);
  console.log(`  ${insertedInvoices.length} invoices`);
  console.log(`  ${insertedPayments.length} payment(s)`);
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
