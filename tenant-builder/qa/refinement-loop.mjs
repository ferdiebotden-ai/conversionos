#!/usr/bin/env node
/**
 * QA Refinement Loop — fix-and-recheck cycle.
 *
 * 1. Run visual-qa.mjs
 * 2. If pass -> done
 * 3. If fail -> analyse low dimensions, generate fix instructions
 * 4. Apply fixes to Supabase admin_settings
 * 5. Re-screenshot + re-score
 * 6. Repeat up to max iterations
 *
 * Usage:
 *   node qa/refinement-loop.mjs --site-id example --url https://example.norbotsystems.com --max-iterations 3
 *   node qa/refinement-loop.mjs --site-id example --url https://example.norbotsystems.com --target-id 42
 */

import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv, requireEnv } from '../lib/env-loader.mjs';
import { execute } from '../lib/turso-client.mjs';
import { getSupabase } from '../lib/supabase-client.mjs';
import { callClaude } from '../lib/claude-cli.mjs';
import * as logger from '../lib/logger.mjs';

loadEnv();
requireEnv(['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']);

const { values: args } = parseArgs({
  options: {
    'site-id': { type: 'string' },
    url: { type: 'string' },
    'target-id': { type: 'string' },
    'max-iterations': { type: 'string', default: '3' },
    help: { type: 'boolean' },
  },
});

if (args.help || !args['site-id'] || !args.url) {
  console.log(`Usage:
  node qa/refinement-loop.mjs --site-id example --url https://example.norbotsystems.com --max-iterations 3
  node qa/refinement-loop.mjs --site-id example --url https://example.norbotsystems.com --target-id 42`);
  process.exit(args.help ? 0 : 1);
}

const siteId = args['site-id'];
const siteUrl = args.url;
const targetId = args['target-id'] ? parseInt(args['target-id'], 10) : null;
const maxIterations = parseInt(args['max-iterations'], 10);
const today = new Date().toISOString().slice(0, 10);
const baseDir = resolve(import.meta.dirname, `../results/${today}/${siteId}`);
mkdirSync(resolve(baseDir, 'screenshots'), { recursive: true });

const demoRoot = resolve(import.meta.dirname, '../../');

logger.progress({ stage: 'qa', target_id: targetId, site_id: siteId, status: 'start', detail: 'refinement loop' });

// Update Turso to refining status
if (targetId) {
  try {
    await execute("UPDATE targets SET bespoke_status = 'refining' WHERE id = ?", [targetId]);
  } catch (e) {
    logger.warn(`Could not update bespoke_status: ${e.message}`);
  }
}

async function snapshotAdminSettings(siteId) {
  const sb = getSupabase();
  const { data } = await sb
    .from('admin_settings')
    .select('key, value')
    .eq('site_id', siteId);
  return data || [];
}

async function restoreSnapshot(siteId, snapshot) {
  const sb = getSupabase();
  for (const row of snapshot) {
    await sb
      .from('admin_settings')
      .update({ value: row.value })
      .eq('site_id', siteId)
      .eq('key', row.key);
  }
  logger.info('Snapshot restored');
}

let iteration = 0;
let lastResult = null;
let previousScore = null;
let lastSnapshot = null;

