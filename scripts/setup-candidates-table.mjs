#!/usr/bin/env node
/**
 * Create the `candidates` table in Supabase for the nightly pipeline.
 * Run once: node scripts/setup-candidates-table.mjs
 *
 * This script creates the table via the Supabase SQL API (service role key).
 * It also seeds the table with the 46 existing pipeline targets if a CSV is provided.
 *
 * Usage:
 *   node scripts/setup-candidates-table.mjs                           # Create table only
 *   node scripts/setup-candidates-table.mjs --seed /path/to/targets.csv   # Create + seed
 */

import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  for (const envFile of ['.env.local', resolve(process.env.HOME, 'pipeline/scripts/.env')]) {
    try {
      const content = readFileSync(resolve(process.cwd(), envFile), 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          if (!process.env[key]) process.env[key] = match[2].trim().replace(/^["']|["']$/g, '');
        }
      }
    } catch { /* ignore */ }
  }
}

loadEnv();

const { values: args } = parseArgs({
  options: {
    seed: { type: 'string' },
    help: { type: 'boolean' },
  },
});

if (args.help) {
  console.log('Usage: node scripts/setup-candidates-table.mjs [--seed /path/to/targets.csv]');
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Create table via RPC ───────────────────────────────────────────────────
console.log('\nCreating candidates table...\n');

const createSQL = `
CREATE TABLE IF NOT EXISTS candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  owner_first_name TEXT,
  city TEXT,
  province TEXT DEFAULT 'ON',
  google_rating NUMERIC(2,1),
  google_review_count INTEGER,
  score INTEGER,
  tier TEXT DEFAULT 'accelerate',
  status TEXT DEFAULT 'pending',
  site_id TEXT,
  demo_url TEXT,
  email_subject TEXT,
  last_build_error TEXT,
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(website_url)
);

-- Index for pipeline queries
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_score ON candidates(score DESC);

-- Status tracking:
-- pending       → ready for nightly pipeline
-- building      → currently being processed
-- built         → demo site deployed successfully
-- build_failed  → onboard.mjs failed
-- email_ready   → email draft generated
-- email_sent    → Ferdie manually sent the email
-- engaged       → prospect replied or clicked
-- demo_booked   → demo call scheduled
-- closed_won    → signed as client
-- closed_lost   → declined / no response after cadence
-- no_response   → completed cadence, no response
-- excluded      → manually excluded from outreach

COMMENT ON TABLE candidates IS 'Nightly pipeline target contractors for ConversionOS outreach';
`;

// Try direct SQL execution via the REST API
try {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ query: createSQL }),
  });

  // If RPC doesn't work, try via Supabase management API
  if (!res.ok) {
    console.log('  Note: Direct SQL execution requires Supabase dashboard or pg client.');
    console.log('  Copy the SQL below and run it in the Supabase SQL Editor:\n');
    console.log('─'.repeat(60));
    console.log(createSQL);
    console.log('─'.repeat(60));
    console.log('\n  URL: https://supabase.com/dashboard/project/ktpfyangnmpwufghgasx/sql');
  } else {
    console.log('  ✓ Table created successfully');
  }
} catch {
  console.log('  Note: Run this SQL in the Supabase SQL Editor:\n');
  console.log('─'.repeat(60));
  console.log(createSQL);
  console.log('─'.repeat(60));
  console.log('\n  URL: https://supabase.com/dashboard/project/ktpfyangnmpwufghgasx/sql');
}

// ─── Verify table exists by trying to query it ─────────────────────────────
console.log('\nVerifying table...');
const { data, error } = await supabase.from('candidates').select('id').limit(1);

if (error) {
  if (error.message.includes('does not exist') || error.code === '42P01') {
    console.log('  ✗ Table does not exist yet — please run the SQL above in Supabase dashboard');
    // Write SQL to a file for convenience
    const sqlPath = resolve(process.cwd(), 'scripts/sql/create-candidates-table.sql');
    const sqlDir = resolve(process.cwd(), 'scripts/sql');
    const { mkdirSync: mkDir } = await import('node:fs');
    mkDir(sqlDir, { recursive: true });
    const { writeFileSync: writeF } = await import('node:fs');
    writeF(sqlPath, createSQL.trim() + '\n');
    console.log(`  SQL written to: ${sqlPath}`);
  } else {
    console.error(`  Error: ${error.message}`);
  }
} else {
  console.log(`  ✓ Table exists (${data.length} rows)`);
}

// ─── Seed from CSV if provided ──────────────────────────────────────────────
if (args.seed) {
  console.log(`\nSeeding from: ${args.seed}`);
  try {
    const csv = readFileSync(args.seed, 'utf-8');
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || null; });

      rows.push({
        business_name: row.business_name || row.name || row.company,
        website_url: row.website_url || row.url || row.website,
        email: row.email || null,
        phone: row.phone || null,
        owner_first_name: row.owner_first_name || row.owner || row.first_name || null,
        city: row.city || null,
        province: row.province || 'ON',
        google_rating: row.google_rating ? parseFloat(row.google_rating) : null,
        google_review_count: row.google_review_count ? parseInt(row.google_review_count) : null,
        score: row.score ? parseInt(row.score) : null,
        tier: row.tier || 'accelerate',
        source: 'csv_import',
      });
    }

    console.log(`  Parsed ${rows.length} candidates from CSV`);

    // Upsert (skip duplicates by website_url)
    const { error: insertError } = await supabase
      .from('candidates')
      .upsert(rows, { onConflict: 'website_url', ignoreDuplicates: true });

    if (insertError) {
      console.error(`  Insert error: ${insertError.message}`);
    } else {
      console.log(`  ✓ Seeded ${rows.length} candidates`);
    }
  } catch (e) {
    console.error(`  Seed error: ${e.message}`);
  }
}

console.log('\nDone.');
