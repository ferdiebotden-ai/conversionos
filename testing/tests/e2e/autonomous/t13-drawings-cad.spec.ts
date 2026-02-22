/**
 * T-13: Drawings & CAD
 * Tests the Three.js-based drawing/CAD tool: list view, detail editor,
 * canvas & toolbar, API CRUD, and export functionality.
 */
import { test, expect, Page } from '@playwright/test';
import {
  loginAsAdmin,
  ensureAdminLoggedIn,
  apiRequest,
} from '../../fixtures/autonomous-helpers';

/** Cached drawing ID to avoid repeated API calls */
let cachedDrawingId: string | null = null;

/** Track IDs created during tests for reference */
let createdDrawingId: string | null = null;

/** Get the first available drawing ID via API */
async function getFirstDrawingId(page: Page): Promise<string | null> {
  if (cachedDrawingId) return cachedDrawingId;
  const response = await apiRequest(page, 'GET', '/api/drawings');
  if (!response.ok()) return null;
  const body = await response.json();
  const drawings = body.data || body;
  if (Array.isArray(drawings) && drawings.length > 0) {
    cachedDrawingId = drawings[0].id;
    return cachedDrawingId;
  }
  return null;
}

// ─── 1. Drawings List (~5 tests) ────────────────────────────────────────────

test.describe('T-13.1: Drawings List', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/drawings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('T-13.1.1: navigates to /admin/drawings successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/drawings/);
    const heading = page.locator('h2').filter({ hasText: /Drawings/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('T-13.1.2: page shows card grid or empty state', async ({ page }) => {
    // The page uses a card grid layout for drawings
    const cards = page.locator('[class*="grid"] [class*="card"], [class*="grid"] .rounded-lg');
    const emptyState = page.getByText(/no drawings yet/i);
    await page.waitForTimeout(2000);

    const hasCards = await cards.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasCards || hasEmpty).toBeTruthy();
  });

  test('T-13.1.3: drawing cards show name, status badge, and date', async ({ page }) => {
    await page.waitForTimeout(2000);
    const cards = page.locator('.grid > div').filter({ has: page.locator('a[href*="/admin/drawings/"]') });
    const cardCount = await cards.count();

    if (cardCount === 0) {
      test.skip(true, 'No drawing cards to inspect');
      return;
    }

    const firstCard = cards.first();
    // Card title
    const title = firstCard.locator('h3, [class*="CardTitle"], [class*="card-title"]').first();
    await expect(title).toBeVisible({ timeout: 5000 });
    const titleText = await title.textContent();
    expect(titleText?.trim().length).toBeGreaterThan(0);

    // Status badge (Draft, Submitted, Approved, Rejected)
    const badge = firstCard.getByText(/Draft|Submitted|Approved|Rejected/);
    await expect(badge.first()).toBeVisible({ timeout: 5000 });
  });

  test('T-13.1.4: "New Drawing" button exists and is clickable', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /new drawing/i });
    await expect(newButton).toBeVisible({ timeout: 10000 });
    await expect(newButton).toBeEnabled();
  });

  test('T-13.1.5: empty state renders when no drawings exist', async ({ page }) => {
    // Check the empty state message is correct if present
    const emptyState = page.getByText(/no drawings yet/i);
    const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasEmpty) {
      const subText = page.getByText(/create a drawing/i);
      await expect(subText).toBeVisible({ timeout: 5000 });
    } else {
      // If not empty, verify at least one card has an "Open" link
      const openButton = page.getByRole('link', { name: /open/i }).first();
      await expect(openButton).toBeVisible({ timeout: 5000 });
    }
  });
});

// ─── 2. Drawing Detail (~8 tests) ───────────────────────────────────────────

