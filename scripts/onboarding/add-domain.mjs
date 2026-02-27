#!/usr/bin/env node
/**
 * Add domain to Vercel project + create Namecheap CNAME record.
 * Usage: node add-domain.mjs --domain contractor.norbotsystems.com --site-id contractor
 *
 * Environment variables required (in ~/pipeline/scripts/.env):
 *   VERCEL_TOKEN          — Vercel API token
 *   VERCEL_PROJECT_ID     — Vercel project ID for ConversionOS
 *   NAMECHEAP_API_KEY     — Namecheap API key
 *   NAMECHEAP_API_USER    — Namecheap username
 *   NAMECHEAP_CLIENT_IP   — Mac Mini public IP (whitelisted in Namecheap)
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
    'skip-dns': { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help || !args.domain || !args['site-id']) {
  console.log('Usage: node add-domain.mjs --domain contractor.norbotsystems.com --site-id contractor');
  console.log('Options:');
  console.log('  --skip-dns    Skip Namecheap DNS setup (domain added to Vercel only)');
  process.exit(args.help ? 0 : 1);
}

const domain = args.domain;
const siteId = args['site-id'];
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const NAMECHEAP_API_KEY = process.env.NAMECHEAP_API_KEY;
const NAMECHEAP_API_USER = process.env.NAMECHEAP_API_USER;
const NAMECHEAP_CLIENT_IP = process.env.NAMECHEAP_CLIENT_IP;

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

// ─── Step 2: Add CNAME to Namecheap ────────────────────────────────────────
async function addNamecheapCNAME() {
  if (!NAMECHEAP_API_KEY || !NAMECHEAP_API_USER || !NAMECHEAP_CLIENT_IP) {
    console.log('  ⚠ Namecheap API credentials missing — skipping DNS setup');
    console.log('  → Add CNAME manually: Namecheap → norbotsystems.com → Advanced DNS');
    console.log(`    Host: ${domain.replace('.norbotsystems.com', '')}`);
    console.log('    Type: CNAME');
    console.log('    Value: cname.vercel-dns.com');
    return false;
  }

  if (args['skip-dns']) {
    console.log('  ⚠ --skip-dns flag set — skipping Namecheap DNS');
    return true;
  }

  console.log('\n  Step 2: Configuring Namecheap DNS...');

  const SLD = 'norbotsystems';
  const TLD = 'com';
  const baseUrl = 'https://api.namecheap.com/xml.response';
  const baseParams = `ApiUser=${NAMECHEAP_API_USER}&ApiKey=${NAMECHEAP_API_KEY}&UserName=${NAMECHEAP_API_USER}&ClientIp=${NAMECHEAP_CLIENT_IP}`;

  // Step 2a: Get existing DNS records (CRITICAL — setHosts REPLACES all records)
  console.log('    Fetching existing DNS records...');
  try {
    const getRes = await fetch(
      `${baseUrl}?${baseParams}&Command=namecheap.domains.dns.getHosts&SLD=${SLD}&TLD=${TLD}`
    );
    const xml = await getRes.text();

    // Parse XML for existing host records
    const existingRecords = [];
    const hostRegex = /<host\s+([^>]+)\/>/gi;
    let match;
    while ((match = hostRegex.exec(xml)) !== null) {
      const attrs = match[1];
      const getAttr = (name) => {
        const m = attrs.match(new RegExp(`${name}="([^"]*)"`, 'i'));
        return m ? m[1] : '';
      };

      const hostName = getAttr('Name');
      const recordType = getAttr('Type');
      const address = getAttr('Address');
      const ttl = getAttr('TTL') || '1800';
      const mxPref = getAttr('MXPref') || '10';

      // Skip if this exact record already exists
      const subdomain = domain.replace('.norbotsystems.com', '');
      if (hostName.toLowerCase() === subdomain.toLowerCase() && recordType === 'CNAME') {
        console.log(`    ✓ CNAME for ${subdomain} already exists — skipping`);
        return true;
      }

      existingRecords.push({ hostName, recordType, address, ttl, mxPref });
    }

    console.log(`    Found ${existingRecords.length} existing DNS records`);

    // Step 2b: Add the new CNAME record
    const subdomain = domain.replace('.norbotsystems.com', '');
    existingRecords.push({
      hostName: subdomain,
      recordType: 'CNAME',
      address: 'cname.vercel-dns.com',
      ttl: '1800',
      mxPref: '10',
    });

    // Step 2c: Build setHosts params with ALL records (existing + new)
    let setParams = `${baseParams}&Command=namecheap.domains.dns.setHosts&SLD=${SLD}&TLD=${TLD}`;
    existingRecords.forEach((rec, i) => {
      const n = i + 1;
      setParams += `&HostName${n}=${encodeURIComponent(rec.hostName)}`;
      setParams += `&RecordType${n}=${encodeURIComponent(rec.recordType)}`;
      setParams += `&Address${n}=${encodeURIComponent(rec.address)}`;
      setParams += `&TTL${n}=${rec.ttl}`;
      if (rec.recordType === 'MX') {
        setParams += `&MXPref${n}=${rec.mxPref}`;
      }
    });

    console.log(`    Setting ${existingRecords.length} DNS records (${existingRecords.length - 1} existing + 1 new)...`);
    const setRes = await fetch(`${baseUrl}?${setParams}`);
    const setXml = await setRes.text();

    if (setXml.includes('IsSuccess="true"')) {
      console.log(`    ✓ CNAME added: ${subdomain}.norbotsystems.com → cname.vercel-dns.com`);
      return true;
    } else {
      const errMatch = setXml.match(/<Error[^>]*>([^<]+)<\/Error>/);
      const errMsg = errMatch ? errMatch[1] : 'Unknown error';
      console.log(`    ✗ Namecheap setHosts failed: ${errMsg}`);
      console.log('    → Add CNAME manually in Namecheap dashboard');
      return false;
    }
  } catch (e) {
    console.log(`    ✗ Namecheap API error: ${e.message}`);
    console.log('    → Add CNAME manually in Namecheap dashboard');
    return false;
  }
}

// ─── Step 3: Poll Vercel for domain verification ────────────────────────────
async function pollVerification() {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return;

  console.log('\n  Step 3: Waiting for domain verification...');
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
const dnsOk = await addNamecheapCNAME();

if (vercelOk && dnsOk) {
  await pollVerification();
}

console.log('\nDomain setup complete.');
if (!vercelOk || !dnsOk) {
  console.log('Some steps require manual action — see warnings above.');
  process.exit(1);
}
