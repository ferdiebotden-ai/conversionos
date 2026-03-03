#!/usr/bin/env node

/**
 * Fix CCR Renovations content in Supabase.
 * Updates company_profile with correct heroSubheadline and whyChooseSubtitle.
 */

import { loadEnv } from './lib/env-loader.mjs';
import { getSupabase } from './lib/supabase-client.mjs';

loadEnv();

const SITE_ID = 'ccr-renovations';

async function main() {
  const supabase = getSupabase();

  // Read current company_profile
  const { data, error: readError } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('site_id', SITE_ID)
    .eq('key', 'company_profile')
    .single();

  if (readError) {
    console.error('Failed to read company_profile:', readError.message);
    process.exit(1);
  }

  const merged = {
    ...data.value,
    heroSubheadline: 'Excellence, Integrity, Dependability.',
    whyChooseSubtitle: 'Specialists in all aspects of Durham Home Renovations and Remodelling.',
  };

  const { error: updateError } = await supabase
    .from('admin_settings')
    .update({ value: merged })
    .eq('site_id', SITE_ID)
    .eq('key', 'company_profile');

  if (updateError) {
    console.error('Failed to update company_profile:', updateError.message);
    process.exit(1);
  }

  console.log(`Updated company_profile for ${SITE_ID}:`);
  console.log(`  heroSubheadline: "${merged.heroSubheadline}"`);
  console.log(`  whyChooseSubtitle: "${merged.whyChooseSubtitle}"`);
}

main();