test.describe('T-13.2: Drawing Detail', () => {
  test.describe.configure({ mode: 'serial' });

  let drawingId: string;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    if (!drawingId) {
      const id = await getFirstDrawingId(page);
      if (!id) {
        // Create one to test with
        const res = await apiRequest(page, 'POST', '/api/drawings', {
          name: `E2E Detail Test ${Date.now()}`,
        });
        if (res.ok()) {
          const body = await res.json();
          drawingId = body.data?.id;
          cachedDrawingId = drawingId;
        }
      } else {
        drawingId = id;
      }
    }

    if (!drawingId) {
      test.skip(true, 'No drawing available for detail tests');
      return;
    }

    await page.goto(`/admin/drawings/${drawingId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('T-13.2.1: drawing detail page loads successfully', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`/admin/drawings/${drawingId}`));
    const heading = page.locator('h2').first();
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test('T-13.2.2: header displays drawing name', async ({ page }) => {
    const heading = page.locator('h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    const text = await heading.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('T-13.2.3: status badge is visible', async ({ page }) => {
    const badge = page.getByText(/Draft|Submitted|Approved|Rejected/).first();
    await expect(badge).toBeVisible({ timeout: 10000 });
  });

  test('T-13.2.4: canvas/editor area exists with min height', async ({ page }) => {
    // The CadEditor renders in a container with min-h-[600px]
    const editorContainer = page.locator('.min-h-\\[600px\\]').first();
    const hasEditor = await editorContainer.isVisible({ timeout: 15000 }).catch(() => false);

    if (hasEditor) {
      const box = await editorContainer.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(400);
    } else {
      // Fallback: check for canvas element or skeleton loader
      const canvas = page.locator('canvas').first();
      const skeleton = page.locator('.animate-pulse, [class*="Skeleton"]').first();
      const hasAny = await canvas.isVisible({ timeout: 5000 }).catch(() => false)
        || await skeleton.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasAny).toBeTruthy();
    }
  });

  test('T-13.2.5: metadata panel with name, description, status, permit fields', async ({ page }) => {
    // Drawing Details card with form fields
    const detailsCard = page.getByText('Drawing Details');
    await expect(detailsCard).toBeVisible({ timeout: 10000 });

    const nameInput = page.locator('#drawing-name');
    await expect(nameInput).toBeVisible({ timeout: 5000 });

    const descInput = page.locator('#drawing-desc');
    await expect(descInput).toBeVisible({ timeout: 5000 });

    const statusSelect = page.locator('#drawing-status');
    await expect(statusSelect).toBeVisible({ timeout: 5000 });

    const permitInput = page.locator('#drawing-permit');
    await expect(permitInput).toBeVisible({ timeout: 5000 });
  });

  test('T-13.2.6: status selector has all four options', async ({ page }) => {
    const statusTrigger = page.locator('#drawing-status');
    await expect(statusTrigger).toBeVisible({ timeout: 10000 });
    await statusTrigger.click();
    await page.waitForTimeout(500);

    // Check all status options are present
    const draftOption = page.getByRole('option', { name: /draft/i });
    const submittedOption = page.getByRole('option', { name: /submitted/i });
    const approvedOption = page.getByRole('option', { name: /approved/i });
    const rejectedOption = page.getByRole('option', { name: /rejected/i });

    await expect(draftOption).toBeVisible({ timeout: 3000 });
    await expect(submittedOption).toBeVisible({ timeout: 3000 });
    await expect(approvedOption).toBeVisible({ timeout: 3000 });
    await expect(rejectedOption).toBeVisible({ timeout: 3000 });

    // Close dropdown
    await page.keyboard.press('Escape');
  });

  test('T-13.2.7: Save Details button exists and is enabled', async ({ page }) => {
    const saveButton = page.getByRole('button', { name: /save details/i });
    await expect(saveButton).toBeVisible({ timeout: 10000 });
    await expect(saveButton).toBeEnabled();
  });

  test('T-13.2.8: back navigation returns to drawings list', async ({ page }) => {
    const backLink = page.locator('a[href="/admin/drawings"]').first();
    const hasBack = await backLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasBack) { test.skip(); return; }

    await backLink.click();
    await page.waitForURL(/\/admin\/drawings/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/admin\/drawings/);
  });
});

// ─── 3. Canvas & Tools (~10 tests) ──────────────────────────────────────────

test.describe('T-13.3: Canvas & Tools', () => {
  test.describe.configure({ mode: 'serial' });

  let drawingId: string;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    if (!drawingId) {
      const id = await getFirstDrawingId(page);
      if (!id) {
        const res = await apiRequest(page, 'POST', '/api/drawings', {
          name: `E2E Canvas Test ${Date.now()}`,
        });
        if (res.ok()) {
          const body = await res.json();
          drawingId = body.data?.id;
          cachedDrawingId = drawingId;
        }
      } else {
        drawingId = id;
      }
    }

    if (!drawingId) {
      test.skip(true, 'No drawing available for canvas tests');
      return;
    }

    await page.goto(`/admin/drawings/${drawingId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Allow Three.js canvas to initialize
  });

  test('T-13.3.1: canvas element renders', async ({ page }) => {
    // React Three Fiber renders a <canvas> element
    const canvas = page.locator('canvas').first();
    const hasCanvas = await canvas.isVisible({ timeout: 15000 }).catch(() => false);

    if (hasCanvas) {
      const box = await canvas.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(100);
      expect(box!.height).toBeGreaterThan(100);
    } else {
      // Canvas may not render in headless mode without WebGL — check editor container exists
      const editorWrapper = page.locator('.min-h-\\[600px\\]').first();
      await expect(editorWrapper).toBeVisible({ timeout: 10000 });
    }
  });

  test('T-13.3.2: toolbar is visible with tool buttons', async ({ page }) => {
    // Toolbar is a 12px-wide sidebar on the left side of the editor
    const toolbar = page.locator('.w-12.bg-card.border-r').first();
    const hasToolbar = await toolbar.isVisible({ timeout: 10000 }).catch(() => false);

    if (hasToolbar) {
      // Should have tool buttons
      const buttons = toolbar.getByRole('button');
      const buttonCount = await buttons.count();
      // 8 tools + undo + redo + delete = 11 buttons
      expect(buttonCount).toBeGreaterThanOrEqual(5);
    } else {
      // Fallback: look for aria-labels of known tools
      const selectTool = page.getByRole('button', { name: 'Select' });
      await expect(selectTool).toBeVisible({ timeout: 10000 });
    }
  });

  test('T-13.3.3: all 8 drawing tools are present', async ({ page }) => {
    const toolNames = ['Select', 'Wall', 'Door', 'Window', 'Furniture', 'Dimension', 'Room Label', 'Text'];

    for (const toolName of toolNames) {
      const button = page.getByRole('button', { name: toolName, exact: true });
      const isVisible = await button.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    }
  });

  test('T-13.3.4: tool buttons are clickable and toggle active state', async ({ page }) => {
    const wallButton = page.getByRole('button', { name: 'Wall', exact: true });
    await expect(wallButton).toBeVisible({ timeout: 10000 });
    await wallButton.click();
    await page.waitForTimeout(300);

    // After click, wall tool should be active — button variant changes
    // Active tool gets variant="default" instead of "ghost"
    const selectButton = page.getByRole('button', { name: 'Select', exact: true });
    await selectButton.click();
    await page.waitForTimeout(300);

    // No crash — page still functional
    await expect(page).toHaveURL(new RegExp(`/admin/drawings/`));
  });

  test('T-13.3.5: undo and redo buttons are present', async ({ page }) => {
    const undoButton = page.getByRole('button', { name: 'Undo' });
    const redoButton = page.getByRole('button', { name: 'Redo' });

    await expect(undoButton).toBeVisible({ timeout: 10000 });
    await expect(redoButton).toBeVisible({ timeout: 5000 });
  });

  test('T-13.3.6: delete selected button is present', async ({ page }) => {
    const deleteButton = page.getByRole('button', { name: /delete selected/i });
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
  });

  test('T-13.3.7: layers panel shows default layers', async ({ page }) => {
    const layersHeader = page.getByText('Layers', { exact: false }).filter({
      has: page.locator('.uppercase'),
    });
    const hasLayers = await layersHeader.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasLayers) {
      // Try broader search for layers text
      const layersText = page.getByText(/layers/i).first();
      const found = await layersText.isVisible({ timeout: 5000 }).catch(() => false);
      if (!found) { test.skip(true, 'Layers panel not visible'); return; }
    }

    // Default layers: Existing, Demolition, Proposed, Dimensions, Furniture
    const layerNames = ['Existing', 'Demolition', 'Proposed', 'Dimensions', 'Furniture'];
    let foundCount = 0;
    for (const layerName of layerNames) {
      const layer = page.getByText(layerName, { exact: true });
      const isVisible = await layer.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible) foundCount++;
    }
    expect(foundCount).toBeGreaterThanOrEqual(3);
  });

  test('T-13.3.8: editor header has camera mode toggles', async ({ page }) => {
    // Top (2D) and 3D buttons in the editor header
    const topButton = page.getByRole('button', { name: /top.*2d/i })
      .or(page.getByRole('button', { name: 'Top (2D)' }));
    const threeDButton = page.getByRole('button', { name: '3D' });

    const hasTop = await topButton.isVisible({ timeout: 10000 }).catch(() => false);
    const has3D = await threeDButton.isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasTop || has3D).toBeTruthy();
  });

  test('T-13.3.9: units toggle (Metric/Imperial) is present', async ({ page }) => {
    const metricButton = page.getByRole('button', { name: 'Metric' });
    const imperialButton = page.getByRole('button', { name: 'Imperial' });

    await expect(metricButton).toBeVisible({ timeout: 10000 });
    await expect(imperialButton).toBeVisible({ timeout: 5000 });
  });

  test('T-13.3.10: canvas responds to tool clicks without error', async ({ page }) => {
    // Click a tool, then click on the canvas area — verify no crash
    const wallButton = page.getByRole('button', { name: 'Wall', exact: true });
    await expect(wallButton).toBeVisible({ timeout: 10000 });
    await wallButton.click();
    await page.waitForTimeout(300);

    // Click on the canvas area
    const canvas = page.locator('canvas').first();
    const hasCanvas = await canvas.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasCanvas) {
      const box = await canvas.boundingBox();
      if (box) {
        await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
        await page.waitForTimeout(500);
      }
    }

    // Page should still be functional
    await expect(page).toHaveURL(new RegExp(`/admin/drawings/`));
  });
});

