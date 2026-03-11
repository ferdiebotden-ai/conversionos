#!/usr/bin/env node
/**
 * Bespoke Architect — vision-first analysis of a target website to
 * produce a blueprint where every visual section becomes a custom section.
 *
 * Primary: GPT 5.4 via Codex 0.114.0 with --image (vision-first)
 * Fallback: Opus 4.6 via claude -p (text-only, same as pre-overhaul)
 *
 * Usage:
 *   import { bespokeArchitect } from './bespoke-architect.mjs';
 *   const blueprint = await bespokeArchitect('./results/2026-03-10/example/', 'example');
 */

import { architectWithVision } from './lib/gpt54-architect.mjs';
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
 * Strategy:
 * 1. Try GPT 5.4 vision architect (Codex 0.114.0 with screenshots)
 * 2. Fall back to Opus 4.6 text-only if vision fails
 * 3. Fall back to static fallback blueprint if both fail
 *
 * @param {string} resultsDir - Path to results directory containing scraped.json, html/, css-tokens.json, screenshots/original/
 * @param {string} siteId - The tenant site ID (used for custom section IDs)
 * @param {object} [options]
 * @param {number} [options.maxRetries=1]
 * @param {number} [options.timeoutMs=300000]
 * @returns {Promise<object>} SiteBlueprint v2 with bespoke custom sections
 */
export async function bespokeArchitect(resultsDir, siteId, { maxRetries = 1, timeoutMs = 300000 } = {}) {
  const scrapedPath = join(resultsDir, 'scraped.json');
  if (!existsSync(scrapedPath)) throw new Error(`No scraped.json at ${scrapedPath}`);

  const scraped = JSON.parse(readFileSync(scrapedPath, 'utf-8'));
  const screenshotDir = join(resultsDir, 'screenshots/original');
  const hasScreenshots = existsSync(screenshotDir) && readdirSync(screenshotDir).some(f => f.endsWith('.png'));

  // ── Strategy 1: GPT 5.4 Vision Architect (primary) ──
  if (hasScreenshots) {
    logger.info('Bespoke Architect: trying GPT 5.4 vision (primary)');
    try {
      const blueprint = await architectWithVision(resultsDir, siteId, { timeoutMs, maxRetries });
      logger.info(`Vision Architect succeeded: ${blueprint.pages.length} pages, ${blueprint.customSections?.length ?? 0} custom sections`);
      return blueprint;
    } catch (err) {
      logger.warn(`Vision Architect failed: ${err.message?.slice(0, 200)} — falling back to Opus text-only`);
    }
  } else {
    logger.info('Bespoke Architect: no screenshots available — using Opus text-only');
  }

  // ── Strategy 2: Opus 4.6 text-only (fallback) ──
  logger.info('Bespoke Architect: trying Opus 4.6 text-only (fallback)');
  const cssTokens = loadJsonIfExists(join(resultsDir, 'css-tokens.json'));
  const htmlFiles = loadHtmlFiles(join(resultsDir, 'html'));

  const prompt = buildOpusFallbackPrompt(scraped, cssTokens, htmlFiles, siteId);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const raw = await callOpus(prompt, { timeoutMs: Math.min(timeoutMs, 360000) });
      const result = validateBlueprint(raw);
      if (result.success) {
        const bp = result.data;
        logger.info(`Opus Architect: ${bp.pages.length} pages, ${bp.customSections?.length ?? 0} custom sections`);
        return bp;
      }
      logger.warn(`Opus Architect: Zod validation failed (attempt ${attempt + 1}): ${result.error.message}`);
    } catch (err) {
      logger.warn(`Opus Architect: Call failed (attempt ${attempt + 1}): ${err.message}`);
    }
  }

  // ── Strategy 3: Static fallback blueprint ──
  logger.warn('Bespoke Architect: All strategies failed — using fallback blueprint');
  return getFallbackBespokeBlueprint(scraped, siteId);
}

/**
 * Build the Opus text-only prompt (same structure as original, kept as fallback).
 */
