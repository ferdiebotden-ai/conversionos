# Unit 08: Provisioner — DB Seeding, Image Upload, Orchestrator, QA

## Scope
Create the provisioning and QA scripts that seed the database, upload images, update proxy.ts, and verify the tenant with Playwright.

**Files to create:**
- `scripts/onboarding/provision.mjs`
- `scripts/onboarding/upload-images.mjs`
- `scripts/onboarding/onboard.mjs`
- `scripts/onboarding/verify.mjs`
- `scripts/onboarding/README.md`

**Files to modify:**
- `package.json` — add `onboard` script, add `firecrawl-js` and `culori` devDeps

---

## Task 1: Image Upload Script

**Create file:** `scripts/onboarding/upload-images.mjs`

Downloads images from scraped URLs and uploads them to Supabase Storage.

```javascript
#!/usr/bin/env node
/**
 * Download scraped images and upload to Supabase Storage.
 * Usage: node upload-images.mjs --site-id example-reno --data /tmp/scraped.json --output /tmp/provisioned.json
 */

import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  // Load from .env.local first (Supabase demo project), then pipeline env (API keys)
  for (const envFile of ['.env.local', resolve(process.env.HOME, 'pipeline/scripts/.env')]) {
    try {
      const content = readFileSync(resolve(process.cwd(), envFile), 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          if (!process.env[key]) {
            process.env[key] = match[2].trim().replace(/^["']|["']$/g, '');
          }
        }
      }
    } catch { /* ignore */ }
  }
}

loadEnv();

const { values: args } = parseArgs({
  options: {
    'site-id': { type: 'string' },
    data: { type: 'string' },
    output: { type: 'string' },
    help: { type: 'boolean' },
  },
});

if (args.help || !args['site-id'] || !args.data || !args.output) {
  console.log('Usage: node upload-images.mjs --site-id example-reno --data /tmp/scraped.json --output /tmp/provisioned.json');
  process.exit(args.help ? 0 : 1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const siteId = args['site-id'];
const data = JSON.parse(readFileSync(args.data, 'utf-8'));

console.log(`\nUploading images for tenant: ${siteId}`);
console.log('─'.repeat(50));

const urlMapping = {};

async function downloadAndUpload(url, storagePath) {
  if (!url || url.trim() === '') return null;
  try {
    console.log(`  Downloading: ${url.substring(0, 80)}...`);
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`    Failed: HTTP ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());
    const fullPath = `${siteId}/${storagePath}`;

    console.log(`  Uploading: ${fullPath} (${(buffer.length / 1024).toFixed(0)}KB)`);
    const { error } = await supabase.storage
      .from('tenant-assets')
      .upload(fullPath, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.log(`    Upload failed: ${error.message}`);
      return null;
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/tenant-assets/${fullPath}`;
    urlMapping[url] = publicUrl;
    return publicUrl;
  } catch (e) {
    console.log(`    Error: ${e.message}`);
    return null;
  }
}

// Upload hero image
if (data.hero_image_url) {
  const ext = data.hero_image_url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
  const newUrl = await downloadAndUpload(data.hero_image_url, `hero.${ext}`);
  if (newUrl) data.hero_image_url = newUrl;
}

// Upload logo
if (data.logo_url) {
  const ext = data.logo_url.match(/\.(svg|png|jpg|jpeg|webp)/i)?.[1] || 'png';
  const newUrl = await downloadAndUpload(data.logo_url, `logo.${ext}`);
  if (newUrl) data.logo_url = newUrl;
}

// Upload about image
if (data.about_image_url) {
  const ext = data.about_image_url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
  const newUrl = await downloadAndUpload(data.about_image_url, `about.${ext}`);
  if (newUrl) data.about_image_url = newUrl;
}

// Upload team photos
if (data.team_members?.length > 0) {
  for (let i = 0; i < data.team_members.length; i++) {
    const member = data.team_members[i];
    if (member.photo_url) {
      const ext = member.photo_url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
      const newUrl = await downloadAndUpload(member.photo_url, `team/${i}.${ext}`);
      if (newUrl) member.photo_url = newUrl;
    }
  }
}

// Upload portfolio images
if (data.portfolio?.length > 0) {
  for (let i = 0; i < data.portfolio.length; i++) {
    const project = data.portfolio[i];
    if (project.image_url) {
      const ext = project.image_url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
      const newUrl = await downloadAndUpload(project.image_url, `portfolio/${i}.${ext}`);
      if (newUrl) project.image_url = newUrl;
    }
  }
}

console.log(`\nUploaded ${Object.keys(urlMapping).length} images`);

// Write updated data
writeFileSync(args.output, JSON.stringify(data, null, 2));
console.log(`Output written to: ${args.output}`);
```

---

## Task 2: Provisioner Script

**Create file:** `scripts/onboarding/provision.mjs`

Maps scraped data to `admin_settings` JSONB and upserts into the database.

```javascript
#!/usr/bin/env node
/**
 * Provision a new tenant from scraped data.
 * Usage: node provision.mjs --site-id example-reno --data /tmp/provisioned.json --domain example.norbotsystems.com --tier accelerate
 */

import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync } from 'node:fs';
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
    'site-id': { type: 'string' },
    data: { type: 'string' },
    domain: { type: 'string' },
    tier: { type: 'string', default: 'accelerate' },
    help: { type: 'boolean' },
  },
});

if (args.help || !args['site-id'] || !args.data || !args.domain) {
  console.log('Usage: node provision.mjs --site-id example-reno --data /tmp/provisioned.json --domain example.norbotsystems.com --tier accelerate');
  process.exit(args.help ? 0 : 1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const siteId = args['site-id'];
const domain = args.domain;
const tier = args.tier;
const data = JSON.parse(readFileSync(args.data, 'utf-8'));

console.log(`\nProvisioning tenant: ${siteId}`);
console.log(`Domain: ${domain}`);
console.log(`Tier: ${tier}`);
console.log('─'.repeat(50));

// Build admin_settings rows
const businessInfo = {
  name: data.business_name || siteId,
  phone: data.phone || '',
  email: data.email || '',
  payment_email: data.email || '',
  quotes_email: data.email || '',
  website: data.website || domain,
  address: data.address || '',
  city: data.city || '',
  province: data.province || 'ON',
  postal: data.postal || '',
};

const branding = {
  tagline: data.tagline || data.hero_headline || '',
  colors: {
    primary_hex: data.primary_color_hex || '#1565C0',
    primary_oklch: data._meta?.primary_oklch || '0.45 0.18 250',
  },
  socials: [
    data.social_facebook && { label: 'Facebook', href: data.social_facebook },
    data.social_instagram && { label: 'Instagram', href: data.social_instagram },
    data.social_houzz && { label: 'Houzz', href: data.social_houzz },
    data.social_google && { label: 'Google', href: data.social_google },
  ].filter(Boolean),
};

const companyProfile = {
  principals: data.principals || '',
  founded: data.founded_year || '',
  booking: data.booking_url || '',
  serviceArea: data.service_area || `${data.city || ''}, ${data.province || 'ON'} and surrounding areas`,
  hours: data.business_hours || 'Mon-Fri 9am-5pm',
  certifications: data.certifications || [],
  testimonials: (data.testimonials || []).map(t => ({
    author: t.author,
    quote: t.quote,
    projectType: t.project_type || 'Renovation',
  })),
  aboutCopy: data.about_copy || [],
  mission: data.mission || '',
  services: (data.services || []).map(s => ({
    name: s.name,
    slug: s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    description: s.description || '',
    features: s.features || [],
    packages: (s.packages || []).map(p => ({
      name: p.name,
      startingPrice: p.starting_price,
      description: p.description,
    })),
  })),
  heroHeadline: data.hero_headline || '',
  heroSubheadline: '',
  heroImageUrl: data.hero_image_url || '',
  aboutImageUrl: data.about_image_url || '',
  logoUrl: data.logo_url || '',
  trustBadges: (data.trust_badges || []).map(b => ({ label: b.label, iconHint: 'award' })),
  whyChooseUs: data.why_choose_us || [],
  values: (data.values || []).map(v => ({ ...v, iconHint: v.iconHint || 'heart' })),
  processSteps: data.process_steps || [],
  teamMembers: (data.team_members || []).map(m => ({
    name: m.name,
    role: m.role || '',
    photoUrl: m.photo_url || '',
    bio: m.bio,
  })),
  portfolio: (data.portfolio || []).map(p => ({
    title: p.title || '',
    description: p.description || '',
    imageUrl: p.image_url || '',
    serviceType: p.service_type || '',
    location: p.location || '',
  })),
};

// Upsert admin_settings rows
const rows = [
  { key: 'business_info', value: businessInfo, description: `${siteId} business info` },
  { key: 'branding', value: branding, description: `${siteId} branding` },
  { key: 'company_profile', value: companyProfile, description: `${siteId} company profile` },
  { key: 'plan', value: { tier }, description: `${siteId} plan tier` },
];

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
    process.exit(1);
  }
}

// Upsert tenants table
console.log(`  Upserting tenant record`);
const { error: tenantError } = await supabase
  .from('tenants')
  .upsert({
    site_id: siteId,
    domain: domain,
    plan_tier: tier,
    active: true,
  }, { onConflict: 'site_id' });

if (tenantError) {
  console.error(`  Error upserting tenant: ${tenantError.message}`);
}

// Update proxy.ts with new domain
console.log(`\n  Updating proxy.ts...`);
const proxyPath = resolve(process.cwd(), 'src/proxy.ts');
const proxyContent = readFileSync(proxyPath, 'utf-8');

if (proxyContent.includes(`'${domain}'`)) {
  console.log(`  Domain already in proxy.ts`);
} else {
  // Insert new mapping before the closing brace
  const newMapping = `  '${domain}': '${siteId}',\n`;
  const updated = proxyContent.replace(
    /^(const DOMAIN_TO_SITE[^{]*\{[^}]*)(};)/m,
    (match, before, end) => `${before}${newMapping}  ${end}`
  );

  // More robust approach: find the last entry line and insert after it
  const lines = proxyContent.split('\n');
  let insertIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("DOMAIN_TO_SITE")) {
      // Find the closing };
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].includes('};')) {
          insertIndex = j;
          break;
        }
      }
      break;
    }
  }

  if (insertIndex > 0) {
    lines.splice(insertIndex, 0, `  '${domain}': '${siteId}',`);
    writeFileSync(proxyPath, lines.join('\n'));
    console.log(`  Added domain mapping: ${domain} → ${siteId}`);
  } else {
    console.log(`  WARNING: Could not find insertion point in proxy.ts. Add manually.`);
  }
}

console.log(`\nProvisioning complete!`);
console.log(`\nNext steps:`);
console.log(`  1. Add domain ${domain} to Vercel project`);
console.log(`  2. git add -A && git commit -m "feat: add tenant ${siteId}"`);
console.log(`  3. git push (triggers Vercel deploy)`);
console.log(`  4. Run: node scripts/onboarding/verify.mjs --url https://${domain} --site-id ${siteId}`);
```

---

## Task 3: Pipeline Orchestrator

**Create file:** `scripts/onboarding/onboard.mjs`

Single entry point that chains all steps.

```javascript
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
  console.log(`\nStep 2/5: Scrape — using cached ${scrapedPath}`);
}