while (iteration < maxIterations) {
  iteration++;
  logger.info(`Refinement iteration ${iteration}/${maxIterations}`);

  // Step 1: Screenshot
  logger.info('Taking screenshots...');
  try {
    execFileSync('node', [
      resolve(import.meta.dirname, 'screenshot.mjs'),
      '--url', siteUrl,
      '--site-id', siteId,
      '--output', resolve(baseDir, 'screenshots'),
    ], {
      cwd: demoRoot,
      env: process.env,
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e) {
    logger.error(`Screenshot failed: ${e.message?.slice(0, 100)}`);
    break;
  }

  // Step 2: Visual QA
  logger.info('Running visual QA...');
  try {
    const qaArgs = [
      resolve(import.meta.dirname, 'visual-qa.mjs'),
      '--site-id', siteId,
      '--screenshots', resolve(baseDir, 'screenshots'),
    ];
    if (targetId) qaArgs.push('--target-id', String(targetId));

    const stdout = execFileSync('node', qaArgs, {
      cwd: demoRoot,
      env: process.env,
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // visual-qa.mjs writes INFO logs + JSON to stdout — extract the last JSON line
    const jsonLine = stdout.split('\n').filter(l => l.trim().startsWith('{')).pop() || stdout;
    lastResult = JSON.parse(jsonLine);
  } catch (e) {
    // visual-qa.mjs exits 1 on fail but still outputs JSON on stdout
    const stdout = e.stdout || '';
    try {
      const jsonLine = stdout.split('\n').filter(l => l.trim().startsWith('{')).pop() || stdout;
      lastResult = JSON.parse(jsonLine);
    } catch {
      logger.error(`Visual QA failed to produce output: ${e.message?.slice(0, 100)}`);
      break;
    }
  }

  if (lastResult?.pass) {
    logger.info(`QA PASSED on iteration ${iteration} (avg: ${lastResult.average})`);
    break;
  }

  const currentScore = lastResult?.average || 0;

  // Plateau detection — stop if improvement < 0.2
  if (previousScore !== null && currentScore - previousScore < 0.2) {
    logger.info(`Score plateau: ${previousScore} -> ${currentScore} (delta < 0.2). Stopping.`);
    break;
  }

  // Regression detection — stop and rollback
  if (previousScore !== null && currentScore < previousScore) {
    logger.warn(`Score regression: ${previousScore} -> ${currentScore}. Stopping to prevent degradation.`);
    if (lastSnapshot) {
      logger.info('Rolling back to previous snapshot...');
      await restoreSnapshot(siteId, lastSnapshot);
    }
    break;
  }

  previousScore = currentScore;

  logger.info(`QA FAILED on iteration ${iteration} (avg: ${lastResult?.average || 'N/A'})`);

  if (iteration >= maxIterations) {
    logger.warn(`Max iterations reached. Final score: ${lastResult?.average || 'N/A'}`);
    break;
  }

  // Snapshot before applying fixes
  lastSnapshot = await snapshotAdminSettings(siteId);

  // Step 3: Analyse failures and generate fixes
  logger.info('Generating fix instructions...');
  const dims = ['logo_fidelity', 'colour_match', 'copy_accuracy', 'layout_integrity', 'brand_cohesion', 'text_legibility'];
  const lowDims = dims.filter(d => (lastResult[d] || 0) < 4.0);

  // Include page-specific issues if available
  const pageIssuesSection = lastResult.page_issues?.length > 0
    ? `\nPage-specific issues:\n${lastResult.page_issues.map(i => `  [${i.severity}] ${i.page} (${i.dimension}): ${i.issue}`).join('\n')}`
    : '';

  const fixPrompt = `A ConversionOS demo site for ${siteId} scored poorly on visual QA.

Scores:
${dims.map(d => `  ${d}: ${lastResult[d]}/5`).join('\n')}
Average: ${lastResult.average}/5
Notes: ${lastResult.notes || 'none'}
${pageIssuesSection}

Low-scoring dimensions: ${lowDims.join(', ')}

The site is powered by Supabase admin_settings (keys: business_info, branding, company_profile).
What specific changes should be made to improve the low-scoring dimensions?
Give concrete, actionable fixes as a JSON array of objects: [{ "table": "admin_settings", "key": "branding|business_info|company_profile", "path": "dot.notation.path", "action": "set|append", "value": "new value" }]
Only suggest fixes for things that can be changed in admin_settings. Do not suggest code changes.`;

  try {
    const fixes = callClaude(fixPrompt, { model: 'sonnet', maxTurns: 3, timeoutMs: 60000 });

    if (typeof fixes === 'string') {
      logger.info(`Fix suggestions: ${fixes.slice(0, 200)}`);
    } else if (Array.isArray(fixes)) {
      logger.info(`Applying ${fixes.length} fix(es)`);
      const sb = getSupabase();

      for (const fix of fixes) {
        if (!fix.key || !fix.path || !fix.value) continue;

        try {
          // Read current value
          const { data } = await sb
            .from('admin_settings')
            .select('value')
            .eq('site_id', siteId)
            .eq('key', fix.key)
            .single();

          if (!data?.value) continue;

          // Apply fix at path
          const obj = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          const parts = fix.path.split('.');
          let target = obj;
          for (let i = 0; i < parts.length - 1; i++) {
            target = target[parts[i]];
            if (!target) break;
          }
          if (target) {
            const lastKey = parts[parts.length - 1];
            target[lastKey] = fix.value;

            // Write back
            await sb
              .from('admin_settings')
              .update({ value: obj })
              .eq('site_id', siteId)
              .eq('key', fix.key);

            logger.info(`  Fixed: ${fix.key}.${fix.path} = ${JSON.stringify(fix.value).slice(0, 50)}`);
          }
        } catch (e) {
          logger.warn(`  Fix failed for ${fix.key}.${fix.path}: ${e.message}`);
        }
      }
    }
  } catch (e) {
    logger.warn(`Fix generation failed: ${e.message} — skipping fixes`);
  }

  // Brief pause for any CDN/edge caching
  logger.info('Waiting 10s for cache propagation...');
  await new Promise(r => setTimeout(r, 10000));
}

// Final status
const finalPass = lastResult?.pass || false;

if (targetId) {
  try {
    const status = finalPass ? 'complete' : 'failed';
    await execute(
      "UPDATE targets SET bespoke_status = ? WHERE id = ?",
      [status, targetId]
    );
  } catch (e) {
    logger.warn(`Could not update final bespoke_status: ${e.message}`);
  }
}

logger.progress({
  stage: 'qa',
  target_id: targetId,
  site_id: siteId,
  status: finalPass ? 'complete' : 'error',
  detail: `iterations=${iteration}, avg=${lastResult?.average || 'N/A'}, pass=${finalPass}`,
});

process.exit(finalPass ? 0 : 2);
