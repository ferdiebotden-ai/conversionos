/**
 * Fix Caliber Contracting:
 * 1. Download real kitchen hero from GoDaddy CDN, upload to Supabase (replacing base64 blob)
 * 2. Download + upload service images for all 6 services
 * 3. Update company_profile (heroImageUrl, service imageUrls)
 * 4. Set branding.ogImageUrl
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib/env-loader.mjs';

loadEnv();

const SITE_ID = 'caliber-contracting';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = 'tenant-assets';
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CDN = 'https://img1.wsimg.com/isteam/ip/d28d43c4-c949-43ec-a1be-9c746f630e81';

async function downloadBuf(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(25000),
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://calibercontracting.ca/' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 3000) throw new Error(`Too small: ${buffer.length}b`);
  let ct = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  if (ct === 'image/jpg') ct = 'image/jpeg';
  return { buffer, contentType: ct };
}

// Hero: flagship walnut rangehood kitchen from homepage
const HERO_SRC = `${CDN}/blob-a08b132.png/:/cr=t:0%25,l:0%25,w:100%25,h:100%25/rs=w:1920,m`;

// Service images — one per service type, selected from their gallery
const SERVICE_SOURCES = {
  'Whole Home Renovations':         `${CDN}/327157306_884219149588359_2136542902195650454_.jpg/:/rs=w:1920,m`,
  'Custom Home Builds':             `${CDN}/281163127_1086464905241403_9088035709351051540.jpg/:/rs=w:1920,m`,
  'Accessory Dwelling Units (ADUs)':`${CDN}/325951700_1548086989031188_756812669654012598.webp/:/rs=w:1920,m`,
  'Home Additions':                 `${CDN}/327779431_146731371528073_6949479658942018468.webp/:/rs=w:1920,m`,
  'Kitchen Renovations':            `${CDN}/284270204_5202195969859586_5729470168803050738.jpg/:/rs=w:1920,m`,
  'Bathroom Remodeling':            `${CDN}/269679988_137428401999160_5906456938359400120_.jpg/:/rs=w:1920,m`,
};

// --- Step 1: Hero ---
console.log('[1/3] Uploading hero...');
let heroUrl = '';
try {
  const { buffer, contentType } = await downloadBuf(HERO_SRC);
  const path = `${SITE_ID}/hero-kitchen.png`;
  const { error } = await sb.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(error.message);
  heroUrl = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  console.log(`  hero → ${path} (${(buffer.length/1024).toFixed(0)}KB)`);
} catch (e) {
  console.warn('  SKIP hero:', e.message);
}

// --- Step 2: Service images ---
console.log('[2/3] Uploading service images...');
const serviceUrls = {};
for (const [name, src] of Object.entries(SERVICE_SOURCES)) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const isWebp = src.includes('.webp');
  const ext = isWebp ? 'webp' : 'jpg';
  const path = `${SITE_ID}/services/${slug}.${ext}`;
  try {
    const { buffer, contentType } = await downloadBuf(src);
    const { error } = await sb.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
    if (error) throw new Error(error.message);
    serviceUrls[name] = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    console.log(`  ${name} → ${path} (${(buffer.length/1024).toFixed(0)}KB)`);
  } catch (e) {
    console.warn(`  SKIP ${name}: ${e.message}`);
  }
}

// --- Step 3: Patch company_profile ---
console.log('[3/3] Patching company_profile...');
const { data: pRow } = await sb.from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'company_profile').single();
const profile = typeof pRow.value === 'string' ? JSON.parse(pRow.value) : pRow.value;

if (heroUrl) profile.heroImageUrl = heroUrl;

let svcUpdated = 0;
profile.services = (profile.services || []).map(s => {
  if (serviceUrls[s.name]) { svcUpdated++; return { ...s, imageUrl: serviceUrls[s.name] }; }
  return s;
});
console.log(`  Services with images: ${svcUpdated}/${profile.services.length}`);

await sb.from('admin_settings').update({ value: profile }).eq('site_id', SITE_ID).eq('key', 'company_profile');

// Patch branding OG + ogImageUrl
const { data: bRow } = await sb.from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'branding').single();
const branding = typeof bRow.value === 'string' ? JSON.parse(bRow.value) : bRow.value;
branding.ogImageUrl = heroUrl || profile.heroImageUrl || '';
await sb.from('admin_settings').update({ value: branding }).eq('site_id', SITE_ID).eq('key', 'branding');
console.log('  ogImageUrl set:', branding.ogImageUrl?.slice(-40));

console.log('\n✓ Done.');
