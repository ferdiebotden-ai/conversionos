/**
 * Content Architect — extracts deep, structured content from scraped website data.
 *
 * This is the single biggest quality lever in the pipeline. Rich content means
 * fewer generic fallbacks, which means less "template feel."
 *
 * Pipeline position: runs AFTER scrape, BEFORE architect.
 *
 * Input:  scraped.json (+ any page markdown files in resultsDir)
 * Output: content-architect.json — comprehensive structured content
 *
 * Uses Codex GPT 5.4 (subscription, ~$0 marginal cost, ~3 min per call).
 */

import { codexExec } from './lib/codex-cli.mjs';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as logger from './lib/logger.mjs';

/**
 * Extract deep, structured content from scraped website data.
 *
 * @param {string} resultsDir - Path containing scraped.json (and optionally markdown/)
 * @param {string} siteId - Tenant site ID
 * @param {object} [options]
 * @param {number} [options.timeoutMs=180000] - Timeout for Codex call
 * @param {string} [options.cwd] - Working directory for Codex
 * @returns {Promise<object|null>} Structured content object, or null on failure
 */
export async function contentArchitect(resultsDir, siteId, { timeoutMs = 180000, cwd } = {}) {
  const scrapedPath = join(resultsDir, 'scraped.json');
  if (!existsSync(scrapedPath)) {
    logger.warn(`[${siteId}] Content Architect: no scraped.json — skipping`);
    return null;
  }

  let scraped;
  try {
    scraped = JSON.parse(readFileSync(scrapedPath, 'utf-8'));
  } catch (e) {
    logger.warn(`[${siteId}] Content Architect: scraped.json is corrupt — skipping`);
    return null;
  }

  // Gather all available content sources
  const compactData = extractCompactData(scraped);
  const pageMarkdown = gatherPageMarkdown(resultsDir);

  const outputPath = resolve(resultsDir, 'content-architect.json');

  const prompt = buildExtractionPrompt(compactData, pageMarkdown, siteId, outputPath);
  const inputSize = prompt.length;

  logger.info(`[${siteId}] Content Architect: extracting deep content (${Math.round(inputSize / 1024)}KB prompt)`);

  try {
    await codexExec(prompt, {
      cwd: cwd || process.cwd(),
      timeoutMs,
      ephemeral: true,
    });

    if (!existsSync(outputPath)) {
      logger.warn(`[${siteId}] Content Architect: Codex did not produce output file`);
      // Fallback: build minimal content from scraped data
      const fallback = buildFallbackContent(scraped, siteId);
      writeFileSync(outputPath, JSON.stringify(fallback, null, 2));
      logger.info(`[${siteId}] Content Architect: using fallback content (${Object.keys(fallback).length} fields)`);
      return fallback;
    }

    const result = JSON.parse(readFileSync(outputPath, 'utf-8'));
    const categories = Object.keys(result).filter(k => result[k] != null && result[k] !== '');
    logger.info(`[${siteId}] Content Architect: extracted ${categories.length} content categories`);
    return result;
  } catch (err) {
    logger.warn(`[${siteId}] Content Architect failed: ${err.message?.slice(0, 200)}`);
    // Fallback: build minimal content from scraped data
    const fallback = buildFallbackContent(scraped, siteId);
    writeFileSync(outputPath, JSON.stringify(fallback, null, 2));
    logger.info(`[${siteId}] Content Architect: using fallback content after error`);
    return fallback;
  }
}

/**
 * Extract compact data from scraped.json for the prompt.
 * Keeps all structured fields, trims markdown to key pages.
 */
