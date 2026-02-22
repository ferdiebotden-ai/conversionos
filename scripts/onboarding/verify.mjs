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
  console.log(`  ${passed ? 'PASS' : 'FAIL'} ${name}${detail ? ` \u2014 ${detail}` : ''}`);
}

console.log(`\nQA Verification: ${targetUrl}`);
console.log(`Expected site_id: ${siteId}`);
console.log('\u2500'.repeat(50));

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
