#!/usr/bin/env node
/**
 * AI Architect Module — Opus 4.6 analyses a target website and produces
 * a SiteBlueprint v2 JSON specifying per-page section layouts, theme
 * customisation, and custom section specifications.
 *
 * Usage:
 *   import { architectSite } from './architect.mjs';
 *   const blueprint = await architectSite('./results/2026-03-10/example/');
 */

import { callOpus } from './lib/opus-cli.mjs';
import { validateBlueprint } from './schemas/site-blueprint-v2.zod.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as logger from './lib/logger.mjs';

// Available section catalogue — all registered sections with descriptions
const AVAILABLE_SECTIONS = [
  // Hero (pick one per page, usually homepage only)
  { id: 'hero:full-bleed-overlay', desc: 'Full-width hero with background image/aurora overlay, badge strip, dual CTA buttons' },
  { id: 'hero:split-image-text', desc: 'Two-column hero: text left, image right. Clean corporate feel.' },
  { id: 'hero:editorial-centered', desc: 'Centred editorial hero with large headline. Minimal, elegant.' },
  { id: 'hero:video-background', desc: 'Video background hero with overlay text. High-impact.' },
  { id: 'hero:gradient-text', desc: 'Gradient-coloured headline hero. Modern tech aesthetic.' },
  { id: 'hero:visualizer-teardown', desc: 'RECOMMENDED DEFAULT. Split hero: headline+CTA left, before/after frame scrubber right. 5 style tabs, AI-powered badge. Premium feel with construction teardown animation.' },

  // Services
  { id: 'services:grid-3-cards', desc: '3-column card grid of services with images, name, description, CTA.' },
  { id: 'services:grid-2-cards', desc: '2-column wider service cards. Better for fewer services.' },
  { id: 'services:accordion-list', desc: 'Expandable accordion list of services. Compact, text-heavy.' },
  { id: 'services:alternating-rows', desc: 'Alternating image-text rows per service. Storytelling layout.' },
  { id: 'services:bento', desc: 'Bento grid layout for services. Modern, visual-heavy.' },

  // Trust
  { id: 'trust:badge-strip', desc: 'Horizontal strip of trust badges (years, projects, rating, warranty).' },
  { id: 'trust:stats-counter', desc: 'Animated counters for key metrics (projects, years, satisfaction).' },
  { id: 'trust:certifications', desc: 'Certification badges and membership display.' },
  { id: 'trust:review-aggregate', desc: 'Google review aggregate (star rating, count, recent quotes).' },

  // Testimonials
  { id: 'testimonials:cards-carousel', desc: 'Horizontal carousel of testimonial cards with name, quote, rating.' },
  { id: 'testimonials:single-featured', desc: 'Single large featured testimonial with photo. High impact.' },
  { id: 'testimonials:masonry', desc: 'Masonry grid of testimonials. Visual variety.' },
  { id: 'testimonials:minimal-quotes', desc: 'Minimal text-only quotes. Clean, understated.' },

  // Gallery/Portfolio
  { id: 'gallery:masonry-grid', desc: 'Masonry photo grid with lightbox. Shows portfolio breadth.' },
  { id: 'gallery:before-after-slider', desc: 'Before/after comparison slider. Great for renovation showcase.' },
  { id: 'gallery:lightbox', desc: 'Click-to-expand photo gallery with full-screen lightbox.' },
  { id: 'gallery:editorial-featured', desc: 'Magazine-style featured project layout. Premium feel.' },

  // About
  { id: 'about:split-image-copy', desc: 'Two-column: company story text + team/work image.' },
  { id: 'about:timeline', desc: 'Company timeline showing key milestones.' },
  { id: 'about:team-grid', desc: 'Team member photo cards with name, role, bio.' },
  { id: 'about:values-cards', desc: 'Company values in icon+text cards. Mission-driven.' },

  // Contact
  { id: 'contact:form-with-map', desc: 'Contact form + embedded map. Full-featured.' },
  { id: 'contact:form-simple', desc: 'Simple contact form only. Minimal.' },
  { id: 'contact:details-sidebar', desc: 'Contact info sidebar (phone, email, hours) + form.' },
  { id: 'contact:contact-cards', desc: 'Contact info in cards (phone, email, location). No form.' },

  // CTA
  { id: 'cta:full-width-primary', desc: 'Full-width CTA band with heading, subtitle, button.' },
  { id: 'cta:split-with-image', desc: 'Split CTA: text left, image right.' },
  { id: 'cta:floating-banner', desc: 'Floating CTA banner. Attention-grabbing.' },
  { id: 'cta:inline-card', desc: 'Inline CTA card. Subtle, integrated.' },

  // Footer (selected in layout but rendered by layout.tsx)
  { id: 'footer:multi-column-3', desc: '3-column footer with nav, contact, hours.' },
  { id: 'footer:multi-column-4', desc: '4-column footer with extended nav.' },
  { id: 'footer:simple-centered', desc: 'Simple centred footer. Minimal.' },
  { id: 'footer:minimal-bar', desc: 'Single-line footer bar. Ultra-minimal.' },

  // Misc
  { id: 'misc:process-steps', desc: 'Step-by-step process (how it works). 3-step numbered circles.' },
  { id: 'misc:faq-accordion', desc: 'Expandable FAQ accordion.' },
  { id: 'misc:service-area-map', desc: 'Service area with map display.' },
  { id: 'misc:partner-logos', desc: 'Partner/supplier logo strip.' },
  { id: 'misc:visualizer-teaser', desc: 'AI Design Studio teaser with CTA. ConversionOS differentiator.' },
  { id: 'misc:breadcrumb-hero', desc: 'Compact hero with breadcrumb navigation (Home > Page). Used for inner pages.' },
  { id: 'misc:mission-statement', desc: 'Company mission statement. Full-width primary-colour band.' },
  { id: 'misc:service-area', desc: 'Service area text display with map pin icon.' },
];

