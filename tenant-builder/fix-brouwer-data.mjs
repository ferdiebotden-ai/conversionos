/**
 * Fix Brouwer Home Renovations — data quality pass
 *
 * 1. Hero image → kitchen renovation photo (confirmed from their kitchen-renovations page)
 * 2. Service images → background images from each service page (confirmed: page title = service)
 * 3. Portfolio titles → generic room-type only (removes AI-guessed detail suffixes)
 *    Portfolio descriptions → empty (no confirmed descriptions available from the site)
 * 4. OG image → updated to match new hero
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib/env-loader.mjs';

loadEnv();

const SITE_ID = 'brouwer-home-renovations';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'tenant-assets';
const BASE_CDN = 'https://lirp.cdn-website.com/e540a56a/dms3rep/multi/opt/';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Source images (all confirmed from the original site) ---

// Hero: background image from the kitchen-renovations page — white kitchen with gold pendant
const HERO_SRC = `${BASE_CDN}shutterstock_1210676974-1920w.jpeg`;

// Service images: each is the hero background of that service's page.
// Context is confirmed: page title = service name = image subject.
const SERVICE_IMAGES = {
  'Basement Remodeling':   `${BASE_CDN}shutterstock_2275997549-1920w.jpg`,
  'Kitchen Renovations':   `${BASE_CDN}shutterstock_1210676974-1920w.jpeg`,
  'Bathroom Renovations':  `${BASE_CDN}shutterstock_1420098458-1920w.jpeg`,
  'Painting':              `${BASE_CDN}shutterstock_1588992778-1920w.jpeg`,
  'Flooring Installation': `${BASE_CDN}shutterstock_1584436756-1920w.jpeg`,
  'Home Repair':           `${BASE_CDN}shutterstock_701174023-1920w.jpeg`,
  'Tiling':                `${BASE_CDN}shutterstock_1334936153-1920w.jpeg`,
};

// Portfolio: simplified titles — remove AI-guessed detail suffixes.
// Only the room type is verifiable by visual; specific labels (e.g. "— Vanity & Mirror") are not.
const PORTFOLIO_TITLES = [
  'Bathroom Renovation',   // 0: bathroom vanity
  'Kitchen Renovation',    // 1: kitchen remodel
  'Kitchen Renovation',    // 2: kitchen tile
  'Basement Renovation',   // 3: basement living area
  'Kitchen Renovation',    // 4: kitchen with wood cabinets
  'Bathroom Renovation',   // 5: glass shower
  'Bathroom Renovation',   // 6: grey vanity
  'Flooring Installation', // 7: flooring
  'Home Renovation',       // 8: shelving/storage
  'Home Renovation',       // 9: accent wall
  'Bathroom Renovation',   // 10: mirror & lighting
  'Exterior Renovation',   // 11: siding
  'Outdoor Renovation',    // 12: deck/patio
  'Home Renovation',       // 13: fireplace
  'Basement Renovation',   // 14: basement open concept
  'Kitchen Renovation',    // 15: range hood
  'Basement Renovation',   // 16: basement complete
  'Bathroom Renovation',   // 17: double vanity
];

// ---

async function download(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': 'https://www.brouwerhomerenovations.ca/',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 5000) throw new Error(`Too small: ${buffer.length}b`);
  let ct = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  if (ct === 'image/jpg') ct = 'image/jpeg';
  return { buffer, contentType: ct };
}

async function upload(path, buffer, contentType) {
  const { error } = await sb.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

// Step 1 — Upload hero (kitchen photo)
console.log('\n[1/4] Uploading kitchen hero...');
const hero = await download(HERO_SRC);
const heroUrl = await upload(`${SITE_ID}/hero.jpg`, hero.buffer, hero.contentType);
console.log('  →', heroUrl);

// Step 2 — Upload service images
console.log('\n[2/4] Uploading service images...');
const serviceUrls = {};
for (const [name, src] of Object.entries(SERVICE_IMAGES)) {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '');
  const storagePath = `${SITE_ID}/services/${slug}.jpg`;
  try {
    const img = await download(src);
    const url = await upload(storagePath, img.buffer, img.contentType);
    serviceUrls[name] = url;
    console.log(`  ${name} → ${storagePath} (${(img.buffer.length/1024).toFixed(0)}KB)`);
  } catch (e) {
    console.warn(`  SKIP ${name}: ${e.message}`);
  }
}

// Step 3 — Patch company_profile
console.log('\n[3/4] Patching company_profile...');
const { data: profileRow } = await sb
  .from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'company_profile').single();

const profile = typeof profileRow.value === 'string'
  ? JSON.parse(profileRow.value)
  : profileRow.value;

// Update hero
profile.heroImageUrl = heroUrl;

// Update portfolio: simplify titles, clear descriptions
if (Array.isArray(profile.portfolio)) {
  profile.portfolio = profile.portfolio.map((item, i) => ({
    ...item,
    title: PORTFOLIO_TITLES[i] ?? item.title,
    description: '',  // no confirmed descriptions available
  }));
  console.log(`  Portfolio: ${profile.portfolio.length} items updated`);
}

// Update services: add image_url, leave descriptions (already empty — no confirmed text)
if (Array.isArray(profile.services)) {
  profile.services = profile.services.map(svc => ({
    ...svc,
    image_urls: serviceUrls[svc.name] ? [serviceUrls[svc.name]] : svc.image_urls,
  }));
  const withImages = profile.services.filter(s => s.image_urls?.length > 0).length;
  console.log(`  Services: ${withImages}/${profile.services.length} now have images`);
}

const { error: profileErr } = await sb
  .from('admin_settings').update({ value: profile })
  .eq('site_id', SITE_ID).eq('key', 'company_profile');
if (profileErr) { console.error('company_profile update failed:', profileErr.message); process.exit(1); }

// Step 4 — Update branding.ogImageUrl
console.log('\n[4/4] Patching branding...');
const { data: brandRow } = await sb
  .from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'branding').single();

const branding = typeof brandRow.value === 'string'
  ? JSON.parse(brandRow.value)
  : brandRow.value;

branding.ogImageUrl = heroUrl;

const { error: brandErr } = await sb
  .from('admin_settings').update({ value: branding })
  .eq('site_id', SITE_ID).eq('key', 'branding');
if (brandErr) { console.error('branding update failed:', brandErr.message); process.exit(1); }
console.log('  ogImageUrl updated');

console.log('\n✓ Done.');
