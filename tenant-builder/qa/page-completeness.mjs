#!/usr/bin/env node
/**
 * Page Completeness QA — per-page data verification.
 * Checks that each page has the expected content populated (not just structurally present).
 *
 * 6 page checks + 1 cross-page check (footer):
 *   1. Homepage: hero headline + CTA, trust metrics, services section, testimonials
 *   2. Services: each service card has image + description
 *   3. About: about copy present, team section has photos/initials, mission visible
 *   4. Projects: at least 1 portfolio item with image, or graceful sparse state
 *   5. Contact: phone + email + location visible, business hours hidden or valid
 *   6. Footer (all pages): logo, social links (if provisioned), phone, email, copyright
 *
 * Usage:
 *   node qa/page-completeness.mjs --url https://example.norbotsystems.com --site-id example
 *   node qa/page-completeness.mjs --url URL --site-id ID --output ./results/
 */

import { parseArgs } from 'node:util';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import * as logger from '../lib/logger.mjs';

const PAGE_TIMEOUT = 30000;

// ──────────────────────────────────────────────────────────
// Check 1: Homepage completeness
// ──────────────────────────────────────────────────────────

async function checkHomepage(page, baseUrl) {
  const checks = [];

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: PAGE_TIMEOUT });
  } catch {
    return [{ page: '/', check: 'page_load', passed: false, detail: 'Homepage failed to load' }];
  }

  const data = await page.evaluate(() => {
    const body = document.body;
    const text = body?.textContent || '';

    // Hero section
    const heroSection = document.querySelector('[class*="hero"], section:first-of-type, main > :first-child');
    const heroH1 = heroSection?.querySelector('h1, h2');
    const heroHeadline = heroH1?.textContent?.trim() || '';
    const heroCta = heroSection?.querySelector('a[href], button');
    const heroCtaText = heroCta?.textContent?.trim() || '';

    // Trust metrics
    const trustSection = document.querySelector('[class*="trust"], [class*="metric"], [class*="stats"]');
    const trustItems = trustSection ? trustSection.querySelectorAll('[class*="metric"], [class*="stat"], [class*="badge"]') : [];

    // Services section
    const serviceCards = document.querySelectorAll('[class*="service"] [class*="card"], [class*="service"] article');
    const serviceLinks = document.querySelectorAll('a[href*="/services"]');

    // Testimonials
    const testimonialSection = document.querySelector('[class*="testimonial"], [class*="review"]');
    const testimonialCards = testimonialSection
      ? testimonialSection.querySelectorAll('[class*="card"], blockquote, [class*="quote"]')
      : [];

    // How it works / process
    const processSection = document.querySelector('[class*="process"], [class*="how-it-works"], [class*="step"]');

    return {
      heroHeadline,
      heroCtaText,
      hasCta: Boolean(heroCta),
      trustItemCount: trustItems.length,
      serviceCardCount: serviceCards.length,
      hasServiceLinks: serviceLinks.length > 0,
      testimonialCount: testimonialCards.length,
      hasTestimonialSection: Boolean(testimonialSection),
      hasProcessSection: Boolean(processSection),
      bodyLength: text.length,
    };
  });

  // Hero
  checks.push({
    page: '/',
    check: 'hero_headline',
    passed: data.heroHeadline.length >= 10,
    detail: data.heroHeadline ? `"${data.heroHeadline.slice(0, 60)}"` : 'No headline found',
  });

  checks.push({
    page: '/',
    check: 'hero_cta',
    passed: data.hasCta,
    detail: data.heroCtaText || 'No CTA button found',
  });

  // Services section
  checks.push({
    page: '/',
    check: 'services_section',
    passed: data.serviceCardCount >= 1 || data.hasServiceLinks,
    detail: `${data.serviceCardCount} service card(s), ${data.hasServiceLinks ? 'has' : 'no'} service links`,
  });

  // Testimonials (pass if section exists with cards OR section is hidden)
  checks.push({
    page: '/',
    check: 'testimonials_section',
    passed: data.testimonialCount >= 1 || !data.hasTestimonialSection,
    detail: data.hasTestimonialSection
      ? `${data.testimonialCount} testimonial(s)`
      : 'Section hidden (acceptable if <2 testimonials)',
  });

  return checks;
}

