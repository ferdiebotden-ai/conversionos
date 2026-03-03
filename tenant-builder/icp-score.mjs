#!/usr/bin/env node
/**
 * ICP (Ideal Customer Profile) scoring for demo tenant fitness.
 * 6-criterion model, 100 points total. Writes icp_score + icp_breakdown to Turso.
 *
 * Usage:
 *   node icp-score.mjs --target-id 42
 *   node icp-score.mjs --all --limit 20
 *   node icp-score.mjs --all --limit 20 --dry-run
 */

import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import YAML from 'yaml';
import { loadEnv, requireEnv } from './lib/env-loader.mjs';
import { query, execute } from './lib/turso-client.mjs';
import { scrape } from './lib/firecrawl-client.mjs';
import { callClaude } from './lib/claude-cli.mjs';
import * as logger from './lib/logger.mjs';

loadEnv();
requireEnv(['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']);

const CONFIG = YAML.parse(readFileSync(resolve(import.meta.dirname, 'config.yaml'), 'utf-8'));
const WEIGHTS = CONFIG.icp_scoring.weights;
const THRESHOLDS = CONFIG.icp_scoring.thresholds;
const ACTIVE_CITIES = CONFIG.discovery.active_cities;

const { values: args } = parseArgs({
  options: {
    'target-id': { type: 'string' },
    all: { type: 'boolean', default: false },
    limit: { type: 'string', default: '20' },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help || (!args['target-id'] && !args.all)) {
  console.log(`Usage:
  node icp-score.mjs --target-id 42
  node icp-score.mjs --all --limit 20
  node icp-score.mjs --all --limit 20 --dry-run`);
  process.exit(args.help ? 0 : 1);
}

// ──────────────────────────────────────────────────────────
// Scoring functions
// ──────────────────────────────────────────────────────────

/** Template fit: scan markdown for service/testimonial/portfolio/about keywords */
function scoreTemplateFit(markdown) {
  const md = (markdown || '').toLowerCase();
  let score = 0;
  const serviceKws = ['kitchen', 'bathroom', 'basement', 'renovation', 'remodel', 'flooring', 'addition', 'deck', 'painting', 'roofing'];
  const serviceHits = serviceKws.filter(k => md.includes(k)).length;
  if (serviceHits >= 3) score += 5;
  else if (serviceHits >= 1) score += 3;

  const testimonialKws = ['testimonial', 'review', 'what our clients', 'stars', 'google review'];
  if (testimonialKws.some(k => md.includes(k))) score += 5;

  const portfolioKws = ['portfolio', 'gallery', 'our work', 'projects', 'before and after'];
  if (portfolioKws.some(k => md.includes(k))) score += 5;

  const aboutKws = ['about us', 'our story', 'who we are', 'our team', 'founded'];
  if (aboutKws.some(k => md.includes(k))) score += 5;

  return Math.min(score, WEIGHTS.template_fit);
}

/** Sophistication gap: basic site = high score (inverted) */
function scoreSophisticationGap(level) {
  const map = { basic: 20, template: 18, professional: 12, custom: 6, stunning: 3 };
  return Math.min(map[level] || 10, WEIGHTS.sophistication_gap);
}

/** Contact completeness: email + phone + owner_name availability */
function scoreContactCompleteness(email, phone, ownerName) {
  const has = [email, phone, ownerName].filter(v => v && v.trim()).length;
  if (has >= 3) return Math.min(15, WEIGHTS.contact_completeness);
  if (has === 2) return Math.min(10, WEIGHTS.contact_completeness);
  if (has === 1) return Math.min(5, WEIGHTS.contact_completeness);
  return 0;
}

/** Google reviews: high rating + decent count */
function scoreGoogleReviews(rating, count) {
  let score = 0;
  if (rating >= 4.5) score += 8;
  else if (rating >= 4.0) score += 5;
  else if (rating >= 3.5) score += 2;

  if (count >= 50) score += 7;
  else if (count >= 20) score += 5;
  else if (count >= 5) score += 3;

  return Math.min(score, WEIGHTS.google_reviews);
}

/** Geography: prioritise small towns near Stratford over larger cities */
const SMALL_TOWN_CITIES = (CONFIG.icp_scoring.small_town_cities || []).map(c => c.toLowerCase());
const MID_SIZE_CITIES = (CONFIG.icp_scoring.mid_size_cities || []).map(c => c.toLowerCase());

function scoreGeography(city) {
  if (!city) return 3;
  const norm = city.toLowerCase();
  if (SMALL_TOWN_CITIES.includes(norm)) return Math.min(15, WEIGHTS.geography); // Ideal ICP
  if (MID_SIZE_CITIES.includes(norm)) return Math.min(12, WEIGHTS.geography);   // Good targets
  const idx = ACTIVE_CITIES.findIndex(c => c.toLowerCase() === norm);
  if (idx !== -1) return Math.min(9, WEIGHTS.geography);                        // Farther/larger
  return 3; // Unknown city
}

/** Company size (inverted): smaller = higher */
function scoreCompanySize(sizeEstimate) {
  const map = { solo: 15, small: 12, medium: 8, large: 4 };
  return Math.min(map[sizeEstimate] || 10, WEIGHTS.company_size);
}

// ──────────────────────────────────────────────────────────
// Main scoring logic for a single target
// ──────────────────────────────────────────────────────────

async function scoreTarget(target, options = {}) {
  const { dryRun = false } = options;
  const id = target.id;
  const name = target.company_name;

  logger.progress({ stage: 'score', target_id: id, site_id: target.slug, status: 'start', detail: name });

  let markdown = '';
  if (target.website) {
    try {
      const result = await scrape(target.website, { formats: ['markdown'], timeout: 30000 });
      markdown = result.markdown;
    } catch (e) {
      logger.warn(`Scrape failed for ${name}: ${e.message}`);
    }
  }

  // Use Claude CLI for sophistication + team size assessment when we have markdown
  let sophisticationLevel = 'template';
  let teamSizeEstimate = 'small';

  if (markdown && markdown.length > 200) {
    try {
      const prompt = `Analyse this contractor website content and assess:
1. Website sophistication level (basic, template, professional, custom, stunning)
2. Estimated team size (solo, small, medium, large)

Website: ${target.website || 'unknown'}
Company: ${name}

Content (first 3000 chars):
${markdown.slice(0, 3000)}`;

      const result = callClaude(prompt, {
        model: 'sonnet',
        schemaPath: resolve(import.meta.dirname, 'schemas/icp-score.json'),
        maxTurns: 3,
        timeoutMs: 60000,
      });
      sophisticationLevel = result.sophistication_level || sophisticationLevel;
      teamSizeEstimate = result.team_size_estimate || teamSizeEstimate;
      logger.debug(`AI assessment for ${name}: sophistication=${sophisticationLevel}, size=${teamSizeEstimate}`);
    } catch (e) {
      logger.warn(`Claude assessment failed for ${name}: ${e.message} — using defaults`);
    }
  }

  // Calculate scores
  const breakdown = {
    template_fit: scoreTemplateFit(markdown),
    sophistication_gap: scoreSophisticationGap(sophisticationLevel),
    contact_completeness: scoreContactCompleteness(target.email, target.phone, target.owner_name),
    google_reviews: scoreGoogleReviews(target.google_rating, target.google_review_count),
    geography: scoreGeography(target.city),
    company_size: scoreCompanySize(teamSizeEstimate),
    total: 0,
    notes: `sophistication=${sophisticationLevel}, size=${teamSizeEstimate}`,
  };
  breakdown.total = breakdown.template_fit + breakdown.sophistication_gap +
    breakdown.contact_completeness + breakdown.google_reviews +
    breakdown.geography + breakdown.company_size;

  logger.info(`${name}: ICP score ${breakdown.total}/100 (fit=${breakdown.template_fit}, gap=${breakdown.sophistication_gap}, contact=${breakdown.contact_completeness}, reviews=${breakdown.google_reviews}, geo=${breakdown.geography}, size=${breakdown.company_size})`);

  if (!dryRun) {
    await execute(
      'UPDATE targets SET icp_score = ?, icp_breakdown = ? WHERE id = ?',
      [breakdown.total, JSON.stringify(breakdown), id]
    );
  }

  logger.progress({
    stage: 'score',
    target_id: id,
    site_id: target.slug,
    status: 'complete',
    detail: `score=${breakdown.total}`,
  });

  return breakdown;
}

// ──────────────────────────────────────────────────────────
// CLI entry point
// ──────────────────────────────────────────────────────────

const dryRun = args['dry-run'];
const limit = parseInt(args.limit, 10);

let targets;
if (args['target-id']) {
  targets = await query('SELECT * FROM targets WHERE id = ?', [parseInt(args['target-id'], 10)]);
  if (targets.length === 0) {
    logger.error(`Target ${args['target-id']} not found`);
    process.exit(1);
  }
} else {
  // Score all unscored targets that are qualified or draft_ready
  targets = await query(
    `SELECT * FROM targets
     WHERE icp_score IS NULL
       AND status IN ('qualified', 'draft_ready', 'reviewed', 'email_1_sent', 'sms_sent', 'phone_called', 'interested', 'demo_booked')
       AND website IS NOT NULL
     ORDER BY score DESC
     LIMIT ?`,
    [limit]
  );
}

logger.info(`Scoring ${targets.length} target(s)${dryRun ? ' (dry run)' : ''}`);

let succeeded = 0;
let failed = 0;

for (const target of targets) {
  try {
    await scoreTarget(target, { dryRun });
    succeeded++;
  } catch (e) {
    logger.error(`Failed to score ${target.company_name}: ${e.message}`);
    logger.progress({ stage: 'score', target_id: target.id, site_id: target.slug, status: 'error', detail: e.message });
    failed++;
  }
}

logger.summary({ total: targets.length, succeeded, failed, skipped: 0 });
process.exit(failed > 0 && succeeded === 0 ? 1 : 0);
