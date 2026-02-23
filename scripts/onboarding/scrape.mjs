#!/usr/bin/env node
/**
 * Scrape a contractor website and extract structured data for ConversionOS tenant creation.
 * Usage: node scrape.mjs --url https://example-reno.ca --output /tmp/scraped.json
 *
 * Enhanced pipeline (7 steps):
 * 1. FireCrawl homepage scrape with schema extraction + markdown
 * 2. Multi-page fallback scrapes (/about, /services, /contact, etc.)
 * 3. Markdown enrichment — AI extracts services, images, colours from raw markdown
 * 4. Colour extraction and OKLCH conversion
 * 5. AI content generation for remaining gaps (strict guardrails)
 * 6. Quality audit — scores each section, flags issues, deployment readiness
 * 7. Validation report and output
 */

import FirecrawlApp from '@mendable/firecrawl-js';
import { z } from 'zod';
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { ContractorWebsiteSchema } from './schema.mjs';
import { hexToOklch } from './convert-color.mjs';

// ─── Load env ──────────────────────────────────────────
function loadEnv() {
  // Pipeline env first (API keys), then .env.local (Supabase vars)
  for (const envFile of [resolve(process.env.HOME, 'pipeline/scripts/.env'), '.env.local']) {
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

const requiredVars = ['FIRECRAWL_API_KEY'];
const missingVars = requiredVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`Missing required env vars: ${missingVars.join(', ')}`);
  console.error('Add to ~/pipeline/scripts/.env');
  process.exit(1);
}

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

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY }).v1;

// Pre-convert Zod v4 schema to JSON Schema (FireCrawl's converter broken for Zod v4)
const jsonSchema = z.toJSONSchema(ContractorWebsiteSchema);
delete jsonSchema.$schema; // FireCrawl API rejects draft-2020-12 $schema header

console.log(`\nScraping: ${args.url}`);
console.log('═'.repeat(60));

// ─── Helper: AI call (Claude primary → OpenAI fallback) ──
// Primary: claude -p via Max subscription ($0 marginal cost, Opus 4.6)
// Fallback: OpenAI GPT-5.2 API (if Claude CLI unavailable or inside Claude Code session)
function claudeCli(systemPrompt, userPrompt) {
  try {
    const prompt = `${systemPrompt}\n\n---\n\n${userPrompt}\n\nRespond with valid JSON only. No markdown fences, no explanation.`;
    const raw = execFileSync('claude', ['-p', prompt, '--output-format', 'json', '--max-turns', '1', '--model', 'sonnet'], {
      encoding: 'utf-8',
      timeout: 60_000, // 60s — fast enough for generation tasks
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, CLAUDECODE: undefined }, // Allow nesting
    });
    const envelope = JSON.parse(raw);
    if (envelope.is_error) throw new Error(envelope.result);
    // Claude returns text in result — strip markdown fences and parse as JSON
    let text = (envelope.result || '').trim();
    // Strip ```json ... ``` fences (common Claude output pattern)
    text = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();
    return JSON.parse(text);
  } catch (e) {
    return { _error: e.message };
  }
}

async function openaiApi(systemPrompt, userPrompt) {
  if (!process.env.OPENAI_API_KEY) return { _error: 'No OPENAI_API_KEY' };
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.2',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    const result = await response.json();
    if (!result.choices?.length) {
      throw new Error(result.error?.message || 'No choices in response');
    }
    return JSON.parse(result.choices[0].message.content);
  } catch (e) {
    return { _error: e.message };
  }
}

async function ai(systemPrompt, userPrompt) {
  // Try Claude CLI first (Max subscription — free)
  console.log('    Trying Claude (Max subscription)...');
  const claudeResult = claudeCli(systemPrompt, userPrompt);
  if (!claudeResult._error) {
    console.log('    ✓ Claude succeeded');
    return claudeResult;
  }
  console.log(`    Claude unavailable: ${claudeResult._error.substring(0, 80)}`);

  // Fallback to OpenAI GPT-5.2
  console.log('    Falling back to OpenAI GPT-5.2...');
  const openaiResult = await openaiApi(systemPrompt, userPrompt);
  if (!openaiResult._error) {
    console.log('    ✓ OpenAI succeeded');
    return openaiResult;
  }
  console.log(`    OpenAI failed: ${openaiResult._error.substring(0, 80)}`);
  return null;
}