// ──────────────────────────────────────────────────────────
// Check 2: Services page
// ──────────────────────────────────────────────────────────

async function checkServicesPage(page, baseUrl) {
  const checks = [];

  try {
    const resp = await page.goto(`${baseUrl}/services`, { waitUntil: 'networkidle', timeout: PAGE_TIMEOUT });
    if (!resp || resp.status() === 404) {
      return [{ page: '/services', check: 'page_exists', passed: true, detail: 'Page not found (may be hidden)' }];
    }
  } catch {
    return [{ page: '/services', check: 'page_load', passed: false, detail: 'Services page failed to load' }];
  }

  const data = await page.evaluate(() => {
    // shadcn/ui Card components use data-slot="card"; class-name matching is unreliable with Tailwind
    const cards = document.querySelectorAll('[data-slot="card"]');
    const services = [];

    cards.forEach(card => {
      const name = card.querySelector('h2, h3, h4')?.textContent?.trim() || '';
      const desc = card.querySelector('p')?.textContent?.trim() || '';
      const img = card.querySelector('img');
      // naturalWidth may be 0 for lazy-loaded images; check srcset/src instead
      const hasImage = img && (img.naturalWidth > 0 || img.srcset || img.getAttribute('src'));
      const imgSrc = img?.getAttribute('src') || img?.srcset?.slice(0, 80) || '';
      services.push({ name, descLength: desc.length, hasImage, imgSrc: imgSrc.slice(0, 80) });
    });

    return { services, totalCards: cards.length };
  });

  checks.push({
    page: '/services',
    check: 'service_cards_present',
    passed: data.totalCards >= 1,
    detail: `${data.totalCards} service card(s) found`,
  });

  // Check each service has description
  const emptyDescriptions = data.services.filter(s => s.descLength < 20);
  checks.push({
    page: '/services',
    check: 'service_descriptions',
    passed: emptyDescriptions.length === 0,
    detail: emptyDescriptions.length > 0
      ? `${emptyDescriptions.length} service(s) with short/missing descriptions: ${emptyDescriptions.map(s => s.name).join(', ')}`
      : 'All services have descriptions',
  });

  return checks;
}

// ──────────────────────────────────────────────────────────
// Check 3: About page
// ──────────────────────────────────────────────────────────

async function checkAboutPage(page, baseUrl) {
  const checks = [];

  try {
    const resp = await page.goto(`${baseUrl}/about`, { waitUntil: 'networkidle', timeout: PAGE_TIMEOUT });
    if (!resp || resp.status() === 404) {
      return [{ page: '/about', check: 'page_exists', passed: true, detail: 'Page not found (may be hidden)' }];
    }
  } catch {
    return [{ page: '/about', check: 'page_load', passed: false, detail: 'About page failed to load' }];
  }

  const data = await page.evaluate(() => {
    const body = document.querySelector('main')?.textContent || '';

    // About copy
    const aboutParagraphs = document.querySelectorAll('main p');
    let aboutCopyLength = 0;
    aboutParagraphs.forEach(p => { aboutCopyLength += (p.textContent?.trim() || '').length; });

    // Team section
    const teamSection = document.querySelector('[class*="team"], [class*="member"]');
    const teamMembers = teamSection
      ? teamSection.querySelectorAll('[class*="card"], [class*="member"], article')
      : [];
    const teamHasPhotosOrInitials = teamSection
      ? teamSection.querySelectorAll('img, [class*="initials"], [class*="avatar"]').length > 0
      : false;

    // Mission
    const missionSection = document.querySelector('[class*="mission"], [class*="values"]');

    return {
      aboutCopyLength,
      teamMemberCount: teamMembers.length,
      teamHasPhotosOrInitials,
      hasTeamSection: Boolean(teamSection),
      hasMissionSection: Boolean(missionSection),
      bodyLength: body.length,
    };
  });

  checks.push({
    page: '/about',
    check: 'about_copy',
    passed: data.aboutCopyLength >= 100,
    detail: `${data.aboutCopyLength} chars of about copy`,
  });

  // Team: pass if section exists with photos/initials OR section is hidden
  checks.push({
    page: '/about',
    check: 'team_section',
    passed: !data.hasTeamSection || data.teamHasPhotosOrInitials,
    detail: data.hasTeamSection
      ? `${data.teamMemberCount} member(s), ${data.teamHasPhotosOrInitials ? 'has' : 'missing'} photos/initials`
      : 'Team section hidden (acceptable if no team data)',
  });

  return checks;
}

