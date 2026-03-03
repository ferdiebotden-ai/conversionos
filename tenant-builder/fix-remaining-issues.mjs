/**
 * Fix remaining issues:
 * 1. MD Construction: 3 new portfolio items have undefined serviceType
 * 2. BL Renovations: services have no images (reuse matching portfolio images)
 * 3. BL Renovations: set heroImageUrl from a portfolio image
 * 4. McCarty Squared: set heroImageUrl from kitchen portfolio image
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib/env-loader.mjs';

loadEnv();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── MD Construction: fix undefined serviceType ────────────────────────────────
async function fixMdConstruction() {
  const { data } = await sb
    .from('admin_settings')
    .select('value')
    .eq('site_id', 'md-construction')
    .eq('key', 'company_profile')
    .single();

  const val = data.value;
  const portfolio = val.portfolio.map(item => ({
    ...item,
    serviceType: item.serviceType && item.serviceType !== 'undefined'
      ? item.serviceType
      : item.category || 'Home Renovations',
  }));

  await sb
    .from('admin_settings')
    .update({ value: { ...val, portfolio } })
    .eq('site_id', 'md-construction')
    .eq('key', 'company_profile');

  console.log('✅ MD Construction: fixed portfolio serviceType for all items');
  portfolio.forEach((p, i) => console.log(`   [${i}] ${p.title.slice(0, 40)} → ${p.serviceType}`));
}

// ── BL Renovations: add service images + hero ────────────────────────────────
async function fixBlRenovations() {
  const { data: cp } = await sb
    .from('admin_settings')
    .select('value')
    .eq('site_id', 'bl-renovations')
    .eq('key', 'company_profile')
    .single();

  const val = cp.value;
  const portfolio = val.portfolio || [];

  // Map portfolio images to services by category match
  const portfolioByCategory = {};
  for (const p of portfolio) {
    const cat = (p.serviceType || p.category || '').toLowerCase();
    if (!portfolioByCategory[cat]) portfolioByCategory[cat] = p.imageUrl;
  }

  const serviceMap = {
    'kitchen remodels': portfolioByCategory['kitchen renovations'],
    'bathroom renovations': portfolioByCategory['bathroom renovations'],
    'basement finishing': portfolioByCategory['basement finishing'],
    'flooring & tile installations': portfolioByCategory['flooring & tile'],
    'fixture installations': portfolioByCategory['bathroom renovations'], // best match
  };

  const services = val.services.map(s => ({
    ...s,
    imageUrl: serviceMap[s.name.toLowerCase()] || portfolio[0]?.imageUrl || '',
  }));

  await sb
    .from('admin_settings')
    .update({ value: { ...val, services } })
    .eq('site_id', 'bl-renovations')
    .eq('key', 'company_profile');

  console.log('\n✅ BL Renovations: patched service images');
  services.forEach((s, i) => console.log(`   [${i}] ${s.name} → ${s.imageUrl ? '✅' : '❌'}`));

  // Set heroImageUrl from first portfolio image (kitchen or bathroom)
  const heroImg = portfolioByCategory['kitchen renovations'] || portfolio[0]?.imageUrl;

  const { data: br } = await sb
    .from('admin_settings')
    .select('value')
    .eq('site_id', 'bl-renovations')
    .eq('key', 'branding')
    .single();

  await sb
    .from('admin_settings')
    .update({ value: { ...br.value, heroImageUrl: heroImg } })
    .eq('site_id', 'bl-renovations')
    .eq('key', 'branding');

  console.log(`   heroImageUrl set: ${heroImg?.slice(0, 70)}`);
}

// ── McCarty Squared: set heroImageUrl from kitchen portfolio image ─────────────
async function fixMcCartyHero() {
  const { data: cp } = await sb
    .from('admin_settings')
    .select('value')
    .eq('site_id', 'mccarty-squared-inc')
    .eq('key', 'company_profile')
    .single();

  // Use kitchen image as hero
  const kitchen = cp.value.portfolio.find(p =>
    (p.serviceType || p.category || '').toLowerCase().includes('kitchen')
  );

  if (!kitchen?.imageUrl) {
    console.log('⚠️  McCarty: no kitchen image found for hero');
    return;
  }

  const { data: br } = await sb
    .from('admin_settings')
    .select('value')
    .eq('site_id', 'mccarty-squared-inc')
    .eq('key', 'branding')
    .single();

  await sb
    .from('admin_settings')
    .update({ value: { ...br.value, heroImageUrl: kitchen.imageUrl } })
    .eq('site_id', 'mccarty-squared-inc')
    .eq('key', 'branding');

  console.log(`\n✅ McCarty Squared: heroImageUrl set to kitchen portfolio image`);
  console.log(`   ${kitchen.imageUrl.slice(0, 80)}`);
}

await fixMdConstruction();
await fixBlRenovations();
await fixMcCartyHero();

console.log('\nAll fixes applied.');
