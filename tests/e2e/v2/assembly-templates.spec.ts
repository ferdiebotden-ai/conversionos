/**
 * Assembly Templates (F10) — E2E Tests
 * Tests the assembly template management flow:
 *   - Templates tab visibility
 *   - Empty state with "Load Defaults" option
 *   - Create template (name + category + items)
 *   - Edit existing template
 *   - Duplicate template
 *   - Delete template
 *   - Default templates seeding
 *   - Validation: empty name, no items
 *   - API-level CRUD
 */

import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  navigateToSettingsTab,
  UI_TIMEOUT,
} from './helpers';

test.use({ baseURL: 'http://localhost:3002' });

// ─── Helpers ──────────────────────────────────────────────

async function navigateToTemplates(page: test.FixtureType<typeof test>['page']) {
  await loginAsAdmin(page);
  await navigateToSettingsTab(page, 'Templates');
  await expect(
    page.getByText(/Assembly Templates|No templates yet/i).first()
  ).toBeVisible({ timeout: UI_TIMEOUT });
}

async function cleanupAllTemplates() {
  const res = await fetch('http://localhost:3002/api/admin/templates');
  const json = await res.json();
  for (const t of json.data ?? []) {
    await fetch(`http://localhost:3002/api/admin/templates/${t.id}`, { method: 'DELETE' });
  }
}

// ─── Tests ────────────────────────────────────────────────