// Step 3: Upload images
const provisionedPath = `${tmpDir}/provisioned.json`;
if (!existsSync(provisionedPath)) {
  if (!run('Step 3/5: Uploading images', `node ${scriptDir}/upload-images.mjs --site-id "${siteId}" --data "${scrapedPath}" --output "${provisionedPath}"`)) {
    process.exit(1);
  }
} else {
  console.log(`\nStep 3/5: Upload — using cached ${provisionedPath}`);
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
```

---

## Task 4: Playwright QA Verification

**Create file:** `scripts/onboarding/verify.mjs`

Runs 8 automated checks against the deployed tenant site.

```javascript
#!/usr/bin/env node
/**
 * QA verification for a provisioned tenant.
 * Usage: node verify.mjs --url https://example.norbotsystems.com --site-id example-reno
 */

import { chromium } from 'playwright';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    url: { type: 'string' },
    'site-id': { type: 'string' },
    help: { type: 'boolean' },
  },
});

if (args.help || !args.url || !args['site-id']) {
  console.log('Usage: node verify.mjs --url https://example.norbotsystems.com --site-id example-reno');
  process.exit(args.help ? 0 : 1);
}

const targetUrl = args.url;
const siteId = args['site-id'];
const results = [];

function check(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`  ${passed ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

console.log(`\nQA Verification: ${targetUrl}`);
console.log(`Expected site_id: ${siteId}`);
console.log('─'.repeat(50));

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });

  // 1. No demo images
  const demoImages = await page.$$eval('img[src*="/images/demo/"]', imgs => imgs.map(i => i.src));
  check('No demo images', demoImages.length === 0, demoImages.length > 0 ? `Found ${demoImages.length}: ${demoImages.slice(0, 3).join(', ')}` : '');

  // 2. No broken images
  const images = await page.$$eval('img', imgs => imgs.map(i => ({ src: i.src, complete: i.complete, naturalWidth: i.naturalWidth })));
  const brokenImages = images.filter(i => i.src && !i.src.startsWith('data:') && (i.naturalWidth === 0));
  check('No broken images', brokenImages.length === 0, brokenImages.length > 0 ? `${brokenImages.length} broken` : `${images.length} images OK`);

  // 3. Correct primary colour
  const primaryVar = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());
  check('Primary colour set', primaryVar.length > 0, primaryVar || 'not set');

  // 4. Testimonials present
  const testimonialCount = await page.$$eval('[class*="testimonial"], blockquote', els => els.length);
  check('Testimonials present', testimonialCount >= 1, `${testimonialCount} found`);

  // 5. Services present
  const serviceCards = await page.$$eval('[class*="service"], [href*="/services/"]', els => els.length);
  check('Services present', serviceCards >= 3, `${serviceCards} found`);

  // 6. Contact info present
  const pageText = await page.textContent('body');
  const hasPhone = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(pageText || '');
  check('Contact info present', hasPhone, hasPhone ? 'Phone found' : 'No phone detected');

  // 7. Correct business name
  const title = await page.title();
  check('Business name in title', !title.includes('AI Reno Demo') || siteId === 'demo', title);

  // 8. Site ID attribute
  const bodySiteId = await page.$eval('body', body => body.getAttribute('data-site-id'));
  check('Correct site ID', bodySiteId === siteId || siteId === 'demo', `Expected: ${siteId}, Got: ${bodySiteId}`);

} catch (e) {
  console.error(`  Error during verification: ${e.message}`);
} finally {
  await browser.close();
}

// Summary
const passed = results.filter(r => r.passed).length;
const total = results.length;
console.log(`\n${'─'.repeat(50)}`);
console.log(`Result: ${passed}/${total} checks passed`);

if (passed >= 7) {
  console.log('STATUS: PASS');
  process.exit(0);
} else {
  console.log('STATUS: FAIL (need 7/8 minimum)');
  process.exit(1);
}
```

---

## Task 5: README

**Create file:** `scripts/onboarding/README.md`

```markdown
# ConversionOS Tenant Onboarding Pipeline

Automated pipeline to create a bespoke ConversionOS tenant from a contractor's website URL.

## Quick Start

```bash
node scripts/onboarding/onboard.mjs \
  --url https://example-reno.ca \
  --site-id example-reno \
  --domain example.norbotsystems.com \
  --tier accelerate
```

## Individual Scripts

| Script | Purpose | Credits |
|--------|---------|---------|
| `score.mjs` | Fitness scoring (0-100) | 1 FireCrawl |
| `scrape.mjs` | Full extraction + AI generation | ~5 FireCrawl |
| `upload-images.mjs` | Image download → Supabase Storage | 0 |
| `provision.mjs` | DB seeding + proxy.ts update | 0 |
| `verify.mjs` | Playwright QA (8 checks) | 0 |
| `onboard.mjs` | Orchestrator (chains all above) | ~6 FireCrawl |
| `convert-color.mjs` | Hex → OKLCH conversion | 0 |

## Environment Variables

Set in `~/pipeline/scripts/.env` and `.env.local`:
- `FIRECRAWL_API_KEY` — FireCrawl Standard plan
- `OPENAI_API_KEY` — GPT for content generation
- `NEXT_PUBLIC_SUPABASE_URL` — Demo Supabase project
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key

## Tiers

- **elevate** ($249/mo): Website + visualizer + chat
- **accelerate** ($699/mo): + Admin dashboard + quotes
- **dominate** ($2,500/mo): + Voice agents + custom integrations
```

---

## Task 6: Update package.json

**File:** `package.json`

Add `onboard` script:
```json
"onboard": "node scripts/onboarding/onboard.mjs"
```

Add dev dependencies (if not already installed):
```json
"@mendable/firecrawl-js": "^1.0.0",
"culori": "^4.0.0"
```

Run `npm install` after updating package.json.

---

## Verification

After completing all changes:
1. `node scripts/onboarding/onboard.mjs --help` prints usage
2. `node scripts/onboarding/provision.mjs --help` prints usage
3. `node scripts/onboarding/upload-images.mjs --help` prints usage
4. `node scripts/onboarding/verify.mjs --help` prints usage
5. `npm run build` passes
6. README.md is complete and accurate

**Do NOT modify any files outside the scope listed above.**
