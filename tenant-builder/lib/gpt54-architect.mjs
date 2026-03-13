/**
 * GPT 5.4 Vision Architect — analyses original website screenshots
 * to produce a SiteBlueprint v2 with detailed visual section specs.
 *
 * Uses Codex 0.114.0 with:
 * - --image for full-resolution screenshot input (GPT 5.4 xhigh)
 * - --output-schema for validated JSON output
 * - -o to capture structured output to file
 * - --ephemeral for clean runs
 *
 * Falls back to text-only Opus (callOpus) if Codex vision fails.
 */

import { codexExec } from './codex-cli.mjs';
import { validateBlueprint } from '../schemas/site-blueprint-v2.zod.mjs';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as logger from './logger.mjs';

const SCHEMA_PATH = resolve(import.meta.dirname, '../schemas/site-blueprint-v2-jsonschema.json');

// Standard sections that work as-is (no visual matching needed)
const STANDARD_SECTIONS = [
  'trust:badge-strip — Trust badge strip (data-driven)',
  'trust:stats-counter — Animated stat counters (data-driven)',
  'cta:full-width-primary — Full-width CTA band',
  'cta:inline-card — Inline CTA card',
  'misc:visualizer-teaser — AI Design Studio teaser',
  'misc:breadcrumb-hero — Compact breadcrumb hero for inner pages',
  'misc:faq-accordion — FAQ accordion (content-driven)',
  'misc:process-steps — Process steps (data-driven)',
];

/**
 * Analyse original website screenshots and produce a bespoke blueprint.
 *
 * @param {string} resultsDir - Path to results directory
 * @param {string} siteId - Tenant site ID
 * @param {object} [options]
 * @param {number} [options.timeoutMs=300000]
 * @param {number} [options.maxRetries=1]
 * @returns {Promise<object>} Validated SiteBlueprint v2
 */
export async function architectWithVision(resultsDir, siteId, { timeoutMs = 300000, maxRetries = 1 } = {}) {
  // Collect screenshots
  const screenshotDir = join(resultsDir, 'screenshots/original');
  const images = discoverAndPrioritizeScreenshots(screenshotDir);

  if (images.length === 0) {
    throw new Error('No screenshots available for vision architect');
  }

  // Load supplementary data
  const scraped = loadJsonIfExists(join(resultsDir, 'scraped.json')) || {};
  const cssTokens = loadJsonIfExists(join(resultsDir, 'css-tokens.json'));

  const prompt = buildVisionPrompt(scraped, cssTokens, siteId, images);
  const outputPath = join(resultsDir, 'gpt54-blueprint-output.json');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Vision Architect: attempt ${attempt + 1} with ${images.length} screenshot(s)`);

      await codexExec(prompt, {
        cwd: resultsDir,
        timeoutMs,
        images,
        ephemeral: true,
        outputSchema: existsSync(SCHEMA_PATH) ? SCHEMA_PATH : undefined,
        outputFile: outputPath,
      });

      if (existsSync(outputPath)) {
        const rawText = readFileSync(outputPath, 'utf-8').trim();
        // Handle potential markdown code fences
        const cleaned = rawText.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?\s*```$/m, '');
        const raw = JSON.parse(cleaned);
        const result = validateBlueprint(raw);
        if (result.success) {
          logger.info(`Vision Architect: ${result.data.pages.length} pages, ${result.data.customSections?.length ?? 0} custom sections`);
          return result.data;
        }
        logger.warn(`Vision Architect: Zod validation failed (attempt ${attempt + 1}): ${result.error.message}`);
      } else {
        logger.warn(`Vision Architect: No output file produced (attempt ${attempt + 1})`);
      }
    } catch (err) {
      logger.warn(`Vision Architect: Failed (attempt ${attempt + 1}): ${err.message?.slice(0, 200)}`);
    }
  }

  throw new Error('GPT 5.4 Vision Architect failed after all attempts');
}

/**
 * Discover screenshots and return at most 2: homepage desktop (always)
 * + homepage mobile (if available). Inner page screenshots are excluded
 * because they inflate token count and cause Codex timeouts.
 */
