#!/usr/bin/env node
/**
 * Nightly Pipeline Orchestrator for ConversionOS
 * ──────────────────────────────────────────────
 * Runs every night at 11 PM ET via launchd / Cowork scheduled task.
 *
 * Flow:
 *   1. DISCOVER — Query Supabase `candidates` table for unprocessed targets
 *   2. BUILD    — Run onboard.mjs in batch mode for each candidate (up to --max)
 *   3. PUSH     — Single git push for all proxy.ts changes
 *   4. DOMAINS  — Add all Vercel domains + Namecheap CNAMEs
 *   5. EMAIL    — Generate personalized outreach drafts in Gmail
 *   6. LOG      — Update candidate statuses in Supabase + write run report
 *
 * Usage:
 *   node scripts/nightly-pipeline.mjs                     # Process up to 10 candidates
 *   node scripts/nightly-pipeline.mjs --max 5             # Limit to 5
 *   node scripts/nightly-pipeline.mjs --dry-run           # Score + scrape only, no provision
 *   node scripts/nightly-pipeline.mjs --skip-email        # Build demos but skip email generation
 *
 * Environment:
 *   Requires all env vars from onboard.mjs plus:
 *   - GMAIL_ENABLED=true (set in ~/pipeline/scripts/.env to enable draft creation)
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
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

// ─── Args ───────────────────────────────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    max: { type: 'string', default: '10' },
    'dry-run': { type: 'boolean', default: false },
    'skip-email': { type: 'boolean', default: false },
    'skip-domain': { type: 'boolean', default: false },
    tier: { type: 'string', default: 'accelerate' },
    help: { type: 'boolean' },
  },
});

if (args.help) {
  console.log('Usage: node scripts/nightly-pipeline.mjs [--max 10] [--dry-run] [--skip-email] [--tier accelerate]');
  process.exit(0);
}

const MAX_CANDIDATES = parseInt(args.max) || 10;
const DRY_RUN = args['dry-run'];
const SKIP_EMAIL = args['skip-email'];
const SKIP_DOMAIN = args['skip-domain'];
const DEFAULT_TIER = args.tier;

// ─── Supabase client ────────────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const runId = `nightly-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`;
const logDir = `/tmp/nightly-pipeline/${runId}`;
mkdirSync(logDir, { recursive: true });

console.log(`\n${'═'.repeat(70)}`);
console.log(`  ConversionOS Nightly Pipeline — ${new Date().toISOString()}`);
console.log(`  Run ID: ${runId}`);
console.log(`  Max candidates: ${MAX_CANDIDATES}`);
console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
console.log(`${'═'.repeat(70)}\n`);

// ─── Step 1: DISCOVER — Fetch candidates from Supabase ─────────────────────
console.log('Step 1: DISCOVER — Fetching candidates...');

const { data: candidates, error: fetchError } = await supabase
  .from('candidates')
  .select('*')
  .eq('status', 'pending')
  .order('score', { ascending: false })
  .limit(MAX_CANDIDATES);

if (fetchError) {
  console.error(`  Failed to fetch candidates: ${fetchError.message}`);
  console.log('\n  If the candidates table does not exist, run:');
  console.log('  node scripts/setup-candidates-table.mjs');
  process.exit(1);
}

if (!candidates || candidates.length === 0) {
  console.log('  No pending candidates found. Pipeline complete.');
  process.exit(0);
}

console.log(`  Found ${candidates.length} candidates to process\n`);

// ─── Step 2: BUILD — Run onboard.mjs for each candidate ────────────────────
console.log('Step 2: BUILD — Processing candidates...\n');

const results = [];
const scriptDir = resolve(process.cwd(), 'scripts/onboarding');

for (let i = 0; i < candidates.length; i++) {
  const c = candidates[i];
  const siteId = c.site_id || c.business_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const domain = `${siteId}.norbotsystems.com`;
  const tier = c.tier || DEFAULT_TIER;

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  Candidate ${i + 1}/${candidates.length}: ${c.business_name || siteId}`);
  console.log(`  URL: ${c.website_url}`);
  console.log(`  Site ID: ${siteId} | Domain: ${domain} | Tier: ${tier}`);
  console.log(`${'─'.repeat(70)}`);

  // Update status to "building"
  await supabase
    .from('candidates')
    .update({ status: 'building', updated_at: new Date().toISOString() })
    .eq('id', c.id);

  const startTime = Date.now();
  const result = {
    candidateId: c.id,
    siteId,
    domain,
    businessName: c.business_name,
    email: c.email,
    ownerFirstName: c.owner_first_name || c.business_name?.split(' ')[0] || 'there',
    websiteUrl: c.website_url,
    tier,
    success: false,
    error: null,
    elapsedSeconds: 0,
    demoUrl: null,
  };

  if (DRY_RUN) {
    console.log('  [DRY RUN] Would run: onboard.mjs');
    result.success = true;
    result.demoUrl = `https://${domain}`;
  } else {
    try {
      execSync(
        `node ${scriptDir}/onboard.mjs ` +
        `--url "${c.website_url}" ` +
        `--site-id "${siteId}" ` +
        `--domain "${domain}" ` +
        `--tier "${tier}" ` +
        `--batch-mode`,
        {
          stdio: 'inherit',
          cwd: process.cwd(),
          timeout: 10 * 60 * 1000, // 10 min per candidate
        }
      );
      result.success = true;
      result.demoUrl = `https://${domain}`;
    } catch (e) {
      result.error = `Exit code: ${e.status}`;
      console.error(`  ✗ Build failed for ${siteId}: ${result.error}`);
    }
  }

  result.elapsedSeconds = Math.round((Date.now() - startTime) / 1000);

  // Update candidate status
  await supabase
    .from('candidates')
    .update({
      status: result.success ? 'built' : 'build_failed',
      site_id: siteId,
      demo_url: result.demoUrl,
      last_build_error: result.error,
      updated_at: new Date().toISOString(),
    })
    .eq('id', c.id);

  results.push(result);
}

const successCount = results.filter(r => r.success).length;
const failCount = results.filter(r => !r.success).length;

console.log(`\n${'═'.repeat(70)}`);
console.log(`  BUILD COMPLETE: ${successCount} succeeded, ${failCount} failed`);
console.log(`${'═'.repeat(70)}\n`);

// ─── Step 3: PUSH — Single git push for all proxy.ts changes ───────────────
if (!DRY_RUN && successCount > 0) {
  console.log('Step 3: PUSH — Committing + pushing all proxy.ts changes...');
  try {
    const gitStatus = execSync('git status --porcelain src/proxy.ts', { encoding: 'utf-8', cwd: process.cwd() }).trim();
    if (gitStatus) {
      execSync('git add src/proxy.ts', { stdio: 'inherit', cwd: process.cwd() });
      const siteIds = results.filter(r => r.success).map(r => r.siteId).join(', ');
      execSync(`git commit -m "feat: nightly batch onboard — ${siteIds}"`, { stdio: 'inherit', cwd: process.cwd() });
      execSync('git push origin main', { stdio: 'inherit', cwd: process.cwd() });
      console.log('  ✓ Pushed to GitHub → Vercel auto-deploys\n');
    } else {
      console.log('  No proxy.ts changes to push (all domains already existed)\n');
    }
  } catch (e) {
    console.error(`  ⚠ Git push failed: ${e.message}`);
    console.log('  → Manual push required: git push origin main\n');
  }
}

// ─── Step 4: DOMAINS — Add Vercel domains + Namecheap CNAMEs ───────────────
if (!DRY_RUN && !SKIP_DOMAIN && successCount > 0) {
  console.log('Step 4: DOMAINS — Setting up Vercel + Namecheap...\n');
  const successResults = results.filter(r => r.success);
  for (const r of successResults) {
    try {
      execSync(
        `node ${scriptDir}/add-domain.mjs --domain "${r.domain}" --site-id "${r.siteId}"`,
        { stdio: 'inherit', cwd: process.cwd(), timeout: 5 * 60 * 1000 }
      );
    } catch (e) {
      console.log(`  ⚠ Domain setup issue for ${r.domain} — may need manual config`);
    }
  }
  console.log('');
}

// ─── Step 5: EMAIL — Generate personalized outreach drafts ──────────────────
if (!SKIP_EMAIL && successCount > 0) {
  console.log('Step 5: EMAIL — Generating outreach drafts...\n');

  const successResults = results.filter(r => r.success && r.email);

  for (const r of successResults) {
    console.log(`  Generating email for ${r.businessName} (${r.email})...`);

    try {
      // Read scraped data for personalization
      const scrapedPath = `/tmp/onboarding/${r.siteId}/scraped.json`;
      let scrapedData = {};
      if (existsSync(scrapedPath)) {
        scrapedData = JSON.parse(readFileSync(scrapedPath, 'utf-8'));
      }

      // Build personalized email content using scraped data
      const email = buildOutreachEmail(r, scrapedData);

      // Write email to temp file for review
      const emailPath = `${logDir}/${r.siteId}-email.json`;
      writeFileSync(emailPath, JSON.stringify(email, null, 2));

      // Create Gmail draft via Cowork MCP (if available)
      if (process.env.GMAIL_ENABLED === 'true') {
        console.log(`    → Would create Gmail draft (MCP integration required)`);
        // Gmail drafts are created by the Cowork session or Claude CLI
        // The email JSON file is consumed by the draft-creator step
      }

      console.log(`    ✓ Email ready: ${emailPath}`);

      // Update candidate status
      await supabase
        .from('candidates')
        .update({
          status: 'email_ready',
          email_subject: email.subject,
          updated_at: new Date().toISOString(),
        })
        .eq('id', r.candidateId);

    } catch (e) {
      console.log(`    ✗ Email generation failed: ${e.message}`);
    }
  }

  console.log('');
}

// ─── Step 6: LOG — Write run report ─────────────────────────────────────────
console.log('Step 6: LOG — Writing run report...\n');

const report = {
  runId,
  startedAt: new Date().toISOString(),
  mode: DRY_RUN ? 'dry_run' : 'live',
  candidatesProcessed: candidates.length,
  succeeded: successCount,
  failed: failCount,
  results: results.map(r => ({
    siteId: r.siteId,
    businessName: r.businessName,
    domain: r.domain,
    success: r.success,
    error: r.error,
    elapsedSeconds: r.elapsedSeconds,
    demoUrl: r.demoUrl,
  })),
};

const reportPath = `${logDir}/run-report.json`;
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`  Report: ${reportPath}`);

// Also write a human-readable morning briefing
const briefing = buildMorningBriefing(report, results);
const briefingPath = `${logDir}/morning-briefing.md`;
writeFileSync(briefingPath, briefing);
console.log(`  Morning briefing: ${briefingPath}`);

console.log(`\n${'═'.repeat(70)}`);
console.log(`  ✓ Nightly Pipeline Complete`);
console.log(`  ${successCount} demos built | ${failCount} failed | ${results.filter(r => r.success && r.email).length} emails ready`);
console.log(`  Logs: ${logDir}`);
console.log(`${'═'.repeat(70)}\n`);


// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build personalized outreach email from scraped data + templates.
 * Follows GTM doc rules: ≤80 words, no "ConversionOS"/"AI", CASL compliant.
 */