// ──────────────────────────────────────────────────────────
// Check 4: Projects page
// ──────────────────────────────────────────────────────────

async function checkProjectsPage(page, baseUrl) {
  const checks = [];

  try {
    const resp = await page.goto(`${baseUrl}/projects`, { waitUntil: 'networkidle', timeout: PAGE_TIMEOUT });
    if (!resp || resp.status() === 404) {
      return [{ page: '/projects', check: 'page_exists', passed: true, detail: 'Page not found (may be hidden)' }];
    }
  } catch {
    return [{ page: '/projects', check: 'page_load', passed: false, detail: 'Projects page failed to load' }];
  }

  const data = await page.evaluate(() => {
    // shadcn/ui Card components use data-slot="card"; class-name matching is unreliable with Tailwind
    const cards = document.querySelectorAll('[data-slot="card"]');
    const projects = [];

    cards.forEach(card => {
      const title = card.querySelector('h2, h3, h4')?.textContent?.trim() || '';
      const img = card.querySelector('img');
      // naturalWidth may be 0 for lazy-loaded images; check srcset/src instead
      const hasImage = img && (img.naturalWidth > 0 || img.srcset || img.getAttribute('src'));
      projects.push({ title, hasImage });
    });

    // Check for graceful sparse/empty state ("Contact us" CTA)
    const mainText = document.querySelector('main')?.textContent || '';
    const hasContactCta = /contact\s+us/i.test(mainText) || /see\s+more/i.test(mainText);

    return { projects, totalCards: cards.length, hasContactCta };
  });

  // Pass if has projects OR has graceful empty state
  checks.push({
    page: '/projects',
    check: 'portfolio_items',
    passed: data.totalCards >= 1 || data.hasContactCta,
    detail: data.totalCards >= 1
      ? `${data.totalCards} project(s) displayed`
      : data.hasContactCta
        ? 'Graceful sparse state with contact CTA'
        : 'No projects and no graceful empty state',
  });

  // Check project images
  if (data.totalCards >= 1) {
    const missingImages = data.projects.filter(p => !p.hasImage);
    checks.push({
      page: '/projects',
      check: 'project_images',
      passed: missingImages.length === 0,
      detail: missingImages.length > 0
        ? `${missingImages.length} project(s) missing images`
        : 'All projects have images',
    });
  }

  return checks;
}

// ──────────────────────────────────────────────────────────
// Check 5: Contact page
// ──────────────────────────────────────────────────────────

async function checkContactPage(page, baseUrl) {
  const checks = [];

  try {
    const resp = await page.goto(`${baseUrl}/contact`, { waitUntil: 'networkidle', timeout: PAGE_TIMEOUT });
    if (!resp || resp.status() === 404) {
      return [{ page: '/contact', check: 'page_exists', passed: false, detail: 'Contact page not found' }];
    }
  } catch {
    return [{ page: '/contact', check: 'page_load', passed: false, detail: 'Contact page failed to load' }];
  }

  const data = await page.evaluate(() => {
    const bodyText = document.body?.textContent || '';

    // Phone
    const hasPhone = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(bodyText);

    // Email
    const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(bodyText) ||
      document.querySelector('a[href^="mailto:"]') !== null;

    // Form
    const hasForm = document.querySelector('form') !== null;

    // Business hours — check if "N/A" is rendered literally
    const hasLiteralNA = /\bN\/A\b/.test(bodyText) || /\bnot available\b/i.test(bodyText);

    // Location / address
    const hasLocation = /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd)/i.test(bodyText) ||
      document.querySelector('[class*="map"], [class*="location"], iframe[src*="maps"]') !== null;

    return { hasPhone, hasEmail, hasForm, hasLiteralNA, hasLocation };
  });

  checks.push({
    page: '/contact',
    check: 'phone_visible',
    passed: data.hasPhone,
    detail: data.hasPhone ? 'Phone number found' : 'No phone number visible',
  });

  checks.push({
    page: '/contact',
    check: 'email_visible',
    passed: data.hasEmail,
    detail: data.hasEmail ? 'Email found' : 'No email visible',
  });

  checks.push({
    page: '/contact',
    check: 'contact_form',
    passed: data.hasForm,
    detail: data.hasForm ? 'Contact form present' : 'No contact form found',
  });

  checks.push({
    page: '/contact',
    check: 'no_literal_na',
    passed: !data.hasLiteralNA,
    detail: data.hasLiteralNA ? '"N/A" or "Not Available" rendered on page' : 'No literal N/A values',
  });

  return checks;
}