function discoverAndPrioritizeScreenshots(screenshotDir) {
  if (!existsSync(screenshotDir)) return [];

  const files = readdirSync(screenshotDir)
    .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
    .map(f => join(screenshotDir, f));

  // Pick only homepage screenshots — inner pages cause timeouts
  const homepageDesktop = files.find(f => {
    const name = f.toLowerCase();
    return name.includes('homepage') && name.includes('desktop');
  });
  const homepageMobile = files.find(f => {
    const name = f.toLowerCase();
    return name.includes('homepage') && name.includes('mobile');
  });

  const result = [];
  if (homepageDesktop) result.push(homepageDesktop);
  if (homepageMobile) result.push(homepageMobile);

  // If no homepage screenshots found, take the first available as fallback
  if (result.length === 0 && files.length > 0) {
    result.push(files[0]);
  }

  return result;
}

/**
 * Build the vision-first architect prompt.
 */
function buildVisionPrompt(scraped, cssTokens, siteId, imagePaths) {
  // Compact scraped data summary
  const dataSummary = JSON.stringify({
    business_name: scraped.business_name,
    tagline: scraped.tagline,
    city: scraped.city,
    primary_color_hex: scraped.primary_color_hex,
    primary_color_oklch: scraped._meta?.primary_oklch,
    service_count: scraped.services?.length ?? 0,
    testimonial_count: scraped.testimonials?.length ?? 0,
    portfolio_count: scraped.portfolio?.length ?? 0,
    has_about: Boolean(scraped.about_text || scraped.about_copy),
    has_team: Boolean(scraped.team_members?.length),
  }, null, 2);

  // CSS tokens summary
  let cssSummary = 'Not extracted';
  if (cssTokens) {
    cssSummary = JSON.stringify({
      fonts: cssTokens.renderedFonts,
      h1: cssTokens.elements?.h1,
      button: cssTokens.elements?.button,
      borderRadii: cssTokens.borderRadii,
      backgrounds: cssTokens.backgrounds?.slice(0, 3),
    }, null, 2);
  }

  const imageList = imagePaths.map((p, i) => `  ${i + 1}. ${p.split('/').pop()}`).join('\n');

  return `LOOK at the attached screenshots of a renovation contractor's website. You are analysing it to create a rebuild blueprint.

## YOUR TASK
Identify every distinct visual section on EACH page (hero, nav, services, gallery, testimonials, CTA, footer, etc.). For EACH section, describe the EXACT layout you see — not what you think a contractor site should look like.

Note specifically:
- Skewed sections, clip-paths, overlapping images, custom gradients
- Card grid patterns (how many columns, spacing, border-radius)
- Typography hierarchy (heading sizes relative to body)
- Background treatments (full-bleed images, overlays, solid colours, gradients)
- Interactive elements visible (sliders, accordions, hover states)
- Navigation style (transparent overlay, solid, sticky)

## SCREENSHOTS (${imagePaths.length} images attached)
${imageList}

## SCRAPED DATA
${dataSummary}

## CSS TOKENS
${cssSummary}

## STANDARD SECTIONS (use only when data-driven sections are adequate)
${STANDARD_SECTIONS.join('\n')}

## OUTPUT RULES
- Section IDs: custom sections use \`custom:${siteId}-{name}\` pattern
- Homepage: 6-12 custom sections (hero + nav + content blocks + CTA + footer)
- Inner pages: start with misc:breadcrumb-hero, then custom sections matching the original
- Theme: extract exact values from CSS tokens (fonts, colours as OKLCH, border-radius)
- contentMapping: use camelCase field names (heroHeadline, heroImageUrl, aboutCopy, etc.)
- animations: prescribe from [parallax-bg, stagger-text, fade-in-up, count-up, slide-in-left, slide-in-right, scale-in, stagger-items]

Return ONLY valid JSON matching the SiteBlueprint v2 schema. No explanation, no markdown.`;
}

// ─── Helpers ────────────────────────────────────────────

function loadJsonIfExists(path) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch { return null; }
}
