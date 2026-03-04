/**
 * Firecrawl Branding v2 extraction.
 * Uses Firecrawl scrape with structured extraction to get brand data:
 * logos, colours, fonts, personality.
 */

import { scrape } from '../lib/firecrawl-client.mjs';
import { callClaude } from '../lib/claude-cli.mjs';
import * as logger from '../lib/logger.mjs';
import { resolve } from 'node:path';

/**
 * Extract brand data from a URL using Firecrawl + AI enrichment.
 * @param {string} url - Website URL to analyse
 * @returns {Promise<{ logos: Array, colors: Array, fonts: Array, personality: object }>}
 */
export async function extractBranding(url) {
  logger.info(`Branding v2: extracting from ${url}`);

  // Step 1: Firecrawl scrape for markdown
  const { markdown, metadata } = await scrape(url, {
    formats: ['markdown'],
    timeout: 30000,
  });

  // Step 2: AI analysis of the scraped content for structured brand data
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

  try {
    const result = await callClaude(prompt, {
      schemaPath: resolve(import.meta.dirname, '../schemas/branding-v2.json'),
      timeoutMs: 60000,
    });

    // Filter out misidentified logos (kitchen photos, bathroom images, etc.)
    const NON_LOGO_KEYWORDS = [
      'kitchen', 'bathroom', 'basement', 'outdoor', 'project', 'gallery',
      'renovation', 'patio', 'deck', 'porch', 'bedroom', 'living',
      'dining', 'laundry', 'garage', 'pool', 'backyard', 'garden',
      'before', 'after', 'portfolio', 'work', 'slider', 'banner', 'hero',
    ];
    if (result.logos && Array.isArray(result.logos)) {
      result.logos = result.logos.filter(logo => {
        const url = (logo.url || logo.src || '').toLowerCase();
        const isNonLogo = NON_LOGO_KEYWORDS.some(kw => url.includes(kw));
        if (isNonLogo) {
          logger.info(`  Rejected non-logo URL: ${url.slice(0, 80)}`);
        }
        return !isNonLogo;
      });
    }

    logger.info(`Branding v2: found ${result.logos?.length || 0} logos, ${result.colors?.length || 0} colours, ${result.fonts?.length || 0} fonts`);
    return result;
  } catch (e) {
    logger.warn(`Branding v2 AI analysis failed: ${e.message}`);
    return { logos: [], colors: [], fonts: [] };
  }
}
