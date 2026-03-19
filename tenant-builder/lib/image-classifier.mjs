/**
 * Image Classifier — URL heuristic + Gemini batch classification.
 *
 * Two main functions:
 * 1. classifyPortfolioImages() — filters logos/badges from portfolio candidates
 * 2. evaluateHeroQuality() — checks if hero image is a real renovation photo
 *
 * Uses URL heuristics first (free, instant), Gemini CLI only for ambiguous cases ($0 via subscription).
 */

import * as logger from './logger.mjs';
import { geminiAnalyze } from './gemini-cli.mjs';

// ─── URL Heuristic Patterns ────────────────────────────────────────────────

/** URL patterns that indicate non-project images */
const NON_PROJECT_URL_PATTERNS = [
  /logo/i, /badge/i, /icon/i, /favicon/i, /brand/i,
  /partner/i, /sponsor/i, /award/i, /certif/i, /accredit/i,
  /seal/i, /emblem/i, /crest/i, /ribbon/i,
  /social[-_]?media/i, /share[-_]?button/i,
  /avatar/i, /gravatar/i, /profile[-_]?pic/i,
  /banner[-_]?ad/i, /advertisement/i, /promo[-_]?banner/i,
  /powered[-_]?by/i, /built[-_]?by/i, /designed[-_]?by/i,
  /linknow/i, /godaddy/i, /wix\.com/i, /squarespace[-_]?cdn.*assets/i,
  /google[-_]?review/i, /trustindex/i, /elfsight/i,
  /bbb[-_]?logo/i, /houzz[-_]?badge/i, /home[-_]?stars/i,
  /eaton|siemens|schneider|ge[-_]?logo|leviton/i, // electrical brand logos
];

/** URL patterns that strongly indicate project/renovation photos */
const PROJECT_URL_PATTERNS = [
  /kitchen/i, /bathroom/i, /basement/i, /renovation/i, /remodel/i,
  /project/i, /portfolio/i, /gallery/i, /our[-_]?work/i,
  /before[-_]?after/i, /completed/i, /finished/i,
  /interior/i, /exterior/i, /living[-_]?room/i, /bedroom/i,
  /deck/i, /patio/i, /backyard/i, /garden/i,
  /flooring/i, /hardwood/i, /tile/i, /cabinet/i,
  /counter/i, /granite/i, /marble/i, /quartz/i,
];

/**
 * Classify a single image URL using heuristics only.
 * Returns: 'project' | 'logo' | 'badge' | 'unknown'
 */
function classifyByUrl(imageUrl) {
  const lower = imageUrl.toLowerCase();
  const filename = lower.split('/').pop()?.split('?')[0] || '';

  // Check non-project patterns
  for (const pattern of NON_PROJECT_URL_PATTERNS) {
    if (pattern.test(lower)) return 'logo';
  }

  // Check project patterns
  for (const pattern of PROJECT_URL_PATTERNS) {
    if (pattern.test(filename) || pattern.test(lower)) return 'project';
  }

  // Filename heuristics
  if (/^(logo|badge|icon|seal|emblem)\b/i.test(filename)) return 'logo';
  if (/^(img|image|photo|pic|dsc|img_)\d/i.test(filename)) return 'project'; // Generic camera filenames
  if (/\d{3,4}x\d{3,4}/i.test(filename)) return 'project'; // Dimension-based filenames
  if (/-scaled|-resized|-thumb/i.test(filename)) return 'project'; // WordPress resized
  if (/slide|slider|carousel|hero/i.test(lower)) return 'project';

  return 'unknown';
}

/**
 * Filter portfolio image candidates — remove logos, badges, icons.
 *
 * @param {string[]} imageUrls - Candidate image URLs
 * @param {Object} [options]
 * @param {boolean} [options.useGemini=true] - Use Gemini CLI for ambiguous images
 * @param {number} [options.maxGeminiCalls=1] - Max Gemini batch calls
 * @returns {Promise<{ projectImages: string[], headshots: string[], filtered: number }>}
 */
