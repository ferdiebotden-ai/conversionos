/**
 * Design Director — produces a Design Language Document from vision analysis.
 *
 * Pipeline:
 * 1. Gemini 3.1 Pro analyses screenshots + scroll video → Design Language v1
 * 2. Opus 4.6 cross-checks against screenshots → Design Language FINAL
 *
 * The Design Language captures the visual DNA of the original site:
 * spacing rhythm, colour psychology, typography hierarchy, animation style,
 * card treatments, photographic approach, hover effects, premium upgrades.
 *
 * Output: ~1000-1200 token text artifact used by Codex to build sections
 * that match the original site's aesthetic AND incorporate premium upgrades.
 */

import { callGemini } from './lib/gemini-client.mjs';
import { callClaude } from './lib/anthropic-client.mjs';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import * as logger from './lib/logger.mjs';

/**
 * Produce a Design Language Document for a target site.
 *
 * @param {string} resultsDir - Path containing screenshots/, css-tokens.json, recordings/
 * @param {string} siteId - Tenant site ID
 * @param {object} [options]
 * @param {number} [options.timeoutMs=60000] - Total timeout
 * @param {boolean} [options.skipCrossCheck=false] - Skip Opus cross-check (faster, less accurate)
 * @returns {Promise<string>} The Design Language Document text
 */
export async function designDirector(resultsDir, siteId, { timeoutMs = 60000, skipCrossCheck = false } = {}) {
  const screenshotDir = join(resultsDir, 'screenshots/original');
  const cssTokensPath = join(resultsDir, 'css-tokens.json');
  const recordingPath = join(resultsDir, 'recordings/homepage-scroll.webm');

  // Gather media inputs
  const media = [];

  // Homepage desktop screenshot (primary)
  const desktopScreenshot = findScreenshot(screenshotDir, 'homepage-desktop');
  if (desktopScreenshot) media.push({ path: desktopScreenshot });

  // Homepage mobile screenshot
  const mobileScreenshot = findScreenshot(screenshotDir, 'homepage-mobile');
  if (mobileScreenshot) media.push({ path: mobileScreenshot });

  // Scroll recording (if available)
  if (existsSync(recordingPath)) {
    media.push({ path: recordingPath, mimeType: 'video/webm' });
  }

  if (media.length === 0) {
    logger.warn(`[${siteId}] Design Director: no screenshots available — returning minimal Design Language`);
    return buildMinimalDesignLanguage(siteId, cssTokensPath);
  }

  // Load CSS tokens summary
  let cssTokensSummary = '';
  if (existsSync(cssTokensPath)) {
    try {
      const tokens = JSON.parse(readFileSync(cssTokensPath, 'utf-8'));
      cssTokensSummary = JSON.stringify({
        renderedFonts: tokens.renderedFonts,
        h1: tokens.elements?.h1,
        h2: tokens.elements?.h2,
        body: tokens.elements?.body,
        button: tokens.elements?.button,
        borderRadii: tokens.borderRadii,
        backgrounds: tokens.backgrounds?.slice(0, 4),
        spacingRhythm: tokens.spacingRhythm?.slice(0, 5),
        customProperties: tokens.customProperties,
      }, null, 2);
    } catch { /* ignore */ }
  }

  // ── Step 1: Gemini 2.5 Pro — Primary Design Analysis ──
  logger.info(`[${siteId}] Design Director: Gemini analysis (${media.length} media inputs)`);

  const geminiPrompt = `You are a senior web designer analysing a renovation contractor's website.
Produce a DESIGN LANGUAGE DOCUMENT that captures the complete visual DNA.

${cssTokensSummary ? `CSS tokens from the live site:\n${cssTokensSummary}\n` : ''}

Include these sections (be SPECIFIC with values, not vague):
1. VISUAL HIERARCHY — hero treatment, content flow, section weight distribution
2. COLOUR APPLICATION — where primary/accent/neutral are used, gradient patterns, overlay treatments
3. SPACING RHYTHM — section padding, card gaps, grid gutters, baseline measurements
4. TYPOGRAPHY — font families, size scale (px), weight usage, letter-spacing, line-height
5. CARD & COMPONENT STYLE — border-radius, shadows, borders, background treatments
6. ANIMATION & INTERACTION — entrance animations, hover effects, scroll behaviours, transitions
7. PHOTOGRAPHIC TREATMENT — overlay styles, aspect ratios, crop patterns, filter effects
8. PREMIUM UPGRADE PATH — 5-7 specific enhancements to elevate this to 2026 premium standards
   (glassmorphism accents, advanced hover states, parallax, stagger reveals, grain textures,
   gradient mesh backgrounds, micro-interactions on CTAs)

Output ONLY the Design Language Document. No explanations or preamble.`;

  let designLanguage;
  try {
    designLanguage = await callGemini(geminiPrompt, {
      media,
      maxOutputTokens: 4096,
    });
    logger.info(`[${siteId}] Design Director: Gemini produced ${designLanguage.length} chars`);
  } catch (err) {
    logger.warn(`[${siteId}] Gemini Design Director failed: ${err.message?.slice(0, 200)}`);

    // Fallback: try Opus-only
    return await opusOnlyDesignDirector(media, cssTokensSummary, siteId);
  }

  // ── Step 2: Opus 4.6 Cross-Check ──
  if (skipCrossCheck) {
    logger.info(`[${siteId}] Design Director: skipping Opus cross-check`);
    writeFileSync(join(resultsDir, 'design-language.md'), designLanguage);
    return designLanguage;
  }

  logger.info(`[${siteId}] Design Director: Opus cross-check`);

  const opusImages = [];
  if (desktopScreenshot) opusImages.push({ path: desktopScreenshot });
  if (mobileScreenshot) opusImages.push({ path: mobileScreenshot });

  const crossCheckPrompt = `Review this Design Language Document against the attached screenshots.
Add any visual details the document missed. Correct any inaccuracies.
Enhance the PREMIUM UPGRADE PATH with your recommendations.
Return the REVISED Design Language Document only.

CURRENT DESIGN LANGUAGE:
${designLanguage}`;

  try {
    const revised = await callClaude(crossCheckPrompt, {
      model: 'claude-opus-4-6-20250514',
      maxTokens: 4096,
      images: opusImages,
    });
    logger.info(`[${siteId}] Design Director: Opus revised to ${revised.length} chars`);
    designLanguage = revised;
  } catch (err) {
    logger.warn(`[${siteId}] Opus cross-check failed (non-blocking): ${err.message?.slice(0, 100)}`);
    // Keep Gemini's version
  }

  // Save to results
  writeFileSync(join(resultsDir, 'design-language.md'), designLanguage);
  return designLanguage;
}