function extractCompactData(scraped) {
  return {
    businessName: scraped.business_name || scraped.businessName || '',
    phone: scraped.contact_phone || scraped.phone || '',
    email: scraped.contact_email || scraped.email || '',
    address: scraped.address || '',
    heroHeadline: scraped.hero_headline || scraped.heroHeadline || '',
    heroSubheadline: scraped.hero_subheadline || scraped.heroSubheadline || '',
    aboutCopy: scraped.about_copy || scraped.aboutCopy || '',
    services: scraped.services || [],
    testimonials: scraped.testimonials || [],
    portfolio: scraped.portfolio || [],
    socialLinks: scraped.social_links || scraped.socialLinks || [],
    serviceArea: scraped.service_area || scraped.serviceArea || '',
    whyChooseUs: scraped.why_choose_us || scraped.whyChooseUs || [],
    processSteps: scraped.process_steps || scraped.processSteps || [],
    teamMembers: scraped.team_members || scraped.teamMembers || [],
    certifications: scraped.certifications || [],
    awards: scraped.awards || [],
    yearsInBusiness: scraped.years_in_business || scraped.yearsInBusiness || '',
    foundingYear: scraped.founding_year || scraped.foundingYear || '',
    googleRating: scraped.google_rating || scraped.googleRating || '',
    googleReviewCount: scraped.google_review_count || scraped.googleReviewCount || '',
  };
}

/**
 * Gather markdown from scraped page files (if available).
 * Returns a compact object with page name → first 3000 chars of markdown.
 */
function gatherPageMarkdown(resultsDir) {
  const markdownDir = join(resultsDir, 'markdown');
  if (!existsSync(markdownDir)) return {};

  const pages = {};
  try {
    for (const f of readdirSync(markdownDir)) {
      if (f.endsWith('.md')) {
        const pageName = f.replace('.md', '');
        const content = readFileSync(join(markdownDir, f), 'utf-8');
        // Trim to 3000 chars per page to keep prompt manageable
        pages[pageName] = content.slice(0, 3000);
      }
    }
  } catch (err) {
    logger.warn(`[gatherPageMarkdown] Error reading markdown dir: ${err.message?.slice(0, 100)}`);
  }
  return pages;
}

/**
 * Build the Codex prompt for deep content extraction.
 */
function buildExtractionPrompt(compactData, pageMarkdown, siteId, outputPath) {
  const markdownSection = Object.keys(pageMarkdown).length > 0
    ? `\n== RAW PAGE CONTENT (markdown from scraped pages) ==\n${Object.entries(pageMarkdown).map(([page, md]) => `--- ${page} ---\n${md}`).join('\n\n')}\n`
    : '';

  return `IMPORTANT: Write the output file IMMEDIATELY. Do NOT read other project files. Do NOT explore the codebase. Just analyse the data below and write the JSON file.

You are a Content Architect for a renovation contractor website rebuild pipeline.
Your job: extract EVERY piece of useful content from the scraped website data below
and produce a comprehensive, structured JSON file.

The goal is ZERO generic fallbacks in the final website. Every section should have
real content from the contractor's actual website.

== SCRAPED STRUCTURED DATA ==
${JSON.stringify(compactData, null, 2)}
${markdownSection}

== TASK ==
Analyse ALL the data above. Extract, expand, and structure it into the JSON format below.
Write the result to: ${outputPath}

For EACH service found:
- Write a full 2-3 sentence description (expand from short descriptions if needed)
- Write a short 1-sentence description
- List 4-6 specific features/capabilities
- Write 4-6 FAQ items (question + answer) that a homeowner would ask
- Include any page-specific copy (eyebrow text, body intro, why-you-need-it paragraphs)

For testimonials: include exact quotes, author names, any ratings.
For team members: names, roles, any biographical details found.
For projects/portfolio: titles, descriptions, categories.
For business history: founding year, principals, story arc.

== OUTPUT FORMAT ==
Write a JSON file with this structure:
{
  "businessName": "string",
  "foundingYear": "string or null",
  "businessHistory": "2-3 sentence company story or null",
  "principals": [{ "name": "string", "role": "string", "bio": "string or null" }],
  "services": [{
    "name": "string",
    "slug": "string (kebab-case)",
    "description": "string (2-3 sentences)",
    "shortDescription": "string (1 sentence)",
    "features": ["string"],
    "faqs": [{ "question": "string", "answer": "string" }],
    "pageEyebrow": "string or null",
    "pageTitle": "string or null"
  }],
  "testimonials": [{ "author": "string", "text": "string", "rating": "number or null", "source": "string or null" }],
  "teamMembers": [{ "name": "string", "role": "string", "bio": "string or null" }],
  "projects": [{ "title": "string", "description": "string", "category": "string or null" }],
  "serviceAreas": ["string"],
  "processSteps": [{ "title": "string", "description": "string" }],
  "trustMetrics": {
    "yearsInBusiness": "number or null",
    "projectsCompleted": "string or null",
    "googleRating": "number or null",
    "googleReviewCount": "number or null",
    "certifications": ["string"],
    "awards": ["string"]
  },
  "ctaCopy": {
    "primary": "string (main CTA text)",
    "secondary": "string (alternative CTA)",
    "heroEyebrow": "string (short uppercase label above hero heading)",
    "heroHeadline": "string",
    "heroSubheadline": "string"
  },
  "faqItems": [{ "question": "string", "answer": "string" }],
  "contact": {
    "phone": "string",
    "email": "string",
    "address": "string",
    "hours": "string or null",
    "socialLinks": [{ "platform": "string", "url": "string" }]
  }
}

RULES:
1. Use ONLY real data from the scraped content. Never fabricate names, quotes, or facts.
2. If a field has no data, use null (not empty string or placeholder).
3. For services: if the scrape only found service names, expand descriptions from context clues in the markdown.
4. For FAQs: generate realistic Q&A based on the service type and contractor's actual offerings. These should sound natural, not generic.
5. Write the JSON file directly — no explanations, no commentary, just the file.`;
}

