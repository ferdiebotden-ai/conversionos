#!/usr/bin/env node
/**
 * Bespoke Architect — Opus 4.6 analyses a target website's visual structure
 * and produces a blueprint where every visual section becomes a custom section
 * that matches the original site's design.
 *
 * Unlike architect.mjs (which picks from 50 standard sections), this module
 * analyses HTML + CSS tokens + screenshots to identify the original page structure
 * and creates detailed Codex build specs for each section.
 *
 * Usage:
 *   import { bespokeArchitect } from './bespoke-architect.mjs';
 *   const blueprint = await bespokeArchitect('./results/2026-03-10/example/', 'example');
 */

import { callOpus } from './lib/opus-cli.mjs';
import { validateBlueprint } from './schemas/site-blueprint-v2.zod.mjs';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import * as logger from './lib/logger.mjs';

// Standard sections that genuinely work as-is (no visual matching needed)
const STANDARD_SECTIONS = [
  { id: 'trust:badge-strip', desc: 'Trust badge strip (years, projects, rating). Data-driven, not visual.' },
  { id: 'trust:stats-counter', desc: 'Animated stat counters. Data-driven.' },
  { id: 'cta:full-width-primary', desc: 'Full-width CTA band. Generic enough to match any brand.' },
  { id: 'cta:inline-card', desc: 'Inline CTA card. Subtle, brand-coloured.' },
  { id: 'misc:visualizer-teaser', desc: 'AI Design Studio teaser — ConversionOS differentiator.' },
  { id: 'misc:breadcrumb-hero', desc: 'Compact breadcrumb hero for inner pages.' },
  { id: 'misc:faq-accordion', desc: 'FAQ accordion. Content-driven, not visual.' },
  { id: 'misc:process-steps', desc: 'Process steps (how it works). Data-driven.' },
];

/**
 * Analyse a target website and produce a bespoke SiteBlueprint v2.
 *
 * @param {string} resultsDir - Path to results directory containing scraped.json, html/, css-tokens.json, screenshots/original/
 * @param {string} siteId - The tenant site ID (used for custom section IDs)
 * @param {object} [options]
 * @param {number} [options.maxRetries=1]
 * @param {number} [options.timeoutMs=180000]
 * @returns {Promise<object>} SiteBlueprint v2 with bespoke custom sections
 */
export async function bespokeArchitect(resultsDir, siteId, { maxRetries = 1, timeoutMs = 180000 } = {}) {
  const scrapedPath = join(resultsDir, 'scraped.json');
  if (!existsSync(scrapedPath)) throw new Error(`No scraped.json at ${scrapedPath}`);

  const scraped = JSON.parse(readFileSync(scrapedPath, 'utf-8'));

  // Load bespoke-specific data
  const cssTokens = loadJsonIfExists(join(resultsDir, 'css-tokens.json'));
  const htmlFiles = loadHtmlFiles(join(resultsDir, 'html'));
  const screenshotPaths = discoverOriginalScreenshots(join(resultsDir, 'screenshots/original'));

  const prompt = buildBespokePrompt(scraped, cssTokens, htmlFiles, screenshotPaths, siteId);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const raw = await callOpus(prompt, { timeoutMs });
      const result = validateBlueprint(raw);
      if (result.success) {
        const bp = result.data;
        logger.info(`Bespoke Architect: ${bp.pages.length} pages, ${bp.customSections?.length ?? 0} custom sections`);
        return bp;
      }
      logger.warn(`Bespoke Architect: Zod validation failed (attempt ${attempt + 1}): ${result.error.message}`);
    } catch (err) {
      logger.warn(`Bespoke Architect: Call failed (attempt ${attempt + 1}): ${err.message}`);
    }
  }

  // Fallback: all-custom blueprint with basic specs
  logger.warn('Bespoke Architect: All attempts failed — using fallback bespoke blueprint');
  return getFallbackBespokeBlueprint(scraped, siteId);
}

/**
 * Build the Opus prompt for bespoke visual analysis.
 */
