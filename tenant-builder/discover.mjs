#!/usr/bin/env node
/**
 * Discovery module for tenant builder.
 *
 * Two modes:
 * 1. Pipeline mode (--pipeline): Read qualified/draft_ready targets from Turso.
 *    Filters out targets already provisioned as demo tenants in Supabase.
 * 2. Discovery mode (--discover): Firecrawl search for new contractors, insert into Turso.
 *
 * Usage:
 *   node discover.mjs --pipeline --limit 10
 *   node discover.mjs --discover --cities "London,Kitchener" --limit 5
 *   node discover.mjs --discover --cities "London" --limit 3 --dry-run
 */

import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import YAML from 'yaml';
import { loadEnv, requireEnv } from './lib/env-loader.mjs';
import { query, execute } from './lib/turso-client.mjs';
import { getSupabase } from './lib/supabase-client.mjs';
import { search, scrape } from './lib/firecrawl-client.mjs';
import * as logger from './lib/logger.mjs';

loadEnv();
requireEnv(['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']);

const CONFIG = YAML.parse(readFileSync(resolve(import.meta.dirname, 'config.yaml'), 'utf-8'));

const { values: args } = parseArgs({
  options: {
    pipeline: { type: 'boolean', default: false },
    discover: { type: 'boolean', default: false },
    cities: { type: 'string', default: '' },
    limit: { type: 'string', default: '10' },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help || (!args.pipeline && !args.discover)) {
  console.log(`Usage:
  node discover.mjs --pipeline --limit 10
  node discover.mjs --discover --cities "London,Kitchener" --limit 5
  node discover.mjs --discover --cities "London" --limit 3 --dry-run`);
  process.exit(args.help ? 0 : 1);
}

const limit = parseInt(args.limit, 10);
const dryRun = args['dry-run'];

// ──────────────────────────────────────────────────────────
// Pipeline mode: read from Turso, filter out already-provisioned
// ──────────────────────────────────────────────────────────

async function pipelineMode() {
  logger.info(`Pipeline mode: fetching up to ${limit} targets from Turso`);

  const targets = await query(
    `SELECT * FROM targets
     WHERE status IN ('qualified', 'draft_ready', 'reviewed', 'email_1_sent', 'sms_sent', 'phone_called', 'interested', 'demo_booked')
       AND website IS NOT NULL
     ORDER BY score DESC
     LIMIT ?`,
    [limit]
  );

  logger.info(`Found ${targets.length} pipeline targets`);

  if (targets.length === 0) return [];

  // Filter out targets already provisioned as demo tenants
  let filtered = targets;
  try {
    const sb = getSupabase();
    const { data: tenants } = await sb
      .from('tenants')
      .select('site_id, domain');

    if (tenants && tenants.length > 0) {
      const existingSiteIds = new Set(tenants.map(t => t.site_id));
      const before = filtered.length;
      filtered = filtered.filter(t => !existingSiteIds.has(t.slug));
      const skipped = before - filtered.length;
      if (skipped > 0) {
        logger.info(`Filtered out ${skipped} already-provisioned tenant(s)`);
      }
    }
  } catch (e) {
    logger.warn(`Could not check Supabase tenants: ${e.message} — continuing with all targets`);
  }

  logger.info(`Returning ${filtered.length} target(s) for processing`);
  return filtered;
}

// ──────────────────────────────────────────────────────────
// Discovery mode: Firecrawl search + insert into Turso
// ──────────────────────────────────────────────────────────

/**
 * Normalize a URL for deduplication: strip protocol, www, trailing slash, path.
 * @param {string} url
 * @returns {string} normalized domain
 */
function normalizeDomain(url) {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  }
}

async function discoveryMode() {
  requireEnv(['FIRECRAWL_API_KEY']);

  const cities = args.cities
    ? args.cities.split(',').map(c => c.trim())
    : CONFIG.discovery.active_cities;

  logger.info(`Discovery mode: searching ${cities.length} cities (limit ${limit} per city)`);

  const allTargets = [];
  const seenDomains = new Set();

  for (const city of cities) {
    const searchQuery = CONFIG.discovery.search_template.replace('{city}', city);
    logger.progress({ stage: 'discover', status: 'start', detail: `Searching: ${searchQuery}` });

    try {
      const results = await search(searchQuery, { limit });

      for (const result of results) {
        // Deduplicate within batch by normalized domain
        const domain = normalizeDomain(result.url);
        if (seenDomains.has(domain)) {
          logger.debug(`Skipping duplicate domain: ${domain} (${result.title})`);
          continue;
        }
        seenDomains.add(domain);

        // Skip if already in DB
        const existing = await query(
          'SELECT id FROM targets WHERE website = ? OR company_name = ?',
          [result.url, result.title]
        );
        if (existing.length > 0) {
          logger.debug(`Skipping known target: ${result.title}`);
          continue;
        }

        // Generate slug from title
        const slug = (result.title || result.url)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .slice(0, 60);

        const target = {
          company_name: result.title || slug,
          slug,
          city,
          province: 'Ontario',
          territory: `${city}, ON`,
          website: result.url,
          status: 'discovered',
        };

        if (!dryRun) {
          try {
            const res = await execute(
              `INSERT INTO targets (company_name, slug, city, province, territory, website, status)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [target.company_name, target.slug, target.city, target.province, target.territory, target.website, target.status]
            );
            target.id = Number(res.lastInsertRowid);
            logger.info(`Inserted target: ${target.company_name} (id=${target.id})`);
          } catch (e) {
            // Likely unique constraint on slug
            logger.debug(`Insert skipped (likely duplicate slug): ${target.company_name} — ${e.message}`);
            continue;
          }
        } else {
          logger.info(`[DRY RUN] Would insert: ${target.company_name} (${target.website})`);
        }

        allTargets.push(target);
      }

      logger.progress({ stage: 'discover', status: 'complete', detail: `${city}: ${results.length} results` });
    } catch (e) {
      logger.error(`Search failed for ${city}: ${e.message}`);
      logger.progress({ stage: 'discover', status: 'error', detail: `${city}: ${e.message}` });
    }
  }

  logger.info(`Discovery complete: ${allTargets.length} new targets`);
  return allTargets;
}

// ──────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────

const targets = args.pipeline
  ? await pipelineMode()
  : await discoveryMode();

// Output target IDs for downstream consumption (stdout for piping)
if (targets.length > 0) {
  const ids = targets.map(t => t.id).filter(Boolean);
  if (ids.length > 0) {
    logger.info(`Target IDs: ${ids.join(', ')}`);
  }
}

logger.summary({ total: targets.length, succeeded: targets.length, failed: 0, skipped: 0 });
process.exit(0);