/**
 * Build fallback content from scraped data when Codex fails.
 * This is minimal but better than nothing — at least the basic fields are structured.
 */
function buildFallbackContent(scraped, siteId) {
  const services = (scraped.services || []).map(svc => ({
    name: svc.name || svc.title || 'Service',
    slug: toSlug(svc.name || svc.title || 'service'),
    description: svc.description || '',
    shortDescription: svc.short_description || (svc.description || '').slice(0, 100),
    features: svc.features || [],
    faqs: [],
    pageEyebrow: null,
    pageTitle: null,
  }));

  const testimonials = (scraped.testimonials || []).map(t => ({
    author: t.author || t.name || 'Customer',
    text: t.text || t.quote || t.content || '',
    rating: t.rating || null,
    source: t.source || null,
  }));

  return {
    businessName: scraped.business_name || scraped.businessName || siteId,
    foundingYear: scraped.founding_year || scraped.foundingYear || null,
    businessHistory: null,
    principals: [],
    services,
    testimonials,
    teamMembers: scraped.team_members || [],
    projects: (scraped.portfolio || []).map(p => ({
      title: p.title || 'Project',
      description: p.description || '',
      category: p.category || null,
    })),
    serviceAreas: Array.isArray(scraped.service_area)
      ? scraped.service_area
      : (typeof scraped.service_area === 'string'
        ? scraped.service_area.split(',').map(s => s.trim())
        : scraped.service_area ? [scraped.service_area] : []),
    processSteps: scraped.process_steps || [],
    trustMetrics: {
      yearsInBusiness: scraped.years_in_business || null,
      projectsCompleted: null,
      googleRating: scraped.google_rating || null,
      googleReviewCount: scraped.google_review_count || null,
      certifications: scraped.certifications || [],
      awards: scraped.awards || [],
    },
    ctaCopy: {
      primary: 'Get Your Free Design Estimate',
      secondary: 'See Your Space Before You Build',
      heroEyebrow: scraped.service_area ? `Renovation contractor in ${scraped.service_area}` : null,
      heroHeadline: scraped.hero_headline || scraped.heroHeadline || '',
      heroSubheadline: scraped.hero_subheadline || scraped.heroSubheadline || '',
    },
    faqItems: [],
    contact: {
      phone: scraped.contact_phone || scraped.phone || '',
      email: scraped.contact_email || scraped.email || '',
      address: scraped.address || '',
      hours: scraped.business_hours || null,
      socialLinks: scraped.social_links || [],
    },
  };
}

function toSlug(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
