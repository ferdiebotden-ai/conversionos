# Unit 07: Scraper — FireCrawl Integration, Schema, Scoring, AI Content Generation

## Scope
Create the scraping pipeline scripts that extract contractor website data using FireCrawl, score fitness, convert colours, and generate missing content with GPT-5.2.

**Files to create:**
- `scripts/onboarding/schema.mjs`
- `scripts/onboarding/score.mjs`
- `scripts/onboarding/scrape.mjs`
- `scripts/onboarding/convert-color.mjs`

**Dependencies to install:**
```bash
npm install --save-dev @mendable/firecrawl-js culori
```

**Environment variables (already available in `~/pipeline/scripts/.env`):**
- `FIRECRAWL_API_KEY` — FireCrawl Standard plan
- `OPENAI_API_KEY` — OpenAI GPT-5.2

---

## Task 1: Convert Color Utility

**Create file:** `scripts/onboarding/convert-color.mjs`

Simple utility to convert hex colours to OKLCH format for CSS custom properties.

```javascript
#!/usr/bin/env node
/**
 * Convert hex colour to OKLCH string for CSS --primary variable.
 * Usage: node convert-color.mjs "#D60000"
 * Output: 0.50 0.22 27
 */

import { parse, converter } from 'culori';

const toOklch = converter('oklch');

export function hexToOklch(hex) {
  const parsed = parse(hex);
  if (!parsed) throw new Error(`Invalid colour: ${hex}`);
  const oklch = toOklch(parsed);
  // Format as "L C H" string (3 decimals for L and C, 0 for H)
  const l = oklch.l.toFixed(2);
  const c = (oklch.c || 0).toFixed(2);
  const h = Math.round(oklch.h || 0);
  return `${l} ${c} ${h}`;
}

// CLI mode
if (process.argv[1] && process.argv[1].endsWith('convert-color.mjs')) {
  const hex = process.argv[2];
  if (!hex) {
    console.error('Usage: node convert-color.mjs "#D60000"');
    process.exit(1);
  }
  console.log(hexToOklch(hex));
}
```

---

## Task 2: Extraction Schema

**Create file:** `scripts/onboarding/schema.mjs`

Zod schema defining every field we extract from contractor websites. Used by FireCrawl's schema extraction.

