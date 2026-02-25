#!/usr/bin/env node
/**
 * Visual QA — Claude Vision 5-dimension rubric.
 *
 * Sends desktop + mobile screenshots to Claude for structured scoring.
 * Pass criteria: avg >= 4.0, no dimension below 3.0.
 *
 * Usage:
 *   node qa/visual-qa.mjs --site-id example --screenshots ./results/2026-02-25/example/screenshots/
 *   node qa/visual-qa.mjs --site-id example --screenshots ./screenshots/ --original ./original-screenshot.png
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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

const CLAUDE_BIN = findClaude();

// Build prompt with explicit file paths so the model reads the screenshots
let prompt = `You are reviewing a ConversionOS demo website generated for a renovation contractor. Score the site on 5 dimensions (1-5 each).

Site ID: ${siteId}

IMPORTANT: First, use the Read tool to view the desktop screenshot at: ${desktopPath}`;

if (existsSync(mobilePath)) {
  prompt += `\nAlso read the mobile screenshot at: ${mobilePath}`;
}

if (args.original && existsSync(resolve(args.original))) {
  prompt += `\nAlso read the original contractor website screenshot for comparison at: ${resolve(args.original)}`;
}

prompt += `

After viewing the screenshot(s), score each dimension:
1. **Logo Fidelity** — Is the logo displayed correctly? (5=perfect rendering, 1=missing/broken/placeholder)
2. **Colour Match** — Do brand colours feel right for this business? (5=professional palette, 1=clashing/default colours)
3. **Copy Accuracy** — Is the business name, services, and about text correct? (5=all accurate, 1=placeholders/wrong info)
4. **Layout Integrity** — Is the page layout clean with no broken sections? (5=polished, 1=broken/overlapping elements)
5. **Brand Cohesion** — Does the overall site feel like a real business site? (5=professional and branded, 1=generic template)

Be critical — only score 5 if truly excellent.`;

// Build claude args — no positional image paths, model reads them via Read tool
const claudeArgs = [
  '-p', prompt,
  '--output-format', 'json',
  '--max-turns', '10',
  '--model', 'sonnet',
  '--json-schema', readFileSync(SCHEMA_PATH, 'utf-8'),
];

const env = { ...process.env };
delete env.CLAUDECODE;

logger.info(`Visual QA: scoring ${siteId}`);

try {
  const stdout = execFileSync(CLAUDE_BIN, claudeArgs, {
    env,
    timeout: 90000,
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
  const dims = ['logo_fidelity', 'colour_match', 'copy_accuracy', 'layout_integrity', 'brand_cohesion'];
  const average = dims.reduce((sum, d) => sum + (scores[d] || 0), 0) / dims.length;
  const belowMin = dims.filter(d => (scores[d] || 0) < 3.0);
  const pass = average >= 4.0 && belowMin.length === 0;

  const result = {
    ...scores,
    average: Math.round(average * 100) / 100,
    pass,
    screenshots: {
      desktop: desktopPath,
      mobile: existsSync(mobilePath) ? mobilePath : null,
    },
  };

  logger.info(`Visual QA: avg=${result.average}, pass=${pass}`);
  if (belowMin.length > 0) {
    logger.warn(`Dimensions below minimum: ${belowMin.join(', ')}`);
  }
  for (const d of dims) {
    logger.info(`  ${d}: ${scores[d]}/5`);
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
