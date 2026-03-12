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
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
import { loadEnv, requireEnv } from './lib/env-loader.mjs';
import { query, execute } from './lib/turso-client.mjs';
import { pool } from './lib/concurrency.mjs';
import * as logger from './lib/logger.mjs';
import { architectSite } from './architect.mjs';
import { bespokeArchitect } from './bespoke-architect.mjs';
import { buildCustomSections } from './build-custom-sections.mjs';
import { contentArchitect } from './content-architect.mjs';
import { designDirector } from './design-director.mjs';
import { buildManifest } from './lib/build-manifest.mjs';
import { recordHomepageScroll } from './scrape/screenshot-capture.mjs';
import { ensureQueueDirs, hasActivePolishQueue, writePendingQueueItem } from '../scripts/polish/queue-utils.mjs';
import { visualDiffWithCodex } from './qa/visual-diff-codex.mjs';

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
    'skip-polish': { type: 'boolean', default: false },
    'skip-architect': { type: 'boolean', default: false },
    'skip-custom-sections': { type: 'boolean', default: false },
    bespoke: { type: 'boolean', default: false },
    'audit-only': { type: 'boolean', default: false },
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
  --audit-only --site-id ID --url URL QA-only audit on existing tenant

Options:
  --concurrency N    Max parallel workers (default: 4)
  --timeout-multiplier N  Scale all timeouts (default: 1)
  --dry-run          Score + scrape only, no provisioning
  --skip-qa          Skip QA checks
  --skip-git         Skip git commit + push
  --skip-outreach    Skip outreach email drafts
  --skip-polish      Bypass the Codex polish queue and allow immediate outreach
  --skip-architect   Skip AI architect (use default section layouts)
  --skip-custom-sections  Skip custom section generation
  --bespoke          Bespoke rebuild: scrape HTML+CSS+screenshots, rebuild visual identity`);
  process.exit(0);
}

const limit = parseInt(args.limit, 10);
const concurrency = parseInt(args.concurrency, 10);
const dryRun = args['dry-run'];
const skipPolish = args['skip-polish'];
const bespokeMode = args.bespoke;
const timeoutMultiplier = parseFloat(args['timeout-multiplier']) || 1;
const auditOnly = args['audit-only'];

if (auditOnly) {
  if (!args['site-id'] || !args.url) {
    logger.error('--audit-only requires --site-id and --url');
    process.exit(1);
  }
}

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
  logger.error('No mode specified. Use --batch, --target-id, --url, --discover, --audit-only, or --nightly');
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

let results;

if (auditOnly) {
  // Audit-only: skip scrape/provision, create synthetic results
  results = targets.map(t => ({
    status: 'fulfilled',
    value: { siteId: t.slug, targetId: t.id },
  }));
  logger.info(`Audit-only mode: ${targets.length} tenant(s)`);
}

if (!auditOnly) {
logger.info(`Processing ${targets.length} target(s) with concurrency ${concurrency}`);

const tasks = targets.map(target => async () => {
  const siteId = target.slug;
  const outputDir = resolve(TB_ROOT, `results/${TODAY}/${siteId}`);
  mkdirSync(outputDir, { recursive: true });

  // 3a. Scrape (skip if scraped.json already exists — idempotent re-run support)
  const scrapedPathEarly = resolve(outputDir, 'scraped.json');
  if (existsSync(scrapedPathEarly)) {
    logger.info(`[${siteId}] scraped.json already exists — skipping scrape stage`);
    logger.progress({ stage: 'scrape', target_id: target.id, site_id: siteId, status: 'complete', detail: 'skipped (existing)' });
  } else {
    logger.progress({ stage: 'scrape', target_id: target.id, site_id: siteId, status: 'start', detail: target.website });
    try {
      const scrapeArgs = [
        resolve(TB_ROOT, 'scrape/scrape-enhanced.mjs'),
        '--url', target.website,
        '--site-id', siteId,
        '--output', outputDir,
      ];
      if (bespokeMode) scrapeArgs.push('--bespoke');
      execFileSync('node', scrapeArgs, {
        cwd: DEMO_ROOT,
        env: process.env,
        timeout: 300000,
        maxBuffer: 50 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      logger.progress({ stage: 'scrape', target_id: target.id, site_id: siteId, status: 'complete' });
    } catch (e) {
      const diagOutput = extractStderr(e);
      if (diagOutput) logger.warn(`[${siteId}] scrape output:\n${diagOutput}`);
      const detail = diagOutput?.split('\n').slice(-3).join(' | ')?.slice(0, 200) || e.message?.slice(0, 100);
      logger.progress({ stage: 'scrape', target_id: target.id, site_id: siteId, status: 'error', detail });
      throw new Error(`Scrape failed for ${siteId}: ${detail}`);
    }
  }

  const scrapedPath = resolve(outputDir, 'scraped.json');
  if (!existsSync(scrapedPath)) {
    throw new Error(`No scraped data produced for ${siteId}`);
  }

  // 3a.5. Content Architect — GPT 5.4 extracts deep content from scraped data
  let deepContent = null;
  if (CONFIG.content_architect?.enabled !== false) {
    logger.progress({ stage: 'content-architect', target_id: target.id, site_id: siteId, status: 'start' });
    try {
      const caTimeout = (CONFIG.content_architect?.timeout_seconds ?? 180) * 1000 * timeoutMultiplier;
      deepContent = await contentArchitect(outputDir, siteId, {
        timeoutMs: caTimeout,
        cwd: DEMO_ROOT,
      });
      if (deepContent) {
        logger.progress({ stage: 'content-architect', target_id: target.id, site_id: siteId, status: 'complete',
          detail: `${deepContent.services?.length ?? 0} services, ${deepContent.testimonials?.length ?? 0} testimonials` });
      } else {
        logger.progress({ stage: 'content-architect', target_id: target.id, site_id: siteId, status: 'complete',
          detail: 'no content extracted (using fallback)' });
      }
    } catch (err) {
      logger.warn(`[${siteId}] Content Architect failed (non-blocking): ${err.message?.slice(0, 100)}`);
      logger.progress({ stage: 'content-architect', target_id: target.id, site_id: siteId, status: 'error', detail: err.message?.slice(0, 100) });
    }
  }

  // 3b. Architect — Opus 4.6 analyses site and produces blueprint
  if (!args['skip-architect'] && CONFIG.architect?.enabled !== false) {
    logger.progress({ stage: 'architect', target_id: target.id, site_id: siteId, status: 'start',
      detail: bespokeMode ? 'bespoke' : 'template' });
    try {
      const architectTimeout = (CONFIG.architect?.timeout_seconds ?? 300) * 1000 * timeoutMultiplier;
      let blueprint;
      if (bespokeMode) {
        blueprint = await bespokeArchitect(outputDir, siteId, { timeoutMs: architectTimeout });
        writeFileSync(resolve(outputDir, 'bespoke-blueprint.json'), JSON.stringify(blueprint, null, 2));
      } else {
        blueprint = await architectSite(outputDir, { timeoutMs: architectTimeout });
      }
      writeFileSync(resolve(outputDir, 'site-blueprint-v2.json'), JSON.stringify(blueprint, null, 2));
      logger.progress({ stage: 'architect', target_id: target.id, site_id: siteId, status: 'complete',
        detail: `${blueprint.pages.length} pages, ${blueprint.customSections?.length ?? 0} custom` });
    } catch (err) {
      logger.warn(`[${siteId}] Architect failed (non-blocking): ${err.message?.slice(0, 100)}`);
      logger.progress({ stage: 'architect', target_id: target.id, site_id: siteId, status: 'error', detail: err.message?.slice(0, 100) });
    }
  }

  // 3b.5. Design Director — vision analysis → Design Language → Build Manifest (bespoke only)
  let ddManifest = null;
  if (bespokeMode && CONFIG.design_director?.enabled !== false) {
    logger.progress({ stage: 'design-director', target_id: target.id, site_id: siteId, status: 'start' });
    try {
      // Record homepage scroll (if enabled and not already captured)
      if (CONFIG.design_director?.scroll_recording !== false) {
        try {
          await recordHomepageScroll(target.website, outputDir, { timeout: 20000 });
        } catch (e) {
          logger.warn(`[${siteId}] Scroll recording failed (non-blocking): ${e.message?.slice(0, 80)}`);
        }
      }

      // Run Design Director: Gemini + Opus → Design Language
      const ddTimeout = 60000 * timeoutMultiplier;
      const skipCrossCheck = CONFIG.design_director?.opus_cross_check === false;
      await designDirector(outputDir, siteId, { timeoutMs: ddTimeout, skipCrossCheck });

      // Build manifest from HTML + Design Language
      ddManifest = buildManifest(outputDir, siteId, {
        maxSections: CONFIG.bespoke?.max_custom_sections ?? 15,
      });

      if (ddManifest.length > 0) {
        writeFileSync(resolve(outputDir, 'build-manifest.json'), JSON.stringify(ddManifest, null, 2));
        logger.progress({ stage: 'design-director', target_id: target.id, site_id: siteId, status: 'complete',
          detail: `${ddManifest.length} manifest entries` });
      } else {
        logger.warn(`[${siteId}] Design Director produced empty manifest — falling back to architect blueprint`);
        ddManifest = null;
        logger.progress({ stage: 'design-director', target_id: target.id, site_id: siteId, status: 'complete',
          detail: 'empty manifest, using architect fallback' });
      }
    } catch (err) {
      logger.warn(`[${siteId}] Design Director failed (non-blocking): ${err.message?.slice(0, 100)}`);
      logger.progress({ stage: 'design-director', target_id: target.id, site_id: siteId, status: 'error', detail: err.message?.slice(0, 100) });
    }
  }

  // 3c. Build custom sections (if blueprint has customSections)
  if (!args['skip-custom-sections'] && CONFIG.custom_sections?.enabled !== false) {
    const blueprintPath = resolve(outputDir, 'site-blueprint-v2.json');

    // Fix 5: If --skip-architect was set but Design Director produced a manifest,
    // synthesize a minimal blueprint so custom sections can still be built
    if (!existsSync(blueprintPath) && ddManifest && bespokeMode) {
      logger.info(`[${siteId}] No blueprint (--skip-architect) but DD manifest exists — synthesizing minimal blueprint`);
      const syntheticBlueprint = {
        customSections: ddManifest.map(entry => ({
          name: entry.sectionType || 'section',
          spec: entry.htmlSnippet ? `Rebuild this section: ${entry.sectionType}` : entry.sectionType,
          layout: entry.layout || {},
          background: entry.background || {},
          typography: entry.typography || {},
          spacing: entry.spacing || {},
          animations: entry.animations || {},
          contentMapping: entry.configFields || {},
        })),
        pages: [],
        theme: {},
      };
      writeFileSync(blueprintPath, JSON.stringify(syntheticBlueprint, null, 2));
      logger.info(`[${siteId}] Wrote synthetic blueprint with ${syntheticBlueprint.customSections.length} sections from DD manifest`);
    }

    if (existsSync(blueprintPath)) {
      try {
        const blueprint = JSON.parse(readFileSync(blueprintPath, 'utf-8'));
        if (blueprint.customSections?.length > 0) {
          logger.progress({ stage: 'custom-sections', target_id: target.id, site_id: siteId, status: 'start',
            detail: `${blueprint.customSections.length} section(s)${bespokeMode ? ' (bespoke)' : ''}${ddManifest ? ' + design-director' : ''}` });
          const csTimeout = (CONFIG.custom_sections?.codex_timeout_seconds ?? 180) * 1000 * timeoutMultiplier;
          const maxSections = bespokeMode
            ? (CONFIG.bespoke?.max_custom_sections ?? 15)
            : (CONFIG.custom_sections?.max_per_tenant ?? 5);
          const { built, failed: csFailed } = await buildCustomSections(siteId, blueprint, {
            cwd: DEMO_ROOT, timeoutMs: csTimeout, bespokeMode,
            resultsDir: outputDir, maxSections,
            parallel: bespokeMode && blueprint.customSections.length >= 3,
            review: true,
            buildManifest: ddManifest,
            deepContent,
          });
          logger.progress({ stage: 'custom-sections', target_id: target.id, site_id: siteId, status: 'complete',
            detail: `${built} built, ${csFailed} failed` });
          if (csFailed > 0 && built === 0) {
            logger.warn(`[${siteId}] All custom sections failed — proceeding with standard sections`);
          }
        }
      } catch (err) {
        logger.warn(`[${siteId}] Custom section build failed (non-blocking): ${err.message?.slice(0, 100)}`);
      }
    }
  }

  // 3d. Provision (skip in dry run)
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
      if (bespokeMode) provArgs.push('--bespoke');

      execFileSync('node', provArgs, {
        cwd: DEMO_ROOT,
        env: process.env,
        timeout: 180000,
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      logger.progress({ stage: 'provision', target_id: target.id, site_id: siteId, status: 'complete' });
    } catch (e) {
      const diagOutput = extractStderr(e);
      if (diagOutput) logger.warn(`[${siteId}] provision output:\n${diagOutput}`);
      const detail = diagOutput?.split('\n').slice(-3).join(' | ')?.slice(0, 200) || e.message?.slice(0, 100);
      logger.progress({ stage: 'provision', target_id: target.id, site_id: siteId, status: 'error', detail });
      throw new Error(`Provision failed for ${siteId}: ${detail}`);
    }
  }

  return { siteId, targetId: target.id };
});

results = await pool(tasks, concurrency);
}

// ──────────────────────────────────────────────────────────
// Step 4: Merge proxy fragments + git + deploy
// ──────────────────────────────────────────────────────────

if (!dryRun && !auditOnly) {
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

  // Register domains with Vercel (SSL cert provisioning)
  const successfulSiteIds = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value.siteId);

  for (const sid of successfulSiteIds) {
    const domain = `${sid}.norbotsystems.com`;
    logger.info(`Registering domain with Vercel: ${domain}`);
    try {
      execFileSync('node', [
        resolve(DEMO_ROOT, 'scripts/onboarding/add-domain.mjs'),
        '--domain', domain,
        '--site-id', sid,
      ], {
        cwd: DEMO_ROOT,
        env: process.env,
        timeout: 120000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      logger.info(`Domain registered: ${domain}`);
    } catch (e) {
      logger.warn(`Domain registration failed for ${domain} (non-blocking): ${e.message?.slice(0, 100)}`);
    }
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

if (!dryRun && !auditOnly && !args['skip-qa'] && !args['skip-git']) {
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
const polishQueue = [];

if ((!dryRun || auditOnly) && !args['skip-qa']) {
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const { siteId, targetId } = r.value;
    const siteUrl = auditOnly ? args.url : `https://${siteId}.norbotsystems.com`;
    const outputDir = resolve(TB_ROOT, `results/${TODAY}/${siteId}`);
    const scrapedPath = resolve(outputDir, 'scraped.json');

    logger.progress({ stage: 'qa', target_id: targetId, site_id: siteId, status: 'start' });

    try {
      // 5a. Page completeness check (per-page data verification)
      try {
        logger.info(`[${siteId}] Running page completeness check...`);
        const { runPageCompleteness } = await import('./qa/page-completeness.mjs');
        await runPageCompleteness(siteUrl, siteId, { outputPath: outputDir });
      } catch (e) {
        logger.warn(`[${siteId}] Page completeness check failed: ${e.message?.slice(0, 100)}`);
      }

      // 5a.5 Data-gap resolution (fix issues found by page-completeness)
      try {
        logger.info(`[${siteId}] Running data-gap resolution...`);
        const { resolveDataGaps } = await import('./qa/data-gap-resolution.mjs');
        await resolveDataGaps(siteId, siteUrl, {
          resultsDir: outputDir,
          scrapedDataPath: existsSync(scrapedPath) ? scrapedPath : undefined,
        });
      } catch (e) {
        logger.warn(`[${siteId}] Data-gap resolution failed: ${e.message?.slice(0, 100)}`);
      }

      // 5b. Content integrity check (before visual QA)
      logger.info(`[${siteId}] Running content integrity check...`);
      try {
        const ciArgs = [
          resolve(TB_ROOT, 'qa/content-integrity.mjs'),
          '--url', siteUrl,
          '--site-id', siteId,
          '--output', outputDir,
        ];
        if (existsSync(scrapedPath)) {
          ciArgs.push('--scraped-data', scrapedPath);
          // Pass business name for foreign brand name detection (Check 13)
          try {
            const scrapedForBizName = JSON.parse(readFileSync(scrapedPath, 'utf-8'));
            if (scrapedForBizName.business_name) {
              ciArgs.push('--business-name', scrapedForBizName.business_name);
            }
          } catch { /* scraped.json read error — skip business-name flag */ }
        }

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

      // 5c. Live site audit (non-blocking)
      try {
        logger.info(`[${siteId}] Running live site audit...`);
        const { runLiveSiteAudit } = await import('./qa/live-site-audit.mjs');
        const auditTier = auditOnly ? (args.tier || 'accelerate') : (args.tier || CONFIG.provisioning.default_tier);
        await runLiveSiteAudit(siteUrl, siteId, { outputPath: outputDir, tier: auditTier });
      } catch (e) {
        logger.warn(`[${siteId}] Live site audit failed: ${e.message?.slice(0, 100)}`);
      }

      // 5d. Original vs demo comparison (non-blocking, only if scraped.json exists)
      if (existsSync(scrapedPath)) {
        try {
          logger.info(`[${siteId}] Running original vs demo comparison...`);
          const scrapedData = JSON.parse(readFileSync(scrapedPath, 'utf-8'));
          const { runOriginalVsDemo } = await import('./qa/original-vs-demo.mjs');
          await runOriginalVsDemo(siteUrl, scrapedData, { outputPath: outputDir });
        } catch (e) {
          logger.warn(`[${siteId}] Original vs demo comparison failed: ${e.message?.slice(0, 100)}`);
        }
      }

      // 5e. Screenshots
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

      // 5e.5. Capture original website screenshot for visual comparison
      const originalScreenshotPath = resolve(outputDir, 'screenshots/original-homepage.png');
      const targetWebsite = (() => {
        try {
          if (existsSync(scrapedPath)) {
            return JSON.parse(readFileSync(scrapedPath, 'utf-8'))?._meta?.source_url || null;
          }
        } catch { /* ignore */ }
        return null;
      })();
      if (targetWebsite && !auditOnly) {
        try {
          logger.info(`[${siteId}] Capturing original website screenshot...`);
          execFileSync('node', [
            resolve(TB_ROOT, 'qa/screenshot.mjs'),
            '--url', targetWebsite,
            '--site-id', `${siteId}-original`,
            '--output', resolve(outputDir, 'screenshots/original'),
            '--skip-upload',
          ], {
            cwd: DEMO_ROOT, env: process.env, timeout: 45000,
            maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
          });
          // Rename the desktop screenshot to our expected path
          const capturedPath = resolve(outputDir, 'screenshots/original/desktop.png');
          if (existsSync(capturedPath)) {
            copyFileSync(capturedPath, originalScreenshotPath);
            logger.info(`[${siteId}] Original website screenshot captured`);
          }
        } catch (e) {
          logger.info(`[${siteId}] Could not capture original website: ${e.message?.slice(0, 60)}`);
        }
      }

      // 5f. Visual QA with refinement
      const maxIter = CONFIG.qa.max_refinement_iterations || 3;
      const qaTimeoutMs = (maxIter * 250 + 120) * 1000 * timeoutMultiplier;
      const qaArgs = [
        resolve(TB_ROOT, 'qa/refinement-loop.mjs'),
        '--site-id', siteId,
        '--url', siteUrl,
        '--max-iterations', String(maxIter),
      ];
      if (targetId) qaArgs.push('--target-id', String(targetId));
      if (existsSync(originalScreenshotPath)) {
        qaArgs.push('--original-screenshot', originalScreenshotPath);
      }
      if (bespokeMode) qaArgs.push('--bespoke');

      execFileSync('node', qaArgs, {
        cwd: DEMO_ROOT, env: process.env, timeout: qaTimeoutMs,
        maxBuffer: 10 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
      });

      // 5f.5 Visual diff with Codex (bespoke only, non-blocking)
      if (bespokeMode && targetWebsite) {
        try {
          logger.info(`[${siteId}] Running Codex visual diff...`);
          const { differences, fixed } = await visualDiffWithCodex({
            originalUrl: targetWebsite,
            generatedUrl: siteUrl,
            siteId,
            resultsDir: outputDir,
            cwd: DEMO_ROOT,
            autoFix: true,
            timeoutMs: 300000 * timeoutMultiplier,
          });
          if (differences.length > 0) {
            logger.info(`[${siteId}] Visual diff: ${differences.length} difference(s), ${fixed} auto-fixed`);
          }
        } catch (e) {
          logger.warn(`[${siteId}] Codex visual diff failed (non-blocking): ${e.message?.slice(0, 100)}`);
        }
      }

      // 5g. PDF branding check (non-blocking)
      try {
        logger.info(`[${siteId}] Running PDF branding check...`);
        const { runPdfBrandingCheck } = await import('./qa/pdf-branding-check.mjs');
        await runPdfBrandingCheck(siteId, { outputPath: outputDir });
      } catch (e) {
        logger.warn(`[${siteId}] PDF branding check failed: ${e.message?.slice(0, 100)}`);
      }

      // 5h. Email branding check (non-blocking)
      try {
        logger.info(`[${siteId}] Running email branding check...`);
        const { runEmailBrandingCheck } = await import('./qa/email-branding-check.mjs');
        await runEmailBrandingCheck(siteId, { outputPath: outputDir });
      } catch (e) {
        logger.warn(`[${siteId}] Email branding check failed: ${e.message?.slice(0, 100)}`);
      }

      // 5i. Generate audit report
      let qaStatus = 'complete';
      try {
        const { generateAuditReport } = await import('./qa/audit-report.mjs');
        const report = generateAuditReport(siteId, outputDir);
        qaStatus = report.verdict === 'NOT READY' ? 'not_ready' : report.verdict === 'REVIEW' ? 'review' : 'complete';
      } catch (e) {
        logger.warn(`[${siteId}] Audit report generation failed: ${e.message?.slice(0, 100)}`);
      }

      qaResults.push({
        siteId,
        targetId,
        pass: qaStatus === 'complete',
        status: qaStatus,
        outputDir,
        siteUrl,
        scrapedPath,
      });
      logger.progress({ stage: 'qa', target_id: targetId, site_id: siteId, status: 'complete', detail: qaStatus });
    } catch (e) {
      // Generate audit report even on failure
      try {
        const { generateAuditReport } = await import('./qa/audit-report.mjs');
        generateAuditReport(siteId, outputDir);
      } catch { /* best effort */ }

      qaResults.push({
        siteId,
        targetId,
        pass: false,
        error: e.message?.slice(0, 100),
        outputDir,
        siteUrl,
        scrapedPath,
      });
      logger.progress({ stage: 'qa', target_id: targetId, site_id: siteId, status: 'error', detail: e.message?.slice(0, 100) });
    }
  }
}

