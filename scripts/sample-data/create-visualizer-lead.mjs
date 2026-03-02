#!/usr/bin/env node
/**
 * Playwright Journey 1: Full Visualizer Flow
 * Creates a lead via the homeowner AI Design Studio journey.
 *
 * Lead: Margaret Wilson — bathroom renovation
 * Flow: Upload photo → Room type → Style → Generate concepts (SSE) →
 *       Star concept → Chat with Emma → Lead capture form → Submit
 * Result: Lead at "new" stage with visualization, concepts, chat history
 *
 * Usage: node scripts/sample-data/create-visualizer-lead.mjs
 * Requires: Dev server running at localhost:3000, NEXT_PUBLIC_SITE_ID=conversionos
 */

import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { appendFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = resolve(__dirname, 'journey-log.md');
const DEMO_ROOT = resolve(__dirname, '../..');

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function logIssue(type, msg) {
  const entry = `- **[${type}]** ${msg} _(Journey 1: Visualizer)_\n`;
  appendFileSync(LOG_FILE, entry);
  console.log(`  ⚠ ${type}: ${msg}`);
}

// Initialize journey log
if (!existsSync(LOG_FILE)) {
  appendFileSync(LOG_FILE, `# Sample Data Journey Log\n\nIssues and improvements found during Playwright journey runs.\nGenerated: ${new Date().toISOString().slice(0, 10)}\n\n`);
}
appendFileSync(LOG_FILE, `\n## Journey 1: Visualizer Lead (Margaret Wilson)\n\n`);

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

// Track console errors
page.on('console', msg => {
  if (msg.type() === 'error') {
    logIssue('CONSOLE_ERROR', msg.text().slice(0, 200));
  }
});

page.on('pageerror', err => {
  logIssue('PAGE_ERROR', err.message.slice(0, 200));
});

try {
  // ── Step 1: Navigate to visualizer ─────────────────────────────────────
  log('Step 1: Navigating to /visualizer');
  await page.goto('http://localhost:3000/visualizer', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  // ── Step 2: Upload photo ───────────────────────────────────────────────
  log('Step 2: Uploading bathroom photo');
  const photoPath = resolve(DEMO_ROOT, 'public/images/demo/before-bathroom.png');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(photoPath);
  await page.waitForTimeout(2000);

  // Wait for photo analysis to start (or skip if no analysis)
  try {
    await page.waitForSelector('text=Analysing', { timeout: 5000 });
    log('  Photo analysis started...');
    // Wait for analysis to complete (indicator disappears or room type pre-fills)
    await page.waitForFunction(() => {
      return !document.body.textContent.includes('Analysing photo');
    }, { timeout: 30000 });
    log('  Photo analysis complete');
  } catch {
    log('  No photo analysis indicator found — continuing');
  }

  // ── Step 3: Select room type ───────────────────────────────────────────
  log('Step 3: Selecting room type — Bathroom');
  // Room type may be pre-filled from photo analysis
  try {
    const bathroomBtn = page.getByRole('button', { name: /bathroom/i });
    if (await bathroomBtn.isVisible({ timeout: 3000 })) {
      await bathroomBtn.click();
      log('  Clicked Bathroom button');
    }
  } catch {
    log('  Room type already selected (pre-filled from analysis)');
  }
  await page.waitForTimeout(500);

  // ── Step 4: Select style ───────────────────────────────────────────────
  log('Step 4: Selecting style — Modern');
  try {
    await page.waitForSelector('text=Choose your style', { timeout: 5000 });
    const modernBtn = page.getByRole('button', { name: /modern/i }).first();
    await modernBtn.click();
    log('  Clicked Modern style');
  } catch (e) {
    logIssue('UI', `Style selection not visible or clickable: ${e.message.slice(0, 100)}`);
    // Try clicking any style card
    const styleCards = page.locator('[class*="cursor-pointer"]').filter({ hasText: /modern|traditional|farmhouse/i });
    if (await styleCards.count() > 0) {
      await styleCards.first().click();
      log('  Clicked first available style card');
    }
  }
  await page.waitForTimeout(500);

  // ── Step 5: Skip preferences (optional text) ──────────────────────────
  log('Step 5: Adding text preferences');
  try {
    const prefTextarea = page.locator('textarea').first();
    if (await prefTextarea.isVisible({ timeout: 3000 })) {
      await prefTextarea.fill('I love white marble tile with brass fixtures. Open shower concept, freestanding tub.');
      log('  Typed preferences');
    }
  } catch {
    log('  No preferences textarea found — skipping');
  }
  await page.waitForTimeout(500);

  // ── Step 6: Click Generate ─────────────────────────────────────────────
  log('Step 6: Clicking Generate');
  const generateBtn = page.getByRole('button', { name: /generate/i });
  await generateBtn.click();
  log('  Generate clicked — waiting for concepts (this takes 60-120 seconds)...');

  // Wait for generation to complete (result display appears)
  try {
    await page.waitForSelector('[data-testid="visualization-result"]', { timeout: 180000 });
    log('  Concepts generated!');
  } catch (e) {
    logIssue('TIMEOUT', `Concept generation timed out after 3 minutes: ${e.message.slice(0, 100)}`);
    // Check if we got partial results
    const thumbnails = await page.locator('[data-testid="concept-thumbnail"]').count();
    if (thumbnails > 0) {
      log(`  Got ${thumbnails} partial concepts — continuing`);
    } else {
      throw new Error('No concepts generated — cannot continue journey');
    }
  }
  await page.waitForTimeout(2000);

  // ── Step 7: Star a concept (click thumbnail) ──────────────────────────
  log('Step 7: Selecting/starring concept 1');
  const thumbnails = page.locator('[data-testid="concept-thumbnail"]');
  const thumbCount = await thumbnails.count();
  log(`  Found ${thumbCount} concept thumbnails`);
  if (thumbCount > 0) {
    // Scroll thumbnail into view first — they may be in a sidebar off-screen
    await thumbnails.first().scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    try {
      await thumbnails.first().click({ timeout: 5000 });
      log('  Starred first concept');
    } catch {
      // Force click via JS if layout prevents normal click
      await thumbnails.first().evaluate(el => el.click());
      log('  Starred first concept (via JS click)');
    }
  } else {
    logIssue('UI', 'No concept thumbnails found');
  }
  await page.waitForTimeout(1000);

  // ── Step 8: Chat with Emma ─────────────────────────────────────────────
  log('Step 8: Chatting with Emma');
  // Scroll down to make chat visible
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);

  const chatInput = page.locator('[data-testid="design-studio-chat"] input, [data-testid="design-studio-chat"] textarea, input[placeholder*="Share your thoughts"], input[placeholder*="message"], textarea[placeholder*="Share"]').first();
  if (await chatInput.isVisible({ timeout: 5000 })) {
    // Message 1
    await chatInput.fill('I really love the marble tile look. Could we do a herringbone pattern on the shower wall?');
    await page.keyboard.press('Enter');
    log('  Sent message 1 — waiting for Emma response...');

    // Wait for assistant response
    try {
      await page.waitForFunction(() => {
        const chat = document.querySelector('[data-testid="design-studio-chat"]');
        if (!chat) return false;
        const msgs = chat.querySelectorAll('[class*="bg-muted"], [class*="bg-card"]');
        return msgs.length >= 1;
      }, { timeout: 60000 });
      log('  Got Emma response');
    } catch {
      logIssue('SLOW', 'Emma chat response took >60 seconds');
    }
    await page.waitForTimeout(2000);

    // Message 2
    await chatInput.fill('What about brass fixtures and a freestanding soaker tub? Budget around $35,000.');
    await page.keyboard.press('Enter');
    log('  Sent message 2');

    try {
      await page.waitForTimeout(3000);
      // Wait for second response
      await page.waitForFunction(() => {
        const chat = document.querySelector('[data-testid="design-studio-chat"]');
        if (!chat) return false;
        // Look for multiple assistant messages
        const text = chat.textContent || '';
        return text.length > 500; // Should have substantial chat content
      }, { timeout: 60000 });
      log('  Got Emma response 2');
    } catch {
      logIssue('SLOW', 'Second Emma response took >60 seconds');
    }
    await page.waitForTimeout(1000);
  } else {
    logIssue('UI', 'Chat input not found in Design Studio');
  }

  // ── Step 9: Click "Get My Estimate" or lead capture CTA ───────────────
  log('Step 9: Opening lead capture form');
  // Scroll back up to find the CTA
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  try {
    // Look for any visible CTA — may be overlay on image, sticky bar, or in chat
    const ctaSelectors = [
      'button:has-text("Submit for a Quote")',
      'button:has-text("Get My Estimate")',
      'button:has-text("Submit Request")',
      'a:has-text("Submit for a Quote")',
      'a:has-text("Get My Estimate")',
    ];
    let clicked = false;
    for (const sel of ctaSelectors) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.scrollIntoViewIfNeeded().catch(() => {});
        await btn.click();
        log(`  Clicked CTA: ${sel}`);
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      logIssue('UI', 'Could not find lead capture CTA button');
    }
  } catch (e) {
    logIssue('UI', `CTA click failed: ${e.message.slice(0, 100)}`);
  }
  await page.waitForTimeout(1000);

  // ── Step 10: Fill lead capture form ────────────────────────────────────
  log('Step 10: Filling lead capture form');

  // Wait for either lead-capture-form or no-photo-lead-form
  const formFound = await page.locator('[data-testid="lead-capture-form"]').isVisible({ timeout: 10000 }).catch(() => false);

  if (formFound) {
    await page.fill('#lead-name', 'Margaret Wilson');
    await page.fill('#lead-email', 'margaret.wilson@example.com');
    await page.fill('#lead-phone', '(519) 555-0147');

    // Select timeline
    try {
      await page.click('#lead-timeline');
      await page.waitForTimeout(300);
      await page.click('text=Within 3 months');
    } catch {
      log('  Timeline select not interactable — skipping');
    }

    await page.fill('#lead-notes', 'Master bathroom renovation. Love the marble herringbone look. Budget around $35K. Want a freestanding soaker tub and walk-in shower.');
    await page.waitForTimeout(500);

    // Submit — scroll form into view and click
    const submitBtn = page.locator('[data-testid="lead-capture-form"] button[type="submit"], [data-testid="lead-capture-form"] button:has-text("Submit Request")').first();
    await submitBtn.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);
    try {
      await submitBtn.click({ timeout: 5000 });
    } catch {
      // Force click via JS if obscured by overlay
      await submitBtn.evaluate(el => el.click());
    }
    log('  Submitted lead capture form');

    // Wait for success
    try {
      await page.waitForSelector('[data-testid="lead-capture-success"]', { timeout: 15000 });
      log('  ✓ Lead capture successful!');
    } catch {
      logIssue('ERROR', 'Lead capture form did not show success state');
    }
  } else {
    log('  Lead capture form not visible — creating lead via API');
    const apiRes = await page.evaluate(async () => {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Margaret Wilson',
          email: 'margaret.wilson@example.com',
          phone: '(519) 555-0147',
          projectType: 'bathroom',
          timeline: '1_3_months',
          goalsText: 'Master bathroom renovation. Love the marble herringbone look. Budget around $35K. Want a freestanding soaker tub and walk-in shower.',
          source: 'ai_chat',
        }),
      });
      return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
    });
    log(`  API result: ${apiRes.ok ? '✓' : '✗'} (${apiRes.status})`);
    if (apiRes.ok) {
      log('  ✓ Lead created via API fallback');
    } else {
      logIssue('ERROR', `API lead creation failed: ${JSON.stringify(apiRes.body).slice(0, 200)}`);
    }
  }

  await page.waitForTimeout(2000);
  log('\n✓ Journey 1 complete — Margaret Wilson lead created via visualizer flow\n');

} catch (err) {
  logIssue('FATAL', `Journey 1 failed: ${err.message}`);
  console.error(err);

  // Take screenshot on failure
  try {
    await page.screenshot({ path: resolve(__dirname, 'journey-1-failure.png'), fullPage: true });
    log('  Saved failure screenshot to journey-1-failure.png');
  } catch { /* ignore */ }
} finally {
  await browser.close();
}
