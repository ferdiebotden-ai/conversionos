#!/usr/bin/env node
/**
 * One-off fix script for McCarty Squared Inc launch readiness.
 *
 * 1. Generate OG image via Gemini and update branding.ogImageUrl
 * 2. Back-fill services[1-3].imageUrl from image_urls[0]
 * 3. Update page_layouts.projects (add services + testimonials)
 * 4. Update page_layouts.contact (add contact:split-form)
 *
 * Usage:
 *   node tenant-builder/scripts/fix-mccarty-launch.mjs
 *   node tenant-builder/scripts/fix-mccarty-launch.mjs --dry-run
 *   node tenant-builder/scripts/fix-mccarty-launch.mjs --skip-og
 */

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { loadEnv, requireEnv } from '../lib/env-loader.mjs';
import { getSupabase } from '../lib/supabase-client.mjs';
import { generateOgImage } from '../lib/generate-images.mjs';
import * as logger from '../lib/logger.mjs';

loadEnv();
requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const SITE_ID = 'mccarty-squared-inc';

const { values: args } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    'skip-og': { type: 'boolean', default: false },
  },
});

const dryRun = args['dry-run'];
const skipOg = args['skip-og'];

const sb = getSupabase();

// ─── Helper: read an admin_settings key ──────────────────────────
async function readSetting(key) {
  const { data, error } = await sb
    .from('admin_settings')
    .select('value')
    .eq('site_id', SITE_ID)
    .eq('key', key)
    .single();
  if (error) throw new Error(`Failed to read ${key}: ${error.message}`);
  return typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
}

// ─── Helper: write an admin_settings key ─────────────────────────
async function writeSetting(key, value) {
  if (dryRun) {
    logger.info(`[DRY RUN] Would update ${key}`);
    return;
  }
  const { error } = await sb
    .from('admin_settings')
    .update({ value: JSON.stringify(value) })
    .eq('site_id', SITE_ID)
    .eq('key', key);
  if (error) throw new Error(`Failed to update ${key}: ${error.message}`);
  logger.info(`Updated ${key} for ${SITE_ID}`);
}

// ═══════════════════════════════════════════════════════════════════
// Step 1: Generate OG image
// ═══════════════════════════════════════════════════════════════════
async function fixOgImage() {
  logger.info('── Step 1: OG Image ──');

  const branding = await readSetting('branding');
  logger.info(`Current ogImageUrl: "${branding.ogImageUrl || '(empty)'}"`);

  if (branding.ogImageUrl) {
    logger.info('OG image already set — skipping generation');
    return;
  }

  if (skipOg) {
    logger.info('[SKIP] --skip-og flag set');
    return;
  }

  if (dryRun) {
    logger.info('[DRY RUN] Would generate OG image via Gemini');
    return;
  }

  const ogUrl = await generateOgImage({
    siteId: SITE_ID,
    primaryHex: branding.primaryColour || branding.primaryColor || '#1a365d',
    companyName: 'McCarty Squared Inc',
  });

  if (ogUrl) {
    branding.ogImageUrl = ogUrl;
    await writeSetting('branding', branding);
    logger.info(`OG image generated and saved: ${ogUrl}`);
  } else {
    logger.warn('OG image generation returned null — skipping');
  }
}

// ═══════════════════════════════════════════════════════════════════
// Step 2: Back-fill service imageUrl from image_urls[0]
// ═══════════════════════════════════════════════════════════════════
async function fixServiceImages() {
  logger.info('── Step 2: Service imageUrl back-fill ──');

  const profile = await readSetting('company_profile');
  const services = profile.services || [];
  let fixCount = 0;

  for (let i = 0; i < services.length; i++) {
    const svc = services[i];
    const hasImageUrl = svc.imageUrl && svc.imageUrl.trim() !== '';
    const hasImageUrls = Array.isArray(svc.image_urls) && svc.image_urls.length > 0 && svc.image_urls[0];

    if (!hasImageUrl && hasImageUrls) {
      logger.info(`  Service ${i} "${svc.name}": back-filling imageUrl from image_urls[0]`);
      svc.imageUrl = svc.image_urls[0];
      fixCount++;
    } else if (!hasImageUrl && !hasImageUrls) {
      logger.warn(`  Service ${i} "${svc.name}": no imageUrl AND no image_urls — cannot back-fill`);
    } else {
      logger.info(`  Service ${i} "${svc.name}": imageUrl already set ✓`);
    }
  }

  if (fixCount > 0) {
    profile.services = services;
    await writeSetting('company_profile', profile);
    logger.info(`Back-filled imageUrl for ${fixCount} service(s)`);
  } else {
    logger.info('No services needed imageUrl back-fill');
  }
}

// ═══════════════════════════════════════════════════════════════════
// Step 3: Fix Projects page layout
// ═══════════════════════════════════════════════════════════════════
async function fixProjectsLayout() {
  logger.info('── Step 3: Projects page layout ──');

  const layouts = await readSetting('page_layouts');
  const currentProjects = layouts.projects || [];
  logger.info(`Current projects layout: ${JSON.stringify(currentProjects)}`);

  // Check if it already has content sections (not just breadcrumb + CTA)
  const hasContent = currentProjects.some(s =>
    s.includes('services') || s.includes('testimonials') || s.includes('gallery')
  );

  if (hasContent) {
    logger.info('Projects page already has content sections — skipping');
    return;
  }

  layouts.projects = [
    'misc:breadcrumb-hero',
    'custom:mccarty-squared-inc-services',
    'custom:mccarty-squared-inc-testimonials',
    'cta:full-width-primary',
  ];

  await writeSetting('page_layouts', layouts);
  logger.info('Projects page layout updated with services + testimonials');
}

// ═══════════════════════════════════════════════════════════════════
// Step 4: Fix Contact page layout
// ═══════════════════════════════════════════════════════════════════
async function fixContactLayout() {
  logger.info('── Step 4: Contact page layout ──');

  const layouts = await readSetting('page_layouts');
  const currentContact = layouts.contact || [];
  logger.info(`Current contact layout: ${JSON.stringify(currentContact)}`);

  const hasForm = currentContact.some(s => s.includes('contact:'));

  if (hasForm) {
    logger.info('Contact page already has form section — skipping');
    return;
  }

  layouts.contact = [
    'misc:breadcrumb-hero',
    'contact:split-form',
    'cta:full-width-primary',
  ];

  await writeSetting('page_layouts', layouts);
  logger.info('Contact page layout updated with split-form');
}

// ═══════════════════════════════════════════════════════════════════
// Run all fixes
// ═══════════════════════════════════════════════════════════════════
async function main() {
  logger.info(`=== McCarty Squared Inc Launch Fix ===`);
  logger.info(`Site ID: ${SITE_ID}`);
  logger.info(`Dry run: ${dryRun}`);
  logger.info('');

  await fixOgImage();
  logger.info('');

  await fixServiceImages();
  logger.info('');

  await fixProjectsLayout();
  logger.info('');

  await fixContactLayout();
  logger.info('');

  logger.info('=== All fixes complete ===');
}

main().catch(err => {
  logger.error(`Fatal: ${err.message}`);
  process.exit(1);
});
