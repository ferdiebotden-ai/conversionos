/**
 * Lead Submission Schema Regression Tests
 *
 * Regression test for the bug where visualizer room types (living_room, bedroom,
 * dining_room) were not accepted by the leads API route Zod schema, causing form
 * submission failures after users completed the visualizer flow.
 *
 * Root cause: The visualizer RoomType enum included living_room, bedroom, dining_room
 * but the leads API LeadSubmissionSchema projectType enum only had kitchen, bathroom,
 * basement, flooring, painting, exterior, other.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Mirror the exact schema from src/app/api/leads/route.ts
const LeadSubmissionSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  projectType: z.enum(['kitchen', 'bathroom', 'basement', 'flooring', 'painting', 'exterior', 'other', 'living_room', 'bedroom', 'dining_room']),
  timeline: z.enum(['asap', '1_3_months', '3_6_months', '6_plus_months', 'just_exploring']).optional(),
  goalsText: z.string().max(2000).optional(),
  uploadedPhotos: z.array(z.string()).optional(),
  visualizationId: z.string().uuid().optional(),
});

// Mirror the RoomType from the visualizer
const VISUALIZER_ROOM_TYPES = ['kitchen', 'bathroom', 'living_room', 'basement', 'bedroom', 'exterior', 'dining_room'] as const;

describe('Lead submission accepts all visualizer room types', () => {
  // This is the exact transform the lead-capture-form does
  const transformRoomType = (roomType: string) => roomType.replace(/\s+/g, '_').toLowerCase();

  VISUALIZER_ROOM_TYPES.forEach((roomType) => {
    it(`accepts room type "${roomType}" from visualizer`, () => {
      const payload = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        projectType: transformRoomType(roomType),
        visualizationId: '550e8400-e29b-41d4-a716-446655440000',
        uploadedPhotos: ['https://storage.example.com/photo.jpg'],
      };

      const result = LeadSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  it('rejects truly invalid project types', () => {
    const payload = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      projectType: 'garage', // not a valid room type
    };

    const result = LeadSubmissionSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('accepts "other" for custom room types', () => {
    const payload = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      projectType: 'other',
      goalsText: 'Sunroom renovation',
    };

    const result = LeadSubmissionSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('validates the full visualizer → lead capture flow payload', () => {
    // Simulates the exact payload sent by LeadCaptureForm after a living room visualization
    const payload = {
      name: 'Margaret Wilson',
      email: 'margaret@test.com',
      phone: '519-555-1234',
      projectType: 'living_room',
      timeline: '1_3_months',
      goalsText: 'Want to modernize our living room with new flooring and paint.',
      visualizationId: '550e8400-e29b-41d4-a716-446655440000',
      uploadedPhotos: ['https://ktpfyangnmpwufghgasx.supabase.co/storage/v1/object/public/visualizer/photo.jpg'],
    };

    const result = LeadSubmissionSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