```javascript
/**
 * ContractorWebsiteSchema — Zod schema for structured data extraction.
 * Used with FireCrawl /extract endpoint.
 */

import { z } from 'zod';

export const ContractorWebsiteSchema = z.object({
  // Business identity
  business_name: z.string().describe('The company/business name'),
  tagline: z.string().optional().describe('Company tagline or slogan'),
  hero_headline: z.string().optional().describe('Main headline text on the homepage hero section'),

  // Contact info
  phone: z.string().optional().describe('Primary phone number'),
  email: z.string().optional().describe('Primary email address'),
  address: z.string().optional().describe('Street address'),
  city: z.string().optional().describe('City'),
  province: z.string().optional().describe('Province/state (e.g., ON, BC)'),
  postal: z.string().optional().describe('Postal/zip code'),
  website: z.string().optional().describe('Website URL'),

  // Social and booking
  social_facebook: z.string().optional().describe('Facebook page URL'),
  social_instagram: z.string().optional().describe('Instagram profile URL'),
  social_houzz: z.string().optional().describe('Houzz profile URL'),
  social_google: z.string().optional().describe('Google Business URL'),
  booking_url: z.string().optional().describe('Online booking/scheduling URL'),

  // Brand
  primary_color_hex: z.string().optional().describe('Primary brand colour as hex code (e.g., #D60000)'),
  logo_url: z.string().optional().describe('URL of the company logo image'),
  hero_image_url: z.string().optional().describe('URL of the homepage hero/banner image'),
  about_image_url: z.string().optional().describe('URL of the about section image'),

  // Company details
  principals: z.string().optional().describe('Owner/founder name(s)'),
  founded_year: z.string().optional().describe('Year the company was founded'),
  service_area: z.string().optional().describe('Geographic service area description'),
  certifications: z.array(z.string()).optional().describe('List of certifications and memberships'),
  about_copy: z.array(z.string()).optional().describe('About section paragraphs'),
  mission: z.string().optional().describe('Mission statement'),
  business_hours: z.string().optional().describe('Business hours (e.g., Mon-Fri 8am-5pm)'),

  // Team
  team_members: z.array(z.object({
    name: z.string(),
    role: z.string().optional(),
    photo_url: z.string().optional(),
    bio: z.string().optional(),
  })).optional().describe('Team member profiles'),

  // Services
  services: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    features: z.array(z.string()).optional(),
    packages: z.array(z.object({
      name: z.string(),
      starting_price: z.string().optional(),
      description: z.string().optional(),
    })).optional(),
    image_urls: z.array(z.string()).optional(),
  })).optional().describe('List of services offered'),

  // Testimonials
  testimonials: z.array(z.object({
    author: z.string(),
    quote: z.string(),
    project_type: z.string().optional(),
    rating: z.number().optional(),
    platform: z.string().optional().describe('Source platform (Google, Houzz, etc.)'),
  })).optional().describe('Customer testimonials/reviews'),

  // Portfolio
  portfolio: z.array(z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    image_url: z.string(),
    service_type: z.string().optional(),
    location: z.string().optional(),
  })).optional().describe('Portfolio/project gallery images'),

  // Additional content
  trust_badges: z.array(z.object({
    label: z.string(),
  })).optional().describe('Trust indicators, certifications shown prominently'),
  why_choose_us: z.array(z.object({
    title: z.string(),
    description: z.string(),
  })).optional().describe('Why choose us / advantages section'),
  process_steps: z.array(z.object({
    title: z.string(),
    description: z.string(),
  })).optional().describe('Service process steps'),
  values: z.array(z.object({
    title: z.string(),
    description: z.string(),
  })).optional().describe('Company values'),
});

export const ScrapedTenantSchema = ContractorWebsiteSchema.extend({
  _meta: z.object({
    source_url: z.string(),
    scraped_at: z.string(),
    firecrawl_credits_used: z.number().optional(),
    primary_oklch: z.string().optional(),
  }).optional(),
});
```

---

## Task 3: Fit Scoring

**Create file:** `scripts/onboarding/score.mjs`

Quick assessment using FireCrawl `/scrape` on homepage only (1 credit).

