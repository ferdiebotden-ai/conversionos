#!/usr/bin/env node
/**
 * Content Fidelity QA — compares every text element on the rebuilt site
 * against the original scraped content.
 *
 * Categories:
 *   A — Direct copy (matches scraped data within Levenshtein ≤ 3 or substring)
 *   B — AI-polished (semantically similar per Claude Sonnet)
 *   C — Standard COS element (matches copy bank)
 *   D — Unknown/suspicious (no traceable origin)
 *
 * Special rules:
 *   - Testimonials require word-for-word match (Category A only)
 *   - Statistics must trace to original scraped data
 *
 * Usage:
 *   node qa/content-fidelity.mjs --url https://example.norbotsystems.com --scraped-data ./results/scraped.json
 *   node qa/content-fidelity.mjs --url https://example.norbotsystems.com --scraped-data ./scraped.json --site-id example --output ./results/
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import * as logger from '../lib/logger.mjs';

// ──────────────────────────────────────────────────────────
// Levenshtein distance (inline — no external dependency)
// ──────────────────────────────────────────────────────────

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

// ──────────────────────────────────────────────────────────
// Pages to check
// ──────────────────────────────────────────────────────────

const PAGES = ['/', '/about', '/services', '/projects', '/contact'];

const MIN_TEXT_LENGTH = 20;

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function normalise(text) {
  return (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Build a flat array of all meaningful text from scraped.json for matching.
 */
function buildScrapedCorpus(scraped) {
  const corpus = [];

  const textFields = [
    'business_name', 'businessName', 'tagline', 'mission',
    'about_copy', 'aboutCopy', 'hero_headline', 'heroHeadline',
    'hero_subheadline', 'heroSubheadline', 'phone', 'email',
    'address', 'city', 'province', 'postal_code',
  ];

  for (const field of textFields) {
    if (scraped[field] && typeof scraped[field] === 'string') {
      corpus.push({ text: scraped[field], field, type: 'field' });
    }
  }

  // Services
  if (Array.isArray(scraped.services)) {
    for (const svc of scraped.services) {
      if (svc.name) corpus.push({ text: svc.name, field: 'services.name', type: 'service' });
      if (svc.description) corpus.push({ text: svc.description, field: 'services.description', type: 'service' });
    }
  }

  // Testimonials
  if (Array.isArray(scraped.testimonials)) {
    for (const t of scraped.testimonials) {
      const quote = t.quote || t.text || t.content || '';
      if (quote) corpus.push({ text: quote, field: 'testimonials.quote', type: 'testimonial' });
      if (t.author || t.name) corpus.push({ text: t.author || t.name, field: 'testimonials.author', type: 'testimonial' });
    }
  }

  // Process steps
  if (Array.isArray(scraped.process_steps || scraped.processSteps)) {
    for (const step of (scraped.process_steps || scraped.processSteps)) {
      if (step.title) corpus.push({ text: step.title, field: 'process_steps.title', type: 'process' });
      if (step.description) corpus.push({ text: step.description, field: 'process_steps.description', type: 'process' });
    }
  }

  // Trust badges / certifications
  for (const arrayField of ['trust_badges', 'trustBadges', 'certifications', 'values']) {
    if (Array.isArray(scraped[arrayField])) {
      for (const item of scraped[arrayField]) {
        const text = typeof item === 'string' ? item : (item.label || item.name || item.title || '');
        if (text) corpus.push({ text, field: arrayField, type: 'trust' });
      }
    }
  }

  // Why choose us
  if (Array.isArray(scraped.why_choose_us || scraped.whyChooseUs)) {
    for (const item of (scraped.why_choose_us || scraped.whyChooseUs)) {
      const text = typeof item === 'string' ? item : (item.title || item.description || '');
      if (text) corpus.push({ text, field: 'why_choose_us', type: 'trust' });
    }
  }

  // Portfolio/project titles
  if (Array.isArray(scraped.portfolio_items || scraped.portfolioItems)) {
    for (const item of (scraped.portfolio_items || scraped.portfolioItems)) {
      if (item.title) corpus.push({ text: item.title, field: 'portfolio.title', type: 'portfolio' });
      if (item.description) corpus.push({ text: item.description, field: 'portfolio.description', type: 'portfolio' });
    }
  }

  return corpus;
}

/**
 * Check if text matches any copy bank entry (Category C).
 */
function matchesCopyBank(text, copyBank) {
  const norm = normalise(text);
  for (const entry of copyBank) {
    const normEntry = normalise(entry);
    if (norm.includes(normEntry) || normEntry.includes(norm)) return true;
    if (levenshtein(norm, normEntry) <= 3) return true;
  }
  return false;
}

