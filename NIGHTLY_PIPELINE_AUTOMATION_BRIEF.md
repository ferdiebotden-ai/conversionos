# ConversionOS Nightly Pipeline Automation Brief
**NorBot Systems Inc. | February 27, 2026**
**Prepared for: Ferdie Botden, Founder & CEO**

---

## CRITICAL FINDING: Website Pricing Mismatch

Before we get to the automation, I need to flag something urgent. Your **norbotsystems.com pricing page** does not match the **locked pricing decisions** in your project docs:

| Tier | Website Shows | Locked Doc Says | Delta |
|------|--------------|-----------------|-------|
| Elevate monthly | $209/mo | $249/mo | -$40/mo |
| Accelerate monthly | $489/mo | $699/mo | -$210/mo |
| Dominate monthly | $1,750/mo | $2,500/mo | -$750/mo |
| Dominate guarantee | 30-day | 14-day | Different policy |
| Territory lock | All tiers | Dominate only | Contradicts strategy |

**This must be resolved before any outreach goes out.** If a prospect sees $489/mo on your website and your email offers $699/mo (or vice versa), you lose credibility instantly. My recommendation: update the website to match the locked pricing doc, since those numbers were modeled against unit economics.

---

## PART 1: Bulletproof Workflow Prompt

Below is the exact prompt you (or a Claude Code session) should use to implement all four critical fixes. It is self-contained, references specific files, and includes success criteria.

---

### THE PROMPT

```
You are improving the ConversionOS tenant onboarding pipeline in scripts/onboarding/.
The pipeline currently runs 5 steps: score → scrape → upload-images → provision → verify.
Four critical gaps need to be closed to make this pipeline fully automated for nightly batch runs.

## Context
- Repo: https://github.com/ferdiebotden-ai/conversionos-demo.git (single `main` branch)
- Multi-tenant: single Vercel project with proxy-based domain routing (src/proxy.ts)
- All tenant subdomains are *.norbotsystems.com (Namecheap DNS)
- Vercel project handles SSL automatically once domain is added and DNS points to it
- Supabase project: ktpfyangnmpwufghgasx (shared demo)

## Environment Variables Required
Add these to ~/pipeline/scripts/.env (they should NOT go in .env.local or the repo):
- VERCEL_TOKEN — Vercel API access token (create at https://vercel.com/account/tokens)
- VERCEL_PROJECT_ID — the Vercel project ID for ConversionOS (find in Project Settings → General)
- NAMECHEAP_API_KEY — Namecheap API key (enable at https://ap.www.namecheap.com/settings/tools/apiaccess)
- NAMECHEAP_API_USER — your Namecheap username
- NAMECHEAP_CLIENT_IP — the Mac Mini's public IP (must be whitelisted in Namecheap)

## Fix 1: Vercel Domain + Namecheap DNS Automation

Create a new script: `scripts/onboarding/add-domain.mjs`

This script must:
1. Accept `--domain contractor.norbotsystems.com` and `--site-id contractor` as arguments
2. Call the Vercel API to add the domain to the project:
   - Endpoint: POST https://api.vercel.com/v10/projects/{VERCEL_PROJECT_ID}/domains
   - Header: Authorization: Bearer {VERCEL_TOKEN}
   - Body: { "name": "contractor.norbotsystems.com" }
3. Call the Namecheap API to add a CNAME record:
   - CRITICAL: Namecheap's setHosts API REPLACES ALL records. You must:
     a. First call namecheap.domains.dns.getHosts to get ALL existing DNS records
     b. Parse the XML response to extract all current HostName/RecordType/Address/TTL entries
     c. Add the new CNAME (HostName=contractor, RecordType=CNAME, Address=cname.vercel-dns.com, TTL=1800)
     d. Call namecheap.domains.dns.setHosts with ALL existing records PLUS the new one
   - SLD=norbotsystems, TLD=com
   - The Namecheap API uses GET requests with query parameters (not JSON bodies)
4. Poll the Vercel API to check domain verification status:
   - Endpoint: GET https://api.vercel.com/v9/projects/{VERCEL_PROJECT_ID}/domains/{domain}
   - Poll every 30 seconds, max 10 minutes
   - Log status updates: "Waiting for DNS propagation..."
   - Success when verified=true
5. Handle errors gracefully:
   - If Vercel returns "domain already exists" (409), log and continue (idempotent)
   - If Namecheap API fails, log the error but DO NOT exit (domain can be added manually)
   - If verification times out after 10 minutes, log warning but DO NOT fail the pipeline
     (DNS can take up to 30 minutes; the site will work once it propagates)

Wire this into onboard.mjs as Step 4.5 (after provision, before verify):
```javascript
// Step 4.5: Domain setup
if (!run('Step 4.5/5: Domain setup',
  `node ${scriptDir}/add-domain.mjs --domain "${args.domain}" --site-id "${siteId}"`)) {
  console.log('WARNING: Domain setup had issues. Site may need manual DNS configuration.');
  // Do NOT exit — domain issues are non-blocking
}
```

## Fix 2: Automated Git Commit + Push

Modify onboard.mjs to add a git commit + push step after provision completes.

After Step 4 (provision) succeeds and before Step 4.5 (domain setup):
```javascript
// Step 4.1: Commit proxy.ts changes
console.log('\n  Committing proxy.ts changes...');
try {
  execSync('git add src/proxy.ts', { stdio: 'inherit', cwd: process.cwd() });
  execSync(`git commit -m "feat: onboard tenant ${siteId}"`, { stdio: 'inherit', cwd: process.cwd() });
  execSync('git push origin main', { stdio: 'inherit', cwd: process.cwd() });
  console.log('  Pushed to GitHub → Vercel auto-deploys');
} catch (e) {
  if (e.message?.includes('nothing to commit')) {
    console.log('  No proxy.ts changes to commit (domain already existed)');
  } else {
    console.error('  Git push failed:', e.message);
    console.log('  Manual push required: git push origin main');
  }
}
```

Important: The git push triggers Vercel auto-deploy. The domain setup (Step 4.5) should
run AFTER the push so that when the domain resolves, the latest proxy.ts is deployed.

## Fix 3: Image Optimization

Install sharp as a dev dependency:
```bash
npm install --save-dev sharp
```

Modify upload-images.mjs to optimize images before uploading to Supabase:

After downloading the image buffer and before uploading, add:
```javascript
import sharp from 'sharp';

