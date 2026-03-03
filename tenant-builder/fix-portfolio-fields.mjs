/**
 * Fix missing serviceType + location fields in portfolio items for
 * mccarty-squared-inc and bl-renovations.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib/env-loader.mjs';

loadEnv();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPortfolio(siteId, defaultLocation) {
  const { data, error } = await sb
    .from('admin_settings')
    .select('value')
    .eq('site_id', siteId)
    .eq('key', 'company_profile')
    .single();

  if (error || !data) {
    console.error(`${siteId}: failed to fetch`, error?.message);
    return;
  }

  const val = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
  const portfolio = val.portfolio || [];

  if (!portfolio.length) {
    console.log(`${siteId}: no portfolio items`);
    return;
  }

  // Add serviceType (from category) and location to each item
  const fixed = portfolio.map(item => ({
    ...item,
    serviceType: item.serviceType || item.category || 'General Renovation',
    location: item.location || defaultLocation,
  }));

  const updated = { ...val, portfolio: fixed };

  const { error: updateErr } = await sb
    .from('admin_settings')
    .update({ value: updated })
    .eq('site_id', siteId)
    .eq('key', 'company_profile');

  if (updateErr) {
    console.error(`${siteId}: failed to update`, updateErr.message);
  } else {
    console.log(`✅ ${siteId}: fixed ${fixed.length} portfolio items`);
    console.log('   Sample:', JSON.stringify(fixed[0]).slice(0, 100));
  }
}

await fixPortfolio('mccarty-squared-inc', 'London, ON');
await fixPortfolio('bl-renovations', 'Owen Sound, ON');
console.log('\nDone.');
