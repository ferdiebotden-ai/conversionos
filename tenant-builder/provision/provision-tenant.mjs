#!/usr/bin/env node
/**
 * Per-target provisioning sequence.
 *
 * 1. Read merged scrape data from results/{date}/{site-id}/scraped.json
 * 2. upload-images.mjs → download remote images, upload to Supabase Storage
 * 3. provision.mjs → upsert admin_settings + tenants + update proxy.ts
 * 4. Write proxy fragment (parallel-safe)
 * 5. Update Turso bespoke_status
 * 6. If Dominate tier → create voice agent
 *
 * Usage:
 *   node provision/provision-tenant.mjs --site-id example --data ./results/2026-02-25/example/scraped.json --domain example.norbotsystems.com --tier accelerate
 *   node provision/provision-tenant.mjs --site-id example --data ./scraped.json --domain example.norbotsystems.com --tier accelerate --dry-run
 */

import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { loadEnv, requireEnv } from '../lib/env-loader.mjs';
import { execute } from '../lib/turso-client.mjs';
import { getSupabase } from '../lib/supabase-client.mjs';
import * as logger from '../lib/logger.mjs';
import { withRetry } from '../lib/retry.mjs';
import { writeProxyFragment } from './proxy-fragment.mjs';
import { createVoiceAgent } from './voice-agent.mjs';
import { generateHeroImage, generateAboutImage, generateOgImage } from '../lib/generate-images.mjs';
import { seedSampleLeads } from './seed-sample-leads.mjs';

loadEnv();
requireEnv(['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']);