function buildBespokePrompt(scraped, cssTokens, htmlFiles, screenshotPaths, siteId) {
  const standardCatalogue = STANDARD_SECTIONS
    .map(s => `  ${s.id} — ${s.desc}`)
    .join('\n');

  const scrapedSummary = JSON.stringify({
    business_name: scraped.business_name,
    tagline: scraped.tagline,
    hero_headline: scraped.hero_headline,
    services: scraped.services?.map(s => ({ name: s.name, hasImages: (s.image_urls?.length ?? 0) > 0 })) ?? [],
    testimonial_count: scraped.testimonials?.length ?? 0,
    portfolio_count: scraped.portfolio?.length ?? 0,
    city: scraped.city,
    primary_color_hex: scraped.primary_color_hex,
    primary_color_oklch: scraped._meta?.primary_oklch,
    has_about_copy: Boolean(scraped.about_text || scraped.about_copy),
    has_team: Boolean(scraped.team_members?.length),
  }, null, 2);

  // CSS tokens summary (trimmed for prompt size)
  let cssTokensSummary = 'Not available';
  if (cssTokens) {
    const trimmed = {
      renderedFonts: cssTokens.renderedFonts,
      customProperties: cssTokens.customProperties,
      bodyStyles: cssTokens.elements?.body,
      h1Styles: cssTokens.elements?.h1,
      h2Styles: cssTokens.elements?.h2,
      buttonStyles: cssTokens.elements?.button,
      borderRadii: cssTokens.borderRadii,
      spacingRhythm: cssTokens.spacingRhythm?.slice(0, 5),
      backgrounds: cssTokens.backgrounds?.slice(0, 4),
    };
    cssTokensSummary = JSON.stringify(trimmed, null, 2);
  }

  // HTML structure summary (first 4000 chars of homepage HTML)
  let htmlSummary = 'Not available';
  if (htmlFiles.homepage) {
    htmlSummary = htmlFiles.homepage.slice(0, 4000) + (htmlFiles.homepage.length > 4000 ? '\n... [truncated]' : '');
  }

  // Available pages from HTML
  const availablePages = Object.keys(htmlFiles);

  return `You are a website architecture analyst. Your task is to analyse a contractor's existing website and produce a bespoke rebuild blueprint.

## GOAL
Identify every visual section of the original website and create a custom section spec for each one that Codex can use to rebuild it. The rebuilt site should look like THEIR website — same colours, same layout flow, same typography feel — but enhanced with smoother animations, better responsiveness, and enterprise-grade polish.

## ORIGINAL SITE DATA

### Scraped Content
${scrapedSummary}

### CSS Tokens (computed styles from live site)
${cssTokensSummary}

### Original Homepage HTML Structure
\`\`\`html
${htmlSummary}
\`\`\`

### Available HTML Pages
${availablePages.length > 0 ? availablePages.join(', ') : 'None captured'}

## INSTRUCTIONS

1. **Analyse the HTML structure** to identify each distinct visual section of each page (hero, navigation bar, content blocks, service cards, testimonial area, footer, etc.)

2. **For each visual section**, decide:
   - **CUSTOM** (most sections): Create a custom section spec that Codex will rebuild to match the original design
   - **STANDARD** (only when genuinely appropriate): Use one of our standard data-driven sections (see catalogue below)

3. **Custom section specs must include:**
   - sectionId: \`custom:${siteId}-{section-name}\` (e.g., \`custom:${siteId}-hero\`)
   - name: Human-readable name
   - spec: DETAILED visual description — layout (grid/flex, columns, alignment), background treatment (colour, gradient, image, clip-path), spacing, shadows, borders, any decorative elements
   - layout: Structured object with type (full-width/contained/split/grid/flex), height, columns (number or null), alignment, flexDirection
   - background: Structured object with type (image-overlay/gradient/solid/none/video), overlayOpacity (0-1), overlayGradient (CSS string)
   - typography: Structured object with headingSize (CSS clamp or rem), headingWeight (number), bodySize (CSS rem)
   - spacing: Structured object with paddingY, gap, innerPadding (all CSS values)
   - animations: Array of animation presets used (e.g., ["parallax-bg", "stagger-text", "fade-in-up", "count-up", "slide-in-left"])
   - contentMapping: Structured object mapping UI slots to data field names from company_profile (use camelCase: heroHeadline, heroImageUrl, aboutCopy, etc.)
   - cssHints: Specific CSS properties from the css-tokens that apply (exact font families, colours, border-radius values, spacing rhythm)
   - integrationNotes: How ConversionOS features integrate (e.g., "Replace contact form with /visualizer CTA link")

4. **Theme**: Extract exact values from CSS tokens — don't guess. Use rendered fonts, computed colours (convert to OKLCH), exact border-radius values.

5. **Homepage should have 6-12 custom sections** (hero + nav + content blocks + CTA + footer)
6. **Inner pages** should start with misc:breadcrumb-hero (standard) then custom sections matching the original page layout

## Standard Sections (use ONLY where data-driven sections are adequate)
${standardCatalogue}

## OUTPUT FORMAT
Return ONLY valid JSON (no markdown, no explanation):
{
  "pages": [
    {
      "slug": "homepage",
      "title": "...",
      "sections": [{ "sectionId": "custom:${siteId}-hero" }, { "sectionId": "trust:badge-strip" }, ...]
    },
    { "slug": "about", "title": "...", "sections": [...] },
    { "slug": "services", "title": "...", "sections": [...] },
    { "slug": "contact", "title": "...", "sections": [...] },
    { "slug": "projects", "title": "...", "sections": [...] }
  ],
  "theme": {
    "colors": {
      "primary": "oklch(...)",
      "secondary": "oklch(...)",
      "accent": "oklch(...)"
    },
    "typography": {
      "headingFont": "exact font from renderedFonts",
      "bodyFont": "exact font from renderedFonts"
    },
    "borderRadius": "exact value from css-tokens",
    "spacing": "compact|default|spacious",
    "animationPreset": "fade-in-up|stagger-reveal|slide-in-left|none"
  },
  "customSections": [
    {
      "sectionId": "custom:${siteId}-hero",
      "name": "Hero Section",
      "spec": "Full-width hero with dark image overlay, centred text, two CTA buttons",
      "layout": {
        "type": "full-width",
        "height": "100vh",
        "columns": null,
        "alignment": "center",
        "flexDirection": "column"
      },
      "background": {
        "type": "image-overlay",
        "overlayOpacity": 0.55,
        "overlayGradient": "linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.7))"
      },
      "typography": {
        "headingSize": "clamp(2.5rem, 5vw, 4rem)",
        "headingWeight": 700,
        "bodySize": "1.125rem"
      },
      "spacing": {
        "paddingY": "0",
        "gap": "1.5rem",
        "innerPadding": "2rem"
      },
      "animations": ["parallax-bg", "stagger-text"],
      "contentMapping": {
        "heading": "heroHeadline",
        "subheading": "heroSubheadline",
        "backgroundImage": "heroImageUrl",
        "ctaText": "Get Your Free Design Estimate",
        "ctaLink": "/visualizer"
      },
      "cssHints": "font-family: Montserrat; h1 font-size: 48px;",
      "integrationNotes": "Primary CTA links to /visualizer, secondary to /services"
    }
  ],
  "contentElevation": []
}`;
}

