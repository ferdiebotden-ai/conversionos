/**
 * Fix Go Hard Corporation:
 * 1. Service images — use slider photos that match each service by filename
 * 2. OG image — set branding.ogImageUrl from the existing hero
 * 3. Portfolio descriptions — clear them (titles are generic room-type only,
 *    populated separately via upgrade-tenant-gallery.mjs)
 *
 * Portfolio upload is handled by upgrade-tenant-gallery.mjs.
 * This script handles service images + OG fix.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib/env-loader.mjs';

loadEnv();

const SITE_ID = 'go-hard-corporation';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = 'tenant-assets';
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Service images — selected from their homepage slider by filename context.
// Filename clearly identifies the subject; no AI guessing required.
const SERVICE_SOURCES = {
  'Kitchen Renovation':   'https://images.squarespace-cdn.com/content/v1/5cd1ad36d745622317de8329/ca5ccaab-a295-4302-a2c8-5b0e1566ee52/kitchengohard.jpg',
  'Bathroom Renovation':  'https://images.squarespace-cdn.com/content/v1/5cd1ad36d745622317de8329/1760648561115-G1B4ZP8SKBKY69Y72IKT/bathroomremodel-kwcontractor.png',
  'Home Additions':       'https://images.squarespace-cdn.com/content/v1/5cd1ad36d745622317de8329/a27289ca-778e-4a0b-ae32-f47cf4dd50b6/homeaddition-cambridge.jpg',
  'Exterior Renovations': 'https://images.squarespace-cdn.com/content/v1/5cd1ad36d745622317de8329/1760648880148-NB0EHN8FKEG57RFXK1RA/deckbuildgohardcorp.jpg',
};

async function downloadBuf(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.gohardcorp.com/' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 5000) throw new Error(`Too small: ${buffer.length}b`);
  let ct = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  if (ct === 'image/jpg') ct = 'image/jpeg';
  return { buffer, contentType: ct };
}

// --- Step 1: Upload service images ---
console.log('\n[1/2] Uploading service images...');
const serviceUrls = {};
for (const [name, src] of Object.entries(SERVICE_SOURCES)) {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '');
  const ext = src.includes('.png') ? 'png' : src.includes('.webp') ? 'webp' : 'jpg';
  const storagePath = `${SITE_ID}/services/${slug}.${ext}`;
  try {
    const { buffer, contentType } = await downloadBuf(src);
    const { error } = await sb.storage.from(BUCKET).upload(storagePath, buffer, { contentType, upsert: true });
    if (error) throw new Error(error.message);
    const url = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
    serviceUrls[name] = url;
    console.log(`  ${name} → ${storagePath} (${(buffer.length/1024).toFixed(0)}KB)`);
  } catch (e) {
    console.warn(`  SKIP ${name}: ${e.message}`);
  }
}

// --- Step 2: Patch company_profile (service imageUrls + clear portfolio descriptions) ---
console.log('\n[2/2] Patching company_profile...');
const { data: row } = await sb.from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'company_profile').single();
const profile = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;

// Service images
let svcUpdated = 0;
profile.services = (profile.services || []).map(s => {
  if (serviceUrls[s.name]) { svcUpdated++; return { ...s, imageUrl: serviceUrls[s.name] }; }
  return s;
});
console.log(`  Services with images: ${svcUpdated}/${profile.services.length}`);

// Portfolio — clear descriptions (titles already generic from gallery JSON)
if (Array.isArray(profile.portfolio)) {
  profile.portfolio = profile.portfolio.map(p => ({ ...p, description: '' }));
  console.log(`  Portfolio descriptions cleared: ${profile.portfolio.length} items`);
}

await sb.from('admin_settings').update({ value: profile }).eq('site_id', SITE_ID).eq('key', 'company_profile');

// OG image — set to existing heroImageUrl
const { data: bRow } = await sb.from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'branding').single();
const branding = typeof bRow.value === 'string' ? JSON.parse(bRow.value) : bRow.value;
branding.ogImageUrl = profile.heroImageUrl || '';
await sb.from('admin_settings').update({ value: branding }).eq('site_id', SITE_ID).eq('key', 'branding');
console.log('  ogImageUrl set:', branding.ogImageUrl?.slice(-30));

console.log('\n✓ Done.');
