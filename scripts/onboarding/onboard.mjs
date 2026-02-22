#!/usr/bin/env node
/**
 * Full tenant onboarding pipeline.
 * Usage: node onboard.mjs --url https://example-reno.ca --site-id example-reno --domain example.norbotsystems.com --tier accelerate
 */

import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const { values: args } = parseArgs({
  options: {
    url: { type: 'string' },
    'site-id': { type: 'string' },
    domain: { type: 'string' },
    tier: { type: 'string', default: 'accelerate' },
    'skip-score': { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});

if (args.help || !args.url || !args['site-id'] || !args.domain) {
  console.log('Usage: node onboard.mjs --url https://example-reno.ca --site-id example-reno --domain example.norbotsystems.com --tier accelerate');
  console.log('Options:');
  console.log('  --skip-score    Skip the fitness scoring step');
  process.exit(args.help ? 0 : 1);
}

const siteId = args['site-id'];
const tmpDir = `/tmp/onboarding/${siteId}`;
mkdirSync(tmpDir, { recursive: true });

const scriptDir = resolve(process.cwd(), 'scripts/onboarding');

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

// Step 1: Score
if (!args['skip-score']) {
  if (!run('Step 1/5: Scoring fitness', `node ${scriptDir}/score.mjs --url "${args.url}"`)) {
    console.log('\nSite scored too low. Use --skip-score to override.');
    process.exit(1);
  }
}

// Step 2: Scrape
const scrapedPath = `${tmpDir}/scraped.json`;
if (!existsSync(scrapedPath)) {
  if (!run('Step 2/5: Scraping website', `node ${scriptDir}/scrape.mjs --url "${args.url}" --output "${scrapedPath}"`)) {
    process.exit(1);
  }
} else {
  console.log(`\nStep 2/5: Scrape \u2014 using cached ${scrapedPath}`);
}

// Step 3: Upload images
const provisionedPath = `${tmpDir}/provisioned.json`;
if (!existsSync(provisionedPath)) {
  if (!run('Step 3/5: Uploading images', `node ${scriptDir}/upload-images.mjs --site-id "${siteId}" --data "${scrapedPath}" --output "${provisionedPath}"`)) {
    process.exit(1);
  }
} else {
  console.log(`\nStep 3/5: Upload \u2014 using cached ${provisionedPath}`);
}

// Step 4: Provision
if (!run('Step 4/5: Provisioning tenant', `node ${scriptDir}/provision.mjs --site-id "${siteId}" --data "${provisionedPath}" --domain "${args.domain}" --tier "${args.tier}"`)) {
  process.exit(1);
}

// Step 5: Verify (optional — needs deployed site)
console.log(`\n${'═'.repeat(60)}`);
console.log('  Step 5/5: Verification');
console.log(`${'═'.repeat(60)}`);
console.log('\nVerification requires the site to be deployed.');
console.log(`After deploying, run:`);
console.log(`  node ${scriptDir}/verify.mjs --url https://${args.domain} --site-id ${siteId}`);
console.log('\nOnboarding complete!');
console.log(`\nGeneration log: ${tmpDir}/${siteId}-generation-log.json`);
