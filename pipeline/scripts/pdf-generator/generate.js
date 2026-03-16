#!/usr/bin/env node
/**
 * PDF One-Pager Generator for ConversionOS
 *
 * Pulls ALL targets with deployed microsites from Turso cloud DB
 * and generates a high-quality, personalized one-page pitch PDF
 * for each one, with a QR code linking to their microsite.
 *
 * Usage:
 *   node generate.js                          # Generate for ALL targets with microsites
 *   node generate.js --target 1               # Generate for a specific target ID
 *   node generate.js --slug kirks-renovations # Generate for a specific slug
 *   node generate.js --status sms_sent        # Generate for targets with a specific status
 */

const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════

const CONFIG = {
  templatePath: path.join(__dirname, 'template.html'),
  outputDir: path.join(__dirname, '..', '..', 'outbox', 'pdfs'),
  micrositeBaseUrl: 'https://www.norbotsystems.com',
};

// ═══════════════════════════════════════════════
// Turso Database Connection
// ═══════════════════════════════════════════════

function getDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables.');
    console.error('   Set them in your shell or in ~/.openclaw/.env');
    process.exit(1);
  }

  return createClient({ url, authToken });
}

async function fetchTargetsWithMicrosites(db, filter) {
  let sql = `
    SELECT DISTINCT t.id, t.company_name, t.slug, t.city, t.territory, t.status,
           t.google_rating, t.google_review_count, t.years_in_business, t.score,
           t.owner_name, t.phone, t.email, t.website
    FROM artifacts a
    JOIN targets t ON t.id = a.target_id
    WHERE a.type = 'microsite'
  `;
  const args = [];

  if (filter.targetId) {
    sql += ' AND t.id = ?';
    args.push(filter.targetId);
  }
  if (filter.slug) {
    sql += ' AND t.slug = ?';
    args.push(filter.slug);
  }
  if (filter.status) {
    sql += ' AND t.status = ?';
    args.push(filter.status);
  }

  sql += ' ORDER BY t.id';

  const result = await db.execute({ sql, args });

  return result.rows.map(r => ({
    id: r.id,
    company_name: r.company_name,
    slug: r.slug,
    city: r.city || 'Ontario',
    territory: r.territory || `${r.city || 'Ontario'}, ON`,
    status: r.status,
    google_rating: Number(r.google_rating) || 4.5,
    google_review_count: Number(r.google_review_count) || 0,
    years_in_business: Number(r.years_in_business) || 5,
    score: Number(r.score) || 80,
    owner_name: r.owner_name,
    phone: r.phone,
    email: r.email,
    website: r.website,
  }));
}

// ═══════════════════════════════════════════════
// QR Code Generator
// ═══════════════════════════════════════════════

