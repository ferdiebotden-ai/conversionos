#!/usr/bin/env node
/**
 * Custom Section Builder — generates per-tenant React sections from blueprint specs.
 *
 * Vision-First Pipeline (Codex 0.114.0):
 * 1. Select relevant screenshots for each section
 * 2. Build vision-first Codex prompt with screenshot + spec
 * 3. Run Codex with --image for visual reference
 * 4. Optionally build in parallel via multi-agent CSV
 * 5. Run Codex review quality gate (static + AI)
 * 6. Generate index.ts manifest for build-time registration
 *
 * Usage:
 *   import { buildCustomSections } from './build-custom-sections.mjs';
 *   const { built, failed } = await buildCustomSections(siteId, blueprint, { cwd });
 */

import { codexExec } from './lib/codex-cli.mjs';
import { buildSectionsParallel } from './lib/codex-multi-agent.mjs';
import { reviewGeneratedSections } from './lib/codex-review.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import * as logger from './lib/logger.mjs';

const TEMPLATE_PATH = resolve(import.meta.dirname, 'templates/custom-section-template.tsx');
const INTEGRATION_SPEC_PATH = resolve(import.meta.dirname, 'templates/integration-spec.md');
const AESTHETICS_PROMPT_PATH = resolve(import.meta.dirname, 'templates/aesthetics-prompt.md');

// Animation pattern mapping — injected per section type
const ANIMATION_MAP = {
  hero: "import { StaggerContainer, FadeInUp, ParallaxSection } from '@/components/motion';",
  nav: '',
  services: "import { StaggerContainer, StaggerItem } from '@/components/motion';",
  gallery: "import { ScaleIn, StaggerContainer, StaggerItem } from '@/components/motion';",
  portfolio: "import { ScaleIn, StaggerContainer, StaggerItem } from '@/components/motion';",
  testimonials: "import { StaggerContainer, StaggerItem } from '@/components/motion';",
  about: "import { FadeIn, SlideInFromSide } from '@/components/motion';",
  team: "import { FadeIn, SlideInFromSide } from '@/components/motion';",
  story: "import { FadeIn, SlideInFromSide } from '@/components/motion';",
  trust: "import { CountUp, FadeInUp } from '@/components/motion';",
  stats: "import { CountUp, FadeInUp } from '@/components/motion';",
  cta: "import { FadeInUp } from '@/components/motion';",
  contact: "import { FadeInUp } from '@/components/motion';",
  footer: '',
  default: "import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion';",
};

/**
 * Build custom React sections from a blueprint's customSections array.
 *
 * @param {string} siteId - The tenant site ID
 * @param {object} blueprint - SiteBlueprint v2 object
 * @param {object} options
 * @param {string} options.cwd - The ConversionOS project root
 * @param {number} [options.timeoutMs=300000] - Timeout per section
 * @param {boolean} [options.bespokeMode=false] - Bespoke mode with screenshots + HTML
 * @param {string} [options.resultsDir] - Results directory (for bespoke mode assets)
 * @param {number} [options.maxSections=5] - Maximum sections to build
 * @param {boolean} [options.parallel=false] - Use multi-agent parallel build
 * @param {boolean} [options.review=true] - Run Codex review quality gate
 * @param {Array<object>} [options.buildManifest] - Design Director build manifest entries (overrides blueprint specs)
 * @param {object} [options.deepContent] - Content Architect output (rich structured content)
 * @returns {Promise<{ built: number, failed: number }>}
 */