// ─── Helper: Extract image URLs from markdown ────────────
function extractImageUrls(markdown) {
  const urls = [];
  const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    const alt = match[1] || '';
    const url = match[2];
    if (url && !url.includes('data:') && !url.includes('.svg') && !url.includes('icon')) {
      urls.push({ alt, url });
    }
  }
  return urls;
}

// ─── Helper: Extract hex colours from markdown/HTML ──────
function extractHexColors(markdown) {
  const hexRegex = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?!\w)/g;
  const colors = [...new Set((markdown.match(hexRegex) || []))];
  // Filter out common non-brand colours (black, white, greys)
  const skipColors = ['#000', '#000000', '#fff', '#ffffff', '#333', '#333333',
    '#666', '#666666', '#999', '#999999', '#ccc', '#cccccc', '#eee', '#eeeeee',
    '#f5f5f5', '#fafafa', '#f0f0f0', '#ddd', '#dddddd'];
  return colors.filter(c => !skipColors.includes(c.toLowerCase()));
}

const allMarkdown = [];
let firecrawlCredits = 0;

// ─── Step 1: Homepage scrape ─────────────────────────────
console.log('\n[1/7] Scraping homepage with schema extraction...');

const homepageResult = await firecrawl.scrapeUrl(args.url, {
  formats: ['extract', 'markdown'],
  extract: { schema: jsonSchema },
});
firecrawlCredits++;

if (!homepageResult.success) {
  console.error('Homepage scrape failed:', homepageResult.error);
  process.exit(1);
}

let extracted = homepageResult.extract || {};
if (homepageResult.markdown) allMarkdown.push(homepageResult.markdown);
console.log(`  Extracted ${Object.keys(extracted).filter(k => extracted[k] != null).length} fields from homepage`);
console.log(`  Markdown captured: ${(homepageResult.markdown?.length || 0).toLocaleString()} chars`);

// ─── Step 2: Multi-page fallback ─────────────────────────
console.log('\n[2/7] Checking additional pages for missing content...');

const fallbackPages = ['/about', '/about-us', '/our-team', '/services', '/our-services',
  '/contact', '/contact-us', '/testimonials', '/reviews', '/portfolio', '/our-work', '/gallery'];
const baseUrl = new URL(args.url).origin;

for (const path of fallbackPages) {
  const pageType = path.includes('about') || path.includes('team') ? 'about' :
                   path.includes('service') ? 'services' :
                   path.includes('contact') ? 'contact' :
                   path.includes('testimonial') || path.includes('review') ? 'testimonials' :
                   path.includes('portfolio') || path.includes('work') || path.includes('gallery') ? 'portfolio' : 'other';

  const needsAbout = !extracted.about_copy?.length && !extracted.team_members?.length;
  const needsServices = !extracted.services?.length;
  const needsTestimonials = !extracted.testimonials?.length;
  const needsPortfolio = !extracted.portfolio?.length;

  if (pageType === 'about' && !needsAbout) continue;
  if (pageType === 'services' && !needsServices) continue;
  if (pageType === 'testimonials' && !needsTestimonials) continue;
  if (pageType === 'portfolio' && !needsPortfolio) continue;

  try {
    console.log(`  Trying ${baseUrl}${path}...`);
    const pageResult = await firecrawl.scrapeUrl(`${baseUrl}${path}`, {
      formats: ['extract', 'markdown'],
      extract: { schema: jsonSchema },
    });
    firecrawlCredits++;

    if (pageResult.success) {
      if (pageResult.markdown) allMarkdown.push(pageResult.markdown);
      if (pageResult.extract) {
        const pageData = pageResult.extract;
        for (const [key, val] of Object.entries(pageData)) {
          if (val != null && (extracted[key] == null || (Array.isArray(val) && val.length > 0 && (!extracted[key] || extracted[key].length === 0)))) {
            extracted[key] = val;
            console.log(`    Found: ${key}`);
          }
        }
      }
    }
  } catch {
    // Page doesn't exist, skip silently
  }
}

console.log(`  Total markdown collected: ${allMarkdown.reduce((s, m) => s + m.length, 0).toLocaleString()} chars across ${allMarkdown.length} pages`);

