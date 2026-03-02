#!/usr/bin/env node
/**
 * Export Sample Data Fixtures
 * Fetches all transactional data for site_id=conversionos from Supabase,
 * replaces UUIDs with stable placeholders, converts timestamps to relative
 * offsets, downloads concept images, and writes tenant-builder/fixtures/sample-leads.json.
 *
 * Usage: node scripts/sample-data/export-fixtures.mjs
 * Requires: .env.local with Supabase credentials
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_ROOT = resolve(__dirname, '../..');
const FIXTURES_DIR = resolve(DEMO_ROOT, 'tenant-builder/fixtures');
const IMAGES_DIR = resolve(DEMO_ROOT, 'public/images/sample-data');
const SITE_ID = 'conversionos';

// ── Supabase Client ──────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  console.error('Run: source .env.local && node scripts/sample-data/export-fixtures.mjs');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── UUID Placeholder Mapping ─────────────────────────────────────────────────

// Human-readable placeholder names for each lead
const LEAD_NAMES = {
  'Margaret Wilson': 'MARGARET',
  'Derek Fournier': 'DEREK',
  'Steve & Karen Brodie': 'BRODIE',
};

const uuidMap = new Map(); // original UUID → placeholder
let unknownCounter = 0;

function getPlaceholder(uuid, prefix = 'UNKNOWN') {
  if (!uuid) return null;
  if (uuidMap.has(uuid)) return uuidMap.get(uuid);

  // For unknown UUIDs, generate a numbered placeholder
  unknownCounter++;
  const placeholder = `__${prefix}_${unknownCounter}__`;
  uuidMap.set(uuid, placeholder);
  return placeholder;
}

function replaceUuids(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    // Check if it's a UUID we've mapped
    if (uuidMap.has(obj)) return uuidMap.get(obj);
    // Check if string contains UUIDs (e.g., in URLs)
    let result = obj;
    for (const [uuid, placeholder] of uuidMap.entries()) {
      result = result.replaceAll(uuid, placeholder);
    }
    return result;
  }
  if (Array.isArray(obj)) return obj.map(item => replaceUuids(item));
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = replaceUuids(value);
    }
    return result;
  }
  return obj;
}

// ── Timestamp Conversion ─────────────────────────────────────────────────────

const NOW = new Date();

function toOffsetDays(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  const diffMs = date.getTime() - NOW.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function convertTimestamps(row) {
  const result = { ...row };
  if (result.created_at) {
    result._created_at_offset_days = toOffsetDays(result.created_at);
    delete result.created_at;
  }
  if (result.updated_at) {
    result._updated_at_offset_days = toOffsetDays(result.updated_at);
    delete result.updated_at;
  }
  return result;
}

// ── Image Download ───────────────────────────────────────────────────────────

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        return downloadFile(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ── Image URL Rewriting ──────────────────────────────────────────────────────

const imageMap = new Map(); // original URL → local path

function rewriteImageUrls(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (imageMap.has(obj)) return imageMap.get(obj);
    // Check if string is a Supabase storage URL
    for (const [url, localPath] of imageMap.entries()) {
      if (obj.includes(url)) {
        return obj.replaceAll(url, localPath);
      }
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(item => rewriteImageUrls(item));
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = rewriteImageUrls(value);
    }
    return result;
  }
  return obj;
}

// ── Main Export ──────────────────────────────────────────────────────────────

async function main() {
  console.log('Exporting sample data fixtures from Supabase...\n');

  // Ensure output directories exist
  mkdirSync(FIXTURES_DIR, { recursive: true });
  mkdirSync(IMAGES_DIR, { recursive: true });

  // ── 1. Fetch leads ──────────────────────────────────────────────────────
  console.log('1. Fetching leads...');
  const { data: leads, error: leadsErr } = await supabase
    .from('leads')
    .select('*')
    .eq('site_id', SITE_ID);
  if (leadsErr) throw new Error(`Leads fetch failed: ${leadsErr.message}`);
  console.log(`   ${leads.length} leads`);

  // Register lead UUIDs with human-readable names
  for (const lead of leads) {
    const name = LEAD_NAMES[lead.name] || lead.name.toUpperCase().replace(/\s+/g, '_');
    uuidMap.set(lead.id, `__LEAD_${name}__`);
  }

  // ── 2. Fetch visualizations ──────────────────────────────────────────────
  console.log('2. Fetching visualizations...');
  const { data: visualizations, error: vizErr } = await supabase
    .from('visualizations')
    .select('*')
    .eq('site_id', SITE_ID);
  if (vizErr) throw new Error(`Visualizations fetch failed: ${vizErr.message}`);
  console.log(`   ${visualizations.length} visualizations`);

  // Register visualization UUIDs
  for (let i = 0; i < visualizations.length; i++) {
    const viz = visualizations[i];
    const leadName = uuidMap.get(viz.lead_id)?.replace(/__LEAD_|__/g, '') || 'UNKNOWN';
    uuidMap.set(viz.id, `__VIZ_${leadName}_${String(i + 1).padStart(2, '0')}__`);
  }

  // ── 3. Download and save images ──────────────────────────────────────────
  console.log('3. Downloading concept images...');
  const imagesToDownload = [];

  for (const viz of visualizations) {
    // Original photo
    if (viz.original_photo_url?.includes('supabase.co')) {
      const filename = `original-${viz.room_type}.png`;
      imagesToDownload.push({ url: viz.original_photo_url, filename });
      imageMap.set(viz.original_photo_url, `/images/sample-data/${filename}`);
    }

    // Generated concepts
    if (viz.generated_concepts && Array.isArray(viz.generated_concepts)) {
      for (let j = 0; j < viz.generated_concepts.length; j++) {
        const concept = viz.generated_concepts[j];
        if (concept.imageUrl?.includes('supabase.co')) {
          const filename = `concept-${viz.room_type}-${j + 1}.png`;
          imagesToDownload.push({ url: concept.imageUrl, filename });
          imageMap.set(concept.imageUrl, `/images/sample-data/${filename}`);
        }
      }
    }
  }

  // Download images in parallel (with concurrency limit of 3)
  let downloaded = 0;
  for (let i = 0; i < imagesToDownload.length; i += 3) {
    const batch = imagesToDownload.slice(i, i + 3);
    await Promise.allSettled(batch.map(async ({ url, filename }) => {
      const filepath = resolve(IMAGES_DIR, filename);
      if (existsSync(filepath)) {
        console.log(`   Skipping ${filename} (exists)`);
        downloaded++;
        return;
      }
      try {
        const data = await downloadFile(url);
        writeFileSync(filepath, data);
        console.log(`   Downloaded ${filename} (${(data.length / 1024).toFixed(0)}KB)`);
        downloaded++;
      } catch (e) {
        console.error(`   Failed to download ${filename}: ${e.message}`);
      }
    }));
  }
  console.log(`   ${downloaded}/${imagesToDownload.length} images downloaded`);

  // ── 4. Fetch join tables ────────────────────────────────────────────────
  console.log('4. Fetching join tables...');

  const { data: leadViz, error: lvErr } = await supabase
    .from('lead_visualizations')
    .select('*')
    .eq('site_id', SITE_ID);
  if (lvErr) throw new Error(`lead_visualizations fetch failed: ${lvErr.message}`);
  console.log(`   ${leadViz.length} lead_visualizations`);

  // Register join table UUIDs
  for (let i = 0; i < leadViz.length; i++) {
    uuidMap.set(leadViz[i].id, `__LEAD_VIZ_${i + 1}__`);
  }

  // ── 5. Fetch visualization metrics ──────────────────────────────────────
  const { data: vizMetrics, error: vmErr } = await supabase
    .from('visualization_metrics')
    .select('*')
    .eq('site_id', SITE_ID);
  if (vmErr) throw new Error(`visualization_metrics fetch failed: ${vmErr.message}`);
  console.log(`   ${vizMetrics.length} visualization_metrics`);

  for (let i = 0; i < vizMetrics.length; i++) {
    uuidMap.set(vizMetrics[i].id, `__VIZ_METRICS_${i + 1}__`);
  }

  // ── 6. Fetch audit log ─────────────────────────────────────────────────
  const { data: auditLog, error: alErr } = await supabase
    .from('audit_log')
    .select('*')
    .eq('site_id', SITE_ID);
  if (alErr) throw new Error(`audit_log fetch failed: ${alErr.message}`);
  console.log(`   ${auditLog.length} audit_log entries`);

  for (let i = 0; i < auditLog.length; i++) {
    uuidMap.set(auditLog[i].id, `__AUDIT_${i + 1}__`);
  }

  // ── 7. Fetch quotes + quote_items (if any) ─────────────────────────────
  let quotes = [];
  let quoteItems = [];
  try {
    const { data: q, error: qErr } = await supabase
      .from('quotes')
      .select('*')
      .eq('site_id', SITE_ID);
    if (!qErr && q) {
      quotes = q;
      for (let i = 0; i < quotes.length; i++) {
        uuidMap.set(quotes[i].id, `__QUOTE_${i + 1}__`);
      }
    }
    console.log(`   ${quotes.length} quotes`);

    if (quotes.length > 0) {
      const quoteIds = quotes.map(q => q.id);
      const { data: qi, error: qiErr } = await supabase
        .from('quote_items')
        .select('*')
        .in('quote_id', quoteIds);
      if (!qiErr && qi) {
        quoteItems = qi;
        for (let i = 0; i < quoteItems.length; i++) {
          uuidMap.set(quoteItems[i].id, `__QUOTE_ITEM_${i + 1}__`);
        }
      }
      console.log(`   ${quoteItems.length} quote_items`);
    }
  } catch {
    console.log('   No quotes table or empty');
  }

  // ── 8. Build fixture JSON ───────────────────────────────────────────────
  console.log('\n5. Building fixture JSON...');

  // Process each table: rewrite images, replace UUIDs, convert timestamps, replace site_id
  function processRows(rows) {
    return rows.map(row => {
      let processed = { ...row };
      // Rewrite image URLs to local paths
      processed = rewriteImageUrls(processed);
      // Replace UUIDs with placeholders
      processed = replaceUuids(processed);
      // Convert timestamps to relative offsets
      processed = convertTimestamps(processed);
      // Replace site_id
      if (processed.site_id === SITE_ID) {
        processed.site_id = '__SITE_ID__';
      }
      return processed;
    });
  }

  const fixture = {
    version: 1,
    description: '3 sample leads — Playwright-captured from ConversionOS base platform',
    created_at: new Date().toISOString().slice(0, 10),
    uuid_placeholders: [...uuidMap.values()].sort(),
    tables: {
      leads: processRows(leads),
      visualizations: processRows(visualizations),
      lead_visualizations: processRows(leadViz),
      visualization_metrics: processRows(vizMetrics),
      audit_log: processRows(auditLog),
      quotes: processRows(quotes),
      quote_items: processRows(quoteItems),
    },
    images: {
      description: 'Sample data images served from /images/sample-data/',
      files: imagesToDownload.map(i => i.filename),
    },
  };

  // ── 9. Write fixture file ──────────────────────────────────────────────
  const outputPath = resolve(FIXTURES_DIR, 'sample-leads.json');
  writeFileSync(outputPath, JSON.stringify(fixture, null, 2) + '\n');
  console.log(`\n✓ Fixture written to: ${outputPath}`);

  // Summary
  console.log('\nSummary:');
  console.log(`  Leads: ${leads.length}`);
  console.log(`  Visualizations: ${visualizations.length}`);
  console.log(`  Lead-Visualization joins: ${leadViz.length}`);
  console.log(`  Visualization metrics: ${vizMetrics.length}`);
  console.log(`  Audit log: ${auditLog.length}`);
  console.log(`  Quotes: ${quotes.length}`);
  console.log(`  Quote items: ${quoteItems.length}`);
  console.log(`  Images: ${imagesToDownload.length}`);
  console.log(`  UUID placeholders: ${uuidMap.size}`);
}

main().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
