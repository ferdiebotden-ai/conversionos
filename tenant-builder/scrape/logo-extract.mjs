/**
 * Multi-level logo extraction with 4 fallback levels.
 *
 * Level 1: Branding v2 logos array (type: primary/header)
 * Level 2: Playwright DOM — header img, nav img, [class*="logo"]
 * Level 3: Inline SVG — header svg, serialise to PNG via Sharp
 * Level 4: Claude Vision — screenshot header, identify bounding box
 *
 * First level with confidence >= 0.6 wins.
 */

import { chromium } from 'playwright';
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { identifyLogo } from './logo-vision.mjs';
import * as logger from '../lib/logger.mjs';

const MIN_CONFIDENCE = 0.6;

/**
 * Check if a URL is reachable (returns 200) and is an image.
 * @param {string} url
 * @returns {Promise<boolean>}
 */
async function isReachable(url) {
  try {
    const resp = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * Extract logo URL from a website using 4-level fallback.
 * @param {string} url - website URL
 * @param {object} [branding] - branding v2 data (logos array)
 * @param {object} [options]
 * @param {string} [options.outputDir] - directory for screenshots/extracted files
 * @returns {Promise<{ url: string|null, format: string, confidence: number, level: number, method: string }>}
 */
export async function extractLogo(url, branding = {}, options = {}) {
  const { outputDir = '/tmp' } = options;
  mkdirSync(outputDir, { recursive: true });

  // Level 1: Branding v2 logos
  if (branding.logos?.length > 0) {
    const primary = branding.logos.find(l => l.type === 'primary' || l.type === 'header');
    const candidate = primary || branding.logos[0];
    if (candidate?.url) {
      const reachable = await isReachable(candidate.url);
      if (reachable) {
        logger.info(`Logo found (Level 1 — branding v2): ${candidate.url}`);
        return {
          url: candidate.url,
          format: candidate.format || 'unknown',
          confidence: 0.85,
          level: 1,
          method: 'branding-v2',
        };
      }
      logger.debug(`Level 1 logo URL not reachable: ${candidate.url}`);
    }
  }

  // Level 2-4 require Playwright
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Level 2: DOM-level logo extraction
    const logoImg = await page.evaluate(() => {
      const selectors = [
        'header img[class*="logo"]',
        'nav img[class*="logo"]',
        'header a img',
        'nav a img',
        '[class*="logo"] img',
        'img[alt*="logo" i]',
        'img[src*="logo" i]',
      ];
      for (const sel of selectors) {
        const imgs = document.querySelectorAll(sel);
        for (const img of imgs) {
          if (img.naturalWidth >= 100 && img.naturalHeight >= 30) {
            return {
              src: img.src,
              width: img.naturalWidth,
              height: img.naturalHeight,
              isSvg: img.src.endsWith('.svg') || img.src.includes('.svg?'),
            };
          }
        }
      }
      return null;
    });

    if (logoImg?.src) {
      const reachable = await isReachable(logoImg.src);
      if (reachable) {
        const format = logoImg.isSvg ? 'svg' : (logoImg.src.match(/\.(png|jpg|jpeg|webp)/i)?.[1] || 'png');
        logger.info(`Logo found (Level 2 — DOM): ${logoImg.src} (${logoImg.width}x${logoImg.height})`);
        return {
          url: logoImg.src,
          format,
          confidence: 0.8,
          level: 2,
          method: 'dom',
        };
      }
    }

    // Level 3: Inline SVG
    const inlineSvg = await page.evaluate(() => {
      const svgSelectors = ['header svg', 'nav svg', '[class*="logo"] svg'];
      for (const sel of svgSelectors) {
        const svg = document.querySelector(sel);
        if (svg) {
          const rect = svg.getBoundingClientRect();
          if (rect.width >= 50 && rect.height >= 20) {
            return svg.outerHTML;
          }
        }
      }
      return null;
    });

    if (inlineSvg) {
      try {
        const pngPath = resolve(outputDir, 'logo-extracted.png');
        await sharp(Buffer.from(inlineSvg))
          .resize(400)
          .png()
          .toFile(pngPath);

        logger.info(`Logo found (Level 3 — inline SVG → PNG): ${pngPath}`);
        return {
          url: pngPath,
          format: 'png',
          confidence: 0.7,
          level: 3,
          method: 'inline-svg',
        };
      } catch (e) {
        logger.debug(`SVG conversion failed: ${e.message}`);
      }
    }

    // Level 4: Claude Vision
    const screenshotPath = resolve(outputDir, 'header-screenshot.png');
    await page.screenshot({
      path: screenshotPath,
      clip: { x: 0, y: 0, width: 1280, height: 200 },
    });

    const visionResult = await identifyLogo(screenshotPath);
    if (visionResult.found && visionResult.confidence >= MIN_CONFIDENCE) {
      // Crop the identified logo region from the screenshot
      if (visionResult.bounding_box) {
        const { x, y, width, height } = visionResult.bounding_box;
        const cropPath = resolve(outputDir, 'logo-vision-crop.png');
        try {
          await sharp(screenshotPath)
            .extract({
              left: Math.max(0, Math.round(x)),
              top: Math.max(0, Math.round(y)),
              width: Math.min(Math.round(width), 1280),
              height: Math.min(Math.round(height), 200),
            })
            .png()
            .toFile(cropPath);

          logger.info(`Logo found (Level 4 — vision): ${cropPath} (confidence ${visionResult.confidence})`);
          return {
            url: cropPath,
            format: 'png',
            confidence: visionResult.confidence,
            level: 4,
            method: 'vision',
          };
        } catch (e) {
          logger.debug(`Vision crop failed: ${e.message}`);
        }
      }
    }

    // All levels failed
    logger.warn(`No logo found for ${url} — flag for manual upload`);
    return {
      url: null,
      format: 'unknown',
      confidence: 0,
      level: 0,
      method: 'none',
    };
  } catch (e) {
    logger.error(`Logo extraction error for ${url}: ${e.message}`);
    return { url: null, format: 'unknown', confidence: 0, level: 0, method: 'error' };
  } finally {
    if (browser) await browser.close();
  }
}