/**
 * Fallback blueprint when Opus fails — creates basic custom section stubs.
 */
function getFallbackBespokeBlueprint(scraped, siteId) {
  const hasTestimonials = scraped.testimonials?.length > 0;
  const hasPortfolio = scraped.portfolio?.length > 0;

  const customSections = [
    {
      sectionId: `custom:${siteId}-hero`,
      name: 'Hero Section',
      spec: 'Full-width hero with background image, overlay, headline, and CTA buttons. Match the original site colours and typography.',
      contentMapping: 'hero_headline, hero_image_url, tagline',
      integrationNotes: 'Primary CTA links to /visualizer',
    },
    {
      sectionId: `custom:${siteId}-services`,
      name: 'Services Section',
      spec: 'Service cards or grid matching the original layout. Show service names, descriptions, and images.',
      contentMapping: 'services array',
      integrationNotes: 'Service cards can link to /services#{service-slug}',
    },
    {
      sectionId: `custom:${siteId}-about`,
      name: 'About Section',
      spec: 'Company about section matching original layout. Text and image side by side or stacked.',
      contentMapping: 'about_text, about_image_url',
      integrationNotes: 'None',
    },
    {
      sectionId: `custom:${siteId}-footer`,
      name: 'Footer',
      spec: 'Footer matching original site structure with contact info, nav links, social links.',
      contentMapping: 'phone, email, address, social links',
      integrationNotes: 'None',
    },
  ];

  if (hasTestimonials) {
    customSections.push({
      sectionId: `custom:${siteId}-testimonials`,
      name: 'Testimonials',
      spec: 'Testimonial display matching original site style. Cards, carousel, or masonry.',
      contentMapping: 'testimonials array',
      integrationNotes: 'None',
    });
  }

  if (hasPortfolio) {
    customSections.push({
      sectionId: `custom:${siteId}-gallery`,
      name: 'Project Gallery',
      spec: 'Project showcase matching original layout. Grid or masonry with images.',
      contentMapping: 'portfolio array',
      integrationNotes: 'None',
    });
  }

  return {
    pages: [
      {
        slug: 'homepage',
        title: scraped.business_name || 'Home',
        sections: [
          { sectionId: `custom:${siteId}-hero` },
          { sectionId: 'trust:badge-strip' },
          { sectionId: 'misc:visualizer-teaser' },
          { sectionId: `custom:${siteId}-services` },
          { sectionId: `custom:${siteId}-about` },
          ...(hasPortfolio ? [{ sectionId: `custom:${siteId}-gallery` }] : []),
          ...(hasTestimonials ? [{ sectionId: `custom:${siteId}-testimonials` }] : []),
          { sectionId: 'cta:full-width-primary' },
          { sectionId: `custom:${siteId}-footer` },
        ],
      },
      {
        slug: 'about',
        title: `About ${scraped.business_name || 'Us'}`,
        sections: [
          { sectionId: 'misc:breadcrumb-hero' },
          { sectionId: `custom:${siteId}-about` },
          { sectionId: 'trust:badge-strip' },
          { sectionId: 'cta:full-width-primary' },
        ],
      },
      {
        slug: 'services',
        title: 'Our Services',
        sections: [
          { sectionId: 'misc:breadcrumb-hero' },
          { sectionId: `custom:${siteId}-services` },
          { sectionId: 'cta:full-width-primary' },
        ],
      },
      {
        slug: 'contact',
        title: 'Contact Us',
        sections: [
          { sectionId: 'misc:breadcrumb-hero' },
          { sectionId: 'cta:full-width-primary' },
        ],
      },
      {
        slug: 'projects',
        title: 'Our Work',
        sections: [
          { sectionId: 'misc:breadcrumb-hero' },
          ...(hasPortfolio ? [{ sectionId: `custom:${siteId}-gallery` }] : []),
          { sectionId: 'cta:full-width-primary' },
        ],
      },
    ],
    theme: {
      colors: {
        primary: scraped._meta?.primary_oklch || null,
        secondary: null,
        accent: null,
      },
      typography: {
        headingFont: 'Plus Jakarta Sans',
        bodyFont: 'DM Sans',
      },
      borderRadius: '0.75rem',
      spacing: 'default',
      animationPreset: 'fade-in-up',
    },
    customSections,
    contentElevation: [],
  };
}

// ─── Helpers ────────────────────────────────────────────────────

function loadJsonIfExists(path) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function loadHtmlFiles(htmlDir) {
  const files = {};
  if (!existsSync(htmlDir)) return files;
  try {
    for (const f of readdirSync(htmlDir)) {
      if (f.endsWith('.html')) {
        const slug = f.replace('.html', '');
        files[slug] = readFileSync(join(htmlDir, f), 'utf-8');
      }
    }
  } catch { /* directory read error */ }
  return files;
}

function discoverOriginalScreenshots(screenshotDir) {
  const paths = [];
  if (!existsSync(screenshotDir)) return paths;
  try {
    for (const f of readdirSync(screenshotDir)) {
      if (f.endsWith('.png') || f.endsWith('.jpg')) {
        paths.push(join(screenshotDir, f));
      }
    }
  } catch { /* directory read error */ }
  return paths;
}