// ──────────────────────────────────────────────────────────
// Step 5j: Queue tenants for Codex polish or manual review
// ──────────────────────────────────────────────────────────

if (!dryRun && !auditOnly) {
  ensureQueueDirs();
  const targetBySiteId = new Map(targets.map(t => [t.slug, t]));

  for (const result of qaResults.filter(qr => !qr.error)) {
    if (skipPolish) break;

    const target = targetBySiteId.get(result.siteId);
    const readinessPath = resolve(result.outputDir, 'go-live-readiness.json');
    const visualQaPath = resolve(result.outputDir, 'visual-qa.json');
    const readiness = readJsonIfExists(readinessPath);
    const visualQa = readJsonIfExists(visualQaPath);
    const verdict =
      readiness?.verdict ||
      (result.status === 'not_ready' ? 'NOT READY' : result.status === 'review' ? 'REVIEW' : 'READY');
    const queueType = verdict === 'NOT READY' ? 'manual_review' : 'codex_polish';
    const queueItem = {
      id: `tenant-polish:${TODAY}:${result.siteId}`,
      site_id: result.siteId,
      target_id: result.targetId ?? null,
      tier: args.tier || CONFIG.provisioning.default_tier,
      trigger: 'post_qa',
      queue_type: queueType,
      live_url: result.siteUrl,
      original_url: target?.website || null,
      results_dir: result.outputDir,
      verdict,
      qa_status: result.status,
      bespoke_score: visualQa?.average ?? null,
      created_at: new Date().toISOString(),
      outreach_hold: true,
      allowed_mutations: [
        'admin_settings.business_info',
        'admin_settings.branding',
        'admin_settings.company_profile',
      ],
      blocked_mutations: [
        'shared_code',
        'proxy',
        'tenant_builder_scripts',
        'turso_schema',
      ],
      artifacts: {
        go_live_readiness: readinessPath,
        audit_report: resolve(result.outputDir, 'audit-report.md'),
        visual_qa: visualQaPath,
        scraped_data: result.scrapedPath,
      },
      rerun_checks: [
        'page-completeness',
        'content-integrity',
        'live-site-audit',
      ],
    };

    writePendingQueueItem(queueItem);
    polishQueue.push(queueItem);
    logger.info(`[${result.siteId}] Queued for ${queueType === 'codex_polish' ? 'Codex polish' : 'manual review'}`);
  }

  if (skipPolish) {
    logger.info('Codex polish queue skipped (--skip-polish) — outreach may proceed immediately');
  }
}

