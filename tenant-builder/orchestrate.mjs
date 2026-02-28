#!/usr/bin/env node
/**
 * Tenant Builder Orchestrator — master entry point.
 *
 * Usage:
 *   node orchestrate.mjs --batch --limit 10
 *   node orchestrate.mjs --target-id 42
 *   node orchestrate.mjs --url https://x.com --site-id x --tier accelerate
 *   node orchestrate.mjs --discover --cities "London,Kitchener" --limit 10
 *   node orchestrate.mjs --nightly
 *   node orchestrate.mjs --batch --limit 5 --dry-run
 *   node orchestrate.mjs --batch --limit 10 --concurrency 4
 */

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
import { loadEnv, requireEnv } from './lib/env-loader.mjs';
import { query, execute } from './lib/turso-client.mjs';
import { pool } from './lib/concurrency.mjs';
import * as logger from './lib/logger.mjs';

loadEnv();
requireEnv(['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']);

const CONFIG = YAML.parse(readFileSync(resolve(import.meta.dirname, 'config.yaml'), 'utf-8'));
const DEMO_ROOT = resolve(import.meta.dirname, '..');
const TB_ROOT = import.meta.dirname;
const TODAY = new Date().toISOString().slice(0, 10);

const { values: args } = parseArgs({
  options: {
    batch: { type: 'boolean', default: false },
    'target-id': { type: 'string' },
    'target-ids': { type: 'string' },
    url: { type: 'string' },
    'site-id': { type: 'string' },
    tier: { type: 'string', default: 'accelerate' },
    discover: { type: 'boolean', default: false },
    cities: { type: 'string', default: '' },
    nightly: { type: 'boolean', default: false },
    limit: { type: 'string', default: '10' },
    concurrency: { type: 'string', default: '4' },
    'dry-run': { type: 'boolean', default: false },
    'skip-qa': { type: 'boolean', default: false },
    'skip-git': { type: 'boolean', default: false },
    'skip-outreach': { type: 'boolean', default: false },
    'timeout-multiplier': { type: 'string', default: '1' },
    help: { type: 'boolean' },
  },
});

if (args.help) {
  console.log(`Tenant Builder Orchestrator

Modes:
  --batch --limit 10                  Pipeline targets (Turso DB)
  --target-id 42                      Single target by ID
  --target-ids "42,55,78"             Multiple targets by IDs
  --url URL --site-id ID --tier TIER  Direct URL (bypass pipeline)
  --discover --cities "A,B" --limit N Firecrawl search + build
  --nightly                           Nightly run (batch, limit 10)

Options:
  --concurrency N    Max parallel workers (default: 4)
  --timeout-multiplier N  Scale all timeouts (default: 1)
  --dry-run          Score + scrape only, no provisioning
  --skip-qa          Skip QA checks
  --skip-git         Skip git commit + push`);
  process.exit(0);
}

const limit = parseInt(args.limit, 10);
const concurrency = parseInt(args.concurrency, 10);
const dryRun = args['dry-run'];
const timeoutMultiplier = parseFloat(args['timeout-multiplier']) || 1;

// ──────────────────────────────────────────────────────────
// Step 1: Select targets
// ──────────────────────────────────────────────────────────

let targets = [];

if (args.nightly) {
  // Nightly = batch with config defaults
  logger.info('Nightly mode: batch with config defaults');
  targets = await selectPipelineTargets(CONFIG.nightly.limit);
} else if (args.batch) {
  targets = await selectPipelineTargets(limit);
} else if (args['target-id']) {
  const rows = await query('SELECT * FROM targets WHERE id = ?', [parseInt(args['target-id'], 10)]);
  if (rows.length === 0) {
    logger.error(`Target ${args['target-id']} not found`);
    process.exit(1);
  }
  targets = rows;
} else if (args['target-ids']) {
  const ids = args['target-ids'].split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean);
  if (ids.length === 0) {
    logger.error('No valid target IDs provided');
    process.exit(1);
  }
  const placeholders = ids.map(() => '?').join(',');
  targets = await query(`SELECT * FROM targets WHERE id IN (${placeholders})`, ids);
  if (targets.length === 0) {
    logger.error(`No targets found for IDs: ${ids.join(', ')}`);
    process.exit(1);
  }
  logger.info(`Selected ${targets.length} target(s) by ID: ${ids.join(', ')}`);
} else if (args.url && args['site-id']) {
  targets = [{
    id: null,
    company_name: args['site-id'],
    slug: args['site-id'],
    website: args.url,
    city: 'Unknown',
    territory: 'Unknown',
  }];
} else if (args.discover) {
  targets = await runDiscovery();
} else {
  logger.error('No mode specified. Use --batch, --target-id, --url, --discover, or --nightly');
  process.exit(1);
}

