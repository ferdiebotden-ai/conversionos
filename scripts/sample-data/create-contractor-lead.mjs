#!/usr/bin/env node
/**
 * Playwright Journey 3: Contractor Manual Entry + Full Quote Lifecycle
 * Creates a lead via the admin contractor intake, then updates status to won.
 *
 * Lead: Steve & Karen Brodie — basement renovation
 * Flow: Admin → New Lead → Form tab → Fill intake form → Create →
 *       Verify in table → Update status to won via API
 * Result: Lead at "won" stage, demonstrates contractor intake lifecycle
 *
 * Usage: node scripts/sample-data/create-contractor-lead.mjs
 * Requires: Dev server running at localhost:3000, NEXT_PUBLIC_SITE_ID=conversionos
 */

import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { appendFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = resolve(__dirname, 'journey-log.md');

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function logIssue(type, msg) {
  const entry = `- **[${type}]** ${msg} _(Journey 3: Contractor)_\n`;
  appendFileSync(LOG_FILE, entry);
  console.log(`  ⚠ ${type}: ${msg}`);
}

appendFileSync(LOG_FILE, `\n## Journey 3: Contractor Lead (Steve & Karen Brodie)\n\n`);

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

page.on('console', msg => {
  if (msg.type() === 'error' && !msg.text().includes('hydration')) {
    logIssue('CONSOLE_ERROR', msg.text().slice(0, 200));
  }
});

page.on('pageerror', err => {
  logIssue('PAGE_ERROR', err.message.slice(0, 200));
});

try {
  // ── Step 1: Navigate to admin leads ────────────────────────────────────
  log('Step 1: Navigating to /admin/leads');
  await page.goto('http://localhost:3000/admin/leads', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const pageTitle = await page.title();
  log(`  Page loaded: "${pageTitle}"`);

  // ── Step 1b: Dismiss demo splash interstitial ──────────────────────────
  try {
    const splashBtn = page.getByRole('button', { name: /start exploring/i });
    if (await splashBtn.isVisible({ timeout: 3000 })) {
      await splashBtn.click();
      log('  Dismissed demo splash');
      await page.waitForTimeout(1000);
    }
  } catch {
    log('  No splash interstitial — continuing');
  }

  // ── Step 2: Open new lead dialog ───────────────────────────────────────
  log('Step 2: Opening contractor intake dialog');
  const newLeadBtn = page.getByRole('button', { name: /new lead/i });
  await newLeadBtn.click({ timeout: 10000 });
  log('  Opened intake dialog');
  await page.waitForTimeout(1000);

  // ── Step 3: Switch to Form tab (shows review form directly) ────────────
  log('Step 3: Switching to Form tab');
  try {
    const formTab = page.locator('[role="tab"]').filter({ hasText: 'Form' }).first();
    if (await formTab.isVisible({ timeout: 3000 })) {
      await formTab.click();
      log('  Clicked Form tab — review form should appear');
      await page.waitForTimeout(1000);
    }
  } catch {
    log('  Form tab not found — may already be on form view');
  }

  // ── Step 4: Fill intake form ───────────────────────────────────────────
  log('Step 4: Filling contractor intake form');

  // Wait for the review form to be visible
  await page.waitForSelector('#intake-name', { timeout: 5000 });

  // Contact info (required fields)
  await page.fill('#intake-name', 'Steve & Karen Brodie');
  await page.fill('#intake-email', 'brodies@example.com');
  await page.fill('#intake-phone', '(519) 555-0391');
  log('  Filled name, email, phone');

  // City (optional)
  try {
    const cityInput = page.locator('#intake-city');
    if (await cityInput.isVisible({ timeout: 1000 })) {
      await cityInput.fill('Stratford');
      log('  Filled city: Stratford');
    }
  } catch { /* optional field */ }

  // Address (optional)
  try {
    const addressInput = page.locator('#intake-address');
    if (await addressInput.isVisible({ timeout: 1000 })) {
      await addressInput.fill('42 Avon Crescent');
      log('  Filled address');
    }
  } catch { /* optional field */ }

  // Project type — use React state via evaluate for reliability with shadcn/ui Selects
  // Find all SelectTrigger buttons in the dialog and click them by position
  // The order is: Project Type, Finish Level, Timeline, Budget Band
  try {
    const selectTriggers = page.locator('[role="dialog"] button[data-slot="select-trigger"]');
    const count = await selectTriggers.count();
    log(`  Found ${count} select triggers`);

    if (count >= 1) {
      // 1st select: Project Type
      await selectTriggers.nth(0).click();
      await page.waitForTimeout(300);
      await page.locator('[role="option"]').filter({ hasText: 'Basement' }).click();
      await page.waitForTimeout(300);
      log('  Selected Basement project type');
    }

    // Area (sq ft) — clear and type to avoid number input weirdness
    try {
      const areaInput = page.locator('#intake-area');
      if (await areaInput.isVisible({ timeout: 1000 })) {
        await areaInput.click();
        await areaInput.fill('');
        await areaInput.type('1200');
        log('  Filled area: 1200 sq ft');
      }
    } catch { /* optional */ }

    if (count >= 2) {
      // 2nd select: Finish Level
      await selectTriggers.nth(1).click();
      await page.waitForTimeout(300);
      await page.locator('[role="option"]').filter({ hasText: 'Standard' }).click();
      await page.waitForTimeout(300);
      log('  Selected Standard finish level');
    }

    if (count >= 3) {
      // 3rd select: Timeline
      await selectTriggers.nth(2).click();
      await page.waitForTimeout(300);
      await page.locator('[role="option"]').filter({ hasText: '1-3 Months' }).click();
      await page.waitForTimeout(300);
      log('  Selected 1-3 Months timeline');
    }

    if (count >= 4) {
      // 4th select: Budget Band — may need scroll
      try {
        await selectTriggers.nth(3).scrollIntoViewIfNeeded({ timeout: 3000 });
        await selectTriggers.nth(3).click({ timeout: 5000 });
        await page.waitForTimeout(300);
        await page.locator('[role="option"]').filter({ hasText: /40K.*65K/ }).click({ timeout: 3000 });
        await page.waitForTimeout(300);
        log('  Selected $40K-$65K budget');
      } catch {
        log('  Budget select skipped (optional)');
        // Click somewhere neutral to close any open dropdown (NOT Escape — that closes the dialog)
        await page.locator('[role="dialog"] h2, [role="dialog"] p').first().click().catch(() => {});
        await page.waitForTimeout(300);
      }
    }
  } catch (e) {
    log(`  Some selects not interactable (optional): ${e.message.slice(0, 80)}`);
    // Click dialog header to close any open dropdown (NOT Escape — that closes the dialog)
    await page.locator('[role="dialog"] h2, [role="dialog"] p').first().click().catch(() => {});
    await page.waitForTimeout(300);
  }

  // Project Notes / Goals — scroll down first
  try {
    const goals = page.locator('#intake-goals');
    await goals.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await goals.fill('Full basement renovation — currently unfinished. Want to add a rec room with wet bar, home theatre area, full bathroom, and a guest bedroom. House built 1998, 1200 sq ft basement. Budget $55-65K.');
    log('  Filled project notes');
  } catch {
    log('  Goals textarea not found');
  }

  await page.waitForTimeout(500);

  // ── Step 5: Create lead ────────────────────────────────────────────────
  log('Step 5: Creating lead');

  // Scroll Create Lead button into view and click
  const createBtn = page.locator('button').filter({ hasText: 'Create Lead' }).first();
  await createBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  try {
    await createBtn.click({ timeout: 5000 });
  } catch {
    // Force click via JS if obscured
    await createBtn.evaluate(el => el.click());
  }
  log('  Clicked Create Lead');

  // Handle potential confirmation dialog (V10 duplicate check, submit confirm)
  await page.waitForTimeout(1500);
  try {
    // The submit confirm dialog has "Create Lead" as confirm button text
    const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]').filter({ hasText: /confirm|sure|duplicate/i });
    if (await confirmDialog.isVisible({ timeout: 2000 })) {
      const confirmBtn = confirmDialog.locator('button').filter({ hasText: /confirm|yes|create/i }).first();
      await confirmBtn.click();
      log('  Confirmed lead creation');
    }
  } catch {
    // No confirmation needed
  }

  // Wait for dialog to close and lead to appear in table
  await page.waitForTimeout(3000);

  // Verify lead appears in table
  try {
    await page.waitForSelector('text=Brodie', { timeout: 10000 });
    log('  ✓ Lead visible in table');
  } catch {
    logIssue('UI', 'Lead not visible in table after creation — refreshing');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    try {
      await page.waitForSelector('text=Brodie', { timeout: 5000 });
      log('  ✓ Lead visible after refresh');
    } catch {
      logIssue('UI', 'Lead still not visible after refresh');
    }
  }

  // ── Step 6: Update lead status to "won" via API ────────────────────────
  log('Step 6: Updating lead status to "won" via API');
  const statusResult = await page.evaluate(async () => {
    // API returns { success, data: [...], pagination }
    const leadsRes = await fetch('/api/leads?limit=50');
    if (!leadsRes.ok) return { ok: false, error: `Leads fetch failed: ${leadsRes.status}` };
    const result = await leadsRes.json();
    const leads = result.data || result; // handle both formats
    if (!Array.isArray(leads)) return { ok: false, error: 'Unexpected response format' };

    const brodie = leads.find(l => l.name?.includes('Brodie'));
    if (!brodie) return { ok: false, error: 'Brodie lead not found in API response' };

    // PATCH to update status
    const patchRes = await fetch(`/api/leads/${brodie.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'won' }),
    });

    return {
      ok: patchRes.ok,
      leadId: brodie.id,
      status: patchRes.status,
      body: await patchRes.json().catch(() => ({})),
    };
  });

  if (statusResult.ok) {
    log(`  ✓ Lead ${statusResult.leadId} status set to "won" via ${statusResult.method}`);
  } else {
    logIssue('API', `Failed to update status: ${JSON.stringify(statusResult).slice(0, 200)}`);
  }

  await page.waitForTimeout(2000);
  log('\n✓ Journey 3 complete — Steve & Karen Brodie lead created via contractor intake\n');

} catch (err) {
  logIssue('FATAL', `Journey 3 failed: ${err.message}`);
  console.error(err);

  try {
    await page.screenshot({ path: resolve(__dirname, 'journey-3-failure.png'), fullPage: true });
    log('  Saved failure screenshot');
  } catch { /* ignore */ }
} finally {
  await browser.close();
}