function buildOpusFallbackPrompt(scraped, cssTokens, htmlFiles, siteId) {
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

  let htmlSummary = 'Not available';
  if (htmlFiles.homepage) {
    htmlSummary = htmlFiles.homepage.slice(0, 4000) + (htmlFiles.homepage.length > 4000 ? '\n... [truncated]' : '');
  }

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

1. **Analyse the HTML structure** to identify each distinct visual section of each page
2. **For each visual section**, decide CUSTOM or STANDARD
3. **Do NOT create a custom footer section.** The platform has a global Footer component that renders on all pages automatically. Never include a section with "footer" in the name or ID.
3. **Custom section specs must include:** sectionId, name, spec (detailed visual description), layout, background, typography, spacing, animations, contentMapping (camelCase field names), cssHints, integrationNotes
4. **Theme**: Extract exact values from CSS tokens
5. **Homepage should have 6-12 custom sections**
6. **Inner pages** should start with misc:breadcrumb-hero then custom sections

## Standard Sections (use ONLY where data-driven sections are adequate)
${standardCatalogue}

## OUTPUT FORMAT
Return ONLY valid JSON (no markdown, no explanation):
{
  "pages": [
    {
      "slug": "homepage",
      "title": "...",
      "sections": [{ "sectionId": "custom:${siteId}-hero" }, ...]
    },
    { "slug": "about", "title": "...", "sections": [...] },
    { "slug": "services", "title": "...", "sections": [...] },
    { "slug": "contact", "title": "...", "sections": [...] },
    { "slug": "projects", "title": "...", "sections": [...] }
  ],
  "theme": {
    "colors": { "primary": "oklch(...)", "secondary": "oklch(...)", "accent": "oklch(...)" },
    "typography": { "headingFont": "...", "bodyFont": "..." },
    "borderRadius": "...",
    "spacing": "compact|default|spacious",
    "animationPreset": "fade-in-up|stagger-reveal|slide-in-left|none"
  },
  "customSections": [
    {
      "sectionId": "custom:${siteId}-hero",
      "name": "Hero Section",
      "spec": "Full-width hero with dark image overlay...",
      "layout": { "type": "full-width", "height": "100vh", "columns": null, "alignment": "center", "flexDirection": "column" },
      "background": { "type": "image-overlay", "overlayOpacity": 0.55, "overlayGradient": "..." },
      "typography": { "headingSize": "clamp(2.5rem, 5vw, 4rem)", "headingWeight": 700, "bodySize": "1.125rem" },
      "spacing": { "paddingY": "0", "gap": "1.5rem", "innerPadding": "2rem" },
      "animations": ["parallax-bg", "stagger-text"],
      "contentMapping": { "heading": "heroHeadline", "subheading": "heroSubheadline", "backgroundImage": "heroImageUrl" },
      "cssHints": "...",
      "integrationNotes": "Primary CTA links to /visualizer"
    }
  ],
  "contentElevation": []
}`;
}

/**
 * Fallback blueprint when all strategies fail.
 */
function getFallbackBespokeBlueprint(scraped, siteId) {
  const hasTestimonials = (scraped.testimonials?.length ?? 0) >= 2;
  const hasPortfolio = scraped.portfolio?.length > 0;
  const hasProcessSteps = scraped.process_steps?.length > 0;
  const hasWhyChooseUs = scraped.why_choose_us?.length > 0;

  const customSections = [
    {
      sectionId: `custom:${siteId}-hero`,
      name: 'Hero Section',
      spec: 'Full-width hero with background image, overlay, headline, and CTA buttons. Match the original site colours and typography.',
      contentMapping: { heading: 'heroHeadline', subheading: 'heroSubheadline', backgroundImage: 'heroImageUrl' },
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
      contentMapping: { aboutText: 'aboutCopy', aboutImage: 'aboutImageUrl' },
      integrationNotes: 'None',
    },
    // NOTE: No custom footer section — the platform's global Footer component
    // renders on all pages automatically. Custom footers cause double/missing footer bugs.
  ];

  if (hasTestimonials) {
    customSections.push({
      sectionId: `custom:${siteId}-testimonials`,
      name: 'Testimonials',
      spec: 'Testimonial display matching original site style. Cards, carousel, or masonry layout with client names and review text.',
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

  if (hasProcessSteps) {
    customSections.push({
      sectionId: `custom:${siteId}-process`,
      name: 'Our Process',
      spec: 'Step-by-step process timeline or numbered cards showing how the company works. Vertical or horizontal layout with icons or numbers for each step.',
      contentMapping: 'process_steps array',
      integrationNotes: 'None',
    });
  }

  if (hasWhyChooseUs) {
    customSections.push({
      sectionId: `custom:${siteId}-why-us`,
      name: 'Why Choose Us',
      spec: 'Trust-building section with icon cards or feature blocks highlighting competitive advantages and unique selling points.',
      contentMapping: 'why_choose_us array',
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
          ...(hasWhyChooseUs ? [{ sectionId: `custom:${siteId}-why-us` }] : []),
          { sectionId: `custom:${siteId}-about` },
          ...(hasProcessSteps ? [{ sectionId: `custom:${siteId}-process` }] : []),
          ...(hasPortfolio ? [{ sectionId: `custom:${siteId}-gallery` }] : []),
          ...(hasTestimonials ? [{ sectionId: `custom:${siteId}-testimonials` }] : []),
          { sectionId: 'cta:full-width-primary' },
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
