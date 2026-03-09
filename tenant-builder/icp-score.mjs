#!/usr/bin/env node
/**
 * ICP (Ideal Customer Profile) scoring for demo tenant fitness.
 * 8-criterion model, 130 points total. Writes icp_score + icp_breakdown to Turso.
 *
 * Usage:
 *   node icp-score.mjs --target-id 42
 *   node icp-score.mjs --all --limit 20
 *   node icp-score.mjs --all --limit 20 --dry-run
 *   node icp-score.mjs --all --limit 110 --force   # Re-score already-scored targets
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
    force: { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help || (!args['target-id'] && !args.all)) {
  console.log(`Usage:
  node icp-score.mjs --target-id 42
  node icp-score.mjs --all --limit 20
  node icp-score.mjs --all --limit 20 --dry-run
  node icp-score.mjs --all --limit 110 --force   # Re-score already-scored targets`);
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

/** Website quality: higher quality site = higher score (flipped from old sophistication gap) */
function scoreWebsiteQuality(level) {
  const map = { stunning: 20, custom: 16, professional: 12, template: 6, basic: 2 };
  return Math.min(map[level] || 10, WEIGHTS.website_quality);
}

/** Contact completeness: email + phone + owner_name availability */
function scoreContactCompleteness(email, phone, ownerName) {
  const has = [email, phone, ownerName].filter(v => v && v.trim()).length;
  if (has >= 3) return Math.min(15, WEIGHTS.contact_completeness);
  if (has === 2) return Math.min(10, WEIGHTS.contact_completeness);
  if (has === 1) return Math.min(5, WEIGHTS.contact_completeness);
  return 0;
}

/** Google reviews: high rating + decent count + review velocity */
function scoreGoogleReviews(rating, count, velocity) {
  let score = 0;
  if (rating >= 4.5) score += 6;
  else if (rating >= 4.0) score += 4;
  else if (rating >= 3.5) score += 2;

  if (count >= 100) score += 10;
  else if (count >= 50) score += 7;
  else if (count >= 20) score += 4;
  else if (count >= 5) score += 2;

  if (velocity >= 5) score += 4;
  else if (velocity >= 2) score += 2;

  return Math.min(score, WEIGHTS.google_reviews);
}

/** Geography: ring-based scoring from Stratford outward */
const RING_1 = (CONFIG.icp_scoring.geographic_rings?.ring_1 || []).map(c => c.toLowerCase());
const RING_2 = (CONFIG.icp_scoring.geographic_rings?.ring_2 || []).map(c => c.toLowerCase());
const RING_3 = (CONFIG.icp_scoring.geographic_rings?.ring_3 || []).map(c => c.toLowerCase());

function scoreGeography(city) {
  if (!city) return 3;
  const norm = city.toLowerCase();
  if (RING_1.includes(norm)) return Math.min(15, WEIGHTS.geography);
  if (RING_2.includes(norm)) return Math.min(12, WEIGHTS.geography);
  if (RING_3.includes(norm)) return Math.min(9, WEIGHTS.geography);
  return 5;
}

/** Company establishment: larger/more established = higher score */
function scoreCompanyEstablishment(sizeEstimate) {
  const map = { large: 15, medium: 12, small: 8, solo: 3 };
  return Math.min(map[sizeEstimate] || 8, WEIGHTS.company_establishment);
}

/** Marketing sophistication: signals of active marketing investment */
function scoreMarketingSophistication(signals) {
  let score = 0;
  if (signals.google_ads) score += 8;
  if (signals.active_social) score += 6;
  if (signals.professional_photos) score += 3;
  if (signals.video_content) score += 3;
  return Math.min(score, WEIGHTS.marketing_sophistication);
}