export async function buildCustomSections(siteId, blueprint, {
  cwd,
  timeoutMs = 300000,
  bespokeMode = false,
  resultsDir,
  maxSections = 5,
  parallel = false,
  review = true,
  buildManifest,
  deepContent,
}) {
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
  const aestheticsPrompt = existsSync(AESTHETICS_PROMPT_PATH) ? readFileSync(AESTHETICS_PROMPT_PATH, 'utf-8') : '';

  // Load bespoke assets if available
  let cssTokens = null;
  let htmlFiles = {};
  let screenshotPaths = [];
  if (bespokeMode && resultsDir) {
    cssTokens = loadJsonIfExists(join(resultsDir, 'css-tokens.json'));
    htmlFiles = loadHtmlDir(join(resultsDir, 'html'));
    screenshotPaths = discoverScreenshots(join(resultsDir, 'screenshots/original'));
  }

  // Load design language if available
  const designLanguagePath = resultsDir ? join(resultsDir, 'design-language.md') : null;
  const designLanguage = designLanguagePath && existsSync(designLanguagePath)
    ? readFileSync(designLanguagePath, 'utf-8') : '';

  let built = 0;
  let failed = 0;
  const builtSpecs = [];

  // ── Phase C: Generate site content data file (if deepContent available) ──
  let contentFileGenerated = false;
  if (deepContent) {
    try {
      generateSiteContentFile(cwd, siteId, deepContent);
      contentFileGenerated = true;
    } catch (err) {
      logger.warn(`Site content file generation failed (non-blocking): ${err.message?.slice(0, 100)}`);
    }
  }

  // ── Phase B: Try cohesive page build first (one Codex call for all sections) ──
  if (bespokeMode && customSections.length >= 3 && deepContent) {
    logger.info(`Cohesive page build: ${customSections.length} sections in one call`);
    try {
      const cohesiveResult = await buildCohesivePage(siteId, customSections, {
        cwd, timeoutMs: timeoutMs * 2, // Double timeout for larger generation
        integrationSpec, aestheticsPrompt, designLanguage,
        cssTokens, deepContent, buildManifest, contentFileGenerated,
      });

      if (cohesiveResult.success) {
        built = cohesiveResult.built;
        failed = customSections.length - built;
        builtSpecs.push(...cohesiveResult.specs);
        logger.info(`Cohesive page build: ${built} sections in one file`);
      } else {
        logger.warn(`Cohesive page build produced no output — falling back to per-section`);
      }
    } catch (err) {
      logger.warn(`Cohesive page build failed: ${err.message?.slice(0, 100)} — falling back to per-section`);
    }
  }

  // ── Try parallel build (if enabled, enough sections, and cohesive didn't succeed) ──
  if (built === 0 && parallel && customSections.length >= 3) {
    logger.info(`Multi-agent parallel build: ${customSections.length} sections`);
    try {
      const result = await buildSectionsParallel(customSections, siteId, {
        cwd,
        integrationSpec,
        template,
        screenshotPaths,
        cssTokens,
        timeoutMs: timeoutMs * customSections.length, // Total timeout
      });

      // Check what was built
      for (const spec of customSections) {
        const fileName = toKebabCase(spec.name) + '.tsx';
        if (result.built.includes(fileName)) {
          const componentName = toPascalCase(fileName.replace('.tsx', ''));
          builtSpecs.push({ spec, fileName, componentName });
          built++;
        } else {
          failed++;
        }
      }

      if (built > 0) {
        logger.info(`Multi-agent: ${built} built, ${failed} failed`);
      }

      if (failed > 0 && built === 0) {
        logger.warn('Multi-agent failed entirely — falling back to sequential');
        built = 0;
        failed = 0;
        builtSpecs.length = 0;
      }
    } catch (err) {
      logger.warn(`Multi-agent failed: ${err.message?.slice(0, 100)} — falling back to sequential`);
    }
  }

  // If Design Director build manifest provided, map specs to manifest entries
  const manifestByType = new Map();
  if (buildManifest?.length > 0) {
    for (const entry of buildManifest) {
      manifestByType.set(entry.sectionType, entry);
    }
  }

  // ── Sequential build (primary path or fallback) ──
  if (built === 0) {
    for (const spec of customSections) {
      const componentName = toPascalCase(spec.name);
      const expectedFileName = toKebabCase(spec.name) + '.tsx';
      const expectedFilePath = join(customDir, expectedFileName);

      logger.info(`Building custom section: ${spec.sectionId} (${componentName})${bespokeMode ? ' [bespoke]' : ''}`);

      // Check for matching Design Director manifest entry
      const manifestEntry = findManifestEntry(spec, buildManifest);

      const prompt = manifestEntry
        ? buildDesignDirectorPrompt(manifestEntry, spec, siteId, cwd, integrationSpec)
        : bespokeMode
          ? buildBespokeCodexPrompt(spec, siteId, template, cwd, integrationSpec, cssTokens, htmlFiles, screenshotPaths)
          : buildCodexPrompt(spec, siteId, template, cwd);

      // Select relevant screenshots for this section
      // NOTE: Images disabled for sequential builds (2026-03-11).
      // Codex --image causes 10min+ timeouts per section even with 0.114.0.
      // CSS tokens + HTML snippets provide sufficient visual context.
      // Screenshots are captured but used only by the visual diff QA step.
      const sectionImages = [];

      // Snapshot directory before Codex runs
      const filesBefore = new Set(readdirSync(customDir).filter(f => f.endsWith('.tsx')));

      try {
        // Generate the component — vision-first with screenshots when available
        await codexExec(prompt, {
          cwd,
          timeoutMs,
          images: sectionImages,
          ephemeral: true,
        });

        // Detect new files by diffing directory
        let createdFile = null;
        if (existsSync(expectedFilePath)) {
          createdFile = expectedFileName;
        } else {
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

        const actualFileName = createdFile;
        const actualComponentName = toPascalCase(actualFileName.replace('.tsx', ''));

        built++;
        builtSpecs.push({ spec, fileName: actualFileName, componentName: actualComponentName });
        logger.info(`Custom section built: ${spec.sectionId} → ${actualFileName}`);
      } catch (err) {
        logger.warn(`Custom section ${spec.sectionId} failed: ${err.message}`);
        failed++;
      }
    }
  }

  // ── Codex Review Quality Gate ──
  if (review && builtSpecs.length > 0) {
    logger.info(`Running Codex review quality gate for ${builtSpecs.length} section(s)...`);
    try {
      const reviewResult = await reviewGeneratedSections(cwd, siteId, {
        autoFix: true,
        maxCycles: 2,
        timeoutMs: Math.min(timeoutMs, 120000),
      });
      if (reviewResult.pass) {
        logger.info(`Review passed (${reviewResult.cycles} cycle(s), ${reviewResult.issuesFixed} fixed)`);
      } else {
        logger.warn(`Review found ${reviewResult.issuesFound} issue(s), fixed ${reviewResult.issuesFixed}`);
      }
    } catch (err) {
      logger.warn(`Codex review failed (non-blocking): ${err.message?.slice(0, 100)}`);
    }
  }

  // ── TypeScript check (fallback if review skipped) ──
  if (!review && builtSpecs.length > 0) {
    logger.info(`Running TypeScript check for ${builtSpecs.length} custom section(s)...`);
    const tscResult = tscCheck(cwd);
    if (tscResult.exitCode !== 0) {
      logger.warn(`TypeScript errors in custom sections — attempting batch fix`);
      const fixPrompt = `Fix all TypeScript errors in the files under src/sections/custom/${siteId}/. Errors:\n${tscResult.errors}\n\nFix the files so they compile cleanly. Do not delete files.`;
      try {
        await codexExec(fixPrompt, { cwd, timeoutMs, ephemeral: true });
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
    updateTopLevelRegistry(cwd);
  }

  return { built, failed };
}

/**
 * Build the Codex prompt for generating a custom section (template mode).
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

  const animationImport = getAnimationImport(spec.name);

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
- ${animationImport ? `Animation: ${animationImport}` : 'Add appropriate Framer Motion animations'}
- Return null if required data is missing
- Do NOT import external packages — only use existing project imports
- Use responsive design (mobile-first with md: breakpoints)
${referenceCode}`;
}

/**
 * Build a bespoke Codex prompt — vision-first and directive.
 * Screenshots are passed via --image flag, not embedded in the prompt.
 */
function buildBespokeCodexPrompt(spec, siteId, template, cwd, integrationSpec, cssTokens, htmlFiles, screenshotPaths) {
  // Find relevant HTML for context
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
  const animationImport = getAnimationImport(spec.name);

  // Pre-compute data access lines for this section's content mapping
  const dataAccessLines = buildDataAccessLines(spec);

  const hasScreenshots = screenshotPaths.length > 0;

  return `IMPORTANT: Create the file IMMEDIATELY. Do NOT read other project files. Do NOT explore the codebase. Just write the single file specified below.

${hasScreenshots ? 'LOOK at the attached screenshot(s) of the original contractor website. You are rebuilding this EXACT section as a React component. The generated code must VISUALLY MATCH what you see in the screenshot.' : ''}

Create file: ${filePath}

VISUAL SPEC: ${spec.spec}
${spec.layout ? `LAYOUT: ${JSON.stringify(spec.layout)}` : ''}
${spec.background ? `BACKGROUND: ${JSON.stringify(spec.background)}` : ''}
${spec.typography ? `TYPOGRAPHY: ${JSON.stringify(spec.typography)}` : ''}
${spec.spacing ? `SPACING: ${JSON.stringify(spec.spacing)}` : ''}
${spec.contentMapping ? `DATA MAPPING: ${typeof spec.contentMapping === 'string' ? spec.contentMapping : JSON.stringify(spec.contentMapping)}` : ''}
${spec.integrationNotes ? `INTEGRATION: ${spec.integrationNotes}` : ''}

CSS from original site: ${cssHints}

${dataAccessLines ? `PRE-COMPUTED DATA ACCESS (copy these into your component):\n\`\`\`tsx\n${dataAccessLines}\n\`\`\`` : ''}

${relevantHtml ? `Original HTML reference (first 2000 chars):\n${relevantHtml}\n` : ''}

${integrationSpec}

COMPONENT PATTERN — follow this exactly:
\`\`\`tsx
${template}
\`\`\`

RULES:
1. 'use client' directive at top
2. import type { SectionBaseProps } from '@/lib/section-types'
3. Named export: ${toPascalCase(spec.name)}
4. Props: { branding, config, tokens, className }
5. ${animationImport || "import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion'"}
6. Tailwind CSS v4. Mobile-first responsive (md: lg: xl:)
7. Brand colours: bg-primary, text-primary-foreground, text-muted-foreground
8. Images: import Image from 'next/image'. Gradient fallbacks for missing images.
9. Replace contact forms with <Link href="/visualizer">Get Your Free Design Estimate</Link>
10. 80-150 lines of clean, production-quality code`;
}

/**
 * Build pre-computed data access lines from contentMapping.
 */
function buildDataAccessLines(spec) {
  if (!spec.contentMapping || typeof spec.contentMapping === 'string') return '';

  const lines = ['function str(v: unknown): string { return typeof v === \'string\' && v.trim() ? v.trim() : \'\'; }'];

  const fieldMap = {
    heading: ['heroHeadline', 'hero_headline'],
    subheading: ['heroSubheadline', 'hero_subheadline'],
    backgroundImage: ['heroImageUrl', 'hero_image_url'],
    aboutText: ['aboutCopy', 'about_copy', 'about_text'],
    aboutImage: ['aboutImageUrl', 'about_image_url'],
    logo: ['logoUrl', 'logo_url'],
    serviceArea: ['serviceArea', 'service_area'],
  };

  for (const [slot, configField] of Object.entries(spec.contentMapping)) {
    const mapped = fieldMap[slot];
    if (mapped) {
      lines.push(`const ${slot} = ${mapped.map(f => `str(config['${f}'])`).join(' || ')};`);
    } else {
      // Direct field access with camelCase primary
      const camel = configField;
      const snake = configField.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
      if (camel !== snake) {
        lines.push(`const ${slot} = str(config['${camel}']) || str(config['${snake}']);`);
      } else {
        lines.push(`const ${slot} = str(config['${configField}']);`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Get the appropriate animation import for a section type.
 */
function getAnimationImport(sectionName) {
  const nameL = sectionName.toLowerCase();
  for (const [key, imp] of Object.entries(ANIMATION_MAP)) {
    if (nameL.includes(key)) return imp;
  }
  return ANIMATION_MAP.default;
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

/**
 * Generate the index.ts manifest for custom section registration.
 * Handles both per-section files and cohesive single-file pattern.
 */
function generateCustomIndex(customDir, builtSpecs) {
  // Deduplicate imports — cohesive file has multiple components from one file
  const importsByFile = new Map();
  for (const { fileName, componentName } of builtSpecs) {
    const moduleId = fileName.replace('.tsx', '');
    if (!importsByFile.has(moduleId)) importsByFile.set(moduleId, []);
    importsByFile.get(moduleId).push(componentName);
  }

  const imports = [...importsByFile.entries()].map(([moduleId, components]) =>
    `import { ${components.join(', ')} } from './${moduleId}';`
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
 * Build a Design Director Codex prompt — uses Build Manifest entries
 * with HTML structure + Design Language + Aesthetics Prompt.
 *
 * This is the REPLICATE → ENHANCE prompt: HTML gives structural completeness,
 * Design Language gives aesthetic fidelity, Aesthetics Prompt prevents AI slop,
 * Premium Upgrades give the "better than original" polish.
 */
function buildDesignDirectorPrompt(manifestEntry, spec, siteId, cwd, integrationSpec) {
  const aestheticsPrompt = existsSync(AESTHETICS_PROMPT_PATH)
    ? readFileSync(AESTHETICS_PROMPT_PATH, 'utf-8')
    : '';

  const filePath = `src/sections/custom/${siteId}/${toKebabCase(spec.name)}.tsx`;
  const animationImport = getAnimationImport(spec.name);
  const dataAccessLines = buildDataAccessLines(spec);

  return `IMPORTANT: Create the file IMMEDIATELY. Do NOT read other project files. Do NOT explore the codebase. Just write the single file specified below.

${aestheticsPrompt}

TASK: Build a premium React section for ConversionOS that REPLICATES the visual
DNA of the original website section, then ENHANCES it to 2026 premium standards.

Create file: ${filePath}

== ORIGINAL HTML STRUCTURE ==
${manifestEntry.htmlSnippet || '(no HTML available)'}

== DESIGN LANGUAGE (this section) ==
${manifestEntry.designLanguageExcerpt || '(no design language available)'}

== PREMIUM UPGRADES TO APPLY ==
${manifestEntry.premiumUpgrades || 'Add fade-in-up animations, hover effects on cards, gradient accents.'}

== CSS TOKENS ==
${manifestEntry.cssTokens ? JSON.stringify(manifestEntry.cssTokens) : '(no tokens)'}

${dataAccessLines ? `== DATA ACCESS ==\n\`\`\`tsx\n${dataAccessLines}\n\`\`\`` : ''}

${integrationSpec}

COMPONENT: ${toPascalCase(spec.name)}
SECTION TYPE: ${manifestEntry.sectionType || spec.name}

BUILD INSTRUCTIONS:
1. Match the original section's layout structure (grid columns, flex direction, stacking)
2. Match the original's visual treatment using the Design Language specs (exact spacing,
   typography scale, colour application, shadows, border-radius)
3. APPLY the premium upgrades: entrance animations, hover effects, gradient accents,
   glassmorphism where specified, atmospheric backgrounds
4. Use Tailwind CSS v4 (not inline styles). Use bg-primary, text-primary-foreground etc.
5. Read all content from config via str(config['fieldName']) with dual camelCase/snake_case lookup
6. Mobile-first responsive (sm:, md:, lg:, xl: breakpoints)
7. Typography: match original's font family from CSS tokens. If generic (Arial, sans-serif),
   upgrade to a distinctive alternative from the Design Language
8. ${animationImport || "import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn } from '@/components/motion'"}
9. Animations: fade-in-up on section enter (200ms), stagger children by 100ms in grids,
   hover lift on cards (translate-y -4px + shadow expansion)
10. Images: import Image from 'next/image'. Gradient fallbacks for missing images.
11. Replace contact forms with <Link href="/visualizer">Get Your Free Design Estimate</Link>
12. Output: one .tsx file, 80-200 lines, production quality. Every visual detail matters.`;
}

/**
 * Find a matching build manifest entry for a section spec.
 */
function findManifestEntry(spec, buildManifest) {
  if (!buildManifest?.length) return null;

  const nameL = spec.name.toLowerCase();

  // Try direct sectionType match
  for (const entry of buildManifest) {
    if (nameL.includes(entry.sectionType)) return entry;
  }

  // Try sectionId match
  for (const entry of buildManifest) {
    if (spec.sectionId === entry.sectionId) return entry;
  }

  return null;
}

// ─── Phase B: Cohesive Page Build ─────────────────────────────

/**
 * Build ALL homepage sections in a single Codex call, producing one cohesive file.
 * This mirrors how the Codex Desktop App built md-construction: all sections in one
 * file with shared design tokens (SectionEyebrow, consistent radius/shadows/palette).
 *
 * Falls back gracefully — if Codex doesn't produce the file, returns { success: false }.
 */
async function buildCohesivePage(siteId, sections, {
  cwd,
  timeoutMs = 600000,
  integrationSpec,
  aestheticsPrompt,
  designLanguage,
  cssTokens,
  deepContent,
  buildManifest,
  contentFileGenerated = false,
}) {
  const customDir = join(cwd, 'src', 'sections', 'custom', siteId);
  const outputFileName = `${siteId}-sections.tsx`;
  const outputFilePath = `src/sections/custom/${siteId}/${outputFileName}`;
  const absoluteOutputPath = join(cwd, outputFilePath);

  // Build the section specs list
  const sectionSpecs = sections.map((spec, idx) => {
    const manifestEntry = buildManifest ? findManifestEntry(spec, buildManifest) : null;
    return {
      componentName: toPascalCase(spec.name),
      sectionId: spec.sectionId,
      type: spec.name,
      spec: spec.spec || '',
      htmlSnippet: manifestEntry?.htmlSnippet?.slice(0, 1000) || '',
      designExcerpt: manifestEntry?.designLanguageExcerpt?.slice(0, 500) || '',
      order: idx,
    };
  });

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

  // Build deep content summary for the prompt
  const contentSummary = deepContent ? JSON.stringify({
    businessName: deepContent.businessName,
    businessHistory: deepContent.businessHistory,
    services: (deepContent.services || []).map(s => ({
      name: s.name, shortDescription: s.shortDescription, features: s.features?.slice(0, 4),
    })),
    testimonials: (deepContent.testimonials || []).slice(0, 4),
    trustMetrics: deepContent.trustMetrics,
    ctaCopy: deepContent.ctaCopy,
    processSteps: (deepContent.processSteps || []).slice(0, 5),
    serviceAreas: (deepContent.serviceAreas || []).slice(0, 6),
    principals: deepContent.principals,
  }, null, 2) : '';

  // Only reference the content file if we successfully generated it
  const hasContentFile = contentFileGenerated && existsSync(join(cwd, 'src', 'lib', 'sites', `${siteId}.ts`));

  const prompt = `IMPORTANT: Create the file IMMEDIATELY. Do NOT read other project files. Do NOT explore the codebase. Just write the single file specified below.

${aestheticsPrompt}

TASK: Build ALL homepage sections for "${deepContent?.businessName || siteId}" in ONE cohesive file.
This file should feel like it was designed by a senior designer — every section shares the
same design tokens, the same SectionEyebrow component, the same card radius and shadows.

Create file: ${outputFilePath}

== SECTIONS TO BUILD (${sectionSpecs.length} total, in order) ==
${sectionSpecs.map(s => `${s.order + 1}. ${s.componentName} (${s.sectionId}) — ${s.spec || s.type}`).join('\n')}

== DESIGN LANGUAGE ==
${designLanguage?.slice(0, 2000) || 'Use warm stone neutrals, rounded-[28px] cards, consistent shadows.'}

== CSS FROM ORIGINAL SITE ==
${cssHints}

== CONTRACTOR CONTENT ==
${contentSummary}

${hasContentFile ? `== CONTENT DATA FILE ==\nImport content from '@/lib/sites/${siteId}' — it exports typed constants for all services, testimonials, projects, team members, etc. Use these constants instead of reading from config.\n` : ''}

${integrationSpec}

== FILE STRUCTURE ==
The file must follow this pattern:

\`\`\`tsx
'use client';

import type { SectionBaseProps } from '@/lib/section-types';
import Image from 'next/image';
import Link from 'next/link';
import { StaggerContainer, StaggerItem, FadeInUp, FadeIn, ScaleIn, SlideInFromSide } from '@/components/motion';
${hasContentFile ? `import { SERVICES, TESTIMONIALS, PROJECTS, PUBLIC_CONTENT, TRUST_METRICS } from '@/lib/sites/${siteId}';\n` : ''}

// ── Shared Design System ──────────────────────────────────────
// These tokens MUST be used consistently across ALL sections:

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
      {children}
    </p>
  );
}

// Shared card class — same radius, shadow, hover on every card
const CARD = 'rounded-[28px] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.06)] hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(15,23,42,0.10)] transition-all duration-300';

// ── Section Components ──────────────────────────────────────

export function HeroSection({ branding, config, tokens, className }: SectionBaseProps) { ... }
export function ServicesSection({ branding, config, tokens, className }: SectionBaseProps) { ... }
// ... one export per section
\`\`\`

== RULES ==
1. 'use client' directive at top
2. Every exported component takes { branding, config, tokens, className }: SectionBaseProps
3. Define SectionEyebrow ONCE at the top — use it in EVERY section
4. Define a shared CARD constant with consistent radius + shadow
5. Use ONE neutral palette throughout (stone-950, stone-200, stone-50 — NOT generic gray)
6. Section backgrounds alternate: dark (stone-950) → light (white) → tinted (stone-50) → primary accent
7. All CTAs link to /visualizer (primary) or /visualizer?mode=chat (secondary)
8. ${hasContentFile ? 'Import content from the site content file — do NOT read from config' : 'Read content from config via str() helper with dual camelCase/snake_case lookup'}
9. Animations: StaggerContainer + FadeInUp on each section, stagger children by 100ms
10. Images: next/image with gradient fallbacks. group-hover:scale-105 on image cards.
11. Target: 600-1000 lines total. Production quality. Every visual detail matters.
12. Mobile-first responsive: sm:, md:, lg:, xl: breakpoints`;

  try {
    await codexExec(prompt, {
      cwd,
      timeoutMs,
      ephemeral: true,
    });
  } catch (err) {
    logger.warn(`Cohesive page Codex call failed: ${err.message?.slice(0, 100)}`);
    return { success: false, built: 0, specs: [] };
  }

  // Check if the file was created
  if (!existsSync(absoluteOutputPath)) {
    // Check if Codex wrote to a slightly different name
    const files = readdirSync(customDir).filter(f => f.endsWith('.tsx') && f.includes('section'));
    if (files.length > 0) {
      logger.info(`Codex wrote to ${files[0]} (expected ${outputFileName})`);
    } else {
      return { success: false, built: 0, specs: [] };
    }
  }

  // Parse the file to find exported components
  const actualFile = existsSync(absoluteOutputPath)
    ? outputFileName
    : readdirSync(customDir).find(f => f.endsWith('.tsx') && f.includes('section'));

  if (!actualFile) return { success: false, built: 0, specs: [] };

  const fileContent = readFileSync(join(customDir, actualFile), 'utf-8');
  const exportedComponents = [...fileContent.matchAll(/export\s+function\s+(\w+)/g)].map(m => m[1]);

  if (exportedComponents.length === 0) {
    logger.warn('Cohesive file has no exported components');
    return { success: false, built: 0, specs: [] };
  }

  // Map exported components to section specs
  const specs = [];
  for (const componentName of exportedComponents) {
    const matchingSpec = sections.find(s => {
      if (toPascalCase(s.name) === componentName) return true;
      // Fuzzy match: only for names with 4+ alpha chars to avoid false positives (e.g., "CTA")
      const stripped = s.name.toLowerCase().replace(/[^a-z]/g, '');
      return stripped.length >= 4 && componentName.toLowerCase().includes(stripped);
    });
    if (matchingSpec) {
      specs.push({
        spec: matchingSpec,
        fileName: actualFile,
        componentName,
      });
    } else {
      // Create a synthetic spec for components not in the original blueprint
      specs.push({
        spec: { sectionId: `custom:${siteId}-${toKebabCase(componentName)}`, name: componentName },
        fileName: actualFile,
        componentName,
      });
    }
  }

  logger.info(`Cohesive page: ${exportedComponents.length} components in ${actualFile}`);
  return { success: true, built: exportedComponents.length, specs };
}

// ─── Phase C: Site Content Data File ──────────────────────────

/**
 * Generate a typed TypeScript content file at src/lib/sites/{siteId}.ts
 * from the Content Architect output. Sections import from this file
 * instead of reading runtime config — zero generic fallbacks.
 */
function generateSiteContentFile(cwd, siteId, deepContent) {
  const sitesDir = join(cwd, 'src', 'lib', 'sites');
  mkdirSync(sitesDir, { recursive: true });

  const filePath = join(sitesDir, `${siteId}.ts`);

  const content = `/**
 * ${deepContent.businessName || siteId} — site content data.
 * Auto-generated by Content Architect. Do not edit manually.
 * Re-generated on each pipeline build.
 */

export const SITE_ID = ${JSON.stringify(siteId)};

export const PUBLIC_CONTENT = ${JSON.stringify({
    heroEyebrow: deepContent.ctaCopy?.heroEyebrow || null,
    heroHeadline: deepContent.ctaCopy?.heroHeadline || deepContent.businessName || '',
    heroSubheadline: deepContent.ctaCopy?.heroSubheadline || '',
    heroPrimaryCta: { label: deepContent.ctaCopy?.primary || 'See Your Space Before You Build', href: '/visualizer' },
    heroSecondaryCta: { label: deepContent.ctaCopy?.secondary || 'Get a Quick Estimate', href: '/visualizer?mode=chat' },
    businessHistory: deepContent.businessHistory || null,
  }, null, 2)} as const;

export const SERVICES = ${JSON.stringify(
    (deepContent.services || []).map(s => ({
      name: s.name,
      slug: s.slug,
      description: s.description,
      shortDescription: s.shortDescription,
      features: s.features || [],
      faqs: s.faqs || [],
      pageEyebrow: s.pageEyebrow || null,
      pageTitle: s.pageTitle || null,
    })),
    null, 2,
  )} as const;

export const TESTIMONIALS = ${JSON.stringify(
    (deepContent.testimonials || []).map(t => ({
      author: t.author,
      text: t.text,
      rating: t.rating || null,
      source: t.source || null,
    })),
    null, 2,
  )} as const;

export const PROJECTS = ${JSON.stringify(
    (deepContent.projects || []).map(p => ({
      title: p.title,
      description: p.description,
      category: p.category || null,
    })),
    null, 2,
  )} as const;

export const TEAM_MEMBERS = ${JSON.stringify(deepContent.teamMembers || [], null, 2)} as const;

export const PRINCIPALS = ${JSON.stringify(deepContent.principals || [], null, 2)} as const;

export const SERVICE_AREAS = ${JSON.stringify(deepContent.serviceAreas || [], null, 2)} as const;

export const PROCESS_STEPS = ${JSON.stringify(
    (deepContent.processSteps || []).map(s => ({
      title: s.title,
      description: s.description,
    })),
    null, 2,
  )} as const;

export const TRUST_METRICS = ${JSON.stringify(deepContent.trustMetrics || {}, null, 2)} as const;

export const FAQ_ITEMS = ${JSON.stringify(deepContent.faqItems || [], null, 2)} as const;

export const CONTACT = ${JSON.stringify(deepContent.contact || {}, null, 2)} as const;
`;

  writeFileSync(filePath, content);
  logger.info(`Generated site content file: src/lib/sites/${siteId}.ts (${content.length} chars)`);
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

function toPascalCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
    .replace(/^-|-$/g, '');
}