```javascript
#!/usr/bin/env node
/**
 * Score a contractor website for ConversionOS fit.
 * Usage: node score.mjs --url https://example-reno.ca
 *
 * Scoring criteria (total 100):
 *   has_services (3+ listed):      25 points
 *   has_testimonials (2+ quotes):  20 points
 *   has_portfolio (project photos): 20 points
 *   has_contact_info (phone/email): 15 points
 *   has_about (company story):     10 points
 *   ontario_based:                 10 points
 */

import FirecrawlApp from '@mendable/firecrawl-js';
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load env
function loadEnv() {
  const envPath = resolve(process.env.HOME, 'pipeline/scripts/.env');
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* ignore */ }
}

loadEnv();

const { values: args } = parseArgs({
  options: {
    url: { type: 'string' },
    help: { type: 'boolean' },
  },
});

if (args.help || !args.url) {
  console.log('Usage: node score.mjs --url https://example-reno.ca');
  process.exit(args.help ? 0 : 1);
}

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

console.log(`Scoring: ${args.url}`);
console.log('Scraping homepage (1 credit)...');

const result = await firecrawl.scrapeUrl(args.url, {
  formats: ['markdown'],
});

if (!result.success) {
  console.error('Scrape failed:', result.error);
  process.exit(1);
}

const md = (result.markdown || '').toLowerCase();

// Scoring criteria
const scores = {
  has_services: 0,
  has_testimonials: 0,
  has_portfolio: 0,
  has_contact: 0,
  has_about: 0,
  ontario_based: 0,
};

// Services (25 pts) — look for service-related keywords
const serviceKeywords = ['kitchen', 'bathroom', 'basement', 'renovation', 'remodel', 'flooring', 'addition', 'deck', 'outdoor', 'painting', 'drywall', 'roofing', 'plumbing', 'electrical'];
const serviceMatches = serviceKeywords.filter(k => md.includes(k));
if (serviceMatches.length >= 3) scores.has_services = 25;
else if (serviceMatches.length >= 1) scores.has_services = 15;

// Testimonials (20 pts)
const testimonialIndicators = ['testimonial', 'review', 'what our clients', 'what customers say', 'google review', 'houzz review', 'stars', '★'];
const testimonialMatches = testimonialIndicators.filter(k => md.includes(k));
if (testimonialMatches.length >= 2) scores.has_testimonials = 20;
else if (testimonialMatches.length >= 1) scores.has_testimonials = 10;

// Portfolio (20 pts)
const portfolioIndicators = ['portfolio', 'gallery', 'our work', 'projects', 'before and after', 'completed project'];
const portfolioMatches = portfolioIndicators.filter(k => md.includes(k));
if (portfolioMatches.length >= 1) scores.has_portfolio = 20;

// Contact (15 pts)
const hasPhone = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(md);
const hasEmail = /@/.test(md);
if (hasPhone && hasEmail) scores.has_contact = 15;
else if (hasPhone || hasEmail) scores.has_contact = 10;

// About (10 pts)
const aboutIndicators = ['about us', 'our story', 'who we are', 'our team', 'founded', 'established'];
if (aboutIndicators.some(k => md.includes(k))) scores.has_about = 10;

// Ontario (10 pts)
const ontarioIndicators = ['ontario', ', on', 'london', 'toronto', 'ottawa', 'stratford', 'kitchener', 'waterloo', 'hamilton', 'guelph'];
if (ontarioIndicators.some(k => md.includes(k))) scores.ontario_based = 10;

const total = Object.values(scores).reduce((a, b) => a + b, 0);

console.log('\n--- Fit Score ---');
for (const [key, val] of Object.entries(scores)) {
  console.log(`  ${key.padEnd(20)} ${val}`);
}
console.log(`  ${'TOTAL'.padEnd(20)} ${total}/100`);
console.log('');

if (total >= 70) {
  console.log('RESULT: GOOD FIT — auto-proceed');
} else if (total >= 50) {
  console.log('RESULT: MARGINAL FIT — proceed with manual content review');
} else {
  console.log('RESULT: POOR FIT — too different from template, consider manual setup');
}

process.exit(total >= 50 ? 0 : 1);
```

---

## Task 4: Full Scraper

**Create file:** `scripts/onboarding/scrape.mjs`

Three-step process:
1. FireCrawl `/scrape` on homepage with `formats: ['markdown']` for raw content
2. FireCrawl `/scrape` with LLM extraction using `ContractorWebsiteSchema` for structured data
3. GPT-5.2 to generate missing content (with strict guardrails)

