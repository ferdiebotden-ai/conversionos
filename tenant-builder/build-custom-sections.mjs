#!/usr/bin/env node
/**
 * Custom Section Builder — generates per-tenant React sections from blueprint specs.
 *
 * For each customSection in the SiteBlueprint v2, this module:
 * 1. Builds a Codex prompt with the section spec + reference template
 * 2. Runs `codex exec --full-auto` to generate the component
 * 3. Detects new files in the output directory (not exact filename match)
 * 4. Batch TypeScript check after all sections are built
 * 5. Generates an index.ts manifest for build-time registration
 *
 * Usage:
 *   import { buildCustomSections } from './build-custom-sections.mjs';
 *   const { built, failed } = await buildCustomSections(siteId, blueprint, { cwd });
 */

import { codexExec } from './lib/codex-cli.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import * as logger from './lib/logger.mjs';

const TEMPLATE_PATH = resolve(import.meta.dirname, 'templates/custom-section-template.tsx');
const INTEGRATION_SPEC_PATH = resolve(import.meta.dirname, 'templates/integration-spec.md');

/**
 * Build custom React sections from a blueprint's customSections array.
 *
 * @param {string} siteId - The tenant site ID
 * @param {object} blueprint - SiteBlueprint v2 object
 * @param {object} options
 * @param {string} options.cwd - The ConversionOS project root
 * @param {number} [options.timeoutMs=180000] - Timeout per section
 * @param {boolean} [options.bespokeMode=false] - Bespoke mode with screenshots + HTML
 * @param {string} [options.resultsDir] - Results directory (for bespoke mode assets)
 * @param {number} [options.maxSections=5] - Maximum sections to build
 * @returns {Promise<{ built: number, failed: number }>}
 */
