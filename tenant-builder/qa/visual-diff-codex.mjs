/**
 * Visual Diff with Codex — autonomous side-by-side comparison.
 *
 * Uses Codex 0.114.0 with GPT 5.4 vision to compare original website
 * screenshots against the generated rebuild. Can also use Playwright MCP
 * to navigate both sites live.
 *
 * Two modes:
 * 1. Screenshot comparison: --image original + --image generated
 * 2. Live navigation: Codex uses Playwright MCP to visit both URLs
 *
 * Returns a list of differences with fix instructions. Can optionally
 * auto-fix by editing section files directly.
 */

import { codexExec } from '../lib/codex-cli.mjs';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as logger from '../lib/logger.mjs';

/**
 * Compare original vs generated site using Codex vision.
 *
 * @param {object} options
 * @param {string} options.originalUrl - Original contractor website URL
 * @param {string} options.generatedUrl - Generated demo URL
 * @param {string} options.siteId - Tenant site ID
 * @param {string} options.resultsDir - Results directory (for screenshots)
 * @param {string} options.cwd - ConversionOS project root
 * @param {boolean} [options.autoFix=false] - Auto-fix differences by editing section files
 * @param {number} [options.timeoutMs=300000] - Timeout
 * @returns {Promise<{ differences: Array, fixed: number }>}
 */
export async function visualDiffWithCodex({
  originalUrl,
  generatedUrl,
  siteId,
  resultsDir,
  cwd,
  autoFix = false,
  timeoutMs = 300000,
}) {
  // Collect screenshots for comparison
  const originalScreenshots = findScreenshots(join(resultsDir, 'screenshots/original'));
  const generatedScreenshots = findScreenshots(join(resultsDir, 'screenshots'));

  // Need at least homepage screenshots from both sides
  const origHomepage = originalScreenshots.find(p => p.includes('homepage-desktop'));
  const genHomepage = generatedScreenshots.find(p => p.includes('desktop.png') || p.includes('homepage-desktop'));

  const images = [];
  if (origHomepage) images.push(origHomepage);
  if (genHomepage) images.push(genHomepage);

  // Add inner page comparisons if available
  for (const page of ['services', 'about', 'gallery', 'contact']) {
    const orig = originalScreenshots.find(p => p.includes(`${page}-desktop`));
    const gen = generatedScreenshots.find(p => p.includes(`${page}-desktop`));
    if (orig) images.push(orig);
    if (gen) images.push(gen);
  }

  if (images.length < 2) {
    logger.warn('Visual diff: need at least 1 original + 1 generated screenshot');
    return { differences: [], fixed: 0 };
  }

  // Find custom section files for this tenant
  const customDir = join(cwd, 'src', 'sections', 'custom', siteId);
  const sectionFiles = existsSync(customDir)
    ? readdirSync(customDir).filter(f => f.endsWith('.tsx') && f !== 'index.ts')
    : [];

  const comparePrompt = buildComparePrompt(siteId, originalUrl, generatedUrl, sectionFiles, images, autoFix);

  try {
    const outputPath = join(resultsDir, 'visual-diff-output.json');

    await codexExec(comparePrompt, {
      cwd: autoFix ? cwd : resultsDir,
      timeoutMs,
      images,
      ephemeral: true,
      outputFile: outputPath,
    });

    // Parse results
    let differences = [];
    if (existsSync(outputPath)) {
      try {
        const raw = readFileSync(outputPath, 'utf-8').trim();
        const cleaned = raw.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?\s*```$/m, '');
        differences = JSON.parse(cleaned);
        if (!Array.isArray(differences)) differences = [];
      } catch {
        logger.warn('Visual diff: could not parse output');
      }
    }

    // Save diff results
    writeFileSync(
      join(resultsDir, 'visual-diff.json'),
      JSON.stringify({ differences, originalUrl, generatedUrl, autoFix, timestamp: new Date().toISOString() }, null, 2)
    );

    const fixed = autoFix ? differences.filter(d => d.fixed).length : 0;
    logger.info(`Visual diff: ${differences.length} difference(s) found, ${fixed} auto-fixed`);

    return { differences, fixed };
  } catch (err) {
    logger.warn(`Visual diff failed: ${err.message?.slice(0, 200)}`);
    return { differences: [], fixed: 0 };
  }
}

/**
 * Run a visual diff + fix loop (compare → fix → redeploy → re-compare).
 * Max 2 iterations.
 *
 * @param {object} options - Same as visualDiffWithCodex
 * @param {number} [options.maxIterations=2]
 * @returns {Promise<{ totalDifferences: number, totalFixed: number, iterations: number }>}
 */
export async function visualDiffLoop(options) {
  const maxIterations = options.maxIterations ?? 2;
  let totalDifferences = 0;
  let totalFixed = 0;

  for (let i = 0; i < maxIterations; i++) {
    logger.info(`Visual diff loop: iteration ${i + 1}/${maxIterations}`);

    const { differences, fixed } = await visualDiffWithCodex({
      ...options,
      autoFix: i < maxIterations - 1, // Don't auto-fix on last iteration
    });

    totalDifferences += differences.length;
    totalFixed += fixed;

    if (differences.length === 0) {
      logger.info('Visual diff loop: no differences — done');
      break;
    }

    if (fixed === 0 && i < maxIterations - 1) {
      logger.info('Visual diff loop: no fixes applied — stopping');
      break;
    }
  }

  return { totalDifferences, totalFixed, iterations: Math.min(maxIterations, totalDifferences > 0 ? maxIterations : 1) };
}

// ─── Helpers ────────────────────────────────────────────

function findScreenshots(dir) {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
      .map(f => join(dir, f));
  } catch { return []; }
}

function buildComparePrompt(siteId, originalUrl, generatedUrl, sectionFiles, images, autoFix) {
  const imageDesc = images.map((p, i) => {
    const name = p.split('/').pop();
    const isOriginal = p.includes('screenshots/original');
    return `  ${i + 1}. [${isOriginal ? 'ORIGINAL' : 'GENERATED'}] ${name}`;
  }).join('\n');

  let prompt = `Compare these screenshots of a contractor website rebuild.

ORIGINAL SITE: ${originalUrl}
GENERATED REBUILD: ${generatedUrl}
TENANT: ${siteId}

SCREENSHOTS (alternating original/generated):
${imageDesc}

Compare the ORIGINAL screenshots against the GENERATED screenshots.
Focus on these visual aspects:
1. Layout structure — same number of columns, similar section heights
2. Colour palette — matching primary/secondary colours, overlay opacity
3. Typography — similar heading sizes, font weights, text alignment
4. Spacing — matching padding, gaps between elements
5. Visual weight — same hero treatment, card styles, image prominence
6. Missing sections — anything in original but not in rebuild
7. Navigation style — matching nav bar treatment

For each significant difference, provide:
- section: which section is affected (match to one of: ${sectionFiles.join(', ')})
- severity: high/medium/low
- issue: what's different
- fix: specific code-level fix instruction`;

  if (autoFix) {
    prompt += `

IMPORTANT: After listing differences, EDIT the section files to fix the top 5 most impactful issues.
Section files are in: src/sections/custom/${siteId}/
Only change what's needed — keep component names, exports, and SectionBaseProps pattern.`;
  }

  prompt += `

Return the differences as a JSON array:
[
  {
    "section": "hero.tsx",
    "severity": "high",
    "issue": "Hero is 60vh instead of full-viewport",
    "fix": "Change min-h-[400px] to min-h-screen"${autoFix ? ',\n    "fixed": true' : ''}
  }
]

If the sites match well, return [].`;

  return prompt;
}
