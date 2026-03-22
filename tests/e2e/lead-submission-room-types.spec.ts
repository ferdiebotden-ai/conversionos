/**
 * Lead Submission Room Types E2E Test
 *
 * Regression test: the visualizer offers room types (living_room, bedroom, dining_room)
 * that were not accepted by the leads API Zod schema, causing "Validation failed" errors
 * when users submitted the lead capture form after completing a visualization.
 *
 * Tests the /api/leads POST endpoint directly with all visualizer room types.
 */

import { test, expect } from '@playwright/test';

const ALL_VISUALIZER_ROOM_TYPES = [
  'kitchen',
  'bathroom',
  'living_room',
  'basement',
  'bedroom',
  'exterior',
  'dining_room',
] as const;

const VALID_LEAD_PAYLOAD = {
  name: 'E2E Test Lead',
  email: 'e2e-test@norbotsystems.com',
  phone: '519-555-0000',
  timeline: 'just_exploring' as const,
  goalsText: 'Automated E2E regression test — verifying room type acceptance.',
};

test.describe('Lead submission accepts all visualizer room types', () => {
  for (const roomType of ALL_VISUALIZER_ROOM_TYPES) {
    test(`POST /api/leads accepts projectType="${roomType}"`, async ({ request }) => {
      const response = await request.post('/api/leads', {
        data: {
          ...VALID_LEAD_PAYLOAD,
          projectType: roomType,
        },
      });

      // Should NOT be a 400 validation error
      expect(response.status()).not.toBe(400);

      const body = await response.json();

      // If we get 200, the lead was created successfully
      if (response.status() === 200) {
        expect(body.success).toBe(true);
        expect(body.leadId).toBeDefined();
      }

      // A 429 (rate limited) is acceptable — it means the schema validated
      // A 500 could be DB/email issue — but NOT a validation failure
      if (response.status() === 400) {
        // This should never happen after the fix
        throw new Error(
          `Room type "${roomType}" rejected by API validation: ${JSON.stringify(body.details)}`
        );
      }
    });
  }

  test('POST /api/leads rejects invalid projectType', async ({ request }) => {
    const response = await request.post('/api/leads', {
      data: {
        ...VALID_LEAD_PAYLOAD,
        projectType: 'garage_not_valid',
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Validation failed');
  });

  test('Lead capture form payload with visualization matches API schema', async ({ request }) => {
    // Simulates the exact payload the LeadCaptureForm sends
    const response = await request.post('/api/leads', {
      data: {
        name: 'Margaret Wilson',
        email: 'margaret-e2e@test.com',
        phone: '519-555-1234',
        projectType: 'living_room', // The previously-broken case
        timeline: '1_3_months',
        goalsText: 'Want to modernize our living room with new flooring and paint.',
        visualizationId: undefined, // No real visualization in test
        uploadedPhotos: undefined,
      },
    });

    expect(response.status()).not.toBe(400);
  });
});