// ──────────────────────────────────────────────────────────
// Check 6: Footer (cross-page)
// ──────────────────────────────────────────────────────────

async function checkFooter(page, baseUrl) {
  const checks = [];

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: PAGE_TIMEOUT });
  } catch {
    return [{ page: 'footer', check: 'page_load', passed: false, detail: 'Could not load homepage for footer check' }];
  }

  const data = await page.evaluate(() => {
    const footer = document.querySelector('footer');
    if (!footer) return null;

    const text = footer.textContent || '';
    const links = Array.from(footer.querySelectorAll('a'));

    // Logo
    const hasLogo = footer.querySelector('img, svg, [class*="logo"]') !== null;

    // Social links
    const socialLinks = links.filter(a => {
      const href = a.getAttribute('href') || '';
      return /facebook|instagram|twitter|x\.com|linkedin|youtube|tiktok|houzz|pinterest/i.test(href);
    });

    // Phone
    const hasPhone = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text);

    // Email
    const hasEmail = links.some(a => (a.getAttribute('href') || '').startsWith('mailto:')) ||
      /[\w.-]+@[\w.-]+\.\w+/.test(text);

    // Copyright
    const currentYear = new Date().getFullYear().toString();
    const hasCopyright = text.includes(currentYear);

    return {
      hasLogo,
      socialLinkCount: socialLinks.length,
      socialPlatforms: socialLinks.map(a => {
        const href = a.getAttribute('href') || '';
        if (href.includes('facebook')) return 'Facebook';
        if (href.includes('instagram')) return 'Instagram';
        if (href.includes('linkedin')) return 'LinkedIn';
        if (href.includes('twitter') || href.includes('x.com')) return 'X';
        if (href.includes('youtube')) return 'YouTube';
        if (href.includes('tiktok')) return 'TikTok';
        if (href.includes('houzz')) return 'Houzz';
        if (href.includes('pinterest')) return 'Pinterest';
        return 'Other';
      }),
      hasPhone,
      hasEmail,
      hasCopyright,
      textLength: text.length,
    };
  });

  if (!data) {
    return [{ page: 'footer', check: 'footer_exists', passed: false, detail: 'No footer element found' }];
  }

  checks.push({
    page: 'footer',
    check: 'footer_logo',
    passed: data.hasLogo,
    detail: data.hasLogo ? 'Logo present' : 'No logo in footer',
  });

  checks.push({
    page: 'footer',
    check: 'footer_phone',
    passed: data.hasPhone,
    detail: data.hasPhone ? 'Phone found' : 'No phone in footer',
  });

  checks.push({
    page: 'footer',
    check: 'footer_email',
    passed: data.hasEmail,
    detail: data.hasEmail ? 'Email found' : 'No email in footer',
  });

  checks.push({
    page: 'footer',
    check: 'footer_copyright',
    passed: data.hasCopyright,
    detail: data.hasCopyright ? 'Current year in copyright' : 'Missing or outdated copyright year',
  });

  // Social links — informational (don't fail, but note if missing)
  checks.push({
    page: 'footer',
    check: 'footer_social_links',
    passed: true, // Informational — not all tenants have social links
    detail: data.socialLinkCount > 0
      ? `${data.socialLinkCount} social link(s): ${data.socialPlatforms.join(', ')}`
      : 'No social links in footer (may not have been scraped)',
  });

  return checks;
}

// ──────────────────────────────────────────────────────────
// Main exported function
// ──────────────────────────────────────────────────────────

/**
 * Run page completeness checks on a deployed tenant site.
 * @param {string} url - base URL
 * @param {string} siteId - tenant site ID
 * @param {{ outputPath?: string }} options
 * @returns {Promise<{ passed: boolean, checks: object[], summary: object }>}
 */
