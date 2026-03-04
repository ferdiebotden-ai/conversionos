/**
 * Fix Brouwer hero CDN cache issue.
 * The kitchen photo was uploaded to hero.jpg but Supabase CDN cached the old logo.
 * Uploading to a new filename (hero-kitchen.jpg) bypasses the cache entirely.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib/env-loader.mjs';

loadEnv();

const SITE_ID = 'brouwer-home-renovations';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = 'tenant-assets';

// Kitchen hero from the brouwerhomerenovations.ca kitchen-renovations page background
const HERO_SRC = 'https://lirp.cdn-website.com/e540a56a/dms3rep/multi/opt/shutterstock_1210676974-1920w.jpeg';
const NEW_PATH = `${SITE_ID}/hero-kitchen.jpg`;

console.log('Downloading kitchen hero...');
const res = await fetch(HERO_SRC, {
  signal: AbortSignal.timeout(20000),
  headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.brouwerhomerenovations.ca/' },
});
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const buffer = Buffer.from(await res.arrayBuffer());
let ct = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
if (ct === 'image/jpg') ct = 'image/jpeg';
console.log(`  ${buffer.length} bytes (${ct})`);

console.log(`Uploading to ${NEW_PATH}...`);
const { error: upErr } = await sb.storage.from(BUCKET).upload(NEW_PATH, buffer, { contentType: ct, upsert: false });
if (upErr) throw new Error(`Upload: ${upErr.message}`);

const heroUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${NEW_PATH}`;
console.log('  URL:', heroUrl);

// Update company_profile.heroImageUrl
const { data: pRow } = await sb.from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'company_profile').single();
const profile = typeof pRow.value === 'string' ? JSON.parse(pRow.value) : pRow.value;
profile.heroImageUrl = heroUrl;
await sb.from('admin_settings').update({ value: profile }).eq('site_id', SITE_ID).eq('key', 'company_profile');

// Update branding.ogImageUrl
const { data: bRow } = await sb.from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'branding').single();
const branding = typeof bRow.value === 'string' ? JSON.parse(bRow.value) : bRow.value;
branding.ogImageUrl = heroUrl;
await sb.from('admin_settings').update({ value: branding }).eq('site_id', SITE_ID).eq('key', 'branding');

console.log('✓ heroImageUrl and ogImageUrl updated to hero-kitchen.jpg');
