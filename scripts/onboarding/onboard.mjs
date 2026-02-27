#!/usr/bin/env node
/**
 * Full tenant onboarding pipeline.
 * Usage: node onboard.mjs --url https://example-reno.ca --site-id example-reno --domain example.norbotsystems.com --tier accelerate
 *
 * Steps:
 *   1. Score fitness (optional, --skip-score to bypass)
 *   2. Scrape website data via FireCrawl + AI
 *   3. Upload + optimize images to Supabase Storage
 *   4. Provision tenant (DB rows + proxy.ts update)
 *   4.1. Git commit + push proxy.ts changes (triggers Vercel deploy)
 *   4.5. Domain setup (Vercel API + Namecheap CNAME)
 *   5. Verify deployment (optional — needs deployed site)
 */

import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { values: args } = parseArgs({
  options: {
    url: { type: 'string' },
    'site-id': { type: 'string' },
    domain: { type: 'string' },
    tier: { type: 'string', default: 'accelerate' },
    'skip-score': { type: 'boolean', default: false },
    'skip-push': { type: 'boolean', default: false },
    'skip-domain': { type: 'boolean', default: false },
    'batch-mode': { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help || !args.url || !args['site-id'] || !args.domain) {
  console.log('Usage: node onboard.mjs --url https://example-reno.ca --site-id example-reno --domain example.norbotsystems.com --tier accelerate');
  console.log('Options:');
  console.log('  --skip-score    Skip the fitness scoring step');
  console.log('  --skip-push     Skip git commit + push (for batch mode — push once at end)');
  console.log('  --skip-domain   Skip Vercel + Namecheap domain setup');
  console.log('  --batch-mode    Implies --skip-push and --skip-domain (for nightly pipeline)');
  process.exit(args.help ? 0 : 1);
}

// Batch mode disables git push and domain setup (handled by nightly-pipeline.mjs)
const batchMode = args['batch-mode'];
const skipPush = args['skip-push'] || batchMode;
const skipDomain = args['skip-domain'] || batchMode;

const siteId = args['site-id'];
const tmpDir = `/tmp/onboarding/${siteId}`;
mkdirSync(tmpDir, { recursive: true });

const scriptDir = resolve(process.cwd(), 'scripts/onboarding');
const startTime = Date.now();

function run(label, cmd) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${'═'.repeat(60)}\n`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });
    return true;
  } catch (e) {
    console.error(`\nFAILED: ${label}`);
    console.error(`Exit code: ${e.status}`);
    return false;
  }
}

// ─── Step 1: Score ──────────────────────────────────────────────────────────
if (!args['skip-score']) {
  if (!run('Step 1/5: Scoring fitness', `node ${scriptDir}/score.mjs --url "${args.url}"`)) {
    console.log('\nSite scored too low. Use --skip-score to override.');
    process.exit(1);
  }
}

// ─── Step 2: Scrape ─────────────────────────────────────────────────────────
const scrapedPath = `${tmpDir}/scraped.json`;
if (!existsSync(scrapedPath)) {
  if (!run('Step 2/5: Scraping website', `node ${scriptDir}/scrape.mjs --url "${args.url}" --output "${scrapedPath}"`)) {
    process.exit(1);
  }
} else {
  console.log(`\nStep 2/5: Scrape — using cached ${scrapedPath}`);
}

// ─── Step 3: Upload images ──────────────────────────────────────────────────
const provisionedPath = `${tmpDir}/provisioned.json`;
if (!existsSync(provisionedPath)) {
  if (!run('Step 3/5: Uploading + optimizing images', `node ${scriptDir}/upload-images.mjs --site-id "${siteId}" --data "${scrapedPath}" --output "${provisionedPath}"`)) {
    process.exit(1);
  }
} else {
  console.log(`\nStep 3/5: Upload — using cached ${provisionedPath}`);
}

// ─── Step 4: Provision ──────────────────────────────────────────────────────
if (!run('Step 4/5: Provisioning tenant', `node ${scriptDir}/provision.mjs --site-id "${siteId}" --data "${provisionedPath}" --domain "${args.domain}" --tier "${args.tier}"`)) {
  process.exit(1);
}

// ─── Step 4.1: Git commit + push ────────────────────────────────────────────
console.log(`\n${'═'.repeat(60)}`);
console.log(`  Step 4.1: Git commit + push`);
console.log(`${'═'.repeat(60)}\n`);

try {
  // Check if proxy.ts has changes
  const gitStatus = execSync('git status --porcelain src/proxy.ts', { encoding: 'utf-8', cwd: process.cwd() }).trim();

  if (gitStatus) {
    execSync('git add src/proxy.ts', { stdio: 'inherit', cwd: process.cwd() });
    execSync(`git commit -m "feat: onboard tenant ${siteId}"`, { stdio: 'inherit', cwd: process.cwd() });

    if (skipPush) {
      console.log('  ✓ Committed (push deferred — batch mode)');
    } else {
      execSync('git push origin main', { stdio: 'inherit', cwd: process.cwd() });
      console.log('  ✓ Pushed to GitHub → Vercel auto-deploys');
    }
  } else {
    console.log('  No proxy.ts changes to commit (domain already existed)');
  }
} catch (e) {
  const msg = e.stderr?.toString() || e.message || '';
  if (msg.includes('nothing to commit')) {
    console.log('  No proxy.ts changes to commit (domain already existed)');
  } else {
    console.error(`  ⚠ Git operation failed: ${msg}`);
    if (!skipPush) {
      console.log('  → Manual push required: git push origin main');
    }
  }
}

// ─── Step 4.5: Domain setup ─────────────────────────────────────────────────
if (!skipDomain) {
  if (!run('Step 4.5: Domain setup (Vercel + Namecheap)',
    `node ${scriptDir}/add-domain.mjs --domain "${args.domain}" --site-id "${siteId}"`)) {
    console.log('⚠ Domain setup had issues. Site may need manual DNS configuration.');
    // Do NOT exit — domain issues are non-blocking
  }
} else {
  console.log(`\nStep 4.5: Domain setup — skipped (batch mode)`);
}

// ─── Step 5: Verify ─────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(60)}`);
console.log('  Step 5/5: Verification');
console.log(`${'═'.repeat(60)}`);

if (skipPush || skipDomain) {
  console.log('\nVerification deferred (batch mode — run after push + domain setup).');
  console.log(`  node ${scriptDir}/verify.mjs --url https://${args.domain} --site-id ${siteId}`);
} else {
  console.log('\nVerification requires the site to be deployed.');
  console.log(`After deploying, run:`);
  console.log(`  node ${scriptDir}/verify.mjs --url https://${args.domain} --site-id ${siteId}`);
}

// ─── Summary ────────────────────────────────────────────────────────────────
const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
console.log(`\n${'═'.repeat(60)}`);
console.log(`  ✓ Onboarding complete for ${siteId} (${elapsed}s)`);
console.log(`${'═'.repeat(60)}`);
console.log(`  Domain: https://${args.domain}`);
console.log(`  Tier: ${args.tier}`);
console.log(`  Temp dir: ${tmpDir}`);

// Write a summary file for nightly pipeline to consume
const summary = {
  siteId,
  domain: args.domain,
  tier: args.tier,
  url: args.url,
  completedAt: new Date().toISOString(),
  elapsedSeconds: parseInt(elapsed),
  scrapedPath,
  provisionedPath,
};
const summaryPath = `${tmpDir}/onboard-summary.json`;
writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(`  Summary: ${summaryPath}`);
