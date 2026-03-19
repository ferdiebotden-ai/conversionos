#!/usr/bin/env node
/**
 * Enhanced scraping pipeline — orchestrates 3 phases:
 * 1. Firecrawl Branding v2 → structured colours, fonts, logos, personality
 * 2. Existing scrape.mjs (7-stage extraction) → full content
 * 3. Logo extraction (4-level fallback) → reliable logo URL
 *
 * Merge strategy:
 * - Branding v2 colours override hex-counted colours from scrape.mjs
 * - Logo extraction result overrides scraped logo_url
 * - Output: merged JSON in results/{date}/{site-id}/scraped.json
 *
 * Usage:
 *   node scrape/scrape-enhanced.mjs --url https://example.com --site-id example --output ./results/2026-02-25/example/
 */

import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv, requireEnv } from '../lib/env-loader.mjs';
import * as logger from '../lib/logger.mjs';
import { extractBranding } from './branding-v2.mjs';
import { extractLogo } from './logo-extract.mjs';
import { captureScreenshots } from './screenshot-capture.mjs';
import { hexToOklch } from '../../scripts/onboarding/convert-color.mjs';
import { createClient } from '@libsql/client';
import { map, scrapeAdvanced } from '../lib/firecrawl-client.mjs';
import { parse as parseYaml } from 'yaml';
import { mapServiceImages } from '../lib/service-image-mapper.mjs';
import { classifyPortfolioImages, evaluateHeroQuality } from '../lib/image-classifier.mjs';

loadEnv();
requireEnv(['FIRECRAWL_API_KEY']);

