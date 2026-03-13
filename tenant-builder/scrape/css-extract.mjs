#!/usr/bin/env node
/**
 * CSS Token Extractor — uses Playwright to extract computed styles from a live site.
 *
 * Captures:
 * - Computed styles on body, h1-h6, p, a, button, nav, section
 * - CSS custom properties from :root
 * - Font families actually rendered (document.fonts)
 * - Border-radius, box-shadow, background-gradient patterns
 * - Spacing rhythm (padding/margin patterns on section elements)
 *
 * Output: css-tokens.json with structured design tokens
 *
 * Usage:
 *   node scrape/css-extract.mjs --url https://example.com --output ./results/2026-03-10/example/css-tokens.json
 *
 * Also importable:
 *   import { extractCssTokens } from './css-extract.mjs';
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from 'playwright';
import * as logger from '../lib/logger.mjs';

/**
 * Extract CSS tokens from a live page using Playwright.
 */
export async function extractCssTokens(targetUrl, { outputFile, timeout = 60000 } = {}) {
  logger.info(`CSS token extraction: ${targetUrl}`);
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout });

    const tokens = await page.evaluate(() => {
      const cs = (el) => el ? getComputedStyle(el) : null;

      // Extract computed styles for key elements
      function extractElementStyles(selector) {
        const el = document.querySelector(selector);
        if (!el) return null;
        const s = cs(el);
        return {
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          lineHeight: s.lineHeight,
          letterSpacing: s.letterSpacing,
          color: s.color,
          backgroundColor: s.backgroundColor,
        };
      }

      // CSS custom properties from :root
      function extractCustomProperties() {
        const props = {};
        try {
          const rootStyles = getComputedStyle(document.documentElement);
          // Check common CSS variable names
          const commonVars = [
            '--primary', '--secondary', '--accent', '--background', '--foreground',
            '--muted', '--border', '--ring', '--radius', '--font-sans', '--font-serif',
            '--primary-color', '--bg-color', '--text-color', '--link-color',
            '--heading-font', '--body-font',
          ];
          for (const v of commonVars) {
            const val = rootStyles.getPropertyValue(v).trim();
            if (val) props[v] = val;
          }

          // Also scan stylesheets for custom properties
          for (const sheet of document.styleSheets) {
            try {
              for (const rule of sheet.cssRules) {
                if (rule.selectorText === ':root' || rule.selectorText === ':root, :host') {
                  for (let i = 0; i < rule.style.length; i++) {
                    const prop = rule.style[i];
                    if (prop.startsWith('--')) {
                      props[prop] = rule.style.getPropertyValue(prop).trim();
                    }
                  }
                }
              }
            } catch { /* CORS blocked stylesheet — skip */ }
          }
        } catch { /* fallback */ }
        return props;
      }

      // Font families actually rendered
      function extractRenderedFonts() {
        const fonts = new Set();
        try {
          for (const font of document.fonts) {
            if (font.status === 'loaded') {
              fonts.add(font.family.replace(/['"]/g, ''));
            }
          }
        } catch { /* document.fonts not available */ }
        return [...fonts];
      }

      // Border-radius patterns
      function extractBorderRadii() {
        const radii = {};
        const selectors = ['button', '.btn', '[class*="card"]', '[class*="rounded"]', 'input', '.modal', 'dialog'];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            const r = cs(el).borderRadius;
            if (r && r !== '0px') radii[sel] = r;
          }
        }
        return radii;
      }

      // Box-shadow patterns
      function extractBoxShadows() {
        const shadows = {};
        const selectors = ['.card', '[class*="card"]', '[class*="shadow"]', 'button', '.btn', 'header', 'nav'];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            const s = cs(el).boxShadow;
            if (s && s !== 'none') shadows[sel] = s;
          }
        }
        return shadows;
      }

      // Spacing rhythm — padding/margin on sections and containers
      function extractSpacingRhythm() {
        const spacings = [];
        const sections = document.querySelectorAll('section, [class*="section"], main > div, .container');
        for (const el of Array.from(sections).slice(0, 10)) {
          const s = cs(el);
          spacings.push({
            tag: el.tagName.toLowerCase(),
            classes: el.className?.toString().slice(0, 100) || '',
            paddingTop: s.paddingTop,
            paddingBottom: s.paddingBottom,
            paddingLeft: s.paddingLeft,
            paddingRight: s.paddingRight,
            marginTop: s.marginTop,
            marginBottom: s.marginBottom,
          });
        }
        return spacings;
      }

      // Background patterns (gradients, images)
      function extractBackgrounds() {
        const bgs = [];
        const els = document.querySelectorAll('section, header, [class*="hero"], [class*="banner"], footer');
        for (const el of Array.from(els).slice(0, 8)) {
          const s = cs(el);
          if (s.backgroundImage !== 'none' || s.background.includes('gradient')) {
            bgs.push({
              tag: el.tagName.toLowerCase(),
              classes: el.className?.toString().slice(0, 100) || '',
              backgroundImage: s.backgroundImage?.slice(0, 300),
              backgroundColor: s.backgroundColor,
            });
          }
        }
        return bgs;
      }

      return {
        elements: {
          body: extractElementStyles('body'),
          h1: extractElementStyles('h1'),
          h2: extractElementStyles('h2'),
          h3: extractElementStyles('h3'),
          h4: extractElementStyles('h4'),
          p: extractElementStyles('p'),
          a: extractElementStyles('a'),
          button: extractElementStyles('button'),
          nav: extractElementStyles('nav'),
        },
        customProperties: extractCustomProperties(),
        renderedFonts: extractRenderedFonts(),
        borderRadii: extractBorderRadii(),
        boxShadows: extractBoxShadows(),
        spacingRhythm: extractSpacingRhythm(),
        backgrounds: extractBackgrounds(),
      };
    });

    await browser.close();

    const result = {
      url: targetUrl,
      extractedAt: new Date().toISOString(),
      ...tokens,
    };

    if (outputFile) {
      mkdirSync(dirname(outputFile), { recursive: true });
      writeFileSync(outputFile, JSON.stringify(result, null, 2));
      logger.info(`CSS tokens saved to ${outputFile}`);
    }

    return result;
  } catch (err) {
    await browser.close();
    throw err;
  }
}

// CLI entry point — only runs when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { parseArgs } = await import('node:util');
  const { resolve } = await import('node:path');

  const { values: args } = parseArgs({
    options: {
      url: { type: 'string' },
      output: { type: 'string' },
      'timeout-ms': { type: 'string', default: '60000' },
      help: { type: 'boolean' },
    },
  });

  if (args.help || !args.url) {
    console.log(`Usage:
  node scrape/css-extract.mjs --url https://example.com --output ./css-tokens.json`);
    process.exit(args.help ? 0 : 1);
  }

  const outputPath = args.output || resolve(import.meta.dirname, '../results/css-tokens.json');
  try {
    await extractCssTokens(args.url, { outputFile: outputPath, timeout: parseInt(args['timeout-ms'], 10) });
  } catch (e) {
    logger.error(`CSS extraction failed: ${e.message}`);
    process.exit(1);
  }
}
