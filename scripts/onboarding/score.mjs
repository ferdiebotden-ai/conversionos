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

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY }).v1;

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
