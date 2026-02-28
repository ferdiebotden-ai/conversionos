#!/usr/bin/env node
/**
 * Clean all demo tenant data from the database.
 * Deletes in dependency order to respect foreign key constraints.
 *
 * Usage: node scripts/clean-demo-data.mjs
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');

// Load .env.local
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const SITE_ID = 'demo';

async function del(table) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?site_id=eq.${SITE_ID}`,
    {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=representation',
        'Content-Type': 'application/json',
      },
    }
  );
  const data = await res.json();
  const count = Array.isArray(data) ? data.length : 0;
  console.log(`  ${table}: ${count} rows deleted`);
  return count;
}

console.log(`Cleaning demo tenant data (site_id=${SITE_ID})...\n`);

// Delete in FK dependency order (children first)
const tables = [
  'payments',
  'invoices',
  'audit_log',
  'lead_visualizations',
  'visualization_metrics',
  'chat_sessions',
  'quote_drafts',
  'drawings',
  'visualizations',
  'leads',
];

let total = 0;
for (const t of tables) {
  total += await del(t);
}

console.log(`\nDone — ${total} total rows deleted from ${tables.length} tables.`);
