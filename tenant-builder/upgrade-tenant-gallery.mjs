#!/usr/bin/env node
/**
 * Upgrade a tenant's portfolio gallery with new images.
 * Downloads images from source URLs, uploads to Supabase Storage,
 * and updates the company_profile.portfolio array.
 *
 * Usage:
 *   node upgrade-tenant-gallery.mjs --site-id red-white-reno --images gallery-data.json
 */

import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv, requireEnv } from './lib/env-loader.mjs';
import { getSupabase, uploadToStorage } from './lib/supabase-client.mjs';
import * as logger from './lib/logger.mjs';

loadEnv();
requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const { values: args } = parseArgs({
  options: {
    'site-id': { type: 'string' },
    images: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    'start-index': { type: 'string', default: '0' },
    help: { type: 'boolean' },
  },
});

if (args.help || !args['site-id'] || !args.images) {
  console.log(`Usage:
  node upgrade-tenant-gallery.mjs --site-id red-white-reno --images rwr-images.json
  node upgrade-tenant-gallery.mjs --site-id bl-renovations --images bl-images.json --start-index 0 --dry-run`);
  process.exit(args.help ? 0 : 1);
}

const siteId = args['site-id'];
const dryRun = args['dry-run'];
const startIndex = parseInt(args['start-index'], 10);

// Read image data
const imageData = JSON.parse(readFileSync(resolve(args.images), 'utf-8'));
logger.info(`Loaded ${imageData.length} images for ${siteId}`);

// Get current portfolio
const sb = getSupabase();
const { data: profileRow } = await sb
  .from('admin_settings')
  .select('value')
  .eq('site_id', siteId)
  .eq('key', 'company_profile')
  .single();

if (!profileRow?.value) {
  logger.error(`No company_profile found for ${siteId}`);
  process.exit(1);
}

const profile = typeof profileRow.value === 'string' ? JSON.parse(profileRow.value) : profileRow.value;
const existingPortfolio = profile.portfolio || [];
logger.info(`Existing portfolio: ${existingPortfolio.length} items`);

// Download and upload each image
const newPortfolio = [...existingPortfolio];
let uploaded = 0;
let failed = 0;

for (let i = 0; i < imageData.length; i++) {
  const img = imageData[i];
  const idx = startIndex + existingPortfolio.length + i;
  const ext = guessExtension(img.url);
  const storagePath = `${siteId}/portfolio/${idx}.${ext}`;

  logger.info(`[${i + 1}/${imageData.length}] Downloading: ${img.title}`);

  if (dryRun) {
    logger.info(`  [DRY RUN] Would upload to ${storagePath}`);
    newPortfolio.push({
      title: img.title,
      description: img.title,
      imageUrl: `placeholder/${storagePath}`,
      serviceType: capitalizeType(img.roomType),
      location: profile.serviceArea || '',
    });
    uploaded++;
    continue;
  }

  try {
    // Download image
    const response = await fetch(img.url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConversionOS/1.0)' },
    });

    if (!response.ok) {
      logger.warn(`  HTTP ${response.status} — skipping`);
      failed++;
      continue;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1000) {
      logger.warn(`  Too small (${buffer.length} bytes) — skipping`);
      failed++;
      continue;
    }

    let contentType = response.headers.get('content-type') || `image/${ext}`;
    // Normalize image/jpg to image/jpeg (Supabase requires standard MIME types)
    if (contentType === 'image/jpg') contentType = 'image/jpeg';

    // Upload to Supabase Storage
    const publicUrl = await uploadToStorage('tenant-assets', storagePath, buffer, contentType);

    newPortfolio.push({
      title: img.title,
      description: img.title,
      imageUrl: publicUrl,
      serviceType: capitalizeType(img.roomType),
      location: profile.serviceArea || '',
    });

    uploaded++;
    logger.info(`  Uploaded: ${storagePath} (${(buffer.length / 1024).toFixed(0)}KB)`);
  } catch (e) {
    logger.warn(`  Failed: ${e.message?.slice(0, 80)}`);
    failed++;
  }
}

// Update company_profile
if (!dryRun && uploaded > 0) {
  profile.portfolio = newPortfolio;
  const { error } = await sb
    .from('admin_settings')
    .update({ value: profile })
    .eq('site_id', siteId)
    .eq('key', 'company_profile');

  if (error) {
    logger.error(`Failed to update company_profile: ${error.message}`);
    process.exit(1);
  }

  logger.info(`Updated company_profile.portfolio: ${existingPortfolio.length} → ${newPortfolio.length} items`);
}

logger.info(`Done: ${uploaded} uploaded, ${failed} failed`);

function guessExtension(url) {
  const u = url.toLowerCase();
  if (u.includes('.png') || u.endsWith('png')) return 'png';
  if (u.includes('.webp') || u.endsWith('webp')) return 'webp';
  return 'jpg';
}

function capitalizeType(type) {
  if (!type) return 'General';
  const map = {
    kitchen: 'Kitchens',
    bathroom: 'Bathrooms',
    basement: 'Basements',
    outdoor: 'Outdoor',
    general: 'General',
  };
  return map[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1);
}
