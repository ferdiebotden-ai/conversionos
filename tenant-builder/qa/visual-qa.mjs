#!/usr/bin/env node
/**
 * Visual QA — Claude Vision 6-dimension rubric with per-page coverage.
 *
 * Sends ALL available screenshots (homepage + services + about + projects + contact)
 * to Claude for structured scoring. Produces aggregate scores + per-page issue list.
 *
 * Pass criteria: avg >= 4.0, no dimension below 3.0.
 *
 * Usage:
 *   node qa/visual-qa.mjs --site-id example --screenshots ./results/2026-02-25/example/screenshots/
 *   node qa/visual-qa.mjs --site-id example --screenshots ./screenshots/ --original ./original-screenshot.png
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadEnv } from '../lib/env-loader.mjs';
import { execute } from '../lib/turso-client.mjs';
import * as logger from '../lib/logger.mjs';

loadEnv();

const SCHEMA_PATH = resolve(import.meta.dirname, '../schemas/visual-qa.json');

const { values: args } = parseArgs({
  options: {
    'site-id': { type: 'string' },
    screenshots: { type: 'string' },
    original: { type: 'string' },
    'target-id': { type: 'string' },
    help: { type: 'boolean' },
  },
});

if (args.help || !args['site-id'] || !args.screenshots) {
  console.log(`Usage:
  node qa/visual-qa.mjs --site-id example --screenshots ./results/2026-02-25/example/screenshots/
  node qa/visual-qa.mjs --site-id example --screenshots ./screenshots/ --original ./original-screenshot.png --target-id 42`);
  process.exit(args.help ? 0 : 1);
}

const siteId = args['site-id'];
const screenshotsDir = resolve(args.screenshots);
const targetId = args['target-id'] ? parseInt(args['target-id'], 10) : null;

const desktopPath = resolve(screenshotsDir, 'desktop.png');
const mobilePath = resolve(screenshotsDir, 'mobile.png');

if (!existsSync(desktopPath)) {
  logger.error(`Desktop screenshot not found: ${desktopPath}`);
  process.exit(1);
}

/**
 * Find the claude binary.
 */
function findClaude() {
  const candidates = [
    process.env.HOME + '/.local/bin/claude',
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
  ];
  for (const p of candidates) {
    try { execFileSync(p, ['--version'], { stdio: 'pipe' }); return p; }
    catch { /* not found */ }
  }
  return 'claude';
}

/**
 * Discover all available screenshots in the directory.
 * Returns { homepage: [...], services: [...], ... } grouped by page.
 */
function discoverScreenshots(dir) {
  const files = readdirSync(dir).filter(f => f.endsWith('.png'));
  const result = {
    homepage: [],
    services: [],
    about: [],
    projects: [],
    contact: [],
    other: [],
  };

  for (const f of files) {
    const fullPath = resolve(dir, f);
    if (f === 'desktop.png') {
      result.homepage.push({ path: fullPath, label: 'Homepage (desktop viewport)' });
    } else if (f === 'mobile.png') {
      result.homepage.push({ path: fullPath, label: 'Homepage (mobile viewport)' });
    } else if (f.includes('-homepage-')) {
      result.homepage.push({ path: fullPath, label: `Homepage (${f.includes('mobile') ? 'mobile' : 'desktop'} full page)` });
    } else if (f.includes('-services-')) {
      result.services.push({ path: fullPath, label: `Services (${f.includes('mobile') ? 'mobile' : 'desktop'} full page)` });
    } else if (f.includes('-about-')) {
      result.about.push({ path: fullPath, label: `About (${f.includes('mobile') ? 'mobile' : 'desktop'} full page)` });
    } else if (f.includes('-projects-')) {
      result.projects.push({ path: fullPath, label: `Projects (${f.includes('mobile') ? 'mobile' : 'desktop'} full page)` });
    } else if (f.includes('-contact-')) {
      result.contact.push({ path: fullPath, label: `Contact (${f.includes('mobile') ? 'mobile' : 'desktop'} full page)` });
    } else if (!f.includes('-admin-') && !f.includes('style-active')) {
      result.other.push({ path: fullPath, label: f });
    }
  }

  return result;
}

const CLAUDE_BIN = findClaude();
const discovered = discoverScreenshots(screenshotsDir);

// Collect all screenshots to send (prioritize desktop full-page for each page)
const screenshotPaths = [];

// Always include homepage viewport screenshots
screenshotPaths.push({ path: desktopPath, label: 'Homepage (desktop viewport)' });
if (existsSync(mobilePath)) {
  screenshotPaths.push({ path: mobilePath, label: 'Homepage (mobile viewport)' });
}

// Add desktop full-page screenshots for each page (skip duplicates with homepage viewport)
const pages = ['homepage', 'services', 'about', 'projects', 'contact'];
for (const page of pages) {
  const pageScreenshots = discovered[page] || [];
  for (const ss of pageScreenshots) {
    // Skip if already added (homepage viewport)
    if (ss.path === desktopPath || ss.path === mobilePath) continue;
    // Prefer desktop full-page over mobile full-page for each page
    if (ss.label.includes('desktop full page')) {
      screenshotPaths.push(ss);
    }
  }
}

// Add mobile full-page for non-homepage pages (if desktop not available)
for (const page of pages.slice(1)) {
  const pageScreenshots = discovered[page] || [];
  const hasDesktop = pageScreenshots.some(s => s.label.includes('desktop full page'));
  if (!hasDesktop) {
    const mobileSS = pageScreenshots.find(s => s.label.includes('mobile full page'));
    if (mobileSS) screenshotPaths.push(mobileSS);
  }
}