const { values: args } = parseArgs({
  options: {
    'site-id': { type: 'string' },
    data: { type: 'string' },
    domain: { type: 'string' },
    tier: { type: 'string', default: 'accelerate' },
    'target-id': { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    'skip-sample-data': { type: 'boolean', default: false },
    bespoke: { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help || !args['site-id'] || !args.data) {
  console.log(`Usage:
  node provision/provision-tenant.mjs --site-id example --data ./scraped.json --domain example.norbotsystems.com --tier accelerate
  node provision/provision-tenant.mjs --site-id example --data ./scraped.json --domain example.norbotsystems.com --target-id 42 --dry-run`);
  process.exit(args.help ? 0 : 1);
}

const siteId = args['site-id'];
const dataPath = resolve(args.data);
const tier = args.tier;
const domain = args.domain || `${siteId}.norbotsystems.com`;
const targetId = args['target-id'] ? parseInt(args['target-id'], 10) : null;
const dryRun = args['dry-run'];
const skipSampleData = args['skip-sample-data'];

const demoRoot = resolve(import.meta.dirname, '../../');
const outputDir = dirname(dataPath);

if (!existsSync(dataPath)) {
  logger.error(`Data file not found: ${dataPath}`);
  process.exit(1);
}

logger.progress({ stage: 'provision', target_id: targetId, site_id: siteId, status: 'start', detail: domain });

// Update Turso bespoke_status to 'generating'
if (targetId && !dryRun) {
  try {
    await execute(
      "UPDATE targets SET bespoke_status = 'generating' WHERE id = ?",
      [targetId]
    );
  } catch (e) {
    logger.warn(`Could not update bespoke_status: ${e.message}`);
  }
}

// ──────────────────────────────────────────────────────────
// Step 1: Upload images to Supabase Storage
// ──────────────────────────────────────────────────────────

const provisionedPath = resolve(outputDir, 'provisioned.json');
const uploadScript = resolve(demoRoot, 'scripts/onboarding/upload-images.mjs');

if (dryRun) {
  logger.info('[DRY RUN] Would run upload-images.mjs');
} else {
  logger.info('Step 1: Uploading images to Supabase Storage');
  try {
    await withRetry(
      async () => {
        execFileSync('node', [
          uploadScript,
          '--site-id', siteId,
          '--data', dataPath,
          '--output', provisionedPath,
        ], {
          cwd: demoRoot,
          env: process.env,
          timeout: 120000,
          maxBuffer: 10 * 1024 * 1024,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      },
      { maxRetries: 3, baseDelay: 1000, multiplier: 3, label: 'image-upload' }
    );
    logger.info(`Images uploaded, provisioned data: ${provisionedPath}`);
  } catch (e) {
    logger.warn(`Image upload failed after retries: ${e.message?.slice(0, 100)}`);
    // If output wasn't created, copy the original data
    if (!existsSync(provisionedPath)) {
      writeFileSync(provisionedPath, readFileSync(dataPath, 'utf-8'));
    }
  }
}

// ──────────────────────────────────────────────────────────
// Step 1b: Generate fallback images for missing hero/about/OG
// ──────────────────────────────────────────────────────────

if (!dryRun) {
  const provisionData = JSON.parse(readFileSync(existsSync(provisionedPath) ? provisionedPath : dataPath, 'utf-8'));
  const imageOpts = {
    siteId,
    primaryHex: provisionData.primary_color_hex,
    companyName: provisionData.business_name,
    services: provisionData.services,
    tagline: provisionData.tagline || provisionData.hero_headline,
  };

  let imageDataUpdated = false;

  if (!provisionData.hero_image_url) {
    logger.info('Step 1b: No hero image — generating via Gemini');
    try {
      const heroUrl = await generateHeroImage(imageOpts);
      if (heroUrl) {
        provisionData.hero_image_url = heroUrl;
        imageDataUpdated = true;
      }
    } catch (e) {
      logger.warn(`Hero image generation failed (non-blocking): ${e.message}`);
    }
  }

  if (!provisionData.about_image_url) {
    logger.info('Step 1b: No about image — generating via Gemini');
    try {
      const aboutUrl = await generateAboutImage(imageOpts);
      if (aboutUrl) {
        provisionData.about_image_url = aboutUrl;
        imageDataUpdated = true;
      }
    } catch (e) {
      logger.warn(`About image generation failed (non-blocking): ${e.message}`);
    }

    // Fallback: use the best scraped service image if Gemini failed
    if (!provisionData.about_image_url && provisionData.services?.length > 0) {
      for (const svc of provisionData.services) {
        const imgs = svc.image_urls || [];
        if (imgs.length > 0 && imgs[0]) {
          provisionData.about_image_url = imgs[0];
          imageDataUpdated = true;
          logger.info(`Using service image as about fallback: ${imgs[0].slice(0, 60)}...`);
          break;
        }
      }
    }

    // Final fallback: reuse the hero image
    if (!provisionData.about_image_url && provisionData.hero_image_url) {
      provisionData.about_image_url = provisionData.hero_image_url;
      imageDataUpdated = true;
      logger.info('Using hero image as about fallback');
    }
  }

  // Generate OG image for social sharing
  logger.info('Step 1b: Generating OG image for social sharing');
  try {
    const ogUrl = await generateOgImage(imageOpts);
    if (ogUrl) {
      provisionData._og_image_url = ogUrl;
      imageDataUpdated = true;
    }
  } catch (e) {
    logger.warn(`OG image generation failed (non-blocking): ${e.message}`);
  }

  if (imageDataUpdated) {
    const targetPath = existsSync(provisionedPath) ? provisionedPath : dataPath;
    writeFileSync(targetPath, JSON.stringify(provisionData, null, 2));
    logger.info('Updated provisioned data with generated images');
  }
}

// ──────────────────────────────────────────────────────────
// Step 2: Provision DB rows + proxy.ts
// ──────────────────────────────────────────────────────────

const provisionScript = resolve(demoRoot, 'scripts/onboarding/provision.mjs');
const provisionDataPath = existsSync(provisionedPath) ? provisionedPath : dataPath;

if (dryRun) {
  logger.info('[DRY RUN] Would run provision.mjs');
} else {
  logger.info('Step 2: Provisioning DB rows');
  try {
    execFileSync('node', [
      provisionScript,
      '--site-id', siteId,
      '--data', provisionDataPath,
      '--domain', domain,
      '--tier', tier,
    ], {
      cwd: demoRoot,
      env: process.env,
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    logger.info('Provisioning complete');
  } catch (e) {
    logger.error(`Provisioning failed: ${e.message?.slice(0, 200)}`);
    // Update Turso status to failed
    if (targetId) {
      await execute("UPDATE targets SET bespoke_status = 'failed' WHERE id = ?", [targetId]);
    }
    logger.progress({ stage: 'provision', target_id: targetId, site_id: siteId, status: 'error', detail: 'provision.mjs failed' });
    process.exit(1);
  }
}

// ──────────────────────────────────────────────────────────
// Step 2b: Seed assembly templates (Accelerate+ only)
// ──────────────────────────────────────────────────────────

if (!dryRun && (tier === 'accelerate' || tier === 'dominate')) {
  logger.info('Step 2b: Seeding assembly templates');
  try {
    const sb = getSupabase();
    // Check if templates already exist for this tenant
    const { data: existing } = await (sb).from('assembly_templates')
      .select('id')
      .eq('site_id', siteId)
      .limit(1);

    if (existing && existing.length > 0) {
      logger.info('Assembly templates already exist — skipping');
    } else {
      const templates = getDefaultAssemblyTemplates();
      const rows = templates.map(t => ({
        site_id: siteId,
        name: t.name,
        category: t.category,
        description: t.description,
        items: t.items,
      }));
      const { error } = await (sb).from('assembly_templates').insert(rows);
      if (error) {
        logger.warn(`Assembly template seeding failed: ${error.message}`);
      } else {
        logger.info(`Seeded ${rows.length} assembly templates`);
      }
    }
  } catch (e) {
    logger.warn(`Assembly template seeding failed: ${e.message}`);
  }
}

// ──────────────────────────────────────────────────────────
// Step 2c: Seed sample leads (all tiers)
// ──────────────────────────────────────────────────────────

if (!dryRun && !skipSampleData) {
  logger.info('Step 2c: Seeding sample leads');
  try {
    const result = await seedSampleLeads(siteId);
    if (result.seeded) {
      logger.info(`Seeded sample data: ${JSON.stringify(result.counts)}`);
    } else {
      logger.info(`Sample leads skipped: ${result.reason}`);
    }
  } catch (e) {
    logger.warn(`Sample lead seeding failed (non-blocking): ${e.message}`);
  }
} else if (skipSampleData) {
  logger.info('Step 2c: Sample leads skipped (--skip-sample-data)');
}

// ──────────────────────────────────────────────────────────
// Step 2d: Write theme + page_layouts to admin_settings
// ──────────────────────────────────────────────────────────

if (!dryRun) {
  logger.info('Step 2d: Writing theme + page_layouts');
  try {
    const sb = getSupabase();
    const provisionData = JSON.parse(readFileSync(existsSync(provisionedPath) ? provisionedPath : dataPath, 'utf-8'));

    // Check for architect blueprint — overrides defaults when available
    const blueprintPath = resolve(outputDir, 'site-blueprint-v2.json');
    const hasBlueprint = existsSync(blueprintPath);
    let blueprint = null;
    if (hasBlueprint) {
      try {
        blueprint = JSON.parse(readFileSync(blueprintPath, 'utf-8'));
        logger.info('Using architect blueprint for theme + page_layouts');
      } catch {
        logger.warn('Blueprint file exists but could not be parsed — using defaults');
      }
    }

    // In bespoke mode, enrich theme with CSS tokens extracted from original site
    let cssTokens = null;
    if (args.bespoke) {
      const cssTokensPath = resolve(outputDir, 'css-tokens.json');
      if (existsSync(cssTokensPath)) {
        try {
          cssTokens = JSON.parse(readFileSync(cssTokensPath, 'utf-8'));
          logger.info('Using CSS tokens for enriched bespoke theme');
        } catch { /* ignore parse errors */ }
      }
    }

    // Theme config — from blueprint if available, enriched with CSS tokens in bespoke mode
    let themeConfig = blueprint?.theme ?? {
      colors: {
        primary: provisionData._meta?.primary_oklch || null,
        secondary: null,
        accent: null,
      },
      typography: {
        headingFont: null,
        bodyFont: null,
      },
      borderRadius: null,
      spacing: 'default',
      animationPreset: 'fade-in-up',
    };

    // Enrich with CSS tokens (bespoke mode)
    if (cssTokens && args.bespoke) {
      // Use rendered fonts from original site
      if (cssTokens.renderedFonts?.length > 0) {
        const fonts = cssTokens.renderedFonts.filter(f => !['FontAwesome', 'Material Icons', 'dashicons'].some(x => f.includes(x)));
        if (fonts.length >= 2 && !themeConfig.typography.headingFont) {
          themeConfig.typography.headingFont = fonts[0];
          themeConfig.typography.bodyFont = fonts[1];
        } else if (fonts.length >= 1 && !themeConfig.typography.headingFont) {
          themeConfig.typography.headingFont = fonts[0];
          themeConfig.typography.bodyFont = fonts[0];
        }
      }

      // Use exact border-radius from original buttons/cards
      if (!themeConfig.borderRadius && cssTokens.borderRadii) {
        const radii = Object.values(cssTokens.borderRadii);
        if (radii.length > 0) {
          themeConfig.borderRadius = radii[0];
        }
      }

      // Detect spacing rhythm
      if (cssTokens.spacingRhythm?.length > 0) {
        const avgPadding = cssTokens.spacingRhythm.reduce((sum, s) => {
          return sum + parseInt(s.paddingTop || '0', 10);
        }, 0) / cssTokens.spacingRhythm.length;
        if (avgPadding > 80) themeConfig.spacing = 'spacious';
        else if (avgPadding < 30) themeConfig.spacing = 'compact';
      }
    }

    // Page layouts — from blueprint if available, otherwise defaults
    let pageLayouts;
    if (blueprint?.pages) {
      pageLayouts = Object.fromEntries(
        blueprint.pages.map(p => [p.slug, p.sections.map(s => s.sectionId)])
      );
    } else {
      pageLayouts = {
        homepage: [
          'hero:full-bleed-overlay',
          'trust:badge-strip',
          'misc:visualizer-teaser',
          'services:grid-3-cards',
          'about:split-image-copy',
          'gallery:masonry-grid',
          'testimonials:cards-carousel',
          'cta:full-width-primary',
        ],
        about: [
          'misc:breadcrumb-hero',
          'about:split-image-copy',
          'misc:mission-statement',
          'trust:badge-strip',
          'testimonials:cards-carousel',
          'misc:service-area',
          'cta:full-width-primary',
        ],
        services: [
          'misc:breadcrumb-hero',
          'services:grid-3-cards',
          'gallery:masonry-grid',
          'testimonials:cards-carousel',
          'cta:full-width-primary',
        ],
        contact: [
          'misc:breadcrumb-hero',
          'contact:form-with-map',
          'trust:badge-strip',
        ],
        projects: [
          'misc:breadcrumb-hero',
          'gallery:masonry-grid',
          'testimonials:cards-carousel',
          'cta:full-width-primary',
        ],
      };
    }

    // Upsert theme
    const { error: themeErr } = await (sb).from('admin_settings').upsert(
      { site_id: siteId, key: 'theme', value: themeConfig },
      { onConflict: 'site_id,key' }
    );
    if (themeErr) logger.warn(`Theme upsert failed: ${themeErr.message}`);

    // Upsert page_layouts
    const { error: layoutErr } = await (sb).from('admin_settings').upsert(
      { site_id: siteId, key: 'page_layouts', value: pageLayouts },
      { onConflict: 'site_id,key' }
    );
    if (layoutErr) logger.warn(`Page layouts upsert failed: ${layoutErr.message}`);

    // Detect custom nav/footer sections and set layout_flags
    const allSectionIds = Object.values(pageLayouts).flat();
    const hasCustomNav = allSectionIds.some(id => /custom:.*-(nav|navbar|header|navigation)/i.test(id));
    const hasCustomFooter = allSectionIds.some(id => /custom:.*-footer/i.test(id));

    if (hasCustomNav || hasCustomFooter) {
      const layoutFlags = {};
      if (hasCustomNav) layoutFlags.custom_nav = true;
      if (hasCustomFooter) layoutFlags.custom_footer = true;

      const { error: flagsErr } = await (sb).from('admin_settings').upsert(
        { site_id: siteId, key: 'layout_flags', value: layoutFlags },
        { onConflict: 'site_id,key' }
      );
      if (flagsErr) logger.warn(`Layout flags upsert failed: ${flagsErr.message}`);
      else logger.info(`Layout flags set: ${JSON.stringify(layoutFlags)}`);
    }

    logger.info('Theme + page_layouts written to admin_settings');
  } catch (e) {
    logger.warn(`Theme/page_layouts write failed (non-blocking): ${e.message}`);
  }
}

// ──────────────────────────────────────────────────────────
// Step 3: Write proxy fragment (parallel-safe)
// ──────────────────────────────────────────────────────────

if (!dryRun) {
  logger.info('Step 3: Writing proxy fragment');
  writeProxyFragment(siteId, domain);
} else {
  logger.info('[DRY RUN] Would write proxy fragment');
}

// ──────────────────────────────────────────────────────────
// Step 4: Update Turso bespoke_status to 'complete'
// ──────────────────────────────────────────────────────────

if (targetId && !dryRun) {
  try {
    await execute(
      "UPDATE targets SET bespoke_status = 'complete' WHERE id = ?",
      [targetId]
    );
    logger.info('Turso bespoke_status updated to complete');
  } catch (e) {
    logger.warn(`Could not update bespoke_status: ${e.message}`);
  }
}

// ──────────────────────────────────────────────────────────
// Step 5: Voice agent (Dominate tier only)
// ──────────────────────────────────────────────────────────

if (tier === 'dominate') {
  try {
    const data = JSON.parse(readFileSync(provisionDataPath, 'utf-8'));
    await createVoiceAgent(siteId, data);
  } catch (e) {
    logger.warn(`Voice agent creation failed (non-blocking): ${e.message}`);
  }
}

logger.progress({
  stage: 'provision',
  target_id: targetId,
  site_id: siteId,
  status: 'complete',
  detail: `domain=${domain}, tier=${tier}`,
});

logger.info(`Tenant ${siteId} provisioned at ${domain}`);

// ──────────────────────────────────────────────────────────
// Default assembly templates (replicated from src/lib/data/default-templates.ts)
// ──────────────────────────────────────────────────────────

function getDefaultAssemblyTemplates() {
  return [
    {
      name: 'Standard Kitchen Demolition',
      category: 'kitchen',
      description: 'Complete strip-out of existing kitchen: cabinets, countertops, backsplash, flooring, and debris removal.',
      items: [
        { description: 'Cabinet removal and disposal', category: 'labor', quantity: 1, unit: 'lot', unit_price: 1200 },
        { description: 'Countertop removal', category: 'labor', quantity: 1, unit: 'lot', unit_price: 450 },
        { description: 'Backsplash removal', category: 'labor', quantity: 1, unit: 'lot', unit_price: 350 },
        { description: 'Flooring removal (up to 150 sqft)', category: 'labor', quantity: 1, unit: 'lot', unit_price: 600 },
        { description: 'Dumpster rental (20 yard)', category: 'equipment', quantity: 1, unit: 'ea', unit_price: 550 },
      ],
    },
    {
      name: 'Kitchen Cabinetry Package (Standard)',
      category: 'kitchen',
      description: 'Semi-custom cabinets with soft-close, supply and installation for average 12 linear ft kitchen.',
      items: [
        { description: 'Semi-custom cabinets (12 lin ft)', category: 'materials', quantity: 12, unit: 'lin ft', unit_price: 400 },
        { description: 'Cabinet hardware (handles + knobs)', category: 'materials', quantity: 24, unit: 'ea', unit_price: 8 },
        { description: 'Cabinet installation labour', category: 'labor', quantity: 16, unit: 'hr', unit_price: 75 },
      ],
    },
    {
      name: 'Bathroom Rough-In Package',
      category: 'bathroom',
      description: 'New plumbing and electrical rough-in for full bathroom: toilet, vanity, shower/tub.',
      items: [
        { description: 'Plumbing rough-in (toilet, vanity, shower)', category: 'contract', quantity: 1, unit: 'lot', unit_price: 3500 },
        { description: 'Electrical rough-in (GFI outlets, exhaust fan, lighting)', category: 'contract', quantity: 1, unit: 'lot', unit_price: 2200 },
        { description: 'Permit — plumbing', category: 'permit', quantity: 1, unit: 'ea', unit_price: 250 },
        { description: 'Permit — electrical', category: 'permit', quantity: 1, unit: 'ea', unit_price: 200 },
      ],
    },
    {
      name: 'Bathroom Tile Package (Standard)',
      category: 'bathroom',
      description: 'Floor and shower surround tile for standard bathroom. Porcelain tile, waterproofing, grouting.',
      items: [
        { description: 'Porcelain floor tile (50 sqft)', category: 'materials', quantity: 50, unit: 'sqft', unit_price: 10 },
        { description: 'Shower surround tile (80 sqft)', category: 'materials', quantity: 80, unit: 'sqft', unit_price: 12 },
        { description: 'Waterproofing membrane', category: 'materials', quantity: 80, unit: 'sqft', unit_price: 5 },
        { description: 'Tile installation labour', category: 'labor', quantity: 24, unit: 'hr', unit_price: 65 },
        { description: 'Grout and thinset supplies', category: 'materials', quantity: 1, unit: 'lot', unit_price: 180 },
      ],
    },
    {
      name: 'Basement Framing and Insulation',
      category: 'basement',
      description: 'Frame exterior walls, install vapour barrier, R24 batt insulation for standard 800 sqft basement.',
      items: [
        { description: 'Framing lumber (2x4 studs, plates)', category: 'materials', quantity: 1, unit: 'lot', unit_price: 1800 },
        { description: 'R24 batt insulation (800 sqft walls)', category: 'materials', quantity: 800, unit: 'sqft', unit_price: 2 },
        { description: '6mil poly vapour barrier', category: 'materials', quantity: 1, unit: 'roll', unit_price: 120 },
        { description: 'Framing and insulation labour', category: 'labor', quantity: 32, unit: 'hr', unit_price: 55 },
      ],
    },
    {
      name: 'Basement Drywall and Paint',
      category: 'basement',
      description: 'Drywall installation, taping, sanding, prime and two coats paint for 800 sqft basement.',
      items: [
        { description: 'Drywall sheets (4x8)', category: 'materials', quantity: 40, unit: 'ea', unit_price: 18 },
        { description: 'Drywall mud, tape, and corner bead', category: 'materials', quantity: 1, unit: 'lot', unit_price: 250 },
        { description: 'Drywall hanging and taping labour', category: 'labor', quantity: 40, unit: 'hr', unit_price: 55 },
        { description: 'Interior paint (premium, 2 coats)', category: 'materials', quantity: 10, unit: 'gal', unit_price: 65 },
        { description: 'Painting labour', category: 'labor', quantity: 20, unit: 'hr', unit_price: 45 },
      ],
    },
    {
      name: 'Hardwood Flooring Package',
      category: 'flooring',
      description: 'Engineered hardwood flooring: material, underlayment, installation, and transitions for 200 sqft.',
      items: [
        { description: 'Engineered hardwood flooring', category: 'materials', quantity: 220, unit: 'sqft', unit_price: 12 },
        { description: 'Premium underlayment', category: 'materials', quantity: 220, unit: 'sqft', unit_price: 1.5 },
        { description: 'Transitions and trim pieces', category: 'materials', quantity: 1, unit: 'lot', unit_price: 250 },
        { description: 'Flooring installation labour', category: 'labor', quantity: 12, unit: 'hr', unit_price: 60 },
      ],
    },
    {
      name: 'Electrical Lighting Package',
      category: 'general',
      description: 'Standard pot light installation: 8 LED recessed lights with dimmer switch.',
      items: [
        { description: 'LED pot lights (4-inch, IC rated)', category: 'materials', quantity: 8, unit: 'ea', unit_price: 35 },
        { description: 'Dimmer switch', category: 'materials', quantity: 1, unit: 'ea', unit_price: 45 },
        { description: 'Electrical wiring and supplies', category: 'materials', quantity: 1, unit: 'lot', unit_price: 120 },
        { description: 'Electrician (licensed)', category: 'contract', quantity: 6, unit: 'hr', unit_price: 110 },
      ],
    },
    {
      name: 'Exterior Paint Package',
      category: 'exterior',
      description: 'Full exterior paint: pressure wash, scrape, prime, two coats premium exterior paint (average 1500 sqft home).',
      items: [
        { description: 'Pressure washing', category: 'labor', quantity: 4, unit: 'hr', unit_price: 75 },
        { description: 'Scraping and surface prep', category: 'labor', quantity: 12, unit: 'hr', unit_price: 45 },
        { description: 'Exterior primer', category: 'materials', quantity: 5, unit: 'gal', unit_price: 55 },
        { description: 'Exterior paint (premium, 2 coats)', category: 'materials', quantity: 15, unit: 'gal', unit_price: 75 },
        { description: 'Painting labour', category: 'labor', quantity: 32, unit: 'hr', unit_price: 50 },
      ],
    },
    {
      name: 'Permit and Inspection Package',
      category: 'general',
      description: 'Standard building permit application and required inspections for major renovation.',
      items: [
        { description: 'Building permit application', category: 'permit', quantity: 1, unit: 'ea', unit_price: 500 },
        { description: 'Architectural drawings (basic)', category: 'permit', quantity: 1, unit: 'lot', unit_price: 1500 },
        { description: 'Permit administration and coordination', category: 'labor', quantity: 4, unit: 'hr', unit_price: 85 },
      ],
    },
  ];
}
