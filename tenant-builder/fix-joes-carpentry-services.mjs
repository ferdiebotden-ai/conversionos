/**
 * Fix Joe's Carpentry services:
 * Replace the 2 generic/hallucinated services with 6 real services from their website,
 * each with confirmed descriptions and uploaded images.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib/env-loader.mjs';

loadEnv();

const SITE_ID = 'joes-carpentry';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = 'tenant-assets';
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const WP = 'https://joescarpentry.ca/wp-content/uploads/2025/07';

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

// Service definitions — descriptions from their actual service pages, images confirmed
const SERVICES = [
  {
    name: 'Kitchen Renovations',
    slug: 'kitchen-renovations',
    iconHint: 'chef-hat',
    description: 'Enhance your home with a kitchen upgrade — integrate custom cabinetry that reflects your unique style and transforms your living space into a truly comforting home.',
    imgSrc: `${WP}/1701464625784.jpg`,
    imgExt: 'jpg',
  },
  {
    name: 'Bathroom Renovations',
    slug: 'bathroom-renovations',
    iconHint: 'bath',
    description: 'From master ensuites to guest bathrooms, we provide comprehensive upgrade services — modern fixtures, custom tile work, and premium finishes tailored to your needs.',
    imgSrc: `${WP}/Bathroom-fetured-image-2-2048x1150-1.webp`,
    imgExt: 'webp',
  },
  {
    name: 'Basement Renovations',
    slug: 'basement-renovations',
    iconHint: 'home',
    description: 'Joe\'s Carpentry has been transforming basements into beautifully functional spaces for over forty years. We specialize in turning underutilized basements into vibrant areas — bedrooms, offices, or entertainment spaces — customized to your lifestyle.',
    imgSrc: `${WP}/Basements-featured-image-1.webp`,
    imgExt: 'webp',
  },
  {
    name: 'Large Renovations',
    slug: 'large-renovations',
    iconHint: 'hammer',
    description: 'Our team excels in managing the intricacies of substantial projects — from whole-house renovations to expansive remodels. From structural enhancements to interior makeovers, every large renovation is tailored to your unique vision and lifestyle.',
    imgSrc: `${WP}/large-renovations-featured-image-1.webp`,
    imgExt: 'webp',
  },
  {
    name: 'Home Additions',
    slug: 'home-additions',
    iconHint: 'building',
    description: 'Need more space? We design and build seamless additions that integrate naturally with your existing home — whether it\'s a new bedroom, expanded living area, or a full second storey.',
    imgSrc: `${WP}/additions-wp-gallery-3-768x513-1.webp`,
    imgExt: 'webp',
  },
  {
    name: 'Exterior Renovation',
    slug: 'exterior-renovation',
    iconHint: 'wrench',
    description: 'From curb appeal upgrades to full exterior transformations, we bring the same quality craftsmanship outside that we deliver indoors — siding, windows, doors, and custom exterior finishes.',
    imgSrc: `${WP}/DSC00279-768x512-1.webp`,
    imgExt: 'webp',
  },
];

// Upload all service images
console.log('Uploading service images...');
const uploadedUrls = {};
for (const svc of SERVICES) {
  const path = `${SITE_ID}/services/${svc.slug}.${svc.imgExt}`;
  try {
    const { buffer, contentType } = await downloadBuf(svc.imgSrc);
    const { error } = await sb.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
    if (error) throw new Error(error.message);
    uploadedUrls[svc.slug] = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    console.log(`  ✓ ${svc.name} → ${path} (${(buffer.length/1024).toFixed(0)}KB)`);
  } catch (e) {
    console.warn(`  ✗ SKIP ${svc.name}: ${e.message}`);
  }
}

// Build final services array
const finalServices = SERVICES.map(svc => ({
  name: svc.name,
  slug: svc.slug,
  iconHint: svc.iconHint,
  description: svc.description,
  imageUrl: uploadedUrls[svc.slug] || '',
  features: [],
  packages: [],
}));

// Patch company_profile
console.log('\nPatching company_profile.services...');
const { data: pRow } = await sb.from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'company_profile').single();
const profile = typeof pRow.value === 'string' ? JSON.parse(pRow.value) : pRow.value;
profile.services = finalServices;
await sb.from('admin_settings').update({ value: profile }).eq('site_id', SITE_ID).eq('key', 'company_profile');

console.log(`\n✓ Done. ${finalServices.length} services written:`);
finalServices.forEach(s => console.log(`  ${s.name} | img: ${!!s.imageUrl}`));