// ──────────────────────────────────────────────────────────
// Step 5k: Update Turso status for deployed targets (auto-drop from pipeline)
// ──────────────────────────────────────────────────────────

if (!dryRun && !auditOnly) {
  for (const r of qaResults.filter(qr => !qr.error)) {
    try {
      const rows = await query('SELECT id FROM targets WHERE slug = ?', [r.siteId]);
      if (rows.length > 0) {
        await execute("UPDATE targets SET status = 'bespoke_ready' WHERE id = ?", [rows[0].id]);
        logger.debug(`[${r.siteId}] Status updated to bespoke_ready`);
      }
    } catch (e) {
      logger.warn(`[${r.siteId}] Could not update status: ${e.message}`);
    }
  }
}

// ──────────────────────────────────────────────────────────
// Step 6: Outreach (only tenants with no active polish queue)
// ──────────────────────────────────────────────────────────

if (!dryRun && !auditOnly && !args['skip-outreach'] && qaResults.length > 0) {
  const readyForOutreach = qaResults.filter(r => !r.error && !hasActivePolishQueue(r.siteId));
  const blockedByPolish = qaResults.filter(r => !r.error && hasActivePolishQueue(r.siteId));

  if (blockedByPolish.length > 0) {
    logger.info(`Holding outreach for ${blockedByPolish.length} tenant(s) pending polish/manual review: ${blockedByPolish.map(r => r.siteId).join(', ')}`);
  }

  if (readyForOutreach.length > 0) {
    logger.info(`Creating outreach drafts for ${readyForOutreach.length} deployed target(s) with no active polish hold`);
    try {
      const deployedIds = [];
      for (const r of readyForOutreach) {
        const rows = await query('SELECT id FROM targets WHERE slug = ?', [r.siteId]);
        if (rows.length > 0) deployedIds.push(rows[0].id);
      }
      if (deployedIds.length > 0) {
        execFileSync('node', [
          resolve(DEMO_ROOT, 'scripts/outreach/outreach-pipeline.mjs'),
          '--target-ids', deployedIds.join(','),
        ], { cwd: DEMO_ROOT, env: process.env, timeout: 300000, stdio: 'inherit' });
      }
    } catch (e) {
      logger.warn(`Outreach step failed: ${e.message?.slice(0, 200)}`);
    }
  } else if (blockedByPolish.length > 0) {
    logger.info('Outreach skipped — all deployed tenants are waiting on polish completion');
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
  skipPolish,
  targets: targets.map(t => ({
    id: t.id,
    name: t.company_name,
    slug: t.slug,
    icp_score: t.icp_score,
  })),
  qa: qaResults,
  polish: polishQueue.map(item => ({
    site_id: item.site_id,
    queue_type: item.queue_type,
    verdict: item.verdict,
    original_url: item.original_url,
  })),
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
 * Extract last 20 lines of stderr (or stdout as fallback) from an execFileSync error.
 * Falls back to stdout because subprocess loggers may write errors to stdout.
 * @param {Error} e - error from execFileSync
 * @returns {string|null} - last 20 lines of diagnostic output, or null if none
 */
function extractStderr(e) {
  const stderr = e.stderr?.toString?.() || '';
  if (stderr.trim()) {
    const lines = stderr.trim().split('\n');
    return lines.slice(-20).join('\n');
  }
  // Fallback: check stdout — subprocess loggers may write errors there
  const stdout = e.stdout?.toString?.() || '';
  if (stdout.trim()) {
    const lines = stdout.trim().split('\n');
    return lines.slice(-20).join('\n');
  }
  return null;
}

function readJsonIfExists(path) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
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
