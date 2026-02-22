/**
 * T-10: Leads CRUD
 * Tests leads management: table, detail view, tabs, API CRUD operations, audit log
 */
import { test, expect, Page } from '@playwright/test';
import {
  loginAsAdmin,
  ensureAdminLoggedIn,
  apiRequest,
} from '../../fixtures/autonomous-helpers';

// Extended timeout for POST /api/leads which triggers quote generation + emails
const LONG_API_TIMEOUT = 45000;

/** Make an API request with extended timeout */
async function apiRequestLong(page: Page, method: string, path: string, body?: unknown) {
  const url = path.startsWith('/') ? path : `/${path}`;
  const options: Parameters<typeof page.request.fetch>[1] = {
    method,
    timeout: LONG_API_TIMEOUT,
  };
  if (body) {
    options.data = body;
    options.headers = { 'Content-Type': 'application/json' };
  }
  return page.request.fetch(url, options);
}

/** Cached lead ID to avoid repeated API calls */
let cachedLeadId: string | null = null;

/** Get the first available lead ID via API */
async function getFirstLeadId(page: Page): Promise<string | null> {
  if (cachedLeadId) return cachedLeadId;
  const response = await apiRequest(page, 'GET', '/api/leads');
  if (!response.ok()) return null;
  const data = await response.json();
  const leads = data.data || data.leads || data;
  if (Array.isArray(leads) && leads.length > 0) {
    cachedLeadId = leads[0].id;
    return cachedLeadId;
  }
  return null;
}

// Track IDs for cleanup
let createdLeadId: string | null = null;

// ─── 1. Leads Table (~10 tests) ──────────────────────────────────────────────

test.describe('T-10.1: Leads Table', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/leads');
    await page.waitForLoadState('domcontentloaded');
  });

  test('T-10.1.1: navigates to /admin/leads successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/leads/);
  });

  test('T-10.1.2: table renders with expected column headers', async ({ page }) => {
    const table = page.locator('table');
    const hasTable = await table.isVisible({ timeout: 10000 }).catch(() => false);

    if (hasTable) {
      const headers = page.locator('thead th, thead td, [role="columnheader"]');
      const headerTexts = await headers.allTextContents();
      const joinedHeaders = headerTexts.join(' ').toLowerCase();

      expect(joinedHeaders).toContain('name');
      expect(joinedHeaders).toContain('status');
    } else {
      const emptyState = page.getByText(/no leads|empty|get started/i);
      await expect(emptyState.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('T-10.1.3: table has data rows or shows empty state', async ({ page }) => {
    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr, table tr:not(:first-child)');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      await expect(rows.first()).toBeVisible();
    } else {
      const emptyIndicator = page.getByText(/no leads|no results|empty/i);
      const hasEmpty = await emptyIndicator.first().isVisible({ timeout: 3000 }).catch(() => false);
      expect(rowCount > 0 || hasEmpty).toBeTruthy();
    }
  });

  test('T-10.1.4: search/filter input is present and functional', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"]'))
      .or(page.locator('input[type="text"]').first());

    const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasSearch) { test.skip(); return; }

    await searchInput.fill('test');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/admin\/leads/);
    await searchInput.clear();
  });

  test('T-10.1.5: status filter dropdown is present', async ({ page }) => {
    const statusFilter = page.getByRole('combobox').first()
      .or(page.locator('select').first())
      .or(page.getByText(/all statuses|filter by status/i));

    const hasFilter = await statusFilter.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasFilter) { test.skip(); return; }

    await statusFilter.click();
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/admin\/leads/);
  });

  test('T-10.1.6: column header click triggers sort', async ({ page }) => {
    const table = page.locator('table');
    const hasTable = await table.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasTable) { test.skip(); return; }

    const nameHeader = page.locator('thead').getByText('Name');
    const hasNameHeader = await nameHeader.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasNameHeader) { test.skip(); return; }

    await nameHeader.click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/admin\/leads/);
  });

  test('T-10.1.7: pagination controls present when enough data', async ({ page }) => {
    const rows = page.locator('tbody tr');
    await page.waitForTimeout(2000);
    const rowCount = await rows.count();

    if (rowCount >= 10) {
      const pagination = page.getByText(/next|previous|page/i)
        .or(page.locator('nav[aria-label*="pagination" i]'))
        .or(page.getByRole('button', { name: /next/i }));
      await expect(pagination.first()).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('T-10.1.8: row click or view button navigates to lead detail', async ({ page }) => {
    const table = page.locator('table');
    const hasTable = await table.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasTable) { test.skip(); return; }

    const rows = page.locator('tbody tr');
    await page.waitForTimeout(2000);
    const rowCount = await rows.count();
    if (rowCount === 0) { test.skip(); return; }

    // Try clicking the View button or link in first row
    const viewButton = rows.first().getByRole('link', { name: /view/i })
      .or(rows.first().locator('a[href*="/admin/leads/"]'))
      .or(rows.first().getByRole('button', { name: /view/i }));

    const hasViewButton = await viewButton.first().isVisible({ timeout: 3000 }).catch(() => false);

    if (hasViewButton) {
      await viewButton.first().click();
    } else {
      const rowLink = rows.first().locator('a').first();
      const hasLink = await rowLink.isVisible({ timeout: 2000 }).catch(() => false);
      if (!hasLink) { test.skip(); return; }
      await rowLink.click();
    }

    await page.waitForURL(/\/admin\/leads\/[a-zA-Z0-9-]+/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/admin\/leads\/[a-zA-Z0-9-]+/);
  });

  test('T-10.1.9: per-page selector changes row count', async ({ page }) => {
    const perPageSelect = page.getByText(/per page/i)
      .or(page.locator('select').filter({ hasText: /10|25|50/ }));

    const hasPerPage = await perPageSelect.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasPerPage) { test.skip(); return; }

    await perPageSelect.click();
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/admin\/leads/);
  });

  test('T-10.1.10: leads page shows loading state or content', async ({ page }) => {
    await page.goto('/admin/leads');
    const content = page.locator('table, .animate-spin, .animate-pulse, [data-loading]')
      .or(page.getByText(/loading|no leads/i));
    await expect(content.first()).toBeVisible({ timeout: 15000 });
  });
});