/**
 * Analyse a scraped target website and produce a SiteBlueprint v2.
 *
 * @param {string} resultsDir - Path to results directory containing scraped.json
 * @param {object} [options]
 * @param {number} [options.maxRetries=1] - Number of retry attempts
 * @param {number} [options.timeoutMs=120000] - Timeout per attempt
 * @returns {Promise<object>} Validated SiteBlueprint v2 object
 */
export async function architectSite(resultsDir, { maxRetries = 1, timeoutMs = 120000 } = {}) {
  const scrapedPath = join(resultsDir, 'scraped.json');
  if (!existsSync(scrapedPath)) throw new Error(`No scraped.json at ${scrapedPath}`);

  const scraped = JSON.parse(readFileSync(scrapedPath, 'utf-8'));
  const prompt = buildArchitectPrompt(scraped);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const raw = await callOpus(prompt, { timeoutMs });
      const result = validateBlueprint(raw);
      if (result.success) {
        const bp = result.data;
        logger.info(`Architect: Blueprint generated (${bp.pages.length} pages, ${bp.customSections?.length ?? 0} custom sections)`);
        return bp;
      }
      logger.warn(`Architect: Zod validation failed (attempt ${attempt + 1}): ${result.error.message}`);
    } catch (err) {
      logger.warn(`Architect: Call failed (attempt ${attempt + 1}): ${err.message}`);
    }
  }

  // Fallback: return default blueprint (backward-compatible)
  logger.warn('Architect: All attempts failed — using default blueprint');
  return getDefaultBlueprint(scraped);
}

/**
 * Build the analysis prompt for Opus 4.6.
 */