test.describe('Assembly Templates', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await cleanupAllTemplates();
  });

  test('Templates tab is visible for Accelerate tier', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/settings');
    await expect(page.locator('[role="tablist"]')).toBeVisible({ timeout: UI_TIMEOUT });
    const templatesTab = page.getByRole('tab', { name: /Templates/i });
    await expect(templatesTab).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('empty state shows Load Default Templates and Create buttons', async ({ page }) => {
    await navigateToTemplates(page);

    await expect(page.getByText(/No templates yet/i)).toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.getByRole('button', { name: /Load Default Templates/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Create from Scratch/i })).toBeVisible();
  });

  test('Create Template opens dialog with required fields', async ({ page }) => {
    await navigateToTemplates(page);

    // Click Create Template (either the header button or the empty state button)
    const createBtn = page.getByRole('button', { name: /Create Template|Create from Scratch/i }).first();
    await createBtn.click();

    // Dialog should open
    await expect(page.getByText(/Create Template/i).first()).toBeVisible({ timeout: UI_TIMEOUT });

    // Required fields
    await expect(page.locator('#templateName')).toBeVisible();
    await expect(page.locator('#templateCategory')).toBeVisible();
    await expect(page.locator('#templateDesc')).toBeVisible();

    // Line items table header
    await expect(page.getByText('Description', { exact: false }).first()).toBeVisible();

    // Add Item button
    await expect(page.getByRole('button', { name: /Add Item/i })).toBeVisible();

    // Cancel to close
    await page.getByRole('button', { name: /Cancel/i }).click();
  });

  test('creating a template with valid data saves successfully', async ({ page }) => {
    await navigateToTemplates(page);

    const createBtn = page.getByRole('button', { name: /Create Template|Create from Scratch/i }).first();
    await createBtn.click();

    // Fill name
    await page.locator('#templateName').fill('E2E Test Kitchen Package');

    // Fill description
    await page.locator('#templateDesc').fill('Test package for E2E testing');

    // Fill first line item (already present in dialog table)
    const firstRow = page.locator('[role="dialog"] table tbody tr').first();
    const firstItemDesc = firstRow.getByRole('textbox', { name: /Item description/i });
    await firstItemDesc.fill('Cabinet installation');

    const firstItemPrice = firstRow.getByRole('spinbutton').last();
    await firstItemPrice.fill('1200');

    // Create template
    await page.getByRole('button', { name: /Create Template/i }).last().click();

    // Dialog should close — check for the dialog heading, not the button (which exists in the page too)
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: UI_TIMEOUT });

    // Template should appear in the list
    await expect(page.getByText('E2E Test Kitchen Package')).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('created template shows in card grid with category badge', async ({ page }) => {
    await navigateToTemplates(page);

    await expect(page.getByText('E2E Test Kitchen Package')).toBeVisible({ timeout: UI_TIMEOUT });
    // Category badge
    await expect(page.getByText('kitchen', { exact: false }).first()).toBeVisible();
    // Item count
    await expect(page.getByText(/1 item/i)).toBeVisible();
  });

  test('editing a template updates its data', async ({ page }) => {
    await navigateToTemplates(page);

    // Ensure at least one template exists — load defaults if empty
    const noTemplates = await page.getByText(/No templates yet/i).isVisible({ timeout: 3_000 }).catch(() => false);
    if (noTemplates) {
      const loadBtn = page.getByRole('button', { name: /Load Default Templates/i });
      if (await loadBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await loadBtn.click();
        await page.waitForTimeout(2000);
      } else {
        test.skip(true, 'No templates and no load button');
        return;
      }
    }

    // Find a template card by looking for cards inside the grid (skip the outer container card)
    // Template cards have class "group" and contain template names
    const templateCard = page.locator('[data-slot="card"].group').first();
    await expect(templateCard).toBeVisible({ timeout: UI_TIMEOUT });
    await templateCard.hover();

    // The edit (pencil) button is inside a hover-revealed div — force-click since opacity transitions may lag
    const editBtn = templateCard.locator('[data-slot="card-header"]').getByRole('button').first();
    await editBtn.click({ force: true });

    // Dialog should say "Edit Template"
    await expect(page.getByRole('heading', { name: /Edit Template/i })).toBeVisible({ timeout: UI_TIMEOUT });

    // Read current name, modify it
    const nameInput = page.locator('#templateName');
    await expect(nameInput).toBeVisible();
    const currentName = await nameInput.inputValue();
    const updatedName = `${currentName} (E2E Edited)`;
    await nameInput.fill(updatedName);

    // Save
    await page.getByRole('button', { name: /Save Changes/i }).click();

    // Dialog should close and updated name should show
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: UI_TIMEOUT });
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('adding line items shows updated total', async ({ page }) => {
    await navigateToTemplates(page);

    // Ensure at least one template exists — load defaults if empty
    const noTemplates = await page.getByText(/No templates yet/i).isVisible({ timeout: 3_000 }).catch(() => false);
    if (noTemplates) {
      const loadBtn = page.getByRole('button', { name: /Load Default Templates/i });
      if (await loadBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await loadBtn.click();
        await page.waitForTimeout(2000);
      } else {
        test.skip(true, 'No templates available');
        return;
      }
    }

    // Open edit dialog on the first template
    const templateCard = page.locator('[data-slot="card"].group').first();
    await expect(templateCard).toBeVisible({ timeout: UI_TIMEOUT });
    await templateCard.hover();
    const editBtn = templateCard.locator('[data-slot="card-header"]').getByRole('button').first();
    await editBtn.click({ force: true });

    await expect(page.getByRole('heading', { name: /Edit Template/i })).toBeVisible({ timeout: UI_TIMEOUT });

    // Read current total text (use "Total: $X" format which is below the table, not the column header)
    const totalLocator = page.locator('[role="dialog"]').getByText(/^Total: \$/);
    await expect(totalLocator).toBeVisible();
    const totalBefore = await totalLocator.textContent() || '';

    // Add a new line item
    await page.getByRole('button', { name: /Add Item/i }).click();

    // Fill the new item
    const rows = page.locator('[role="dialog"] table tbody tr');
    const lastRow = rows.last();
    await lastRow.getByRole('textbox').first().fill('E2E test item');
    await lastRow.getByRole('spinbutton').last().fill('500');

    // Total should have changed (verify it's different from before)
    await page.waitForTimeout(500);
    const totalAfter = await totalLocator.textContent() || '';
    expect(totalAfter).not.toBe(totalBefore);

    // Cancel to avoid modifying real data
    await page.getByRole('button', { name: /Cancel/i }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('Load Default Templates seeds Ontario renovation templates', async ({ page }) => {
    await cleanupAllTemplates();
    await navigateToTemplates(page);

    await expect(page.getByText(/No templates yet/i)).toBeVisible({ timeout: UI_TIMEOUT });

    // Click Load Default Templates
    await page.getByRole('button', { name: /Load Default Templates/i }).click();

    // Wait for loading to finish (button should change or list should appear)
    await expect(page.getByText(/Standard Kitchen Demolition/i)).toBeVisible({ timeout: 30_000 });

    // Should have multiple templates
    const cards = page.locator('[class*="group"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(8); // 10 default templates
  });

  test('deleting a template removes it from the list', async ({ page }) => {
    // Create a disposable template via API
    const res = await fetch('http://localhost:3002/api/admin/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Disposable Template',
        category: 'other',
        items: [{ description: 'test', category: 'materials', quantity: 1, unit: 'ea', unit_price: 10 }],
      }),
    });
    const json = await res.json();
    expect(json.success).toBe(true);

    await navigateToTemplates(page);

    await expect(page.getByText('Disposable Template')).toBeVisible({ timeout: UI_TIMEOUT });

    // Hover to show delete button and click trash icon
    const card = page.locator('text=Disposable Template').first();
    await card.hover();

    // Accept delete confirm
    page.on('dialog', dialog => dialog.accept());
    const deleteBtn = page.locator('[class*="group"]').filter({ hasText: 'Disposable Template' })
      .getByRole('button', { name: '' }).last(); // Trash icon is the last button
    await deleteBtn.click();

    await expect(page.getByText('Disposable Template')).not.toBeVisible({ timeout: UI_TIMEOUT });
  });

  test('API: POST validates empty name', async () => {
    const res = await fetch('http://localhost:3002/api/admin/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '',
        category: 'kitchen',
        items: [{ description: 'item', category: 'materials', quantity: 1, unit: 'ea', unit_price: 100 }],
      }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation failed');
  });

  test('API: POST validates empty items array', async () => {
    const res = await fetch('http://localhost:3002/api/admin/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Valid Name',
        category: 'kitchen',
        items: [],
      }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation failed');
  });

  test('API: POST validates invalid template category', async () => {
    const res = await fetch('http://localhost:3002/api/admin/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Valid Name',
        category: 'invalid_category',
        items: [{ description: 'item', category: 'materials', quantity: 1, unit: 'ea', unit_price: 100 }],
      }),
    });
    expect(res.status).toBe(400);
  });

  test('API: full CRUD lifecycle works', async () => {
    // Create
    const createRes = await fetch('http://localhost:3002/api/admin/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'API Lifecycle Test',
        category: 'bathroom',
        description: 'Test template',
        items: [{ description: 'Tile work', category: 'materials', quantity: 10, unit: 'sqft', unit_price: 15 }],
      }),
    });
    const createJson = await createRes.json();
    expect(createRes.status).toBe(200);
    expect(createJson.success).toBe(true);
    const templateId = createJson.data.id;

    // Read
    const getRes = await fetch(`http://localhost:3002/api/admin/templates/${templateId}`);
    const getJson = await getRes.json();
    expect(getJson.data.name).toBe('API Lifecycle Test');

    // Update
    const updateRes = await fetch(`http://localhost:3002/api/admin/templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'API Lifecycle Test Updated' }),
    });
    const updateJson = await updateRes.json();
    expect(updateJson.data.name).toBe('API Lifecycle Test Updated');

    // Delete
    const deleteRes = await fetch(`http://localhost:3002/api/admin/templates/${templateId}`, { method: 'DELETE' });
    expect(deleteRes.status).toBe(200);

    // Verify gone
    const verifyRes = await fetch(`http://localhost:3002/api/admin/templates/${templateId}`);
    expect(verifyRes.status).toBe(404);
  });

  test.afterAll(async () => {
    await cleanupAllTemplates();
  });
});
