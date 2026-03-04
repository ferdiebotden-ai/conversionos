#!/usr/bin/env node
/**
 * Re-score all qualified targets using EXISTING AI assessments + CURRENT scoring formulas.
 *
 * Why: The ICP model was updated (geography inverted, years_in_business → contact_completeness)
 * but existing targets were never re-scored. This script recalculates scores from data already
 * in Turso — no AI calls, no scraping, runs in seconds.
 *
 * What it keeps:   template_fit, sophistication_gap, company_size (need scrape/AI — unchanged)
 * What it recalcs: geography (inverted formula), contact_completeness (new criterion), google_reviews
 *
 * Usage:
 *   node rescore-from-existing.mjs              # Re-score all + show top 20
 *   node rescore-from-existing.mjs --dry-run    # Preview changes without writing
 *   node rescore-from-existing.mjs --top 30     # Show top N
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import YAML from 'yaml';
import { loadEnv, requireEnv } from './lib/env-loader.mjs';
import { query, execute } from './lib/turso-client.mjs';

loadEnv();
requireEnv(['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']);

const { values: args } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    top: { type: 'string', default: '20' },
    help: { type: 'boolean' },
  },
});

if (args.help) {
  console.log(`Usage:
  node rescore-from-existing.mjs              # Re-score all + show top 20
  node rescore-from-existing.mjs --dry-run    # Preview changes without writing
  node rescore-from-existing.mjs --top 30     # Show top N`);
  process.exit(0);
}

const CONFIG = YAML.parse(readFileSync(resolve(import.meta.dirname, 'config.yaml'), 'utf-8'));
const WEIGHTS = CONFIG.icp_scoring.weights;
const SMALL_TOWN = (CONFIG.icp_scoring.small_town_cities || []).map(c => c.toLowerCase());
const MID_SIZE = (CONFIG.icp_scoring.mid_size_cities || []).map(c => c.toLowerCase());
const ACTIVE = CONFIG.discovery.active_cities.map(c => c.toLowerCase());

// ── Scoring functions (identical to icp-score.mjs) ──────────────

function scoreGeography(city) {
  if (!city) return 3;
  const norm = city.toLowerCase();
  if (SMALL_TOWN.includes(norm)) return Math.min(15, WEIGHTS.geography);
  if (MID_SIZE.includes(norm)) return Math.min(12, WEIGHTS.geography);
  if (ACTIVE.includes(norm)) return Math.min(9, WEIGHTS.geography);
  return 3;
}

function scoreContactCompleteness(email, phone, ownerName) {
  const has = [email, phone, ownerName].filter(v => v && String(v).trim()).length;
  if (has >= 3) return Math.min(15, WEIGHTS.contact_completeness);
  if (has === 2) return Math.min(10, WEIGHTS.contact_completeness);
  if (has === 1) return Math.min(5, WEIGHTS.contact_completeness);
  return 0;
}

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

// ── Main ────────────────────────────────────────────────────────

const dryRun = args['dry-run'];
const topN = parseInt(args.top, 10);

const targets = await query(`
  SELECT id, company_name, city, email, phone, owner_name,
         google_rating, google_review_count, icp_score, icp_breakdown
  FROM targets
  WHERE status IN ('qualified', 'draft_ready', 'reviewed', 'email_1_sent', 'sms_sent', 'phone_called', 'interested', 'demo_booked')
    AND icp_score IS NOT NULL
    AND icp_breakdown IS NOT NULL
`);

console.log(`Targets to re-score: ${targets.length}${dryRun ? ' (DRY RUN)' : ''}`);

let updated = 0;
let skipped = 0;
const results = [];

for (const t of targets) {
  const old = JSON.parse(t.icp_breakdown || '{}');

  // Extract AI assessments from notes field (e.g. "sophistication=template, size=small")
  const notes = old.notes || '';
  const sophMatch = notes.match(/sophistication=(\w+)/);
  const sizeMatch = notes.match(/size=(\w+)/);

  if (!sophMatch || !sizeMatch) {
    console.log(`  SKIP (no AI data in notes): ${t.company_name}`);
    skipped++;
    continue;
  }

  // Keep AI-dependent scores unchanged, recalculate data-dependent ones
  const newBreakdown = {
    template_fit: old.template_fit ?? 0,
    sophistication_gap: old.sophistication_gap ?? 10,
    contact_completeness: scoreContactCompleteness(t.email, t.phone, t.owner_name),
    google_reviews: scoreGoogleReviews(t.google_rating, t.google_review_count),
    geography: scoreGeography(t.city),
    company_size: old.company_size ?? 10,
    total: 0,
    notes: old.notes,
  };
  newBreakdown.total =
    newBreakdown.template_fit +
    newBreakdown.sophistication_gap +
    newBreakdown.contact_completeness +
    newBreakdown.google_reviews +
    newBreakdown.geography +
    newBreakdown.company_size;

  const delta = newBreakdown.total - (old.total || t.icp_score);
  results.push({
    id: t.id,
    name: t.company_name,
    city: t.city,
    oldScore: old.total || t.icp_score,
    newScore: newBreakdown.total,
    delta,
    breakdown: newBreakdown,
  });

  if (!dryRun) {
    await execute(
      'UPDATE targets SET icp_score = ?, icp_breakdown = ? WHERE id = ?',
      [newBreakdown.total, JSON.stringify(newBreakdown), t.id]
    );
  }
  updated++;
}

console.log(`\nUpdated: ${updated}, Skipped: ${skipped}`);

// Sort and display
results.sort((a, b) => b.newScore - a.newScore);
console.log(`\n${'='.repeat(70)}`);
console.log(`TOP ${topN} TARGETS (re-scored with current ICP model)`);
console.log(`${'='.repeat(70)}`);

results.slice(0, topN).forEach((r, i) => {
  const sign = r.delta > 0 ? '+' : r.delta === 0 ? ' ' : '';
  const bd = r.breakdown;
  console.log(
    `${String(i + 1).padStart(2)}. [${r.newScore}] ${r.name} — ${r.city}` +
    ` (was ${r.oldScore}, ${sign}${r.delta})` +
    `\n      fit=${bd.template_fit} gap=${bd.sophistication_gap} contact=${bd.contact_completeness}` +
    ` reviews=${bd.google_reviews} geo=${bd.geography} size=${bd.company_size}`
  );
});

// Summary stats
const scored = results.map(r => r.newScore);
const movers = results.filter(r => Math.abs(r.delta) >= 5);
console.log(`\n--- Summary ---`);
console.log(`Score range: ${Math.min(...scored)}–${Math.max(...scored)} (avg ${(scored.reduce((a, b) => a + b, 0) / scored.length).toFixed(1)})`);
console.log(`Biggest movers (±5+): ${movers.length}`);
movers.sort((a, b) => b.delta - a.delta);
movers.slice(0, 5).forEach(r => {
  const sign = r.delta > 0 ? '+' : '';
  console.log(`  ${sign}${r.delta}: ${r.name} (${r.city}) → ${r.newScore}`);
});

process.exit(0);