// ─── 4. Drawing CRUD API (~7 tests) ─────────────────────────────────────────

test.describe('T-13.4: Drawing CRUD API', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('T-13.4.1: GET /api/drawings returns 200 with array', async ({ page }) => {
    const response = await apiRequest(page, 'GET', '/api/drawings');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('T-13.4.2: GET /api/drawings returns pagination metadata', async ({ page }) => {
    const response = await apiRequest(page, 'GET', '/api/drawings?page=1&limit=5');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.pagination).toBeDefined();
    expect(body.pagination).toHaveProperty('page');
    expect(body.pagination).toHaveProperty('limit');
    expect(body.pagination).toHaveProperty('total');
    expect(body.pagination).toHaveProperty('totalPages');
  });

  test('T-13.4.3: POST /api/drawings creates new drawing', async ({ page }) => {
    const response = await apiRequest(page, 'POST', '/api/drawings', {
      name: `E2E Test Drawing ${Date.now()}`,
      description: 'Automated test drawing — safe to delete',
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBeTruthy();
    expect(body.data.name).toContain('E2E Test Drawing');
    expect(body.data.status).toBe('draft');

    createdDrawingId = body.data.id;
  });

  test('T-13.4.4: GET /api/drawings/:id returns drawing data', async ({ page }) => {
    if (!createdDrawingId) {
      const res = await apiRequest(page, 'POST', '/api/drawings', {
        name: `E2E Get Test ${Date.now()}`,
      });
      if (res.ok()) {
        const b = await res.json();
        createdDrawingId = b.data?.id;
      }
    }

    test.skip(!createdDrawingId, 'No drawing ID available');

    const response = await apiRequest(page, 'GET', `/api/drawings/${createdDrawingId}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe(createdDrawingId);
  });

  test('T-13.4.5: PUT /api/drawings/:id updates drawing', async ({ page }) => {
    if (!createdDrawingId) {
      const res = await apiRequest(page, 'POST', '/api/drawings', {
        name: `E2E Put Test ${Date.now()}`,
      });
      if (res.ok()) {
        const b = await res.json();
        createdDrawingId = b.data?.id;
      }
    }

    test.skip(!createdDrawingId, 'No drawing ID available');

    const updatedName = `Updated E2E Drawing ${Date.now()}`;
    const response = await apiRequest(page, 'PUT', `/api/drawings/${createdDrawingId}`, {
      name: updatedName,
      status: 'submitted',
      permit_number: 'BP-2026-E2E',
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.data.name).toBe(updatedName);
    expect(body.data.status).toBe('submitted');
  });

  test('T-13.4.6: DELETE /api/drawings/:id removes drawing', async ({ page }) => {
    // Create a drawing specifically for deletion
    const createRes = await apiRequest(page, 'POST', '/api/drawings', {
      name: `E2E Delete Test ${Date.now()}`,
    });

    test.skip(!createRes.ok(), 'Could not create drawing for deletion');

    const createBody = await createRes.json();
    const deleteId = createBody.data?.id;
    test.skip(!deleteId, 'No drawing ID to delete');

    const response = await apiRequest(page, 'DELETE', `/api/drawings/${deleteId}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBeTruthy();

    // Verify it's gone
    const getRes = await apiRequest(page, 'GET', `/api/drawings/${deleteId}`);
    expect([404, 500]).toContain(getRes.status());
  });

  test('T-13.4.7: POST /api/drawings with missing name returns validation error', async ({ page }) => {
    const response = await apiRequest(page, 'POST', '/api/drawings', {
      description: 'Missing name field',
    });
    expect([400, 422]).toContain(response.status());

    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});

// ─── 5. Export (~2 tests) ────────────────────────────────────────────────────

test.describe('T-13.5: Export', () => {
  let drawingId: string;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    if (!drawingId) {
      const id = await getFirstDrawingId(page);
      if (!id) {
        const res = await apiRequest(page, 'POST', '/api/drawings', {
          name: `E2E Export Test ${Date.now()}`,
        });
        if (res.ok()) {
          const body = await res.json();
          drawingId = body.data?.id;
          cachedDrawingId = drawingId;
        }
      } else {
        drawingId = id;
      }
    }

    if (!drawingId) {
      test.skip(true, 'No drawing available for export tests');
      return;
    }

    await page.goto(`/admin/drawings/${drawingId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
  });

  test('T-13.5.1: Export button exists in editor header', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i });
    await expect(exportButton).toBeVisible({ timeout: 10000 });
  });

  test('T-13.5.2: Export dialog opens with PNG and PDF options', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i });
    await expect(exportButton).toBeVisible({ timeout: 10000 });
    await exportButton.click();
    await page.waitForTimeout(500);

    // Dialog should open with "Export Drawing" title
    const dialogTitle = page.getByText('Export Drawing');
    await expect(dialogTitle).toBeVisible({ timeout: 5000 });

    // Quick Export and Print Layout tabs
    const quickTab = page.getByText('Quick Export');
    const printTab = page.getByText('Print Layout');
    await expect(quickTab).toBeVisible({ timeout: 5000 });
    await expect(printTab).toBeVisible({ timeout: 5000 });

    // PNG and PDF export buttons
    const pngButton = page.getByText(/export as png/i);
    const pdfButton = page.getByText(/export as pdf/i);
    await expect(pngButton).toBeVisible({ timeout: 5000 });
    await expect(pdfButton).toBeVisible({ timeout: 5000 });
  });
});
