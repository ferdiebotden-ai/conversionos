/**
 * Fix Brouwer services — they were filtered out during provisioning because
 * descriptions were empty (filterServices requires description.length >= 10).
 * Descriptions are now confirmed from each service page on the original site.
 * Service images already uploaded by fix-brouwer-data.mjs.
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib/env-loader.mjs';

loadEnv();

const SITE_ID = 'brouwer-home-renovations';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tenant-assets/${SITE_ID}/services`;

// Descriptions verbatim from each service page (brouwerhomerenovations.ca/<slug>)
// Truncated at 280 chars to match what the site displays in the hero paragraph.
const SERVICES = [
  {
    name: 'Basement Remodeling',
    slug: 'basement-remodeling',
    description: 'Brouwer Home Renovations is trusted most for basement remodeling in Cambridge, Waterloo, and Burlington. Our team helps homeowners make the most of their lower-level space with expert design, quality finishes, and reliable service that adds comfort and value to every home.',
    iconHint: 'layers',
    imageUrl: `${STORAGE_BASE}/basement-remodeling.jpg`,
  },
  {
    name: 'Kitchen Renovations',
    slug: 'kitchen-renovations',
    description: 'We specialize in kitchen renovations for homeowners in Cambridge, Waterloo, and Burlington. From modern upgrades to complete redesigns, our team delivers expert craftsmanship, custom layouts, and quality finishes to create a kitchen that works for your lifestyle and adds long-term value to your home.',
    iconHint: 'chef-hat',
    imageUrl: `${STORAGE_BASE}/kitchen-renovations.jpg`,
  },
  {
    name: 'Bathroom Renovations',
    slug: 'bathroom-renovations',
    description: 'Brouwer Home Renovations provides bathroom renovations across Cambridge, Waterloo, and Burlington. Whether it\'s a small refresh or a complete remodel, our team delivers expert design, high-quality finishes, and reliable service to create bathrooms that are both functional and stylish.',
    iconHint: 'droplets',
    imageUrl: `${STORAGE_BASE}/bathroom-renovations.jpg`,
  },
  {
    name: 'Painting',
    slug: 'painting',
    description: 'Our painting services in Cambridge, Waterloo, and Burlington deliver precise, high-quality results for both interiors and exteriors. At Brouwer Home Renovations, we take care of every detail, providing a smooth finish that refreshes your space, protects your surfaces, and adds lasting value.',
    iconHint: 'paintbrush',
    imageUrl: `${STORAGE_BASE}/painting.jpg`,
  },
  {
    name: 'Flooring Installation',
    slug: 'flooring-installation',
    description: 'We provide professional flooring installation services in Cambridge, Waterloo, and Burlington, delivering durable, stylish, and expertly finished floors that bring lasting value to your home. At Brouwer Home Renovations, we focus on precision and detail to ensure every floor is installed right.',
    iconHint: 'grid',
    imageUrl: `${STORAGE_BASE}/flooring-installation.jpg`,
  },
  {
    name: 'Home Repair',
    slug: 'home-repair',
    description: 'We provide reliable home repair services in Cambridge, Waterloo, and Burlington to keep your home safe, functional, and well-maintained. At Brouwer Home Renovations, we handle repairs with precision and care, ensuring long-lasting results and peace of mind for every homeowner.',
    iconHint: 'wrench',
    imageUrl: `${STORAGE_BASE}/home-repair.jpg`,
  },
  {
    name: 'Tiling',
    slug: 'tiling',
    description: 'We offer professional tiling services in Cambridge, Waterloo, and Burlington, delivering precise installation and a polished finish for any space in your home. At Brouwer Home Renovations, we focus on detail and durability, ensuring every tile project enhances both the look and function of your space.',
    iconHint: 'square',
    imageUrl: `${STORAGE_BASE}/tiling.jpg`,
  },
];

const { data: row } = await sb
  .from('admin_settings').select('value')
  .eq('site_id', SITE_ID).eq('key', 'company_profile').single();

const profile = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;

profile.services = SERVICES.map(s => ({
  name: s.name,
  slug: s.slug,
  description: s.description,
  features: [],
  packages: [],
  iconHint: s.iconHint,
  imageUrl: s.imageUrl,
}));

const { error } = await sb
  .from('admin_settings').update({ value: profile })
  .eq('site_id', SITE_ID).eq('key', 'company_profile');

if (error) { console.error('Failed:', error.message); process.exit(1); }

console.log(`✓ Services written: ${profile.services.length} items`);
profile.services.forEach(s => console.log(`  - ${s.name} (${s.imageUrl.slice(-30)})`));