// ─── Step 2b: Hallucination filter ──────────────────────
console.log('\n[2b] Filtering hallucinated placeholder data...');

// Known placeholder patterns that FireCrawl's LLM sometimes generates
const PLACEHOLDER_PATTERNS = [
  /^jane\s+doe$/i, /^john\s+doe$/i, /^john\s+smith$/i,
  /^your\s*(business|company)/i, /^example/i, /^sample/i,
  /^lorem\s+ipsum/i, /^test\s/i, /^placeholder/i,
  /^(www\.)?yourbusiness\.com/i, /^(www\.)?example\.com/i,
];
const PLACEHOLDER_VALUES = new Set([
  'manager', 'ceo', 'owner', 'staff member', 'team member',
  'member of xyz association', 'certified professional',
  'description of project a', 'description of project b',
  'city a', 'city b', 'consulting',
  'project a', 'project b', 'description of the project',
  'bbb accredited', '5-star service', // generic trust badges with no evidence
]);

// Patterns for certifications/trust badges that are clearly generic
const GENERIC_CERT_PATTERNS = [
  /^certified\s+professional$/i,
  /^member\s+of\s+\w+\s+association$/i,
  /^(bbb|better business bureau)\s+(accredited|a\+)/i,
  /^\d+-star\s+service$/i,
  /^licensed\s+and\s+insured$/i,
  /^fully\s+(licensed|insured|bonded)$/i,
];

function isPlaceholder(val) {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (PLACEHOLDER_VALUES.has(trimmed.toLowerCase())) return true;
    if (PLACEHOLDER_PATTERNS.some(p => p.test(trimmed))) return true;
    if (GENERIC_CERT_PATTERNS.some(p => p.test(trimmed))) return true;
    if (/yourbusiness\.com|example\.com|placeholder/i.test(trimmed)) return true;
  }
  return false;
}

const sourceDomain = new URL(args.url).hostname.replace(/^www\./, '');

function filterPlaceholders(obj) {
  if (typeof obj !== 'object' || obj === null) return isPlaceholder(obj) ? null : obj;
  if (Array.isArray(obj)) {
    return obj.filter(item => {
      if (typeof item === 'string') return !isPlaceholder(item);
      if (typeof item === 'object' && item !== null) {
        // Check if any key value is a known placeholder
        const vals = Object.values(item);
        const placeholderCount = vals.filter(v => typeof v === 'string' && isPlaceholder(v)).length;
        const stringCount = vals.filter(v => typeof v === 'string').length;
        // If more than half the string fields are placeholder, drop the whole item
        if (stringCount > 0 && placeholderCount / stringCount >= 0.5) return false;
        // Check for off-domain URLs — any URL not matching the source domain is likely hallucinated
        if (vals.some(v => typeof v === 'string' && /\.(com|ca|org|net)\b/i.test(v) && !v.includes(sourceDomain))) return false;
        return true;
      }
      return true;
    });
  }
  return obj;
}

let filteredCount = 0;
for (const [key, val] of Object.entries(extracted)) {
  if (Array.isArray(val)) {
    const filtered = filterPlaceholders(val);
    if (filtered.length < val.length) {
      const removed = val.length - filtered.length;
      filteredCount += removed;
      extracted[key] = filtered;
      console.log(`  Removed ${removed} placeholder item(s) from ${key}`);
    }
  } else if (typeof val === 'string' && isPlaceholder(val)) {
    extracted[key] = '';
    filteredCount++;
    console.log(`  Removed placeholder value from ${key}: "${val}"`);
  }
}

// Cross-reference high-hallucination-risk fields against raw markdown
// If a certification/trust badge/portfolio item doesn't appear in the site content, it's likely hallucinated
const VERIFY_AGAINST_MARKDOWN = ['certifications', 'trust_badges', 'portfolio'];
const mdLower = allMarkdown.join(' ').toLowerCase();

