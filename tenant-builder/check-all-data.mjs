/**
 * Full data check for all 4 patched tenants.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib/env-loader.mjs';

loadEnv();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tenants = [
  { siteId: 'mccarty-squared-inc', name: 'McCarty Squared' },
  { siteId: 'bl-renovations', name: 'BL Renovations' },
  { siteId: 'ccr-renovations', name: 'CCR Renovations' },
  { siteId: 'md-construction', name: 'MD Construction' },
];

for (const { siteId, name } of tenants) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${name} (${siteId})`);
  console.log('='.repeat(60));

  const { data } = await sb
    .from('admin_settings')
    .select('key, value')
    .eq('site_id', siteId);

  for (const row of (data || [])) {
    const val = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    if (row.key === 'branding') {
      console.log(`\n[branding]`);
      console.log(`  logoUrl: ${val.logoUrl ? '✅ ' + val.logoUrl.slice(0, 70) : '❌ missing'}`);
      console.log(`  heroImageUrl: ${val.heroImageUrl ? '✅ ' + val.heroImageUrl.slice(0, 70) : '⚠️  missing'}`);
      console.log(`  primaryColor: ${val.primaryColor || '⚠️  missing'}`);
      console.log(`  faviconUrl: ${val.faviconUrl ? '✅' : '⚠️  missing'}`);
    } else if (row.key === 'company_profile') {
      const portfolio = val.portfolio || [];
      const services = val.services || [];
      console.log(`\n[company_profile]`);
      console.log(`  Portfolio: ${portfolio.length} items`);
      portfolio.forEach((p, i) => {
        const imgOk = p.imageUrl && p.imageUrl.includes('supabase');
        console.log(`    [${i}] ${p.title?.slice(0, 40)} | ${p.serviceType} | img: ${imgOk ? '✅' : '❌ ' + (p.imageUrl || 'none')}`);
      });
      console.log(`  Services: ${services.length} items`);
      services.forEach((s, i) => {
        const imgOk = s.imageUrl && s.imageUrl.includes('supabase');
        console.log(`    [${i}] ${s.name?.slice(0, 30)} | img: ${imgOk ? '✅' : '⚠️  ' + (s.imageUrl || 'none')}`);
      });
    }
  }
}
console.log('\n');