function buildOutreachEmail(result, scrapedData) {
  const firstName = result.ownerFirstName || 'there';
  const businessName = result.businessName || result.siteId;
  const city = scrapedData.city || '';
  const demoUrl = result.demoUrl;

  // Pick subject line pattern (rotate across batch)
  const subjectPatterns = [
    `Website Inquiry — ${businessName}`,
    `${city} Renovation Website`,
    `${firstName} — Your Online Quoting`,
    `From One ${city} Business to Another`,
    `Your ${city} Website — Quick Thought`,
  ];
  const subjectIndex = result.candidateId ? (parseInt(result.candidateId.slice(-2), 16) || 0) % subjectPatterns.length : 0;
  const subject = subjectPatterns[subjectIndex];

  // Build personalized opening line from scraped data
  let opening = '';
  if (scrapedData.testimonials?.length > 0) {
    opening = `I came across ${businessName} and your reviews speak for themselves.`;
  } else if (scrapedData.founded_year) {
    const years = new Date().getFullYear() - parseInt(scrapedData.founded_year);
    opening = `${years} years in business says a lot about ${businessName}.`;
  } else if (scrapedData.services?.length > 0) {
    const topService = scrapedData.services[0]?.name || 'renovation';
    opening = `Your ${topService.toLowerCase()} work caught my attention.`;
  } else if (city) {
    opening = `I've been looking at renovation companies in ${city} and ${businessName} stood out.`;
  } else {
    opening = `I came across ${businessName} and wanted to reach out.`;
  }

  const body = `Hi ${firstName},

${opening} I built a website specifically for ${businessName} that shows how you could take the quoting and lead response off your plate entirely.

Take a look: ${demoUrl}

If it resonates, reply and I'll build a working version for your brand within 24 hours — no cost, no commitment.

Ferdie Botden
NorBot Systems Inc.
140 Dempsey Dr, Stratford, ON N5A 0K5
Reply STOP to be removed.`;

  // Quality gate: word count (body without signature)
  const bodyWithoutSig = body.split('Ferdie Botden')[0].trim();
  const wordCount = bodyWithoutSig.split(/\s+/).length;

  // Quality gate: banned terms
  const BANNED = ['conversionos', 'ai-powered', 'artificial intelligence', 'platform', 'saas'];
  const hasBanned = BANNED.some(term => body.toLowerCase().includes(term));

  // Quality gate: CASL compliance
  const hasCASL = body.includes('NorBot Systems Inc.') &&
    body.includes('140 Dempsey Dr') &&
    body.includes('Reply STOP');

  return {
    to: result.email,
    subject,
    body,
    wordCount,
    qualityChecks: {
      wordCount: wordCount <= 80 ? 'PASS' : `FAIL (${wordCount} words)`,
      noBannedTerms: hasBanned ? 'FAIL' : 'PASS',
      caslCompliant: hasCASL ? 'PASS' : 'FAIL',
      hasPersonalization: opening !== `I came across ${businessName} and wanted to reach out.` ? 'PASS' : 'WEAK',
      subjectUnder50Chars: subject.length <= 50 ? 'PASS' : `WARN (${subject.length} chars)`,
    },
    metadata: {
      candidateId: result.candidateId,
      siteId: result.siteId,
      demoUrl: result.demoUrl,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Build morning briefing markdown for Ferdie's review.
 */
function buildMorningBriefing(report, results) {
  const successResults = results.filter(r => r.success);
  const failResults = results.filter(r => !r.success);
  const date = new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  let md = `# Morning Pipeline Briefing — ${date}\n\n`;
  md += `**${report.succeeded} demos built** | ${report.failed} failed | Run: \`${report.runId}\`\n\n`;

  if (successResults.length > 0) {
    md += `## Ready for Review\n\n`;
    md += `| # | Business | Demo Link | Email |\n`;
    md += `|---|----------|-----------|-------|\n`;
    successResults.forEach((r, i) => {
      md += `| ${i + 1} | ${r.businessName} | [${r.domain}](https://${r.domain}) | ${r.email || 'N/A'} |\n`;
    });
    md += `\n`;

    md += `### Action Items\n\n`;
    successResults.forEach((r, i) => {
      md += `${i + 1}. **${r.businessName}** — Review demo at https://${r.domain}`;
      if (r.email) md += ` → email draft in Gmail`;
      md += `\n`;
    });
    md += `\n`;
  }

  if (failResults.length > 0) {
    md += `## Failed (Needs Attention)\n\n`;
    failResults.forEach(r => {
      md += `- **${r.businessName || r.siteId}**: ${r.error}\n`;
    });
    md += `\n`;
  }

  md += `---\n*Generated by ConversionOS Nightly Pipeline*\n`;
  return md;
}