```javascript
#!/usr/bin/env node
/**
 * Scrape a contractor website and extract structured data for ConversionOS tenant creation.
 * Usage: node scrape.mjs --url https://example-reno.ca --output /tmp/scraped.json
 *
 * Steps:
 * 1. FireCrawl scrape with schema extraction
 * 2. Multi-page fallback (/about, /services, /contact)
 * 3. Colour extraction and conversion
 * 4. AI content generation for missing fields (strict guardrails)
 * 5. Validation and completeness report
 */

import FirecrawlApp from '@mendable/firecrawl-js';
import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { ContractorWebsiteSchema } from './schema.mjs';
import { hexToOklch } from './convert-color.mjs';

// ─── Load env ──────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(process.env.HOME, 'pipeline/scripts/.env');
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* ignore */ }
}

loadEnv();

const { values: args } = parseArgs({
  options: {
    url: { type: 'string' },
    output: { type: 'string' },
    help: { type: 'boolean' },
  },
});

if (args.help || !args.url || !args.output) {
  console.log('Usage: node scrape.mjs --url https://example-reno.ca --output /tmp/scraped.json');
  process.exit(args.help ? 0 : 1);
}

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

console.log(`\nScraping: ${args.url}`);
console.log('─'.repeat(50));

// ─── Step 1: Homepage scrape with extraction ───────────
console.log('\n[1/4] Scraping homepage with schema extraction...');

const homepageResult = await firecrawl.scrapeUrl(args.url, {
  formats: ['extract', 'markdown'],
  extract: {
    schema: ContractorWebsiteSchema,
  },
});

if (!homepageResult.success) {
  console.error('Homepage scrape failed:', homepageResult.error);
  process.exit(1);
}

let extracted = homepageResult.extract || {};
console.log(`  Extracted ${Object.keys(extracted).filter(k => extracted[k] != null).length} fields from homepage`);

// ─── Step 2: Multi-page fallback ───────────────────────
console.log('\n[2/4] Checking additional pages for missing content...');

const fallbackPages = ['/about', '/about-us', '/our-team', '/services', '/contact', '/testimonials', '/reviews'];
const baseUrl = new URL(args.url).origin;

for (const path of fallbackPages) {
  // Skip if we already have good data for what this page provides
  const pageType = path.includes('about') || path.includes('team') ? 'about' :
                   path.includes('service') ? 'services' :
                   path.includes('contact') ? 'contact' :
                   path.includes('testimonial') || path.includes('review') ? 'testimonials' : 'other';

  const needsAbout = !extracted.about_copy?.length && !extracted.team_members?.length;
  const needsServices = !extracted.services?.length;
  const needsTestimonials = !extracted.testimonials?.length;

  if (pageType === 'about' && !needsAbout) continue;
  if (pageType === 'services' && !needsServices) continue;
  if (pageType === 'testimonials' && !needsTestimonials) continue;

  try {
    console.log(`  Trying ${baseUrl}${path}...`);
    const pageResult = await firecrawl.scrapeUrl(`${baseUrl}${path}`, {
      formats: ['extract'],
      extract: { schema: ContractorWebsiteSchema },
    });

    if (pageResult.success && pageResult.extract) {
      const pageData = pageResult.extract;
      // Merge missing fields only
      for (const [key, val] of Object.entries(pageData)) {
        if (val != null && (extracted[key] == null || (Array.isArray(val) && val.length > 0 && (!extracted[key] || extracted[key].length === 0)))) {
          extracted[key] = val;
          console.log(`    Found: ${key}`);
        }
      }
    }
  } catch {
    // Page doesn't exist, skip
  }
}

// ─── Step 3: Colour conversion ─────────────────────────
console.log('\n[3/4] Processing colours...');

let primaryOklch = '';
if (extracted.primary_color_hex) {
  try {
    primaryOklch = hexToOklch(extracted.primary_color_hex);
    console.log(`  ${extracted.primary_color_hex} → oklch(${primaryOklch})`);
  } catch (e) {
    console.log(`  Warning: Could not convert colour ${extracted.primary_color_hex}: ${e.message}`);
  }
}

// ─── Step 4: AI content generation ─────────────────────
console.log('\n[4/4] Generating content for missing fields...');

const generationLog = {
  generated_at: new Date().toISOString(),
  source_url: args.url,
  fields: [],
  scraped_fields: Object.keys(extracted).filter(k => extracted[k] != null && (!Array.isArray(extracted[k]) || extracted[k].length > 0)),
  hidden_sections: [],
};

// Fields safe to generate (factual, derivable from scraped data)
const SAFE_TO_GENERATE = ['tagline', 'mission', 'why_choose_us', 'values', 'process_steps', 'hero_headline'];
// Fields NEVER to generate (must be real data or hidden)
const NEVER_GENERATE = ['testimonials', 'certifications', 'team_members', 'phone', 'email', 'address', 'founded_year', 'portfolio'];

// Check what's missing and safe to generate
const missingFields = SAFE_TO_GENERATE.filter(f => {
  const val = extracted[f];
  return val == null || val === '' || (Array.isArray(val) && val.length === 0);
});

if (missingFields.length > 0 && process.env.OPENAI_API_KEY) {
  console.log(`  Missing fields safe to generate: ${missingFields.join(', ')}`);

  const contextForAI = JSON.stringify({
    business_name: extracted.business_name,
    services: extracted.services?.map(s => s.name),
    certifications: extracted.certifications,
    about_copy: extracted.about_copy,
    city: extracted.city,
    province: extracted.province,
    service_area: extracted.service_area,
    tagline: extracted.tagline,
  }, null, 2);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are generating website copy for a renovation contractor. You may ONLY state facts directly evidenced in the scraped data provided. Never invent credentials, awards, team members, testimonials, or numeric claims. If you cannot write something truthful, return null for that field. Return JSON with these keys (only include fields you can generate): tagline, mission, hero_headline, why_choose_us (array of {title, description}), values (array of {title, description, iconHint}), process_steps (array of {title, description}).`
          },
          {
            role: 'user',
            content: `Generate missing website content for this contractor. Only generate these fields: ${missingFields.join(', ')}\n\nScraped data:\n${contextForAI}`
          }
        ],
      }),
    });

    const aiResult = await response.json();
    const generated = JSON.parse(aiResult.choices[0].message.content);

    for (const [field, value] of Object.entries(generated)) {
      if (value != null && missingFields.includes(field)) {
        extracted[field] = value;
        generationLog.fields.push({
          field,
          source: 'ai_generated',
          prompt_context: `derived from scraped ${field === 'tagline' ? 'business name and services' : 'data'}`,
          value,
        });
        console.log(`  Generated: ${field}`);
      }
    }
  } catch (e) {
    console.log(`  AI generation failed: ${e.message}`);
  }
} else if (missingFields.length > 0) {
  console.log(`  Skipping AI generation (no OPENAI_API_KEY or nothing to generate)`);
}