/**
 * Fallback: Opus-only Design Director when Gemini is unavailable.
 */
async function opusOnlyDesignDirector(media, cssTokensSummary, siteId) {
  logger.info(`[${siteId}] Design Director: Opus-only fallback`);

  const images = media.filter(m => !m.mimeType?.startsWith('video'));

  const prompt = `You are a senior web designer analysing a renovation contractor's website.
Produce a DESIGN LANGUAGE DOCUMENT that captures the complete visual DNA.

${cssTokensSummary ? `CSS tokens:\n${cssTokensSummary}\n` : ''}

Include: VISUAL HIERARCHY, COLOUR APPLICATION, SPACING RHYTHM, TYPOGRAPHY,
CARD & COMPONENT STYLE, ANIMATION & INTERACTION, PHOTOGRAPHIC TREATMENT,
PREMIUM UPGRADE PATH (5-7 specific enhancements for 2026 premium standards).

Be SPECIFIC with values (px, hex/oklch, font names, timing functions). Not vague.
Output ONLY the Design Language Document.`;

  try {
    return await callClaude(prompt, {
      model: 'claude-opus-4-6-20250514',
      maxTokens: 4096,
      images,
    });
  } catch (err) {
    logger.warn(`[${siteId}] Opus-only Design Director failed: ${err.message?.slice(0, 100)}`);
    return buildMinimalDesignLanguage(siteId);
  }
}

/**
 * Minimal Design Language from CSS tokens only (last resort).
 */
function buildMinimalDesignLanguage(siteId, cssTokensPath) {
  let tokenInfo = '';
  if (cssTokensPath && existsSync(cssTokensPath)) {
    try {
      const tokens = JSON.parse(readFileSync(cssTokensPath, 'utf-8'));
      const fonts = tokens.renderedFonts?.join(', ') || 'sans-serif';
      const radii = tokens.borderRadii?.join(', ') || '8px';
      tokenInfo = `TYPOGRAPHY: ${fonts}\nBORDER RADIUS: ${radii}`;
    } catch { /* ignore */ }
  }

  return `DESIGN LANGUAGE — ${siteId} (minimal, no screenshots available)

VISUAL HIERARCHY: Standard contractor layout — hero with overlay, services grid, about, testimonials, CTA, footer.
COLOUR APPLICATION: Use brand primary for CTAs and accents. Backgrounds alternate white and warm grey (#f5f5f5).
SPACING RHYTHM: 96px section padding desktop, 48px mobile. 24px card padding. 16px grid gap.
${tokenInfo || 'TYPOGRAPHY: Sans-serif headings and body. H1: 48px/56px, H2: 32px/40px, body: 16px/28px.'}
CARD & COMPONENT STYLE: White cards, box-shadow 0 4px 24px rgba(0,0,0,0.08), 12px border-radius.
ANIMATION & INTERACTION: Fade-in-up on scroll, stagger children by 100ms. Hover: lift 4px + shadow expansion.
PHOTOGRAPHIC TREATMENT: Hero dark overlay (rgba 0,0,0,0.5). Gallery 1:1 aspect ratio with zoom-on-hover.
PREMIUM UPGRADE PATH:
→ Add glassmorphism accent behind stats
→ Upgrade card hover to include border-colour transition
→ Add parallax scroll on hero background (10% offset)
→ Stagger reveals on grid sections via IntersectionObserver
→ Add grain texture overlay on dark sections`;
}

/**
 * Find a screenshot file matching a pattern.
 */
function findScreenshot(dir, pattern) {
  if (!existsSync(dir)) return null;
  try {
    const files = readdirSync(dir).filter(f =>
      (f.endsWith('.png') || f.endsWith('.jpg')) && f.includes(pattern)
    );
    return files.length > 0 ? join(dir, files[0]) : null;
  } catch {
    return null;
  }
}
