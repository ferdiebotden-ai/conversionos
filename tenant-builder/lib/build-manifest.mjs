/**
 * Build Manifest — assembles per-section build instructions from
 * the HTML section splitter output + Design Language Document.
 *
 * Each manifest entry gives Codex everything it needs to build one section:
 * - HTML snippet (structural reference)
 * - Design Language excerpt (aesthetic direction for this section type)
 * - CSS tokens (computed styles)
 * - Config field mapping (data access patterns)
 * - Premium upgrades (specific enhancements to apply)
 */

import { splitIntoSections } from './html-section-splitter.mjs';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import * as logger from './logger.mjs';

// Design Language section keywords → excerpt extraction
const DL_SECTION_KEYWORDS = {
  hero: ['VISUAL HIERARCHY', 'hero', 'PHOTOGRAPHIC TREATMENT'],
  services: ['CARD & COMPONENT STYLE', 'service', 'grid'],
  about: ['TYPOGRAPHY', 'about', 'story'],
  testimonials: ['CARD & COMPONENT STYLE', 'testimonial', 'review'],
  gallery: ['PHOTOGRAPHIC TREATMENT', 'gallery', 'portfolio'],
  contact: ['SPACING RHYTHM', 'contact', 'form'],
  footer: ['COLOUR APPLICATION', 'footer'],
  team: ['CARD & COMPONENT STYLE', 'team'],
  process: ['SPACING RHYTHM', 'process', 'step'],
  trust: ['ANIMATION & INTERACTION', 'trust', 'stat'],
  cta: ['COLOUR APPLICATION', 'ANIMATION & INTERACTION', 'CTA'],
  nav: ['COLOUR APPLICATION', 'nav'],
  faq: ['SPACING RHYTHM', 'faq'],
  content: ['VISUAL HIERARCHY', 'SPACING RHYTHM'],
};

// Section type → likely config fields
const CONFIG_FIELD_MAP = {
  hero: ['heroHeadline', 'heroSubheadline', 'heroImageUrl', 'heroCtaText'],
  services: ['services'],
  about: ['aboutCopy', 'aboutImageUrl'],
  testimonials: ['testimonials'],
  gallery: ['portfolio'],
  contact: ['phone', 'email', 'address'],
  footer: ['phone', 'email', 'address', 'socialLinks', 'logoUrl'],
  team: ['teamMembers'],
  process: ['processSteps'],
  trust: ['trustMetrics', 'yearsInBusiness', 'projectsCompleted'],
  cta: ['heroCtaText', 'phone'],
  nav: ['logoUrl'],
  faq: ['faqItems'],
};

/**
 * Build a manifest of per-section build instructions.
 *
 * @param {string} resultsDir - Path containing html/, css-tokens.json, design-language.md
 * @param {string} siteId - Tenant site ID
 * @param {object} [options]
 * @param {string} [options.page='homepage'] - Which page to build manifest for
 * @param {number} [options.maxSections=15] - Maximum sections to include
 * @returns {Array<object>} Build manifest entries
 */
export function buildManifest(resultsDir, siteId, { page = 'homepage', maxSections = 15 } = {}) {
  // Load inputs
  const htmlPath = join(resultsDir, 'html', `${page}.html`);
  const cssTokensPath = join(resultsDir, 'css-tokens.json');
  const designLanguagePath = join(resultsDir, 'design-language.md');

  const html = existsSync(htmlPath) ? readFileSync(htmlPath, 'utf-8') : '';
  const cssTokens = loadJsonSafe(cssTokensPath);
  const designLanguage = existsSync(designLanguagePath) ? readFileSync(designLanguagePath, 'utf-8') : '';

  if (!html) {
    logger.warn(`[${siteId}] Build manifest: no HTML found for page '${page}'`);
    return [];
  }

  // Split HTML into sections
  const sections = splitIntoSections(html, { cssTokens });

  if (sections.length === 0) {
    logger.warn(`[${siteId}] Build manifest: section splitter found 0 sections`);
    return [];
  }

  // Extract premium upgrades from Design Language
  const premiumUpgrades = extractPremiumUpgrades(designLanguage);

  // Build manifest entries
  const manifest = sections.slice(0, maxSections).map((section, idx) => {
    const sectionType = section.sectionType;
    const sectionName = `${siteId}-${sectionType}${idx > 0 && sections.filter((s, i) => i < idx && s.sectionType === sectionType).length > 0 ? '-' + (idx + 1) : ''}`;

    return {
      sectionId: `custom:${sectionName}`,
      sectionType,
      page,
      order: idx,
      name: formatSectionName(sectionType, idx),
      htmlSnippet: section.htmlSnippet,
      cssTokens: extractRelevantTokens(cssTokens, sectionType),
      designLanguageExcerpt: extractDesignLanguageExcerpt(designLanguage, sectionType),
      premiumUpgrades: premiumUpgrades,
      configFields: CONFIG_FIELD_MAP[sectionType] || [],
    };
  });

  logger.info(`[${siteId}] Build manifest: ${manifest.length} sections for '${page}'`);
  return manifest;
}