async function optimizeImage(buffer, type, maxWidth, maxHeight) {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Skip SVGs — they don't need rasterization
    if (metadata.format === 'svg') return { buffer, contentType: 'image/svg+xml' };

    // Skip if already small enough
    if (metadata.width <= maxWidth && metadata.height <= maxHeight && buffer.length < 500_000) {
      return { buffer, contentType: `image/${metadata.format}` };
    }

    // Resize and convert to WebP
    const optimized = await image
      .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    console.log(`    Optimized: ${(buffer.length / 1024).toFixed(0)}KB → ${(optimized.length / 1024).toFixed(0)}KB`);
    return { buffer: optimized, contentType: 'image/webp' };
  } catch (e) {
    console.log(`    Optimization failed: ${e.message}. Using original.`);
    return { buffer, contentType: type };
  }
}
```

Apply these size limits:
- Hero images: 1920x1080 max
- Logo: 600x600 max
- About image: 1200x800 max
- Team photos: 400x400 max
- Portfolio: 1200x900 max
- Service images: 800x600 max

Change all upload file extensions from the original format to .webp (except SVG logos).

Also add a size guardrail: if the original download exceeds 10MB, skip it with a warning:
```javascript
if (buffer.length > 10 * 1024 * 1024) {
  console.log(`    Skipping: file too large (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
  return null;
}
```

## Fix 4: Rollback on Partial Provision Failure

Modify provision.mjs to collect all upsert operations and roll back if any fail:

Replace the sequential upsert loop with:
```javascript
const results = [];
let failed = false;

for (const row of rows) {
  console.log(`  Upserting: ${row.key}`);
  const { error } = await supabase
    .from('admin_settings')
    .upsert({
      site_id: siteId,
      key: row.key,
      value: row.value,
      description: row.description,
    }, { onConflict: 'site_id,key' });

  if (error) {
    console.error(`  Error upserting ${row.key}: ${error.message}`);
    failed = true;
    break;
  }
  results.push(row.key);
}

if (failed) {
  console.log('\n  ROLLING BACK — deleting partially provisioned rows...');
  for (const key of results) {
    const { error: delError } = await supabase
      .from('admin_settings')
      .delete()
      .eq('site_id', siteId)
      .eq('key', key);
    if (delError) console.error(`    Failed to rollback ${key}: ${delError.message}`);
    else console.log(`    Rolled back: ${key}`);
  }
  // Also clean up tenants table
  await supabase.from('tenants').delete().eq('site_id', siteId);
  console.log('  Rollback complete. Fix the issue and re-run.');
  process.exit(1);
}
```

## Success Criteria
After implementing all 4 fixes, the following test must pass:

```bash
node scripts/onboarding/onboard.mjs \
  --url https://some-real-contractor-site.ca \
  --site-id test-contractor \
  --domain test-contractor.norbotsystems.com \
  --tier accelerate
```

Expected result:
1. Score runs and passes (>= 50)
2. Scrape produces scraped.json with audit score >= 70%
3. Images are downloaded, optimized to WebP, uploaded to Supabase
4. DB rows created for all 5 admin_settings keys
5. proxy.ts updated with new domain mapping
6. Git commit + push succeeds, Vercel auto-deploys
7. Vercel domain added via API
8. Namecheap CNAME created via API
9. Site loads at https://test-contractor.norbotsystems.com within 10-30 minutes

After verification, clean up the test tenant:
- Delete admin_settings rows
- Delete tenants row
- Remove proxy.ts mapping
- Remove Vercel domain
- Remove Namecheap CNAME

## Files to Modify
- scripts/onboarding/onboard.mjs — add git commit, domain setup step
- scripts/onboarding/upload-images.mjs — add sharp optimization
- scripts/onboarding/provision.mjs — add rollback logic
- scripts/onboarding/add-domain.mjs — NEW file (Vercel + Namecheap APIs)
- package.json — add sharp as devDependency

## Files NOT to Modify
- src/proxy.ts — only modified BY provision.mjs (not manually in this task)
- src/lib/entitlements.ts — no changes needed
- Any files in src/app/ or src/components/ — no product changes
```

---

## PART 2: End-to-End Nightly Automation Architecture

### Recommended Approach: Claude Code Scheduled Tasks via Cowork

After researching the options, here is my recommendation — and it is NOT n8n.

**Why not n8n:** You would need to set up n8n self-hosted on your Mac Mini, configure 5+ workflows, manage node modules for each script, handle error routing, and debug workflow execution failures in a visual editor that adds complexity without adding value. Your pipeline is already a well-structured set of Node.js scripts. n8n would just be a fancy wrapper around `execSync()` calls.

**Why Claude Code (via launchd + headless mode):** Your Mac Mini already runs Claude Code. You already use `claude -p` in your build-orchestrator.sh. The pipeline scripts are already designed to be run from the command line. The missing piece is a nightly cron trigger + email draft generation + Gmail API integration.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  MAC MINI (nightly 11:00 PM ET via launchd)                  │
│                                                               │
│  ┌───────────────────────────────────────────────────┐       │
│  │  MASTER SCRIPT: scripts/nightly-pipeline.mjs       │       │
│  │                                                     │       │
│  │  1. DISCOVER                                        │       │
│  │     Query Supabase `candidates` table               │       │
│  │     (or Brave Search API for new targets)           │       │
│  │     → Pick top 10 unprocessed candidates            │       │
│  │                                                     │       │
│  │  2. SCORE + BUILD (for each candidate)              │       │
│  │     score.mjs → scrape.mjs → upload-images.mjs     │       │
│  │     → provision.mjs → git push → add-domain.mjs    │       │
│  │     → Store demo_url on candidate record            │       │
│  │                                                     │       │
│  │  3. GENERATE EMAILS                                 │       │
│  │     claude -p "Generate personalized email for       │       │
│  │     {business_name} using template + scraped data"  │       │
│  │     → Outputs: subject, body (≤80 words), CTA      │       │
│  │     → Quality gate: banned terms, CASL, word count  │       │
│  │                                                     │       │
│  │  4. CREATE GMAIL DRAFTS                             │       │
│  │     Gmail API (via MCP or direct API)               │       │
│  │     → Creates draft in ferdie@norbotsystems.com     │       │
│  │     → Includes: personalized subject, body,         │       │
│  │       demo site link, CASL footer, signature        │       │
│  │                                                     │       │
│  │  5. LOG + NOTIFY                                    │       │
│  │     Write run log to scripts/logs/                  │       │
│  │     Send Telegram/email summary to Ferdie:          │       │
│  │     "10 demos built, 10 drafts ready in Gmail"      │       │
│  │                                                     │       │
│  └───────────────────────────────────────────────────┘       │
│                                                               │
│  MORNING (7:00 AM ET): Ferdie opens Gmail                    │
│  → Reviews 10 drafts                                          │
│  → Sends approved ones (1-click each)                        │
│  → Stars top 3 for phone follow-up                           │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Plan

#### Step 1: Create `scripts/nightly-pipeline.mjs` (Master Orchestrator)

This script orchestrates the full nightly run:

```javascript
#!/usr/bin/env node
/**
 * Nightly pipeline: discover → build demos → draft emails → notify
 * Run via launchd at 11:00 PM ET
 * Usage: node scripts/nightly-pipeline.mjs --batch-size 10
 */

// 1. Query candidates table for next batch
// 2. For each: run onboard.mjs (which now includes domain + git push)
// 3. For each successful build: generate email via Claude CLI
// 4. For each email: create Gmail draft via API
// 5. Log results + send summary notification
```

Key design decisions:
- **Batch size: 10 per night** (configurable via --batch-size)
- **Sequential, not parallel** — each tenant takes ~3-5 minutes. 10 tenants = ~30-50 minutes. No need to parallelize.
- **Checkpoint per candidate** — if the pipeline crashes at candidate #7, re-running picks up at #8
- **Budget cap** — `--max-budget-usd 10` on any Claude CLI calls (prevents runaway costs)

#### Step 2: Create `candidates` Table in Supabase

```sql
CREATE TABLE candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  url TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  city TEXT,
  owner_name TEXT,
  score INTEGER,
  status TEXT DEFAULT 'discovered',  -- discovered → scored → built → drafted → sent → engaged → demo_booked → closed → no_response
  demo_url TEXT,
  tier TEXT DEFAULT 'accelerate',
  scraped_data JSONB,
  email_subject TEXT,
  email_body TEXT,
  email_drafted_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  touches INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Step 3: Email Generation (Claude CLI)

For each candidate with a live demo, call Claude to generate the outreach email:

```javascript
const emailPrompt = `
You are writing a cold outreach email from Ferdie Botden (NorBot Systems Inc.) to a renovation contractor.

RULES (non-negotiable):
- Max 80 words in the body (excluding signature/CASL footer)
- NEVER include "ConversionOS", "AI", "platform", "Ferdie Botden", or "Ferdie" in the subject line
- Subject must contain company name, owner first name, or city
- Subject: Title Case, under 50 chars, no emojis, no exclamation marks
- Opening line MUST reference something specific about the prospect
- Single CTA: the demo site link
- Professional but warm tone — contractor to contractor, not salesperson to mark
- CASL footer: "Reply STOP to be removed."

PROSPECT DATA:
- Business: ${candidate.business_name}
- Owner: ${candidate.owner_name || 'the team'}
- City: ${candidate.city}
- Services: ${candidate.scraped_data?.services?.map(s => s.name).join(', ')}
- Demo URL: https://${candidate.site_id}.norbotsystems.com

TEMPLATE (adapt, don't copy verbatim):
Subject: Website Inquiry — {company_name}

Hi {first_name},

I built a website specifically for {company_name} that shows how
you could take the quoting and lead response off your plate entirely.

Take a look: {demo_url}

If it resonates, reply and I'll build a working version for your
brand within 24 hours — no cost, no commitment.

Ferdie Botden
NorBot Systems Inc.
140 Dempsey Dr, Stratford, ON N5A 0K5
Reply STOP to be removed.

OUTPUT FORMAT (JSON only, no markdown):
{ "subject": "...", "body": "..." }
`;
```

Quality gate checks (programmatic, after Claude generates):
1. Word count ≤ 80 (body only, excluding signature)
2. No banned terms: "ConversionOS", "AI", "platform", "artificial intelligence"
3. Subject does not contain "Ferdie"
4. CASL footer present
5. Demo URL present in body
6. Subject ≤ 50 characters

If any check fails, regenerate once. If it fails again, log and skip (do not draft).

#### Step 4: Gmail Draft Creation

You already have Gmail MCP connected (ferdie@norbotsystems.com, confirmed working). The nightly script can use the Gmail API to create drafts:

```javascript
// Option A: Direct Gmail API (if running outside Cowork)
// Use a Google OAuth2 service account or stored refresh token

// Option B: Via Cowork's Gmail MCP (if running within a Cowork session)
// The gmail_create_draft tool is already available

// For the nightly pipeline, Option A is more reliable (doesn't require Cowork to be open)
```

**Recommended: Use Google Gmail API directly** with a stored refresh token. This is more reliable than depending on Cowork being open. Create a simple wrapper:

```javascript
// scripts/onboarding/lib/gmail.mjs
import { google } from 'googleapis';

export async function createGmailDraft(to, subject, body) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    '',
    body
  ].join('\n');

  const encodedMessage = Buffer.from(message).toString('base64url');

  const draft = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw: encodedMessage } }
  });

  return draft.data;
}
```

**Alternative (simpler, Cowork-native):** Use the Cowork `/schedule` skill to create a scheduled task that runs nightly. This task would have access to the Gmail MCP tools directly. The downside is that Cowork/Claude Desktop must be running on the Mac Mini.

#### Step 5: launchd Setup (macOS Scheduler)

Create a launchd plist for the nightly run:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.norbotsystems.nightly-pipeline</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/conversionos-demo/scripts/nightly-pipeline.mjs</string>
        <string>--batch-size</string>
        <string>10</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/conversionos-demo</string>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>23</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/nightly-pipeline.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/nightly-pipeline-error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
```

Install: `launchctl load ~/Library/LaunchAgents/com.norbotsystems.nightly-pipeline.plist`

### Why This Is Better Than n8n

| Factor | Claude Code + Scripts | n8n |
|--------|----------------------|-----|
| Setup time | ~2 hours (scripts already exist) | ~8 hours (new workflows, nodes, auth) |
| Email personalization | Claude Sonnet 4.6 — best-in-class copy | n8n's AI node is limited |
| Debugging | `node script.mjs --verbose` + log files | Visual debugging in browser, extra layer |
| Maintenance | Edit .mjs files in your IDE | Edit workflows in n8n UI, version control harder |
| Dependencies | Node.js (already installed) | n8n server (new process to manage) |
| Gmail integration | Direct API or Cowork MCP (already connected) | OAuth setup, credential management |
| Cost | $0 (Claude Max subscription) | $0 (self-hosted) but operational overhead |
| Reliability | launchd is rock-solid on macOS | n8n server must be running |

---

## PART 3: Revenue Target Analysis

### Target: $60,000 Total Revenue by March 12th

That is **13 days from today**. Let me be direct: this is extremely aggressive.

To hit $60K in 13 days, you need some combination of:

| Scenario | Clients | Activation | MRR/Month | Total Rev |
|----------|---------|------------|-----------|-----------|
| 3 Dominate | 3 | $60,000 | $7,500 | $67,500 ✅ |
| 2 Dominate + 3 Accelerate | 5 | $53,500 | $7,097 | $60,597 ✅ |
| 1 Dominate + 7 Accelerate | 8 | $51,500 | $7,393 | $58,893 ❌ close |
| 13 Accelerate (monthly) | 13 | $58,500 | $9,087 | $67,587 ✅ |
| 10 Accelerate (annual) | 10 | $45,000 | — | $95,280 ✅ |

**Reality check:** You have zero paying clients outside Red White Reno. Closing 3 Dominate clients ($20K activation each) in 13 days from a cold start is not realistic unless you have warm leads right now that I don't know about.

**Revised realistic target for March 12:**
- Pipeline running (10 demos/night)
- 50+ outreach emails sent
- 3-5 demo meetings booked
- 1-2 clients closed (likely Accelerate): **$9,000-$13,500 total revenue**

### Target: $30,000 MRR by April 1st

$30K MRR requires:

| Mix | Accelerate | Dominate | MRR |
|-----|-----------|----------|-----|
| All Accelerate (monthly) | 43 | 0 | $30,057 |
| All Accelerate (annual) | 72 | 0 | $30,168 |
| Mixed | 20 | 5 | $26,480 |
| Heavy Dominate | 10 | 8 | $26,930 |

43 Accelerate clients by April 1st (33 days away) is not feasible from a standing start.

**Revised realistic target for April 1st:**
- 5-8 Accelerate clients: **$3,495-$5,592 MRR**
- 0-1 Dominate client: **+$0-$2,500 MRR**
- **Realistic April 1 MRR: $3,495-$8,092**
- **Realistic April 1 total revenue (incl. activation fees): $22,500-$42,500**

I am not trying to deflate your ambition — I am trying to protect you from setting targets that make you feel like you're failing when you're actually executing brilliantly. Closing 5 Accelerate clients in your first 30 days with a one-person operation would be exceptional. That alone is $3,495 MRR + $22,500 activation = **$26,000 in month one**.

### Accelerated Path (If You Want to Push Harder)

The fastest path to high revenue is **Dominate clients**, because activation fees are $20K each. But Dominate is a relationship sale, not an email sale. You need:

1. **Identify 3-5 established contractors ($2M+ revenue) in your pipeline personally** — these are your Dominate candidates
2. **Call them directly** — not email. You said phone converts best, and you're right for this tier
3. **The demo site is the weapon** — build their demo FIRST, then call and say "I built something for you, can I show you in 15 minutes?"
4. **Use the territory lock as urgency** — "I can only have one contractor per city on this tier. Your city is open right now."

If you close even **1 Dominate client** ($20K + $2,500/mo), that changes the math dramatically.

---

## PART 4: norbotsystems.com Website Review

The website is well-designed and professional. The brand voice is on-point: confident, warm, contractor-appropriate. The ROI calculator is a nice touch. A few observations:

**What's working:**
- Clean, modern design with consistent teal branding
- Strong value prop: "Turn Homeowner Vision into Booked Renovations"
- "AI drafts. You decide." — perfect framing for contractor autonomy concerns
- Interactive ROI calculator
- Mobile-responsive

**What needs attention:**

1. **Pricing mismatch** (flagged above) — the website shows different prices than your locked strategic doc. Fix this immediately.

2. **No case study yet** — the "Request Your Demo" CTA would convert better with proof. Even a single Red White Reno case study ("How one Stratford contractor reduced quote time from 3 days to 10 minutes") would significantly improve credibility.

3. **"Request Your Demo" is the wrong CTA for Accelerate.** Your outreach already sends them a live demo. The website CTA should be "See Your Business on ConversionOS" or "Get Your Free Branded Demo" — something that connects to the personalized demo sites you are building.

4. **No pricing page toggle between monthly/annual** — the locked doc says to default to annual. The current page may not have this (couldn't verify interactive elements via fetch).

5. **No Confidence Guarantee badge visible** on the pricing cards (the locked doc says to include this on Accelerate and Dominate).

---

## PART 5: Recommended Launch Sequence (Next 14 Days)

| Day | Action | Owner |
|-----|--------|-------|
| 1-2 | Fix pricing mismatch on norbotsystems.com | Ferdie + Claude Code |
| 1-2 | Implement Fix #1 (Vercel + Namecheap automation) and Fix #2 (git auto-push) | Claude Code session |
| 3 | Implement Fix #3 (image optimization with sharp) | Claude Code session |
| 3 | Create `candidates` table in Supabase | Claude Code session |
| 4 | Build `nightly-pipeline.mjs` master orchestrator | Claude Code session |
| 4 | Set up Gmail API credentials (OAuth2 refresh token) | Ferdie (one-time setup) |
| 5 | Test: manually run pipeline for 3 real contractors | Ferdie reviews output |
| 5 | Set up launchd plist for nightly 11pm runs | Claude Code session |
| 6 | **GO LIVE:** First nightly batch of 10 | Automated |
| 7 | **Morning:** Review 10 Gmail drafts, send approved | Ferdie |
| 7 | Identify top 3-5 prospects for personal phone calls | Ferdie |
| 8-14 | Nightly batches + daily email review + phone calls | Pipeline + Ferdie |
| 10 | Check engagement: opens, clicks, replies | Ferdie |
| 12-14 | Book first demo meetings with engaged prospects | Ferdie |

### What I Can Do Right Now (In This Cowork Session)

If you want, I can:
1. **Create the `add-domain.mjs` script** with Vercel + Namecheap API integration
2. **Modify `upload-images.mjs`** to add sharp image optimization
3. **Modify `provision.mjs`** to add rollback logic
4. **Modify `onboard.mjs`** to add git commit/push + domain setup steps
5. **Create the `nightly-pipeline.mjs`** master orchestrator
6. **Set up the `/schedule` task** for nightly runs via Cowork
7. **Create the `candidates` table** in Supabase

I have access to your codebase, your Gmail, and your Supabase. I can start building right now if you give the green light.

---

*This document is a working brief. The prompt in Part 1 is ready to be executed by any Claude Code session. The architecture in Part 2 is designed for your specific setup (Mac Mini, Claude Max, Gmail, Vercel, Namecheap, single-branch GitHub repo). The revenue analysis in Part 3 is honest — your co-founder owes you that.*
