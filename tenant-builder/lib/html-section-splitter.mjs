/**
 * HTML Section Splitter — parses page HTML into visual sections
 * for the Design Director build manifest.
 *
 * Heuristics (in priority order):
 * 1. Semantic landmarks: <section>, <header>, <footer>, <main>, <nav>
 * 2. High-padding divs: <div> with significant vertical padding in CSS tokens
 * 3. Heading boundaries: h1-h3 as section delimiters
 *
 * Strips WordPress admin noise (data-*, wp-*, elementor-*) before output.
 */

import * as logger from './logger.mjs';

// Regex patterns for section splitting
const SECTION_TAG_RE = /<(section|header|footer|nav|main)\b[^>]*>([\s\S]*?)<\/\1>/gi;
const HEADING_RE = /<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi;
const WP_NOISE_RE = /\s(?:data-(?:elementor|widget|id|element_type|settings|model-cid|container-id)|class="(?:elementor|wp-)[\w-]*")/g;
const STRIP_ATTRS_RE = /\s(?:data-[\w-]+|aria-[\w-]+)="[^"]*"/g;

/**
 * Split a page's HTML into visual sections.
 *
 * @param {string} html - Full page HTML
 * @param {object} [options]
 * @param {number} [options.maxSnippetLength=2000] - Max chars per HTML snippet
 * @param {object} [options.cssTokens] - Computed CSS tokens (for padding detection)
 * @returns {Array<{tag: string, index: number, htmlSnippet: string, sectionType: string}>}
 */
export function splitIntoSections(html, { maxSnippetLength = 2000, cssTokens } = {}) {
  if (!html || html.length < 100) return [];

  const sections = [];

  // Strategy 1: Semantic landmarks
  let match;
  SECTION_TAG_RE.lastIndex = 0;
  while ((match = SECTION_TAG_RE.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const content = match[0];
    const sectionType = inferSectionType(tag, content);

    sections.push({
      tag,
      index: match.index,
      htmlSnippet: cleanSnippet(content, maxSnippetLength),
      sectionType,
    });
  }

  // If we found >=3 semantic sections, use them
  if (sections.length >= 3) {
    logger.debug(`Section splitter: ${sections.length} semantic sections found`);
    return deduplicateAndSort(sections);
  }

  // Strategy 2: Heading-based splitting (fallback)
  const headingSections = [];
  HEADING_RE.lastIndex = 0;
  while ((match = HEADING_RE.exec(html)) !== null) {
    const headingLevel = match[1];
    const headingText = stripTags(match[2]).trim();
    if (!headingText || headingText.length < 2) continue;

    // Extract surrounding content (up to next heading or 2000 chars)
    const startIdx = Math.max(0, match.index - 200);
    const nextHeadingMatch = html.slice(match.index + match[0].length).search(/<h[1-3]\b/i);
    const endIdx = nextHeadingMatch > 0
      ? Math.min(match.index + match[0].length + nextHeadingMatch, match.index + maxSnippetLength)
      : Math.min(match.index + maxSnippetLength, html.length);

    const snippet = html.slice(startIdx, endIdx);
    const sectionType = inferSectionTypeFromHeading(headingText);

    headingSections.push({
      tag: headingLevel,
      index: match.index,
      htmlSnippet: cleanSnippet(snippet, maxSnippetLength),
      sectionType,
    });
  }

  if (headingSections.length >= 2) {
    logger.debug(`Section splitter: ${headingSections.length} heading-based sections`);
    return deduplicateAndSort(headingSections);
  }

  // Strategy 3: Treat entire HTML as one section (last resort)
  logger.debug('Section splitter: single-section fallback');
  return [{
    tag: 'body',
    index: 0,
    htmlSnippet: cleanSnippet(html, maxSnippetLength),
    sectionType: 'hero',
  }];
}

/**
 * Infer section type from semantic tag and content.
 */
function inferSectionType(tag, content) {
  if (tag === 'nav') return 'nav';
  if (tag === 'header') return 'hero';
  if (tag === 'footer') return 'footer';

  const contentLower = content.toLowerCase();

  // Check content patterns
  if (contentLower.includes('hero') || contentLower.includes('banner')) return 'hero';
  if (contentLower.includes('service') || contentLower.includes('what we do')) return 'services';
  if (contentLower.includes('about') || contentLower.includes('our story') || contentLower.includes('who we are')) return 'about';
  if (contentLower.includes('testimonial') || contentLower.includes('review') || contentLower.includes('what our')) return 'testimonials';
  if (contentLower.includes('gallery') || contentLower.includes('portfolio') || contentLower.includes('our work') || contentLower.includes('project')) return 'gallery';
  if (contentLower.includes('contact') || contentLower.includes('get in touch') || contentLower.includes('reach us')) return 'contact';
  if (contentLower.includes('team') || contentLower.includes('our people') || contentLower.includes('meet')) return 'team';
  if (contentLower.includes('process') || contentLower.includes('how it works') || contentLower.includes('how we work')) return 'process';
  if (contentLower.includes('why choose') || contentLower.includes('why us')) return 'trust';
  if (contentLower.includes('faq') || contentLower.includes('question')) return 'faq';
  if (contentLower.includes('call') || contentLower.includes('quote') || contentLower.includes('estimate') || contentLower.includes('started')) return 'cta';

  return 'content';
}

/**
 * Infer section type from heading text.
 */
function inferSectionTypeFromHeading(headingText) {
  const lower = headingText.toLowerCase();
  if (lower.includes('service')) return 'services';
  if (lower.includes('about') || lower.includes('story') || lower.includes('who we')) return 'about';
  if (lower.includes('testimonial') || lower.includes('review') || lower.includes('client')) return 'testimonials';
  if (lower.includes('gallery') || lower.includes('portfolio') || lower.includes('project') || lower.includes('work')) return 'gallery';
  if (lower.includes('contact') || lower.includes('touch')) return 'contact';
  if (lower.includes('team') || lower.includes('meet')) return 'team';
  if (lower.includes('process') || lower.includes('how')) return 'process';
  if (lower.includes('why') || lower.includes('trust') || lower.includes('choose')) return 'trust';
  if (lower.includes('faq') || lower.includes('question')) return 'faq';
  return 'content';
}

/**
 * Clean an HTML snippet: strip WordPress noise, limit length.
 */
function cleanSnippet(html, maxLength) {
  let cleaned = html
    .replace(WP_NOISE_RE, '')
    .replace(STRIP_ATTRS_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength) + '<!-- truncated -->';
  }

  return cleaned;
}

/**
 * Strip HTML tags from text.
 */
function stripTags(html) {
  return html.replace(/<[^>]+>/g, '');
}

/**
 * Deduplicate sections by type (keep first of each type) and sort by index.
 */
function deduplicateAndSort(sections) {
  const seen = new Set();
  const unique = [];

  // Sort by position in document first
  sections.sort((a, b) => a.index - b.index);

  for (const s of sections) {
    // Allow multiple 'content' sections but deduplicate specific types
    const key = s.sectionType === 'content' ? `content-${s.index}` : s.sectionType;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  }

  return unique;
}