/**
 * Check if text matches scraped corpus (Category A).
 * Returns the matching corpus entry or null.
 */
function matchesScrapedCorpus(text, corpus) {
  const norm = normalise(text);
  for (const entry of corpus) {
    const normEntry = normalise(entry.text);
    if (!normEntry || normEntry.length < 3) continue;

    // Substring match
    if (norm.includes(normEntry) || normEntry.includes(norm)) return entry;

    // Levenshtein for similar-length strings (avoid comparing 200-char block against 5-char field)
    if (Math.abs(norm.length - normEntry.length) < 20 && levenshtein(norm, normEntry) <= 3) return entry;
  }
  return null;
}

// ──────────────────────────────────────────────────────────
// Anthropic semantic comparison (batch)
// ──────────────────────────────────────────────────────────

async function semanticCompare(unknowns, scrapedCorpus) {
  if (unknowns.length === 0) return [];

  let callClaude, parseJsonResponse;
  try {
    const mod = await import('../lib/anthropic-client.mjs');
    callClaude = mod.callClaude;
    parseJsonResponse = mod.parseJsonResponse;
  } catch {
    // Anthropic SDK not available — mark all as D
    logger.warn('Anthropic SDK not available — skipping semantic comparison');
    return unknowns.map(u => ({ text: u.text, page: u.page, category: 'D', reason: 'no_semantic_check' }));
  }

  // Build a condensed version of the scraped corpus for the prompt
  const corpusSummary = scrapedCorpus
    .slice(0, 60) // limit to avoid token overflow
    .map(e => `[${e.field}] ${e.text.slice(0, 200)}`)
    .join('\n');

  // Batch unknowns (max 30 per call to stay within token limits)
  const results = [];
  const batchSize = 30;

  for (let i = 0; i < unknowns.length; i += batchSize) {
    const batch = unknowns.slice(i, i + batchSize);
    const numberedTexts = batch.map((u, idx) => `${idx + 1}. "${u.text.slice(0, 300)}"`).join('\n');

    const prompt = `You are comparing text found on a rebuilt contractor website against the original scraped data.

ORIGINAL SCRAPED DATA:
${corpusSummary}

TEXT BLOCKS FOUND ON REBUILT SITE (classify each):
${numberedTexts}

For each numbered text, determine:
- "B" if it's a polished/rewritten version of something in the scraped data (same meaning, different words)
- "D" if it has no clear origin in the scraped data and could be fabricated

Return ONLY valid JSON array:
[{"index": 1, "category": "B", "reason": "rewrite of about_copy"}, ...]`;

    try {
      const response = await callClaude(prompt, {
        model: 'claude-sonnet-4-6-20250514',
        maxTokens: 2048,
      });
      const parsed = parseJsonResponse(response);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const idx = (item.index || 1) - 1;
          if (idx >= 0 && idx < batch.length) {
            results.push({
              text: batch[idx].text,
              page: batch[idx].page,
              category: item.category === 'B' ? 'B' : 'D',
              reason: item.reason || '',
            });
          }
        }
        // Fill any missing indices
        for (let j = 0; j < batch.length; j++) {
          if (!results.find(r => r.text === batch[j].text)) {
            results.push({ text: batch[j].text, page: batch[j].page, category: 'D', reason: 'not_classified' });
          }
        }
      }
    } catch (err) {
      logger.warn(`Semantic comparison batch failed: ${err.message?.slice(0, 80)}`);
      for (const u of batch) {
        results.push({ text: u.text, page: u.page, category: 'D', reason: 'api_error' });
      }
    }
  }

  return results;
}

// ──────────────────────────────────────────────────────────
// Main exported function
// ──────────────────────────────────────────────────────────

/**
 * Run content fidelity analysis.
 * @param {object} params
 * @param {string} params.siteId - Tenant site ID
 * @param {string} params.demoUrl - URL of the rebuilt demo site
 * @param {string} [params.sourceUrl] - Original contractor URL (informational)
 * @param {string} params.scrapedPath - Path to scraped.json
 * @param {object} [params.logger] - Logger instance
 * @returns {Promise<{ pass: boolean, categories: { A: number, B: number, C: number, D: number }, issues: Array, testimonialCheck: string }>}
 */
