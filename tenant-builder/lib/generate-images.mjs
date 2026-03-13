/**
 * Generate fallback hero/about/OG images using Gemini when scraping didn't find them.
 * Uses gemini-3.1-flash-image-preview (Nano Banana 2) — same as visualizer.
 *
 * Cost: ~$0.02 per image generation.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { uploadToStorage } from './supabase-client.mjs';
import * as logger from './logger.mjs';

/**
 * Infer primary service type from scraped services array.
 */
function inferServiceType(services) {
  if (!services || services.length === 0) return 'renovation';
  const names = services.map(s => (s.name || '').toLowerCase()).join(' ');
  if (names.includes('kitchen')) return 'kitchen';
  if (names.includes('bathroom') || names.includes('bath')) return 'bathroom';
  if (names.includes('basement')) return 'basement';
  if (names.includes('flooring') || names.includes('floor')) return 'flooring';
  if (names.includes('exterior') || names.includes('siding') || names.includes('roofing')) return 'exterior';
  return 'renovation';
}

/**
 * Describe a hex colour for use in image generation prompts.
 */
function describeColour(hex) {
  if (!hex) return 'warm neutral';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (r > 180 && g < 100 && b < 100) return 'rich red';
  if (r > 180 && g > 100 && b < 80) return 'warm orange';
  if (r > 180 && g > 180 && b < 80) return 'golden yellow';
  if (r < 80 && g > 150 && b < 80) return 'natural green';
  if (r < 100 && g < 100 && b > 150) return 'deep blue';
  if (r < 80 && g > 120 && b > 150) return 'ocean teal';
  if (r > 150 && g < 80 && b > 150) return 'rich purple';
  if (r > 180 && g > 180 && b > 180) return 'clean white';
  if (r < 60 && g < 60 && b < 60) return 'elegant dark';
  return 'warm neutral';
}

/**
 * Generate a hero image for a tenant site.
 * @param {object} options
 * @param {string} options.siteId - tenant site ID
 * @param {string} [options.primaryHex] - primary brand colour hex
 * @param {string} [options.companyName] - company name
 * @param {Array} [options.services] - services array from scrape
 * @returns {Promise<string>} public URL of uploaded image
 */
export async function generateHeroImage({ siteId, primaryHex, companyName, services }) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    logger.warn('GOOGLE_GENERATIVE_AI_API_KEY not set — skipping hero image generation');
    return null;
  }

  const serviceType = inferServiceType(services);
  const colourDesc = describeColour(primaryHex);

  const SCENE_MAP = {
    kitchen: 'a beautifully renovated modern kitchen with quartz countertops and pendant lighting',
    bathroom: 'a luxurious renovated bathroom with walk-in shower and modern fixtures',
    basement: 'a stylish finished basement living space with warm lighting and modern finishes',
    flooring: 'a bright living room showcasing beautiful new hardwood flooring',
    exterior: 'a stunning home exterior renovation with new siding and landscaping',
    renovation: 'a bright, beautifully renovated open-concept living space',
  };

  const scene = SCENE_MAP[serviceType] || SCENE_MAP.renovation;
  const prompt = `Professional architectural photography of ${scene}. Subtle ${colourDesc} accent elements in the decor. Wide angle, bright natural lighting, editorial quality, warm and inviting atmosphere. No text, no logos, no watermarks. 16:9 aspect ratio.`;

  logger.info(`Generating hero image for ${siteId}: ${serviceType} / ${colourDesc}`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-image-preview',
    generationConfig: { responseModalities: ['image', 'text'] },
  });

  const result = await model.generateContent(prompt);
  const parts = result.response.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    if (part.inlineData) {
      const imageData = Buffer.from(part.inlineData.data, 'base64');
      const path = `${siteId}/hero-generated.jpg`;
      const publicUrl = await uploadToStorage('tenant-assets', path, imageData, 'image/jpeg');
      logger.info(`Hero image uploaded: ${publicUrl} (${(imageData.length / 1024).toFixed(0)} KB)`);
      return publicUrl;
    }
  }

  logger.warn('Gemini returned no image data for hero generation');
  return null;
}

/**
 * Select the best available about image from scraped data.
 * Returns null if no real photos are available (section renders gracefully without an image).
 * Does NOT call Gemini — about images must be real contractor photos, never AI-generated.
 *
 * @param {object} options
 * @param {Array} [options.portfolio] - portfolio items from scrape
 * @param {Array} [options.services] - services array from scrape
 * @returns {string|null} URL of a real scraped photo, or null
 */
export function selectAboutImage({ portfolio, services } = {}) {
  // Priority 1: first portfolio image
  if (portfolio?.length > 0) {
    for (const item of portfolio) {
      const url = item?.imageUrl || item?.image_url;
      if (url && typeof url === 'string' && url.startsWith('http')) {
        return url;
      }
    }
  }

  // Priority 2: first service image that has a real scraped URL
  if (services?.length > 0) {
    for (const svc of services) {
      const imgs = svc.image_urls || [];
      if (imgs.length > 0 && imgs[0] && typeof imgs[0] === 'string' && imgs[0].startsWith('http')) {
        return imgs[0];
      }
    }
  }

  return null;
}

/**
 * Generate an OG image (1200x630) for social sharing.
 * @param {object} options
 * @param {string} options.siteId
 * @param {string} [options.primaryHex]
 * @param {string} [options.companyName]
 * @param {string} [options.tagline]
 * @returns {Promise<string>} public URL
 */
export async function generateOgImage({ siteId, primaryHex, companyName, tagline }) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    logger.warn('GOOGLE_GENERATIVE_AI_API_KEY not set — skipping OG image generation');
    return null;
  }

  const colourDesc = describeColour(primaryHex);
  const prompt = `A professional social media banner image for a renovation company. Clean modern design with ${colourDesc} colour scheme. Subtle renovation imagery (tools, blueprints, home outline) as background texture. Professional and trustworthy feel. 1200x630 pixels, landscape orientation. No text, no logos, no watermarks.`;

  logger.info(`Generating OG image for ${siteId}`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-image-preview',
    generationConfig: { responseModalities: ['image', 'text'] },
  });

  const result = await model.generateContent(prompt);
  const parts = result.response.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    if (part.inlineData) {
      const imageData = Buffer.from(part.inlineData.data, 'base64');
      const path = `${siteId}/og-image.jpg`;
      const publicUrl = await uploadToStorage('tenant-assets', path, imageData, 'image/jpeg');
      logger.info(`OG image uploaded: ${publicUrl} (${(imageData.length / 1024).toFixed(0)} KB)`);
      return publicUrl;
    }
  }

  logger.warn('Gemini returned no image data for OG generation');
  return null;
}