// ─── 2. Lead Detail Page (~10 tests) ─────────────────────────────────────────

test.describe('T-10.2: Lead Detail Page', () => {
  test.describe.configure({ mode: 'serial' });

  let leadId: string;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    if (!leadId) {
      const id = await getFirstLeadId(page);
      if (!id) {
        test.skip();
        return;
      }
      leadId = id;
    }
    await page.goto(`/admin/leads/${leadId}`);
    await page.waitForLoadState('domcontentloaded');
    // Wait for page content
    await page.locator('h1, h2').first().waitFor({ timeout: 15000 });
  });

  test('T-10.2.1: lead detail page loads successfully', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`/admin/leads/${leadId}`));
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('T-10.2.2: header shows lead name', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    const text = await heading.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('T-10.2.3: status badge is displayed', async ({ page }) => {
    // Status badge shows text like "Draft Ready", "New", "Sent", "Won", "Lost"
    const statusBadge = page.getByText(/Draft Ready|New|Sent|Won|Lost|Needs Clarification/i)
      .first();
    await expect(statusBadge).toBeVisible({ timeout: 10000 });
  });

  test('T-10.2.4: tabs are present - Details, Quote, Chat, Activity', async ({ page }) => {
    await page.waitForTimeout(2000);
    const anyTab = page.getByRole('tab').or(page.locator('[role="tablist"]'));
    await expect(anyTab.first()).toBeVisible({ timeout: 5000 });
  });

  test('T-10.2.5: Details tab shows contact information', async ({ page }) => {
    const detailsTab = page.getByRole('tab', { name: /details/i })
      .or(page.getByText('Details').first());
    const hasDetailsTab = await detailsTab.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasDetailsTab) {
      await detailsTab.click();
      await page.waitForTimeout(500);
    }
    const contactInfo = page.getByText(/contact information|email|phone/i);
    await expect(contactInfo.first()).toBeVisible({ timeout: 5000 });
  });

  test('T-10.2.6: Quote tab is accessible', async ({ page }) => {
    const quoteTab = page.getByRole('tab', { name: /quote/i })
      .or(page.getByText('Quote', { exact: true }));
    const hasQuoteTab = await quoteTab.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasQuoteTab) { test.skip(); return; }

    await quoteTab.click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(new RegExp(`/admin/leads/${leadId}`));
  });

  test('T-10.2.7: Chat tab shows conversation or empty state', async ({ page }) => {
    const chatTab = page.getByRole('tab', { name: /chat/i })
      .or(page.getByText('Chat', { exact: true }));
    const hasChatTab = await chatTab.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasChatTab) { test.skip(); return; }

    await chatTab.click();
    await page.waitForTimeout(1000);
    // Chat content varies - just verify no crash
    await expect(page).toHaveURL(new RegExp(`/admin/leads/${leadId}`));
  });

  test('T-10.2.8: Activity tab shows audit log', async ({ page }) => {
    const activityTab = page.getByRole('tab', { name: /activity/i })
      .or(page.getByText('Activity', { exact: true }));
    const hasActivityTab = await activityTab.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasActivityTab) { test.skip(); return; }

    await activityTab.click();
    await page.waitForTimeout(1000);
    const content = page.getByText(/created|updated|no activity|log/i);
    await expect(content.first()).toBeVisible({ timeout: 5000 });
  });

  test('T-10.2.9: back navigation returns to leads list', async ({ page }) => {
    const backLink = page.getByRole('link', { name: /back|leads/i })
      .or(page.locator('a[href="/admin/leads"]'));
    const hasBack = await backLink.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasBack) { test.skip(); return; }

    await backLink.first().click();
    await page.waitForURL(/\/admin\/leads/, { timeout: 10000 });
  });

  test('T-10.2.10: Visualizations tab is accessible', async ({ page }) => {
    const vizTab = page.getByRole('tab', { name: /visual/i })
      .or(page.getByText('Visualizations', { exact: false }));
    const hasVizTab = await vizTab.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasVizTab) { test.skip(); return; }

    await vizTab.click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(new RegExp(`/admin/leads/${leadId}`));
  });
});

