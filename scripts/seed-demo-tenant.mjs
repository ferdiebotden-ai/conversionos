#!/usr/bin/env node
/**
 * Seed the `demo` tenant admin_settings with ConversionOS branding.
 * Idempotent — uses upsert (ON CONFLICT DO UPDATE).
 *
 * Usage: node scripts/seed-demo-tenant.mjs
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

const settings = [
  {
    site_id: SITE_ID,
    key: 'business_info',
    value: {
      name: 'ConversionOS Demo',
      tagline: 'AI-Powered Renovation Platform',
      phone: '(519) 378-8973',
      email: 'demo@norbotsystems.com',
      website: 'conversionos-demo.norbotsystems.com',
      address: '1 Ontario Street',
      city: 'Stratford',
      province: 'ON',
      postal: 'N5A 3H1',
      payment_email: 'demo@norbotsystems.com',
      quotes_email: 'demo@norbotsystems.com',
    },
  },
  {
    site_id: SITE_ID,
    key: 'branding',
    value: {
      tagline: 'AI-Powered Renovation Platform',
      logoUrl: '/brand/logo-full/norbot-full-teal.svg',
      colors: {
        primary_hex: '#0D9488',
        primary_oklch: '0.588 0.108 180',
      },
      socials: [
        { label: 'LinkedIn', href: 'https://www.linkedin.com/company/norbot-systems' },
        { label: 'GitHub', href: 'https://github.com/norbot-systems' },
      ],
    },
  },
  {
    site_id: SITE_ID,
    key: 'company_profile',
    value: {
      principals: 'NorBot Systems',
      founded: '2025',
      serviceArea: 'Ontario — all regions',
      mission: 'Make renovation planning faster, more transparent, and more accessible for every Ontario homeowner.',
      certifications: [],
      hours: 'Mon-Fri 9am-5pm',
      logoUrl: '/brand/logo-full/norbot-full-teal.svg',
      heroHeadline: 'See Your Renovation Before It Begins',
      heroSubheadline: 'Upload a photo. Choose a style. Get AI-generated design concepts and a ballpark estimate — in minutes, not days.',
      heroImageUrl: '',
      aboutImageUrl: '',
      aboutCopy: [
        'ConversionOS is an AI-powered platform that gives Ontario homeowners instant renovation visualizations and cost estimates. Upload a photo of your space, choose a style, and see your transformation in minutes — not days.',
        'Built by NorBot Systems in Stratford, Ontario, ConversionOS connects homeowners with qualified local contractors through intelligent matching, transparent pricing, and AI-generated design concepts that make the renovation journey easier from first idea to final build.',
      ],
      testimonials: [
        { author: 'Sarah M., Kitchener', quote: 'I uploaded a photo of my dated kitchen and within minutes had four stunning design concepts. The cost estimate was spot-on with the quotes I later received. This is the future of renovation planning.', projectType: 'Kitchen Renovation' },
        { author: 'James & Linda R., London', quote: 'We could not decide between modern and farmhouse for our basement. The AI visualizer showed us both styles in our actual space. Saved us weeks of back-and-forth with designers.', projectType: 'Basement Finishing' },
        { author: 'Priya K., Hamilton', quote: 'As a first-time homeowner, I had no idea what a bathroom reno would cost. The AI estimate gave me a realistic range before I even called a contractor. Incredibly helpful.', projectType: 'Bathroom Renovation' },
      ],
      trustBadges: [
        { label: 'Ontario-Based', iconHint: 'map-pin' },
        { label: 'AI-Powered', iconHint: 'sparkles' },
        { label: 'Privacy-First', iconHint: 'shield' },
      ],
      trust_metrics: {
        google_rating: '4.9',
        projects_completed: '50+',
        years_in_business: '1',
        licensed_insured: true,
      },
      whyChooseUs: [
        { title: 'AI-Powered Instant Estimates', description: 'Get a realistic cost range for your renovation in minutes. Our AI analyses your photos, room dimensions, and material choices against real Ontario pricing data.' },
        { title: 'See Before You Build', description: 'Upload a photo of your space and watch AI transform it into four unique design concepts. Compare styles side-by-side before committing to a single dollar.' },
        { title: 'Trusted Ontario Platform', description: 'Built in Stratford for Ontario homeowners. Local pricing data, regional building knowledge, and connections to qualified contractors in your area.' },
      ],
      processSteps: [
        { title: 'Upload a Photo', description: 'Snap a picture of your room with your phone or upload an existing photo. Our AI analyses the space automatically.' },
        { title: 'Get AI Design Concepts', description: 'Choose a style and receive four unique AI-generated visualizations of your transformed space in under a minute.' },
        { title: 'Receive Your Estimate', description: 'Get a detailed cost range based on Ontario pricing data, then connect with a qualified local contractor to bring it to life.' },
      ],
      services: [
        { name: 'Kitchen Renovation', slug: 'kitchen-renovation', description: 'From layout redesign to finish selection, visualize your dream kitchen with AI-generated concepts and get a ballpark estimate before calling a contractor.', iconHint: 'chef-hat' },
        { name: 'Bathroom Renovation', slug: 'bathroom-renovation', description: 'See spa-inspired, modern, or classic bathroom transformations applied to your actual space. Compare styles side-by-side with cost ranges.', iconHint: 'bath' },
        { name: 'Basement Finishing', slug: 'basement-finishing', description: 'Turn your unfinished basement into an entertainment hub, home office, or rental suite. AI shows you the possibilities with real cost data.', iconHint: 'layers' },
        { name: 'Whole-Home Renovation', slug: 'whole-home-renovation', description: 'Planning a major transformation? Get room-by-room AI visualizations and a comprehensive cost overview for your entire project.', iconHint: 'home' },
      ],
      values: [],
      teamMembers: [],
      portfolio: [],
    },
  },
  {
    site_id: SITE_ID,
    key: 'plan',
    value: { tier: 'accelerate' },
  },
];

async function upsert(row) {
  // Try PATCH (update existing) first, then POST (insert) if not found
  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_settings?site_id=eq.${row.site_id}&key=eq.${row.key}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ value: row.value }),
    }
  );

  if (patchRes.ok) {
    const updated = await patchRes.json();
    if (updated.length > 0) {
      console.log(`  ✓ ${row.key} (updated)`);
      return;
    }
  }

  // Row doesn't exist — insert
  const postRes = await fetch(`${SUPABASE_URL}/rest/v1/admin_settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(row),
  });

  if (!postRes.ok) {
    const text = await postRes.text();
    throw new Error(`Failed to upsert ${row.key}: ${postRes.status} ${text}`);
  }

  console.log(`  ✓ ${row.key} (inserted)`);
}

async function main() {
  console.log(`Seeding demo tenant (site_id: ${SITE_ID})...\n`);

  for (const row of settings) {
    await upsert(row);
  }

  console.log('\nDone! Demo tenant seeded with ConversionOS branding.');
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