// Check for sections that should be hidden (NEVER generate, not present)
for (const field of NEVER_GENERATE) {
  const val = extracted[field];
  if (val == null || val === '' || (Array.isArray(val) && val.length === 0)) {
    generationLog.hidden_sections.push(field);
  }
}

// ─── Build output ──────────────────────────────────────
const output = {
  ...extracted,
  _meta: {
    source_url: args.url,
    scraped_at: new Date().toISOString(),
    primary_oklch: primaryOklch,
  },
};

// ─── Validation report ─────────────────────────────────
console.log('\n─── Completeness Report ───');

const required = ['business_name'];
const recommended = ['tagline', 'hero_image_url', 'about_copy', 'certifications', 'services'];
const optional = ['team_members', 'portfolio', 'process_steps', 'values', 'testimonials'];
const contactRequired = ['phone', 'email'];

const missing = { required: [], recommended: [], optional: [] };
for (const f of required) {
  if (!extracted[f]) missing.required.push(f);
}
for (const f of contactRequired) {
  if (!extracted.phone && !extracted.email) { missing.required.push('phone OR email'); break; }
}
for (const f of recommended) {
  const val = extracted[f];
  if (!val || (Array.isArray(val) && val.length === 0)) missing.recommended.push(f);
}
for (const f of optional) {
  const val = extracted[f];
  if (!val || (Array.isArray(val) && val.length === 0)) missing.optional.push(f);
}

if (missing.required.length > 0) {
  console.log(`  REQUIRED (missing): ${missing.required.join(', ')}`);
}
if (missing.recommended.length > 0) {
  console.log(`  RECOMMENDED (missing): ${missing.recommended.join(', ')}`);
}
if (missing.optional.length > 0) {
  console.log(`  OPTIONAL (missing): ${missing.optional.join(', ')}`);
}
if (missing.required.length === 0 && missing.recommended.length === 0) {
  console.log('  All required and recommended fields present!');
}

// ─── Write output ──────────────────────────────────────
mkdirSync(dirname(args.output), { recursive: true });
writeFileSync(args.output, JSON.stringify(output, null, 2));
console.log(`\nOutput written to: ${args.output}`);

// Write generation log
const logPath = args.output.replace('.json', '-generation-log.json');
writeFileSync(logPath, JSON.stringify(generationLog, null, 2));
console.log(`Generation log: ${logPath}`);

if (missing.required.length > 0) {
  console.log('\nWARNING: Required fields missing. Manual review needed.');
  process.exit(1);
}
```

---

## Verification

After creating all files:
1. `node scripts/onboarding/convert-color.mjs "#D60000"` outputs `0.50 0.22 27` (approximately)
2. `scripts/onboarding/schema.mjs` exports `ContractorWebsiteSchema` without errors
3. `node scripts/onboarding/score.mjs --help` prints usage
4. `node scripts/onboarding/scrape.mjs --help` prints usage
5. All scripts use ES modules (`.mjs` extension, `import` syntax)
6. All scripts load env from `~/pipeline/scripts/.env`

**Do NOT modify any files outside the `scripts/onboarding/` directory.**