for (const field of VERIFY_AGAINST_MARKDOWN) {
  if (!Array.isArray(extracted[field]) || extracted[field].length === 0) continue;

  const before = extracted[field].length;
  extracted[field] = extracted[field].filter(item => {
    // Get the primary text to verify (label, title, or string itself)
    const text = typeof item === 'string' ? item :
      (item.label || item.title || item.name || '');
    if (!text) return true; // Can't verify, keep it

    // Check if any significant words from the text appear in the markdown
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (words.length === 0) return true;

    // Require at least 50% of significant words to appear in markdown
    const matchCount = words.filter(w => mdLower.includes(w)).length;
    return matchCount / words.length >= 0.5;
  });

  const removed = before - extracted[field].length;
  if (removed > 0) {
    filteredCount += removed;
    console.log(`  Removed ${removed} unverified item(s) from ${field} (not found in site content)`);
  }
}

console.log(`  Filtered ${filteredCount} placeholder(s) total`);

// ─── Step 3: Markdown enrichment (GPT fallback) ─────────
console.log('\n[3/7] Markdown enrichment — filling gaps from raw content...');

const combinedMarkdown = allMarkdown.join('\n\n---PAGE BREAK---\n\n');

// 3a. Extract services from markdown if still empty
if (!extracted.services?.length && combinedMarkdown.length > 200) {
  console.log('  Services missing — extracting from markdown via GPT...');
  const servicesResult = await ai(
    `You are extracting renovation/construction services from a contractor website's raw markdown content.
Return JSON: { "services": [{ "name": "Kitchen Renovation", "description": "Full kitchen remodels including...", "features": ["Custom cabinetry", "Countertop installation"] }] }
Rules:
- Only list services actually mentioned on the website
- Write natural, professional descriptions (2-3 sentences)
- Include 3-5 features per service where evidence exists
- Do NOT invent services not mentioned on the site
- Aim for 3-8 services total`,
    `Extract all renovation/construction services from this contractor website:\n\n${combinedMarkdown.substring(0, 12000)}`
  );
  if (servicesResult?.services?.length > 0) {
    extracted.services = servicesResult.services;
    console.log(`    Extracted ${servicesResult.services.length} services: ${servicesResult.services.map(s => s.name).join(', ')}`);
  }
}

// 3b. Extract images from markdown
const imageUrls = extractImageUrls(combinedMarkdown);
if (imageUrls.length > 0) {
  console.log(`  Found ${imageUrls.length} images in markdown`);

  if (!extracted.hero_image_url) {
    // Best hero candidate: large banner-type images, first image, or images with relevant alt text
    const heroCandidate = imageUrls.find(i =>
      /hero|banner|header|main|home|slider|feature/i.test(i.alt) ||
      /hero|banner|header|slider/i.test(i.url)
    ) || imageUrls[0];
    if (heroCandidate) {
      extracted.hero_image_url = heroCandidate.url;
      console.log(`    Hero image: ${heroCandidate.url.substring(0, 80)}...`);
    }
  }

  if (!extracted.about_image_url) {
    const aboutCandidate = imageUrls.find(i =>
      /about|team|owner|founder|principal|staff/i.test(i.alt) ||
      /about|team/i.test(i.url)
    );
    if (aboutCandidate) {
      extracted.about_image_url = aboutCandidate.url;
      console.log(`    About image: ${aboutCandidate.url.substring(0, 80)}...`);
    }
  }

  if (!extracted.logo_url) {
    const logoCandidate = imageUrls.find(i =>
      /logo/i.test(i.alt) || /logo/i.test(i.url)
    );
    if (logoCandidate) {
      extracted.logo_url = logoCandidate.url;
      console.log(`    Logo: ${logoCandidate.url.substring(0, 80)}...`);
    }
  }
}

