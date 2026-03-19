/**
 * Service Image Mapper — maps portfolio/discovered images to services by keyword matching.
 *
 * Algorithm:
 * 1. Build image pool from portfolio + all discovered images (deduped)
 * 2. For each service without an image:
 *    a. Keyword match: service name tokens matched against image URL path segments and source page URLs
 *    b. Source page match: images from pages whose URL contains the service slug
 * 3. Round-robin fallback: distribute remaining portfolio images evenly (no duplicates)
 */

import * as logger from './logger.mjs';

/** Common service keywords mapped to URL-friendly variants */
const SERVICE_KEYWORDS = {
  kitchen: ['kitchen', 'kitch', 'culinary', 'cooking'],
  bathroom: ['bathroom', 'bath', 'washroom', 'lavatory', 'ensuite', 'en-suite'],
  basement: ['basement', 'lower-level', 'rec-room', 'recreation'],
  flooring: ['flooring', 'floor', 'hardwood', 'tile', 'laminate', 'vinyl'],
  roofing: ['roof', 'roofing', 'shingle', 'gutter'],
  painting: ['paint', 'painting', 'colour', 'color', 'stain'],
  plumbing: ['plumb', 'plumbing', 'pipe', 'drain'],
  electrical: ['electric', 'electrical', 'wiring', 'panel'],
  deck: ['deck', 'patio', 'outdoor', 'pergola', 'gazebo', 'fence'],
  window: ['window', 'door', 'entry', 'entrance', 'glass'],
  addition: ['addition', 'extension', 'build', 'new-build', 'custom-home'],
  siding: ['siding', 'exterior', 'cladding', 'stucco', 'brick'],
  landscaping: ['landscape', 'landscaping', 'garden', 'yard', 'lawn'],
  demolition: ['demo', 'demolition', 'teardown', 'gut'],
  commercial: ['commercial', 'office', 'retail', 'restaurant', 'store'],
  condo: ['condo', 'apartment', 'unit', 'suite'],
};

/**
 * Tokenize a service name into search keywords.
 * "Kitchen & Bathroom Renovations" -> ["kitchen", "bathroom", "renovation"]
 */
function tokenizeServiceName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['and', 'the', 'for', 'our', 'your', 'all', 'custom', 'full', 'complete', 'general', 'home', 'renovation', 'renovations', 'service', 'services', 'contracting'].includes(w));
}

/**
 * Get expanded keywords for a service name (includes synonyms).
 */
function getServiceKeywords(name) {
  const tokens = tokenizeServiceName(name);
  const expanded = new Set(tokens);

  for (const token of tokens) {
    for (const [, variants] of Object.entries(SERVICE_KEYWORDS)) {
      if (variants.some(v => token.includes(v) || v.includes(token))) {
        for (const v of variants) expanded.add(v);
      }
    }
  }

  return [...expanded];
}

/**
 * Score how well an image URL matches a set of keywords.
 * Higher score = better match.
 */
function scoreImageMatch(imageUrl, sourcePageUrl, keywords) {
  let score = 0;
  const urlLower = imageUrl.toLowerCase();
  const pageLower = (sourcePageUrl || '').toLowerCase();

  for (const kw of keywords) {
    // Image URL path contains keyword (strongest signal)
    if (urlLower.includes(kw)) score += 3;
    // Source page URL contains keyword
    if (pageLower.includes(kw)) score += 2;
    // Image filename contains keyword
    const filename = urlLower.split('/').pop()?.split('?')[0] || '';
    if (filename.includes(kw)) score += 2;
  }

  return score;
}

/**
 * Map images to services by keyword matching + round-robin fallback.
 *
 * @param {Array} services - Services array from scraped data (each has .name, .image_urls)
 * @param {Array} portfolio - Portfolio array from scraped data (each has .image_url)
 * @param {Object} allDiscoveredImages - Map of pageUrl -> image URLs from deep scrape
 * @returns {Array} Updated services array with image_urls populated
 */
export function mapServiceImages(services, portfolio, allDiscoveredImages) {
  if (!services?.length) return services;

  // 1. Build image pool with source page tracking
  const imagePool = []; // { url, sourcePageUrl }
  const usedUrls = new Set();

  // Add portfolio images
  for (const p of (portfolio || [])) {
    const imgUrl = p.image_url || p.imageUrl;
    if (imgUrl && !usedUrls.has(imgUrl)) {
      imagePool.push({ url: imgUrl, sourcePageUrl: '' });
      usedUrls.add(imgUrl);
    }
  }

  // Add all discovered images (with source page tracking)
  for (const [pageUrl, images] of Object.entries(allDiscoveredImages || {})) {
    for (const imgUrl of images) {
      if (!usedUrls.has(imgUrl)) {
        imagePool.push({ url: imgUrl, sourcePageUrl: pageUrl });
        usedUrls.add(imgUrl);
      }
    }
  }

  if (imagePool.length === 0) {
    logger.info('Service image mapper: no images in pool — skipping');
    return services;
  }

  // 2. Keyword matching pass
  const assignedImages = new Set();
  let keywordMatches = 0;

  for (const service of services) {
    if (service.image_urls?.[0]) continue; // Already has an image

    const keywords = getServiceKeywords(service.name || '');
    if (keywords.length === 0) continue;

    // Score all images against this service's keywords
    let bestMatch = null;
    let bestScore = 0;

    for (const img of imagePool) {
      if (assignedImages.has(img.url)) continue;
      const score = scoreImageMatch(img.url, img.sourcePageUrl, keywords);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = img;
      }
    }

    if (bestMatch && bestScore >= 2) {
      service.image_urls = [bestMatch.url];
      assignedImages.add(bestMatch.url);
      keywordMatches++;
      logger.debug(`Service "${service.name}" ← keyword match (score ${bestScore}): ${bestMatch.url.slice(0, 60)}`);
    }
  }

  // 3. Round-robin fallback for remaining imageless services
  const unassignedImages = imagePool.filter(img => !assignedImages.has(img.url));
  let roundRobinIdx = 0;
  let roundRobinMatches = 0;

  for (const service of services) {
    if (service.image_urls?.[0]) continue;
    if (roundRobinIdx >= unassignedImages.length) break;

    service.image_urls = [unassignedImages[roundRobinIdx].url];
    assignedImages.add(unassignedImages[roundRobinIdx].url);
    roundRobinIdx++;
    roundRobinMatches++;
    logger.debug(`Service "${service.name}" ← round-robin: ${service.image_urls[0].slice(0, 60)}`);
  }

  const totalAssigned = keywordMatches + roundRobinMatches;
  logger.info(`Service image mapper: ${totalAssigned}/${services.length} services got images (${keywordMatches} keyword, ${roundRobinMatches} round-robin)`);

  return services;
}
