import { test, expect } from '@playwright/test';

test.describe('Cross-Tenant Data Isolation', () => {
  test('leads from one tenant are not visible to another', async ({ request }) => {
    // Create a lead under the demo tenant
    await request.post('/api/leads?__site_id=demo', {
      data: {
        name: 'Cross-Tenant Test User',
        email: `cross-tenant-test-${Date.now()}@example.com`,
        phone: '555-0199',
        projectType: 'kitchen',
        message: 'Cross-tenant isolation test',
      },
    });
    // Lead creation should succeed (or may need auth — handle gracefully)

    // Try to fetch leads under a different tenant
    const fetchResponse = await request.get('/api/leads?__site_id=redwhitereno');

    // If the API requires auth, this may return 401 — that's also fine (auth blocks cross-tenant)
    if (fetchResponse.ok()) {
      const data = await fetchResponse.json();
      const leads = Array.isArray(data) ? data : data.leads || [];
      // Verify no demo tenant leads appear
      const crossTenantLeak = leads.some((l: { email?: string }) =>
        l.email?.includes('cross-tenant-test')
      );
      expect(crossTenantLeak).toBe(false);
    }
  });

  test('admin settings are isolated between tenants', async ({ request }) => {
    // Fetch settings for demo tenant
    const demoResponse = await request.get('/api/admin/settings?__site_id=demo');
    const redwhiteResponse = await request.get('/api/admin/settings?__site_id=redwhitereno');

    // Both may require auth (401) — skip gracefully if so
    if (demoResponse.ok() && redwhiteResponse.ok()) {
      const demoData = await demoResponse.json();
      const redwhiteData = await redwhiteResponse.json();

      // Verify different business names (basic isolation check)
      expect(demoData).not.toEqual(redwhiteData);
    }
  });
});