// 3c. Extract brand colour from markdown, HTML, or GPT
if (!extracted.primary_color_hex) {
  const hexColors = extractHexColors(combinedMarkdown);
  if (hexColors.length > 0) {
    extracted.primary_color_hex = hexColors[0];
    console.log(`  Brand colour from markup: ${hexColors[0]}`);
  }

  // Fallback: fetch raw HTML + linked CSS files and find brand colours
  if (!extracted.primary_color_hex) {
    console.log('  No hex colours in markdown — fetching HTML + CSS for brand colours...');
    try {
      const fetchOpts = {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NorBotScraper/1.0)' },
        signal: AbortSignal.timeout(10000),
      };
      const htmlResponse = await fetch(args.url, fetchOpts);
      const html = await htmlResponse.text();

      // Find linked CSS files and fetch the most likely brand-customised ones
      const allCssLinks = [...html.matchAll(/href="([^"]*\.css[^"]*)"/gi)]
        .map(m => m[1])
        .filter(href => !/bootstrap|vendor|normalize|reset|font|icon|socicon|tether|formstyler/i.test(href));

      // Prioritise: additional/custom files first, then theme/style, then others
      const cssLinks = allCssLinks.sort((a, b) => {
        const scoreA = /additional|custom/i.test(a) ? 2 : /theme|main|app/i.test(a) ? 1 : 0;
        const scoreB = /additional|custom/i.test(b) ? 2 : /theme|main|app/i.test(b) ? 1 : 0;
        return scoreB - scoreA;
      });

      let allCssContent = html; // Start with inline styles

      // Fetch up to 4 CSS files
      for (const cssHref of cssLinks.slice(0, 4)) {
        try {
          const cssUrl = cssHref.startsWith('http') ? cssHref : `${baseUrl}/${cssHref.replace(/^\//, '')}`;
          const cssResponse = await fetch(cssUrl, { ...fetchOpts, signal: AbortSignal.timeout(5000) });
          allCssContent += '\n' + await cssResponse.text();
        } catch { /* skip */ }
      }

      // Count colour occurrences — most-used non-grey colour is likely brand
      const hexRegex = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?!\w)/g;
      const colorCounts = new Map();
      let match;
      while ((match = hexRegex.exec(allCssContent)) !== null) {
        const hex = match[0].toLowerCase();
        // Expand 3-char to 6-char
        const expanded = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
        const r = parseInt(expanded.slice(1, 3), 16);
        const g = parseInt(expanded.slice(3, 5), 16);
        const b = parseInt(expanded.slice(5, 7), 16);
        // Skip greys (all channels within 25 of each other)
        if (Math.max(r, g, b) - Math.min(r, g, b) < 25) continue;
        colorCounts.set(expanded, (colorCounts.get(expanded) || 0) + 1);
      }

      // Also check rgb/rgba
      const rgbRegex = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
      while ((match = rgbRegex.exec(allCssContent)) !== null) {
        const r = Number(match[1]), g = Number(match[2]), b = Number(match[3]);
        if (Math.max(r, g, b) - Math.min(r, g, b) < 25) continue;
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
      }

      if (colorCounts.size > 0) {
        // Sort by frequency — most-used non-grey colour wins
        const sorted = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]);
        extracted.primary_color_hex = sorted[0][0];
        console.log(`    Brand colour from CSS: ${sorted[0][0]} (used ${sorted[0][1]}x, ${colorCounts.size} candidates)`);
        if (sorted.length > 1) {
          console.log(`    Runner-up: ${sorted[1][0]} (${sorted[1][1]}x)`);
        }
      }
    } catch (e) {
      console.log(`    HTML/CSS fetch failed: ${e.message}`);
    }
  }

  // Last resort: GPT inference from content
  if (!extracted.primary_color_hex && combinedMarkdown.length > 200) {
    console.log('  Still no colour — asking GPT to identify brand colour...');
    const colorResult = await ai(
      `You are analyzing a contractor website to identify their primary brand colour.
Return JSON: { "primary_color_hex": "#RRGGBB", "confidence": "high|medium|low", "reasoning": "..." }
Look for clues in the content: colour words in the business name, brand descriptions, industry norms.
If you cannot confidently identify a colour, return a professional renovation-appropriate colour.`,
      `Identify the primary brand colour from this contractor website:\n\n${combinedMarkdown.substring(0, 6000)}`
    );
    if (colorResult?.primary_color_hex) {
      extracted.primary_color_hex = colorResult.primary_color_hex;
      console.log(`    GPT suggested: ${colorResult.primary_color_hex} (${colorResult.confidence}: ${colorResult.reasoning})`);
    }
  }
}

// 3d. If still missing key fields, try a comprehensive GPT extraction as last resort
const criticalMissing = [];
if (!extracted.business_name) criticalMissing.push('business_name');
if (!extracted.phone && !extracted.email) criticalMissing.push('contact info');
if (!extracted.city) criticalMissing.push('city');

