/**
 * Firecrawl Branding v2 extraction.
 * Uses Firecrawl's native `branding` format first, falling back to
 * Claude CLI analysis when native data is empty/missing.
 */

import { scrape } from '../lib/firecrawl-client.mjs';
import { callClaude } from '../lib/claude-cli.mjs';
import * as logger from '../lib/logger.mjs';
import { resolve } from 'node:path';

/** Keywords that indicate a URL is a project photo, not a logo. */
const NON_LOGO_KEYWORDS = [
  'kitchen', 'bathroom', 'basement', 'outdoor', 'project', 'gallery',
  'renovation', 'patio', 'deck', 'porch', 'bedroom', 'living',
  'dining', 'laundry', 'garage', 'pool', 'backyard', 'garden',
  'before', 'after', 'portfolio', 'work', 'slider', 'banner', 'hero',
];

/**
 * Filter out project/portfolio photos misidentified as logos.
 * @param {Array<{ url?: string, src?: string }>} logos
 * @returns {Array}
 */
function filterNonLogos(logos) {
  if (!Array.isArray(logos)) return [];
  return logos.filter(logo => {
    const u = (logo.url || logo.src || '').toLowerCase();
    const isNonLogo = NON_LOGO_KEYWORDS.some(kw => u.includes(kw));
    if (isNonLogo) {
      logger.info(`  Rejected non-logo URL: ${u.slice(0, 80)}`);
    }
    return !isNonLogo;
  });
}

/**
 * Check whether the Firecrawl native branding response has usable data.
 * Requires at least one colour or one font to be considered valid.
 * @param {object|null} branding - raw Firecrawl branding object
 * @returns {boolean}
 */
function hasUsableBranding(branding) {
  if (!branding || typeof branding !== 'object') return false;

  const hasColors = branding.colors &&
    typeof branding.colors === 'object' &&
    Object.values(branding.colors).some(v => typeof v === 'string' && v.length > 0);

  const hasFonts = Array.isArray(branding.fonts) && branding.fonts.length > 0;

  return hasColors || hasFonts;
}

/**
 * Convert Firecrawl native branding response into our standard format
 * (matching the branding-v2.json schema used downstream).
 * @param {object} branding - Firecrawl branding object
 * @returns {{ logos: Array, colors: Array, fonts: Array, personality: object }}
 */
function normaliseNativeBranding(branding) {
  // --- Logos ---
  const logos = [];
  const logoUrl = branding.logo || branding.images?.logo;
  if (logoUrl) {
    logos.push({ url: logoUrl, type: 'primary', format: guessFormat(logoUrl) });
  }
  const faviconUrl = branding.images?.favicon;
  if (faviconUrl && faviconUrl !== logoUrl) {
    logos.push({ url: faviconUrl, type: 'favicon', format: guessFormat(faviconUrl) });
  }

  // --- Colours ---
  const colors = [];
  const colorMap = branding.colors || {};
  const roleMapping = {
    primary: 'primary',
    secondary: 'secondary',
    accent: 'accent',
    background: 'background',
    textPrimary: 'text',
    textSecondary: 'other',
  };
  for (const [key, hex] of Object.entries(colorMap)) {
    if (typeof hex === 'string' && hex.startsWith('#')) {
      colors.push({
        hex,
        role: roleMapping[key] || 'other',
        confidence: 0.9,
      });
    }
  }

  // --- Fonts ---
  const fonts = [];
  const seenFonts = new Set();

  // From the fonts array
  if (Array.isArray(branding.fonts)) {
    for (const family of branding.fonts) {
      if (typeof family === 'string' && family.length > 0 && !seenFonts.has(family)) {
        seenFonts.add(family);
        fonts.push({ family, role: fonts.length === 0 ? 'heading' : 'body', source: 'firecrawl-native' });
      }
    }
  }

  // From the typography object (more specific roles)
  const typo = branding.typography?.fontFamilies;
  if (typo && typeof typo === 'object') {
    if (typo.heading && !seenFonts.has(typo.heading)) {
      seenFonts.add(typo.heading);
      fonts.push({ family: typo.heading, role: 'heading', source: 'firecrawl-native' });
    }
    if (typo.primary && !seenFonts.has(typo.primary)) {
      seenFonts.add(typo.primary);
      fonts.push({ family: typo.primary, role: 'body', source: 'firecrawl-native' });
    }
    if (typo.code && !seenFonts.has(typo.code)) {
      seenFonts.add(typo.code);
      fonts.push({ family: typo.code, role: 'other', source: 'firecrawl-native' });
    }
  }

  // --- Personality (stub — native branding doesn't include personality) ---
  const personality = {
    tone: 'professional',
    values: [],
    target_audience: 'homeowners',
  };

  return {
    logos: filterNonLogos(logos),
    colors,
    fonts,
    personality,
  };
}

