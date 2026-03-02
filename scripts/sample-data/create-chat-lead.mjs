#!/usr/bin/env node
/**
 * Playwright Journey 2: No-Photo Chat Path
 * Creates a lead via the homeowner chat-only journey (no photo upload).
 *
 * Lead: Derek Fournier — kitchen renovation
 * Flow: Visualizer → Skip photo → Chat with Emma about kitchen reno →
 *       Lead capture form → Submit
 * Result: Lead at "new" stage with chat history, no visualization/concepts
 *
 * Usage: node scripts/sample-data/create-chat-lead.mjs
 * Requires: Dev server running at localhost:3000, NEXT_PUBLIC_SITE_ID=conversionos
 */

import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { appendFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = resolve(__dirname, 'journey-log.md');

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function logIssue(type, msg) {
  const entry = `- **[${type}]** ${msg} _(Journey 2: Chat)_\n`;
  appendFileSync(LOG_FILE, entry);
  console.log(`  ⚠ ${type}: ${msg}`);
}

appendFileSync(LOG_FILE, `\n## Journey 2: Chat Lead (Derek Fournier)\n\n`);

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

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

  // ── Step 2: Click "Skip photo" / "Don't have a photo" link ─────────────
  log('Step 2: Skipping photo upload');
  try {
    // Look for the skip photo link/button
    const skipBtn = page.locator('button:has-text("skip"), a:has-text("skip"), button:has-text("Don\'t have"), a:has-text("Don\'t have"), text=skip photo, text=without a photo, text=chat instead').first();
    if (await skipBtn.isVisible({ timeout: 5000 })) {
      await skipBtn.click();
      log('  Clicked skip photo');
    } else {
      // Try finding it by more general selectors
      const links = page.locator('a, button').filter({ hasText: /skip|without|chat|don.*photo/i });
      if (await links.count() > 0) {
        await links.first().click();
        log('  Found and clicked skip link');
      } else {
        logIssue('UI', 'Could not find skip photo button/link');
      }
    }
  } catch (e) {
    logIssue('UI', `Skip photo interaction failed: ${e.message.slice(0, 100)}`);
  }
  await page.waitForTimeout(2000);

  // ── Step 3: Interact with no-photo chat panel ──────────────────────────
  log('Step 3: Starting no-photo chat');

  // Check if we're in the no-photo chat panel
  const noPhotoPanelVisible = await page.locator('[data-testid="no-photo-chat-panel"], [data-testid="no-photo-lead-form"]').isVisible({ timeout: 5000 }).catch(() => false);

  if (noPhotoPanelVisible) {
    log('  No-photo panel visible');

    // Look for chat input in the no-photo panel
    const chatInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"], input[placeholder*="thoughts"], textarea[placeholder*="thoughts"]').first();

    if (await chatInput.isVisible({ timeout: 5000 })) {
      // Message 1: Introduce the project
      await chatInput.fill("Hi! I'm looking to renovate my kitchen. It's about 12x14 feet, and I want to modernize everything — new cabinets, countertops, and appliances.");
      await page.keyboard.press('Enter');
      log('  Sent message 1');

      // Wait for Emma response
      await page.waitForTimeout(5000);
      try {
        await page.waitForFunction(() => {
          const body = document.body.textContent || '';
          return body.length > 1000; // Chat content growing
        }, { timeout: 60000 });
        log('  Got Emma response 1');
      } catch {
        logIssue('SLOW', 'Emma response 1 took >60s');
      }
      await page.waitForTimeout(2000);

      // Message 2: More details
      await chatInput.fill("I'm thinking quartz countertops, shaker-style cabinets in white, and a large island with seating for 3. Budget is around $45,000.");
      await page.keyboard.press('Enter');
      log('  Sent message 2');

      await page.waitForTimeout(5000);
      try {
        await page.waitForFunction(() => {
          const msgs = document.querySelectorAll('[class*="bg-muted"], [class*="assistant"]');
          return msgs.length >= 2;
        }, { timeout: 60000 });
        log('  Got Emma response 2');
      } catch {
        logIssue('SLOW', 'Emma response 2 took >60s');
      }
      await page.waitForTimeout(2000);

      // Message 3: Timeline
      await chatInput.fill("We'd like to start in about 2 months. Do you handle permits for Stratford area projects?");
      await page.keyboard.press('Enter');
      log('  Sent message 3');

      await page.waitForTimeout(5000);
      try {
        await page.waitForFunction(() => {
          const body = document.body.textContent || '';
          return body.length > 2000;
        }, { timeout: 60000 });
        log('  Got Emma response 3');
      } catch {
        logIssue('SLOW', 'Emma response 3 took >60s');
      }
      await page.waitForTimeout(2000);

      // Message 4: Ready for estimate
      await chatInput.fill("This sounds great. I'd love to get a formal estimate. What do you need from me?");
      await page.keyboard.press('Enter');
      log('  Sent message 4');

      await page.waitForTimeout(5000);
      try {
        await page.waitForFunction(() => {
          const body = document.body.textContent || '';
          return body.length > 2500;
        }, { timeout: 60000 });
        log('  Got Emma response 4');
      } catch {
        logIssue('SLOW', 'Emma response 4 took >60s');
      }
      await page.waitForTimeout(1000);
    } else {
      logIssue('UI', 'No chat input found in no-photo panel');
    }
  } else {
    // May have a simpler lead form instead of chat
    log('  No-photo chat panel not found — looking for lead form directly');
  }

  // ── Step 4: Fill lead capture form ─────────────────────────────────────
  log('Step 4: Looking for lead capture form');

  // Try clicking estimate CTA if available
  try {
    const ctaBtn = page.locator('button:has-text("Get My Estimate"), button:has-text("Submit for a Quote"), button:has-text("Submit Request")').first();
    if (await ctaBtn.isVisible({ timeout: 5000 })) {
      await ctaBtn.click();
      log('  Clicked CTA');
    }
  } catch {
    log('  No CTA button — form may already be visible');
  }
  await page.waitForTimeout(1000);

  // Check for either the standard lead-capture-form or no-photo-lead-form
  const formVisible = await page.locator('[data-testid="lead-capture-form"], [data-testid="no-photo-lead-form"]').isVisible({ timeout: 10000 }).catch(() => false);

  if (formVisible) {
    log('  Lead form visible — filling fields');

    // Try standard lead form IDs first, then fall back to no-photo form IDs
    for (const nameId of ['#lead-name', '#no-photo-name', 'input[name="name"]']) {
      try {
        const el = page.locator(nameId);
        if (await el.isVisible({ timeout: 1000 })) {
          await el.fill('Derek Fournier');
          break;
        }
      } catch { /* try next */ }
    }

    for (const emailId of ['#lead-email', '#no-photo-email', 'input[name="email"]', 'input[type="email"]']) {
      try {
        const el = page.locator(emailId);
        if (await el.isVisible({ timeout: 1000 })) {
          await el.fill('derek.fournier@example.com');
          break;
        }
      } catch { /* try next */ }
    }

    for (const phoneId of ['#lead-phone', '#no-photo-phone', 'input[name="phone"]', 'input[type="tel"]']) {
      try {
        const el = page.locator(phoneId);
        if (await el.isVisible({ timeout: 1000 })) {
          await el.fill('(519) 555-0283');
          break;
        }
      } catch { /* try next */ }
    }

    // Submit
    const submitBtn = page.locator('button:has-text("Submit"), button[type="submit"]').first();
    await submitBtn.click();
    log('  Submitted form');

    // Wait for success
    try {
      await page.waitForSelector('[data-testid="lead-capture-success"], [data-testid="no-photo-lead-success"], text=all set', { timeout: 15000 });
      log('  ✓ Lead capture successful!');
    } catch {
      logIssue('ERROR', 'Lead form did not show success state');
    }
  } else {
    logIssue('UI', 'No lead capture form found — trying direct API');

    // Fallback: create lead via API directly
    const apiRes = await page.evaluate(async () => {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Derek Fournier',
          email: 'derek.fournier@example.com',
          phone: '(519) 555-0283',
          projectType: 'kitchen',
          timeline: '1_3_months',
          goalsText: 'Kitchen renovation — 12x14 ft, quartz countertops, shaker cabinets, large island. Budget $45K.',
          source: 'ai_chat',
        }),
      });
      return { ok: res.ok, status: res.status };
    });
    log(`  API fallback result: ${JSON.stringify(apiRes)}`);
  }

  await page.waitForTimeout(2000);
  log('\n✓ Journey 2 complete — Derek Fournier lead created via chat path\n');

} catch (err) {
  logIssue('FATAL', `Journey 2 failed: ${err.message}`);
  console.error(err);

  try {
    await page.screenshot({ path: resolve(__dirname, 'journey-2-failure.png'), fullPage: true });
    log('  Saved failure screenshot');
  } catch { /* ignore */ }
} finally {
  await browser.close();
}
