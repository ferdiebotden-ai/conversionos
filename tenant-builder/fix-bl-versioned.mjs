/**
 * Upload BL Renovations portfolio images with versioned filenames (v2)
 * to force Next.js image optimizer cache to bust.
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

// Same gallery paths as before
const galleryPaths = [
  '/-_-/res/875a6450-6a08-4173-8684-6181be325296/images/files/875a6450-6a08-4173-8684-6181be325296/19813b9e-3174-4e7e-bf4b-033227648d7c/1600-2000/fdc532e634a7cf2ab723678cf370491c7c4e2a4b',
  '/-_-/res/875a6450-6a08-4173-8684-6181be325296/images/files/875a6450-6a08-4173-8684-6181be325296/be62b881-e71a-4b31-bf45-80b3e4d06ef4/2000-1333/b8cf8e94077459b0eaeb47702787d3896374c82a',
  '/-_-/res/875a6450-6a08-4173-8684-6181be325296/images/files/875a6450-6a08-4173-8684-6181be325296/0e055741-1116-4cc9-8b29-98e00ad911af/1500-2000/43eb0fbcb359f3e18fe7f148b062aa9e2be82493',
  '/-_-/res/875a6450-6a08-4173-8684-6181be325296/images/files/875a6450-6a08-4173-8684-6181be325296/82d7a3e8-af7b-4ae1-8951-c2410f3b6e58/2000-1333/8e4c04918dff6673778a05a0e60bcc7911d73338',
  '/-_-/res/875a6450-6a08-4173-8684-6181be325296/images/files/875a6450-6a08-4173-8684-6181be325296/1a218da9-c4de-4fc2-9c6c-00b6df25075c/1500-2000/c1a10b746b565d60702419fca7e5cc181a7d3fb8',
  '/-_-/res/875a6450-6a08-4173-8684-6181be325296/images/files/875a6450-6a08-4173-8684-6181be325296/1c3ded33-1663-4f62-a1e4-82dbc4b1a67b/1500-2000/04c79f3fbbcf5ecb6af5d9a6e2812b9c349c6ee4',
];

async function uploadImage(externalUrl, storagePath) {
  const res = await fetch(externalUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': 'https://www.blrenos.ca/',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  let contentType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  if (contentType === 'image/jpg') contentType = 'image/jpeg';
  const { error } = await sb.storage.from('tenant-assets').upload(storagePath, buffer, { contentType, upsert: true });
  if (error) throw new Error(error.message);
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tenant-assets/${storagePath}`;
}

// Upload with new versioned names (portfolio/v2_0.jpg etc.)
const uploadedUrls = [];
for (let i = 0; i < galleryPaths.length; i++) {
  const storagePath = `${SITE_ID}/portfolio/photo_${i}.jpg`; // new filename — busts Next.js cache
  console.log(`[${i}] Uploading → ${storagePath}`);
  try {
    const url = await uploadImage(`${BASE_URL}${galleryPaths[i]}`, storagePath);
    uploadedUrls.push(url);
    console.log(`  ✅ ${url.slice(-50)}`);
  } catch (e) {
    console.error(`  ❌ ${e.message}`);
    uploadedUrls.push(null);
  }
}

// Fetch and update portfolio
const { data: cp } = await sb.from('admin_settings').select('value').eq('site_id', SITE_ID).eq('key', 'company_profile').single();
const val = cp.value;
const portfolio = val.portfolio.map((item, i) => ({
  ...item,
  imageUrl: uploadedUrls[i] || item.imageUrl,
}));
await sb.from('admin_settings').update({ value: { ...val, portfolio } }).eq('site_id', SITE_ID).eq('key', 'company_profile');
console.log('✅ Portfolio updated');

// Update services with new URLs
const { data: cp2 } = await sb.from('admin_settings').select('value').eq('site_id', SITE_ID).eq('key', 'company_profile').single();
const serviceMap = {
  'kitchen remodels': uploadedUrls[1],
  'bathroom renovations': uploadedUrls[0],
  'basement finishing': uploadedUrls[2],
  'flooring & tile installations': uploadedUrls[3],
  'fixture installations': uploadedUrls[4],
};
const services = cp2.value.services.map(s => ({
  ...s,
  imageUrl: serviceMap[s.name.toLowerCase()] || uploadedUrls[0] || s.imageUrl,
}));
await sb.from('admin_settings').update({ value: { ...cp2.value, services } }).eq('site_id', SITE_ID).eq('key', 'company_profile');
console.log('✅ Services updated');

// Update hero
const { data: br } = await sb.from('admin_settings').select('value').eq('site_id', SITE_ID).eq('key', 'branding').single();
await sb.from('admin_settings').update({ value: { ...br.value, heroImageUrl: uploadedUrls[0] } }).eq('site_id', SITE_ID).eq('key', 'branding');
console.log('✅ Hero updated');
console.log('\nDone — URLs are now unique, Next.js cache will be bypassed.');
