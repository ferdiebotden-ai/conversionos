#!/usr/bin/env node
/**
 * Create ConversionOS Demo Tenant
 *
 * Copies admin_settings from the conversionos base platform to the demo tenant,
 * creates the tenants table row, and seeds sample leads.
 *
 * The demo tenant (site_id=demo) is Ferdie's testing sandbox — mirrors the
 * base platform branding exactly.
 *
 * Usage: node scripts/sample-data/create-demo-tenant.mjs
 * Requires: .env.local with Supabase credentials
 */

import { createClient } from '@supabase/supabase-js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = resolve(__dirname, '../..');

const SOURCE_SITE_ID = 'conversionos';
const TARGET_SITE_ID = 'demo';
const DOMAIN = 'conversionos-demo.norbotsystems.com';

// Load env
const envPath = resolve(DEMO_ROOT, '.env.local');
const { readFileSync } = await import('fs');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^(?:export\s+)?(\w+)=(.*)$/);
  if (match) {
    const [, key, val] = match;
    if (!process.env[key]) {
      process.env[key] = val.replace(/^["']|["']$/g, '');
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log(`Creating demo tenant (${TARGET_SITE_ID}) from ${SOURCE_SITE_ID}...\n`);

  // ── 1. Copy admin_settings ──────────────────────────────────────────────
  console.log('1. Copying admin_settings...');

  // Check if demo already has settings
  const { data: existingSettings } = await supabase
    .from('admin_settings')
    .select('key')
    .eq('site_id', TARGET_SITE_ID);

  if (existingSettings && existingSettings.length > 0) {
    console.log(`   Demo already has ${existingSettings.length} admin_settings — skipping`);
  } else {
    // Fetch all conversionos settings
    const { data: sourceSettings, error: settingsErr } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('site_id', SOURCE_SITE_ID);

    if (settingsErr) throw new Error(`Failed to fetch source settings: ${settingsErr.message}`);
    if (!sourceSettings || sourceSettings.length === 0) {
      throw new Error('No admin_settings found for conversionos');
    }

    // Copy with new site_id (strip id to let Supabase auto-generate)
    const demoSettings = sourceSettings.map(s => {
      const { id, created_at, updated_at, ...rest } = s;
      return { ...rest, site_id: TARGET_SITE_ID };
    });

    const { error: insertErr } = await supabase
      .from('admin_settings')
      .insert(demoSettings);

    if (insertErr) throw new Error(`Failed to insert demo settings: ${insertErr.message}`);
    console.log(`   Copied ${demoSettings.length} admin_settings rows`);
  }

  // ── 2. Create tenants row ───────────────────────────────────────────────
  console.log('2. Creating tenants row...');

  const { data: existingTenant } = await supabase
    .from('tenants')
    .select('site_id')
    .eq('site_id', TARGET_SITE_ID)
    .limit(1);

  if (existingTenant && existingTenant.length > 0) {
    console.log('   Tenant row already exists — skipping');
  } else {
    const { error: tenantErr } = await supabase
      .from('tenants')
      .insert({
        site_id: TARGET_SITE_ID,
        domain: DOMAIN,
        plan_tier: 'accelerate',
        active: true,
      });

    if (tenantErr) throw new Error(`Failed to create tenant: ${tenantErr.message}`);
    console.log(`   Created tenant: ${TARGET_SITE_ID} → ${DOMAIN}`);
  }

  // ── 3. Seed sample leads ────────────────────────────────────────────────
  console.log('3. Seeding sample leads...');

  const { seedSampleLeads } = await import(
    resolve(DEMO_ROOT, 'tenant-builder/provision/seed-sample-leads.mjs')
  );

  const result = await seedSampleLeads(TARGET_SITE_ID, { supabase });
  if (result.seeded) {
    console.log(`   Seeded: ${JSON.stringify(result.counts)}`);
  } else {
    console.log(`   Skipped: ${result.reason}`);
  }

  // ── 4. Verify ───────────────────────────────────────────────────────────
  console.log('\n4. Verifying...');

  const { data: settingsCount } = await supabase
    .from('admin_settings')
    .select('key')
    .eq('site_id', TARGET_SITE_ID);
  console.log(`   admin_settings: ${settingsCount?.length ?? 0} rows`);

  const { data: leadsCount } = await supabase
    .from('leads')
    .select('name,status')
    .eq('site_id', TARGET_SITE_ID);
  console.log(`   leads: ${leadsCount?.length ?? 0} rows`);
  for (const lead of leadsCount ?? []) {
    console.log(`     - ${lead.name} (${lead.status})`);
  }

  console.log(`\nDemo tenant created at https://${DOMAIN}`);
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
