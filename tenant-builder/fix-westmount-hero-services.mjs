/**
 * Fix Westmount Craftsmen — hero + missing services:
 * 1. Update hero to 3rd kitchen (portfolio/7.jpg = Greenwood Kitchen, Cambridge)
 * 2. Download + upload flooring service image (Kiwanis Main Floor photo)
 * 3. Download + upload windows service image (Gentek product photo)
 * 4. Append Flooring Renovation + Windows & Doors to company_profile.services
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib/env-loader.mjs';

loadEnv();

const SITE_ID = 'westmount-craftsmen';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = 'tenant-assets';
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

async function downloadBuf(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.westmountcraftsmen.com/' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 5000) throw new Error(`Too small: ${buffer.length}b`);
  let ct = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  if (ct === 'image/jpg') ct = 'image/jpeg';
  return { buffer, contentType: ct };
}

const WP = 'https://www.westmountcraftsmen.com/wp-content/uploads';

// --- Step 1: Update hero to Greenwood Kitchen (portfolio/7.jpg) ---
const KITCHEN_HERO = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${SITE_ID}/portfolio/7.jpg`;
console.log('[1/3] Updating hero to Greenwood Kitchen (portfolio/7.jpg)...');

// --- Step 2: Upload service images ---
console.log('[2/3] Uploading service images...');

// Flooring: Kiwanis Main Floor Renovation photo #10 (shows finished hardwood)
const FLOORING_SRC = `${WP}/2025/02/Kiwanis-Main-Floor-Renovation-Kitchener_10.jpg`;
// Windows: Gentek product photo from their windows page
const WINDOWS_SRC = `${WP}/2023/02/Gentek-windows-products-2023.jpg`;

let flooringUrl = '';
try {
  const { buffer, contentType } = await downloadBuf(FLOORING_SRC);
  const path = `${SITE_ID}/services/flooring-renovation.jpg`;
  const { error } = await sb.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(error.message);
  flooringUrl = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  console.log(`  flooring → ${path} (${(buffer.length/1024).toFixed(0)}KB)`);
} catch (e) {
  console.warn('  SKIP flooring:', e.message);
}

let windowsUrl = '';
try {
  const { buffer, contentType } = await downloadBuf(WINDOWS_SRC);
  const path = `${SITE_ID}/services/windows-and-doors.jpg`;
  const { error } = await sb.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(error.message);
  windowsUrl = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  console.log(`  windows → ${path} (${(buffer.length/1024).toFixed(0)}KB)`);
} catch (e) {
  console.warn('  SKIP windows:', e.message);
}

// --- Step 3: Patch company_profile ---
console.log('[3/3] Patching company_profile...');
const { data: pRow } = await sb.from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'company_profile').single();
const profile = typeof pRow.value === 'string' ? JSON.parse(pRow.value) : pRow.value;

profile.heroImageUrl = KITCHEN_HERO;

// Append the 2 missing services (only if not already present)
const existingNames = new Set(profile.services.map(s => s.name));

if (!existingNames.has('Flooring Renovation')) {
  profile.services.push({
    name: 'Flooring Renovation',
    slug: 'flooring-renovation',
    iconHint: 'layers',
    description: 'We install countless hardwood flooring options, including traditional hardwood planks and engineered hardwoods, transforming your home\'s foundation and dramatically improving its aesthetic and overall value.',
    imageUrl: flooringUrl,
    features: [],
    packages: [],
  });
  console.log('  + Flooring Renovation added');
}

if (!existingNames.has('Windows & Doors')) {
  profile.services.push({
    name: 'Windows & Doors',
    slug: 'windows-and-doors',
    iconHint: 'home',
    description: 'We install Gentek 400 series windows — high-quality, energy-efficient windows with a certified lifetime warranty — keeping your home comfortable, quiet, and efficient year-round.',
    imageUrl: windowsUrl,
    features: [],
    packages: [],
  });
  console.log('  + Windows & Doors added');
}

console.log(`  Total services: ${profile.services.length}`);

await sb.from('admin_settings').update({ value: profile }).eq('site_id', SITE_ID).eq('key', 'company_profile');

// Update branding ogImageUrl to match new hero
const { data: bRow } = await sb.from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'branding').single();
const branding = typeof bRow.value === 'string' ? JSON.parse(bRow.value) : bRow.value;
branding.ogImageUrl = KITCHEN_HERO;
await sb.from('admin_settings').update({ value: branding }).eq('site_id', SITE_ID).eq('key', 'branding');

console.log('\n✓ Done. Hero:', KITCHEN_HERO.slice(-25));
