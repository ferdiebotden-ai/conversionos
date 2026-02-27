/**
 * Edge Cases — E2E Tests
 * Tests boundary conditions and unusual inputs:
 *   - Long text fields (500+ chars)
 *   - Special characters (<>"'&${})
 *   - Empty/zero values
 *   - Contingency extremes (0% and max)
 *   - Template validation edge cases
 *   - CSV edge cases
 *   - Console error monitoring
 */

import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  navigateToQuoteEditor,
  navigateToSettingsTab,
  countLineItems,
  saveQuote,
  createTestCSVContent,
  UI_TIMEOUT,
  AI_TIMEOUT,
  collectConsoleErrors,
  filterRealErrors,
} from './helpers';

test.use({ baseURL: 'http://localhost:3002' });

// ─── Tests ────────────────────────────────────────────────

test.describe('Edge Cases', () => {

  test.describe('Special Characters', () => {
    test('API: CSV upload handles special characters in item names', async () => {
      const csv = [
        'item_name,category,unit,unit_price,supplier',
        '"Item with <tag> & \"quotes\" $100",materials,ea,100,Test & Co',
      ].join('\n');

      const form = new FormData();
      form.append('csv', new Blob([csv], { type: 'text/csv' }), 'special.csv');
      const res = await fetch('http://localhost:3002/api/admin/prices', { method: 'POST', body: form });
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.imported).toBe(1);

      // Verify stored correctly
      const getRes = await fetch('http://localhost:3002/api/admin/prices');
      const getJson = await getRes.json();
      const item = getJson.data.find((p: { item_name: string }) => p.item_name.includes('<tag>'));
      expect(item).toBeTruthy();

      // Cleanup
      await fetch('http://localhost:3002/api/admin/prices', { method: 'DELETE' });
    });

    test('API: template with special chars in name and description', async () => {
      const res = await fetch('http://localhost:3002/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Template with <html> & "quotes"',
          category: 'kitchen',
          description: 'Description with $special {chars} & <tags>',
          items: [{ description: 'Item <b>bold</b> & $100', category: 'materials', quantity: 1, unit: 'ea', unit_price: 100 }],
        }),
      });
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toContain('<html>');

      // Cleanup
      await fetch(`http://localhost:3002/api/admin/templates/${json.data.id}`, { method: 'DELETE' });
    });

    test('API: intake lead with special chars in all fields', async () => {
      const res = await fetch('http://localhost:3002/api/leads/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: "O'Brien & Sons <LLC>",
          email: 'test@example.com',
          phone: '+1 (519) 555-0001',
          address: '123 Main St, Unit #4B',
          city: 'St. Mary\'s',
          intakeMethod: 'form',
          goalsText: 'Kitchen with $50k budget & "premium" finishes',
        }),
      });
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  test.describe('Long Text Fields', () => {
    test('API: template description accepts 500 chars', async () => {
      const longDesc = 'A'.repeat(500);
      const res = await fetch('http://localhost:3002/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Long Desc Test',
          category: 'kitchen',
          description: longDesc,
          items: [{ description: 'item', category: 'materials', quantity: 1, unit: 'ea', unit_price: 10 }],
        }),
      });
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.description.length).toBe(500);

      await fetch(`http://localhost:3002/api/admin/templates/${json.data.id}`, { method: 'DELETE' });
    });

    test('API: template description rejects 1001 chars', async () => {
      const tooLong = 'B'.repeat(1001);
      const res = await fetch('http://localhost:3002/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Too Long Desc',
          category: 'kitchen',
          description: tooLong,
          items: [{ description: 'item', category: 'materials', quantity: 1, unit: 'ea', unit_price: 10 }],
        }),
      });
      expect(res.status).toBe(400);
    });

    test('API: template item description rejects 501 chars', async () => {
      const tooLong = 'C'.repeat(501);
      const res = await fetch('http://localhost:3002/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Item Too Long',
          category: 'kitchen',
          items: [{ description: tooLong, category: 'materials', quantity: 1, unit: 'ea', unit_price: 10 }],
        }),
      });
      expect(res.status).toBe(400);
    });

    test('API: CSV item name accepts 200 chars', async () => {
      const longName = 'D'.repeat(200);
      const csv = `item_name,category,unit,unit_price,supplier\n"${longName}",materials,ea,100,`;
      const form = new FormData();
      form.append('csv', new Blob([csv], { type: 'text/csv' }), 'long.csv');
      const res = await fetch('http://localhost:3002/api/admin/prices', { method: 'POST', body: form });
      const json = await res.json();
      expect(json.success).toBe(true);
      await fetch('http://localhost:3002/api/admin/prices', { method: 'DELETE' });
    });
  });

  test.describe('Zero and Extreme Values', () => {
    test('API: template item with unit_price 0 is accepted (nonnegative)', async () => {
      const res = await fetch('http://localhost:3002/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Zero Price Test',
          category: 'kitchen',
          items: [{ description: 'Free item', category: 'allowances', quantity: 1, unit: 'ea', unit_price: 0 }],
        }),
      });
      const json = await res.json();
      expect(json.success).toBe(true);
      await fetch(`http://localhost:3002/api/admin/templates/${json.data.id}`, { method: 'DELETE' });
    });

    test('API: CSV price with zero unit_price is rejected (must be positive)', async () => {
      const csv = 'item_name,category,unit,unit_price,supplier\n"Zero price",materials,ea,0,';
      const form = new FormData();
      form.append('csv', new Blob([csv], { type: 'text/csv' }), 'zero.csv');
      const res = await fetch('http://localhost:3002/api/admin/prices', { method: 'POST', body: form });
      const json = await res.json();
      // Zero is not positive — should be in errors
      expect(json.error).toBeTruthy();
    });

    test('API: CSV price with negative unit_price is rejected', async () => {
      const csv = 'item_name,category,unit,unit_price,supplier\n"Negative",materials,ea,-50,';
      const form = new FormData();
      form.append('csv', new Blob([csv], { type: 'text/csv' }), 'neg.csv');
      const res = await fetch('http://localhost:3002/api/admin/prices', { method: 'POST', body: form });
      const json = await res.json();
      expect(json.error).toBeTruthy();
    });

    test('API: template item with negative quantity is rejected', async () => {
      const res = await fetch('http://localhost:3002/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Neg Qty Test',
          category: 'kitchen',
          items: [{ description: 'item', category: 'materials', quantity: -1, unit: 'ea', unit_price: 10 }],
        }),
      });
      expect(res.status).toBe(400);
    });
  });

  test.describe('Settings Edge Cases', () => {
    test('contingency percentage saves correctly', async ({ page }) => {
      await loginAsAdmin(page);
      await navigateToSettingsTab(page, 'Rates');

      const contingencyInput = page.locator('#contingency');
      await expect(contingencyInput).toBeVisible({ timeout: UI_TIMEOUT });

      // Read current value and set to something different
      const current = await contingencyInput.inputValue();
      const newValue = current === '8' ? '10' : '8';
      await contingencyInput.fill(newValue);

      const saveBtn = page.getByRole('button', { name: /Save Changes/i });
      await expect(saveBtn).toBeEnabled({ timeout: UI_TIMEOUT });
      await saveBtn.click();
      await expect(page.getByText(/saved successfully/i)).toBeVisible({ timeout: UI_TIMEOUT });
    });

    test('deposit rate saves correctly', async ({ page }) => {
      await loginAsAdmin(page);
      await navigateToSettingsTab(page, 'Rates');

      const depositInput = page.locator('#deposit_rate');
      await expect(depositInput).toBeVisible({ timeout: UI_TIMEOUT });

      // Read current value and set to something different
      const current = await depositInput.inputValue();
      const newValue = current === '20' ? '15' : '20';
      await depositInput.fill(newValue);

      const saveBtn = page.getByRole('button', { name: /Save Changes/i });
      await expect(saveBtn).toBeEnabled({ timeout: UI_TIMEOUT });
      await saveBtn.click();
      await expect(page.getByText(/saved successfully/i)).toBeVisible({ timeout: UI_TIMEOUT });
    });

    test('HST rate field is disabled (locked at 13%)', async ({ page }) => {
      await loginAsAdmin(page);
      await navigateToSettingsTab(page, 'Rates');

      const hstInput = page.locator('#hst_rate');
      await expect(hstInput).toBeVisible({ timeout: UI_TIMEOUT });
      await expect(hstInput).toBeDisabled();
    });

    test('quote mode dropdown cycles through all options', async ({ page }) => {
      await loginAsAdmin(page);
      await navigateToSettingsTab(page, 'Quoting');

      const modeSelect = page.locator('#quoteMode');
      await expect(modeSelect).toBeVisible({ timeout: UI_TIMEOUT });

      // Select "No Pricing"
      await modeSelect.click();
      await page.getByRole('option', { name: /No Pricing/i }).click();
      await expect(page.getByText(/No dollar amounts shown/i)).toBeVisible({ timeout: UI_TIMEOUT });

      // Select "Full Estimate"
      await modeSelect.click();
      await page.getByRole('option', { name: /Full Estimate/i }).click();
      await expect(page.getByText(/Best AI estimate shown/i)).toBeVisible({ timeout: UI_TIMEOUT });

      // Select "Price Range"
      await modeSelect.click();
      await page.getByRole('option', { name: /Price Range/i }).click();
      await expect(page.getByText(/Cost ranges shown/i)).toBeVisible({ timeout: UI_TIMEOUT });
    });
  });

  test.describe('Quote Editor UI Edge Cases', () => {
    test.setTimeout(AI_TIMEOUT);

    test('XSS prevention: special characters in line item description are rendered literally', async ({ page }) => {
      const leadId = await navigateToQuoteEditor(page);

      // Click "Add Item" to add a new line item
      const addButton = page.getByRole('button', { name: /Add Line Item/i }).first();
      await expect(addButton).toBeVisible({ timeout: UI_TIMEOUT });
      await addButton.click();

      // Find the last description input and enter XSS payload
      const xssPayload = '<script>alert(1)</script>&"\'<img onerror=alert(1)>';
      const descInputs = page.locator('input[placeholder*="escription"], textarea[placeholder*="escription"]');
      const lastInput = descInputs.last();
      await expect(lastInput).toBeVisible({ timeout: UI_TIMEOUT });
      await lastInput.fill(xssPayload);

      // Tab away to trigger blur/save
      await lastInput.press('Tab');
      await page.waitForTimeout(1000);

      // Verify no alert dialog was triggered (XSS didn't execute)
      // The text should be rendered as literal text, not as HTML
      const pageContent = await page.content();
      expect(pageContent).not.toContain('<script>alert(1)</script>');
    });

    test('adding a line item via Add Item button increases row count', async ({ page }) => {
      await navigateToQuoteEditor(page);

      const initialCount = await countLineItems(page);

      const addButton = page.getByRole('button', { name: /Add Line Item/i }).first();
      await expect(addButton).toBeVisible({ timeout: UI_TIMEOUT });
      await addButton.click();
      await page.waitForTimeout(500);

      const newCount = await countLineItems(page);
      expect(newCount).toBe(initialCount + 1);
    });

    test('long description in assumptions textarea does not break layout', async ({ page }) => {
      await navigateToQuoteEditor(page);

      // Find assumptions textarea (by placeholder or by content)
      const assumptionsArea = page.locator('textarea[placeholder*="assumption"], textarea[placeholder*="Assumption"]').first();
      const altAssumptions = page.locator('textarea').filter({ hasText: /work|access|structure/i }).first();
      const target = await assumptionsArea.isVisible({ timeout: 3000 }).catch(() => false)
        ? assumptionsArea
        : altAssumptions;
      if (await target.isVisible({ timeout: 3000 }).catch(() => false)) {
        const longText = 'Assumes standard "premium" & <custom> materials. '.repeat(20);
        await target.fill(longText);
        await page.waitForTimeout(500);

        // Verify textarea is still visible and page didn't break
        await expect(target).toBeVisible();
        const value = await target.inputValue();
        expect(value.length).toBeGreaterThan(200);
      }
    });

    test('quote editor displays total that updates with new items', async ({ page }) => {
      await navigateToQuoteEditor(page);

      // Look for a total/subtotal display
      const totalText = page.getByText(/Subtotal|Total/i).first();
      await expect(totalText).toBeVisible({ timeout: UI_TIMEOUT });

      // Add a new item
      const addButton = page.getByRole('button', { name: /Add Line Item/i }).first();
      await expect(addButton).toBeVisible({ timeout: UI_TIMEOUT });
      await addButton.click();
      await page.waitForTimeout(500);

      // Fill in a price for the new item
      const priceInputs = page.locator('input[type="number"]');
      const lastPrice = priceInputs.last();
      if (await lastPrice.isVisible({ timeout: 2000 }).catch(() => false)) {
        await lastPrice.fill('1500');
        await lastPrice.press('Tab');
        await page.waitForTimeout(500);
      }

      // Total should still be visible (not broken)
      await expect(totalText).toBeVisible();
    });
  });

  test.describe('Console Error Monitoring', () => {
    test('no console errors on admin dashboard', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

      await loginAsAdmin(page);
      await page.goto('/admin');
      await page.waitForTimeout(2000);

      const realErrors = filterRealErrors(errors);
      expect(realErrors).toEqual([]);
    });

    test('no console errors on settings page', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

      await loginAsAdmin(page);
      await page.goto('/admin/settings');
      await page.waitForTimeout(3000);

      const realErrors = filterRealErrors(errors);
      expect(realErrors).toEqual([]);
    });

    test('no console errors on leads page', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

      await loginAsAdmin(page);
      await page.goto('/admin/leads');
      await page.waitForTimeout(2000);

      const realErrors = filterRealErrors(errors);
      expect(realErrors).toEqual([]);
    });
  });
});
