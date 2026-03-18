#!/usr/bin/env node
/**
 * Fix tenant images — re-scrapes original websites using Firecrawl's full capabilities
 * (map, images format, scroll actions, CSS background extraction) and replaces
 * AI-generated images with real contractor photos in Supabase admin_settings.
 *
 * Also fixes: processSteps (ConversionOS standard), page_layouts (add gallery if
 * portfolio now has images, add process-steps section), logo contrast (logoOnDark).
 *
 * Usage:
 *   node scripts/fix-tenant-images.mjs --site-id example
 *   node scripts/fix-tenant-images.mjs --all
 *   node scripts/fix-tenant-images.mjs --tier1    # Just the 16 cold outreach drafts
 *   node scripts/fix-tenant-images.mjs --tier2    # Just the 7 warm-lead drafts
 *
 * Flags:
 *   --dry-run       Show what would change without writing to Supabase
 *   --skip-verify   Skip Playwright verification after fix
 *   --concurrency N Parallel tenants (default 4)
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { createClient as createTurso } from '@libsql/client';
import sharp from 'sharp';
import { loadEnv } from '../lib/env-loader.mjs';
import * as logger from '../lib/logger.mjs';
import { map, scrapeAdvanced } from '../lib/firecrawl-client.mjs';

loadEnv();

// ─── Args ────────────────────────────────────────────────────────────────────

const { values: args } = parseArgs({
  options: {
    'site-id': { type: 'string' },
    all: { type: 'boolean', default: false },
    tier1: { type: 'boolean', default: false },
    tier2: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    'skip-verify': { type: 'boolean', default: false },
    concurrency: { type: 'string', default: '4' },
    help: { type: 'boolean' },
  },
});

if (args.help) {
  console.log('Usage: node scripts/fix-tenant-images.mjs --site-id <id> | --all | --tier1 | --tier2');
  process.exit(0);
}

const concurrency = parseInt(args.concurrency) || 4;
const dryRun = args['dry-run'];
const skipVerify = args['skip-verify'];

// ─── Clients ─────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) { console.error('Missing Supabase credentials'); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;
let turso = null;
if (tursoUrl && tursoToken) {
  turso = createTurso({ url: tursoUrl, authToken: tursoToken });
}

// ─── Tenant Lists ────────────────────────────────────────────────────────────

const TIER1_SITES = [
  'your-kingston-contractor', 'red-stone-contracting', 'a-and-a-home-renovations',
  'sunny-side-kitchens', 'graham-s-son-interiors', 'caliber-contracting',
  'a-p-hurley-construction', 'inex-general-contracting', 'tc-contracting',
  'eastview-homes', 'bradburn-group', 'hache-construction',
  'house-renovations', 'hemeryck-homes-construction-ltd', 'rose-building-group', 'tyton-homes',
];

const TIER2_SITES = [
  'ccr-renovations', 'red-white-reno', 'gracia-makeovers', 'dundas-home-renovations',
  'dalm-construction-premium-home-builders', 'senso-design', 'gilbert-burke',
];

const SYSTEM_SITES = ['conversionos', 'demo', 'norbot-showcase', 'redwhitereno-test-prov-test'];

// ConversionOS standard process steps
const CONVERSIONOS_PROCESS_STEPS = [
  { title: 'Upload a Photo', description: 'Take a photo of your space with your phone or upload an existing image. Our AI design consultant analyses the space instantly.' },
  { title: 'Explore Design Concepts', description: 'Choose a renovation style and see four unique AI-generated visualizations of your transformed space in under a minute.' },
  { title: 'Request a Quote', description: 'Love what you see? Request a detailed estimate. We\'ll get back to you quickly with a personalized quote for your project.' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isSubstantialImage(imgUrl) {
  if (!imgUrl || typeof imgUrl !== 'string') return false;
  const lower = imgUrl.toLowerCase();
  if (/\.(svg|gif|ico)(\?|$)/.test(lower)) return false;
  if (/gravatar|facebook\.com|instagram\.com|twitter\.com|linkedin\.com|youtube\.com|google\.com\/maps|badge|icon|logo.*small|pixel|tracking|1x1|spacer|blank|wp-includes|wp-content\/plugins/i.test(lower)) return false;
  return true;
}

function isAiGenerated(imageUrl) {
  if (!imageUrl) return false;
  const lower = imageUrl.toLowerCase();
  return lower.includes('-generated.') ||
    (lower.includes('tenant-assets') && /\/service-[^/]+\.(jpg|jpeg|png|webp)$/i.test(lower)) ||
    lower.includes('/og-image.');
}

async function downloadAndUpload(imageUrl, storagePath, siteId) {
  try {
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) return null;
    let buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 10 * 1024 * 1024) return null; // Skip >10MB

    // Content quality gate: reject badges/logos/icons
    try {
      const checkMeta = await sharp(buffer).metadata();
      if (checkMeta.width < 200 || checkMeta.height < 150) {
        logger.debug(`Rejecting small image (${checkMeta.width}x${checkMeta.height}): ${imageUrl.slice(0, 60)}`);
        return null;
      }
      if (checkMeta.width / checkMeta.height > 3) {
        logger.debug(`Rejecting banner ratio (${checkMeta.width}x${checkMeta.height}): ${imageUrl.slice(0, 60)}`);
        return null;
      }
    } catch { /* continue if check fails */ }

    // Optimize with sharp
    try {
      const image = sharp(buffer);
      const meta = await image.metadata();
      if (meta.format !== 'svg') {
        buffer = await image
          .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        storagePath = storagePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      }
    } catch { /* use original if sharp fails */ }

    const fullPath = `${siteId}/${storagePath}`;
    const { error } = await supabase.storage.from('tenant-assets').upload(fullPath, buffer, {
      contentType: storagePath.endsWith('.webp') ? 'image/webp' : contentType,
      upsert: true,
    });
    if (error) { logger.warn(`Upload failed ${fullPath}: ${error.message}`); return null; }

    const { data: { publicUrl } } = supabase.storage.from('tenant-assets').getPublicUrl(fullPath);
    return publicUrl;
  } catch (e) {
    logger.debug(`Download failed ${imageUrl}: ${e.message?.slice(0, 60)}`);
    return null;
  }
}

