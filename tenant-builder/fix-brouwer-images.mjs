/**
 * Fix Brouwer Home Renovations images.
 * The scraper used the logo as the hero image (same CDN path).
 * This script:
 *   1. Downloads the real hero (outdoor deck background from their homepage)
 *   2. Uploads to Storage, overwriting hero.jpg
 *   3. Downloads a kitchen photo for the about page
 *   4. Uploads as about.jpg
 *   5. Updates company_profile (heroImageUrl, aboutImageUrl)
 *   6. Updates branding (ogImageUrl)
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib/env-loader.mjs';

loadEnv();

const SITE_ID = 'brouwer-home-renovations';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'tenant-assets';

const HERO_URL = 'https://lirp.cdn-website.com/e540a56a/dms3rep/multi/opt/shutterstock_1995066977-1920w.jpg';
const ABOUT_URL = 'https://lirp.cdn-website.com/e540a56a/dms3rep/multi/opt/IMG_9255-1920w.jpg';

const HERO_STORAGE_PATH = `${SITE_ID}/hero.jpg`;
const ABOUT_STORAGE_PATH = `${SITE_ID}/about.jpg`;

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function downloadImage(url) {
  console.log(`  Downloading: ${url.slice(-50)}`);
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': 'https://www.brouwerhomerenovations.ca/',
      'Accept': 'image/*,*/*',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 5000) throw new Error(`Too small: ${buffer.length} bytes`);
  let contentType = res.headers.get('content-type') || 'image/jpeg';
  if (contentType === 'image/jpg') contentType = 'image/jpeg';
  contentType = contentType.split(';')[0].trim();
  console.log(`  ${buffer.length} bytes (${contentType})`);
  return { buffer, contentType };
}

async function uploadImage(storagePath, buffer, contentType) {
  const { error } = await sb.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
  console.log(`  Uploaded → ${publicUrl}`);
  return publicUrl;
}

// Step 1 — Upload hero
console.log('\n[1/4] Uploading hero image...');
const hero = await downloadImage(HERO_URL);
const heroPublicUrl = await uploadImage(HERO_STORAGE_PATH, hero.buffer, hero.contentType);

// Step 2 — Upload about image
console.log('\n[2/4] Uploading about image...');
const about = await downloadImage(ABOUT_URL);
const aboutPublicUrl = await uploadImage(ABOUT_STORAGE_PATH, about.buffer, about.contentType);

// Step 3 — Patch company_profile
console.log('\n[3/4] Patching company_profile...');
const { data: profileRow, error: readErr } = await sb
  .from('admin_settings')
  .select('value')
  .eq('site_id', SITE_ID)
  .eq('key', 'company_profile')
  .single();

if (readErr || !profileRow?.value) {
  console.error('Failed to read company_profile:', readErr?.message);
  process.exit(1);
}

const profile = typeof profileRow.value === 'string'
  ? JSON.parse(profileRow.value)
  : profileRow.value;

profile.heroImageUrl = heroPublicUrl;
profile.aboutImageUrl = aboutPublicUrl;

const { error: profileErr } = await sb
  .from('admin_settings')
  .update({ value: profile })
  .eq('site_id', SITE_ID)
  .eq('key', 'company_profile');

if (profileErr) {
  console.error('Failed to update company_profile:', profileErr.message);
  process.exit(1);
}
console.log('  heroImageUrl →', heroPublicUrl);
console.log('  aboutImageUrl →', aboutPublicUrl);

// Step 4 — Patch branding ogImageUrl
console.log('\n[4/4] Patching branding.ogImageUrl...');
const { data: brandingRow, error: brandReadErr } = await sb
  .from('admin_settings')
  .select('value')
  .eq('site_id', SITE_ID)
  .eq('key', 'branding')
  .single();

if (brandReadErr || !brandingRow?.value) {
  console.error('Failed to read branding:', brandReadErr?.message);
  process.exit(1);
}

const branding = typeof brandingRow.value === 'string'
  ? JSON.parse(brandingRow.value)
  : brandingRow.value;

branding.ogImageUrl = heroPublicUrl;

const { error: brandErr } = await sb
  .from('admin_settings')
  .update({ value: branding })
  .eq('site_id', SITE_ID)
  .eq('key', 'branding');

if (brandErr) {
  console.error('Failed to update branding:', brandErr.message);
  process.exit(1);
}
console.log('  ogImageUrl →', heroPublicUrl);

console.log('\n✓ Done. Brouwer hero, about, and OG images fixed.');
