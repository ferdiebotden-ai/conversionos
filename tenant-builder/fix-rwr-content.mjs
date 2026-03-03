#!/usr/bin/env node
/**
 * fix-rwr-content.mjs
 *
 * One-shot patch for red-white-reno company_profile in Supabase:
 *  - Narrows serviceArea to "Stratford and surrounding area"
 *  - Clears whyChooseSubtitle (was AI-flavoured copy)
 *  - Clears certifications (unverifiable "Certified Business" claim + RenoMark block)
 *  - Removes unverifiable trust metrics (google_rating, years_in_business, projects_completed)
 *  - Keeps licensed_insured: true (safe standard claim)
 *
 * Usage: node tenant-builder/fix-rwr-content.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib/env-loader.mjs';

await loadEnv();

const SITE_ID = 'red-white-reno';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function patchRow(key, newValue) {
  const { data: existing, error: fetchErr } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('site_id', SITE_ID)
    .eq('key', key)
    .single();

  if (fetchErr || !existing) {
    console.error(`  ✗ Could not fetch ${key}:`, fetchErr?.message ?? 'not found');
    return false;
  }

  const merged = { ...existing.value, ...newValue };

  const { error: upsertErr } = await supabase
    .from('admin_settings')
    .update({ value: merged })
    .eq('site_id', SITE_ID)
    .eq('key', key);

  if (upsertErr) {
    console.error(`  ✗ Failed to patch ${key}:`, upsertErr.message);
    return false;
  }

  return true;
}

console.log(`Patching admin_settings for site_id="${SITE_ID}"...\n`);

// Patch company_profile
const profilePatches = {
  serviceArea: 'Stratford and surrounding area',
  whyChooseSubtitle: '',
  certifications: [],
  trustMetrics: {
    licensed_insured: true,
  },
};

const ok = await patchRow('company_profile', profilePatches);
if (ok) {
  console.log('  ✓ company_profile patched');
  console.log('    serviceArea       → "Stratford and surrounding area"');
  console.log('    whyChooseSubtitle → "" (cleared)');
  console.log('    certifications    → [] (cleared)');
  console.log('    trustMetrics      → { licensed_insured: true } (unverifiable stats removed)');
} else {
  process.exit(1);
}

console.log('\nDone.');