async function generateQRCode(url) {
  const dataUrl = await QRCode.toDataURL(url, {
    width: 300,
    margin: 1,
    color: {
      dark: '#0A1628',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
  });
  return dataUrl;
}

// ═══════════════════════════════════════════════
// Template Token Replacement
// ═══════════════════════════════════════════════

function fillTemplate(templateHtml, target, qrDataUrl) {
  const rating = Number(target.google_rating);
  const tokens = {
    '{{COMPANY_NAME}}': target.company_name,
    '{{SLUG}}': target.slug,
    '{{CITY}}': target.city,
    '{{TERRITORY}}': target.territory,
    '{{GOOGLE_RATING}}': rating % 1 === 0 ? rating.toFixed(1) : rating.toString(),
    '{{GOOGLE_REVIEW_COUNT}}': target.google_review_count.toString(),
    '{{YEARS_IN_BUSINESS}}': target.years_in_business.toString(),
    '{{SCORE}}': target.score.toString(),
    '{{QR_CODE_DATA_URL}}': qrDataUrl,
  };

  let html = templateHtml;
  for (const [token, value] of Object.entries(tokens)) {
    html = html.replaceAll(token, value);
  }
  return html;
}

// ═══════════════════════════════════════════════
// PDF Generator
// ═══════════════════════════════════════════════

async function generatePDF(target, browser, templateHtml, index, total) {
  const micrositeUrl = `${CONFIG.micrositeBaseUrl}/${target.slug}`;

  const progress = `[${index}/${total}]`;
  console.log(`  ${progress} ${target.company_name} (${target.territory})...`);

  // Step 1: Generate QR code
  const qrDataUrl = await generateQRCode(micrositeUrl);

  // Step 2: Fill template
  const filledHtml = fillTemplate(templateHtml, target, qrDataUrl);

  // Step 3: Render PDF with Puppeteer
  const page = await browser.newPage();

  await page.setContent(filledHtml, {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });

  // Wait for fonts to load
  await page.evaluateHandle('document.fonts.ready');

  const outputFileName = `${target.slug}-one-pager.pdf`;
  const outputPath = path.join(CONFIG.outputDir, outputFileName);

  await page.pdf({
    path: outputPath,
    format: 'Letter',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await page.close();

  const fileSize = fs.statSync(outputPath).size;
  const fileSizeKB = (fileSize / 1024).toFixed(1);

  console.log(`         ✅ ${outputFileName} (${fileSizeKB} KB) — QR → ${micrositeUrl}`);

  return { outputPath, outputFileName, fileSize, micrositeUrl };
}

// ═══════════════════════════════════════════════
// QR Code Validation
// ═══════════════════════════════════════════════

async function validateQRUrls(results) {
  console.log('\n  → Validating QR code URLs...');
  let allValid = true;

  for (const r of results) {
    if (!r.success) continue;

    const url = r.micrositeUrl;
    // Just verify the URL structure is correct (actual HTTP check would require network)
    const valid = url.startsWith('https://www.norbotsystems.com/') && url.length > 30;
    if (!valid) {
      console.log(`    ❌ Invalid QR URL for ${r.target}: ${url}`);
      allValid = false;
    }
  }

  if (allValid) {
    console.log(`    ✅ All ${results.filter(r => r.success).length} QR code URLs validated`);
  }

  return allValid;
}

// ═══════════════════════════════════════════════
// Main Execution
// ═══════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const filter = {};

  // Parse CLI arguments
  const targetIdIdx = args.indexOf('--target');
  const slugIdx = args.indexOf('--slug');
  const statusIdx = args.indexOf('--status');

  if (targetIdIdx !== -1 && args[targetIdIdx + 1]) {
    filter.targetId = parseInt(args[targetIdIdx + 1]);
  }
  if (slugIdx !== -1 && args[slugIdx + 1]) {
    filter.slug = args[slugIdx + 1];
  }
  if (statusIdx !== -1 && args[statusIdx + 1]) {
    filter.status = args[statusIdx + 1];
  }

  // Ensure output directory exists
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   ConversionOS — One-Pager PDF Generator                    ║');
  console.log('║   NorBot Systems Inc.                                       ║');
  console.log('║   Pulling live data from Turso cloud DB                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // Connect to Turso and fetch targets
  console.log('\n  → Connecting to Turso cloud database...');
  const db = getDb();
  const targets = await fetchTargetsWithMicrosites(db, filter);

  if (targets.length === 0) {
    console.error('\n  ❌ No targets found with deployed microsites matching your filter.');
    process.exit(1);
  }

  console.log(`  ✅ Found ${targets.length} targets with deployed microsites`);

  // Read template once
  const templateHtml = fs.readFileSync(CONFIG.templatePath, 'utf-8');

  // Launch browser
  console.log('\n  → Launching headless Chrome...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none',
    ],
  });
  console.log('  ✅ Browser launched\n');

  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    try {
      const result = await generatePDF(target, browser, templateHtml, i + 1, targets.length);
      results.push({ target: target.company_name, territory: target.territory, ...result, success: true });
    } catch (error) {
      console.error(`         ❌ FAILED: ${error.message}`);
      results.push({ target: target.company_name, territory: target.territory, success: false, error: error.message });
    }
  }

  await browser.close();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Validate QR URLs
  await validateQRUrls(results);

  // Summary
  console.log('\n' + '═'.repeat(64));
  console.log('  GENERATION SUMMARY');
  console.log('═'.repeat(64));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n  ✅ Successfully generated: ${successful.length}`);
  if (failed.length > 0) {
    console.log(`  ❌ Failed: ${failed.length}`);
    for (const r of failed) {
      console.log(`     - ${r.target}: ${r.error}`);
    }
  }

  const totalSizeKB = successful.reduce((sum, r) => sum + r.fileSize, 0) / 1024;
  const totalSizeMB = (totalSizeKB / 1024).toFixed(1);

  console.log(`\n  📊 Total size: ${totalSizeMB} MB (${successful.length} files)`);
  console.log(`  ⏱  Elapsed: ${elapsed}s (${(elapsed / targets.length).toFixed(1)}s per PDF)`);
  console.log(`  📁 Output: ${CONFIG.outputDir}`);
  console.log('');

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
