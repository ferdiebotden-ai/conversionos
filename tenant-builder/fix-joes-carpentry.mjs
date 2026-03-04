/**
 * Fix Joe's Carpentry:
 * 1. Fix business_info (city, phone, address missing; province wrong)
 * 2. Fix service imageUrls (currently broken joescarpentry.ca/services/*.jpg URLs)
 * 3. Remove AI-generated service packages
 * 4. Fix aboutImageUrl (currently a broken external URL)
 * 5. Clear fake portfolio items
 * 6. Set ogImageUrl
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib/env-loader.mjs';

loadEnv();

const SITE_ID = 'joes-carpentry';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = 'tenant-assets';
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const WP_BASE = 'https://joescarpentry.ca/wp-content/uploads/2025/07';

async function downloadBuf(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://joescarpentry.ca/' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 3000) throw new Error(`Too small: ${buffer.length}b`);
  let ct = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  if (ct === 'image/jpg') ct = 'image/jpeg';
  return { buffer, contentType: ct };
}

// Real service images from their WordPress uploads (confirmed on service pages)
const SERVICE_IMAGES = {
  'Home Renovation': { src: `${WP_BASE}/1701464625784.jpg`, ext: 'jpg' },
  'Custom Homes':    { src: `${WP_BASE}/Bathroom-fetured-image-2-2048x1150-1.webp`, ext: 'webp' },
};
const ABOUT_SRC = `${WP_BASE}/1701464625784.jpg`;

// --- Step 1: Fix business_info ---
console.log('[1/4] Fixing business_info...');
const { data: infoRow } = await sb.from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'business_info').single();
const info = typeof infoRow.value === 'string' ? JSON.parse(infoRow.value) : infoRow.value;
info.city = 'Norwich';
info.phone = '226-796-5620';
info.address = '5 Stover St. S';
info.province = 'ON';
// email intentionally left empty (Joe's doesn't list a public email)
await sb.from('admin_settings').update({ value: info }).eq('site_id', SITE_ID).eq('key', 'business_info');
console.log('  city:', info.city, '| phone:', info.phone, '| address:', info.address);

// --- Step 2: Upload service images + about ---
console.log('[2/4] Uploading service + about images...');
const uploadedServiceUrls = {};
for (const [name, { src, ext }] of Object.entries(SERVICE_IMAGES)) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const path = `${SITE_ID}/services/${slug}.${ext}`;
  try {
    const { buffer, contentType } = await downloadBuf(src);
    const { error } = await sb.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
    if (error) throw new Error(error.message);
    uploadedServiceUrls[name] = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    console.log(`  ${name} → ${path} (${(buffer.length/1024).toFixed(0)}KB)`);
  } catch (e) {
    console.warn(`  SKIP ${name}: ${e.message}`);
  }
}

let aboutUrl = '';
try {
  const { buffer, contentType } = await downloadBuf(ABOUT_SRC);
  const path = `${SITE_ID}/about.jpg`;
  const { error } = await sb.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(error.message);
  aboutUrl = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  console.log(`  about → ${path} (${(buffer.length/1024).toFixed(0)}KB)`);
} catch (e) {
  console.warn('  SKIP about:', e.message);
}

// --- Step 3: Fix company_profile ---
console.log('[3/4] Patching company_profile...');
const { data: pRow } = await sb.from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'company_profile').single();
const profile = typeof pRow.value === 'string' ? JSON.parse(pRow.value) : pRow.value;

// Fix service imageUrls + remove AI-generated packages
let svcFixed = 0;
profile.services = (profile.services || []).map(s => {
  const fixed = { ...s, packages: [] }; // always clear hallucinated packages
  if (uploadedServiceUrls[s.name]) {
    fixed.imageUrl = uploadedServiceUrls[s.name];
    svcFixed++;
  } else {
    fixed.imageUrl = ''; // clear broken external URL
  }
  return fixed;
});
console.log(`  Services fixed: ${svcFixed}/${profile.services.length}`);

// Clear fake portfolio (joescarpentry.ca/portfolio/*.jpg don't exist)
profile.portfolio = [];
console.log('  Portfolio cleared (2 fake items removed)');

// Fix aboutImageUrl
if (aboutUrl) {
  profile.aboutImageUrl = aboutUrl;
  console.log('  aboutImageUrl set:', aboutUrl.slice(-40));
}

await sb.from('admin_settings').update({ value: profile }).eq('site_id', SITE_ID).eq('key', 'company_profile');

// --- Step 4: OG image ---
console.log('[4/4] Patching branding ogImageUrl...');
const { data: bRow } = await sb.from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'branding').single();
const branding = typeof bRow.value === 'string' ? JSON.parse(bRow.value) : bRow.value;
branding.ogImageUrl = profile.heroImageUrl || aboutUrl || '';
await sb.from('admin_settings').update({ value: branding }).eq('site_id', SITE_ID).eq('key', 'branding');
console.log('  ogImageUrl set:', branding.ogImageUrl?.slice(-40));

console.log('\n✓ Done.');