/**
 * Guess image format from URL extension.
 * @param {string} url
 * @returns {'svg'|'png'|'jpg'|'webp'|'ico'|'unknown'}
 */
function guessFormat(url) {
  const ext = (url || '').split('?')[0].split('.').pop()?.toLowerCase();
  if (['svg', 'png', 'jpg', 'jpeg', 'webp', 'ico'].includes(ext)) {
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  return 'unknown';
}

/**
 * Claude CLI fallback: analyse scraped markdown to extract brand data.
 * @param {string} url
 * @param {string} markdown
 * @param {object} metadata
 * @returns {Promise<{ logos: Array, colors: Array, fonts: Array, personality: object }>}
 */
async function claudeFallback(url, markdown, metadata) {
  const prompt = `Analyse this website content and extract brand information.

Website: ${url}
${metadata?.title ? `Title: ${metadata.title}` : ''}

Content (first 4000 chars):
${markdown.slice(0, 4000)}

Extract:
1. Logo URLs — look for img tags with "logo" in the alt text, class, or filename. Also check favicon links.
2. Brand colours — hex codes mentioned in CSS or meta tags. Focus on primary, secondary, accent.
3. Fonts — Google Fonts links, CSS font-family declarations.
4. Brand personality — tone (professional, casual, luxury, etc.), inferred values, target audience.

For logos, prioritise header/nav area logos. For colours, filter out common greys (#333, #666, #999, #ccc, etc.) and focus on actual brand colours.`;

  const result = await callClaude(prompt, {
    schemaPath: resolve(import.meta.dirname, '../schemas/branding-v2.json'),
    timeoutMs: 60000,
  });

  if (result.logos && Array.isArray(result.logos)) {
    result.logos = filterNonLogos(result.logos);
  }

  return result;
}

/**
 * Extract brand data from a URL using Firecrawl + AI enrichment.
 * Prefers Firecrawl's native branding format; falls back to Claude CLI
 * analysis when native data is empty/missing.
 * @param {string} url - Website URL to analyse
 * @returns {Promise<{ logos: Array, colors: Array, fonts: Array, personality: object }>}
 */
export async function extractBranding(url) {
  logger.info(`Branding v2: extracting from ${url}`);

  // Step 1: Firecrawl scrape with both markdown and native branding
  const { markdown, metadata, branding } = await scrape(url, {
    formats: ['markdown', 'branding'],
    timeout: 30000,
  });

  // Step 2: Try native branding first
  if (hasUsableBranding(branding)) {
    logger.info('Branding v2: using Firecrawl native branding data');
    const result = normaliseNativeBranding(branding);
    logger.info(`Branding v2 (native): ${result.logos.length} logos, ${result.colors.length} colours, ${result.fonts.length} fonts`);

    // If native branding has no personality data, enrich with a lightweight Claude call
    // (skipped for now — personality is not critical for builds)
    return result;
  }

  // Step 3: Fallback to Claude CLI analysis of scraped markdown
  logger.info('Branding v2: native branding empty/missing, falling back to Claude CLI');
  try {
    const result = await claudeFallback(url, markdown, metadata);
    logger.info(`Branding v2 (Claude fallback): ${result.logos?.length || 0} logos, ${result.colors?.length || 0} colours, ${result.fonts?.length || 0} fonts`);
    return result;
  } catch (e) {
    logger.warn(`Branding v2 AI analysis failed: ${e.message}`);
    return { logos: [], colors: [], fonts: [], personality: { tone: 'professional', values: [], target_audience: 'homeowners' } };
  }
}
