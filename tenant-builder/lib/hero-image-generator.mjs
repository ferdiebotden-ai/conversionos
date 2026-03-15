/**
 * Hero Image Generator — Before/After Kitchen Images for Visualiser Showcase
 *
 * Generates a set of before/after kitchen renovation images using Gemini 3.1
 * Flash Image model (Nano Banana 2). Produces:
 *   - 1 "before" image (dated, outdated kitchen)
 *   - 3 "after" images (Modern, Farmhouse, Industrial styles)
 *
 * Uploads all images to Supabase Storage under `{siteId}/hero/` and returns
 * the `heroVisualizerImages` config object ready to store in admin_settings.
 *
 * Falls back gracefully if the Gemini API fails (returns null).
 *
 * @module hero-image-generator
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { uploadToStorage } from './supabase-client.mjs';
import * as logger from './logger.mjs';

/**
 * @typedef {Object} StyleConfig
 * @property {string} label - Display label (e.g. "Modern")
 * @property {string} slug - URL-safe slug (e.g. "modern")
 * @property {string} prompt - Gemini prompt describing the after style
 */

/** @type {StyleConfig[]} */
const AFTER_STYLES = [
  {
    label: 'Modern',
    slug: 'modern',
    prompt:
      'Professional architectural photography of a beautifully renovated modern kitchen. Sleek flat-panel cabinetry, quartz waterfall island, integrated LED strip lighting, stainless steel appliances, pendant lights. Clean lines, minimalist aesthetic. Bright natural lighting, warm and inviting. 16:10 aspect ratio. No text, no logos, no watermarks.',
  },
  {
    label: 'Farmhouse',
    slug: 'farmhouse',
    prompt:
      'Professional architectural photography of a renovated farmhouse-style kitchen. Shaker cabinetry in warm white, butcher block countertops, apron-front sink, open shelving with ceramic dishes, wrought iron pendant lights, subway tile backsplash. Rustic warmth meets modern convenience. Bright natural lighting. 16:10 aspect ratio. No text, no logos, no watermarks.',
  },
  {
    label: 'Industrial',
    slug: 'industrial',
    prompt:
      'Professional architectural photography of a renovated industrial-style kitchen. Exposed brick wall, dark metal and wood cabinetry, concrete countertops, industrial pendant lights, open steel shelving, matte black fixtures. Raw urban elegance. Bright natural lighting with warm spots. 16:10 aspect ratio. No text, no logos, no watermarks.',
  },
];

const BEFORE_PROMPT =
  'Professional photograph of a dated, outdated kitchen needing renovation. Old laminate countertops, worn wooden cabinetry from the 1990s, fluorescent ceiling light, linoleum flooring, outdated backsplash. Slightly dim, uninspiring but clean. Realistic, not exaggerated. 16:10 aspect ratio. No text, no logos, no watermarks.';

/**
 * Generate a single image with Gemini and upload to Supabase Storage.
 *
 * @param {import('@google/generative-ai').GenerativeModel} model - Gemini model
 * @param {string} prompt - Image generation prompt
 * @param {string} siteId - Tenant site ID
 * @param {string} filename - Filename within the hero/ directory
 * @returns {Promise<string | null>} Public URL or null on failure
 */
async function generateAndUpload(model, prompt, siteId, filename) {
  try {
    const result = await model.generateContent(prompt);
    const parts = result.response.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if (part.inlineData) {
        const imageData = Buffer.from(part.inlineData.data, 'base64');
        const storagePath = `${siteId}/hero/${filename}`;
        const publicUrl = await uploadToStorage(
          'tenant-assets',
          storagePath,
          imageData,
          'image/png',
        );
        logger.info(
          `Hero visualiser image uploaded: ${filename} (${(imageData.length / 1024).toFixed(0)} KB)`,
        );
        return publicUrl;
      }
    }

    logger.warn(`Gemini returned no image data for ${filename}`);
    return null;
  } catch (err) {
    logger.warn(`Image generation failed for ${filename}: ${err.message}`);
    return null;
  }
}

/**
 * Generate before/after kitchen images for the hero visualiser showcase.
 *
 * @param {Object} options
 * @param {string} options.siteId - Tenant site ID for storage path
 * @param {string} [options.primaryHex] - Primary brand colour hex (for prompt hints)
 * @param {string} [options.companyName] - Company name (unused, reserved for future prompt customisation)
 * @returns {Promise<import('./palette-extractor.mjs').HeroVisualizerImages | null>}
 *   heroVisualizerImages config object, or null on complete failure
 */
export async function generateHeroVisualizerImages({ siteId, primaryHex, companyName } = {}) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    logger.warn(
      'GOOGLE_GENERATIVE_AI_API_KEY not set — skipping hero visualiser image generation',
    );
    return null;
  }

  logger.info(`Generating hero visualiser images for ${siteId}...`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-image-preview',
    generationConfig: { responseModalities: ['image', 'text'] },
  });

  // Generate the before image
  const beforeUrl = await generateAndUpload(
    model,
    BEFORE_PROMPT,
    siteId,
    'before-kitchen.png',
  );

  if (!beforeUrl) {
    logger.warn(`Before image generation failed for ${siteId} — returning null`);
    return null;
  }

  // Generate after images in parallel
  const afterResults = await Promise.allSettled(
    AFTER_STYLES.map((style) =>
      generateAndUpload(
        model,
        style.prompt,
        siteId,
        `after-${style.slug}.png`,
      ).then((url) => ({ label: style.label, url })),
    ),
  );

  const styles = afterResults
    .filter(
      /** @param {PromiseSettledResult} r */
      (r) => r.status === 'fulfilled' && r.value.url != null,
    )
    .map((r) => ({
      label: /** @type {PromiseFulfilledResult} */ (r).value.label,
      after: /** @type {PromiseFulfilledResult} */ (r).value.url,
    }));

  if (styles.length === 0) {
    logger.warn(`No after images generated for ${siteId} — returning null`);
    return null;
  }

  const result = {
    before: beforeUrl,
    styles,
  };

  logger.info(
    `Hero visualiser images complete for ${siteId}: 1 before + ${styles.length} after styles`,
  );

  return result;
}