const allPaths = screenshotPaths.map(s => s.path);
const pagesCovered = new Set(screenshotPaths.map(s => {
  if (s.label.includes('Homepage')) return 'homepage';
  if (s.label.includes('Services')) return 'services';
  if (s.label.includes('About')) return 'about';
  if (s.label.includes('Projects')) return 'projects';
  if (s.label.includes('Contact')) return 'contact';
  return 'other';
}));

logger.info(`Visual QA: ${screenshotPaths.length} screenshots covering ${pagesCovered.size} pages: ${[...pagesCovered].join(', ')}`);

// Build prompt with all screenshot paths
let prompt = `You are reviewing a ConversionOS demo website generated for a renovation contractor. Score the ENTIRE site across ALL pages on 6 dimensions (1-5 each).

Site ID: ${siteId}

IMPORTANT: First, use the Read tool to view ALL of the following screenshots. Review every page before scoring.

Screenshots to review:`;

for (const ss of screenshotPaths) {
  prompt += `\n- ${ss.label}: ${ss.path}`;
}

if (args.original && existsSync(resolve(args.original))) {
  prompt += `\n- Original contractor website (for comparison): ${resolve(args.original)}`;
}

prompt += `

After viewing ALL screenshots, score the ENTIRE SITE across all pages:
1. **Logo Fidelity** — Is the logo displayed correctly on ALL pages? (5=perfect, 1=missing/broken)
2. **Colour Match** — Do brand colours feel right across ALL pages? (5=professional, 1=clashing/default)
3. **Copy Accuracy** — Is business name, services, and about text correct on ALL pages? (5=all accurate, 1=placeholders)
4. **Layout Integrity** — Are ALL page layouts clean with no broken sections? (5=polished, 1=broken)
5. **Brand Cohesion** — Does the ENTIRE site feel like a real business site? (5=professional, 1=generic template)
6. **Text Legibility** — Can all text be read against backgrounds on ALL pages? (5=excellent contrast, 1=unreadable)

Be critical — only score 5 if truly excellent across ALL pages. If one page has issues, that should lower the relevant dimension.

Also identify specific issues on individual pages in the page_issues array. If a page looks perfect, don't add issues for it. Focus on problems that affect the overall quality.`;

// Build claude args
const claudeArgs = [
  '-p', prompt,
  '--output-format', 'json',
  '--max-turns', '15',
  '--model', 'sonnet',
  '--json-schema', readFileSync(SCHEMA_PATH, 'utf-8'),
];

const env = { ...process.env };
delete env.CLAUDECODE;

logger.info(`Visual QA: scoring ${siteId} (${screenshotPaths.length} screenshots)`);

try {
  const stdout = execFileSync(CLAUDE_BIN, claudeArgs, {
    env,
    timeout: 180000,
    maxBuffer: 10 * 1024 * 1024,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const envelope = JSON.parse(stdout);
  const scores = envelope.structured_output || envelope.result;

  if (!scores || typeof scores !== 'object' || !scores.logo_fidelity) {
    logger.error(`Visual QA: unexpected response shape. Type: ${envelope.type}, subtype: ${envelope.subtype}`);
    logger.error(`Envelope keys: ${Object.keys(envelope).join(', ')}`);
    process.exit(1);
  }

  // Calculate average
  const dims = ['logo_fidelity', 'colour_match', 'copy_accuracy', 'layout_integrity', 'brand_cohesion', 'text_legibility'];
  const average = dims.reduce((sum, d) => sum + (scores[d] || 0), 0) / dims.length;
  const belowMin = dims.filter(d => (scores[d] || 0) < 3.0);
  const pass = average >= 4.0 && belowMin.length === 0;

  const result = {
    ...scores,
    average: Math.round(average * 100) / 100,
    pass,
    pages_reviewed: [...pagesCovered],
    screenshots_count: screenshotPaths.length,
    screenshots: {
      desktop: desktopPath,
      mobile: existsSync(mobilePath) ? mobilePath : null,
      all: allPaths,
    },
  };

  logger.info(`Visual QA: avg=${result.average}, pass=${pass}, pages=${pagesCovered.size}`);
  if (belowMin.length > 0) {
    logger.warn(`Dimensions below minimum: ${belowMin.join(', ')}`);
  }
  for (const d of dims) {
    logger.info(`  ${d}: ${scores[d]}/5`);
  }
  if (scores.page_issues?.length > 0) {
    logger.info(`Page issues found: ${scores.page_issues.length}`);
    for (const issue of scores.page_issues) {
      logger.info(`  [${issue.severity}] ${issue.page}: ${issue.issue}`);
    }
  }

  // Save result
  const resultPath = resolve(screenshotsDir, '..', 'visual-qa.json');
  writeFileSync(resultPath, JSON.stringify(result, null, 2));
  logger.info(`Result saved: ${resultPath}`);

  // Update Turso bespoke_score
  if (targetId) {
    try {
      await execute(
        'UPDATE targets SET bespoke_score = ? WHERE id = ?',
        [result.average, targetId]
      );
      logger.info(`Turso bespoke_score updated: ${result.average}`);
    } catch (e) {
      logger.warn(`Could not update bespoke_score: ${e.message}`);
    }
  }

  // Output JSON for downstream
  console.log(JSON.stringify(result));
  process.exit(pass ? 0 : 1);
} catch (e) {
  logger.error(`Visual QA failed: ${e.message}`);
  process.exit(1);
}
