/**
 * Staging Data Tests
 * Verify all style x room combinations return valid staging recommendations
 */

import { describe, it, expect } from 'vitest';
import { getStagingRecommendation } from '@/lib/ai/knowledge/staging-data';
import type { RoomType, DesignStyle } from '@/lib/schemas/visualization';

const ALL_ROOMS: RoomType[] = [
  'kitchen', 'bathroom', 'living_room', 'bedroom', 'basement', 'dining_room', 'exterior',
];

const ALL_STYLES: DesignStyle[] = [
  'modern', 'traditional', 'farmhouse', 'industrial', 'minimalist', 'contemporary',
  'transitional', 'scandinavian', 'coastal', 'mid_century_modern',
];

describe('Staging Data', () => {
  it('has recommendations for all 70 room x style combinations', () => {
    const missing: string[] = [];

    for (const room of ALL_ROOMS) {
      for (const style of ALL_STYLES) {
        const rec = getStagingRecommendation(room, style);
        if (!rec) {
          missing.push(`${room}_${style}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it('every recommendation has non-empty accentPieces', () => {
    for (const room of ALL_ROOMS) {
      for (const style of ALL_STYLES) {
        const rec = getStagingRecommendation(room, style);
        expect(rec?.accentPieces.length, `${room}_${style} accentPieces`).toBeGreaterThan(0);
      }
    }
  });

  it('every recommendation has a non-empty avoidList', () => {
    for (const room of ALL_ROOMS) {
      for (const style of ALL_STYLES) {
        const rec = getStagingRecommendation(room, style);
        expect(rec?.avoidList.length, `${room}_${style} avoidList`).toBeGreaterThan(0);
      }
    }
  });

  it('every recommendation has layoutGuidance', () => {
    for (const room of ALL_ROOMS) {
      for (const style of ALL_STYLES) {
        const rec = getStagingRecommendation(room, style);
        expect(rec?.layoutGuidance.length, `${room}_${style} layoutGuidance`).toBeGreaterThan(0);
      }
    }
  });
});
