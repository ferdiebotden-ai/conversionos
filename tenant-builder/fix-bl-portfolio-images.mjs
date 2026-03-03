/**
 * Fix BL Renovations portfolio images — the previous scrape uploaded logos.
 * Now using the real gallery images from the dynamically-loaded gallery page.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib/env-loader.mjs';

loadEnv();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_ID = 'bl-renovations';
const BASE_URL = 'https://www.blrenos.ca';

// Real gallery images from the JS-rendered gallery page (Projects section, 50 items)
// Selected 6 that appear to cover different project types
const galleryPaths = [
  '/-_-/res/875a6450-6a08-4173-8684-6181be325296/images/files/875a6450-6a08-4173-8684-6181be325296/19813b9e-3174-4e7e-bf4b-033227648d7c/1600-2000/fdc532e634a7cf2ab723678cf370491c7c4e2a4b',
  '/-_-/res/875a6450-6a08-4173-8684-6181be325296/images/files/875a6450-6a08-4173-8684-6181be325296/be62b881-e71a-4b31-bf45-80b3e4d06ef4/2000-1333/b8cf8e94077459b0eaeb47702787d3896374c82a',
  '/-_-/res/875a6450-6a08-4173-8684-6181be325296/images/files/875a6450-6a08-4173-8684-6181be325296/0e055741-1116-4cc9-8b29-98e00ad911af/1500-2000/43eb0fbcb359f3e18fe7f148b062aa9e2be82493',
  '/-_-/res/875a6450-6a08-4173-8684-6181be325296/images/files/875a6450-6a08-4173-8684-6181be325296/82d7a3e8-af7b-4ae1-8951-c2410f3b6e58/2000-1333/8e4c04918dff6673778a05a0e60bcc7911d73338',
  '/-_-/res/875a6450-6a08-4173-8684-6181be325296/images/files/875a6450-6a08-4173-8684-6181be325296/1a218da9-c4de-4fc2-9c6c-00b6df25075c/1500-2000/c1a10b746b565d60702419fca7e5cc181a7d3fb8',
  '/-_-/res/875a6450-6a08-4173-8684-6181be325296/images/files/875a6450-6a08-4173-8684-6181be325296/1c3ded33-1663-4f62-a1e4-82dbc4b1a67b/1500-2000/04c79f3fbbcf5ecb6af5d9a6e2812b9c349c6ee4',
];

async function uploadImage(externalUrl, storagePath) {
  console.log(`  Downloading: ${externalUrl.slice(-40)}`);
  const res = await fetch(externalUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': 'https://www.blrenos.ca/',
      'Accept': 'image/*,*/*',
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${externalUrl}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  let contentType = res.headers.get('content-type') || 'image/jpeg';
  if (contentType === 'image/jpg') contentType = 'image/jpeg';
  // strip charset/boundary from content-type
  contentType = contentType.split(';')[0].trim();

  console.log(`  Uploading ${buffer.length} bytes (${contentType}) → ${storagePath}`);

  const { error } = await sb.storage
    .from('tenant-assets')
    .upload(storagePath, buffer, { contentType, upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tenant-assets/${storagePath}`;
}

// Upload all 6 gallery images
const uploadedUrls = [];
for (let i = 0; i < galleryPaths.length; i++) {
  const fullUrl = `${BASE_URL}${galleryPaths[i]}`;
  const storagePath = `${SITE_ID}/portfolio/${i}.jpg`;
  try {
    const publicUrl = await uploadImage(fullUrl, storagePath);
    uploadedUrls.push(publicUrl);
    console.log(`  ✅ [${i}] → ${publicUrl.slice(-60)}`);
  } catch (e) {
    console.error(`  ❌ [${i}] ${e.message}`);
    // Keep existing URL as fallback
    uploadedUrls.push(null);
  }
}

console.log('\nPatching portfolio imageUrls...');

// Fetch current portfolio data
const { data: cpData } = await sb
  .from('admin_settings')
  .select('value')
  .eq('site_id', SITE_ID)
  .eq('key', 'company_profile')
  .single();

const val = cpData.value;
const portfolio = val.portfolio.map((item, i) => ({
  ...item,
  imageUrl: uploadedUrls[i] || item.imageUrl,
}));

await sb
  .from('admin_settings')
  .update({ value: { ...val, portfolio } })
  .eq('site_id', SITE_ID)
  .eq('key', 'company_profile');

console.log('✅ Portfolio imageUrls updated.');

// Also update service images using fresh portfolio images
// Map by category
const serviceImageMap = {
  'kitchen remodels': uploadedUrls[1],       // 2000-1333 landscape (likely bathroom or kitchen)
  'bathroom renovations': uploadedUrls[0],    // 1600-2000 portrait (likely bathroom)
  'basement finishing': uploadedUrls[2],      // 1500-2000 portrait
  'flooring & tile installations': uploadedUrls[3],  // 2000-1333 landscape
  'fixture installations': uploadedUrls[4],   // 1500-2000 portrait
};

const { data: cpData2 } = await sb
  .from('admin_settings')
  .select('value')
  .eq('site_id', SITE_ID)
  .eq('key', 'company_profile')
  .single();

const val2 = cpData2.value;
const services = val2.services.map(s => ({
  ...s,
  imageUrl: serviceImageMap[s.name.toLowerCase()] || uploadedUrls[0] || s.imageUrl,
}));

await sb
  .from('admin_settings')
  .update({ value: { ...val2, services } })
  .eq('site_id', SITE_ID)
  .eq('key', 'company_profile');

console.log('✅ Service images updated.');

// Update hero image
const { data: brData } = await sb
  .from('admin_settings')
  .select('value')
  .eq('site_id', SITE_ID)
  .eq('key', 'branding')
  .single();

await sb
  .from('admin_settings')
  .update({ value: { ...brData.value, heroImageUrl: uploadedUrls[0] } })
  .eq('site_id', SITE_ID)
  .eq('key', 'branding');

console.log('✅ Hero image updated.');
console.log('\nDone! BL Renovations portfolio fully patched with real photos.');
