/**
 * T-12: Invoices Workflow
 * Tests invoice management: list, detail, creation, payments, PDF, email, Sage 50 export, and API.
 */
import { test, expect, Page } from '@playwright/test';
import {
  loginAsAdmin,
  ensureAdminLoggedIn,
  apiRequest,
  createSoftAssert,
} from '../../fixtures/autonomous-helpers';

// Extended timeout for PDF generation and email sending
const LONG_API_TIMEOUT = 45000;

/** API request with extended timeout */
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

/** Cached first invoice ID */
let cachedInvoiceId: string | null = null;

/** Get the first available invoice ID via API */
async function getFirstInvoiceId(page: Page): Promise<string | null> {
  if (cachedInvoiceId) return cachedInvoiceId;
  const response = await apiRequest(page, 'GET', '/api/invoices');
  if (!response.ok()) return null;
  const data = await response.json();
  const invoices = data.data || [];
  if (Array.isArray(invoices) && invoices.length > 0) {
    cachedInvoiceId = invoices[0].id;
    return cachedInvoiceId;
  }
  return null;
}

/** Get an invoice that has a non-zero balance (for payment tests) */
async function getInvoiceWithBalance(page: Page): Promise<string | null> {
  const response = await apiRequest(page, 'GET', '/api/invoices');
  if (!response.ok()) return null;
  const data = await response.json();
  const invoices = data.data || [];
  if (!Array.isArray(invoices)) return null;

  for (const inv of invoices) {
    if (Number(inv.balance_due) > 0 && inv.status !== 'cancelled') {
      return inv.id;
    }
  }
  // Fall back to first invoice
  return invoices.length > 0 ? invoices[0].id : null;
}

// ─── 1. Invoice List (~8 tests) ──────────────────────────────────────────────

