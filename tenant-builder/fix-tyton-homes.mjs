/**
 * Fix Tyton Homes:
 * 1. Download + upload hero image (currently "Not available" string)
 * 2. Download + upload about image (currently "Not available" string)
 * 3. Clean socials (remove "Not available" entries)
 * 4. Update company_profile heroImageUrl + aboutImageUrl
 * 5. Set branding ogImageUrl
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib/env-loader.mjs';

loadEnv();

const SITE_ID = 'tyton-homes';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = 'tenant-assets';
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

const HERO_SRC = 'https://tytonhomes.com/wp-content/uploads/2024/11/whole-house-renovation-Tillsonburg-Tyton-Homes.jpg';
const ABOUT_SRC = 'https://tytonhomes.com/wp-content/uploads/2022/03/about-vigen.jpg';

async function downloadBuf(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://tytonhomes.com/' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 3000) throw new Error(`Too small: ${buffer.length}b`);
  let ct = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  if (ct === 'image/jpg') ct = 'image/jpeg';
  return { buffer, contentType: ct };
}

// --- Step 1: Hero ---
console.log('[1/3] Uploading hero...');
let heroUrl = '';
try {
  const { buffer, contentType } = await downloadBuf(HERO_SRC);
  const path = `${SITE_ID}/hero-kitchen.jpg`;
  const { error } = await sb.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: false });
  if (error && !error.message.includes('already exists')) throw new Error(error.message);
  // If already exists, just build the URL
  heroUrl = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  console.log(`  hero → ${path} (${(buffer.length/1024).toFixed(0)}KB)`);
} catch (e) {
  // Try upsert if upload failed
  try {
    const { buffer, contentType } = await downloadBuf(HERO_SRC);
    const path = `${SITE_ID}/hero-kitchen.jpg`;
    const { error } = await sb.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
    if (error) throw new Error(error.message);
    heroUrl = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    console.log(`  hero (upsert) → ${path}`);
  } catch (e2) {
    console.warn('  SKIP hero:', e2.message);
  }
}

// --- Step 2: About ---
console.log('[2/3] Uploading about...');
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

// --- Step 3: Patch company_profile + branding ---
console.log('[3/3] Patching company_profile + branding...');

const { data: pRow } = await sb.from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'company_profile').single();
const profile = typeof pRow.value === 'string' ? JSON.parse(pRow.value) : pRow.value;
if (heroUrl) profile.heroImageUrl = heroUrl;
if (aboutUrl) profile.aboutImageUrl = aboutUrl;
await sb.from('admin_settings').update({ value: profile }).eq('site_id', SITE_ID).eq('key', 'company_profile');
console.log('  heroImageUrl:', (heroUrl || profile.heroImageUrl)?.slice(-40));
console.log('  aboutImageUrl:', (aboutUrl || profile.aboutImageUrl)?.slice(-40));

const { data: bRow } = await sb.from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'branding').single();
const branding = typeof bRow.value === 'string' ? JSON.parse(bRow.value) : bRow.value;

// Clean socials — remove "Not available" entries
const cleanedSocials = (branding.socials || []).filter(
  s => s.href && s.href !== 'Not available' && !s.href.toLowerCase().includes('not available')
);
branding.socials = cleanedSocials;
console.log(`  Socials: ${(bRow.value?.socials?.length || branding.socials?.length + (branding.socials?.length || 0))} → ${cleanedSocials.length} (removed "Not available" entries)`);

branding.ogImageUrl = heroUrl || profile.heroImageUrl || '';
await sb.from('admin_settings').update({ value: branding }).eq('site_id', SITE_ID).eq('key', 'branding');
console.log('  ogImageUrl set:', branding.ogImageUrl?.slice(-40));

console.log('\n✓ Done.');