export async function buildCustomSections(siteId, blueprint, { cwd, timeoutMs = 180000, bespokeMode = false, resultsDir, maxSections = 5 }) {
  let customSections = blueprint.customSections ?? [];
  if (customSections.length === 0) return { built: 0, failed: 0 };

  // Enforce section limit
  if (customSections.length > maxSections) {
    logger.warn(`Trimming custom sections from ${customSections.length} to ${maxSections}`);
    customSections = customSections.slice(0, maxSections);
  }

  const customDir = join(cwd, 'src', 'sections', 'custom', siteId);
  mkdirSync(customDir, { recursive: true });

  const template = readFileSync(TEMPLATE_PATH, 'utf-8');
  const integrationSpec = existsSync(INTEGRATION_SPEC_PATH) ? readFileSync(INTEGRATION_SPEC_PATH, 'utf-8') : '';

  // Load bespoke assets if available
  let cssTokens = null;
  let htmlFiles = {};
  let screenshotPaths = [];
  if (bespokeMode && resultsDir) {
    cssTokens = loadJsonIfExists(join(resultsDir, 'css-tokens.json'));
    htmlFiles = loadHtmlDir(join(resultsDir, 'html'));
    screenshotPaths = discoverScreenshots(join(resultsDir, 'screenshots/original'));
  }

  let built = 0;
  let failed = 0;
  const builtSpecs = [];

  for (const spec of customSections) {
    const componentName = toPascalCase(spec.name);
    const expectedFileName = toKebabCase(spec.name) + '.tsx';
    const expectedFilePath = join(customDir, expectedFileName);

    logger.info(`Building custom section: ${spec.sectionId} (${componentName})${bespokeMode ? ' [bespoke]' : ''}`);

    const prompt = bespokeMode
      ? buildBespokeCodexPrompt(spec, siteId, template, cwd, integrationSpec, cssTokens, htmlFiles)
      : buildCodexPrompt(spec, siteId, template, cwd);

    // Snapshot directory before Codex runs
    const filesBefore = new Set(readdirSync(customDir).filter(f => f.endsWith('.tsx')));

    // Skip images — text prompts with CSS tokens + HTML are sufficient and 5x faster
    try {
      // Generate the component (text-only — images cause 10min+ timeouts)
      await codexExec(prompt, { cwd, timeoutMs, images: [] });

      // Detect new files by diffing directory (handles Codex writing to different filename)
      let createdFile = null;
      if (existsSync(expectedFilePath)) {
        createdFile = expectedFileName;
      } else {
        // Scan for any new .tsx file in the directory
        const filesAfter = readdirSync(customDir).filter(f => f.endsWith('.tsx'));
        const newFiles = filesAfter.filter(f => !filesBefore.has(f));
        if (newFiles.length > 0) {
          createdFile = newFiles[0];
          logger.info(`Codex wrote to ${createdFile} (expected ${expectedFileName})`);
        }
      }

      if (!createdFile) {
        logger.warn(`Custom section ${spec.sectionId} — no file created after Codex`);
        failed++;
        continue;
      }

      // Determine actual component name from the file that was created
      const actualFileName = createdFile;
      const actualComponentName = toPascalCase(actualFileName.replace('.tsx', ''));

      // Post-generation validation: warn on snake_case field access patterns
      try {
        const generatedContent = readFileSync(join(customDir, actualFileName), 'utf-8');
        const snakeCasePatterns = ['hero_headline', 'hero_image_url', 'about_text', 'about_copy', 'about_image_url', 'logo_url', 'trust_metrics', 'hero_subheadline', 'service_area', 'why_choose_us'];
        for (const pattern of snakeCasePatterns) {
          if (generatedContent.includes(`['${pattern}']`) || generatedContent.includes(`.${pattern}`)) {
            logger.warn(`Custom section ${spec.sectionId} uses snake_case field '${pattern}' — should use camelCase`);
          }
        }
      } catch { /* skip validation if file read fails */ }

      built++;
      builtSpecs.push({ spec, fileName: actualFileName, componentName: actualComponentName });
      logger.info(`Custom section built: ${spec.sectionId} → ${actualFileName}`);
    } catch (err) {
      logger.warn(`Custom section ${spec.sectionId} failed: ${err.message}`);
      failed++;
    }
  }

  // Batch TypeScript check after all sections are built (not per-section)
  if (builtSpecs.length > 0) {
    logger.info(`Running batch TypeScript check for ${builtSpecs.length} custom section(s)...`);
    const tscResult = tscCheck(cwd);
    if (tscResult.exitCode !== 0) {
      logger.warn(`TypeScript errors in custom sections — attempting batch fix`);
      const fixPrompt = `Fix all TypeScript errors in the files under src/sections/custom/${siteId}/. Errors:\n${tscResult.errors}\n\nFix the files so they compile cleanly. Do not delete files.`;
      try {
        await codexExec(fixPrompt, { cwd, timeoutMs });
        const retryResult = tscCheck(cwd);
        if (retryResult.exitCode !== 0) {
          logger.warn(`TypeScript errors persist after fix attempt — continuing anyway`);
        } else {
          logger.info(`TypeScript errors resolved`);
        }
      } catch (e) {
        logger.warn(`TypeScript fix attempt failed: ${e.message}`);
      }
    } else {
      logger.info(`TypeScript check passed for all custom sections`);
    }
  }

  // Generate index.ts manifest for build-time registration
  if (builtSpecs.length > 0) {
    generateCustomIndex(customDir, builtSpecs);
    // Update the top-level custom registry to import this tenant
    updateTopLevelRegistry(cwd);
  }

  return { built, failed };
}

/**
 * Build the Codex prompt for generating a custom section.
 */
function buildCodexPrompt(spec, siteId, template, cwd) {
  let referenceCode = '';
  if (spec.referenceSection) {
    const [category, variant] = spec.referenceSection.split(':');
    const refPath = join(cwd, 'src', 'sections', category, `${variant}.tsx`);
    if (existsSync(refPath)) {
      referenceCode = `\n## Reference Section (${spec.referenceSection})\nUse this existing section as a pattern reference:\n\`\`\`tsx\n${readFileSync(refPath, 'utf-8')}\n\`\`\`\n`;
    }
  }

  return `Create a custom React section component for a renovation contractor website.

## Output File
Write the component to: src/sections/custom/${siteId}/${toKebabCase(spec.name)}.tsx

## Section Spec
- Name: ${spec.name}
- Section ID: ${spec.sectionId}
- Description: ${spec.spec}
${spec.dataSource ? `- Data Source: ${spec.dataSource}` : ''}

## Template Pattern
Every section MUST follow this pattern:
\`\`\`tsx
${template}
\`\`\`

## Rules
- Use 'use client' directive
- Import SectionBaseProps from '@/lib/section-types'
- Export a named function: ${toPascalCase(spec.name)}
- Accept { branding, config, tokens, className } props
- Use Tailwind CSS (v4) for styling
- Use bg-primary, text-primary-foreground for brand colours
- Return null if required data is missing
- Do NOT import external packages — only use existing project imports
- Use responsive design (mobile-first with md: breakpoints)
${referenceCode}`;
}