async function checkLogoContrast(logoUrl) {
  try {
    const response = await fetch(logoUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const { dominant } = await sharp(buffer).stats();
    // Calculate relative luminance
    const luminance = (0.299 * dominant.r + 0.587 * dominant.g + 0.114 * dominant.b) / 255;
    return luminance > 0.7; // Light logo = needs dark background
  } catch {
    return null;
  }
}

// ─── Core: Fix One Tenant ────────────────────────────────────────────────────

async function fixTenant(siteId) {
  const report = { siteId, fixes: [], errors: [], unchanged: [], portfolioAdded: 0 };
  logger.info(`\n${'═'.repeat(60)}`);
  logger.info(`Fixing: ${siteId}`);
  logger.info(`${'═'.repeat(60)}`);

  // 1. Look up original URL from Turso
  let originalUrl = null;
  if (turso) {
    try {
      const { rows } = await turso.execute({
        sql: `SELECT website FROM targets WHERE slug = ? LIMIT 1`,
        args: [siteId],
      });
      if (rows.length > 0) originalUrl = rows[0].website;
    } catch (e) {
      logger.warn(`Turso lookup failed for ${siteId}: ${e.message}`);
    }
  }
  if (!originalUrl) {
    report.errors.push('Could not find original URL in Turso');
    logger.warn(`No original URL for ${siteId} — skipping image re-scrape`);
  }

  // 2. Read current admin_settings
  const { data: settingsRows, error: settingsErr } = await supabase
    .from('admin_settings')
    .select('key, value')
    .eq('site_id', siteId)
    .in('key', ['company_profile', 'branding', 'page_layouts']);

  if (settingsErr || !settingsRows?.length) {
    report.errors.push(`Failed to read admin_settings: ${settingsErr?.message || 'no data'}`);
    logger.error(`Cannot read admin_settings for ${siteId} — skipping`);
    return report;
  }

  const settings = {};
  for (const row of settingsRows) {
    settings[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
  }
  const profile = settings.company_profile || {};
  const branding = settings.branding || {};
  const layouts = settings.page_layouts || {};

  // 3. Detect AI-generated images
  const aiImages = {};
  if (isAiGenerated(profile.heroImageUrl)) aiImages.heroImageUrl = profile.heroImageUrl;
  if (isAiGenerated(profile.aboutImageUrl)) aiImages.aboutImageUrl = profile.aboutImageUrl;
  if (profile.services?.length > 0) {
    profile.services.forEach((s, i) => {
      if (isAiGenerated(s.imageUrl)) aiImages[`services[${i}].imageUrl`] = s.imageUrl;
    });
  }
  logger.info(`AI-generated images detected: ${Object.keys(aiImages).length} (${Object.keys(aiImages).join(', ') || 'none'})`);

  // 4. Re-scrape original site if we have a URL
  let discoveredImages = {};
  let cssHeroUrl = null;

  if (originalUrl) {
    // 4a. Map the site
    logger.info(`Mapping: ${originalUrl}`);
    let sitePages = [];
    try {
      const mapResult = await map(originalUrl, { limit: 50 });
      sitePages = (mapResult.links || []).map(l => typeof l === 'string' ? l : l.url).filter(Boolean);
      logger.info(`Discovered ${sitePages.length} pages`);
    } catch (e) {
      logger.warn(`Map failed: ${e.message}`);
    }

    // 4b. Filter image-bearing pages (exclude sitemaps, XML, feeds, blog posts)
    const imagePagePatterns = /gallery|portfolio|project|our-work|our-portfolio|\/service|about|team|photo|images/i;
    const excludePatterns = /\.xml|\.pdf|sitemap|feed|rss|wp-json|\.css|\.js|tag\/|category\//i;
    const imagePages = sitePages.filter(u => imagePagePatterns.test(u) && !excludePatterns.test(u));
    // Also add common fallback paths not found by map
    const fallbackPaths = ['/gallery', '/portfolio', '/projects', '/our-work', '/about', '/about-us', '/services'];
    for (const path of fallbackPaths) {
      const fullUrl = new URL(path, originalUrl).href;
      if (!imagePages.includes(fullUrl) && !sitePages.includes(fullUrl)) {
        imagePages.push(fullUrl);
      }
    }
    const pagesToScrape = [originalUrl, ...imagePages.slice(0, 15)];
    logger.info(`Will scrape ${pagesToScrape.length} pages for images (${imagePages.length} image pages + homepage)`);

    // 4c. Scrape all pages for images via markdown extraction + scroll
    const scrollActions = [
      { type: 'scroll', direction: 'down' },
      { type: 'wait', milliseconds: 2000 },
      { type: 'scroll', direction: 'down' },
      { type: 'wait', milliseconds: 1000 },
    ];
    const imgRegex = /!\[.*?\]\((.*?)\)/g;

    for (const pageUrl of pagesToScrape) {
      try {
        const result = await scrapeAdvanced(pageUrl, {
          formats: ['markdown'],
          actions: scrollActions,
          onlyMainContent: false, // Include header/footer images
          timeout: 45000,
        });
        // Extract image URLs from markdown
        const mdImages = [];
        let match;
        while ((match = imgRegex.exec(result.markdown || '')) !== null) {
          if (isSubstantialImage(match[1])) mdImages.push(match[1]);
        }
        imgRegex.lastIndex = 0; // Reset regex state
        if (mdImages.length > 0) {
          // Deduplicate
          discoveredImages[pageUrl] = [...new Set(mdImages)];
          logger.info(`  ${pageUrl} → ${discoveredImages[pageUrl].length} images`);
        }
      } catch (e) {
        const msg = e.message?.slice(0, 80) || 'unknown';
        if (!msg.includes('404') && !msg.includes('403')) {
          logger.info(`  Scrape failed ${pageUrl}: ${msg}`);
        }
      }
    }

    // 4d. CSS hero background extraction via Playwright (Firecrawl doesn't support executeJavascript)
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(originalUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      cssHeroUrl = await page.evaluate(() => {
        const selectors = ['[class*="hero"]', '[class*="banner"]', '[class*="jumbotron"]',
          'header + section', 'main > section:first-child', '#hero', '.hero-section',
          '[class*="slider"]', '[class*="carousel"]:first-of-type'];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            const bg = getComputedStyle(el).backgroundImage;
            const m = bg.match(/url\(["']?(.+?)["']?\)/);
            if (m && !m[1].includes('data:') && !m[1].includes('gradient')) return m[1];
          }
        }
        return null;
      });
      await browser.close();
      if (cssHeroUrl && cssHeroUrl.startsWith('/')) cssHeroUrl = new URL(cssHeroUrl, originalUrl).href;
      if (cssHeroUrl) logger.info(`CSS background hero: ${cssHeroUrl.slice(0, 80)}`);
    } catch (e) {
      logger.debug(`CSS hero extraction failed: ${e.message?.slice(0, 60)}`);
    }
  }

  // 5. Apply fixes
  const updates = { company_profile: { ...profile }, branding: { ...branding } };
  let profileChanged = false;
  let brandingChanged = false;
  let layoutsChanged = false;

  // 5a. Hero image fix
  if (isAiGenerated(profile.heroImageUrl)) {
    const realHero = cssHeroUrl || (discoveredImages[originalUrl]?.[0]);
    if (realHero) {
      const uploaded = dryRun ? realHero : await downloadAndUpload(realHero, 'hero.webp', siteId);
      if (uploaded) {
        updates.company_profile.heroImageUrl = uploaded;
        report.fixes.push({ field: 'heroImageUrl', was: 'AI', now: 'scraped', url: uploaded });
        profileChanged = true;
      }
    }
  }

  // 5b. About image fix
  if (isAiGenerated(profile.aboutImageUrl)) {
    let realAbout = null;
    for (const [pageUrl, images] of Object.entries(discoveredImages)) {
      if (/about|team/i.test(pageUrl) && images.length > 0) {
        realAbout = images[0];
        break;
      }
    }
    if (realAbout) {
      const uploaded = dryRun ? realAbout : await downloadAndUpload(realAbout, 'about.webp', siteId);
      if (uploaded) {
        updates.company_profile.aboutImageUrl = uploaded;
        report.fixes.push({ field: 'aboutImageUrl', was: 'AI', now: 'scraped', url: uploaded });
        profileChanged = true;
      }
    }
  }

  // 5c. Service images — remove AI-generated, replace with real if available
  if (profile.services?.length > 0) {
    const servicePageImages = [];
    for (const [pageUrl, images] of Object.entries(discoveredImages)) {
      if (/service/i.test(pageUrl)) servicePageImages.push(...images);
    }

    for (let i = 0; i < updates.company_profile.services.length; i++) {
      const svc = updates.company_profile.services[i];
      if (isAiGenerated(svc.imageUrl)) {
        if (servicePageImages.length > i) {
          const uploaded = dryRun ? servicePageImages[i] : await downloadAndUpload(servicePageImages[i], `service-${i}.webp`, siteId);
          if (uploaded) {
            updates.company_profile.services[i].imageUrl = uploaded;
            report.fixes.push({ field: `services[${i}].imageUrl`, was: 'AI', now: 'scraped' });
            profileChanged = true;
          }
        } else {
          // No real image available — clear the AI one (text-only card)
          updates.company_profile.services[i].imageUrl = '';
          report.fixes.push({ field: `services[${i}].imageUrl`, was: 'AI', now: 'removed' });
          profileChanged = true;
        }
      }
    }
  }

  // 5d. Portfolio — fill from gallery pages
  const currentPortfolio = profile.portfolio || [];
  const hasRealPortfolio = currentPortfolio.some(p => (p.imageUrl || p.image_url) && !isAiGenerated(p.imageUrl || p.image_url));

  if (!hasRealPortfolio) {
    const portfolioImages = [];
    for (const [pageUrl, images] of Object.entries(discoveredImages)) {
      if (/gallery|portfolio|project|our-work|our-portfolio|photo/i.test(pageUrl)) {
        for (const img of images) {
          if (portfolioImages.length < 12) portfolioImages.push(img);
        }
      }
    }
    if (portfolioImages.length > 0) {
      const uploadedPortfolio = [];
      for (let i = 0; i < portfolioImages.length; i++) {
        const uploaded = dryRun ? portfolioImages[i] : await downloadAndUpload(portfolioImages[i], `portfolio-${i}.webp`, siteId);
        if (uploaded) {
          uploadedPortfolio.push({ title: '', description: '', imageUrl: uploaded, serviceType: '', location: '' });
        }
      }
      if (uploadedPortfolio.length > 0) {
        updates.company_profile.portfolio = uploadedPortfolio;
        report.portfolioAdded = uploadedPortfolio.length;
        report.fixes.push({ field: 'portfolio', was: 'empty', now: `${uploadedPortfolio.length} images` });
        profileChanged = true;
      }
    }
  }

  // 5e. processSteps → ConversionOS standard
  const currentSteps = profile.processSteps || [];
  const isConversionOSSteps = currentSteps.some(s => s.title === 'Upload a Photo');
  if (!isConversionOSSteps) {
    updates.company_profile.processSteps = CONVERSIONOS_PROCESS_STEPS;
    report.fixes.push({ field: 'processSteps', was: currentSteps.length ? 'contractor' : 'empty', now: 'conversionos' });
    profileChanged = true;
  }

  // 5f. Page layouts — re-add gallery if portfolio now has images, add process-steps
  const updatedLayouts = { ...layouts };
  const portfolioCount = (updates.company_profile.portfolio || []).filter(p => p.imageUrl || p.image_url).length;

  if (portfolioCount > 0) {
    for (const page of ['homepage', 'services', 'projects']) {
      const sections = updatedLayouts[page] || [];
      if (!sections.some(s => /gallery/i.test(s))) {
        // Add gallery before CTA or at the end
        const ctaIdx = sections.findIndex(s => /cta/i.test(s));
        if (ctaIdx >= 0) {
          sections.splice(ctaIdx, 0, 'gallery:masonry-grid');
        } else {
          sections.push('gallery:masonry-grid');
        }
        updatedLayouts[page] = sections;
        layoutsChanged = true;
        report.fixes.push({ field: `page_layouts.${page}`, was: 'no gallery', now: 'gallery:masonry-grid added' });
      }
    }
  }

  // Add process-steps to homepage if missing
  const homepageSections = updatedLayouts.homepage || [];
  if (!homepageSections.some(s => /process-steps/i.test(s))) {
    const aboutIdx = homepageSections.findIndex(s => /about/i.test(s));
    if (aboutIdx >= 0) {
      homepageSections.splice(aboutIdx + 1, 0, 'misc:process-steps');
    } else {
      homepageSections.push('misc:process-steps');
    }
    updatedLayouts.homepage = homepageSections;
    layoutsChanged = true;
    report.fixes.push({ field: 'page_layouts.homepage', was: 'no process-steps', now: 'misc:process-steps added' });
  }

  // 5g. Logo contrast check
  const logoUrl = branding.logoUrl || branding.faviconUrl;
  if (logoUrl && !branding.logoOnDark) {
    const needsDark = await checkLogoContrast(logoUrl);
    if (needsDark) {
      updates.branding.logoOnDark = true;
      brandingChanged = true;
      report.fixes.push({ field: 'logoOnDark', was: false, now: true });
    }
  }

  // 6. Write updates to Supabase
  if (!dryRun) {
    if (profileChanged) {
      const { error } = await supabase.from('admin_settings').upsert(
        { site_id: siteId, key: 'company_profile', value: updates.company_profile },
        { onConflict: 'site_id,key' }
      );
      if (error) report.errors.push(`company_profile update failed: ${error.message}`);
      else logger.info(`Updated company_profile for ${siteId}`);
    }
    if (brandingChanged) {
      const { error } = await supabase.from('admin_settings').upsert(
        { site_id: siteId, key: 'branding', value: updates.branding },
        { onConflict: 'site_id,key' }
      );
      if (error) report.errors.push(`branding update failed: ${error.message}`);
      else logger.info(`Updated branding for ${siteId}`);
    }
    if (layoutsChanged) {
      const { error } = await supabase.from('admin_settings').upsert(
        { site_id: siteId, key: 'page_layouts', value: updatedLayouts },
        { onConflict: 'site_id,key' }
      );
      if (error) report.errors.push(`page_layouts update failed: ${error.message}`);
      else logger.info(`Updated page_layouts for ${siteId}`);
    }
  } else {
    logger.info(`[DRY RUN] Would update: ${[profileChanged && 'company_profile', brandingChanged && 'branding', layoutsChanged && 'page_layouts'].filter(Boolean).join(', ') || 'nothing'}`);
  }

  // 7. Summary
  logger.info(`\nFix summary for ${siteId}:`);
  logger.info(`  Fixes applied: ${report.fixes.length}`);
  logger.info(`  Portfolio images added: ${report.portfolioAdded}`);
  logger.info(`  Errors: ${report.errors.length}`);
  if (report.fixes.length === 0) logger.info('  (No changes needed)');
  for (const fix of report.fixes) {
    logger.info(`  - ${fix.field}: ${fix.was} → ${fix.now}`);
  }

  return report;
}

// ─── Playwright Verification ─────────────────────────────────────────────────

async function verifyTenant(siteId, outputDir) {
  if (skipVerify) return { passed: true, skipped: true };

  logger.info(`Verifying: ${siteId}`);
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const results = {};
    const baseUrl = `https://${siteId}.norbotsystems.com`;

    for (const [page, path] of [['homepage', '/'], ['services', '/services'], ['projects', '/projects'], ['about', '/about']]) {
      try {
        const ctx = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        const resp = await ctx.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
        if (resp && resp.status() < 400) {
          // Screenshot
          const ssDir = resolve(outputDir, 'verification');
          mkdirSync(ssDir, { recursive: true });
          await ctx.screenshot({ path: resolve(ssDir, `${siteId}-${page}.png`), fullPage: false });

          // Check logo
          if (page === 'homepage') {
            const logoLoaded = await ctx.$eval('header img', img => img.naturalWidth > 0).catch(() => false);
            results.logoLoaded = logoLoaded;

            // Check for "Upload a Photo" (processSteps)
            const hasProcessSteps = await ctx.$eval('body', body => body.textContent.includes('Upload a Photo')).catch(() => false);
            results.hasProcessSteps = hasProcessSteps;
          }

          results[page] = 'OK';
        } else {
          results[page] = `HTTP ${resp?.status() || 'timeout'}`;
        }
        await ctx.close();
      } catch (e) {
        results[page] = `ERROR: ${e.message?.slice(0, 40)}`;
      }
    }

    await browser.close();
    const passed = results.homepage === 'OK' && results.logoLoaded !== false;
    logger.info(`Verification: ${passed ? 'PASSED' : 'ISSUES'} — ${JSON.stringify(results)}`);
    return { passed, ...results };
  } catch (e) {
    logger.warn(`Verification failed: ${e.message}`);
    return { passed: false, error: e.message };
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const outputDir = resolve(import.meta.dirname, `../results/${today}/image-fixes`);
  mkdirSync(outputDir, { recursive: true });

  // Determine target list
  let targetSites = [];
  if (args['site-id']) {
    targetSites = [args['site-id']];
  } else if (args.tier1) {
    targetSites = TIER1_SITES;
  } else if (args.tier2) {
    targetSites = TIER2_SITES;
  } else if (args.all) {
    targetSites = [...TIER1_SITES, ...TIER2_SITES];
  } else {
    console.error('Specify --site-id, --tier1, --tier2, or --all');
    process.exit(1);
  }

  logger.info(`\n${'═'.repeat(60)}`);
  logger.info(`Fix Tenant Images — ${targetSites.length} tenants`);
  logger.info(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'} | Verify: ${skipVerify ? 'NO' : 'YES'} | Concurrency: ${concurrency}`);
  logger.info(`${'═'.repeat(60)}\n`);

  const allReports = [];

  // Process in chunks for concurrency
  for (let i = 0; i < targetSites.length; i += concurrency) {
    const chunk = targetSites.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      chunk.map(async (siteId) => {
        try {
          const report = await fixTenant(siteId);
          // Verification
          if (!dryRun && !skipVerify) {
            report.verification = await verifyTenant(siteId, outputDir);
          }
          // Write per-tenant report
          writeFileSync(resolve(outputDir, `${siteId}.json`), JSON.stringify(report, null, 2));
          return report;
        } catch (e) {
          logger.error(`FAILED ${siteId}: ${e.message}`);
          return { siteId, fixes: [], errors: [e.message], portfolioAdded: 0 };
        }
      })
    );

    for (const result of results) {
      allReports.push(result.status === 'fulfilled' ? result.value : result.reason);
    }
  }

  // Write batch summary
  const summary = {
    date: today,
    total: targetSites.length,
    fixed: allReports.filter(r => r.fixes?.length > 0).length,
    unchanged: allReports.filter(r => r.fixes?.length === 0 && r.errors?.length === 0).length,
    errors: allReports.filter(r => r.errors?.length > 0).length,
    totalFixes: allReports.reduce((sum, r) => sum + (r.fixes?.length || 0), 0),
    totalPortfolioAdded: allReports.reduce((sum, r) => sum + (r.portfolioAdded || 0), 0),
    perTenant: allReports.map(r => ({
      siteId: r.siteId,
      fixes: r.fixes?.length || 0,
      portfolioAdded: r.portfolioAdded || 0,
      errors: r.errors?.length || 0,
      verified: r.verification?.passed ?? null,
    })),
  };

  writeFileSync(resolve(outputDir, 'batch-summary.json'), JSON.stringify(summary, null, 2));
  logger.info(`\n${'═'.repeat(60)}`);
  logger.info('BATCH SUMMARY');
  logger.info(`${'═'.repeat(60)}`);
  logger.info(`Total: ${summary.total} | Fixed: ${summary.fixed} | Unchanged: ${summary.unchanged} | Errors: ${summary.errors}`);
  logger.info(`Total fixes applied: ${summary.totalFixes}`);
  logger.info(`Total portfolio images added: ${summary.totalPortfolioAdded}`);
  logger.info(`Report: ${resolve(outputDir, 'batch-summary.json')}`);
}

// Guard CLI entry
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('fix-tenant-images.mjs')) {
  main().catch(e => { console.error(e); process.exit(1); });
}