function buildArchitectPrompt(scraped) {
  const sectionCatalogue = AVAILABLE_SECTIONS
    .map(s => `  ${s.id} — ${s.desc}`)
    .join('\n');

  const scrapedSummary = JSON.stringify({
    business_name: scraped.business_name,
    tagline: scraped.tagline,
    hero_headline: scraped.hero_headline,
    services: scraped.services?.map(s => s.name) ?? [],
    testimonial_count: scraped.testimonials?.length ?? 0,
    portfolio_count: scraped.portfolio?.length ?? 0,
    certifications: scraped.certifications ?? [],
    city: scraped.city,
    province: scraped.province,
    primary_color_hex: scraped.primary_color_hex,
    primary_color_oklch: scraped._meta?.primary_oklch,
    has_about_copy: Boolean(scraped.about_text || scraped.about_copy),
    has_mission: Boolean(scraped.mission),
    has_team: Boolean(scraped.team_members?.length),
    has_process_steps: Boolean(scraped.process_steps?.length),
    has_faq: Boolean(scraped.faq?.length),
    has_partner_logos: Boolean(scraped.partner_logos?.length),
    website_style: scraped._website_style || 'unknown',
  }, null, 2);

  return `You are an expert website architect for a renovation contractor website rebuild platform.

Analyse this contractor's scraped website data and produce a SiteBlueprint v2 JSON that specifies:
1. Which sections to use on each page (homepage, about, services, contact, projects)
2. Theme customisation (colours, fonts, spacing, animations)
3. Whether any custom sections are needed (max 5, only when standard sections can't handle something unique)
4. Content elevation suggestions (improvements to scraped copy)

## Scraped Data
${scrapedSummary}

## Available Section Catalogue
${sectionCatalogue}

## Rules
- ALWAYS use hero:visualizer-teardown as the homepage hero — it's the platform's primary differentiator (before/after frame scrubber with 5 style tabs). Do NOT use hero:full-bleed-overlay or other heroes for homepage.
- Do NOT include misc:visualizer-teaser — the visualiser is already embedded in hero:visualizer-teardown
- Every page MUST have at least 2 sections
- Homepage should have 6-10 sections for a complete feel
- Inner pages (about, services, contact, projects) should start with misc:breadcrumb-hero
- Only suggest custom sections if the target has something truly unique (e.g., a 3D virtual tour, a custom calculator, an interactive timeline) that no standard section can represent
- For theme.colors.primary, use the scraped OKLCH value if available, otherwise derive from hex
- Choose typography that matches the brand personality:
  - Traditional/established contractors: serif headings (Playfair Display, Merriweather)
  - Modern/clean contractors: sans-serif (Inter, Plus Jakarta Sans, DM Sans)
  - Luxury/high-end: elegant serif or thin sans (Cormorant, Libre Baskerville)
- spacing: 'compact' for information-dense sites, 'spacious' for luxury/minimal sites, 'default' for most
- animationPreset: 'fade-in-up' for most, 'stagger-reveal' for visual portfolios, 'none' for conservative brands
- If data for a section is missing (e.g., no testimonials), don't include testimonial sections
- Use sections that match the contractor's actual content — don't add gallery sections if no portfolio images

## Output Format
Return ONLY valid JSON matching this structure (no markdown, no explanation):
{
  "pages": [
    { "slug": "homepage", "title": "...", "sections": [{ "sectionId": "category:variant" }] },
    { "slug": "about", "title": "...", "sections": [...] },
    { "slug": "services", "title": "...", "sections": [...] },
    { "slug": "contact", "title": "...", "sections": [...] },
    { "slug": "projects", "title": "...", "sections": [...] }
  ],
  "theme": {
    "colors": { "primary": "OKLCH string", "secondary": "OKLCH string", "accent": "OKLCH string" },
    "typography": { "headingFont": "Font Name", "bodyFont": "Font Name" },
    "borderRadius": "rem value",
    "spacing": "compact|default|spacious",
    "animationPreset": "fade-in-up|stagger-reveal|slide-in-left|none"
  },
  "customSections": [],
  "contentElevation": []
}`;
}

/**
 * Generate a safe default blueprint when the architect fails.
 * Uses the target's primary colour and standard section layouts.
 */
function getDefaultBlueprint(scraped) {
  const hasTestimonials = scraped.testimonials?.length > 0;
  const hasPortfolio = scraped.portfolio?.length > 0;

  return {
    pages: [
      {
        slug: 'homepage',
        title: scraped.business_name || 'Home',
        sections: [
          { sectionId: 'hero:visualizer-teardown' },
          { sectionId: 'trust:badge-strip' },
          { sectionId: 'services:grid-3-cards' },
          { sectionId: 'about:split-image-copy' },
          ...(hasPortfolio ? [{ sectionId: 'gallery:masonry-grid' }] : []),
          ...(hasTestimonials ? [{ sectionId: 'testimonials:cards-carousel' }] : []),
          { sectionId: 'cta:full-width-primary' },
        ],
      },
      {
        slug: 'about',
        title: `About ${scraped.business_name || 'Us'}`,
        sections: [
          { sectionId: 'misc:breadcrumb-hero' },
          { sectionId: 'about:split-image-copy' },
          { sectionId: 'misc:mission-statement' },
          { sectionId: 'trust:badge-strip' },
          ...(hasTestimonials ? [{ sectionId: 'testimonials:cards-carousel' }] : []),
          { sectionId: 'misc:service-area' },
          { sectionId: 'cta:full-width-primary' },
        ],
      },
      {
        slug: 'services',
        title: 'Our Services',
        sections: [
          { sectionId: 'misc:breadcrumb-hero' },
          { sectionId: 'services:grid-3-cards' },
          ...(hasPortfolio ? [{ sectionId: 'gallery:masonry-grid' }] : []),
          ...(hasTestimonials ? [{ sectionId: 'testimonials:cards-carousel' }] : []),
          { sectionId: 'cta:full-width-primary' },
        ],
      },
      {
        slug: 'contact',
        title: 'Contact Us',
        sections: [
          { sectionId: 'misc:breadcrumb-hero' },
          { sectionId: 'contact:form-with-map' },
          { sectionId: 'trust:badge-strip' },
        ],
      },
      {
        slug: 'projects',
        title: 'Our Work',
        sections: [
          { sectionId: 'misc:breadcrumb-hero' },
          ...(hasPortfolio ? [{ sectionId: 'gallery:masonry-grid' }] : []),
          ...(hasTestimonials ? [{ sectionId: 'testimonials:cards-carousel' }] : []),
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
    customSections: [],
    contentElevation: [],
  };
}