export async function run({ siteId, demoUrl, sourceUrl, scrapedPath, logger: log }) {
  const _log = log || logger;
  const baseUrl = demoUrl.replace(/\/$/, '');

  _log.info(`Content fidelity check: ${baseUrl}`);

  // 1. Load scraped.json
  if (!scrapedPath || !existsSync(scrapedPath)) {
    _log.warn('No scraped data found — skipping content fidelity');
    return { pass: true, categories: { A: 0, B: 0, C: 0, D: 0 }, issues: [], testimonialCheck: 'skipped' };
  }

  const scraped = JSON.parse(readFileSync(scrapedPath, 'utf-8'));
  const corpus = buildScrapedCorpus(scraped);

  // 2. Load COS standard copy bank
  const copyBankPath = resolve(import.meta.dirname, 'fixtures/cos-standard-copy.json');
  let copyBank = [];
  try {
    copyBank = JSON.parse(readFileSync(copyBankPath, 'utf-8'));
  } catch {
    _log.warn('Could not load copy bank — Category C matching disabled');
  }

  // 3. Launch Playwright and extract visible text from all pages
  const allTextBlocks = [];
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'ConversionOS-ContentFidelityQA/1.0',
    });

    for (const pagePath of PAGES) {
      const pageUrl = `${baseUrl}${pagePath}`;

      const page = await context.newPage();
      try {
        const response = await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 });
        if (!response || response.status() >= 400) {
          _log.debug(`Page not accessible (skipping): ${pageUrl}`);
          continue;
        }

        // Extract visible text blocks (paragraphs, headings, list items, spans with substance)
        const texts = await page.evaluate(() => {
          const blocks = [];
          const selectors = 'h1, h2, h3, h4, p, li, blockquote, figcaption, [class*="testimonial"], [class*="quote"]';
          const elements = document.querySelectorAll(selectors);

          elements.forEach(el => {
            // Skip hidden elements
            if (el.offsetParent === null && getComputedStyle(el).display === 'none') return;
            const text = el.innerText?.trim();
            if (text && text.length > 0) {
              blocks.push(text);
            }
          });

          return blocks;
        });

        for (const text of texts) {
          if (text.length >= MIN_TEXT_LENGTH) {
            allTextBlocks.push({ text, page: pagePath });
          }
        }
      } catch (e) {
        _log.warn(`Error extracting text from ${pageUrl}: ${e.message?.slice(0, 80)}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  _log.info(`Extracted ${allTextBlocks.length} text blocks from ${PAGES.length} pages`);

  // 4. Classify each text block
  const categories = { A: 0, B: 0, C: 0, D: 0 };
  const classified = [];
  const unknowns = [];

  for (const block of allTextBlocks) {
    // 4a. Check copy bank first (Category C)
    if (matchesCopyBank(block.text, copyBank)) {
      categories.C++;
      classified.push({ ...block, category: 'C', reason: 'standard_cos_copy' });
      continue;
    }

    // 4b. Check scraped corpus (Category A)
    const corpusMatch = matchesScrapedCorpus(block.text, corpus);
    if (corpusMatch) {
      categories.A++;
      classified.push({ ...block, category: 'A', reason: `matches ${corpusMatch.field}`, matchedField: corpusMatch.field });
      continue;
    }

    // 4c. Unknown — batch for semantic comparison
    unknowns.push(block);
  }

  // 4c. Semantic comparison via Anthropic API (unknowns → B or D)
  if (unknowns.length > 0) {
    _log.info(`Running semantic comparison on ${unknowns.length} unknown text blocks...`);
    const semanticResults = await semanticCompare(unknowns, corpus);
    for (const result of semanticResults) {
      categories[result.category]++;
      classified.push(result);
    }
  }

  // 5. Special rules
  const issues = [];

  // 5a. Testimonial check — must be word-for-word (Category A only)
  let testimonialCheck = 'pass';
  const scrapedTestimonials = scraped.testimonials || [];
  if (scrapedTestimonials.length >= 2) {
    const testimonialBlocks = classified.filter(c =>
      c.matchedField === 'testimonials.quote' || c.matchedField === 'testimonials.author'
    );
    const nonATestimonials = classified.filter(c => {
      if (c.category === 'A') return false;
      // Check if this block looks like a testimonial by checking scraped quotes
      const normText = normalise(c.text);
      return scrapedTestimonials.some(t => {
        const normQuote = normalise(t.quote || t.text || t.content || '');
        return normQuote && (normText.includes(normQuote.slice(0, 40)) || normQuote.includes(normText.slice(0, 40)));
      });
    });

    if (nonATestimonials.length > 0) {
      testimonialCheck = 'fail';
      for (const t of nonATestimonials) {
        issues.push({
          type: 'testimonial_modified',
          page: t.page,
          text: t.text.slice(0, 120),
          category: t.category,
          detail: 'Testimonials must be word-for-word from original (Category A)',
        });
      }
    }
  } else {
    testimonialCheck = 'skipped';
  }

  // 5b. Statistics check — numbers should trace back
  const statsPattern = /(\d{1,3}[,.]?\d*)\s*\+?\s*(years?|projects?|clients?|homes?|satisfaction|reviews?)/i;
  for (const block of classified) {
    if (block.category === 'D' && statsPattern.test(block.text)) {
      issues.push({
        type: 'untraced_statistic',
        page: block.page,
        text: block.text.slice(0, 120),
        detail: 'Statistic has no traceable origin in scraped data',
      });
    }
  }

  // 5c. High D-category ratio is a warning
  const totalClassified = categories.A + categories.B + categories.C + categories.D;
  const dRatio = totalClassified > 0 ? categories.D / totalClassified : 0;
  if (dRatio > 0.3) {
    issues.push({
      type: 'high_unknown_ratio',
      detail: `${Math.round(dRatio * 100)}% of text blocks have unknown origin (Category D)`,
    });
  }

  // Pass if: no testimonial failures, D ratio < 40%, fewer than 10 D-category blocks
  const pass = testimonialCheck !== 'fail' && dRatio < 0.4 && categories.D < 10;

  _log.info(`Content fidelity: A=${categories.A} B=${categories.B} C=${categories.C} D=${categories.D}`);
  _log.info(`Testimonial check: ${testimonialCheck}`);
  _log.info(`Pass: ${pass}`);

  return { pass, categories, issues, testimonialCheck };
}

// ──────────────────────────────────────────────────────────
// CLI entry point
// ──────────────────────────────────────────────────────────

const isDirectRun = process.argv[1] &&
  (resolve(process.argv[1]) === resolve(import.meta.dirname, 'content-fidelity.mjs') ||
   import.meta.url === `file://${resolve(process.argv[1])}`);

if (isDirectRun) {
  const { values: cliArgs } = parseArgs({
    options: {
      url: { type: 'string' },
      'scraped-data': { type: 'string' },
      'site-id': { type: 'string' },
      output: { type: 'string' },
      help: { type: 'boolean' },
    },
  });

  if (cliArgs.help) {
    console.log(`Content Fidelity QA — verify every text element traces to original scraped content

Usage:
  node qa/content-fidelity.mjs --url https://example.norbotsystems.com --scraped-data ./results/scraped.json
  node qa/content-fidelity.mjs --url URL --scraped-data ./scraped.json --site-id example --output ./results/

Categories:
  A — Direct copy (matches scraped data, Levenshtein ≤ 3 or substring)
  B — AI-polished (semantically similar, verified by Claude Sonnet)
  C — Standard COS element (from copy bank)
  D — Unknown/suspicious (no traceable origin)

Special rules:
  - Testimonials: word-for-word match required (Category A only)
  - Statistics: must trace to original scraped data`);
    process.exit(0);
  }

  if (!cliArgs.url || !cliArgs['scraped-data']) {
    logger.error('Required: --url and --scraped-data');
    console.log('Run with --help for usage');
    process.exit(1);
  }

  const siteId = cliArgs['site-id'] || 'unknown';
  const today = new Date().toISOString().slice(0, 10);
  const outputPath = cliArgs.output || resolve(import.meta.dirname, `../results/${today}/${siteId}`);

  logger.progress({
    stage: 'content-fidelity',
    site_id: siteId,
    status: 'start',
    detail: cliArgs.url,
  });

  try {
    const result = await run({
      siteId,
      demoUrl: cliArgs.url,
      scrapedPath: cliArgs['scraped-data'],
      logger,
    });

    // Write results
    mkdirSync(outputPath, { recursive: true });
    const resultFile = resolve(outputPath, 'content-fidelity.json');
    writeFileSync(resultFile, JSON.stringify(result, null, 2));
    logger.info(`Results written: ${resultFile}`);

    logger.progress({
      stage: 'content-fidelity',
      site_id: siteId,
      status: result.pass ? 'complete' : 'error',
      detail: `A=${result.categories.A} B=${result.categories.B} C=${result.categories.C} D=${result.categories.D}`,
    });

    console.log(JSON.stringify(result));
    process.exit(result.pass ? 0 : 1);
  } catch (e) {
    logger.error(`Content fidelity check failed: ${e.message}`);
    process.exit(1);
  }
}
