#!/usr/bin/env node
/**
 * Add domain to Vercel project for SSL cert provisioning.
 * DNS is handled by wildcard CNAME (*.norbotsystems.com → cname.vercel-dns.com) on Cloudflare.
 * No per-tenant DNS step needed — just register the domain with Vercel for SSL.
 *
 * Usage: node add-domain.mjs --domain contractor.norbotsystems.com --site-id contractor
 *
 * Environment variables required (in ~/pipeline/scripts/.env):
 *   VERCEL_TOKEN          — Vercel API token
 *   VERCEL_PROJECT_ID     — Vercel project ID for ConversionOS
 */

import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── Load env ───────────────────────────────────────────────────────────────
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
    domain: { type: 'string' },
    'site-id': { type: 'string' },
    help: { type: 'boolean' },
  },
});

if (args.help || !args.domain || !args['site-id']) {
  console.log('Usage: node add-domain.mjs --domain contractor.norbotsystems.com --site-id contractor');
  console.log('');
  console.log('Adds the domain to Vercel for SSL cert provisioning.');
  console.log('DNS is handled by wildcard CNAME on Cloudflare — no per-tenant DNS step needed.');
  process.exit(args.help ? 0 : 1);
}

const domain = args.domain;
const siteId = args['site-id'];
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

console.log(`\nDomain Setup: ${domain} → ${siteId}`);
console.log('─'.repeat(50));

// ─── Step 1: Add domain to Vercel ───────────────────────────────────────────
async function addVercelDomain() {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    console.log('  ⚠ VERCEL_TOKEN or VERCEL_PROJECT_ID missing — skipping Vercel domain setup');
    console.log('  → Add domain manually: Vercel Dashboard → Project → Settings → Domains');
    return false;
  }

  console.log('\n  Step 1: Adding domain to Vercel...');
  try {
    const res = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: domain }),
      }
    );

    if (res.status === 409) {
      console.log('  ✓ Domain already exists in Vercel (idempotent)');
      return true;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.log(`  ✗ Vercel API error (${res.status}): ${err.error?.message || JSON.stringify(err)}`);
      return false;
    }

    const data = await res.json();
    console.log(`  ✓ Domain added to Vercel: ${data.name}`);
    return true;
  } catch (e) {
    console.log(`  ✗ Vercel API call failed: ${e.message}`);
    return false;
  }
}

// ─── Step 2: Poll Vercel for domain verification ────────────────────────────
async function pollVerification() {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return;

  console.log('\n  Step 2: Waiting for domain verification...');
  const maxAttempts = 20; // 20 × 30s = 10 minutes
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const res = await fetch(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`,
        { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
      );
      const data = await res.json();

      if (data.verified) {
        console.log(`  ✓ Domain verified after ${i * 30}s`);
        return true;
      }

      if (i < maxAttempts) {
        console.log(`    Attempt ${i}/${maxAttempts} — waiting for DNS propagation... (${data.verification?.[0]?.reason || 'pending'})`);
        await new Promise(r => setTimeout(r, 30_000));
      }
    } catch (e) {
      console.log(`    Poll error: ${e.message}`);
      if (i < maxAttempts) await new Promise(r => setTimeout(r, 30_000));
    }
  }

  console.log('  ⚠ Verification timed out after 10 minutes — DNS may still be propagating');
  console.log('    The site will work once DNS propagates (usually within 30 minutes)');
  return false;
}

// ─── Run ────────────────────────────────────────────────────────────────────
const vercelOk = await addVercelDomain();

if (vercelOk) {
  await pollVerification();
}

console.log('\nDomain setup complete.');
console.log('DNS is handled by wildcard CNAME (*.norbotsystems.com) on Cloudflare.');
if (!vercelOk) {
  console.log('Vercel domain setup requires manual action — see warnings above.');
  process.exit(1);
}