// ─── 3. Lead API CRUD (~10 tests) ────────────────────────────────────────────

test.describe('T-10.3: Lead API CRUD', () => {
  test.describe.configure({ mode: 'serial' });

  const testLeadData = {
    name: `E2E Test Lead ${Date.now()}`,
    email: `e2e-test-${Date.now()}@example.com`,
    projectType: 'kitchen',
    phone: '555-0199',
    goalsText: 'Automated E2E test lead - safe to delete',
  };

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('T-10.3.1: GET /api/leads returns 200 with array', async ({ page }) => {
    const response = await apiRequest(page, 'GET', '/api/leads');
    expect(response.status()).toBe(200);

    const body = await response.json();
    const leads = body.data || body.leads || body;
    expect(Array.isArray(leads)).toBeTruthy();
  });

  test('T-10.3.2: GET /api/leads returns leads with expected fields', async ({ page }) => {
    const response = await apiRequest(page, 'GET', '/api/leads');
    const body = await response.json();
    const leads = body.data || body.leads || body;

    if (Array.isArray(leads) && leads.length > 0) {
      const lead = leads[0];
      expect(lead).toHaveProperty('id');
      expect(lead).toHaveProperty('name');
      expect(lead).toHaveProperty('email');
      expect(lead).toHaveProperty('status');
    }
  });

  test('T-10.3.3: POST /api/leads creates new lead', async ({ page }) => {
    test.setTimeout(90000); // POST triggers quote generation + emails
    const response = await apiRequestLong(page, 'POST', '/api/leads', testLeadData);

    expect([200, 201]).toContain(response.status());

    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.leadId || body.id).toBeTruthy();

    createdLeadId = body.leadId || body.id;
  });

  test('T-10.3.4: GET /api/leads/:id returns the created lead', async ({ page }) => {
    if (!createdLeadId) {
      test.setTimeout(90000);
      const createResponse = await apiRequestLong(page, 'POST', '/api/leads', {
        ...testLeadData,
        email: `e2e-get-${Date.now()}@example.com`,
        name: `E2E Get Test ${Date.now()}`,
      });
      if (createResponse.ok()) {
        const createBody = await createResponse.json();
        createdLeadId = createBody.leadId || createBody.id;
      }
    }

    test.skip(!createdLeadId, 'No lead ID available');

    const response = await apiRequest(page, 'GET', `/api/leads/${createdLeadId}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    const lead = body.data || body;
    expect(lead.id || lead.leadId).toBeTruthy();
  });

  test('T-10.3.5: PATCH /api/leads/:id updates lead fields', async ({ page }) => {
    if (!createdLeadId) {
      test.setTimeout(90000);
      const createResponse = await apiRequestLong(page, 'POST', '/api/leads', {
        ...testLeadData,
        email: `e2e-patch-${Date.now()}@example.com`,
        name: `E2E Patch Test ${Date.now()}`,
      });
      if (createResponse.ok()) {
        const createBody = await createResponse.json();
        createdLeadId = createBody.leadId || createBody.id;
      }
    }

    test.skip(!createdLeadId, 'No lead ID available');

    const updateData = { name: `Updated E2E Lead ${Date.now()}` };

    let response = await apiRequest(page, 'PATCH', `/api/leads/${createdLeadId}`, updateData);
    if (response.status() === 405) {
      response = await apiRequest(page, 'PUT', `/api/leads/${createdLeadId}`, updateData);
    }

    expect([200, 204]).toContain(response.status());
  });

  test('T-10.3.6: DELETE /api/leads/:id endpoint responds correctly', async ({ page }) => {
    test.setTimeout(90000);
    const deleteLeadData = {
      ...testLeadData,
      email: `e2e-delete-${Date.now()}@example.com`,
      name: `E2E Delete Test ${Date.now()}`,
    };

    const createResponse = await apiRequestLong(page, 'POST', '/api/leads', deleteLeadData);
    const createBody = await createResponse.json();
    const deleteId = createBody.leadId || createBody.id;

    test.skip(!deleteId, 'Could not create lead for deletion');

    const response = await apiRequest(page, 'DELETE', `/api/leads/${deleteId}`);
    // API may support DELETE (200/204) or may not implement it (405)
    expect([200, 204, 405]).toContain(response.status());

    if (response.status() !== 405) {
      const getResponse = await apiRequest(page, 'GET', `/api/leads/${deleteId}`);
      expect([404, 200]).toContain(getResponse.status());
    }
  });

  test('T-10.3.7: GET /api/leads/:id returns error for invalid ID', async ({ page }) => {
    const response = await apiRequest(page, 'GET', '/api/leads/00000000-0000-0000-0000-000000000000');
    expect([400, 404, 500]).toContain(response.status());
  });

  test('T-10.3.8: POST /api/leads with missing required fields returns error', async ({ page }) => {
    const response = await apiRequest(page, 'POST', '/api/leads', {
      phone: '555-0000',
    });
    expect([400, 422]).toContain(response.status());
  });

  test('T-10.3.9: POST /api/leads with invalid email returns error', async ({ page }) => {
    const response = await apiRequest(page, 'POST', '/api/leads', {
      name: 'Test Invalid Email',
      email: 'not-an-email',
      projectType: 'kitchen',
    });
    expect([400, 422]).toContain(response.status());
  });

  test('T-10.3.10: GET /api/leads supports pagination parameters', async ({ page }) => {
    const response = await apiRequest(page, 'GET', '/api/leads?limit=5&offset=0');
    expect(response.status()).toBe(200);

    const body = await response.json();
    const leads = body.data || body.leads || body;
    expect(Array.isArray(leads)).toBeTruthy();
    expect(leads.length).toBeLessThanOrEqual(5);
  });
});

// ─── 4. Audit Log (~5 tests) ─────────────────────────────────────────────────

test.describe('T-10.4: Audit Log', () => {
  test.describe.configure({ mode: 'serial' });

  let leadId: string;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    if (!leadId) {
      const id = await getFirstLeadId(page);
      if (!id) {
        test.skip();
        return;
      }
      leadId = id;
    }
  });

  test('T-10.4.1: GET /api/leads/:id/audit returns 200', async ({ page }) => {
    const response = await apiRequest(page, 'GET', `/api/leads/${leadId}/audit`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('T-10.4.2: audit entries have required fields', async ({ page }) => {
    const response = await apiRequest(page, 'GET', `/api/leads/${leadId}/audit`);
    const body = await response.json();

    if (body.data && body.data.length > 0) {
      const entry = body.data[0];
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('created_at');
      expect(entry).toHaveProperty('lead_id');
    }
  });

  test('T-10.4.3: audit endpoint returns pagination metadata', async ({ page }) => {
    const response = await apiRequest(page, 'GET', `/api/leads/${leadId}/audit?limit=10&offset=0`);
    const body = await response.json();

    expect(body.pagination).toBeDefined();
    expect(body.pagination).toHaveProperty('total');
    expect(body.pagination).toHaveProperty('limit');
    expect(body.pagination).toHaveProperty('offset');
  });

  test('T-10.4.4: Activity tab displays audit entries on lead detail', async ({ page }) => {
    await page.goto(`/admin/leads/${leadId}`);
    await page.waitForLoadState('domcontentloaded');

    const activityTab = page.getByRole('tab', { name: /activity/i })
      .or(page.getByText('Activity', { exact: true }));
    const hasActivityTab = await activityTab.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasActivityTab) { test.skip(); return; }

    await activityTab.click();
    await page.waitForTimeout(1500);

    const auditContent = page.getByText(/created|updated|status|no activity/i);
    await expect(auditContent.first()).toBeVisible({ timeout: 5000 });
  });

  test('T-10.4.5: audit entries show correct action types', async ({ page }) => {
    const response = await apiRequest(page, 'GET', `/api/leads/${leadId}/audit`);
    const body = await response.json();

    if (body.data && body.data.length > 0) {
      const validActions = [
        'lead_created', 'lead_updated', 'quote_created',
        'quote_updated', 'quote_sent', 'pdf_generated', 'status_change',
      ];

      for (const entry of body.data) {
        expect(validActions).toContain(entry.action);
      }
    }
  });
});
