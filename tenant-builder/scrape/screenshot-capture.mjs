/**
 * Screenshot Capture — Playwright full-page screenshots of original sites.
 *
 * Captures homepage (desktop + mobile) and all discoverable inner pages
 * (about, services, gallery, contact). Scrolls to trigger lazy-loaded
 * content before capturing.
 *
 * Used by both bespoke and template builds — screenshots are now the
 * primary visual data source for the pipeline.
 *
 * Usage:
 *   import { captureScreenshots } from './screenshot-capture.mjs';
 *   const paths = await captureScreenshots('https://example.com', outputDir);
 */

import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as logger from '../lib/logger.mjs';

/**
 * Capture full-page screenshots of an original website.
 *
 * @param {string} url - The target website URL
 * @param {string} outputDir - Directory to save screenshots
 * @param {object} [options]
 * @param {number} [options.timeout=20000] - Page load timeout per page
 * @param {boolean} [options.mobile=true] - Also capture mobile viewport
 * @param {string[]} [options.extraPaths=[]] - Additional paths to capture
 * @returns {Promise<string[]>} Array of screenshot file paths
 */
export async function captureScreenshots(url, outputDir, {
  timeout = 20000,
  mobile = true,
  extraPaths = [],
} = {}) {
  const screenshotDir = join(outputDir, 'screenshots/original');
  mkdirSync(screenshotDir, { recursive: true });

  const captured = [];

  const viewports = [
    { width: 1440, height: 900, label: 'desktop' },
    ...(mobile ? [{ width: 390, height: 844, label: 'mobile' }] : []),
  ];

  const pages = [
    { path: '/', slug: 'homepage' },
    { path: '/about', slug: 'about' },
    { path: '/about-us', slug: 'about-us' },
    { path: '/services', slug: 'services' },
    { path: '/contact', slug: 'contact' },
    { path: '/gallery', slug: 'gallery' },
    { path: '/portfolio', slug: 'portfolio' },
    { path: '/projects', slug: 'projects' },
    { path: '/our-work', slug: 'our-work' },
    { path: '/our-portfolio', slug: 'our-portfolio' },
    { path: '/testimonials', slug: 'testimonials' },
    { path: '/reviews', slug: 'reviews' },
    ...extraPaths.map(p => ({ path: p, slug: p.replace(/^\//, '').replace(/\//g, '-') || 'extra' })),
  ];

  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true });

    for (const vp of viewports) {
      for (const pg of pages) {
        const pageUrl = new URL(pg.path, url).href;
        const filename = `${pg.slug}-${vp.label}-full.png`;
        const filePath = join(screenshotDir, filename);

        try {
          const page = await browser.newPage({
            viewport: { width: vp.width, height: vp.height },
          });

          const response = await page.goto(pageUrl, {
            waitUntil: 'networkidle',
            timeout,
          });

          if (!response || response.status() >= 400) {
            await page.close();
            continue;
          }

          // Scroll through the page to trigger lazy-loaded content
          await scrollFullPage(page);

          // Wait for any remaining lazy images
          await page.waitForTimeout(500);

          // Take full-page screenshot
          await page.screenshot({ path: filePath, fullPage: true });
          captured.push(filePath);
          logger.info(`Screenshot: ${filename} (${vp.width}x${vp.height})`);

          await page.close();
        } catch {
          // Page doesn't exist or timed out — skip silently
        }
      }
    }

    await browser.close();
  } catch (err) {
    if (browser) try { await browser.close(); } catch { /* ok */ }
    logger.warn(`Screenshot capture failed: ${err.message}`);
  }

  logger.info(`Screenshots captured: ${captured.length} file(s)`);
  return captured;
}

/**
 * Record a 30-second scroll-through of the homepage.
 * Captures scroll-triggered animations, parallax effects, sticky headers,
 * hover states, and loading transitions as a .webm video.
 *
 * @param {string} url - The target website URL
 * @param {string} outputDir - Directory to save recording
 * @param {object} [options]
 * @param {number} [options.timeout=20000] - Page load timeout
 * @param {number} [options.scrollDurationMs=6000] - How long to scroll (natural reading speed)
 * @returns {Promise<string|null>} Path to recording file, or null if failed
 */
export async function recordHomepageScroll(url, outputDir, {
  timeout = 20000,
  scrollDurationMs = 6000,
} = {}) {
  const recordingDir = join(outputDir, 'recordings');
  mkdirSync(recordingDir, { recursive: true });
  const recordingPath = join(recordingDir, 'homepage-scroll.webm');

  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: recordingDir, size: { width: 1440, height: 900 } },
    });

    const page = await context.newPage();
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout });

    if (!response || response.status() >= 400) {
      await context.close();
      await browser.close();
      return null;
    }

    // Scroll through at natural reading speed
    await page.evaluate((duration) => new Promise(resolve => {
      const totalHeight = document.body.scrollHeight;
      const steps = Math.ceil(duration / 50); // 50ms per step
      const stepSize = totalHeight / steps;
      let pos = 0;
      let step = 0;
      const timer = setInterval(() => {
        pos += stepSize;
        window.scrollTo({ top: pos, behavior: 'smooth' });
        step++;
        if (step >= steps) {
          clearInterval(timer);
          // Scroll back to top
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(resolve, 1000);
        }
      }, 50);
    }), scrollDurationMs);

    // Close context to finalize video
    await page.close();
    const video = page.video();
    if (video) {
      await video.saveAs(recordingPath);
    }
    await context.close();
    await browser.close();

    if (existsSync(recordingPath)) {
      logger.info(`Homepage scroll recording: ${recordingPath}`);
      return recordingPath;
    }
    return null;
  } catch (err) {
    if (browser) try { await browser.close(); } catch { /* ok */ }
    logger.warn(`Homepage scroll recording failed: ${err.message?.slice(0, 100)}`);
    return null;
  }
}

/**
 * Scroll through an entire page to trigger IntersectionObserver callbacks
 * and lazy-loaded content. Scrolls down then back to top.
 */
async function scrollFullPage(page) {
  await page.evaluate(() => new Promise(resolve => {
    let pos = 0;
    const step = () => {
      pos += window.innerHeight;
      window.scrollTo(0, pos);
      if (pos < document.body.scrollHeight) {
        requestAnimationFrame(step);
      } else {
        window.scrollTo(0, 0);
        setTimeout(resolve, 300);
      }
    };
    requestAnimationFrame(step);
  }));
}

/**
 * Quick capture: just homepage desktop + mobile.
 * Used for template builds where inner pages aren't needed.
 */
export async function captureHomepageOnly(url, outputDir, { timeout = 20000 } = {}) {
  return captureScreenshots(url, outputDir, {
    timeout,
    mobile: true,
    extraPaths: [],
  });
}