if (criticalMissing.length > 0 && combinedMarkdown.length > 200) {
  console.log(`  Critical fields missing (${criticalMissing.join(', ')}) — full GPT extraction...`);
  const fullResult = await ai(
    `Extract business information from this contractor website markdown.
Return JSON with any of these fields you can find: business_name, phone, email, address, city, province, postal, website, principals, founded_year, service_area, business_hours.
Only include fields you are confident about from the content.`,
    combinedMarkdown.substring(0, 10000)
  );
  if (fullResult) {
    for (const [key, val] of Object.entries(fullResult)) {
      if (val && !extracted[key]) {
        extracted[key] = val;
        console.log(`    Recovered: ${key} = ${typeof val === 'string' ? val.substring(0, 50) : JSON.stringify(val).substring(0, 50)}`);
      }
    }
  }
}

// ─── Step 4: Colour conversion ───────────────────────────
console.log('\n[4/7] Processing colours...');

let primaryOklch = '';
if (extracted.primary_color_hex) {
  try {
    primaryOklch = hexToOklch(extracted.primary_color_hex);
    console.log(`  ${extracted.primary_color_hex} → oklch(${primaryOklch})`);
  } catch (e) {
    console.log(`  Warning: Could not convert colour ${extracted.primary_color_hex}: ${e.message}`);
  }
}

// ─── Step 5: AI content generation ───────────────────────
console.log('\n[5/7] AI content generation for remaining gaps...');

const generationLog = {
  generated_at: new Date().toISOString(),
  source_url: args.url,
  firecrawl_credits_used: firecrawlCredits,
  fields: [],
  scraped_fields: Object.keys(extracted).filter(k => extracted[k] != null && (!Array.isArray(extracted[k]) || extracted[k].length > 0)),
  hidden_sections: [],
};

// Fields safe to generate (derivable from scraped data)
const SAFE_TO_GENERATE = ['tagline', 'mission', 'why_choose_us', 'values', 'process_steps', 'hero_headline'];
// Fields NEVER to generate (must be real or hidden)
const NEVER_GENERATE = ['testimonials', 'certifications', 'team_members', 'phone', 'email', 'address', 'founded_year', 'portfolio'];

const missingFields = SAFE_TO_GENERATE.filter(f => {
  const val = extracted[f];
  return val == null || val === '' || (Array.isArray(val) && val.length === 0);
});

if (missingFields.length > 0) {
  console.log(`  Generating: ${missingFields.join(', ')}`);

  const contextForAI = JSON.stringify({
    business_name: extracted.business_name,
    services: extracted.services?.map(s => ({ name: s.name, description: s.description })),
    certifications: extracted.certifications,
    about_copy: extracted.about_copy,
    city: extracted.city,
    province: extracted.province,
    service_area: extracted.service_area,
    tagline: extracted.tagline,
    mission: extracted.mission,
    principals: extracted.principals,
  }, null, 2);

  const generated = await ai(
    `You are generating website copy for a renovation contractor. Rules:
- ONLY state facts evidenced in the scraped data. Never invent credentials, awards, team members, testimonials, or numeric claims.
- Write in a professional, warm tone appropriate for a home renovation company.
- tagline: 8-12 words, compelling and specific to the business.
- hero_headline: attention-grabbing, 5-10 words, speaks to homeowners.
- mission: 1-2 sentences about the company's purpose.
- why_choose_us: 3 items, each with title (3-4 words) and description (1-2 sentences). Base on real attributes.
- values: 3-4 items with title, description, and iconHint (one of: heart, shield, star, award, users, home, hammer, leaf, target, zap).
- process_steps: 4 steps with title and description reflecting a realistic renovation workflow.
Return JSON. Only include fields you can generate truthfully. Return null for fields you cannot.`,
    `Generate these missing fields: ${missingFields.join(', ')}\n\nScraped data:\n${contextForAI}`
  );

  if (generated) {
    for (const [field, value] of Object.entries(generated)) {
      if (value != null && missingFields.includes(field)) {
        extracted[field] = value;
        generationLog.fields.push({ field, source: 'ai_generated', value });
        console.log(`  ✓ Generated: ${field}`);
      }
    }
  }
}