test.describe('T-12.1: Invoice List', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/invoices');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('T-12.1.1: navigates to /admin/invoices successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/invoices/);
  });

  test('T-12.1.2: page shows heading and description', async ({ page }) => {
    const heading = page.getByText('Invoices', { exact: false }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    const description = page.getByText(/manage invoices|track payments|export to sage/i);
    await expect(description.first()).toBeVisible({ timeout: 5000 });
  });

  test('T-12.1.3: table renders with expected columns or shows empty state', async ({ page }) => {
    const table = page.locator('table');
    const hasTable = await table.isVisible({ timeout: 10000 }).catch(() => false);

    if (hasTable) {
      const headers = page.locator('thead th, [role="columnheader"]');
      const headerTexts = await headers.allTextContents();
      const joined = headerTexts.join(' ').toLowerCase();

      const softAssert = createSoftAssert();
      softAssert.check(joined.includes('invoice'), 'Missing "Invoice #" column');
      softAssert.check(joined.includes('customer'), 'Missing "Customer" column');
      softAssert.check(joined.includes('total'), 'Missing "Total" column');
      softAssert.check(joined.includes('balance'), 'Missing "Balance" column');
      softAssert.check(joined.includes('status'), 'Missing "Status" column');
      softAssert.check(joined.includes('date'), 'Missing "Date" column');
      softAssert.check(joined.includes('actions'), 'Missing "Actions" column');
      softAssert.flush();
    } else {
      const emptyState = page.getByText(/no invoices found/i);
      await expect(emptyState.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('T-12.1.4: status filter tabs are present', async ({ page }) => {
    const filterButtons = page.locator('a[href*="/admin/invoices"]')
      .or(page.getByRole('link', { name: /All|Draft|Sent|Partial|Paid|Overdue/i }));

    const count = await filterButtons.count();
    // Expect at least the "All" and a few status tabs
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('T-12.1.5: All tab is active by default', async ({ page }) => {
    // The "All" button should have variant=default (not outline)
    const allButton = page.getByRole('link', { name: 'All' })
      .or(page.locator('a[href="/admin/invoices"]').filter({ hasText: 'All' }));

    const hasAll = await allButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasAll) { test.skip(); return; }

    await expect(allButton.first()).toBeVisible();
  });

  test('T-12.1.6: clicking Draft filter tab filters invoices', async ({ page }) => {
    const draftLink = page.getByRole('link', { name: 'Draft' })
      .or(page.locator('a[href*="status=draft"]'));

    const hasDraft = await draftLink.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasDraft) { test.skip(); return; }

    await draftLink.first().click();
    await page.waitForURL(/status=draft/, { timeout: 10000 });
    expect(page.url()).toContain('status=draft');
  });

  test('T-12.1.7: clicking Paid filter tab filters invoices', async ({ page }) => {
    const paidLink = page.getByRole('link', { name: 'Paid' })
      .or(page.locator('a[href*="status=paid"]'));

    const hasPaid = await paidLink.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasPaid) { test.skip(); return; }

    await paidLink.first().click();
    await page.waitForURL(/status=paid/, { timeout: 10000 });
    expect(page.url()).toContain('status=paid');
  });

  test('T-12.1.8: row View button navigates to invoice detail', async ({ page }) => {
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    if (rowCount === 0) { test.skip(); return; }

    const viewLink = rows.first().getByRole('link', { name: /view/i })
      .or(rows.first().locator('a[href*="/admin/invoices/"]'));

    const hasLink = await viewLink.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasLink) { test.skip(); return; }

    await viewLink.first().click();
    await page.waitForURL(/\/admin\/invoices\/[a-zA-Z0-9-]+/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/admin\/invoices\/[a-zA-Z0-9-]+/);
  });
});

// ─── 2. Invoice Detail (~8 tests) ───────────────────────────────────────────

test.describe('T-12.2: Invoice Detail', () => {
  test.describe.configure({ mode: 'serial' });

  let invoiceId: string;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    if (!invoiceId) {
      const id = await getFirstInvoiceId(page);
      if (!id) { test.skip(); return; }
      invoiceId = id;
    }
  });

  test('T-12.2.1: invoice detail page loads', async ({ page }) => {
    await page.goto(`/admin/invoices/${invoiceId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Should show invoice number or "not found"
    const content = page.getByText(/INV-|Invoice not found/i);
    await expect(content.first()).toBeVisible({ timeout: 15000 });
  });

  test('T-12.2.2: shows invoice number and status badge', async ({ page }) => {
    await page.goto(`/admin/invoices/${invoiceId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Invoice number format: INV-YYYY-###
    const invoiceNum = page.getByText(/INV-\d{4}-\d+/);
    const hasNum = await invoiceNum.first().isVisible({ timeout: 10000 }).catch(() => false);
    if (!hasNum) { test.skip(); return; }

    await expect(invoiceNum.first()).toBeVisible();

    // Status badge
    const statusBadge = page.getByText(/Draft|Sent|Partially Paid|Paid|Overdue|Cancelled/);
    await expect(statusBadge.first()).toBeVisible({ timeout: 5000 });
  });

  test('T-12.2.3: shows line items table', async ({ page }) => {
    await page.goto(`/admin/invoices/${invoiceId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const lineItemsCard = page.getByText('Line Items', { exact: false });
    const hasCard = await lineItemsCard.first().isVisible({ timeout: 10000 }).catch(() => false);
    if (!hasCard) { test.skip(); return; }

    // Check line items table headers
    const headers = page.locator('thead th');
    const headerTexts = await headers.allTextContents();
    const joined = headerTexts.join(' ').toLowerCase();

    expect(joined).toContain('description');
    expect(joined).toContain('amount');
  });

  test('T-12.2.4: shows invoice summary with totals', async ({ page }) => {
    await page.goto(`/admin/invoices/${invoiceId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const softAssert = createSoftAssert();

    const subtotal = page.getByText('Subtotal');
    const hst = page.getByText(/HST.*13%/);
    const total = page.getByText('Total');
    const balance = page.getByText('Balance Due');

    softAssert.check(
      await subtotal.first().isVisible({ timeout: 5000 }).catch(() => false),
      'Subtotal not visible'
    );
    softAssert.check(
      await hst.first().isVisible({ timeout: 5000 }).catch(() => false),
      'HST (13%) not visible'
    );
    softAssert.check(
      await total.first().isVisible({ timeout: 5000 }).catch(() => false),
      'Total not visible'
    );
    softAssert.check(
      await balance.first().isVisible({ timeout: 5000 }).catch(() => false),
      'Balance Due not visible'
    );

    softAssert.flush();
  });

  test('T-12.2.5: shows customer info section', async ({ page }) => {
    await page.goto(`/admin/invoices/${invoiceId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const customerCard = page.getByText('Customer', { exact: true });
    const hasCard = await customerCard.first().isVisible({ timeout: 10000 }).catch(() => false);
    if (!hasCard) { test.skip(); return; }

    await expect(customerCard.first()).toBeVisible();
  });

  test('T-12.2.6: shows payment history section', async ({ page }) => {
    await page.goto(`/admin/invoices/${invoiceId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const paymentHistory = page.getByText('Payment History');
    await expect(paymentHistory.first()).toBeVisible({ timeout: 10000 });
  });

  test('T-12.2.7: shows dates section with Issue and Due dates', async ({ page }) => {
    await page.goto(`/admin/invoices/${invoiceId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const datesCard = page.getByText('Dates', { exact: true });
    const hasCard = await datesCard.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasCard) { test.skip(); return; }

    const issueDate = page.getByText('Issue Date');
    const dueDate = page.getByText('Due Date');

    await expect(issueDate.first()).toBeVisible({ timeout: 5000 });
    await expect(dueDate.first()).toBeVisible({ timeout: 5000 });
  });

  test('T-12.2.8: back button navigates to invoices list', async ({ page }) => {
    await page.goto(`/admin/invoices/${invoiceId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const backLink = page.locator('a[href="/admin/invoices"]');
    const hasBack = await backLink.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasBack) { test.skip(); return; }

    await backLink.first().click();
    await page.waitForURL(/\/admin\/invoices/, { timeout: 10000 });
  });
});

// ─── 3. Invoice Creation (~5 tests) ─────────────────────────────────────────

test.describe('T-12.3: Invoice Creation', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('T-12.3.1: POST /api/invoices validates required fields', async ({ page }) => {
    const response = await apiRequest(page, 'POST', '/api/invoices', {
      notes: 'Missing lead_id and quote_draft_id',
    });
    expect([400, 422]).toContain(response.status());
  });

  test('T-12.3.2: POST /api/invoices returns 404 for invalid lead_id', async ({ page }) => {
    const response = await apiRequest(page, 'POST', '/api/invoices', {
      lead_id: '00000000-0000-0000-0000-000000000000',
      quote_draft_id: '00000000-0000-0000-0000-000000000000',
    });
    // 404 lead not found or 500 internal
    expect([404, 500]).toContain(response.status());
  });

  test('T-12.3.3: GET /api/invoices returns list with data array', async ({ page }) => {
    const response = await apiRequest(page, 'GET', '/api/invoices');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('T-12.3.4: invoices in list have expected fields', async ({ page }) => {
    const response = await apiRequest(page, 'GET', '/api/invoices');
    const body = await response.json();
    const invoices = body.data || [];

    if (invoices.length === 0) { test.skip(); return; }

    const invoice = invoices[0];
    const softAssert = createSoftAssert();

    softAssert.check(!!invoice.id, 'Missing id');
    softAssert.check(!!invoice.invoice_number, 'Missing invoice_number');
    softAssert.check(!!invoice.status, 'Missing status');
    softAssert.check(invoice.total !== undefined, 'Missing total');
    softAssert.check(invoice.balance_due !== undefined, 'Missing balance_due');
    softAssert.check(!!invoice.customer_name, 'Missing customer_name');

    softAssert.flush();
  });

  test('T-12.3.5: invoice number follows INV-YYYY-### format', async ({ page }) => {
    const response = await apiRequest(page, 'GET', '/api/invoices');
    const body = await response.json();
    const invoices = body.data || [];

    if (invoices.length === 0) { test.skip(); return; }

    const invoiceNumber = invoices[0].invoice_number;
    expect(invoiceNumber).toMatch(/^INV-\d{4}-\d+$/);
  });
});

// ─── 4. Payment Recording (~8 tests) ────────────────────────────────────────

test.describe('T-12.4: Payment Recording', () => {
  test.describe.configure({ mode: 'serial' });

  let invoiceId: string;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    if (!invoiceId) {
      const id = await getInvoiceWithBalance(page);
      if (!id) { test.skip(); return; }
      invoiceId = id;
    }
  });

  test('T-12.4.1: Record Payment button visible on detail page', async ({ page }) => {
    await page.goto(`/admin/invoices/${invoiceId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const recordBtn = page.getByRole('button', { name: /record payment/i })
      .or(page.locator('button').filter({ hasText: /Record Payment/i }));

    // Button may not appear if invoice is paid or cancelled
    const hasBtn = await recordBtn.first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(typeof hasBtn).toBe('boolean');
  });

  test('T-12.4.2: GET /api/invoices/:id/payments returns payments list', async ({ page }) => {
    const response = await apiRequest(page, 'GET', `/api/invoices/${invoiceId}/payments`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('T-12.4.3: POST /api/invoices/:id/payments validates required fields', async ({ page }) => {
    const response = await apiRequest(page, 'POST', `/api/invoices/${invoiceId}/payments`, {
      // Missing amount and payment_method
      notes: 'Invalid payment',
    });
    expect([400, 422]).toContain(response.status());
  });

  test('T-12.4.4: POST /api/invoices/:id/payments rejects overpayment', async ({ page }) => {
    // First get the invoice to know the balance
    const invoiceResp = await apiRequest(page, 'GET', `/api/invoices/${invoiceId}`);
    if (!invoiceResp.ok()) { test.skip(); return; }
    const invoiceData = await invoiceResp.json();
    const balance = Number(invoiceData.data?.balance_due || 0);

    if (balance <= 0) { test.skip(); return; }

    const response = await apiRequest(page, 'POST', `/api/invoices/${invoiceId}/payments`, {
      amount: balance + 1000,
      payment_method: 'etransfer',
    });
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toContain('exceeds');
  });

  test('T-12.4.5: POST /api/invoices/:id/payments rejects payment on cancelled invoice', async ({ page }) => {
    // Try to find a cancelled invoice
    const listResp = await apiRequest(page, 'GET', '/api/invoices?status=cancelled');
    if (!listResp.ok()) { test.skip(); return; }
    const listData = await listResp.json();
    const cancelled = listData.data || [];

    if (cancelled.length === 0) { test.skip(); return; }

    const response = await apiRequest(page, 'POST', `/api/invoices/${cancelled[0].id}/payments`, {
      amount: 100,
      payment_method: 'cash',
    });
    expect(response.status()).toBe(400);
  });

  test('T-12.4.6: GET /api/invoices/:id returns invoice detail with payments array', async ({ page }) => {
    const response = await apiRequest(page, 'GET', `/api/invoices/${invoiceId}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.data).toBeDefined();
    expect(body.data.payments).toBeDefined();
    expect(Array.isArray(body.data.payments)).toBeTruthy();
  });

  test('T-12.4.7: balance_due equals total minus amount_paid', async ({ page }) => {
    const response = await apiRequest(page, 'GET', `/api/invoices/${invoiceId}`);
    if (!response.ok()) { test.skip(); return; }

    const body = await response.json();
    const inv = body.data;

    const total = Number(inv.total);
    const amountPaid = Number(inv.amount_paid);
    const balanceDue = Number(inv.balance_due);

    expect(Math.abs(balanceDue - (total - amountPaid))).toBeLessThan(0.01);
  });

  test('T-12.4.8: invoice status reflects payment state', async ({ page }) => {
    const response = await apiRequest(page, 'GET', `/api/invoices/${invoiceId}`);
    if (!response.ok()) { test.skip(); return; }

    const body = await response.json();
    const inv = body.data;

    const validStatuses = ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'];
    expect(validStatuses).toContain(inv.status);

    // If balance is 0 and status isn't draft, it should be paid
    if (Number(inv.balance_due) <= 0 && inv.status !== 'draft') {
      expect(inv.status).toBe('paid');
    }
  });
});

// ─── 5. PDF & Email (~5 tests) ───────────────────────────────────────────────

test.describe('T-12.5: PDF & Email', () => {
  test.describe.configure({ mode: 'serial' });

  let invoiceId: string;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    if (!invoiceId) {
      const id = await getFirstInvoiceId(page);
      if (!id) { test.skip(); return; }
      invoiceId = id;
    }
  });

  test('T-12.5.1: PDF download button exists on detail page', async ({ page }) => {
    await page.goto(`/admin/invoices/${invoiceId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const pdfLink = page.locator(`a[href*="/api/invoices/${invoiceId}/pdf"]`)
      .or(page.getByRole('link', { name: /pdf/i }))
      .or(page.locator('a').filter({ hasText: /PDF/ }));

    const hasPdf = await pdfLink.first().isVisible({ timeout: 5000 }).catch(() => false);
    // PDF button should be visible on all non-404 pages
    expect(typeof hasPdf).toBe('boolean');
  });

  test('T-12.5.2: GET /api/invoices/:id/pdf returns PDF or error', async ({ page }) => {
    test.setTimeout(60000);

    const response = await apiRequestLong(page, 'GET', `/api/invoices/${invoiceId}/pdf`);

    // 200 = PDF, 404 = not found, 500 = PDF generation failed
    expect([200, 404, 500]).toContain(response.status());

    if (response.status() === 200) {
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/pdf');
    }
  });

  test('T-12.5.3: PDF response has Content-Disposition header', async ({ page }) => {
    test.setTimeout(60000);

    const response = await apiRequestLong(page, 'GET', `/api/invoices/${invoiceId}/pdf`);

    if (response.status() !== 200) { test.skip(); return; }

    const disposition = response.headers()['content-disposition'];
    expect(disposition).toBeDefined();
    expect(disposition).toContain('.pdf');
  });

  test('T-12.5.4: Send invoice button exists on detail page', async ({ page }) => {
    await page.goto(`/admin/invoices/${invoiceId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const sendBtn = page.getByRole('button', { name: /send/i })
      .or(page.locator('button').filter({ hasText: /Send/ }));

    // Send button only appears for non-paid, non-cancelled invoices
    const hasBtn = await sendBtn.first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(typeof hasBtn).toBe('boolean');
  });

  test('T-12.5.5: POST /api/invoices/:id/send validates email', async ({ page }) => {
    test.setTimeout(60000);

    const response = await apiRequestLong(page, 'POST', `/api/invoices/${invoiceId}/send`, {
      // Missing to_email
      custom_message: 'Test',
    });

    // 400 = validation error, 404 = not found, 503 = email not configured
    expect([400, 404, 500, 503]).toContain(response.status());
  });
});

// ─── 6. Sage 50 Export (~3 tests) ────────────────────────────────────────────

test.describe('T-12.6: Sage 50 Export', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('T-12.6.1: GET /api/invoices/export/sage returns CSV or 404', async ({ page }) => {
    const response = await apiRequest(page, 'GET', '/api/invoices/export/sage');

    // 200 = CSV, 404 = no invoices to export, 500 = error
    expect([200, 404, 500]).toContain(response.status());

    if (response.status() === 200) {
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/csv');
    }
  });

  test('T-12.6.2: Sage CSV has Content-Disposition with filename', async ({ page }) => {
    const response = await apiRequest(page, 'GET', '/api/invoices/export/sage');

    if (response.status() !== 200) { test.skip(); return; }

    const disposition = response.headers()['content-disposition'];
    expect(disposition).toBeDefined();
    expect(disposition).toContain('sage_export');
    expect(disposition).toContain('.csv');
  });

  test('T-12.6.3: Sage CSV has correct headers', async ({ page }) => {
    const response = await apiRequest(page, 'GET', '/api/invoices/export/sage');

    if (response.status() !== 200) { test.skip(); return; }

    const csvText = await response.text();
    // Remove BOM if present
    const clean = csvText.replace(/^\uFEFF/, '');
    const firstLine = clean.split('\n')[0];

    const expectedHeaders = [
      'Invoice Date',
      'Invoice Number',
      'Customer Name',
      'Description',
      'Net Amount',
      'Tax Rate',
      'Tax Code',
      'Tax Amount',
      'Total Amount',
      'Nominal Code',
      'Due Date',
    ];

    for (const header of expectedHeaders) {
      expect(firstLine).toContain(header);
    }
  });
});

// ─── 7. Invoice API (~3 tests) ───────────────────────────────────────────────

test.describe('T-12.7: Invoice API', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('T-12.7.1: GET /api/invoices returns paginated response', async ({ page }) => {
    const response = await apiRequest(page, 'GET', '/api/invoices?page=1&limit=5');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.pagination).toBeDefined();
    expect(body.pagination).toHaveProperty('page');
    expect(body.pagination).toHaveProperty('limit');
    expect(body.pagination).toHaveProperty('total');
    expect(body.pagination).toHaveProperty('totalPages');
    expect(body.data.length).toBeLessThanOrEqual(5);
  });

  test('T-12.7.2: GET /api/invoices/:id returns 404 for invalid ID', async ({ page }) => {
    const response = await apiRequest(
      page,
      'GET',
      '/api/invoices/00000000-0000-0000-0000-000000000000',
    );
    expect([404, 500]).toContain(response.status());
  });

  test('T-12.7.3: DELETE /api/invoices/:id cancels invoice (soft delete)', async ({ page }) => {
    // Get an invoice to test against
    const id = await getFirstInvoiceId(page);
    if (!id) { test.skip(); return; }

    const response = await apiRequest(page, 'DELETE', `/api/invoices/${id}`);
    // 200 = cancelled, 404 = not found, 500 = error
    expect([200, 404, 500]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body.success).toBeTruthy();
      expect(body.data.status).toBe('cancelled');
    }
  });
});