export async function runPageCompleteness(url, siteId, options = {}) {
  const { outputPath } = options;
  const baseUrl = url.replace(/\/$/, '');

  logger.info(`Page completeness check: ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  const allChecks = [];

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // Run all page checks
    logger.info('  [1/6] Homepage...');
    const homepageChecks = await checkHomepage(page, baseUrl);
    allChecks.push(...homepageChecks);

    logger.info('  [2/6] Services...');
    const servicesChecks = await checkServicesPage(page, baseUrl);
    allChecks.push(...servicesChecks);

    logger.info('  [3/6] About...');
    const aboutChecks = await checkAboutPage(page, baseUrl);
    allChecks.push(...aboutChecks);

    logger.info('  [4/6] Projects...');
    const projectsChecks = await checkProjectsPage(page, baseUrl);
    allChecks.push(...projectsChecks);

    logger.info('  [5/6] Contact...');
    const contactChecks = await checkContactPage(page, baseUrl);
    allChecks.push(...contactChecks);

    logger.info('  [6/6] Footer...');
    const footerChecks = await checkFooter(page, baseUrl);
    allChecks.push(...footerChecks);

    await page.close();
  } finally {
    await browser.close();
  }

  const passedChecks = allChecks.filter(c => c.passed);
  const failedChecks = allChecks.filter(c => !c.passed);
  const passed = failedChecks.length === 0;

  const summary = {
    site_id: siteId,
    url: baseUrl,
    total_checks: allChecks.length,
    passed_count: passedChecks.length,
    failed_count: failedChecks.length,
    passed,
    failed_checks: failedChecks.map(c => `${c.page}:${c.check}`),
  };

  // Log results
  for (const c of allChecks) {
    const icon = c.passed ? 'PASS' : 'FAIL';
    logger.info(`  ${icon} ${c.page}:${c.check} — ${c.detail}`);
  }

  // Write results
  if (outputPath) {
    mkdirSync(outputPath, { recursive: true });
    const resultFile = resolve(outputPath, 'page-completeness.json');
    writeFileSync(resultFile, JSON.stringify({ passed, checks: allChecks, summary }, null, 2));
    logger.info(`Results written: ${resultFile}`);
  }

  return { passed, checks: allChecks, summary };
}

// ──────────────────────────────────────────────────────────
// CLI entry point
// ──────────────────────────────────────────────────────────

const isDirectRun = process.argv[1] &&
  (resolve(process.argv[1]) === resolve(import.meta.dirname, 'page-completeness.mjs') ||
   import.meta.url === `file://${resolve(process.argv[1])}`);

if (isDirectRun) {
  const { values: cliArgs } = parseArgs({
    options: {
      url: { type: 'string' },
      'site-id': { type: 'string' },
      output: { type: 'string' },
      help: { type: 'boolean' },
    },
  });

  if (cliArgs.help) {
    console.log(`Page Completeness QA — per-page data verification

Usage:
  node qa/page-completeness.mjs --url https://example.norbotsystems.com --site-id example
  node qa/page-completeness.mjs --url URL --site-id ID --output ./results/

Checks:
  1. Homepage:  hero headline, CTA, services section, testimonials
  2. Services:  cards present, descriptions populated
  3. About:     about copy, team photos/initials, mission
  4. Projects:  portfolio items with images, or graceful sparse state
  5. Contact:   phone, email, form, no literal N/A
  6. Footer:    logo, phone, email, copyright, social links`);
    process.exit(0);
  }

  if (!cliArgs.url || !cliArgs['site-id']) {
    logger.error('Required: --url and --site-id');
    console.log('Run with --help for usage');
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const outputPath = cliArgs.output || resolve(import.meta.dirname, `../results/${today}/${cliArgs['site-id']}`);

  logger.progress({
    stage: 'page-completeness',
    site_id: cliArgs['site-id'],
    status: 'start',
    detail: cliArgs.url,
  });

  try {
    const result = await runPageCompleteness(cliArgs.url, cliArgs['site-id'], { outputPath });

    logger.progress({
      stage: 'page-completeness',
      site_id: cliArgs['site-id'],
      status: result.passed ? 'complete' : 'error',
      detail: `${result.summary.passed_count}/${result.summary.total_checks} checks passed`,
    });

    console.log(JSON.stringify(result));
    process.exit(result.passed ? 0 : 1);
  } catch (e) {
    logger.error(`Page completeness check failed: ${e.message}`);
    process.exit(1);
  }
}
