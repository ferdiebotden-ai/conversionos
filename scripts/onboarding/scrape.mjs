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