export async function classifyPortfolioImages(imageUrls, options = {}) {
  const { useGemini = true, maxGeminiCalls = 1 } = options;

  if (!imageUrls?.length) return { projectImages: [], headshots: [], filtered: 0 };

  const projectImages = [];
  const headshots = [];
  const ambiguous = [];
  let filtered = 0;

  // First pass: URL heuristics
  for (const url of imageUrls) {
    const type = classifyByUrl(url);
    if (type === 'project') {
      projectImages.push(url);
    } else if (type === 'logo') {
      filtered++;
    } else {
      ambiguous.push(url);
    }
  }

  // Second pass: Gemini batch classification for ambiguous URLs
  if (useGemini && ambiguous.length > 0 && maxGeminiCalls > 0) {
    try {
      const urlList = ambiguous.slice(0, 30).map((u, i) => `${i + 1}. ${u}`).join('\n');
      const prompt = `Classify each image URL based on its filename and path segments.
Categories:
- renovation_photo: A photo of a home renovation, construction project, or interior/exterior space
- logo: A company logo, brand mark, or wordmark
- badge: A certification badge, award seal, review widget, or partner logo
- headshot: A portrait photo of a person (team member, owner)
- icon: A small icon, social media button, or UI element

URLs:
${urlList}

Return a JSON array: [{"index": 1, "type": "renovation_photo"}, ...]`;

      const result = await geminiAnalyze(prompt, { timeout: 30000 });
      if (Array.isArray(result)) {
        for (const item of result) {
          const idx = (item.index || item.i) - 1;
          if (idx >= 0 && idx < ambiguous.length) {
            const type = (item.type || item.category || '').toLowerCase();
            if (type.includes('renovation') || type.includes('photo') || type.includes('project')) {
              projectImages.push(ambiguous[idx]);
            } else if (type.includes('headshot') || type.includes('portrait')) {
              headshots.push(ambiguous[idx]);
            } else {
              filtered++;
            }
          }
        }
        // Any unclassified ambiguous images default to project (benefit of the doubt)
        const classifiedIndices = new Set(result.map(r => (r.index || r.i) - 1));
        for (let i = 0; i < ambiguous.length; i++) {
          if (!classifiedIndices.has(i)) {
            projectImages.push(ambiguous[i]);
          }
        }
      } else {
        // Gemini failed — keep all ambiguous as project photos (conservative)
        projectImages.push(...ambiguous);
      }
    } catch (e) {
      logger.warn(`Gemini portfolio classification failed: ${e.message} — keeping ambiguous images`);
      projectImages.push(...ambiguous);
    }
  } else {
    // No Gemini — keep ambiguous images (benefit of the doubt)
    projectImages.push(...ambiguous);
  }

  logger.info(`Image classifier: ${projectImages.length} project, ${headshots.length} headshot, ${filtered} filtered from ${imageUrls.length} candidates`);
  return { projectImages, headshots, filtered };
}

/**
 * Evaluate hero image quality — is it a real renovation photo?
 *
 * @param {string} heroUrl - Current hero image URL
 * @param {string[]} alternativeUrls - Fallback image URLs to try
 * @param {Object} [options]
 * @param {string} [options.companyName=''] - Company name for logo detection
 * @param {boolean} [options.useGemini=true] - Use Gemini CLI for evaluation
 * @returns {Promise<{ url: string, score: number, reason: string, swapped: boolean }>}
 */
export async function evaluateHeroQuality(heroUrl, alternativeUrls = [], options = {}) {
  const { companyName = '', useGemini = true } = options;

  if (!heroUrl) {
    // No hero at all — try alternatives
    for (const alt of alternativeUrls) {
      const type = classifyByUrl(alt);
      if (type === 'project') {
        return { url: alt, score: 3, reason: 'no_hero_fallback_to_project_image', swapped: true };
      }
    }
    return { url: '', score: 0, reason: 'no_hero_no_alternatives', swapped: false };
  }

  // Step 1: URL heuristic check
  const urlLower = heroUrl.toLowerCase();
  const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Strong logo indicators
  if (/logo|brand|watermark|wordmark|favicon/i.test(urlLower)) {
    return swapHero(heroUrl, alternativeUrls, 1, 'url_contains_logo_keyword');
  }

  // Company name in filename suggests it's a branded overlay, not a project photo
  if (companySlug.length > 3 && urlLower.includes(companySlug)) {
    // Only flag if it's in the filename, not just the domain
    const filename = urlLower.split('/').pop()?.split('?')[0] || '';
    if (filename.includes(companySlug)) {
      return swapHero(heroUrl, alternativeUrls, 2, 'filename_contains_company_name');
    }
  }

  // Data URI or base64 (non-renderable)
  if (heroUrl.startsWith('data:')) {
    return swapHero(heroUrl, alternativeUrls, 0, 'data_uri_not_renderable');
  }

  // Step 2: Gemini text-based evaluation (URL only, no vision)
  if (useGemini) {
    try {
      const prompt = `Analyze this image URL and determine if it's likely a high-quality photo of a completed renovation or construction project.

URL: ${heroUrl}

Based ONLY on the URL path, filename, and domain, rate 1-5:
1 = Definitely a logo, icon, or text overlay
2 = Likely generic stock photo or branding asset
3 = Possibly a project photo but can't be sure
4 = Likely a real renovation/construction photo
5 = Almost certainly a high-quality project photo

Return JSON: {"score": N, "reason": "brief explanation"}`;

      const result = await geminiAnalyze(prompt, { timeout: 15000 });
      if (result?.score && result.score < 3) {
        return swapHero(heroUrl, alternativeUrls, result.score, `gemini: ${result.reason || 'low quality'}`);
      }

      return { url: heroUrl, score: result?.score || 4, reason: result?.reason || 'passed_quality_check', swapped: false };
    } catch (e) {
      logger.debug(`Gemini hero evaluation failed: ${e.message} — keeping current hero`);
    }
  }

  // Default: keep current hero
  return { url: heroUrl, score: 4, reason: 'passed_heuristic_check', swapped: false };
}

/**
 * Try to swap a bad hero with a better alternative.
 */
function swapHero(currentUrl, alternatives, currentScore, reason) {
  for (const alt of alternatives) {
    const type = classifyByUrl(alt);
    if (type === 'project') {
      logger.info(`Hero swapped: ${reason} → ${alt.slice(0, 60)}`);
      return { url: alt, score: 4, reason: `swapped_from_${reason}`, swapped: true };
    }
  }
  // No better alternative — keep current but flag it
  logger.warn(`Hero quality low (${reason}) but no better alternative found`);
  return { url: currentUrl, score: currentScore, reason: `kept_despite_${reason}`, swapped: false };
}
