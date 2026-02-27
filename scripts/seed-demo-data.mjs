#!/usr/bin/env node
/**
 * Seed the `demo` tenant with 2 realistic leads for sales demonstrations.
 * Idempotent — clears existing demo data before inserting.
 *
 * Lead 1: Sarah Mitchell — Kitchen, Premium, draft_ready (full pipeline minus invoice)
 * Lead 2: Robert Kowalski — Basement, Premium, won (quote accepted, deposit paid)
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
  // Lead 1: Sarah Mitchell — Kitchen, Premium, draft_ready
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
    status: 'draft_ready',
    confidence_score: 0.88,
    ai_notes: 'High-intent lead. Clear scope, premium finish level, realistic budget for the work described. Strong candidate for quote generation.',
    source: 'website',
    intake_raw_input: 'Just got off the phone with Sarah Mitchell from Waterloo. She wants a full kitchen reno — open up the wall to the dining room, big island with waterfall quartz, custom Shaker cabinets, new lighting throughout. Budget is around $50-60k. Looking to start in 2-3 months. Premium finishes.',
    intake_method: 'voice_dictation',
    uploaded_photos: [
      '/images/teaser/before-kitchen.jpg',
    ],
    generated_concepts: [
      '/images/demo/kitchen-modern.png',
      '/images/demo/kitchen-farmhouse.png',
      '/images/demo/hero-kitchen.png',
      '/images/demo/craftsmanship-detail.png',
    ],
    last_contacted_at: null,
    created_at: daysAgo(2),
  },
  // Lead 2: Robert Kowalski — Basement, Premium, won
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
    intake_raw_input: null,
    intake_method: null,
    uploaded_photos: [
      '/images/demo/before-basement.png',
    ],
    generated_concepts: [
      '/images/demo/basement-entertainment.png',
      '/images/demo/basement-walkout.png',
      '/images/demo/basement-bar.png',
      '/images/demo/basement-theatre.png',
    ],
    created_at: daysAgo(25),
    last_contacted_at: daysAgo(20),
  },
];

// ─── Chat Sessions ───────────────────────────────────────────────────────────

function buildChatSessions(insertedLeads) {
  const byName = Object.fromEntries(insertedLeads.map((l) => [l.name, l]));
  const sarah = byName['Sarah Mitchell'];
  const robert = byName['Robert Kowalski'];

  return [
    // Sarah Mitchell — 10-message kitchen discovery chat
    {
      site_id: SITE_ID,
      email: sarah.email,
      state: 'completed',
      device_type: 'desktop',
      started_from: 'general',
      extracted_data: {
        leadId: sarah.id,
        projectType: 'kitchen',
      },
      messages: [
        { role: 'assistant', content: 'Welcome! I\'m Emma, your renovation assistant. How can I help you today?' },
        { role: 'user', content: 'Hi Emma, I\'m looking to renovate my kitchen. It\'s pretty dated — original from when the house was built in 1998.' },
        { role: 'assistant', content: 'A kitchen renovation is a great investment! I\'d love to help you explore your options. Can you tell me a bit about what you have in mind? Are you thinking of a full gut renovation or more of a cosmetic refresh?' },
        { role: 'user', content: 'Definitely a full reno. I want to open up the wall between the kitchen and the dining room to create an open concept layout. I\'ve been dreaming about a big island with a waterfall quartz countertop.' },
        { role: 'assistant', content: 'That sounds like a beautiful transformation! An open concept layout with a waterfall island is very popular right now. What about cabinetry — do you have a style in mind? And are you thinking about upgrading the lighting as well?' },
        { role: 'user', content: 'Yes! Custom Shaker cabinets, soft-close everything. For lighting I want a mix of under-cabinet LEDs and some statement pendants over the island. I really want it to feel high-end.' },
        { role: 'assistant', content: 'You clearly have great taste! Shaker cabinetry with soft-close is a timeless choice, and the layered lighting with under-cabinet LEDs plus pendants will really make the space shine. Do you have a sense of your budget range for this project?' },
        { role: 'user', content: 'We\'re thinking around $50-60k. Is that realistic for what I\'m describing? The kitchen is about 185 square feet.' },
        { role: 'assistant', content: 'For a 185 square foot kitchen with premium finishes — wall removal, custom cabinetry, quartz waterfall island, and upgraded lighting — $50-60k is a realistic range. The structural work for the wall removal will need an engineering assessment, but that\'s very doable. When were you hoping to get started?' },
        { role: 'user', content: 'Ideally in the next couple of months. We want to enjoy it for summer entertaining! Can you connect me with someone to get a proper quote?' },
      ],
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: daysAgo(2),
    },
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
        { role: 'assistant', content: 'Welcome! I\'m Emma, your renovation assistant. How can I help you today?' },
        { role: 'user', content: 'Hi there. I\'ve got an unfinished basement — about 900 square feet — and I want to turn it into something special.' },
        { role: 'assistant', content: 'That\'s a fantastic amount of space to work with! An unfinished 900 sqft basement opens up so many possibilities. What\'s your vision for the space?' },
        { role: 'user', content: 'I want the full package. A home theatre area with built-in speakers and a proper screen wall, a wet bar for entertaining, and a guest bedroom with its own bathroom.' },
        { role: 'assistant', content: 'That sounds like an incredible entertainment space! A home theatre, wet bar, and guest suite — you\'ll essentially be adding a whole new living area to your home. Are you thinking about an exercise area too? That\'s a popular addition with this kind of build-out.' },
        { role: 'user', content: 'Actually yes, I was thinking about that too. A small exercise area with rubber flooring in one corner. Maybe 120 square feet or so. And I want premium finishes throughout — this isn\'t a budget build.' },
        { role: 'assistant', content: 'Premium finishes throughout will really elevate the space. For the guest bedroom, are you planning to add an egress window? That\'s typically required by building code for a bedroom in a basement, and it also brings in natural light.' },
        { role: 'user', content: 'Yes, egress window is a must. I know we\'ll need permits for that. What about the wet bar — I\'m thinking proper cabinetry, a sink, countertop, and space for a mini fridge.' },
        { role: 'assistant', content: 'A full wet bar with cabinetry, sink, countertop, and mini fridge alcove is a great call for entertaining. We\'d need to run plumbing for the sink and the bathroom, plus extend your HVAC to heat and cool the finished space properly. Have you thought about flooring for the main areas?' },
        { role: 'user', content: 'Luxury vinyl plank for most of it — I\'ve heard it\'s the best option for basements because of moisture. Rubber for the gym area like I mentioned. What kind of budget should I be thinking about for all of this?' },
        { role: 'assistant', content: 'LVP is the perfect choice for basements — it\'s waterproof, durable, and looks beautiful. For a 900 sqft premium basement build-out with theatre, wet bar, guest suite with egress window, full bathroom, exercise area, and high-end finishes, you\'re likely looking at $70-90k range. That includes framing, insulation, electrical, plumbing, HVAC extension, and all the finishing work. Does that align with your expectations?' },
        { role: 'user', content: 'That\'s right in line with what I was expecting. We want to get started within the next couple of months. Can we move forward with a detailed quote?' },
      ],
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: daysAgo(25),
    },
  ];
}

// ─── Quote Drafts ────────────────────────────────────────────────────────────

function buildQuoteDrafts(insertedLeads) {
  const byName = Object.fromEntries(insertedLeads.map((l) => [l.name, l]));
  const sarah = byName['Sarah Mitchell'];
  const robert = byName['Robert Kowalski'];

  // Sarah Mitchell — Kitchen, 8 line items
  // Subtotal: 3500 + 5200 + 6800 + 18700 + 6875 + 3330 + 4200 + 3000 = 51605
  const sarahSubtotal = 51605;
  const sarahContingency = Math.round(sarahSubtotal * 0.10 * 100) / 100;
  const sarahHst = Math.round((sarahSubtotal + sarahContingency) * 0.13 * 100) / 100;
  const sarahTotal = Math.round((sarahSubtotal + sarahContingency + sarahHst) * 100) / 100;
  const sarahDeposit = Math.round(sarahTotal * 0.15 * 100) / 100;

  // Robert Kowalski — Basement, 10 line items
  // Subtotal: 7200 + 4500 + 7200 + 10800 + 9200 + 9360 + 8800 + 5800 + 7200 + 4200 = 74260
  const robertItems = [
    { description: 'Basement framing — walls, bulkheads, soffits', category: 'Demo/Framing', quantity: 900, unit: 'sqft', unit_price: 8, total: 7200 },
    { description: 'Spray foam insulation and vapour barrier', category: 'Insulation', quantity: 900, unit: 'sqft', unit_price: 5, total: 4500 },
    { description: 'Drywall, taping, and sanding throughout', category: 'Finishes', quantity: 900, unit: 'sqft', unit_price: 8, total: 7200 },
    { description: 'Electrical rough-in — panel, 22 circuits, theatre wiring', category: 'Electrical', quantity: 1, unit: 'lot', unit_price: 10800, total: 10800 },
    { description: 'Plumbing — full bathroom + wet bar sink rough-in and fixtures', category: 'Plumbing', quantity: 1, unit: 'lot', unit_price: 9200, total: 9200 },
    { description: 'Luxury vinyl plank flooring (main areas)', category: 'Flooring', quantity: 780, unit: 'sqft', unit_price: 12, total: 9360 },
    { description: 'Wet bar — custom cabinetry, quartz countertop, sink, mini fridge alcove', category: 'Fixtures', quantity: 1, unit: 'lot', unit_price: 8800, total: 8800 },
    { description: 'Interior trim, doors, and baseboards', category: 'Finishes', quantity: 1, unit: 'lot', unit_price: 5800, total: 5800 },
    { description: 'HVAC ductwork extension — 2 zones', category: 'Mechanical', quantity: 1, unit: 'lot', unit_price: 7200, total: 7200 },
    { description: 'Prime and paint — walls, ceilings, trim (2 coats)', category: 'Finishes', quantity: 1, unit: 'lot', unit_price: 4200, total: 4200 },
  ];
  const robertSubtotal = robertItems.reduce((sum, i) => sum + i.total, 0); // 74260
  const robertContingency = Math.round(robertSubtotal * 0.10 * 100) / 100;
  const robertHst = Math.round((robertSubtotal + robertContingency) * 0.13 * 100) / 100;
  const robertTotal = Math.round((robertSubtotal + robertContingency + robertHst) * 100) / 100;
  const robertDeposit = Math.round(robertTotal * 0.15 * 100) / 100;

  return [
    // Sarah Mitchell — kitchen, premium, draft_ready (NOT sent)
    {
      site_id: SITE_ID,
      lead_id: sarah.id,
      version: 1,
      line_items: [
        { description: 'Kitchen demolition and disposal', category: 'Demo/Framing', quantity: 1, unit: 'lot', unit_price: 3500, total: 3500 },
        { description: 'Plumbing rough-in and fixture installation', category: 'Plumbing', quantity: 1, unit: 'lot', unit_price: 5200, total: 5200 },
        { description: 'Electrical panel upgrade and rough-in (14 circuits)', category: 'Electrical', quantity: 1, unit: 'lot', unit_price: 6800, total: 6800 },
        { description: 'Custom Shaker cabinetry — soft-close, full overlay', category: 'Finishes', quantity: 22, unit: 'lf', unit_price: 850, total: 18700 },
        { description: 'Quartz countertops with waterfall edge island', category: 'Finishes', quantity: 55, unit: 'sqft', unit_price: 125, total: 6875 },
        { description: 'Porcelain tile flooring (large format)', category: 'Flooring', quantity: 185, unit: 'sqft', unit_price: 18, total: 3330 },
        { description: 'Under-cabinet LED and pendant lighting package', category: 'Fixtures', quantity: 1, unit: 'lot', unit_price: 4200, total: 4200 },
        { description: 'Paint and trim — walls, ceiling, crown moulding', category: 'Finishes', quantity: 1, unit: 'lot', unit_price: 3000, total: 3000 },
      ],
      subtotal: sarahSubtotal,
      contingency_percent: 10,
      contingency_amount: sarahContingency,
      hst_percent: 13,
      hst_amount: sarahHst,
      total: sarahTotal,
      deposit_percent: 15,
      deposit_required: sarahDeposit,
      validity_days: 30,
      assumptions: [
        'Standard 8\' ceiling height',
        'Existing electrical panel has capacity for new circuits',
        'No asbestos or lead paint present',
        'Structural engineer approval for wall removal included',
      ],
      exclusions: [
        'Appliance supply (installation allowance included)',
        'Window treatments',
        'Permits and engineering fees billed separately',
        'Furniture removal and storage',
      ],
      sent_at: null,
      sent_to_email: null,
      acceptance_status: null,
      accepted_at: null,
      accepted_by_name: null,
      created_at: daysAgo(1),
    },
    // Robert Kowalski — basement, premium, sent + accepted
    {
      site_id: SITE_ID,
      lead_id: robert.id,
      version: 1,
      line_items: robertItems,
      subtotal: robertSubtotal,
      contingency_percent: 10,
      contingency_amount: robertContingency,
      hst_percent: 13,
      hst_amount: robertHst,
      total: robertTotal,
      deposit_percent: 15,
      deposit_required: robertDeposit,
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
        'Exercise equipment and rubber gym flooring',
        'Furniture and decor',
        'Mini fridge and bar accessories',
      ],
      created_at: daysAgo(23),
    },
  ];
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

function buildInvoices(insertedLeads, insertedQuoteDrafts) {
  const byName = Object.fromEntries(insertedLeads.map((l) => [l.name, l]));
  const quoteByLead = Object.fromEntries(insertedQuoteDrafts.map((q) => [q.lead_id, q]));

  const robert = byName['Robert Kowalski'];
  const robertQuote = quoteByLead[robert.id];

  return [
    // Robert Kowalski — deposit invoice, PAID
    {
      site_id: SITE_ID,
      invoice_number: 'INV-2026-001',
      lead_id: robert.id,
      quote_draft_id: robertQuote.id,
      status: 'paid',
      line_items: [
        { description: 'Basement renovation — 15% deposit', category: 'Deposit', quantity: 1, unit: 'lot', unit_price: robertQuote.deposit_required, total: robertQuote.deposit_required },
      ],
      subtotal: robertQuote.deposit_required,
      contingency_percent: 0,
      contingency_amount: 0,
      hst_amount: 0,
      total: robertQuote.deposit_required,
      amount_paid: robertQuote.deposit_required,
      balance_due: 0,
      deposit_required: robertQuote.deposit_required,
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
  console.log('  Step 1/6: Clearing existing demo data...');
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
  console.log('  Step 2/6: Inserting leads...');
  const insertedLeads = await insertRows('leads', leads);
  console.log(`    ✓ ${insertedLeads.length} leads inserted\n`);

  // Step 3: Insert chat sessions
  console.log('  Step 3/6: Inserting chat sessions...');
  const chatSessions = buildChatSessions(insertedLeads);
  const insertedSessions = await insertRows('chat_sessions', chatSessions);
  console.log(`    ✓ ${insertedSessions.length} chat sessions inserted\n`);

  // Step 4: Insert quote drafts
  console.log('  Step 4/6: Inserting quote drafts...');
  const quoteDrafts = buildQuoteDrafts(insertedLeads);
  const insertedQuotes = await insertRows('quote_drafts', quoteDrafts);
  console.log(`    ✓ ${insertedQuotes.length} quote drafts inserted\n`);

  // Step 5: Insert invoice
  console.log('  Step 5/6: Inserting invoices...');
  const invoices = buildInvoices(insertedLeads, insertedQuotes);
  const insertedInvoices = await insertRows('invoices', invoices);
  console.log(`    ✓ ${insertedInvoices.length} invoice(s) inserted\n`);

  // Step 6: Insert payment
  console.log('  Step 6/6: Inserting payments...');
  const payments = buildPayments(insertedInvoices);
  const insertedPayments = await insertRows('payments', payments);
  console.log(`    ✓ ${insertedPayments.length} payment(s) inserted\n`);

  console.log('Done! Demo data seeded successfully.');
  console.log(`  ${insertedLeads.length} leads`);
  console.log(`  ${insertedSessions.length} chat sessions`);
  console.log(`  ${insertedQuotes.length} quote drafts`);
  console.log(`  ${insertedInvoices.length} invoice(s)`);
  console.log(`  ${insertedPayments.length} payment(s)`);
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