// 5b. Augment undersized arrays (e.g., expand 2 why_choose_us items to 3+)
const ARRAY_MINIMUMS = { why_choose_us: 3, values: 3, process_steps: 4 };
const fieldsToAugment = Object.entries(ARRAY_MINIMUMS).filter(([field, min]) =>
  Array.isArray(extracted[field]) && extracted[field].length > 0 && extracted[field].length < min
);

if (fieldsToAugment.length > 0) {
  console.log(`  Augmenting undersized: ${fieldsToAugment.map(([f, m]) => `${f} (${extracted[f].length}→${m})`).join(', ')}`);

  const contextForAI = JSON.stringify({
    business_name: extracted.business_name,
    services: extracted.services?.map(s => s.name),
    about_copy: extracted.about_copy,
    city: extracted.city,
    existing: Object.fromEntries(fieldsToAugment.map(([f]) => [f, extracted[f]])),
  }, null, 2);

  const augmented = await ai(
    `You are augmenting website copy for a renovation contractor. Existing items are provided — add MORE items to reach the target count.
Rules:
- Do NOT repeat existing items. Only add NEW ones.
- Base new items on evidence from the scraped data (services offered, about copy, location).
- Never invent credentials, awards, or numeric claims.
- why_choose_us items: { "title": "3-4 words", "description": "1-2 sentences" }
- values items: { "title": "1-2 words", "description": "1-2 sentences", "iconHint": "heart|shield|star|award|users|home|hammer|leaf|target|zap" }
- process_steps items: { "title": "1-3 words", "description": "1-2 sentences" }
Return JSON with ONLY the new items to add (not the existing ones). Example: { "why_choose_us": [{ "title": "New Item", "description": "..." }] }`,
    `Add items to reach minimums. ${fieldsToAugment.map(([f, m]) => `${f}: have ${extracted[f].length}, need ${m}`).join('. ')}.\n\nBusiness context:\n${contextForAI}`
  );

  if (augmented) {
    for (const [field] of fieldsToAugment) {
      if (Array.isArray(augmented[field]) && augmented[field].length > 0) {
        extracted[field] = [...extracted[field], ...augmented[field]];
        generationLog.fields.push({ field, source: 'ai_augmented', added: augmented[field].length });
        console.log(`  ✓ Augmented: ${field} (now ${extracted[field].length} items)`);
      }
    }
  }
}

// 5c. Post-process: ensure values have iconHint defaults
const DEFAULT_ICONS = ['heart', 'shield', 'star', 'award', 'hammer', 'home', 'target', 'zap'];
if (Array.isArray(extracted.values)) {
  extracted.values.forEach((v, i) => {
    if (!v.iconHint) v.iconHint = DEFAULT_ICONS[i % DEFAULT_ICONS.length];
  });
}

// Track sections that should be hidden (NEVER generate, not present)
for (const field of NEVER_GENERATE) {
  const val = extracted[field];
  if (val == null || val === '' || (Array.isArray(val) && val.length === 0)) {
    generationLog.hidden_sections.push(field);
  }
}

// ─── Step 6: Quality audit ───────────────────────────────
console.log('\n[6/7] Quality audit...');

function auditField(name, value, weight, criteria) {
  const present = value != null && value !== '' && (!Array.isArray(value) || value.length > 0);
  let score = 0;
  const issues = [];

  if (!present) {
    issues.push(`${name} is missing`);
    return { name, score: 0, maxScore: weight, issues, status: 'missing' };
  }

  score = weight * 0.6; // Base score for being present

  // Quality checks
  if (typeof value === 'string') {
    if (value.length >= (criteria?.minLength || 3)) score += weight * 0.2;
    else issues.push(`${name} is too short (${value.length} chars)`);

    if (value.length <= (criteria?.maxLength || 500)) score += weight * 0.2;
    else issues.push(`${name} is too long (${value.length} chars)`);
  }

  if (Array.isArray(value)) {
    const minItems = criteria?.minItems || 1;
    if (value.length >= minItems) score += weight * 0.4;
    else {
      score += weight * 0.2;
      issues.push(`${name} has only ${value.length} items (recommended: ${minItems}+)`);
    }
  }

  return { name, score: Math.round(score * 10) / 10, maxScore: weight, issues, status: issues.length > 0 ? 'warning' : 'pass' };
}

