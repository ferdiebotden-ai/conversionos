/**
 * Codex Multi-Agent CSV Wrapper — parallel section generation.
 *
 * Uses Codex 0.114.0 multi-agent capability to build 6+ sections
 * concurrently instead of sequentially.
 *
 * Generates a CSV where each row = one section = one worker agent.
 * Falls back to sequential build if multi-agent fails.
 *
 * Cost: ~$0 (Codex subscription). Speed: 10-15 min for all sections
 * vs 30-60 min sequential.
 */

import { codexExec } from './codex-cli.mjs';
import { writeFileSync, readFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import * as logger from './logger.mjs';

/**
 * Build multiple sections in parallel using Codex multi-agent.
 *
 * @param {Array<object>} sections - Section specs from blueprint.customSections
 * @param {string} siteId - Tenant site ID
 * @param {object} options
 * @param {string} options.cwd - ConversionOS project root
 * @param {string} options.integrationSpec - Integration spec content
 * @param {string} options.template - Section template content
 * @param {string[]} [options.screenshotPaths=[]] - Available screenshots
 * @param {object} [options.cssTokens=null] - CSS tokens from original site
 * @param {number} [options.timeoutMs=600000] - Total timeout for all sections
 * @param {number} [options.concurrency=6] - Max parallel workers
 * @returns {Promise<{ built: string[], failed: string[] }>} File names of built/failed sections
 */
export async function buildSectionsParallel(sections, siteId, {
  cwd,
  integrationSpec,
  template,
  screenshotPaths = [],
  cssTokens = null,
  timeoutMs = 600000,
  concurrency = 6,
}) {
  if (sections.length === 0) return { built: [], failed: [] };

  const customDir = join(cwd, 'src', 'sections', 'custom', siteId);
  mkdirSync(customDir, { recursive: true });

  // Generate CSV for multi-agent processing
  const csvPath = join(customDir, '_build-sections.csv');
  const csvRows = [['sectionId', 'componentName', 'fileName', 'spec', 'screenshotHint']];

  for (const spec of sections) {
    const componentName = toPascalCase(spec.name);
    const fileName = toKebabCase(spec.name) + '.tsx';
    // Compact spec for CSV (escape commas and newlines)
    const specStr = (spec.spec || '').replace(/"/g, '""').replace(/\n/g, ' ');
    const screenshotHint = selectScreenshotHint(spec, screenshotPaths);
    csvRows.push([spec.sectionId, componentName, fileName, `"${specStr}"`, screenshotHint]);
  }

  writeFileSync(csvPath, csvRows.map(r => r.join(',')).join('\n'));
  logger.info(`Multi-agent CSV: ${sections.length} sections → ${csvPath}`);

  // Build the master prompt for multi-agent
  const cssHints = cssTokens ? JSON.stringify({
    fonts: cssTokens.renderedFonts,
    h1: cssTokens.elements?.h1,
    button: cssTokens.elements?.button,
    radii: cssTokens.borderRadii,
  }) : 'none';

  const masterPrompt = `IMPORTANT: Create files IMMEDIATELY. Do NOT read other project files. Do NOT explore the codebase.

You have ${sections.length} React section components to create for site "${siteId}".
Each section is defined in the CSV file at: ${csvPath}

For EACH row in the CSV, create the file at: src/sections/custom/${siteId}/{fileName}

INTEGRATION SPEC (apply to ALL sections):
${integrationSpec}

CSS from original site: ${cssHints}

COMPONENT PATTERN (follow exactly for each section):
\`\`\`tsx
${template}
\`\`\`

RULES FOR EVERY SECTION:
1. 'use client' directive at top
2. import type { SectionBaseProps } from '@/lib/section-types'
3. Named export matching the componentName column
4. Props: { branding, config, tokens, className }
5. Use str() helper for dual camelCase/snake_case field lookup
6. Tailwind CSS v4, mobile-first responsive (md: lg: xl:)
7. Brand colours: bg-primary, text-primary-foreground
8. Import motion components: import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion'
9. Gradient fallbacks for missing images (NEVER return null for missing images)
10. 80-150 lines of clean, production-quality code per section`;

  // Snapshot files before multi-agent runs
  const filesBefore = new Set(
    existsSync(customDir)
      ? readdirSync(customDir).filter(f => f.endsWith('.tsx'))
      : []
  );

  try {
    // Add screenshot directory as writable dir so Codex can access images
    const screenshotDir = screenshotPaths.length > 0
      ? screenshotPaths[0].substring(0, screenshotPaths[0].lastIndexOf('/'))
      : null;

    const addDirs = screenshotDir ? [screenshotDir] : [];

    // NOTE: Images removed from multi-agent builds (2026-03-11).
    // Codex --image + multi-section prompts causes 10min+ timeouts even with 0.114.0.
    // Screenshots are referenced by path in the CSV for per-section context.
    // The sequential fallback can still use --image per-section if needed.

    await codexExec(masterPrompt, {
      cwd,
      timeoutMs,
      images: [],  // Text-only for reliability — sequential fallback uses images
      ephemeral: true,
      addDirs,
    });

    // Detect which files were created
    const filesAfter = readdirSync(customDir).filter(f => f.endsWith('.tsx'));
    const newFiles = filesAfter.filter(f => !filesBefore.has(f) && f !== '_build-sections.csv');

    const expectedFiles = sections.map(s => toKebabCase(s.name) + '.tsx');
    const built = expectedFiles.filter(f => newFiles.includes(f) || filesAfter.includes(f));
    const failed = expectedFiles.filter(f => !built.includes(f));

    logger.info(`Multi-agent result: ${built.length} built, ${failed.length} failed`);

    // Clean up CSV
    try { const { unlinkSync } = await import('node:fs'); unlinkSync(csvPath); } catch { /* ok */ }

    return { built, failed };
  } catch (err) {
    logger.warn(`Multi-agent build failed: ${err.message?.slice(0, 200)}`);
    // Clean up CSV
    try { const { unlinkSync } = await import('node:fs'); unlinkSync(csvPath); } catch { /* ok */ }
    return { built: [], failed: sections.map(s => toKebabCase(s.name) + '.tsx') };
  }
}

/**
 * Select the most relevant screenshot hint for a section.
 */
function selectScreenshotHint(spec, allScreenshots) {
  if (allScreenshots.length === 0) return '';
  const nameL = spec.name.toLowerCase();

  if (nameL.includes('service')) {
    const match = allScreenshots.find(p => p.includes('services'));
    if (match) return match;
  }
  if (nameL.includes('about') || nameL.includes('team') || nameL.includes('story')) {
    const match = allScreenshots.find(p => p.includes('about'));
    if (match) return match;
  }
  if (nameL.includes('contact') || nameL.includes('map')) {
    const match = allScreenshots.find(p => p.includes('contact'));
    if (match) return match;
  }
  if (nameL.includes('gallery') || nameL.includes('portfolio')) {
    const match = allScreenshots.find(p => p.includes('gallery') || p.includes('portfolio'));
    if (match) return match;
  }

  // Default: homepage desktop
  return allScreenshots.find(p => p.includes('homepage-desktop')) || allScreenshots[0] || '';
}

function toPascalCase(str) {
  return str.replace(/[^a-zA-Z0-9]+/g, ' ').split(' ').filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
}

function toKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase().replace(/^-|-$/g, '');
}
