#!/usr/bin/env node
/**
 * Backfill dynamic navItems and page_layouts for all existing tenants.
 *
 * Reads company_profile from Supabase for each tenant, builds navItems
 * based on content availability (same logic as provision-tenant.mjs:468-489),
 * updates page_layouts to remove empty sections, and audits hero images.
 *
 * Usage:
 *   node scripts/backfill-dynamic-nav.mjs --all --dry-run    # Preview changes
 *   node scripts/backfill-dynamic-nav.mjs --all              # Apply to all tenants
 *   node scripts/backfill-dynamic-nav.mjs --site-id my-site  # Single tenant
 */

import { parseArgs } from 'node:util';
import { loadEnv } from '../lib/env-loader.mjs';
import * as logger from '../lib/logger.mjs';

loadEnv();

const { values: args } = parseArgs({
  options: {
    all: { type: 'boolean', default: false },
    'site-id': { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    'skip-hero-audit': { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help || (!args.all && !args['site-id'])) {
  console.log(`Usage:
  node scripts/backfill-dynamic-nav.mjs --all --dry-run
  node scripts/backfill-dynamic-nav.mjs --all
  node scripts/backfill-dynamic-nav.mjs --site-id my-site`);
  process.exit(args.help ? 0 : 1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  logger.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

/** Fetch all admin_settings rows for a site_id */
async function fetchTenantData(siteId) {
  const url = `${SUPABASE_URL}/rest/v1/admin_settings?site_id=eq.${encodeURIComponent(siteId)}&select=key,value`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Supabase fetch failed for ${siteId}: ${res.status}`);
  const rows = await res.json();
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

/** Update an existing admin_settings row via PATCH */
async function upsertSetting(siteId, key, value) {
  const url = `${SUPABASE_URL}/rest/v1/admin_settings?site_id=eq.${encodeURIComponent(siteId)}&key=eq.${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ value }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PATCH failed for ${siteId}/${key}: ${res.status} ${err}`);
  }
}

/** Build navItems from company_profile data */
function buildNavItems(profile) {
  const services = Array.isArray(profile.services) ? profile.services : [];
  const portfolio = Array.isArray(profile.portfolio)
    ? profile.portfolio.filter(p => p.imageUrl || p.image_url)
    : [];
  const aboutCopy = profile.about_copy || profile.aboutCopy || [];
  const aboutLen = Array.isArray(aboutCopy) ? aboutCopy.join(' ').length : (aboutCopy || '').length;
  const hasMission = Boolean(profile.mission);
  const hasPrincipals = Boolean(profile.principals);

  const navItems = [{ label: 'Home', href: '/' }];

  if (services.length >= 2) {
    navItems.push({ label: 'Services', href: '/services' });
  }

  if (portfolio.length >= 3) {
    navItems.push({ label: 'Gallery', href: '/gallery' });
  }

  if (aboutLen > 50 || hasMission || hasPrincipals) {
    navItems.push({ label: 'About', href: '/about' });
  }

  navItems.push({ label: 'Contact', href: '/contact' });

  return navItems;
}

/** Build conditional homepage layout based on content */
function buildHomepageLayout(profile) {
  const services = Array.isArray(profile.services) ? profile.services : [];
  const portfolio = Array.isArray(profile.portfolio)
    ? profile.portfolio.filter(p => p.imageUrl || p.image_url)
    : [];
  const testimonials = Array.isArray(profile.testimonials) ? profile.testimonials : [];

  const layout = ['hero:visualizer-teardown'];

  if (services.length > 0) {
    layout.push('services:grid-3-cards');
  }

  if (portfolio.length >= 3) {
    layout.push('gallery:masonry-grid');
  }

  layout.push('misc:process-steps');

  layout.push('about:split-image-copy');

  if (testimonials.length >= 2) {
    layout.push('testimonials:cards-carousel');
  }

  layout.push('trust:badge-strip');
  layout.push('contact:form-simple');
  layout.push('cta:full-width-primary');

  return layout;
}

/** Audit hero image — flag generics and AI-generated rooms */
function auditHeroImage(heroImageUrl) {
  if (!heroImageUrl) return { action: 'none', reason: 'no hero image set' };

  // Generic kitchen fallback
  if (heroImageUrl.includes('before-kitchen.png') || heroImageUrl.includes('images/hero/')) {
    return { action: 'clear', reason: 'generic kitchen fallback — will use gradient' };
  }

  // AI-generated markers
  if (heroImageUrl.includes('hero-generated') || heroImageUrl.includes('generated-hero')) {
    return { action: 'clear', reason: 'AI-generated hero image — will use gradient' };
  }

  return { action: 'keep', reason: 'real contractor photo' };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Get list of all site_ids
  let siteIds;
  if (args['site-id']) {
    siteIds = [args['site-id']];
  } else {
    const url = `${SUPABASE_URL}/rest/v1/admin_settings?key=eq.plan&select=site_id`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Failed to fetch site list: ${res.status}`);
    const rows = await res.json();
    siteIds = rows.map(r => r.site_id).filter(id => id !== 'conversionos' && id !== 'demo');
  }

  logger.info(`Processing ${siteIds.length} tenant(s) ${args['dry-run'] ? '(DRY RUN)' : ''}`);

  const results = { updated: 0, skipped: 0, heroCleared: 0, errors: 0 };

  for (const siteId of siteIds) {
    try {
      const data = await fetchTenantData(siteId);
      const profile = data['company_profile'] || {};
      const branding = data['branding'] || {};
      const currentLayouts = data['page_layouts'] || {};

      // Build dynamic navItems
      const navItems = buildNavItems(profile);
      const navLabels = navItems.map(n => n.label).join(' | ');

      // Build conditional homepage layout
      const homepageLayout = buildHomepageLayout(profile);

      // Check if navItems changed
      const currentNav = branding.navItems;
      const navChanged = JSON.stringify(currentNav) !== JSON.stringify(navItems);
      const layoutChanged = JSON.stringify(currentLayouts.homepage) !== JSON.stringify(homepageLayout);

      // Hero audit
      const heroUrl = profile.heroImageUrl || profile.hero_image_url;
      const heroAudit = args['skip-hero-audit'] ? { action: 'none' } : auditHeroImage(heroUrl);

      if (!navChanged && !layoutChanged && heroAudit.action !== 'clear') {
        logger.info(`[${siteId}] No changes needed (nav: ${navLabels})`);
        results.skipped++;
        continue;
      }

      if (args['dry-run']) {
        logger.info(`[${siteId}] WOULD UPDATE:`);
        if (navChanged) logger.info(`  nav: ${navLabels}`);
        if (layoutChanged) logger.info(`  homepage: ${homepageLayout.length} sections`);
        if (heroAudit.action === 'clear') logger.info(`  hero: CLEAR (${heroAudit.reason})`);
        results.updated++;
        continue;
      }

      // Apply changes
      if (navChanged) {
        const updatedBranding = { ...branding, navItems };
        await upsertSetting(siteId, 'branding', updatedBranding);
      }

      if (layoutChanged) {
        const updatedLayouts = { ...currentLayouts, homepage: homepageLayout };
        await upsertSetting(siteId, 'page_layouts', updatedLayouts);
      }

      if (heroAudit.action === 'clear') {
        const updatedProfile = { ...profile };
        delete updatedProfile.heroImageUrl;
        delete updatedProfile.hero_image_url;
        await upsertSetting(siteId, 'company_profile', updatedProfile);
        results.heroCleared++;
      }

      logger.info(`[${siteId}] Updated: nav=${navLabels}, layout=${homepageLayout.length} sections${heroAudit.action === 'clear' ? ', hero cleared' : ''}`);
      results.updated++;
    } catch (e) {
      logger.error(`[${siteId}] Error: ${e.message}`);
      results.errors++;
    }
  }

  logger.info(`\nBackfill complete: ${results.updated} updated, ${results.skipped} skipped, ${results.heroCleared} heroes cleared, ${results.errors} errors`);
}

main().catch(e => {
  logger.error(`Fatal: ${e.message}`);
  process.exit(1);
});
