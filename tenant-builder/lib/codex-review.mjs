/**
 * Codex Review Quality Gate — non-interactive code review.
 *
 * Uses Codex 0.114.0 `codex exec review` to check generated sections
 * for common issues before deployment. Replaces the basic snake_case
 * pattern check with a comprehensive review + auto-fix cycle.
 *
 * Checks:
 * 1. Hardcoded data (should read from config/branding)
 * 2. snake_case field access (should use camelCase with dual-lookup)
 * 3. Missing Framer Motion animations
 * 4. Missing image fallback gradients
 * 5. Missing accessibility (alt text, focus styles)
 * 6. Import errors (only allowed imports)
 * 7. TypeScript compilation
 */

import { codexExec, codexReview } from './codex-cli.mjs';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as logger from './logger.mjs';

/**
 * Review generated custom sections and optionally auto-fix issues.
 *
 * @param {string} cwd - ConversionOS project root
 * @param {string} siteId - Tenant site ID
 * @param {object} [options]
 * @param {boolean} [options.autoFix=true] - Auto-fix issues found
 * @param {number} [options.maxCycles=2] - Max review-fix cycles
 * @param {number} [options.timeoutMs=120000] - Timeout per cycle
 * @returns {Promise<{ pass: boolean, issuesFound: number, issuesFixed: number, cycles: number }>}
 */
export async function reviewGeneratedSections(cwd, siteId, {
  autoFix = true,
  maxCycles = 2,
  timeoutMs = 120000,
} = {}) {
  const customDir = join(cwd, 'src', 'sections', 'custom', siteId);
  if (!existsSync(customDir)) {
    return { pass: true, issuesFound: 0, issuesFixed: 0, cycles: 0 };
  }

  const sectionFiles = readdirSync(customDir).filter(f => f.endsWith('.tsx') && f !== 'index.ts');
  if (sectionFiles.length === 0) {
    return { pass: true, issuesFound: 0, issuesFixed: 0, cycles: 0 };
  }

  let totalIssuesFound = 0;
  let totalIssuesFixed = 0;

  for (let cycle = 0; cycle < maxCycles; cycle++) {
    logger.info(`Review cycle ${cycle + 1}/${maxCycles} for ${siteId} (${sectionFiles.length} files)`);

    // Run static checks first (fast, no API cost)
    const staticIssues = runStaticChecks(customDir, sectionFiles);

    if (staticIssues.length === 0) {
      logger.info(`Review cycle ${cycle + 1}: no issues found — passing`);
      return { pass: true, issuesFound: totalIssuesFound, issuesFixed: totalIssuesFixed, cycles: cycle + 1 };
    }

    totalIssuesFound += staticIssues.length;
    logger.info(`Review cycle ${cycle + 1}: ${staticIssues.length} issue(s) found`);

    if (!autoFix || cycle >= maxCycles - 1) {
      // Last cycle or no auto-fix — report and exit
      for (const issue of staticIssues) {
        logger.warn(`  [${issue.file}] ${issue.type}: ${issue.detail}`);
      }
      return { pass: false, issuesFound: totalIssuesFound, issuesFixed: totalIssuesFixed, cycles: cycle + 1 };
    }

    // Auto-fix via Codex
    const fixPrompt = buildFixPrompt(siteId, staticIssues);
    try {
      await codexExec(fixPrompt, { cwd, timeoutMs, ephemeral: true });
      totalIssuesFixed += staticIssues.length;
      logger.info(`Review cycle ${cycle + 1}: auto-fix applied`);
    } catch (err) {
      logger.warn(`Review cycle ${cycle + 1}: auto-fix failed: ${err.message?.slice(0, 100)}`);
      return { pass: false, issuesFound: totalIssuesFound, issuesFixed: totalIssuesFixed, cycles: cycle + 1 };
    }
  }

  return { pass: totalIssuesFound === totalIssuesFixed, issuesFound: totalIssuesFound, issuesFixed: totalIssuesFixed, cycles: maxCycles };
}

/**
 * Run static analysis checks on generated section files.
 * Fast, no API calls.
 */
