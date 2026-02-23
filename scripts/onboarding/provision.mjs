#!/usr/bin/env node
/**
 * Provision a new tenant from scraped data.
 * Usage: node provision.mjs --site-id example-reno --data /tmp/provisioned.json --domain example.norbotsystems.com --tier accelerate
 */

import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  for (const envFile of ['.env.local', resolve(process.env.HOME, 'pipeline/scripts/.env')]) {
    try {
      const content = readFileSync(resolve(process.cwd(), envFile), 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          if (!process.env[key]) process.env[key] = match[2].trim().replace(/^["']|["']$/g, '');
        }
      }
    } catch { /* ignore */ }
  }
}

loadEnv();

const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = requiredVars.filter(v => !process.env[v] && !process.env[v === 'NEXT_PUBLIC_SUPABASE_URL' ? 'SUPABASE_URL' : 'SUPABASE_SERVICE_KEY']);
if (missingVars.length > 0) {
  console.error(`Missing required env vars: ${missingVars.join(', ')}`);
  console.error('Add to .env.local or ~/pipeline/scripts/.env');
  process.exit(1);
}

const { values: args } = parseArgs({
  options: {
    'site-id': { type: 'string' },
    data: { type: 'string' },
    domain: { type: 'string' },
    tier: { type: 'string', default: 'accelerate' },
    help: { type: 'boolean' },
  },
});

if (args.help || !args['site-id'] || !args.data || !args.domain) {
  console.log('Usage: node provision.mjs --site-id example-reno --data /tmp/provisioned.json --domain example.norbotsystems.com --tier accelerate');
  process.exit(args.help ? 0 : 1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const siteId = args['site-id'];
const domain = args.domain;
const tier = args.tier;
const data = JSON.parse(readFileSync(args.data, 'utf-8'));

console.log(`\nProvisioning tenant: ${siteId}`);
console.log(`Domain: ${domain}`);
console.log(`Tier: ${tier}`);
console.log('\u2500'.repeat(50));

// Build admin_settings rows
const businessInfo = {
  name: data.business_name || siteId,
  phone: data.phone || '',
  email: data.email || '',
  payment_email: data.email || '',
  quotes_email: data.email || '',
  website: data.website || domain,
  address: data.address || '',
  city: data.city || '',
  province: data.province || 'ON',
  postal: data.postal || '',
};

const branding = {
  tagline: data.tagline || data.hero_headline || '',
  colors: {
    primary_hex: data.primary_color_hex || '#1565C0',
    primary_oklch: data._meta?.primary_oklch || '0.45 0.18 250',
  },
  socials: [
    data.social_facebook && { label: 'Facebook', href: data.social_facebook },
    data.social_instagram && { label: 'Instagram', href: data.social_instagram },
    data.social_houzz && { label: 'Houzz', href: data.social_houzz },
    data.social_google && { label: 'Google', href: data.social_google },
  ].filter(Boolean),
};

const companyProfile = {
  principals: data.principals || '',
  founded: data.founded_year || '',
  booking: data.booking_url || '',
  serviceArea: data.service_area || `${data.city || ''}, ${data.province || 'ON'} and surrounding areas`,
  hours: data.business_hours || 'Mon-Fri 9am-5pm',
  certifications: data.certifications || [],
  testimonials: (data.testimonials || []).map(t => ({
    author: t.author,
    quote: t.quote,
    projectType: t.project_type || 'Renovation',
  })),
  aboutCopy: data.about_copy || [],
  mission: data.mission || '',
  services: (data.services || []).map(s => ({
    name: s.name,
    slug: s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    description: s.description || '',
    features: s.features || [],
    packages: (s.packages || []).map(p => ({
      name: p.name,
      startingPrice: p.starting_price,
      description: p.description,
    })),
  })),
  heroHeadline: data.hero_headline || '',
  heroSubheadline: '',
  heroImageUrl: data.hero_image_url || '',
  aboutImageUrl: data.about_image_url || '',
  logoUrl: data.logo_url || '',
  trustBadges: (data.trust_badges || []).map(b => ({ label: b.label, iconHint: 'award' })),
  whyChooseUs: data.why_choose_us || [],
  values: (data.values || []).map(v => ({ ...v, iconHint: v.iconHint || 'heart' })),
  processSteps: data.process_steps || [],
  teamMembers: (data.team_members || []).map(m => ({
    name: m.name,
    role: m.role || '',
    photoUrl: m.photo_url || '',
    bio: m.bio,
  })),
  portfolio: (data.portfolio || []).map(p => ({
    title: p.title || '',
    description: p.description || '',
    imageUrl: p.image_url || '',
    serviceType: p.service_type || '',
    location: p.location || '',
  })),
};

// Upsert admin_settings rows
const rows = [
  { key: 'business_info', value: businessInfo, description: `${siteId} business info` },
  { key: 'branding', value: branding, description: `${siteId} branding` },
  { key: 'company_profile', value: companyProfile, description: `${siteId} company profile` },
  { key: 'plan', value: { tier }, description: `${siteId} plan tier` },
];

for (const row of rows) {
  console.log(`  Upserting: ${row.key}`);
  const { error } = await supabase
    .from('admin_settings')
    .upsert({
      site_id: siteId,
      key: row.key,
      value: row.value,
      description: row.description,
    }, { onConflict: 'site_id,key' });

  if (error) {
    console.error(`  Error upserting ${row.key}: ${error.message}`);
    process.exit(1);
  }
}

// Upsert tenants table
console.log(`  Upserting tenant record`);
const { error: tenantError } = await supabase
  .from('tenants')
  .upsert({
    site_id: siteId,
    domain: domain,
    plan_tier: tier,
    active: true,
  }, { onConflict: 'site_id' });

if (tenantError) {
  console.error(`  Error upserting tenant: ${tenantError.message}`);
}

// Update proxy.ts with new domain
console.log(`\n  Updating proxy.ts...`);
const proxyPath = resolve(process.cwd(), 'src/proxy.ts');
const proxyContent = readFileSync(proxyPath, 'utf-8');

if (proxyContent.includes(`'${domain}'`)) {
  console.log(`  Domain already in proxy.ts`);
} else {
  const lines = proxyContent.split('\n');
  let insertIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('DOMAIN_TO_SITE')) {
      // Find the closing };
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].includes('};')) {
          insertIndex = j;
          break;
        }
      }
      break;
    }
  }

  if (insertIndex > 0) {
    lines.splice(insertIndex, 0, `  '${domain}': '${siteId}',`);
    writeFileSync(proxyPath, lines.join('\n'));
    console.log(`  Added domain mapping: ${domain} \u2192 ${siteId}`);
  } else {
    console.log(`  WARNING: Could not find insertion point in proxy.ts. Add manually.`);
  }
}

console.log(`\nProvisioning complete!`);
console.log(`\nNext steps:`);
console.log(`  1. Add domain ${domain} to Vercel project`);
console.log(`  2. git add -A && git commit -m "feat: add tenant ${siteId}"`);
console.log(`  3. git push (triggers Vercel deploy)`);
console.log(`  4. Run: node scripts/onboarding/verify.mjs --url https://${domain} --site-id ${siteId}`);