const auditResults = [
  // Identity (25 points)
  auditField('business_name', extracted.business_name, 10, { minLength: 3 }),
  auditField('tagline', extracted.tagline, 5, { minLength: 10, maxLength: 100 }),
  auditField('hero_headline', extracted.hero_headline, 5, { minLength: 5, maxLength: 80 }),
  auditField('primary_color_hex', extracted.primary_color_hex, 5, { minLength: 4 }),

  // Contact (20 points)
  auditField('phone', extracted.phone, 8),
  auditField('email', extracted.email, 7),
  auditField('city', extracted.city, 5),

  // Content (30 points)
  auditField('services', extracted.services, 10, { minItems: 3 }),
  auditField('about_copy', extracted.about_copy, 5, { minItems: 1 }),
  auditField('testimonials', extracted.testimonials, 5, { minItems: 2 }),
  auditField('why_choose_us', extracted.why_choose_us, 5, { minItems: 3 }),
  auditField('process_steps', extracted.process_steps, 5, { minItems: 3 }),

  // Visual (15 points)
  auditField('hero_image_url', extracted.hero_image_url, 5),
  auditField('logo_url', extracted.logo_url, 5),
  auditField('about_image_url', extracted.about_image_url, 5),

  // Trust (10 points)
  auditField('certifications', extracted.certifications, 5, { minItems: 1 }),
  auditField('values', extracted.values, 5, { minItems: 3 }),
];

const totalScore = auditResults.reduce((s, r) => s + r.score, 0);
const maxScore = auditResults.reduce((s, r) => s + r.maxScore, 0);
const percentage = Math.round((totalScore / maxScore) * 100);
const deploymentReady = percentage >= 70 && auditResults.find(r => r.name === 'business_name').status !== 'missing'
  && !!(extracted.phone || extracted.email);

const allIssues = auditResults.flatMap(r => r.issues);
const passCount = auditResults.filter(r => r.status === 'pass').length;
const warningCount = auditResults.filter(r => r.status === 'warning').length;
const missingCount = auditResults.filter(r => r.status === 'missing').length;

console.log(`\n  Score: ${totalScore}/${maxScore} (${percentage}%)`);
console.log(`  Fields: ${passCount} pass, ${warningCount} warnings, ${missingCount} missing`);
console.log(`  Deployment ready: ${deploymentReady ? 'YES' : 'NO — needs attention'}`);

if (allIssues.length > 0) {
  console.log('\n  Issues:');
  for (const issue of allIssues) {
    console.log(`    • ${issue}`);
  }
}

const audit = {
  score: totalScore,
  maxScore,
  percentage,
  deploymentReady,
  fields: auditResults,
  issues: allIssues,
  summary: {
    pass: passCount,
    warning: warningCount,
    missing: missingCount,
  },
  firecrawlCredits,
};

// ─── Step 7: Validation report + output ──────────────────
console.log('\n[7/7] Writing output...');

const output = {
  ...extracted,
  _meta: {
    source_url: args.url,
    scraped_at: new Date().toISOString(),
    primary_oklch: primaryOklch,
    firecrawl_credits_used: firecrawlCredits,
    audit_score: `${percentage}%`,
    deployment_ready: deploymentReady,
  },
};

mkdirSync(dirname(args.output), { recursive: true });
writeFileSync(args.output, JSON.stringify(output, null, 2));
console.log(`  Data: ${args.output}`);

const logPath = args.output.replace('.json', '-generation-log.json');
writeFileSync(logPath, JSON.stringify(generationLog, null, 2));
console.log(`  Generation log: ${logPath}`);

const auditPath = args.output.replace('.json', '-audit.json');
writeFileSync(auditPath, JSON.stringify(audit, null, 2));
console.log(`  Audit report: ${auditPath}`);

console.log(`\n${'═'.repeat(60)}`);
console.log(`  ${extracted.business_name || 'Unknown'} — Scrape Complete`);
console.log(`  Score: ${percentage}% | Credits: ${firecrawlCredits} | Ready: ${deploymentReady ? 'YES' : 'NO'}`);
console.log('═'.repeat(60));

if (!deploymentReady) {
  console.log('\nWARNING: Site did not pass deployment readiness. Review audit report.');
  process.exit(1);
}