logger.info(`Selected ${targets.length} target(s)`);

if (targets.length === 0) {
  logger.summary({ total: 0, succeeded: 0, failed: 0, skipped: 0 });
  process.exit(0);
}

// ──────────────────────────────────────────────────────────
// Step 2: ICP score (filter by threshold)
// ──────────────────────────────────────────────────────────

if (!args.url) { // Skip scoring for direct URL mode
  logger.info('ICP scoring...');
  const unscored = targets.filter(t => t.icp_score == null);
  if (unscored.length > 0) {
    for (const t of unscored) {
      try {
        execFileSync('node', [
          resolve(TB_ROOT, 'icp-score.mjs'),
          '--target-id', String(t.id),
          ...(dryRun ? ['--dry-run'] : []),
        ], {
          cwd: DEMO_ROOT,
          env: process.env,
          timeout: 120000,
          maxBuffer: 10 * 1024 * 1024,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        // Refresh score
        const [updated] = await query('SELECT icp_score FROM targets WHERE id = ?', [t.id]);
        t.icp_score = updated?.icp_score;
      } catch (e) {
        logger.warn(`ICP scoring failed for ${t.company_name}: ${e.message?.slice(0, 100)}`);
      }
    }
  }

  // Filter by threshold — null scores (scoring failed) are excluded
  const threshold = CONFIG.icp_scoring.thresholds.manual_review;
  const before = targets.length;
  targets = targets.filter(t => t.icp_score != null && t.icp_score >= threshold);
  const filtered = before - targets.length;
  if (filtered > 0) {
    logger.info(`Filtered out ${filtered} target(s) below ICP threshold (${threshold}) or unscored`);
  }
}

// ──────────────────────────────────────────────────────────
// Step 3: Process targets (scrape + provision)
// ──────────────────────────────────────────────────────────

logger.info(`Processing ${targets.length} target(s) with concurrency ${concurrency}`);

const tasks = targets.map(target => async () => {
  const siteId = target.slug;
  const outputDir = resolve(TB_ROOT, `results/${TODAY}/${siteId}`);
  mkdirSync(outputDir, { recursive: true });

  // 3a. Scrape
  logger.progress({ stage: 'scrape', target_id: target.id, site_id: siteId, status: 'start', detail: target.website });
  try {
    execFileSync('node', [
      resolve(TB_ROOT, 'scrape/scrape-enhanced.mjs'),
      '--url', target.website,
      '--site-id', siteId,
      '--output', outputDir,
    ], {
      cwd: DEMO_ROOT,
      env: process.env,
      timeout: 300000,
      maxBuffer: 50 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    logger.progress({ stage: 'scrape', target_id: target.id, site_id: siteId, status: 'complete' });
  } catch (e) {
    const stderrTail = extractStderr(e);
    if (stderrTail) logger.warn(`[${siteId}] scrape stderr: ${stderrTail}`);
    logger.progress({ stage: 'scrape', target_id: target.id, site_id: siteId, status: 'error', detail: e.message?.slice(0, 100) });
    throw new Error(`Scrape failed: ${e.message?.slice(0, 200)}`);
  }

  const scrapedPath = resolve(outputDir, 'scraped.json');
  if (!existsSync(scrapedPath)) {
    throw new Error(`No scraped data produced for ${siteId}`);
  }

  // 3b. Provision (skip in dry run)
  if (!dryRun) {
    const domain = `${siteId}.norbotsystems.com`;
    const tier = args.tier || CONFIG.provisioning.default_tier;

    logger.progress({ stage: 'provision', target_id: target.id, site_id: siteId, status: 'start' });
    try {
      const provArgs = [
        resolve(TB_ROOT, 'provision/provision-tenant.mjs'),
        '--site-id', siteId,
        '--data', scrapedPath,
        '--domain', domain,
        '--tier', tier,
      ];
      if (target.id) provArgs.push('--target-id', String(target.id));

      execFileSync('node', provArgs, {
        cwd: DEMO_ROOT,
        env: process.env,
        timeout: 180000,
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      logger.progress({ stage: 'provision', target_id: target.id, site_id: siteId, status: 'complete' });
    } catch (e) {
      const stderrTail = extractStderr(e);
      if (stderrTail) logger.warn(`[${siteId}] provision stderr: ${stderrTail}`);
      logger.progress({ stage: 'provision', target_id: target.id, site_id: siteId, status: 'error', detail: e.message?.slice(0, 100) });
      throw new Error(`Provision failed: ${e.message?.slice(0, 200)}`);
    }
  }

  return { siteId, targetId: target.id };
});

const results = await pool(tasks, concurrency);

// ──────────────────────────────────────────────────────────
// Step 4: Merge proxy fragments + git + deploy
// ──────────────────────────────────────────────────────────

if (!dryRun) {
  // Merge proxy fragments
  logger.info('Merging proxy fragments...');
  try {
    execFileSync('node', [
      resolve(TB_ROOT, 'provision/merge-proxy.mjs'),
      '--date', TODAY,
    ], {
      cwd: DEMO_ROOT,
      env: process.env,
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e) {
    logger.warn(`Proxy merge failed: ${e.message?.slice(0, 100)}`);
  }

  // Git commit + push
  if (!args['skip-git']) {
    logger.info('Committing and pushing changes...');
    try {
      execFileSync('git', ['add', '-A'], { cwd: DEMO_ROOT, timeout: 10000, stdio: 'pipe' });
      execFileSync('git', ['commit', '-m', `feat: tenant-builder batch ${TODAY}`], {
        cwd: DEMO_ROOT, timeout: 10000, stdio: 'pipe',
      });
      execFileSync('git', ['push'], { cwd: DEMO_ROOT, timeout: 30000, stdio: 'pipe' });
      logger.info('Git push complete');
    } catch (e) {
      logger.warn(`Git operations failed: ${e.message?.slice(0, 100)}`);
    }
  }

  // Wait for Vercel deploy (poll first succeeded tenant)
  if (!args['skip-git']) {
    const firstSuccess = results.find(r => r.status === 'fulfilled');
    if (firstSuccess) {
      const testUrl = `https://${firstSuccess.value.siteId}.norbotsystems.com`;
      logger.info(`Waiting for Vercel deploy (polling ${testUrl})...`);
      const deadline = Date.now() + 300000; // 5 min
      let deployed = false;
      while (Date.now() < deadline) {
        try {
          const resp = await fetch(testUrl, { signal: AbortSignal.timeout(5000) });
          if (resp.ok) { deployed = true; break; }
        } catch { /* not ready yet */ }
        await new Promise(r => setTimeout(r, 15000));
      }
      if (deployed) {
        logger.info('Vercel deploy confirmed');
      } else {
        logger.warn('Vercel deploy timeout — QA may fail on unreachable URLs');
      }
    }
  }
}

// ──────────────────────────────────────────────────────────
// Step 4b: Verify tenant URLs are reachable
// ──────────────────────────────────────────────────────────

if (!dryRun && !args['skip-qa'] && !args['skip-git']) {
  const tenantUrls = results
    .filter(r => r.status === 'fulfilled')
    .map(r => `https://${r.value.siteId}.norbotsystems.com`);

  if (tenantUrls.length > 0) {
    logger.info(`Verifying ${tenantUrls.length} tenant URL(s)...`);
    const { verified, failed } = await verifyTenantUrls(tenantUrls);
    logger.info(`URL verification: ${verified.length} passed, ${failed.length} failed`);
  }
}

// ──────────────────────────────────────────────────────────
// Step 5: QA (content integrity -> auto-fix -> visual QA -> audit report)
// ──────────────────────────────────────────────────────────

const qaResults = [];

if (!dryRun && !args['skip-qa']) {
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const { siteId, targetId } = r.value;
    const siteUrl = `https://${siteId}.norbotsystems.com`;
    const outputDir = resolve(TB_ROOT, `results/${TODAY}/${siteId}`);
    const scrapedPath = resolve(outputDir, 'scraped.json');

    logger.progress({ stage: 'qa', target_id: targetId, site_id: siteId, status: 'start' });

    try {
      // 5a. Content integrity check (before visual QA)
      logger.info(`[${siteId}] Running content integrity check...`);
      try {
        const ciArgs = [
          resolve(TB_ROOT, 'qa/content-integrity.mjs'),
          '--url', siteUrl,
          '--site-id', siteId,
          '--output', outputDir,
        ];
        if (existsSync(scrapedPath)) ciArgs.push('--scraped-data', scrapedPath);

        execFileSync('node', ciArgs, {
          cwd: DEMO_ROOT, env: process.env, timeout: 120000,
          maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (e) {
        // content-integrity exits 1 on violations — read result file for auto-fix
        const ciResultPath = resolve(outputDir, 'content-integrity.json');
        if (existsSync(ciResultPath)) {
          logger.info(`[${siteId}] Content integrity found violations, attempting auto-fix...`);
          try {
            const ciResult = JSON.parse(readFileSync(ciResultPath, 'utf-8'));
            if (ciResult.violations?.length > 0) {
              const { autoFixViolations } = await import('./qa/content-integrity.mjs');
              const fixes = await autoFixViolations(siteId, ciResult.violations);
              if (fixes.length > 0) {
                writeFileSync(resolve(outputDir, 'auto-fixes.json'), JSON.stringify(fixes, null, 2));
                logger.info(`[${siteId}] Applied ${fixes.length} auto-fix(es)`);
              }
            }
          } catch (fixErr) {
            logger.warn(`[${siteId}] Auto-fix failed: ${fixErr.message?.slice(0, 100)}`);
          }
        }
      }

      // 5b. Screenshots
      try {
        execFileSync('node', [
          resolve(TB_ROOT, 'qa/screenshot.mjs'),
          '--url', siteUrl,
          '--site-id', siteId,
        ], {
          cwd: DEMO_ROOT, env: process.env, timeout: 60000,
          maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch { /* screenshots may fail if not deployed yet */ }

      // 5c. Visual QA with refinement
      const maxIter = CONFIG.qa.max_refinement_iterations || 3;
      const qaTimeoutMs = (maxIter * 250 + 120) * 1000 * timeoutMultiplier;
      const qaArgs = [
        resolve(TB_ROOT, 'qa/refinement-loop.mjs'),
        '--site-id', siteId,
        '--url', siteUrl,
        '--max-iterations', String(maxIter),
      ];
      if (targetId) qaArgs.push('--target-id', String(targetId));

      execFileSync('node', qaArgs, {
        cwd: DEMO_ROOT, env: process.env, timeout: qaTimeoutMs,
        maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
      });

      // 5d. Generate audit report
      let qaStatus = 'complete';
      try {
        const { generateAuditReport } = await import('./qa/audit-report.mjs');
        const report = generateAuditReport(siteId, outputDir);
        qaStatus = report.status; // 'complete' or 'review'
      } catch (e) {
        logger.warn(`[${siteId}] Audit report generation failed: ${e.message?.slice(0, 100)}`);
      }

      qaResults.push({ siteId, pass: qaStatus === 'complete', status: qaStatus });
      logger.progress({ stage: 'qa', target_id: targetId, site_id: siteId, status: 'complete', detail: qaStatus });
    } catch (e) {
      // Generate audit report even on failure
      try {
        const { generateAuditReport } = await import('./qa/audit-report.mjs');
        generateAuditReport(siteId, outputDir);
      } catch { /* best effort */ }

      qaResults.push({ siteId, pass: false, error: e.message?.slice(0, 100) });
      logger.progress({ stage: 'qa', target_id: targetId, site_id: siteId, status: 'error', detail: e.message?.slice(0, 100) });
    }
  }
}

// ──────────────────────────────────────────────────────────
// Step 6: Outreach (email drafts for passed QA targets)
// ──────────────────────────────────────────────────────────

if (!dryRun && !args['skip-outreach'] && qaResults.length > 0) {
  const passed = qaResults.filter(r => r.pass);
  if (passed.length > 0) {
    logger.info(`Creating outreach drafts for ${passed.length} target(s)`);
    try {
      // Get target IDs for passed QA results
      const passedIds = [];
      for (const r of passed) {
        const rows = await query('SELECT id FROM targets WHERE slug = ?', [r.siteId]);
        if (rows.length > 0) passedIds.push(rows[0].id);
      }
      if (passedIds.length > 0) {
        execFileSync('node', [
          resolve(DEMO_ROOT, 'scripts/outreach/outreach-pipeline.mjs'),
          '--target-ids', passedIds.join(','),
        ], { cwd: DEMO_ROOT, env: process.env, timeout: 300000, stdio: 'inherit' });
      }
    } catch (e) {
      logger.warn(`Outreach step failed: ${e.message?.slice(0, 200)}`);
    }
  }
}

// ──────────────────────────────────────────────────────────
// Step 7: Summary
// ──────────────────────────────────────────────────────────

const succeeded = results.filter(r => r.status === 'fulfilled').length;
const failed = results.filter(r => r.status === 'rejected').length;
const skipped = targets.length - results.length;

// Write batch summary
const summaryData = {
  date: TODAY,
  total: targets.length,
  succeeded,
  failed,
  skipped,
  dryRun,
  targets: targets.map(t => ({
    id: t.id,
    name: t.company_name,
    slug: t.slug,
    icp_score: t.icp_score,
  })),
  qa: qaResults,
};

const summaryDir = resolve(TB_ROOT, `results/${TODAY}`);
mkdirSync(summaryDir, { recursive: true });
writeFileSync(resolve(summaryDir, 'batch-summary.json'), JSON.stringify(summaryData, null, 2));

logger.summary({ total: targets.length, succeeded, failed, skipped });

// Exit code
if (failed > 0 && succeeded === 0) process.exit(1);
if (failed > 0) process.exit(2);
process.exit(0);

// ──────────────────────────────────────────────────────────
// Helper functions
// ──────────────────────────────────────────────────────────

/**
 * Extract last 20 lines of stderr from an execFileSync error.
 * @param {Error} e - error from execFileSync
 * @returns {string|null} - last 20 lines of stderr, or null if none
 */
function extractStderr(e) {
  const stderr = e.stderr?.toString?.() || '';
  if (!stderr.trim()) return null;
  const lines = stderr.trim().split('\n');
  return lines.slice(-20).join('\n');
}

/**
 * Verify tenant URLs are reachable (HTTP GET, 3 retries, 30s timeout each).
 * @param {string[]} urls - URLs to verify
 * @returns {Promise<{ verified: string[], failed: string[] }>}
 */
async function verifyTenantUrls(urls) {
  const verified = [];
  const failed = [];

  for (const url of urls) {
    let ok = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (resp.ok) { ok = true; break; }
      } catch { /* retry */ }
      if (attempt < 2) await new Promise(r => setTimeout(r, 5000));
    }
    if (ok) {
      verified.push(url);
    } else {
      failed.push(url);
      logger.warn(`URL verification failed: ${url}`);
    }
  }

  return { verified, failed };
}

async function selectPipelineTargets(lim) {
  logger.info(`Pipeline mode: selecting up to ${lim} targets`);
  const stdout = execFileSync('node', [
    resolve(TB_ROOT, 'discover.mjs'),
    '--pipeline',
    '--limit', String(lim),
  ], {
    cwd: DEMO_ROOT,
    env: process.env,
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // discover.mjs logs target IDs; re-fetch from DB for full data
  const idMatch = stdout.match(/Target IDs: ([\d, ]+)/);
  if (!idMatch) return [];

  const ids = idMatch[1].split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean);
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => '?').join(',');
  return query(`SELECT * FROM targets WHERE id IN (${placeholders})`, ids);
}

async function runDiscovery() {
  logger.info('Discovery mode');
  const discoverArgs = [
    resolve(TB_ROOT, 'discover.mjs'),
    '--discover',
    '--limit', String(limit),
  ];
  if (args.cities) discoverArgs.push('--cities', args.cities);
  if (dryRun) discoverArgs.push('--dry-run');

  const stdout = execFileSync('node', discoverArgs, {
    cwd: DEMO_ROOT,
    env: process.env,
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const idMatch = stdout.match(/Target IDs: ([\d, ]+)/);
  if (!idMatch) return [];

  const ids = idMatch[1].split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean);
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => '?').join(',');
  return query(`SELECT * FROM targets WHERE id IN (${placeholders})`, ids);
}
