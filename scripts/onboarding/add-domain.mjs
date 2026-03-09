#!/usr/bin/env node
/**
 * Add domain to Vercel project and issue SSL cert.
 * DNS is handled by wildcard CNAME (*.norbotsystems.com → cname.vercel-dns.com) on Cloudflare.
 * No per-tenant DNS step needed — just register the domain with Vercel + issue cert.
 *
 * Usage: node add-domain.mjs --domain contractor.norbotsystems.com --site-id contractor
 *
 * Environment variables required (in ~/pipeline/scripts/.env):
 *   VERCEL_TOKEN          — Vercel API token
 *   VERCEL_PROJECT_ID     — Vercel project ID for ConversionOS
 *   VERCEL_TEAM_ID        — Vercel team ID (required — project lives under a team)
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
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

/** Build query string with teamId if available */
function teamQuery(base) {
  return VERCEL_TEAM_ID ? `${base}${base.includes('?') ? '&' : '?'}teamId=${VERCEL_TEAM_ID}` : base;
}

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
    const url = teamQuery(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: domain }),
    });

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

// ─── Step 2: Issue SSL cert ─────────────────────────────────────────────────
async function issueCert() {
  if (!VERCEL_TOKEN) return false;

  console.log('\n  Step 2: Issuing SSL certificate...');
  try {
    const url = teamQuery('https://api.vercel.com/v7/certs');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domains: [domain] }),
    });

    if (res.ok || res.status === 409) {
      console.log('  ✓ SSL certificate issued (or already exists)');
      return true;
    }

    const err = await res.json().catch(() => ({}));
    // Cert may already exist or be auto-provisioned — not a hard failure
    console.log(`  ⚠ Cert API response (${res.status}): ${err.error?.message || JSON.stringify(err)}`);
    console.log('  → Vercel may auto-provision on first HTTPS request. Falling back to CLI if available.');

    // Fallback: try vercel CLI
    return await issueCertViaCli();
  } catch (e) {
    console.log(`  ⚠ Cert API call failed: ${e.message}`);
    return await issueCertViaCli();
  }
}

async function issueCertViaCli() {
  try {
    const { execFileSync } = await import('node:child_process');
    execFileSync('vercel', ['certs', 'issue', domain], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60_000,
    });
    console.log('  ✓ SSL certificate issued via Vercel CLI');
    return true;
  } catch (e) {
    console.log(`  ⚠ Vercel CLI cert issue failed: ${e.message?.slice(0, 200)}`);
    console.log('  → Site will work on HTTP. HTTPS cert will auto-provision on first request.');
    return false;
  }
}

// ─── Step 2.5: Update Edge Config ────────────────────────────────────────────
async function updateEdgeConfig() {
  const edgeConfigId = process.env.VERCEL_EDGE_CONFIG_ID;
  const token = VERCEL_TOKEN;

  if (!edgeConfigId || !token) {
    console.log('\n  Step 2.5: Skipping Edge Config (VERCEL_EDGE_CONFIG_ID not set)');
    return false;
  }

  console.log('\n  Step 2.5: Updating Edge Config...');
  try {
    const teamId = VERCEL_TEAM_ID;
    const url = `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items${teamId ? `?teamId=${teamId}` : ''}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          { operation: 'upsert', key: `domain:${domain}`, value: siteId },
        ],
      }),
    });

    if (res.ok) {
      console.log(`  ✓ Edge Config updated: domain:${domain} → ${siteId}`);
      return true;
    }

    const err = await res.text();
    console.log(`  ⚠ Edge Config update failed (${res.status}): ${err}`);
    return false;
  } catch (e) {
    console.log(`  ⚠ Edge Config error: ${e.message}`);
    return false;
  }
}

// ─── Step 3: Verify domain is serving ───────────────────────────────────────
async function verifyServing() {
  console.log('\n  Step 3: Verifying domain is serving...');

  // Wait a few seconds for cert propagation
  await new Promise(r => setTimeout(r, 5_000));

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`https://${domain}`, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        console.log(`  ✓ https://${domain} is live (${res.status})`);
        return true;
      }
      console.log(`    Attempt ${attempt}/3 — status ${res.status}`);
    } catch (e) {
      console.log(`    Attempt ${attempt}/3 — ${e.message?.slice(0, 100)}`);
    }
    if (attempt < 3) await new Promise(r => setTimeout(r, 10_000));
  }

  console.log('  ⚠ HTTPS not yet responding — cert may still be propagating (usually < 2 minutes)');
  return false;
}

// ─── Run ────────────────────────────────────────────────────────────────────
const vercelOk = await addVercelDomain();

if (vercelOk) {
  await issueCert();
  await updateEdgeConfig();
  await verifyServing();
}

console.log('\nDomain setup complete.');
console.log('DNS is handled by wildcard CNAME (*.norbotsystems.com) on Cloudflare.');
if (!vercelOk) {
  console.log('Vercel domain setup requires manual action — see warnings above.');
  process.exit(1);
}