/**
 * Build manifests for all available pages.
 */
export function buildManifestAllPages(resultsDir, siteId, { maxSections = 15 } = {}) {
  const htmlDir = join(resultsDir, 'html');
  if (!existsSync(htmlDir)) return [];

  const pages = [];
  try {
    const files = readdirSync(htmlDir).filter(f => f.endsWith('.html'));
    for (const f of files) {
      const page = f.replace('.html', '');
      const manifest = buildManifest(resultsDir, siteId, { page, maxSections });
      pages.push(...manifest);
    }
  } catch { /* ignore */ }

  return pages;
}

/**
 * Extract the PREMIUM UPGRADE PATH section from the Design Language.
 */
function extractPremiumUpgrades(designLanguage) {
  if (!designLanguage) return '';

  const upgradeMatch = designLanguage.match(/PREMIUM UPGRADE PATH[:\s]*([\s\S]*?)(?=\n\n[A-Z]|\z)/i);
  if (upgradeMatch) return upgradeMatch[1].trim();

  // Fallback: find lines starting with →
  const upgradeLines = designLanguage.split('\n').filter(l => l.trim().startsWith('→'));
  return upgradeLines.join('\n');
}

/**
 * Extract a Design Language excerpt relevant to a specific section type.
 */
function extractDesignLanguageExcerpt(designLanguage, sectionType) {
  if (!designLanguage) return '';

  const keywords = DL_SECTION_KEYWORDS[sectionType] || DL_SECTION_KEYWORDS.content;
  const lines = designLanguage.split('\n');
  const excerptLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isRelevant = keywords.some(kw => line.toLowerCase().includes(kw.toLowerCase()));
    if (isRelevant) {
      // Include this line and up to 3 following lines
      for (let j = i; j < Math.min(i + 4, lines.length); j++) {
        if (!excerptLines.includes(lines[j])) excerptLines.push(lines[j]);
      }
    }
  }

  return excerptLines.join('\n').slice(0, 800);
}

/**
 * Extract CSS tokens relevant to a section type.
 */
function extractRelevantTokens(cssTokens, sectionType) {
  if (!cssTokens) return {};

  const relevant = {};

  // Always include fonts and colours
  if (cssTokens.renderedFonts) relevant.fonts = cssTokens.renderedFonts;
  if (cssTokens.customProperties) relevant.colors = cssTokens.customProperties;

  // Section-specific tokens
  if (sectionType === 'hero' || sectionType === 'nav') {
    if (cssTokens.elements?.h1) relevant.h1 = cssTokens.elements.h1;
    if (cssTokens.backgrounds) relevant.backgrounds = cssTokens.backgrounds.slice(0, 2);
  }
  if (['services', 'testimonials', 'gallery', 'team'].includes(sectionType)) {
    if (cssTokens.borderRadii) relevant.borderRadii = cssTokens.borderRadii;
    if (cssTokens.elements?.button) relevant.button = cssTokens.elements.button;
  }
  if (cssTokens.spacingRhythm) relevant.spacing = cssTokens.spacingRhythm.slice(0, 3);

  return relevant;
}

/**
 * Format a section type into a human-readable name.
 */
function formatSectionName(sectionType, index) {
  const names = {
    hero: 'Hero Section',
    services: 'Services Section',
    about: 'About Section',
    testimonials: 'Testimonials',
    gallery: 'Project Gallery',
    contact: 'Contact Section',
    footer: 'Footer',
    team: 'Team Section',
    process: 'Our Process',
    trust: 'Trust Section',
    cta: 'Call to Action',
    nav: 'Navigation',
    faq: 'FAQ Section',
    content: `Content Section ${index + 1}`,
  };
  return names[sectionType] || `Section ${index + 1}`;
}

function loadJsonSafe(path) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}