/** Years in business: longer track record = higher score */
function scoreYearsInBusiness(years) {
  if (years >= 10) return Math.min(15, WEIGHTS.years_in_business);
  if (years >= 5) return Math.min(10, WEIGHTS.years_in_business);
  if (years >= 2) return Math.min(5, WEIGHTS.years_in_business);
  return 2;
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

  // Use Claude CLI for sophistication + team size + years + marketing assessment when we have markdown
  let sophisticationLevel = 'template';
  let teamSizeEstimate = 'small';
  let yearsInBusiness = null;
  let marketingSignals = { google_ads: false, active_social: false, professional_photos: false, video_content: false };

  if (markdown && markdown.length > 200) {
    try {
      const prompt = `Analyse this contractor website content and assess:
1. Website sophistication level (basic, template, professional, custom, stunning)
2. Estimated team size (solo, small, medium, large)
3. Estimated years in business (number, or null if unknown)
4. Marketing signals: {google_ads: bool, active_social: bool, professional_photos: bool, video_content: bool}

Website: ${target.website || 'unknown'}
Company: ${name}

Content (first 3000 chars):
${markdown.slice(0, 3000)}`;

      const result = await callClaude(prompt, {
        schemaPath: resolve(import.meta.dirname, 'schemas/icp-score.json'),
        timeoutMs: 60000,
      });
      sophisticationLevel = result.sophistication_level || sophisticationLevel;
      teamSizeEstimate = result.team_size_estimate || teamSizeEstimate;
      yearsInBusiness = result.years_in_business ?? null;
      marketingSignals = result.marketing_signals ?? marketingSignals;
      logger.debug(`AI assessment for ${name}: sophistication=${sophisticationLevel}, size=${teamSizeEstimate}, years=${yearsInBusiness}`);
    } catch (e) {
      logger.warn(`Claude assessment failed for ${name}: ${e.message} — using defaults`);
    }
  }

  // Calculate scores
  const breakdown = {
    template_fit: scoreTemplateFit(markdown),
    website_quality: scoreWebsiteQuality(sophisticationLevel),
    contact_completeness: scoreContactCompleteness(target.email, target.phone, target.owner_name),
    google_reviews: scoreGoogleReviews(target.google_rating, target.google_review_count, target.review_velocity),
    geography: scoreGeography(target.city),
    company_establishment: scoreCompanyEstablishment(teamSizeEstimate),
    marketing_sophistication: scoreMarketingSophistication(marketingSignals),
    years_in_business: scoreYearsInBusiness(yearsInBusiness),
    total: 0,
    notes: `sophistication=${sophisticationLevel}, size=${teamSizeEstimate}, years=${yearsInBusiness}`,
  };
  breakdown.total = breakdown.template_fit + breakdown.website_quality +
    breakdown.contact_completeness + breakdown.google_reviews +
    breakdown.geography + breakdown.company_establishment +
    breakdown.marketing_sophistication + breakdown.years_in_business;

  logger.info(`${name}: ICP score ${breakdown.total}/130 (fit=${breakdown.template_fit}, quality=${breakdown.website_quality}, contact=${breakdown.contact_completeness}, reviews=${breakdown.google_reviews}, geo=${breakdown.geography}, est=${breakdown.company_establishment}, mktg=${breakdown.marketing_sophistication}, yrs=${breakdown.years_in_business})`);

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
const force = args.force;
const limit = parseInt(args.limit, 10);

let targets;
if (args['target-id']) {
  targets = await query('SELECT * FROM targets WHERE id = ?', [parseInt(args['target-id'], 10)]);
  if (targets.length === 0) {
    logger.error(`Target ${args['target-id']} not found`);
    process.exit(1);
  }
} else {
  // Score targets that are qualified or draft_ready.
  // --force re-scores already-scored targets (useful after model updates).
  if (force) logger.info('--force: re-scoring already-scored targets (model update)');
  const sql = force
    ? `SELECT * FROM targets
       WHERE status IN ('qualified', 'draft_ready', 'reviewed', 'email_1_sent', 'sms_sent', 'phone_called', 'interested', 'demo_booked')
         AND website IS NOT NULL
       ORDER BY score DESC
       LIMIT ?`
    : `SELECT * FROM targets
       WHERE icp_score IS NULL
         AND status IN ('qualified', 'draft_ready', 'reviewed', 'email_1_sent', 'sms_sent', 'phone_called', 'interested', 'demo_booked')
         AND website IS NOT NULL
       ORDER BY score DESC
       LIMIT ?`;
  targets = await query(sql, [limit]);
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