/**
 * Generate the index.ts manifest for custom section registration.
 */
function generateCustomIndex(customDir, builtSpecs) {
  const imports = builtSpecs.map(({ fileName, componentName }) =>
    `import { ${componentName} } from './${fileName.replace('.tsx', '')}';`
  ).join('\n');

  const registrations = builtSpecs.map(({ spec, componentName }) =>
    `registerSection('${spec.sectionId}' as SectionId, ${componentName} as SectionComponent);`
  ).join('\n');

  const content = `/**
 * Auto-generated custom section manifest.
 * Created by build-custom-sections.mjs — do not edit manually.
 */

import { registerSection } from '@/lib/section-registry';
import type { SectionId } from '@/lib/section-types';
import type { SectionComponent } from '@/lib/section-registry';

${imports}

// Register sections at module load time (side-effect import)
${registrations}
`;

  writeFileSync(join(customDir, 'index.ts'), content);
  logger.info(`Generated custom section manifest: ${builtSpecs.length} section(s)`);
}

/**
 * Update the top-level custom section registry (src/sections/custom/registry.ts).
 * Scans for all tenant custom section directories and generates a unified import file.
 */
function updateTopLevelRegistry(cwd) {
  const customBaseDir = join(cwd, 'src', 'sections', 'custom');
  if (!existsSync(customBaseDir)) return;

  const tenantDirs = readdirSync(customBaseDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(join(customBaseDir, d.name, 'index.ts')))
    .map(d => d.name);

  if (tenantDirs.length === 0) return;

  const imports = tenantDirs.map(d => `import './${d}/index';`).join('\n');
  const content = `/**
 * Auto-generated custom section registry.
 * Created by build-custom-sections.mjs — do not edit manually.
 *
 * Tenants: ${tenantDirs.join(', ')}
 */

${imports}
`;

  writeFileSync(join(customBaseDir, 'registry.ts'), content);
  logger.info(`Updated top-level custom registry: ${tenantDirs.length} tenant(s)`);
}

/**
 * Build a bespoke Codex prompt — directive and focused.
 * CRITICAL: Tells Codex to write the file IMMEDIATELY without exploring the codebase.
 */