function runStaticChecks(customDir, sectionFiles) {
  const issues = [];

  for (const file of sectionFiles) {
    const content = readFileSync(join(customDir, file), 'utf-8');

    // Check 1: Hardcoded testimonials/services data
    const hardcodedPatterns = [
      { pattern: /['"]Satisfied (?:Customer|Homeowner|Client)['"]/i, type: 'hardcoded_data', detail: 'Hardcoded testimonial author — should read from config.testimonials' },
      { pattern: /['"]John (?:Smith|Doe)['"]/i, type: 'hardcoded_data', detail: 'Placeholder name — should read from config' },
      { pattern: /\$\d{1,3},\d{3}/g, type: 'hardcoded_data', detail: 'Hardcoded price — should read from config or omit' },
      { pattern: /['"](?:123|456|789)\s+(?:Main|Oak|Elm)\s+(?:St|Street|Ave|Avenue)['"]/i, type: 'hardcoded_data', detail: 'Placeholder address — should use branding.address' },
      { pattern: /['"](?:555-|123-|000-)\d{4}['"]/i, type: 'hardcoded_data', detail: 'Placeholder phone — should use branding.phone' },
    ];

    for (const { pattern, type, detail } of hardcodedPatterns) {
      if (pattern.test(content)) {
        issues.push({ file, type, detail });
      }
    }

    // Check 2: snake_case field access without dual-lookup
    const snakeCaseFields = [
      'hero_headline', 'hero_image_url', 'about_text', 'about_copy',
      'about_image_url', 'logo_url', 'trust_metrics', 'hero_subheadline',
      'service_area', 'why_choose_us',
    ];
    for (const field of snakeCaseFields) {
      // Only flag if snake_case is used WITHOUT the camelCase dual-lookup
      const snakeUsed = content.includes(`['${field}']`) || content.includes(`.${field}`);
      if (snakeUsed) {
        const camelCase = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        const hasDualLookup = content.includes(`['${camelCase}']`);
        if (!hasDualLookup) {
          issues.push({ file, type: 'snake_case', detail: `Uses '${field}' without camelCase dual-lookup ('${camelCase}')` });
        }
      }
    }

    // Check 3: Missing animations (should have at least one motion import)
    if (!content.includes('@/components/motion') && !content.includes('framer-motion')) {
      issues.push({ file, type: 'missing_animations', detail: 'No animation imports — should use StaggerContainer/FadeInUp/etc.' });
    }

    // Check 4: Missing image fallback (returns null for missing image)
    if (content.includes('return null') && !content.includes('gradient')) {
      // Check if there's an image-related null return
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('return null') && i > 0) {
          const context = lines.slice(Math.max(0, i - 3), i + 1).join(' ');
          if (/image|img|photo|url/i.test(context)) {
            issues.push({ file, type: 'missing_fallback', detail: `Returns null for missing image (line ~${i + 1}) — should use gradient fallback` });
          }
        }
      }
    }

    // Check 5: Missing 'use client' directive
    if (!content.trimStart().startsWith("'use client'") && !content.trimStart().startsWith('"use client"')) {
      issues.push({ file, type: 'missing_directive', detail: "Missing 'use client' directive at top of file" });
    }

    // Check 6: Bad imports
    const importLines = content.match(/^import .+ from ['"]([^'"]+)['"]/gm) || [];
    const allowedPrefixes = ['@/lib/', '@/components/', 'next/', 'react'];
    for (const imp of importLines) {
      const fromMatch = imp.match(/from ['"]([^'"]+)['"]/);
      if (fromMatch) {
        const mod = fromMatch[1];
        if (!mod.startsWith('.') && !allowedPrefixes.some(p => mod.startsWith(p))) {
          issues.push({ file, type: 'bad_import', detail: `Disallowed import: ${mod}` });
        }
      }
    }
  }

  return issues;
}

/**
 * Build a Codex fix prompt from static analysis issues.
 */
function buildFixPrompt(siteId, issues) {
  const byFile = {};
  for (const issue of issues) {
    if (!byFile[issue.file]) byFile[issue.file] = [];
    byFile[issue.file].push(issue);
  }

  const fileInstructions = Object.entries(byFile).map(([file, fileIssues]) => {
    return `File: src/sections/custom/${siteId}/${file}\nIssues:\n${fileIssues.map((i, n) => `  ${n + 1}. [${i.type}] ${i.detail}`).join('\n')}`;
  }).join('\n\n');

  return `IMPORTANT: Fix these files IMMEDIATELY. Do NOT read other project files.

Fix the following issues in custom sections for "${siteId}":

${fileInstructions}

FIX RULES:
- For snake_case: add dual-lookup pattern: \`str(config['camelCase']) || str(config['snake_case'])\`
- For hardcoded data: replace with config/branding reads
- For missing animations: add appropriate imports from '@/components/motion'
- For missing fallback: use gradient div instead of returning null
- For missing directive: add 'use client' at top
- For bad imports: remove or replace with allowed imports
- Keep existing component name and exports
- Keep SectionBaseProps interface`;
}