const { values: args } = parseArgs({
  options: {
    url: { type: 'string' },
    'site-id': { type: 'string' },
    output: { type: 'string' },
    'skip-branding': { type: 'boolean', default: false },
    'skip-logo': { type: 'boolean', default: false },
    bespoke: { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help || !args.url || !args['site-id']) {
  console.log(`Usage:
  node scrape/scrape-enhanced.mjs --url https://example.com --site-id example --output ./results/2026-02-25/example/`);
  process.exit(args.help ? 0 : 1);
}

const url = args.url;
const siteId = args['site-id'];
const today = new Date().toISOString().slice(0, 10);
const outputDir = args.output || resolve(import.meta.dirname, `../results/${today}/${siteId}`);

mkdirSync(outputDir, { recursive: true });

const scrapeOutputPath = resolve(outputDir, 'scraped-raw.json');
const mergedOutputPath = resolve(outputDir, 'scraped.json');
const brandingOutputPath = resolve(outputDir, 'branding-v2.json');

logger.progress({ stage: 'scrape', site_id: siteId, status: 'start', detail: url });

// ──────────────────────────────────────────────────────────
// Phase 1: Branding v2
// ──────────────────────────────────────────────────────────

let branding = { logos: [], colors: [], fonts: [] };

if (!args['skip-branding']) {
  logger.info('Phase 1: Firecrawl Branding v2 extraction');
  try {
    branding = await extractBranding(url);
    writeFileSync(brandingOutputPath, JSON.stringify(branding, null, 2));
    logger.info(`Branding v2 saved to ${brandingOutputPath}`);
  } catch (e) {
    logger.warn(`Branding v2 failed: ${e.message} — continuing with scrape.mjs`);
  }
} else {
  logger.info('Phase 1: Skipping branding v2 (--skip-branding)');
}

// ──────────────────────────────────────────────────────────
// Phase 1.5: Map site URLs via Firecrawl
// ──────────────────────────────────────────────────────────

let sitePages = [];
let imagePages = [];
const imagePagePatterns = /gallery|portfolio|project|our-work|our-portfolio|service|about|team|photo|images/i;

logger.info('Phase 1.5: Mapping site URLs via Firecrawl');
try {
  const configPath = resolve(import.meta.dirname, '../config.yaml');
  const configYaml = existsSync(configPath) ? parseYaml(readFileSync(configPath, 'utf-8')) : {};
  const mapLimit = configYaml?.scraping?.firecrawl?.map_limit || 50;
  const imageScrapeActions = configYaml?.scraping?.firecrawl?.image_scrape_actions || [
    { type: 'scroll', direction: 'down' },
    { type: 'wait', milliseconds: 2000 },
    { type: 'scroll', direction: 'down' },
    { type: 'wait', milliseconds: 1000 },
  ];

  const mapResult = await map(url, { limit: mapLimit });
  sitePages = (mapResult.links || []).map(l => typeof l === 'string' ? l : l.url).filter(Boolean);
  imagePages = sitePages.filter(u => imagePagePatterns.test(u));
  logger.info(`Discovered ${sitePages.length} pages, ${imagePages.length} likely have images`);
  writeFileSync(resolve(outputDir, 'site-map.json'), JSON.stringify(sitePages, null, 2));
} catch (e) {
  logger.warn(`Site mapping failed: ${e.message} — continuing with fallback pages`);
}

// Phase 1.5b: Playwright fallback when map() fails (Fix 0 — 95% of builds hit this)
if (sitePages.length === 0) {
  logger.info('Phase 1.5b: Playwright fallback — discovering pages from nav/footer links');
  try {
    const { chromium: navChromium } = await import('playwright');
    const navBrowser = await navChromium.launch({ headless: true });
    const navPage = await navBrowser.newPage({ viewport: { width: 1440, height: 900 } });
    await navPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    const discoveredLinks = await navPage.evaluate((baseUrl) => {
      const links = new Set();
      const selectors = ['nav a', 'footer a', '.menu a', '[class*=nav] a', 'header a', '[role=navigation] a'];
      for (const sel of selectors) {
        for (const a of document.querySelectorAll(sel)) {
          const href = a.href;
          if (href && href.startsWith(baseUrl) && !href.includes('#') && !href.includes('mailto:') && !href.includes('tel:')) {
            links.add(href);
          }
        }
      }
      return [...links];
    }, new URL('/', url).origin);

    await navBrowser.close();

    if (discoveredLinks.length > 0) {
      sitePages = [...new Set(discoveredLinks)];
      imagePages = sitePages.filter(u => imagePagePatterns.test(u));
      logger.info(`Playwright discovered ${sitePages.length} pages, ${imagePages.length} likely have images`);
      writeFileSync(resolve(outputDir, 'site-map.json'), JSON.stringify(sitePages, null, 2));
    }
  } catch (e) {
    logger.warn(`Playwright page discovery failed: ${e.message}`);
  }

  // Final fallback: hardcoded common paths
  if (imagePages.length === 0) {
    const fallbackPaths = ['/gallery', '/portfolio', '/projects', '/our-work', '/our-portfolio', '/about', '/about-us', '/services', '/our-services', '/contact', '/testimonials', '/reviews', '/team', '/our-team', '/photos'];
    imagePages = fallbackPaths.map(p => new URL(p, url).href);
    logger.info(`Using ${imagePages.length} hardcoded fallback page paths`);
  }
}

// ──────────────────────────────────────────────────────────
// Phase 2: Existing scrape.mjs (7-stage pipeline)
// ──────────────────────────────────────────────────────────

logger.info('Phase 2: Running existing scrape.mjs pipeline');
const scrapeScript = resolve(import.meta.dirname, '../../scripts/onboarding/scrape.mjs');

try {
  execFileSync('node', [scrapeScript, '--url', url, '--output', scrapeOutputPath], {
    cwd: resolve(import.meta.dirname, '../../'),
    env: process.env,
    timeout: 300000, // 5 minutes — scrape.mjs does multiple pages
    maxBuffer: 50 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  logger.info(`scrape.mjs output saved to ${scrapeOutputPath}`);
} catch (e) {
  // scrape.mjs writes to stdout/stderr but still produces output file
  if (existsSync(scrapeOutputPath)) {
    logger.warn(`scrape.mjs exited with error but produced output: ${e.message?.slice(0, 100)}`);
  } else {
    logger.error(`scrape.mjs failed completely: ${e.message?.slice(0, 200)}`);
    logger.progress({ stage: 'scrape', site_id: siteId, status: 'error', detail: 'scrape.mjs failed' });
    process.exit(1);
  }
}

// Load the raw scraped data
const scraped = JSON.parse(readFileSync(scrapeOutputPath, 'utf-8'));

// ──────────────────────────────────────────────────────────
// Phase 2.1: Nav dropdown service extraction (Fix 1)
// ──────────────────────────────────────────────────────────

logger.info('Phase 2.1: Extracting services from navigation dropdowns');
try {
  const { chromium: svcChromium } = await import('playwright');
  const svcBrowser = await svcChromium.launch({ headless: true });
  const svcPage = await svcBrowser.newPage({ viewport: { width: 1440, height: 900 } });
  await svcPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Hover over nav items to trigger dropdown reveals
  const navItems = await svcPage.$$('nav li, [class*=nav] li, .menu-item');
  for (const item of navItems.slice(0, 20)) {
    try { await item.hover({ timeout: 500 }); } catch { /* ignore hover failures */ }
  }
  await svcPage.waitForTimeout(500);

  const navLinks = await svcPage.evaluate(() => {
    const links = [];
    const selectors = ['nav li a', '[class*=dropdown] a', '[class*=sub-menu] a', '.nav-item a', 'ul.menu li a', '[class*=mega-menu] a'];
    const seen = new Set();
    const excludePatterns = /^\/?$|home|about|contact|gallery|portfolio|blog|news|testimonial|review|faq|privacy|terms|sitemap|career|login/i;

    for (const sel of selectors) {
      for (const a of document.querySelectorAll(sel)) {
        const text = (a.textContent || '').trim();
        const href = a.getAttribute('href') || '';
        if (text.length > 2 && text.length < 60 && !seen.has(text.toLowerCase()) && !excludePatterns.test(text) && !excludePatterns.test(href)) {
          // Check if this link is under a "Services" parent
          const parent = a.closest('li')?.closest('ul')?.closest('li');
          const parentText = (parent?.querySelector(':scope > a')?.textContent || '').trim().toLowerCase();
          const isUnderServices = parentText.includes('service') || parentText.includes('what we do') || parentText.includes('our work') || parentText.includes('specialties');

          if (isUnderServices || /service|renovation|remodel|install|construct|repair|build|design/i.test(href)) {
            seen.add(text.toLowerCase());
            links.push({ text, href });
          }
        }
      }
    }
    return links;
  });

  await svcBrowser.close();

  if (navLinks.length > 0) {
    // Merge with existing services (fuzzy dedup)
    const existingNames = new Set((scraped.services || []).map(s => (s.name || '').toLowerCase().trim()));
    let added = 0;

    for (const link of navLinks) {
      const nameLower = link.text.toLowerCase().trim();
      // Skip if already exists (exact or substring match)
      const isDuplicate = [...existingNames].some(existing =>
        existing === nameLower ||
        existing.includes(nameLower) ||
        nameLower.includes(existing)
      );

      if (!isDuplicate) {
        if (!scraped.services) scraped.services = [];
        scraped.services.push({
          name: link.text,
          description: '',
          image_urls: [],
          _provenance: 'nav_dropdown',
        });
        existingNames.add(nameLower);
        added++;
      }
    }

    if (added > 0) {
      scraped._provenance = scraped._provenance || {};
      scraped._provenance.nav_services_added = added;
      logger.info(`Phase 2.1: Added ${added} services from nav dropdowns (total: ${scraped.services.length})`);
    } else {
      logger.info(`Phase 2.1: ${navLinks.length} nav links found but all duplicates of existing services`);
    }
  } else {
    logger.info('Phase 2.1: No service links found in nav dropdowns');
  }
} catch (e) {
  logger.warn(`Nav dropdown service extraction failed: ${e.message} — continuing without`);
}

// ──────────────────────────────────────────────────────────
// Phase 2.5: Bespoke — HTML capture via Firecrawl
// ──────────────────────────────────────────────────────────

if (args.bespoke) {
  logger.info('Phase 2.5: Capturing HTML for bespoke rebuild');
  const htmlDir = resolve(outputDir, 'html');
  mkdirSync(htmlDir, { recursive: true });

  // Try Firecrawl first, fall back to Playwright for HTML capture
  let htmlCaptured = 0;
  const fallbackPages = ['/', '/about', '/about-us', '/services', '/contact', '/gallery', '/portfolio', '/testimonials', '/reviews'];

  try {
    const FirecrawlApp = (await import('@mendable/firecrawl-js')).default;
    const firecrawlInstance = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
    // Firecrawl v4 moved scrapeUrl to .v1 — use .v1 if available, fall back to root
    const firecrawl = firecrawlInstance.v1 ?? firecrawlInstance;

    for (const pagePath of fallbackPages) {
      const pageUrl = new URL(pagePath, url).href;
      try {
        const result = await firecrawl.scrapeUrl(pageUrl, { formats: ['html'], timeout: 30000 });
        if (result.success && result.html) {
          const slug = pagePath === '/' ? 'homepage' : pagePath.replace(/^\//, '').replace(/\//g, '-');
          writeFileSync(resolve(htmlDir, `${slug}.html`), result.html);
          logger.info(`HTML captured (Firecrawl): ${slug} (${result.html.length} chars)`);
          htmlCaptured++;
        }
      } catch (e) {
        if (!e.message?.includes('404')) {
          logger.debug(`Firecrawl HTML failed for ${pagePath}: ${e.message?.slice(0, 60)}`);
        }
      }
    }
  } catch (e) {
    logger.warn(`Firecrawl HTML phase failed: ${e.message}`);
  }

  // Playwright fallback: if Firecrawl captured 0 pages, use page.content()
  if (htmlCaptured === 0) {
    logger.info('Phase 2.5b: Playwright HTML fallback (Firecrawl returned no HTML)');
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      for (const pagePath of fallbackPages) {
        const pageUrl = new URL(pagePath, url).href;
        try {
          const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
          const response = await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 20000 });
          if (response && response.status() < 400) {
            const html = await page.content();
            if (html && html.length > 500) {
              const slug = pagePath === '/' ? 'homepage' : pagePath.replace(/^\//, '').replace(/\//g, '-');
              writeFileSync(resolve(htmlDir, `${slug}.html`), html);
              logger.info(`HTML captured (Playwright): ${slug} (${html.length} chars)`);
              htmlCaptured++;
            }
          }
          await page.close();
        } catch { /* page doesn't exist or timed out — skip */ }
      }
      await browser.close();
    } catch (e) {
      logger.warn(`Playwright HTML fallback failed: ${e.message}`);
    }
  }
  logger.info(`HTML capture complete: ${htmlCaptured} page(s)`);
}

// ──────────────────────────────────────────────────────────
// Phase 2.3: Deep image scrape via Firecrawl (markdown + scroll actions)
// ──────────────────────────────────────────────────────────

const allDiscoveredImages = {};
let cssHeroUrl = null;

// Helper: filter out tiny icons, tracking pixels, and social badges
function isSubstantialImage(imgUrl) {
  if (!imgUrl || typeof imgUrl !== 'string') return false;
  const lower = imgUrl.toLowerCase();
  if (/\.(svg|gif|ico)(\?|$)/.test(lower)) return false;
  if (/gravatar|facebook\.com|instagram\.com|twitter\.com|linkedin\.com|youtube\.com|google\.com\/maps|badge|icon|logo.*small|pixel|tracking|1x1|spacer|blank|wp-includes|wp-content\/plugins/i.test(lower)) return false;
  return true;
}

logger.info('Phase 2.3: Deep image scrape via Firecrawl (markdown + scroll)');
try {
  // Filter image pages (exclude sitemaps, XML, feeds)
  const excludePatterns = /\.xml|\.pdf|sitemap|feed|rss|wp-json|\.css|\.js|tag\/|category\//i;
  const filteredImagePages = imagePages.filter(u => !excludePatterns.test(u));
  const pagesToScrape = [url, ...filteredImagePages.slice(0, 15)]; // Cap at 16 pages total
  // Use scroll actions from config.yaml (or defaults set in Phase 1.5)
  const scrollActions = typeof imageScrapeActions !== 'undefined' ? imageScrapeActions : [
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
        onlyMainContent: false,
        timeout: 45000,
      });
      // Extract image URLs from markdown
      const mdImages = [];
      let match;
      while ((match = imgRegex.exec(result.markdown || '')) !== null) {
        if (isSubstantialImage(match[1])) mdImages.push(match[1]);
      }
      imgRegex.lastIndex = 0;
      if (mdImages.length > 0) {
        allDiscoveredImages[pageUrl] = [...new Set(mdImages)];
        logger.info(`Phase 2.3: ${pageUrl} → ${allDiscoveredImages[pageUrl].length} images`);
      }
    } catch (e) {
      if (!e.message?.includes('404') && !e.message?.includes('403')) {
        logger.debug(`Firecrawl image scrape failed for ${pageUrl}: ${e.message?.slice(0, 80)}`);
      }
      // Playwright fallback for failed Firecrawl pages (Fix 0)
      try {
        const { chromium: imgChromium } = await import('playwright');
        const imgBrowser = await imgChromium.launch({ headless: true });
        const imgPage = await imgBrowser.newPage({ viewport: { width: 1440, height: 900 } });
        const resp = await imgPage.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        if (resp && resp.status() < 400) {
          // Scroll to trigger lazy-loaded images
          await imgPage.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
          await imgPage.waitForTimeout(1500);

          const pwImages = await imgPage.$$eval('img', imgs =>
            imgs.map(i => i.src || i.getAttribute('data-src') || i.getAttribute('data-lazy-src') || '')
              .filter(s => s && s.startsWith('http'))
          );
          const filtered = pwImages.filter(isSubstantialImage);
          if (filtered.length > 0) {
            allDiscoveredImages[pageUrl] = [...new Set(filtered)];
            logger.info(`Phase 2.3 (Playwright fallback): ${pageUrl} → ${filtered.length} images`);
          }
        }
        await imgBrowser.close();
      } catch { /* Playwright fallback also failed — skip this page */ }
    }
  }

  const totalImages = Object.values(allDiscoveredImages).reduce((sum, arr) => sum + arr.length, 0);
  logger.info(`Phase 2.3 complete: ${totalImages} images from ${Object.keys(allDiscoveredImages).length} pages`);
  writeFileSync(resolve(outputDir, 'all-images.json'), JSON.stringify(allDiscoveredImages, null, 2));
} catch (e) {
  logger.warn(`Deep image scrape failed: ${e.message} — continuing without`);
}

// ──────────────────────────────────────────────────────────
// Phase 2.4: CSS background hero extraction via Playwright
// ──────────────────────────────────────────────────────────

logger.info('Phase 2.4: Extracting CSS background hero image via Playwright');
try {
  const { chromium: heroChromium } = await import('playwright');
  const heroBrowser = await heroChromium.launch({ headless: true });
  const heroPage = await heroBrowser.newPage({ viewport: { width: 1440, height: 900 } });
  await heroPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  let heroBgUrl = await heroPage.evaluate(() => {
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
  await heroBrowser.close();
  if (heroBgUrl) {
    if (heroBgUrl.startsWith('/')) heroBgUrl = new URL(heroBgUrl, url).href;
    cssHeroUrl = heroBgUrl;
    logger.info(`Found CSS background hero: ${cssHeroUrl.slice(0, 100)}`);
  } else {
    logger.info('No CSS background hero found');
  }
} catch (e) {
  logger.warn(`CSS hero extraction failed: ${e.message} — continuing without`);
}

// ──────────────────────────────────────────────────────────
// Phase 2.6: About image targeted Playwright scrape (Fix 2)
// ──────────────────────────────────────────────────────────

let playwrightAboutImageUrl = null;
if (!scraped.about_image_url) {
  logger.info('Phase 2.6: Targeted about page image scrape via Playwright');
  const aboutPaths = ['/about', '/about-us', '/our-story', '/our-team', '/our-company', '/who-we-are', '/meet-the-team'];

  try {
    const { chromium: aboutChromium } = await import('playwright');
    const aboutBrowser = await aboutChromium.launch({ headless: true });

    for (const aboutPath of aboutPaths) {
      try {
        const aboutUrl = new URL(aboutPath, url).href;
        const aboutPage = await aboutBrowser.newPage({ viewport: { width: 1440, height: 900 } });
        const resp = await aboutPage.goto(aboutUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });

        if (resp && resp.status() < 400) {
          // Extract images from the about page, preferring container images
          const aboutImages = await aboutPage.evaluate(() => {
            const results = [];
            const containers = ['main', 'article', '[class*=about]', '[class*=team]', '[class*=story]', '.content', '#content'];
            const seen = new Set();

            for (const container of containers) {
              for (const img of document.querySelectorAll(`${container} img`)) {
                const src = img.src || img.getAttribute('data-src') || '';
                if (src && src.startsWith('http') && !seen.has(src) && img.naturalWidth > 300 && img.naturalHeight > 200) {
                  // Exclude logos and icons
                  const lower = src.toLowerCase();
                  if (!/logo|icon|badge|favicon|gravatar|avatar/i.test(lower)) {
                    results.push(src);
                    seen.add(src);
                  }
                }
              }
            }

            // Fallback: any large image on the page
            if (results.length === 0) {
              for (const img of document.querySelectorAll('img')) {
                const src = img.src || img.getAttribute('data-src') || '';
                if (src && src.startsWith('http') && !seen.has(src) && img.naturalWidth > 300 && img.naturalHeight > 200) {
                  const lower = src.toLowerCase();
                  if (!/logo|icon|badge|favicon|gravatar|avatar/i.test(lower)) {
                    results.push(src);
                    seen.add(src);
                  }
                }
              }
            }

            return results;
          });

          if (aboutImages.length > 0) {
            playwrightAboutImageUrl = aboutImages[0];
            logger.info(`Phase 2.6: Found about image from ${aboutPath}: ${playwrightAboutImageUrl.slice(0, 80)}`);
            await aboutPage.close();
            break;
          }
        }
        await aboutPage.close();
      } catch { /* about page doesn't exist or timed out — try next */ }
    }

    await aboutBrowser.close();
  } catch (e) {
    logger.warn(`About page image scrape failed: ${e.message} — continuing without`);
  }
}

// ──────────────────────────────────────────────────────────
// Phase 2.7: Screenshots for ALL builds + CSS tokens for bespoke
// ──────────────────────────────────────────────────────────

// Screenshots are now captured for ALL builds (not just bespoke)
// They are the primary visual data source for the pipeline
logger.info('Phase 2.7: Full-page screenshots of original site');
try {
  await captureScreenshots(url, outputDir, { timeout: 20000, mobile: true });
} catch (e) {
  logger.warn(`Screenshot capture failed: ${e.message} — continuing without`);
}

if (args.bespoke) {
  // CSS tokens (bespoke only — not needed for template builds)
  logger.info('Phase 2.7a: CSS token extraction via Playwright');
  try {
    const { extractCssTokens } = await import('./css-extract.mjs');
    const cssOutputPath = resolve(outputDir, 'css-tokens.json');
    await extractCssTokens(url, { outputFile: cssOutputPath, timeout: 60000 });
  } catch (e) {
    logger.warn(`CSS token extraction failed: ${e.message} — continuing without`);
  }
}

// ──────────────────────────────────────────────────────────
// Phase 3: Logo extraction
// ──────────────────────────────────────────────────────────

let logoResult = null;

if (!args['skip-logo']) {
  logger.info('Phase 3: Multi-level logo extraction');
  try {
    logoResult = await extractLogo(url, branding, { outputDir });
    logger.info(`Logo extraction: level=${logoResult.level}, method=${logoResult.method}, confidence=${logoResult.confidence}`);
  } catch (e) {
    logger.warn(`Logo extraction failed: ${e.message}`);
  }
} else {
  logger.info('Phase 3: Skipping logo extraction (--skip-logo)');
}

// ──────────────────────────────────────────────────────────
// Phase 4: Playwright social link extraction
// ──────────────────────────────────────────────────────────

logger.info('Phase 4: Playwright social link extraction');
try {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const SOCIAL_SELECTORS = {
    social_facebook: 'a[href*="facebook.com"]',
    social_instagram: 'a[href*="instagram.com"]',
    social_twitter: 'a[href*="twitter.com"], a[href*="x.com"]',
    social_linkedin: 'a[href*="linkedin.com"]',
    social_youtube: 'a[href*="youtube.com"]',
    social_tiktok: 'a[href*="tiktok.com"]',
    social_houzz: 'a[href*="houzz.com"], a[href*="houzz.ca"]',
    social_pinterest: 'a[href*="pinterest.com"]',
    social_google: 'a[href*="google.com/maps"], a[href*="g.co"], a[href*="goo.gl"]',
  };

  const extractedSocials = {};
  for (const [key, selector] of Object.entries(SOCIAL_SELECTORS)) {
    const href = await page.$eval(selector, el => el.href).catch(() => null);
    if (href) extractedSocials[key] = href;
  }

  await browser.close();

  if (Object.keys(extractedSocials).length > 0) {
    logger.info(`Playwright social links found: ${Object.keys(extractedSocials).join(', ')}`);
  } else {
    logger.info('No social links found via Playwright');
  }

  // Merge — Playwright fills gaps where Firecrawl missed
  for (const [key, href] of Object.entries(extractedSocials)) {
    if (!scraped[key]) {
      scraped[key] = href;
      logger.info(`Social link filled by Playwright: ${key} = ${href}`);
    }
  }
} catch (e) {
  logger.warn(`Playwright social extraction failed: ${e.message} — continuing without`);
}

// ──────────────────────────────────────────────────────────
// Merge: branding v2 overrides + logo override + deep images
// ──────────────────────────────────────────────────────────

logger.info('Merging results');
const merged = { ...scraped };

// ── Merge deep-scraped images into extracted data ──

// 1. Hero image: CSS background > largest homepage image > schema extraction
if (!merged.hero_image_url && cssHeroUrl) {
  merged.hero_image_url = cssHeroUrl;
  merged._provenance = merged._provenance || {};
  merged._provenance.hero_image_url = 'css_background';
  logger.info(`Hero image filled from CSS background: ${cssHeroUrl.slice(0, 80)}`);
}

if (!merged.hero_image_url && allDiscoveredImages[url]?.length > 0) {
  // Use the first substantial homepage image as hero
  const homepageImages = allDiscoveredImages[url].filter(isSubstantialImage);
  if (homepageImages.length > 0) {
    merged.hero_image_url = homepageImages[0];
    merged._provenance = merged._provenance || {};
    merged._provenance.hero_image_url = 'firecrawl_images_format';
    logger.info(`Hero image filled from homepage images format: ${homepageImages[0].slice(0, 80)}`);
  }
}

// 2. Portfolio: fill from gallery/portfolio/projects pages + ALL pages as fallback
if (!merged.portfolio || merged.portfolio.length === 0) {
  const candidateImages = [];

  // First: images from gallery/portfolio/project pages (highest priority)
  if (Object.keys(allDiscoveredImages).length > 0) {
    for (const [pageUrl, images] of Object.entries(allDiscoveredImages)) {
      if (/gallery|portfolio|project|our-work|our-portfolio|photo/i.test(pageUrl)) {
        for (const img of images.filter(isSubstantialImage)) {
          candidateImages.push(img);
        }
      }
    }

    // Second fallback: images from ANY page (excluding the homepage hero)
    if (candidateImages.length < 4) {
      for (const [pageUrl, images] of Object.entries(allDiscoveredImages)) {
        for (const img of images.filter(isSubstantialImage)) {
          if (!candidateImages.includes(img) && img !== merged.hero_image_url) {
            candidateImages.push(img);
          }
        }
      }
    }
  }

  // Classify portfolio candidates — filter out logos/badges (Fix 4a)
  if (candidateImages.length > 0) {
    try {
      const { projectImages } = await classifyPortfolioImages([...new Set(candidateImages)], {
        useGemini: candidateImages.length < 30, // Only use Gemini if reasonable number
      });

      const portfolioImages = projectImages.slice(0, 12).map(img => ({
        title: '',
        description: '',
        image_url: img,
        service_type: '',
        location: '',
      }));

      if (portfolioImages.length > 0) {
        merged.portfolio = portfolioImages;
        merged._provenance = merged._provenance || {};
        merged._provenance.portfolio = 'deep_scrape_classified';
        logger.info(`Portfolio filled with ${portfolioImages.length} classified project images`);
      }
    } catch (e) {
      // Fallback: use all candidates unclassified
      const portfolioImages = [...new Set(candidateImages)].slice(0, 12).map(img => ({
        title: '', description: '', image_url: img, service_type: '', location: '',
      }));
      if (portfolioImages.length > 0) {
        merged.portfolio = portfolioImages;
        merged._provenance = merged._provenance || {};
        merged._provenance.portfolio = 'deep_scrape_unclassified';
        logger.info(`Portfolio filled with ${portfolioImages.length} unclassified images (classifier failed: ${e.message})`);
      }
    }
  }
}

// 3. Service images: smart mapping from portfolio + discovered images (Fix 3)
if (merged.services?.length > 0) {
  merged.services = mapServiceImages(merged.services, merged.portfolio || [], allDiscoveredImages);
  merged._provenance = merged._provenance || {};
  merged._provenance.service_images = 'service_image_mapper';
}

// 4. About image: Playwright Phase 2.6 > deep scrape about pages > fallback
if (!merged.about_image_url) {
  // Priority 1: Playwright about page scrape (Phase 2.6)
  if (playwrightAboutImageUrl) {
    merged.about_image_url = playwrightAboutImageUrl;
    merged._provenance = merged._provenance || {};
    merged._provenance.about_image_url = 'playwright_about_page';
    logger.info(`About image filled from Playwright about page: ${playwrightAboutImageUrl.slice(0, 80)}`);
  }

  // Priority 2: Deep-scraped about/team pages
  if (!merged.about_image_url) {
    for (const [pageUrl, images] of Object.entries(allDiscoveredImages)) {
      if (/about|team/i.test(pageUrl)) {
        const substantialImages = images.filter(isSubstantialImage);
        if (substantialImages.length > 0) {
          merged.about_image_url = substantialImages[0];
          merged._provenance = merged._provenance || {};
          merged._provenance.about_image_url = 'firecrawl_deep_scrape';
          logger.info(`About image filled from deep scrape about page: ${substantialImages[0].slice(0, 80)}`);
          break;
        }
      }
    }
  }

  // Priority 3: Second-best portfolio image (not the hero)
  if (!merged.about_image_url && merged.portfolio?.length > 1) {
    const candidate = merged.portfolio.find(p => p.image_url !== merged.hero_image_url);
    if (candidate) {
      merged.about_image_url = candidate.image_url;
      merged._provenance = merged._provenance || {};
      merged._provenance.about_image_url = 'portfolio_fallback';
      logger.info(`About image filled from portfolio fallback: ${candidate.image_url.slice(0, 80)}`);
    }
  }
}

// 5. Hero quality gate — swap if logo/generic (Fix 4b)
if (merged.hero_image_url) {
  try {
    const alternativeImages = [
      ...(merged.portfolio || []).map(p => p.image_url).filter(Boolean),
      ...(Object.values(allDiscoveredImages).flat().filter(isSubstantialImage)),
    ].filter(u => u !== merged.hero_image_url);

    const heroResult = await evaluateHeroQuality(merged.hero_image_url, alternativeImages, {
      companyName: merged.business_name || '',
    });

    if (heroResult.swapped) {
      merged.hero_image_url = heroResult.url;
      merged._provenance = merged._provenance || {};
      merged._provenance.hero_image_url = `swapped: ${heroResult.reason}`;
      logger.info(`Hero image swapped (${heroResult.reason}): ${heroResult.url.slice(0, 80)}`);
    }
  } catch (e) {
    logger.debug(`Hero quality gate failed: ${e.message} — keeping current hero`);
  }
}

// Store all discovered images metadata for downstream use
merged._discovered_images = {
  total: Object.values(allDiscoveredImages).reduce((sum, arr) => sum + arr.length, 0),
  pages: Object.keys(allDiscoveredImages).length,
  css_hero: cssHeroUrl,
  site_pages_discovered: sitePages.length,
};

// Override primary colour from branding v2
if (branding.colors?.length > 0) {
  const primary = branding.colors.find(c => c.role === 'primary');
  if (primary?.hex) {
    logger.info(`Overriding primary_color_hex: ${scraped.primary_color_hex || 'none'} -> ${primary.hex}`);
    merged.primary_color_hex = primary.hex;
    // Recompute OKLCH when primary colour is overridden
    if (!merged._meta) merged._meta = {};
    merged._meta.primary_oklch = hexToOklch(primary.hex);
    logger.info(`Recomputed OKLCH: ${merged._meta.primary_oklch}`);
  }
}

// Override logo URL from logo extraction
if (logoResult?.url && logoResult.confidence >= 0.6) {
  logger.info(`Overriding logo_url: ${scraped.logo_url || 'none'} -> ${logoResult.url}`);
  merged.logo_url = logoResult.url;
}

// Add branding metadata
merged._branding = {
  colors: branding.colors || [],
  fonts: branding.fonts || [],
  personality: branding.personality || {},
  logo_extraction: logoResult ? {
    level: logoResult.level,
    method: logoResult.method,
    confidence: logoResult.confidence,
  } : null,
};

// Add trust metrics from pipeline target data (Turso DB)
try {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (tursoUrl && tursoToken) {
    const turso = createClient({ url: tursoUrl, authToken: tursoToken });
    // Look up target by URL match
    const urlBase = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const { rows } = await turso.execute({
      sql: `SELECT google_rating, google_review_count, years_in_business FROM targets WHERE website LIKE ? LIMIT 1`,
      args: [`%${urlBase}%`],
    });
    if (rows.length > 0) {
      const row = rows[0];
      const trustMetrics = {};
      if (row.google_rating) trustMetrics.google_rating = String(row.google_rating);
      if (row.google_review_count) trustMetrics.projects_completed = `${row.google_review_count}+ Reviews`;
      const yib = row.years_in_business || (merged.founded_year ? new Date().getFullYear() - Number(merged.founded_year) : null);
      if (yib && yib > 0) trustMetrics.years_in_business = String(yib);
      trustMetrics.licensed_insured = true; // Safe assumption for licensed contractors
      merged._trust_metrics = trustMetrics;
      logger.info(`Trust metrics: ${JSON.stringify(trustMetrics)}`);
    } else {
      logger.info('No Turso target found for trust metrics — skipping');
    }
  } else {
    logger.info('Turso credentials not available — skipping trust metrics');
  }
} catch (e) {
  logger.warn(`Trust metrics extraction failed: ${e.message}`);
}

// ──────────────────────────────────────────────────────────
// Completeness score — weighted field presence (0-100)
// ──────────────────────────────────────────────────────────

const completenessFields = {
  business_name: { weight: 10, check: () => Boolean(merged.business_name) },
  phone: { weight: 10, check: () => Boolean(merged.phone) },
  email: { weight: 10, check: () => Boolean(merged.email) },
  logo_url: { weight: 10, check: () => Boolean(merged.logo_url) },
  primary_color_hex: { weight: 8, check: () => Boolean(merged.primary_color_hex) },
  testimonials_2plus: { weight: 8, check: () => (merged.testimonials || []).length >= 2 },
  services_2plus: { weight: 8, check: () => (merged.services || []).length >= 2 },
  portfolio_1plus: { weight: 6, check: () => (merged.portfolio || []).length >= 1 },
  about_copy: { weight: 6, check: () => (merged.about_copy || []).length > 0 },
  social_any: { weight: 5, check: () => ['social_facebook', 'social_instagram', 'social_houzz', 'social_google', 'social_twitter', 'social_linkedin', 'social_youtube', 'social_tiktok', 'social_pinterest'].some(k => Boolean(merged[k])) },
  hero_image_url: { weight: 5, check: () => Boolean(merged.hero_image_url) },
  about_image_url: { weight: 4, check: () => Boolean(merged.about_image_url) },
  team_members: { weight: 4, check: () => (merged.team_members || []).length > 0 },
  mission: { weight: 3, check: () => Boolean(merged.mission) },
  business_hours_valid: { weight: 3, check: () => {
    const h = merged.business_hours;
    if (!h || typeof h !== 'string') return false;
    const lower = h.trim().toLowerCase();
    return !['n/a', 'na', 'not available', 'not specified', 'unknown', 'none', '', '-'].includes(lower);
  }},
};

let completenessScore = 0;
const missingFields = [];
for (const [field, { weight, check }] of Object.entries(completenessFields)) {
  if (check()) {
    completenessScore += weight;
  } else {
    missingFields.push(field);
  }
}

merged._completeness = { score: completenessScore, missing: missingFields };
logger.info(`Completeness score: ${completenessScore}/100 — missing: ${missingFields.join(', ') || 'none'}`);
logger.progress({ stage: 'scrape', site_id: siteId, status: 'scored', completeness: completenessScore, missing: missingFields });

// Write merged output
writeFileSync(mergedOutputPath, JSON.stringify(merged, null, 2));
logger.info(`Merged output saved to ${mergedOutputPath}`);

logger.progress({ stage: 'scrape', site_id: siteId, status: 'complete', detail: `output: ${mergedOutputPath}`, completeness: completenessScore });

// Output the path for downstream scripts
console.log(mergedOutputPath);
