import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://ktpfyangnmpwufghgasx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0cGZ5YW5nbm1wd3VmZ2hnYXN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQyNDE0MSwiZXhwIjoyMDg2MDAwMTQxfQ.AzUJvxmU1-x4nW_cBVzVi-DHNChc104zYen1hFQ_hVM'
);

async function check(siteId) {
  const { data } = await sb.from('admin_settings').select('value').eq('site_id', siteId).eq('key', 'company_profile').single();
  if (!data) { console.log(siteId, '- NO DATA'); return; }
  const val = data.value;
  const portfolio = val.portfolio || [];
  console.log(`\n${siteId} - portfolio count: ${portfolio.length}`);
  if (portfolio[0]) {
    const keys = Object.keys(portfolio[0]);
    console.log('  item keys:', keys.join(', '));
    console.log('  has serviceType:', keys.includes('serviceType'));
    console.log('  has category:', keys.includes('category'));
    console.log('  has location:', keys.includes('location'));
    console.log('  first item:', JSON.stringify(portfolio[0]).slice(0, 120));
  }
}

await Promise.all([
  check('mccarty-squared-inc'),
  check('bl-renovations'),
  check('ccr-renovations'),
  check('md-construction'),
]);