function buildBespokeCodexPrompt(spec, siteId, template, cwd, integrationSpec, cssTokens, htmlFiles) {
  // Find the page this section likely belongs to
  const sectionNameLower = spec.name.toLowerCase();
  let relevantHtml = '';
  if (sectionNameLower.includes('hero') || sectionNameLower.includes('header') || sectionNameLower.includes('nav') || sectionNameLower.includes('footer')) {
    relevantHtml = htmlFiles.homepage?.slice(0, 2000) || '';
  } else if (sectionNameLower.includes('service')) {
    relevantHtml = htmlFiles.services?.slice(0, 2000) || htmlFiles.homepage?.slice(0, 2000) || '';
  } else if (sectionNameLower.includes('about') || sectionNameLower.includes('team') || sectionNameLower.includes('story') || sectionNameLower.includes('value')) {
    relevantHtml = (htmlFiles.about || htmlFiles['about-us'])?.slice(0, 2000) || '';
  } else if (sectionNameLower.includes('contact') || sectionNameLower.includes('map')) {
    relevantHtml = htmlFiles.contact?.slice(0, 2000) || '';
  } else if (sectionNameLower.includes('gallery') || sectionNameLower.includes('portfolio') || sectionNameLower.includes('project')) {
    relevantHtml = (htmlFiles.gallery || htmlFiles.portfolio)?.slice(0, 2000) || '';
  } else {
    relevantHtml = htmlFiles.homepage?.slice(0, 1500) || '';
  }

  // Compact CSS hints
  let cssHints = '';
  if (cssTokens) {
    cssHints = JSON.stringify({
      fonts: cssTokens.renderedFonts,
      h1: cssTokens.elements?.h1,
      button: cssTokens.elements?.button,
      radii: cssTokens.borderRadii,
    });
  }
  if (spec.cssHints) cssHints += `\n${spec.cssHints}`;

  const filePath = `src/sections/custom/${siteId}/${toKebabCase(spec.name)}.tsx`;

  return `IMPORTANT: Create the file IMMEDIATELY. Do NOT read other project files. Do NOT explore the codebase. Just write the single file specified below.

Create file: ${filePath}

This is a React section component for a renovation contractor website rebuild.

VISUAL SPEC: ${spec.spec}
${spec.contentMapping ? `DATA: ${spec.contentMapping}` : ''}
${spec.integrationNotes ? `INTEGRATION: ${spec.integrationNotes}` : ''}

CSS from original site: ${cssHints}

## Integration Specification
${integrationSpec}

${relevantHtml ? `Original HTML reference (first 2000 chars):\n${relevantHtml}\n` : ''}
COMPONENT PATTERN — follow this exactly:
\`\`\`tsx
${template}
\`\`\`

RULES:
- 'use client' directive at top
- import type { SectionBaseProps } from '@/lib/section-types'
- Named export: ${toPascalCase(spec.name)}
- Props: { branding, config, tokens, className }
- Tailwind CSS v4 only. Mobile-first responsive (md: lg: xl: breakpoints)
- Brand colours: bg-primary, text-primary-foreground, text-muted-foreground
- Images: import Image from 'next/image', Links: import Link from 'next/link'
- Replace contact forms with <Link href="/visualizer">Get Your Free Design Estimate</Link>
- Return null if required data missing
- NO external packages. Only next/image, next/link, @/lib/section-types
- Semantic HTML: <section>, <nav>, <footer>, <article>
- Focus styles: focus:ring-2 focus:ring-primary
- 80-150 lines of clean, production-quality code`;
}

/**
 * Select relevant screenshots for a section based on its name/page.
 */
function selectRelevantScreenshots(spec, allScreenshots) {
  if (allScreenshots.length === 0) return [];

  const nameL = spec.name.toLowerCase();
  const selected = [];

  // Always include homepage desktop screenshot
  const homepageDesktop = allScreenshots.find(p => p.includes('homepage-desktop'));
  if (homepageDesktop) selected.push(homepageDesktop);

  // Add page-specific screenshot
  if (nameL.includes('service')) {
    const match = allScreenshots.find(p => p.includes('services-desktop'));
    if (match) selected.push(match);
  } else if (nameL.includes('about') || nameL.includes('team') || nameL.includes('story') || nameL.includes('value')) {
    const match = allScreenshots.find(p => (p.includes('about-desktop') || p.includes('about-us-desktop')));
    if (match) selected.push(match);
  } else if (nameL.includes('contact') || nameL.includes('map')) {
    const match = allScreenshots.find(p => p.includes('contact-desktop'));
    if (match) selected.push(match);
  } else if (nameL.includes('gallery') || nameL.includes('portfolio') || nameL.includes('project')) {
    const match = allScreenshots.find(p => (p.includes('gallery-desktop') || p.includes('portfolio-desktop')));
    if (match) selected.push(match);
  }

  return [...new Set(selected)]; // Deduplicate, max 2 images
}

// ─── Bespoke helpers ──────────────────────────────────────────

function loadJsonIfExists(path) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch { return null; }
}

function loadHtmlDir(dir) {
  const files = {};
  if (!existsSync(dir)) return files;
  try {
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.html')) {
        files[f.replace('.html', '')] = readFileSync(join(dir, f), 'utf-8');
      }
    }
  } catch { /* skip */ }
  return files;
}

function discoverScreenshots(dir) {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
      .map(f => join(dir, f));
  } catch { return []; }
}

/**
 * Run TypeScript check and return result.
 */
function tscCheck(cwd) {
  try {
    execFileSync('npx', ['tsc', '--noEmit'], {
      cwd,
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { exitCode: 0, errors: '' };
  } catch (e) {
    return {
      exitCode: e.status ?? 1,
      errors: (e.stderr?.toString() || e.stdout?.toString() || '').slice(0, 3000),
    };
  }
}

/**
 * Convert a string to PascalCase.
 */
function toPascalCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert a string to kebab-case.
 */
function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
    .replace(/^-|-$/g, '');
}
